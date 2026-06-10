import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SPORT_MAP: Record<string, string> = {
  Run: 'corrida', VirtualRun: 'corrida',
  Ride: 'bike', VirtualRide: 'bike',
  Swim: 'natacao',
  WeightTraining: 'musculacao', Crossfit: 'crossfit',
  Walk: 'outro', Hike: 'outro', Yoga: 'outro',
}

// Strava faz GET para validar o webhook
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  const verifyToken = req.nextUrl.searchParams.get('hub.verify_token')

  if (mode === 'subscribe' && verifyToken === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }
  return NextResponse.json({ erro: 'Verificação inválida' }, { status: 403 })
}

// Strava envia POST quando uma atividade é criada/atualizada
export async function POST(req: NextRequest) {
  try {
    const event = await req.json()

    // Só processa criação de atividades
    if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
      return NextResponse.json({ ok: true })
    }

    const stravaAthleteId = event.owner_id
    const stravaActivityId = event.object_id

    // Busca o usuario_id e token correspondente
    const { data: conn } = await supabase
      .from('strava_connections')
      .select('usuario_id, access_token, expires_at, refresh_token')
      .eq('strava_athlete_id', stravaAthleteId)
      .single()

    if (!conn) return NextResponse.json({ ok: true })

    // Refresh token se necessário
    let token = conn.access_token
    if (new Date(conn.expires_at) <= new Date()) {
      const refresh = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
        }),
      })
      const refreshData = await refresh.json()
      if (refresh.ok && refreshData.access_token) {
        token = refreshData.access_token
        await supabase.from('strava_connections').update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
        }).eq('usuario_id', conn.usuario_id)
      }
    }

    // Busca detalhes da atividade
    const actRes = await fetch(`https://www.strava.com/api/v3/activities/${stravaActivityId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!actRes.ok) return NextResponse.json({ ok: true })

    const a = await actRes.json()
    const modalidade = SPORT_MAP[a.sport_type ?? a.type] ?? 'outro'
    const duracao = a.moving_time ? Math.round(a.moving_time / 60) : null
    if (!duracao || duracao < 3) return NextResponse.json({ ok: true })

    const data = a.start_date_local?.split('T')[0] ?? new Date(a.start_date).toLocaleDateString('en-CA')
    const fcMedia = a.average_heartrate ? Math.round(a.average_heartrate) : null
    const fcMax = a.max_heartrate ? Math.round(a.max_heartrate) : null
    let intensidade = 2
    if (fcMedia) intensidade = fcMedia > 160 ? 5 : fcMedia > 140 ? 4 : fcMedia > 120 ? 3 : 2

    // Calorias: detail endpoint retorna; para ciclismo converte kJ→kcal
    let calorias: number | null = a.calories ? Math.round(a.calories) : null
    if (!calorias && a.kilojoules) calorias = Math.round(a.kilojoules * 4)

    await supabase.from('atividades_livres').insert({
      usuario_id: conn.usuario_id,
      data,
      modalidade,
      duracao_min: duracao,
      distancia_km: a.distance ? Math.round(a.distance / 100) / 10 : null,
      calorias_estimadas: calorias,
      calorias_wearable: calorias,
      fc_media: fcMedia,
      fc_max: fcMax,
      elevacao: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
      intensidade,
      observacoes: `Strava · ${a.name ?? modalidade}`,
      strava_activity_id: a.id,
    })

    await supabase.from('strava_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('usuario_id', conn.usuario_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Strava Webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
