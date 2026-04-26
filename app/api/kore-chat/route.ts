import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { mensagens, systemPrompt } = await req.json()

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: mensagens.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const resposta = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ resposta })
  } catch (err) {
    console.error('Erro no chat:', err)
    return NextResponse.json({ resposta: 'Erro ao processar. Tente novamente.' }, { status: 500 })
  }
}