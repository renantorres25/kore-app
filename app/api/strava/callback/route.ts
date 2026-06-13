import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sincronizarSessaoPrescrita } from '../../../lib/sincronizarSessaoPrescrita'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SPORT_MAP: Record<string, string> = {
  Run: 'corrida', VirtualRun: 'corrida',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike',
  Swim: 'natacao',
  WeightTraining: 'musculacao', Crossfit: 'crossfit',
  Yoga: 'outro', Pilates: 'outro',
  Walk: 'outro', Hike: 'outro',
  Soccer: 'outro', Tennis: 'outro',
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') // usuarioId
  const error = req.nextUrl.searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kore-app-blue.vercel.app'

  if (error || !code || !state) {
    return NextResponse.redirect(`${baseUrl}/perfil?strava=erro`)
  }

  // Troca code por tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('[Strava] Erro ao trocar token:', tokenData)
    return NextResponse.redirect(`${baseUrl}/perfil?strava=erro`)
  }

  const { access_token, refresh_token, expires_at, athlete } = tokenData

  // Salva conexão no banco
  await supabase.from('strava_connections').upsert({
    usuario_id: state,
    strava_athlete_id: athlete.id,
    access_token,
    refresh_token,
    expires_at: new Date(expires_at * 1000).toISOString(),
    athlete_name: `${athlete.firstname} ${athlete.lastname}`,
    athlete_photo: athlete.profile_medium,
    connected_at: new Date().toISOString(),
  }, { onConflict: 'usuario_id' })

  if (athlete.profile_medium) {
    await supabase.from('perfis').update({ avatar_url: athlete.profile_medium }).eq('id', state)
  }

  // Sincroniza atividades dos últimos 30 dias imediatamente
  await syncAtividades(state, access_token)

  return NextResponse.redirect(`${baseUrl}/perfil?strava=conectado`)
}

async function syncAtividades(usuarioId: string, accessToken: string) {
  const trinta = Math.floor(Date.now() / 1000) - 30 * 24 * 3600

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${trinta}&per_page=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) return

  const atividades = await res.json()
  if (!Array.isArray(atividades)) return

  for (const a of atividades) {
    const modalidade = SPORT_MAP[a.sport_type ?? a.type] ?? 'outro'
    const duracao = a.moving_time ? Math.round(a.moving_time / 60) : null
    if (!duracao || duracao < 5) continue

    const distancia = a.distance ? Math.round(a.distance / 100) / 10 : null
    const calorias = a.calories ?? null
    const fcMedia = a.average_heartrate ? Math.round(a.average_heartrate) : null
    const data = a.start_date_local?.split('T')[0] ?? new Date(a.start_date).toLocaleDateString('en-CA')

    let intensidade = 2
    if (fcMedia) {
      intensidade = fcMedia > 160 ? 5 : fcMedia > 140 ? 4 : fcMedia > 120 ? 3 : 2
    } else if (a.suffer_score) {
      intensidade = a.suffer_score > 100 ? 5 : a.suffer_score > 60 ? 4 : a.suffer_score > 30 ? 3 : 2
    }

    const { data: existe } = await supabase
      .from('atividades_livres')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('strava_activity_id', a.id)
      .maybeSingle()

    if (existe) continue

    await supabase.from('atividades_livres').insert({
      usuario_id: usuarioId,
      data,
      modalidade,
      duracao_min: duracao,
      distancia_km: distancia,
      calorias_estimadas: calorias ? Math.round(calorias) : null,
      calorias_wearable: calorias ? Math.round(calorias) : null,
      intensidade,
      fc_media: fcMedia,
      elevacao: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
      observacoes: `Strava · ${a.name ?? modalidade}`,
      strava_activity_id: a.id,
    })

    await sincronizarSessaoPrescrita(supabase, usuarioId, data, modalidade)
  }

  await supabase.from('strava_connections')
    .update({ last_sync: new Date().toISOString() })
    .eq('usuario_id', usuarioId)
}
