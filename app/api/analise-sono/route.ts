import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro Anthropic:', data)
      return NextResponse.json({ analise: `Erro da API: ${data?.error?.message ?? 'desconhecido'}` })
    }

    const analise = data.content?.[0]?.text ?? 'Não foi possível gerar a análise.'
    return NextResponse.json({ analise })

  } catch (err) {
    console.error('Erro interno:', err)
    return NextResponse.json({ analise: 'Erro interno ao gerar análise.' })
  }
}