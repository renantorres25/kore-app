import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

// Conta valores distintos de uma coluna (escala piloto — conta em memória).
async function distinct(tabela: string, coluna: string): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin.from(tabela).select(coluna).limit(10000)
    if (error) return null
    const s = new Set<string>()
    for (const r of (data || []) as any[]) if (r[coluna]) s.add(r[coluna])
    return s.size
  } catch {
    return null
  }
}

async function contar(build: () => any): Promise<number | null> {
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
    const totalAtletas =
      (await contar(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'cliente'))) ?? 0

    const perfilCompleto = await contar(() =>
      supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'cliente').eq('perfil_completo', true)
    )

    // Wearable conectado: distinto entre strava + terra
    let comWearable: number | null = null
    try {
      const s = new Set<string>()
      const a = await supabaseAdmin.from('strava_connections').select('usuario_id').limit(10000)
      const b = await supabaseAdmin.from('terra_connections').select('usuario_id').limit(10000)
      for (const r of (a.data || []) as any[]) if (r.usuario_id) s.add(r.usuario_id)
      for (const r of (b.data || []) as any[]) if (r.usuario_id) s.add(r.usuario_id)
      comWearable = s.size
    } catch { comWearable = null }

    const comBemEstar = await distinct('bem_estar', 'usuario_id')
    const comSono = await distinct('sono', 'usuario_id')
    const comTreino = await distinct('treinos', 'cliente_id')

    // Engajamento: registros de bem-estar por dia (14 dias) + ativos por registro (7 dias)
    const engajamento: { dia: string; n: number }[] = []
    let ativos7Registro: number | null = null
    try {
      const desde14 = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      const d7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      const { data } = await supabaseAdmin.from('bem_estar').select('usuario_id, data').gte('data', desde14).limit(10000)
      const buckets: Record<string, number> = {}
      const set7 = new Set<string>()
      for (const r of (data || []) as any[]) {
        const dia = String(r.data)
        buckets[dia] = (buckets[dia] || 0) + 1
        if (dia >= d7 && r.usuario_id) set7.add(r.usuario_id)
      }
      for (let i = 13; i >= 0; i--) {
        const dia = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)
        engajamento.push({ dia, n: buckets[dia] || 0 })
      }
      ativos7Registro = set7.size
    } catch { ativos7Registro = null }

    return NextResponse.json({
      totalAtletas, perfilCompleto, comWearable, comBemEstar, comSono, comTreino, engajamento, ativos7Registro,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar análise' }, { status: 500 })
  }
}
