import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

const STATUS = ['aberto', 'em_andamento', 'resolvido', 'fechado']

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''

    let query = supabaseAdmin
      .from('tickets_sac')
      .select('id, user_id, canal, assunto, descricao, status, prioridade, csat, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (status) query = query.eq('status', status)

    const { data: tickets } = await query

    const { data: todos } = await supabaseAdmin.from('tickets_sac').select('status')
    const contagem: Record<string, number> = { aberto: 0, em_andamento: 0, resolvido: 0, fechado: 0 }
    for (const t of todos || []) {
      if (contagem[t.status] !== undefined) contagem[t.status] = contagem[t.status] + 1
    }

    return NextResponse.json({ tickets: tickets || [], contagem })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar tickets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const id = body?.id
    const status = body?.status
    if (!id || !STATUS.includes(status)) {
      return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('tickets_sac')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ erro: 'Falha ao atualizar.' }, { status: 500 })

    try {
      await supabaseAdmin.from('audit_log').insert({
        admin_id: admin.userId,
        acao: `ticket:status:${status}`,
        entidade: 'tickets_sac',
        entidade_id: String(id),
      })
    } catch { /* silencioso */ }

    return NextResponse.json({ ok: true, resultado: 'Ticket atualizado.' })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar ticket.' }, { status: 500 })
  }
}
