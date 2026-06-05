import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json()
    if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 })

    // Busca somente as atividades do Strava sem calorias
    const { data: semCalorias } = await supabase
      .from('atividades_livres')
      .select('id, strava_activity_id')
      .eq('usuario_id', usuarioId)
      .is('calorias_wearable', null)
      .not('strava_activity_id', 'is', null)
      .order('data', { ascending: false })
      .limit(150)

    if (!semCalorias?.length) return NextResponse.json({ sucesso: true, atualizados: 0 })

    // Busca conexão Strava
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

    let atualizados = 0
    let semDados = 0

    for (const ativ of semCalorias) {
      try {
        const res = await fetch(
          `https://www.strava.com/api/v3/activities/${ativ.strava_activity_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) continue

        const detail = await res.json()
        let calorias: number | null = detail.calories ? Math.round(detail.calories) : null
        // Ciclismo: kilojoules → kcal (eficiência ~25%)
        if (!calorias && detail.kilojoules) calorias = Math.round(detail.kilojoules * 4)

        if (calorias && calorias > 0) {
          await supabase
            .from('atividades_livres')
            .update({ calorias_wearable: calorias, calorias_estimadas: calorias })
            .eq('id', ativ.id)
          atualizados++
        } else {
          semDados++
        }
      } catch {
        // ignora falhas individuais
      }
    }

    return NextResponse.json({ sucesso: true, atualizados, semDados, total: semCalorias.length })
  } catch (err) {
    console.error('[Backfill Calorias]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
