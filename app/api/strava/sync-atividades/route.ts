import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MODALIDADE: Record<string, string> = {
  Run: 'corrida', TrailRun: 'corrida', VirtualRun: 'corrida',
  Ride: 'bike', VirtualRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike', EBikeRide: 'bike',
  Swim: 'natacao',
  WeightTraining: 'musculacao', Crossfit: 'musculacao',
  Walk: 'caminhada', Hike: 'caminhada',
  Yoga: 'yoga',
  Rowing: 'remo',
  Workout: 'outro',
}

async function getToken(conn: { access_token: string; refresh_token: string; expires_at: string }, usuarioId: string) {
  if (new Date(conn.expires_at) > new Date()) return conn.access_token
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
  if (r.ok && rd.access_token) {
    await supabase.from('strava_connections').update({
      access_token: rd.access_token,
      refresh_token: rd.refresh_token,
      expires_at: new Date(rd.expires_at * 1000).toISOString(),
    }).eq('usuario_id', usuarioId)
    return rd.access_token as string
  }
  return conn.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { usuarioId, dias = 30 } = await req.json()
    if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 })

    const { data: conn } = await supabase
      .from('strava_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('usuario_id', usuarioId)
      .single()
    if (!conn) return NextResponse.json({ erro: 'Strava não conectado' }, { status: 404 })

    const token = await getToken(conn, usuarioId)

    // Busca atividades recentes no Strava
    const after = Math.floor(Date.now() / 1000) - dias * 86400
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return NextResponse.json({ erro: 'Erro Strava API', status: res.status }, { status: 502 })
    const activities: any[] = await res.json()

    // IDs já existentes no banco para este usuário
    const { data: existing } = await supabase
      .from('atividades_livres')
      .select('id, strava_activity_id, calorias_wearable')
      .eq('usuario_id', usuarioId)
      .not('strava_activity_id', 'is', null)

    const existingMap = new Map<number, { id: string; calorias_wearable: number | null }>(
      (existing ?? []).map(e => [Number(e.strava_activity_id), { id: e.id, calorias_wearable: e.calorias_wearable }])
    )

    let inseridos = 0
    let atualizados = 0

    for (const act of activities) {
      const stravaId = Number(act.id)
      const dataStr: string | null = act.start_date_local?.substring(0, 10) ?? null
      if (!dataStr) continue

      const modalidade = MODALIDADE[act.type as string] ?? 'outro'
      const duracaoMin = act.moving_time ? Math.round(act.moving_time / 60) : null
      const distanciaKm = act.distance && act.distance > 0 ? Math.round(act.distance / 10) / 100 : null
      const elevacao = act.total_elevation_gain ? Math.round(act.total_elevation_gain) : null
      const fcMedia = act.average_heartrate ? Math.round(act.average_heartrate) : null
      const fcMax = act.max_heartrate ? Math.round(act.max_heartrate) : null

      let calorias: number | null = act.calories && act.calories > 0 ? Math.round(act.calories) : null
      if (!calorias && act.kilojoules && act.kilojoules > 0) calorias = Math.round(act.kilojoules * 4)

      const entry = existingMap.get(stravaId)

      if (!entry) {
        const { error } = await supabase.from('atividades_livres').insert({
          usuario_id: usuarioId,
          data: dataStr,
          modalidade,
          duracao_min: duracaoMin,
          distancia_km: distanciaKm,
          elevacao,
          fc_media: fcMedia,
          fc_max: fcMax,
          calorias_wearable: calorias,
          calorias_estimadas: calorias,
          strava_activity_id: stravaId,
        })
        if (!error) inseridos++
      } else if (!entry.calorias_wearable && calorias) {
        await supabase
          .from('atividades_livres')
          .update({ calorias_wearable: calorias, calorias_estimadas: calorias })
          .eq('id', entry.id)
        atualizados++
      }
    }

    return NextResponse.json({ sucesso: true, inseridos, atualizados, total: activities.length })
  } catch (err) {
    console.error('[Sync Atividades Strava]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
