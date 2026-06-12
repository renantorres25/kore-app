import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'
import { listarAuthUsers } from '../../../lib/authUsers'

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
    // Período selecionável (7 / 30 / 90 dias). Padrão: 30.
    const diasParam = Number(new URL(req.url).searchParams.get('dias'))
    const dias = [7, 30, 90].includes(diasParam) ? diasParam : 30
    const desdePeriodo = new Date(agora - dias * 24 * 3600 * 1000).toISOString()
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
    let novosPeriodo: number | null = null
    let ativosPeriodo: number | null = null
    let crescimentoSemanal: number[] = []
    try {
      const usuariosAuth = await listarAuthUsers()
      const dP = new Date(desdePeriodo).getTime()
      const semanaMs = 7 * 24 * 3600 * 1000
      const semanas = [0, 0, 0, 0, 0, 0, 0, 0]
      let nP = 0
      let aP = 0
      for (const u of usuariosAuth) {
        const cr = u?.created_at ? new Date(u.created_at).getTime() : 0
        if (cr >= dP) nP = nP + 1
        const ls = u?.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0
        if (ls >= dP) aP = aP + 1
        if (cr) {
          const sem = Math.floor((agora - cr) / semanaMs)
          if (sem >= 0 && sem < 8) semanas[7 - sem] = semanas[7 - sem] + 1
        }
      }
      novosPeriodo = nP
      ativosPeriodo = aP
      crescimentoSemanal = semanas
    } catch {
      novosPeriodo = null
    }
    const vinculos = await safeCount(() =>
      supabaseAdmin.from('vinculos').select('*', { count: 'exact', head: true }).eq('ativo', true)
    )
    const eventosHoje = await safeCount(() =>
      supabaseAdmin.from('eventos').select('*', { count: 'exact', head: true }).gte('created_at', desde1)
    )
    const eventosPeriodo = await safeCount(() =>
      supabaseAdmin.from('eventos').select('*', { count: 'exact', head: true }).gte('created_at', desdePeriodo)
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
      dias,
      total,
      porTipo,
      novosPeriodo,
      ativosPeriodo,
      crescimentoSemanal,
      vinculos,
      assinantesAtivos,
      mrr,
      eventosHoje,
      eventosPeriodo,
      ticketsAbertos,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar indicadores' }, { status: 500 })
  }
}
