import { NextResponse } from 'next/server'

export async function POST() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const verifyToken = process.env.STRAVA_VERIFY_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kore-app-blue.vercel.app'

  if (!clientId || !clientSecret || !verifyToken) {
    return NextResponse.json({ erro: 'Variáveis de ambiente faltando', clientId: !!clientId, clientSecret: !!clientSecret, verifyToken: !!verifyToken }, { status: 500 })
  }

  const callbackUrl = `${baseUrl}/api/strava/webhook`

  // Primeiro verifica se já existe uma subscription
  const checkRes = await fetch(
    `https://www.strava.com/api/v3/push_subscriptions?client_id=${clientId}&client_secret=${clientSecret}`
  )
  const existing = await checkRes.json()

  if (Array.isArray(existing) && existing.length > 0) {
    return NextResponse.json({
      status: 'já_registrado',
      subscription: existing[0],
      message: 'Webhook já está ativo!',
    })
  }

  // Registra nova subscription
  const res = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ erro: 'Falha ao registrar', detalhes: data }, { status: 500 })
  }

  return NextResponse.json({
    status: 'registrado',
    subscription_id: data.id,
    callback_url: callbackUrl,
    message: 'Webhook registrado com sucesso! Atividades serão sincronizadas automaticamente.',
  })
}
