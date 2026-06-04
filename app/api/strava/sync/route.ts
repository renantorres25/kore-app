import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SPORT_MAP: Record<string, string> = {
  Run: 'corrida', VirtualRun: 'corrida', TrailRun: 'corrida',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike', GravelRide: 'bike',
  Swim: 'natacao',
  WeightTraining: 'musculacao', Crossfit: 'crossfit',
  Yoga: 'outro', Pilates: 'outro', Walk: 'outro', Hike: 'outro',
  Soccer: 'outro', Tennis: 'outro', Basketball: 'outro',
}

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json()
    if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 })

    // Busca a conexão
    const { data: conn } = await supabase
      .from('strava_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('usuario_id', usuarioId)
      .single()

    if (!conn) return NextResponse.json({ erro: 'Strava não conectado' }, { status: 404 })

    // Refresh token se necessário
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
      if (r.ok && rd.access_token) {
        token = rd.access_token
        await supabase.from('strava_connections').update({
          access_token: rd.access_token,
          refresh_token: rd.refresh_token,
          expires_at: new Date(rd.expires_at * 1000).toISOString(),
        }).eq('usuario_id', usuarioId)
      }
    }

    // Busca atividades dos últimos 90 dias
    const noventa = Math.floor(Date.now() / 1000) - 90 * 24 * 3600
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${noventa}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ erro: `Strava API error: ${err}` }, { status: 500 })
    }

    const atividades = await res.json()
    if (!Array.isArray(atividades)) return NextResponse.json({ erro: 'Resposta inválida do Strava', raw: atividades }, { status: 500 })

    let inseridos = 0
    let erros = 0
    let atualizados = 0

    for (const a of atividades) {
      const modalidade = SPORT_MAP[a.sport_type ?? a.type] ?? 'outro'
      const duracao = a.moving_time ? Math.round(a.moving_time / 60) : null
      if (!duracao || duracao < 3) continue

      const data = a.start_date_local?.split('T')[0]
      if (!data) continue

      // Verifica se já existe
      const { data: existe } = await supabase
        .from('atividades_livres')
        .select('id, calorias_estimadas')
        .eq('usuario_id', usuarioId)
        .eq('strava_activity_id', a.id)
        .maybeSingle()

      // Busca detalhes para obter calorias (não está no endpoint de lista)
      let calorias: number | null = null
      let kilojoules: number | null = null

      try {
        const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${a.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (detailRes.ok) {
          const detail = await detailRes.json()
          calorias = detail.calories ? Math.round(detail.calories) : null
          kilojoules = detail.kilojoules ? Math.round(detail.kilojoules) : null
          // Para ciclismo: kilojoules → kcal (eficiência ~25%: 1kJ = ~4kcal)
          if (!calorias && kilojoules) calorias = Math.round(kilojoules * 4)
        }
      } catch {}

      const fcMedia = a.average_heartrate ? Math.round(a.average_heartrate) : null
      let intensidade = 2
      if (fcMedia) intensidade = fcMedia > 160 ? 5 : fcMedia > 140 ? 4 : fcMedia > 120 ? 3 : 2
      else if (a.suffer_score) intensidade = a.suffer_score > 100 ? 5 : a.suffer_score > 60 ? 4 : a.suffer_score > 30 ? 3 : 2

      const payload = {
        usuario_id: usuarioId,
        data,
        modalidade,
        duracao_min: duracao,
        distancia_km: a.distance ? Math.round(a.distance / 100) / 10 : null,
        calorias_estimadas: calorias,
        calorias_wearable: calorias,
        intensidade,
        fc_media: fcMedia,
        elevacao: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
        observacoes: `Strava · ${a.name ?? modalidade}`,
        strava_activity_id: a.id,
      }

      if (existe) {
        // Atualiza só se não tinha calorias antes e agora tem
        if (!existe.calorias_estimadas && calorias) {
          const { error } = await supabase.from('atividades_livres').update({ calorias_estimadas: calorias, calorias_wearable: calorias }).eq('id', existe.id)
          if (!error) atualizados++
        }
        continue
      }

      const { error } = await supabase.from('atividades_livres').insert(payload)
      if (error) { erros++; console.error('[Sync]', error.message) }
      else inseridos++
    }

    await supabase.from('strava_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('usuario_id', usuarioId)

    return NextResponse.json({ sucesso: true, inseridos, atualizados, erros, total: atividades.length })
  } catch (err) {
    console.error('[Strava Sync]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
