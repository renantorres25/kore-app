import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

async function contar(tabela: string): Promise<number | null> {
  try {
    const { count } = await supabaseAdmin.from(tabela).select('*', { count: 'exact', head: true })
    return count ?? 0
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const integracoes = {
      banco: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ia: !!process.env.ANTHROPIC_API_KEY,
      email: !!process.env.RESEND_API_KEY,
      pagamento: !!process.env.STRIPE_SECRET_KEY || !!process.env.PAGARME_API_KEY || !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    }
    const conexoes = {
      strava: await contar('strava_connections'),
      terra: await contar('terra_connections'),
    }
    const consentimentos = await contar('consentimentos')

    return NextResponse.json({ integracoes, conexoes, consentimentos })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar sistema' }, { status: 500 })
  }
}
