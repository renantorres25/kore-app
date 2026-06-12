import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { data: templates } = await supabaseAdmin
      .from('templates_planos')
      .select('id, nome, objetivo, publico, criado_por, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    return NextResponse.json({ templates: templates || [] })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar conteúdo' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const acao = body?.acao
    const id = body?.id
    if (!id) return NextResponse.json({ erro: 'ID ausente.' }, { status: 400 })

    let resultado = ''
    if (acao === 'toggle_publico') {
      const { error } = await supabaseAdmin.from('templates_planos').update({ publico: !!body?.publico }).eq('id', id)
      if (error) return NextResponse.json({ erro: 'Falha ao atualizar.' }, { status: 500 })
      resultado = body?.publico ? 'Template publicado.' : 'Template despublicado.'
    } else if (acao === 'excluir') {
      const { error } = await supabaseAdmin.from('templates_planos').delete().eq('id', id)
      if (error) return NextResponse.json({ erro: 'Falha ao excluir.' }, { status: 500 })
      resultado = 'Template excluído.'
    } else {
      return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
    }

    try {
      await supabaseAdmin.from('audit_log').insert({
        admin_id: admin.userId, acao: `conteudo:${acao}`, entidade: 'templates_planos', entidade_id: String(id), depois: body,
        ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      })
    } catch { /* silencioso */ }

    return NextResponse.json({ ok: true, resultado })
  } catch {
    return NextResponse.json({ erro: 'Erro na ação.' }, { status: 500 })
  }
}
