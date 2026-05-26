import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ erro: 'Email inválido.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('lista_espera')
      .insert({ email: email.toLowerCase().trim() })

    if (error && error.code !== '23505') {
      return NextResponse.json({ erro: 'Erro ao salvar.' }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true })
  } catch {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
