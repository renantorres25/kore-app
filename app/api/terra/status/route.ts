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
    .from('terra_connections')
    .select('provider, last_sync, connected_at')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
    .single()

  if (!data) return NextResponse.json({ conectado: false })

  return NextResponse.json({
    conectado: true,
    provider: data.provider,
    last_sync: data.last_sync,
    connected_at: data.connected_at,
  })
}

export async function DELETE(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get('usuarioId')
  if (!usuarioId) return NextResponse.json({ ok: false })

  // Desconecta no Terra
  const { data: conn } = await supabase
    .from('terra_connections')
    .select('terra_user_id')
    .eq('usuario_id', usuarioId)
    .single()

  if (conn?.terra_user_id) {
    await fetch(`https://api.tryterra.co/v2/auth/deauthUser?user_id=${conn.terra_user_id}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': process.env.TERRA_API_KEY!,
        'dev-id': process.env.TERRA_DEV_ID!,
      },
    })
  }

  await supabase.from('terra_connections')
    .update({ ativo: false })
    .eq('usuario_id', usuarioId)

  return NextResponse.json({ ok: true })
}
