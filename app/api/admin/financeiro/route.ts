import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

const PRECOS: Record<string, number> = { solo: 79, conectado: 129 }

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin', 'financeiro'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { data: assinaturas } = await supabaseAdmin
      .from('assinaturas')
      .select('id, user_id, plano, status, inicio, trial_fim')
      .order('inicio', { ascending: false })
      .limit(300)

    const lista = assinaturas || []

    // Nomes dos usuários das assinaturas
    const ids = Array.from(new Set(lista.map((a: any) => a.user_id).filter(Boolean)))
    const nomes: Record<string, { nome: string | null; email: string | null }> = {}
    if (ids.length) {
      const { data: perfis } = await supabaseAdmin.from('perfis').select('id, nome, email').in('id', ids)
      for (const p of perfis || []) nomes[p.id] = { nome: p.nome, email: p.email }
    }
    const assinaturasComNome = lista.map((a: any) => ({
      ...a,
      nome: nomes[a.user_id]?.nome || null,
      email: nomes[a.user_id]?.email || null,
    }))

    // Resumo
    let mrr = 0
    let ativas = 0
    let trial = 0
    let inadimplentes = 0
    let canceladas = 0
    const porPlano: Record<string, number> = { solo: 0, conectado: 0 }
    for (const a of lista as any[]) {
      if (a.status === 'ativa') {
        ativas = ativas + 1
        mrr = mrr + (PRECOS[a.plano] || 0)
        porPlano[a.plano] = (porPlano[a.plano] || 0) + 1
      } else if (a.status === 'trial') trial = trial + 1
      else if (a.status === 'inadimplente') inadimplentes = inadimplentes + 1
      else if (a.status === 'cancelada') canceladas = canceladas + 1
    }

    // Pagamentos recentes
    let pagamentos: any[] = []
    try {
      const { data } = await supabaseAdmin
        .from('pagamentos')
        .select('id, valor, moeda, status, pago_em, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20)
      pagamentos = data || []
    } catch { /* sem pagamentos */ }

    return NextResponse.json({
      resumo: { mrr, ativas, trial, inadimplentes, canceladas, porPlano },
      assinaturas: assinaturasComNome,
      pagamentos,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar financeiro' }, { status: 500 })
  }
}
