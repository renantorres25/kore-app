import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt, modo } = await req.json()

    if (!prompt) {
      return NextResponse.json({ erro: 'Prompt não fornecido.' }, { status: 400 })
    }

    const isPlano = modo === 'plano'

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: isPlano ? 4096 : 400,
      system: isPlano
        ? 'Você é uma nutricionista ou personal trainer especialista. Responda APENAS com JSON válido e completo, exatamente no formato solicitado. Nunca adicione texto fora do JSON. Nunca truncue o JSON. O JSON deve ser completo e fechado.'
        : 'Você é coach de IA do KORE. Responda SEMPRE em texto corrido, sem títulos, sem markdown, sem asteriscos, sem negrito, sem emojis. Vá direto ao conteúdo, nunca use cabeçalhos como "Análise:" ou "Balanço do dia:".',
      messages: [
        { role: 'user', content: prompt }
      ],
    })

    const analise = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ analise })
  } catch (err) {
    console.error('Erro na análise de treino:', err)
    return NextResponse.json({ erro: 'Erro ao gerar análise.' }, { status: 500 })
  }
}