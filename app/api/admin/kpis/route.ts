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

    // Stats de auth.users: cadastro (novos) e último acesso (ativos).
    let novos30: number | null = null
    let novos7: number | null = null
    let ativos7: number | null = null
    let ativos30: number | null = null
    let crescimentoSemanal: number[] = []
    try {
      const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const usuariosAuth = lista?.users || []
      const d30 = new Date(desde30).getTime()
      const d7 = new Date(agora - 7 * 24 * 3600 * 1000).getTime()
      const semanaMs = 7 * 24 * 3600 * 1000
      const semanas = [0, 0, 0, 0, 0, 0, 0, 0]
      let n30 = 0
      let n7 = 0
      let a7 = 0
      let a30 = 0
      for (const u of usuariosAuth) {
        const cr = u?.created_at ? new Date(u.created_at).getTime() : 0
        if (cr >= d30) n30 = n30 + 1
        if (cr >= d7) n7 = n7 + 1
        const ls = u?.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0
        if (ls >= d7) a7 = a7 + 1
        if (ls >= d30) a30 = a30 + 1
        if (cr) {
          const sem = Math.floor((agora - cr) / semanaMs)
          if (sem >= 0 && sem < 8) semanas[7 - sem] = semanas[7 - sem] + 1
        }
      }
      novos30 = n30
      novos7 = n7
      ativos7 = a7
      ativos30 = a30
      crescimentoSemanal = semanas
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
      novos7,
      ativos7,
      ativos30,
      crescimentoSemanal,
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
