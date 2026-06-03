import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '../_rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    let usuarioId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      usuarioId = data.user?.id ?? null
    }

    const { mensagens, systemPrompt, usuarioId: bodyUserId } = await req.json()
    usuarioId = usuarioId ?? bodyUserId ?? null

    const rl = await checkRateLimit(usuarioId, 'chat')
    if (!rl.ok) return rl.erro!

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