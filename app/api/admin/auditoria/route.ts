import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { data: logs } = await supabaseAdmin
      .from('audit_log')
      .select('id, admin_id, acao, entidade, entidade_id, ip, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    const lista = (logs || []) as any[]
    const ids = Array.from(new Set(lista.map((l) => l.admin_id).filter(Boolean)))
    const nomes: Record<string, string> = {}
    if (ids.length) {
      const { data: perfis } = await supabaseAdmin.from('perfis').select('id, nome, email').in('id', ids)
      for (const p of perfis || []) nomes[p.id] = p.nome || p.email || 'Admin'
    }

    const enriched = lista.map((l) => ({ ...l, admin_nome: nomes[l.admin_id] || 'Sistema' }))
    return NextResponse.json({ logs: enriched })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar auditoria' }, { status: 500 })
  }
}
