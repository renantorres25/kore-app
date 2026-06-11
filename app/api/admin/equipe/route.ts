import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

const PAPEIS = ['super_admin', 'admin', 'financeiro', 'sac', 'analista']

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { data: equipe } = await supabaseAdmin
      .from('admin_users')
      .select('id, user_id, papel, ativo, created_at')
      .order('created_at', { ascending: true })

    const lista = (equipe || []) as any[]
    const ids = lista.map((a) => a.user_id).filter(Boolean)
    const info: Record<string, { nome: string | null; email: string | null }> = {}
    if (ids.length) {
      const { data: perfis } = await supabaseAdmin.from('perfis').select('id, nome, email').in('id', ids)
      for (const p of perfis || []) info[p.id] = { nome: p.nome, email: p.email }
    }
    const enriched = lista.map((a) => ({ ...a, nome: info[a.user_id]?.nome || null, email: info[a.user_id]?.email || null }))

    return NextResponse.json({ equipe: enriched, eu: admin.userId, souSuperAdmin: admin.papel === 'super_admin' })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar equipe' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (admin.papel !== 'super_admin') {
    return NextResponse.json({ erro: 'Apenas super-admin pode gerenciar a equipe.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const acao = body?.acao

  try {
    let resultado = ''

    if (acao === 'adicionar') {
      const email = String(body?.email || '').trim().toLowerCase()
      const papel = body?.papel
      if (!email || !PAPEIS.includes(papel)) {
        return NextResponse.json({ erro: 'E-mail ou papel inválido.' }, { status: 400 })
      }
      const { data: perfil } = await supabaseAdmin.from('perfis').select('id').ilike('email', email).maybeSingle()
      if (!perfil) return NextResponse.json({ erro: 'Nenhum usuário do KORE com esse e-mail.' }, { status: 404 })
      const { error } = await supabaseAdmin.from('admin_users').insert({ user_id: perfil.id, papel, ativo: true })
      if (error) return NextResponse.json({ erro: 'Já é admin ou falha ao adicionar.' }, { status: 500 })
      resultado = 'Admin adicionado.'
    } else if (acao === 'mudar_papel') {
      const userId = body?.user_id
      const papel = body?.papel
      if (!userId || !PAPEIS.includes(papel)) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 })
      await supabaseAdmin.from('admin_users').update({ papel }).eq('user_id', userId)
      resultado = 'Papel atualizado.'
    } else if (acao === 'ativar' || acao === 'desativar') {
      const userId = body?.user_id
      if (!userId) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 })
      if (acao === 'desativar' && userId === admin.userId) {
        return NextResponse.json({ erro: 'Você não pode desativar a si mesmo.' }, { status: 400 })
      }
      await supabaseAdmin.from('admin_users').update({ ativo: acao === 'ativar' }).eq('user_id', userId)
      resultado = acao === 'ativar' ? 'Admin reativado.' : 'Admin desativado.'
    } else {
      return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
    }

    try {
      await supabaseAdmin.from('audit_log').insert({
        admin_id: admin.userId,
        acao: `equipe:${acao}`,
        entidade: 'admin_users',
        entidade_id: body?.user_id || body?.email || null,
        depois: body,
      })
    } catch { /* silencioso */ }

    return NextResponse.json({ ok: true, resultado })
  } catch {
    return NextResponse.json({ erro: 'Erro na ação.' }, { status: 500 })
  }
}
