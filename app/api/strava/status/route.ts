import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get('usuarioId')
  if (!usuarioId) return NextResponse.json({ conectado: false })

  const { data } = await supabase
    .from('strava_connections')
    .select('athlete_name, athlete_photo, last_sync, connected_at')
    .eq('usuario_id', usuarioId)
    .single()

  if (!data) return NextResponse.json({ conectado: false })
  return NextResponse.json({ conectado: true, ...data })
}

export async function DELETE(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get('usuarioId')
  if (!usuarioId) return NextResponse.json({ ok: false })

  const { data: conn } = await supabase
    .from('strava_connections')
    .select('access_token')
    .eq('usuario_id', usuarioId)
    .single()

  // Revoga token no Strava
  if (conn?.access_token) {
    await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: conn.access_token }),
    })
  }

  await supabase.from('strava_connections').delete().eq('usuario_id', usuarioId)
  return NextResponse.json({ ok: true })
}
