import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

const STATUS = ['aberto', 'em_andamento', 'resolvido', 'fechado']

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin', 'sac'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const ticketId = searchParams.get('ticket_id') || ''

    // Conversa de um ticket específico.
    if (ticketId) {
      const { data: mensagens } = await supabaseAdmin
        .from('ticket_mensagens')
        .select('id, autor_tipo, autor_id, mensagem, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      return NextResponse.json({ mensagens: mensagens || [] })
    }

    let query = supabaseAdmin
      .from('tickets_sac')
      .select('id, user_id, canal, assunto, descricao, status, prioridade, csat, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (status) query = query.eq('status', status)

    const { data: ticketsRaw } = await query

    // Busca nome/e-mail dos solicitantes em uma segunda consulta (mais robusto que embed).
    const ids = [...new Set((ticketsRaw || []).map((t: any) => t.user_id).filter(Boolean))]
    const mapaPerfil: Record<string, { nome: string | null; email: string | null }> = {}
    if (ids.length) {
      const { data: perfis } = await supabaseAdmin.from('perfis').select('id, nome, email').in('id', ids)
      for (const p of perfis || []) mapaPerfil[p.id] = { nome: p.nome ?? null, email: p.email ?? null }
    }
    const tickets = (ticketsRaw || []).map((t: any) => ({
      ...t,
      solicitante_nome: mapaPerfil[t.user_id]?.nome ?? null,
      solicitante_email: mapaPerfil[t.user_id]?.email ?? null,
    }))

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
  const admin = await requireAdmin(req, ['super_admin', 'admin', 'sac'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const id = body?.id
    if (!id) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 })

    // Resposta do admin (mensagem na conversa do ticket).
    if (typeof body?.mensagem === 'string') {
      const msg = body.mensagem.trim()
      if (!msg) return NextResponse.json({ erro: 'Mensagem vazia.' }, { status: 400 })
      const { error: errMsg } = await supabaseAdmin.from('ticket_mensagens').insert({
        ticket_id: id,
        autor_id: admin.userId,
        autor_tipo: 'admin',
        mensagem: msg,
      })
      if (errMsg) return NextResponse.json({ erro: 'Falha ao enviar a resposta.' }, { status: 500 })
      // Ao responder um ticket ainda 'aberto', move para 'em_andamento'.
      await supabaseAdmin
        .from('tickets_sac')
        .update({ status: 'em_andamento', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'aberto')
      try {
        await supabaseAdmin.from('audit_log').insert({
          admin_id: admin.userId,
          acao: 'ticket:resposta',
          entidade: 'tickets_sac',
          entidade_id: String(id),
          ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
        })
      } catch { /* silencioso */ }
      return NextResponse.json({ ok: true, resultado: 'Resposta enviada.' })
    }

    // Mudança de status.
    const status = body?.status
    if (!STATUS.includes(status)) {
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
        ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      })
    } catch { /* silencioso */ }

    return NextResponse.json({ ok: true, resultado: 'Ticket atualizado.' })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar ticket.' }, { status: 500 })
  }
}
