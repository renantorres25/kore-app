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

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json()
    if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 })

    const { data: conn } = await supabase
      .from('strava_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('usuario_id', usuarioId)
      .single()

    if (!conn) return NextResponse.json({ erro: 'Sem conexão Strava' }, { status: 404 })

    // Refresh se expirado
    let token = conn.access_token
    if (new Date(conn.expires_at) <= new Date()) {
      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
        }),
      })
      const rd = await r.json()
      if (r.ok) {
        token = rd.access_token
        await supabase.from('strava_connections').update({
          access_token: rd.access_token,
          refresh_token: rd.refresh_token,
          expires_at: new Date(rd.expires_at * 1000).toISOString(),
        }).eq('usuario_id', usuarioId)
      }
    }

    const trinta = Math.floor(Date.now() / 1000) - 30 * 24 * 3600
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${trinta}&per_page=60`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return NextResponse.json({ erro: 'Erro Strava' }, { status: 500 })

    const atividades = await res.json()
    let importadas = 0

    for (const a of atividades) {
      const modalidade = SPORT_MAP[a.sport_type ?? a.type] ?? 'outro'
      const duracao = a.moving_time ? Math.round(a.moving_time / 60) : null
      if (!duracao || duracao < 5) continue

      const fcMedia = a.average_heartrate ? Math.round(a.average_heartrate) : null
      let intensidade = 2
      if (fcMedia) intensidade = fcMedia > 160 ? 5 : fcMedia > 140 ? 4 : fcMedia > 120 ? 3 : 2

      const data = a.start_date_local?.split('T')[0]

      const { error } = await supabase.from('atividades_livres').upsert({
        usuario_id: usuarioId,
        data,
        modalidade,
        duracao_min: duracao,
        distancia_km: a.distance ? Math.round(a.distance / 100) / 10 : null,
        calorias_estimadas: a.calories ?? null,
        intensidade,
        observacoes: `Strava · ${a.name ?? modalidade}`,
        fc_media: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        elevacao: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
      })

      if (!error) importadas++
    }

    await supabase.from('strava_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('usuario_id', usuarioId)

    return NextResponse.json({ importadas })
  } catch (err) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
