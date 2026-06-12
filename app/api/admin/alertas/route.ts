import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'
import { listarAuthUsers } from '../../../lib/authUsers'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const alertas: { nivel: string; texto: string }[] = []

  try {
    // IDs por tipo
    const { data: clientes } = await supabaseAdmin.from('perfis').select('id').eq('tipo', 'cliente')
    const { data: pros } = await supabaseAdmin.from('perfis').select('id').in('tipo', ['personal', 'nutricionista'])
    const clienteIds = new Set((clientes || []).map((c: any) => c.id))
    const proIds = (pros || []).map((p: any) => p.id)

    // Último acesso (auth) — via helper com cache
    const ultimoAcesso: Record<string, number> = {}
    try {
      const us = await listarAuthUsers()
      for (const u of us) ultimoAcesso[u.id] = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0
    } catch { /* segue */ }

    const corte14 = Date.now() - 14 * 24 * 3600 * 1000
    let inativos = 0
    for (const id of clienteIds) if ((ultimoAcesso[id] || 0) < corte14) inativos = inativos + 1
    if (inativos > 0) alertas.push({ nivel: 'alerta', texto: `${inativos} atleta(s) sem acessar há mais de 14 dias` })

    // Profissionais sem assinatura ativa
    try {
      const { data: ativas } = await supabaseAdmin.from('assinaturas').select('user_id').eq('status', 'ativa')
      const comAssinatura = new Set((ativas || []).map((a: any) => a.user_id))
      const proSemAssin = proIds.filter((id) => !comAssinatura.has(id)).length
      if (proSemAssin > 0) alertas.push({ nivel: 'info', texto: `${proSemAssin} profissional(is) sem assinatura ativa` })
    } catch { /* segue */ }

    // Tickets de SAC abertos
    try {
      const { count } = await supabaseAdmin.from('tickets_sac').select('*', { count: 'exact', head: true }).eq('status', 'aberto')
      if ((count || 0) > 0) alertas.push({ nivel: 'alerta', texto: `${count} ticket(s) de SAC aguardando atendimento` })
    } catch { /* segue */ }

    // Atletas sem nenhum registro de sono
    try {
      const { data: sono } = await supabaseAdmin.from('sono').select('usuario_id').limit(10000)
      const comSono = new Set((sono || []).map((s: any) => s.usuario_id))
      let semSono = 0
      for (const id of clienteIds) if (!comSono.has(id)) semSono = semSono + 1
      if (semSono > 0) alertas.push({ nivel: 'info', texto: `${semSono} atleta(s) ainda sem nenhum registro de sono` })
    } catch { /* segue */ }

    return NextResponse.json({ alertas })
  } catch {
    return NextResponse.json({ alertas })
  }
}
