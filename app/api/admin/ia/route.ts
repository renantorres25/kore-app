import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const PRECOS: Record<string, number> = { solo: 79, conectado: 129 }

async function cnt(build: () => any): Promise<number> {
  try {
    const { count } = await build()
    return count ?? 0
  } catch {
    return 0
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { pergunta } = await req.json().catch(() => ({}))
    if (!pergunta || typeof pergunta !== 'string') {
      return NextResponse.json({ erro: 'Pergunta ausente.' }, { status: 400 })
    }

    // Snapshot de métricas (a IA só enxerga isto — não tem acesso direto ao banco)
    const snap: any = {}
    snap.usuarios_total = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }))
    snap.atletas = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'cliente'))
    snap.personais = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'personal'))
    snap.nutricionistas = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'nutricionista'))
    snap.vinculos = await cnt(() => supabaseAdmin.from('vinculos').select('*', { count: 'exact', head: true }))
    snap.tickets_abertos = await cnt(() => supabaseAdmin.from('tickets_sac').select('*', { count: 'exact', head: true }).eq('status', 'aberto'))
    snap.eventos_total = await cnt(() => supabaseAdmin.from('eventos').select('*', { count: 'exact', head: true }))
    try {
      const { data: assin } = await supabaseAdmin.from('assinaturas').select('plano, status')
      const ativas = (assin || []).filter((a: any) => a.status === 'ativa')
      snap.assinaturas_ativas = ativas.length
      snap.mrr_reais = ativas.reduce((s: number, a: any) => s + (PRECOS[a.plano] || 0), 0)
    } catch {
      snap.assinaturas_ativas = 0
      snap.mrr_reais = 0
    }

    const system = `Você é um analista do backoffice do KORE (plataforma de performance que conecta atletas, personais e nutricionistas). Responda à pergunta do administrador SOMENTE com base nos dados do bloco DADOS. Se a resposta não estiver nos dados, diga que esse dado não está disponível no momento. Seja direto, em português do Brasil, use números e não invente.

DADOS (JSON):
${JSON.stringify(snap)}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: pergunta }],
    })
    const resposta = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ resposta })
  } catch {
    return NextResponse.json({ erro: 'Erro ao consultar a IA.' }, { status: 500 })
  }
}
