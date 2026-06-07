import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '../_rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

type Sugestao = { nome: string; quantidade: string; calorias: number; proteina: number }

export async function POST(req: NextRequest) {
  try {
    const { usuarioId, alimento, paciente } = await req.json()
    if (!alimento?.nome) return NextResponse.json({ erro: 'Alimento não informado.' }, { status: 400 })

    const rl = await checkRateLimit(usuarioId ?? null, 'substituicoes')
    if (!rl.ok) return rl.erro!

    const macros = [
      alimento.calorias ? `${alimento.calorias} kcal` : null,
      alimento.proteina ? `${alimento.proteina}g proteína` : null,
    ].filter(Boolean).join(', ')

    const prompt = `Você é nutricionista clínico especialista em equivalência de alimentos. Sugira de 3 a 4 alimentos substitutos para o alimento abaixo, mantendo equivalência calórica e proteica aproximada — para o paciente trocar quando quiser variar o cardápio sem fugir do plano.

ALIMENTO ATUAL: ${alimento.nome}${alimento.quantidade ? ` — ${alimento.quantidade}` : ''}${macros ? ` (${macros})` : ''}

CONTEXTO DO PACIENTE:
- Objetivo: ${OBJETIVO_LABEL[paciente?.objetivo ?? ''] ?? 'não informado'}
- Peso: ${paciente?.peso ? `${paciente.peso}kg` : 'não informado'}
- Restrições/alergias alimentares: ${paciente?.restricoes || 'nenhuma informada'}

REGRAS:
- NUNCA sugira algo incompatível com as restrições/alergias do paciente
- Mantenha kcal e proteína o mais próximo possível do alimento original (equivalência nutricional)
- Use alimentos comuns, acessíveis e populares no Brasil
- A quantidade sugerida deve ser prática de medir em casa (gramas, unidades, colheres, xícaras...)

Responda APENAS com um array JSON válido, sem texto antes ou depois, neste formato exato:
[{ "nome": "Batata doce cozida", "quantidade": "250g", "calorias": 215, "proteina": 4 }]`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: 'Responda APENAS com um array JSON válido. Nunca inclua texto, explicações ou markdown fora do array.',
      messages: [{ role: 'user', content: prompt }],
    })

    const texto = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const match = texto.match(/\[[\s\S]*\]/)
    let sugestoes: Sugestao[] = []
    if (match) {
      try {
        const arr = JSON.parse(match[0])
        if (Array.isArray(arr)) {
          sugestoes = arr
            .filter((s): s is Record<string, unknown> => !!s && typeof s.nome === 'string')
            .slice(0, 4)
            .map(s => ({
              nome: String(s.nome).trim(),
              quantidade: String(s.quantidade ?? '').trim(),
              calorias: Math.round(Number(s.calorias) || 0),
              proteina: Math.round((Number(s.proteina) || 0) * 10) / 10,
            }))
        }
      } catch { /* mantém array vazio — tratado abaixo */ }
    }

    if (sugestoes.length === 0) {
      return NextResponse.json({ erro: 'Não foi possível gerar sugestões agora. Tente novamente.' }, { status: 502 })
    }
    return NextResponse.json({ sugestoes })
  } catch (err) {
    console.error('Erro ao sugerir substituições:', err)
    return NextResponse.json({ erro: 'Erro ao gerar sugestões.' }, { status: 500 })
  }
}
