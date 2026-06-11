import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

// Conta resiliente: se uma coluna/tabela não existir, devolve null em vez de quebrar tudo.
async function safeCount(build: () => any): Promise<number | null> {
  try {
    const { count, error } = await build()
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const agora = Date.now()
    const desde30 = new Date(agora - 30 * 24 * 3600 * 1000).toISOString()
    const desde1 = new Date(agora - 24 * 3600 * 1000).toISOString()

    const total = await safeCount(() =>
      supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true })
    )

    const tipos = ['cliente', 'personal', 'nutricionista']
    const porTipo: Record<string, number> = {}
    for (const t of tipos) {
      porTipo[t] =
        (await safeCount(() =>
          supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', t)
        )) ?? 0
    }

    // Novos usuários: data de cadastro vem do auth.users (sempre tem created_at).
    let novos30: number | null = null
    try {
      const corte = new Date(desde30).getTime()
      const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const usuariosAuth = lista?.users || []
      let n = 0
      for (const u of usuariosAuth) {
        const c = u?.created_at ? new Date(u.created_at).getTime() : 0
        if (c >= corte) n = n + 1
      }
      novos30 = n
    } catch {
      novos30 = null
    }
    const vinculos = await safeCount(() =>
      supabaseAdmin.from('vinculos').select('*', { count: 'exact', head: true })
    )
    const eventosHoje = await safeCount(() =>
      supabaseAdmin.from('eventos').select('*', { count: 'exact', head: true }).gte('created_at', desde1)
    )
    const ticketsAbertos = await safeCount(() =>
      supabaseAdmin.from('tickets_sac').select('*', { count: 'exact', head: true }).eq('status', 'aberto')
    )

    // Assinaturas ativas + MRR estimado
    const precos: Record<string, number> = { solo: 79, conectado: 129 }
    let assinantesAtivos = 0
    let mrr = 0
    try {
      const { data: assinaturas } = await supabaseAdmin
        .from('assinaturas')
        .select('plano')
        .eq('status', 'ativa')
      assinantesAtivos = assinaturas?.length ?? 0
      mrr = (assinaturas || []).reduce((s: number, a: any) => s + (precos[a.plano] || 0), 0)
    } catch {
      /* tabela ainda sem dados */
    }

    return NextResponse.json({
      total,
      porTipo,
      novos30,
      vinculos,
      assinantesAtivos,
      mrr,
      eventosHoje,
      ticketsAbertos,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar indicadores' }, { status: 500 })
  }
}
