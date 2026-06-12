import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../../lib/supabaseAdmin'

type Ctx = { params: Promise<{ id: string }> }

// ── Detalhe do usuário ───────────────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(req, ['super_admin', 'admin', 'sac'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const { data: perfil } = await supabaseAdmin
    .from('perfis')
    .select('id, nome, email, tipo, objetivo, peso, altura, sexo, data_nascimento, nivel, meta_peso, meta_data_limite, fcmax, ftp')
    .eq('id', id)
    .maybeSingle()

  if (!perfil) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

  // Dados de autenticação (cadastro, último acesso, suspensão)
  let auth: any = null
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id)
    const u: any = data?.user
    if (u) {
      auth = {
        created_at: u.created_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
        email_confirmed_at: u.email_confirmed_at || null,
        banned_until: u.banned_until || null,
      }
    }
  } catch { /* segue sem auth */ }

  // Vínculos (defensivo — se as colunas diferirem, retorna vazio)
  let vinculos: any[] = []
  try {
    const { data, error } = await supabaseAdmin
      .from('vinculos')
      .select('*')
      .or(`cliente_id.eq.${id},profissional_id.eq.${id}`)
    if (!error && data) vinculos = data
  } catch { /* segue sem vínculos */ }

  // Assinatura mais recente
  let assinatura: any = null
  try {
    const { data } = await supabaseAdmin
      .from('assinaturas')
      .select('plano, status, inicio, trial_fim')
      .eq('user_id', id)
      .order('inicio', { ascending: false })
      .limit(1)
      .maybeSingle()
    assinatura = data || null
  } catch { /* sem assinatura */ }

  return NextResponse.json({ perfil, auth, vinculos, assinatura })
}

// ── Ações administrativas sobre o usuário ────────────────────────────────────
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const acao = body?.acao as string
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null

  try {
    let resultado = ''
    const { data: antesPerfil } = await supabaseAdmin.from('perfis').select('nome, email, tipo').eq('id', id).maybeSingle()

    if (acao === 'suspender') {
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' } as any)
      resultado = 'Usuário suspenso.'
    } else if (acao === 'reativar') {
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' } as any)
      resultado = 'Usuário reativado.'
    } else if (acao === 'mudar_perfil') {
      const novo = body?.tipo
      if (!['cliente', 'personal', 'nutricionista'].includes(novo)) {
        return NextResponse.json({ erro: 'Perfil inválido.' }, { status: 400 })
      }
      const { error } = await supabaseAdmin.from('perfis').update({ tipo: novo }).eq('id', id)
      if (error) return NextResponse.json({ erro: 'Falha ao alterar perfil.' }, { status: 500 })
      resultado = `Perfil alterado para ${novo}.`
    } else if (acao === 'reset_senha') {
      const email = body?.email
      if (!email) return NextResponse.json({ erro: 'E-mail ausente.' }, { status: 400 })
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'https://kore-app-blue.vercel.app'}/nova-senha`
      await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
      resultado = 'E-mail de redefinição de senha enviado.'
    } else if (acao === 'registrar_assinatura') {
      const plano = body?.plano
      const status = body?.status || 'ativa'
      if (!['solo', 'conectado'].includes(plano)) {
        return NextResponse.json({ erro: 'Plano inválido.' }, { status: 400 })
      }
      const { error } = await supabaseAdmin.from('assinaturas').insert({ user_id: id, plano, status })
      if (error) return NextResponse.json({ erro: 'Falha ao registrar assinatura.' }, { status: 500 })
      resultado = `Assinatura ${plano} registrada (${status}).`
    } else if (acao === 'excluir') {
      if (admin.papel !== 'super_admin') {
        return NextResponse.json({ erro: 'Apenas super-admin pode excluir usuários.' }, { status: 403 })
      }
      if (body?.confirmar !== 'EXCLUIR') {
        return NextResponse.json({ erro: 'Confirmação inválida.' }, { status: 400 })
      }
      // Apaga todos os dados do usuário (função no banco, em transação).
      const { error } = await supabaseAdmin.rpc('excluir_usuario_kore', { uid: id })
      if (error) return NextResponse.json({ erro: 'Falha ao excluir os dados do usuário.' }, { status: 500 })
      // Remove o login (auth). O perfil já foi apagado pela função acima.
      try { await supabaseAdmin.auth.admin.deleteUser(id) } catch { /* segue */ }
      resultado = 'Usuário e todos os seus dados foram excluídos.'
    } else {
      return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
    }

    // Auditoria (não bloqueia a ação se falhar)
    try {
      await supabaseAdmin.from('audit_log').insert({
        admin_id: admin.userId,
        acao: `usuario:${acao}`,
        entidade: 'perfis',
        entidade_id: id,
        antes: antesPerfil,
        depois: body,
        ip,
      })
    } catch { /* silencioso */ }

    return NextResponse.json({ ok: true, resultado })
  } catch {
    return NextResponse.json({ erro: 'Erro ao executar a ação.' }, { status: 500 })
  }
}
