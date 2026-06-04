import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json()

    const { data: conn, error: connErr } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single()

    if (connErr || !conn) return NextResponse.json({ erro: 'Conexão não encontrada', connErr })

    const tokenExpirado = new Date(conn.expires_at) <= new Date()

    // Tenta refresh se expirado
    let token = conn.access_token
    if (tokenExpirado) {
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
      if (!r.ok) return NextResponse.json({ erro: 'Refresh falhou', status: r.status, body: rd })
      token = rd.access_token
      // Atualiza token no banco
      await supabase.from('strava_connections').update({
        access_token: rd.access_token,
        refresh_token: rd.refresh_token,
        expires_at: new Date(rd.expires_at * 1000).toISOString(),
        scope: rd.scope ?? conn.scope,
      }).eq('usuario_id', usuarioId)
    }

    // Testa chamada à API Strava
    const noventa = Math.floor(Date.now() / 1000) - 90 * 24 * 3600
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${noventa}&per_page=10`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const atividades = await res.json()

    return NextResponse.json({
      token_expirado: tokenExpirado,
      token_refreshed: tokenExpirado,
      athlete_name: conn.athlete_name,
      scope: conn.scope,
      strava_status: res.status,
      total_retornado: Array.isArray(atividades) ? atividades.length : 0,
      primeiras_atividades: Array.isArray(atividades) ? atividades.slice(0, 3).map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.sport_type ?? a.type,
        date: a.start_date_local,
        duration_min: Math.round((a.moving_time ?? 0) / 60),
        distance_km: a.distance ? Math.round(a.distance / 100) / 10 : 0,
        calories: a.calories,
      })) : atividades,
    })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message })
  }
}
