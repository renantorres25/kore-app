import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get('usuarioId')
  if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 })

  const clientId = process.env.STRAVA_CLIENT_ID
  if (!clientId) return NextResponse.json({ erro: 'STRAVA_CLIENT_ID não configurado' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kore-app-blue.vercel.app'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: usuarioId, // passamos o userId no state para recuperar no callback
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
