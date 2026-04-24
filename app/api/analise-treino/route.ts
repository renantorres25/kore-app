import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ erro: 'Prompt não fornecido.' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'Você é o coach de IA do KORE. Responda SEMPRE em texto corrido, sem markdown, sem asteriscos, sem negrito. Seja direto e objetivo.',
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