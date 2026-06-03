import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json()
    if (!usuarioId) return NextResponse.json({ erro: 'Usuário não autenticado.' }, { status: 401 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kore-app-blue.vercel.app'

    const res = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TERRA_API_KEY!,
        'dev-id': process.env.TERRA_DEV_ID!,
      },
      body: JSON.stringify({
        reference_id: usuarioId,
        resource: 'FITBIT,GARMIN,OURA,POLAR,WHOOP,SAMSUNG,WITHINGS',
        auth_success_redirect_url: `${baseUrl}/dashboard?wearable=conectado`,
        auth_failure_redirect_url: `${baseUrl}/perfil?wearable=erro`,
        language: 'pt',
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.url) {
      console.error('[Terra] Erro ao gerar sessão:', data)
      return NextResponse.json({ erro: 'Erro ao conectar com Terra API.' }, { status: 500 })
    }

    return NextResponse.json({ url: data.url, session_id: data.session_id })
  } catch (err) {
    console.error('[Terra] Erro interno:', err)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
