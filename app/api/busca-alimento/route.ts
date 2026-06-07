import { NextRequest, NextResponse } from 'next/server'

const USDA_KEY = process.env.USDA_API_KEY ?? 'DEMO_KEY'

type FoodNutrient = { nutrientId: number; value: number }
type UsdaFood = {
  fdcId: number
  description: string
  foodCategory?: string
  foodNutrients: FoodNutrient[]
}

function getNutrient(nutrients: FoodNutrient[], id: number): number {
  return Math.round((nutrients.find(n => n.nutrientId === id)?.value ?? 0) * 10) / 10
}

// A base USDA é em inglês — traduzimos o termo de busca (PT→EN) antes de consultar
// e os nomes dos resultados (EN→PT) antes de exibir, com cache em memória para
// não pagar o custo de tradução a cada busca repetida (ex.: "frango", "arroz"...).
const cacheTermo = new Map<string, string>()
const cacheNome = new Map<number, string>()

async function perguntarClaude(prompt: string, maxTokens: number): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.content?.[0]?.text ?? '').trim() || null
  } catch {
    return null
  }
}

async function traduzirTermoParaIngles(termo: string): Promise<string> {
  const chave = termo.trim().toLowerCase()
  const emCache = cacheTermo.get(chave)
  if (emCache) return emCache

  const resposta = await perguntarClaude(
    `Traduza este termo de busca de alimento do português para inglês, para pesquisar na base de dados USDA FoodData Central (EUA). Responda apenas com o termo traduzido, sem explicações, aspas ou pontuação extra.\n\nTermo: ${termo}`,
    20,
  )
  const traduzido = resposta?.split('\n')[0]?.trim().replace(/^["']|["']$/g, '') || termo
  cacheTermo.set(chave, traduzido)
  return traduzido
}

async function traduzirNomesParaPortugues(itens: { id: number; nome: string }[]): Promise<Map<number, string>> {
  const resultado = new Map<number, string>()
  const faltantes = itens.filter(it => {
    const emCache = cacheNome.get(it.id)
    if (emCache) { resultado.set(it.id, emCache); return false }
    return true
  })
  if (faltantes.length === 0) return resultado

  const resposta = await perguntarClaude(
    `Traduza estes nomes de alimentos do inglês (base USDA) para português do Brasil, em linguagem natural usada por nutricionistas (ex.: "Chicken, broiler, breast, meat only, cooked, grilled" → "Frango, peito, grelhado"). Responda APENAS com um array JSON de strings na mesma ordem da entrada, sem nenhum texto antes ou depois.\n\nEntrada: ${JSON.stringify(faltantes.map(it => it.nome))}`,
    600,
  )

  let traducoes: string[] | null = null
  if (resposta) {
    try {
      const match = resposta.match(/\[[\s\S]*\]/)
      const arr = JSON.parse(match ? match[0] : resposta)
      if (Array.isArray(arr) && arr.length === faltantes.length && arr.every(s => typeof s === 'string')) traducoes = arr
    } catch { /* mantém fallback abaixo */ }
  }

  faltantes.forEach((it, i) => {
    const nomePt = traducoes?.[i]?.trim() || it.nome
    cacheNome.set(it.id, nomePt)
    resultado.set(it.id, nomePt)
  })
  return resultado
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.trim().length < 2) return NextResponse.json([])

  try {
    const termoBusca = await traduzirTermoParaIngles(q.trim())
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(termoBusca)}&api_key=${USDA_KEY}&dataType=Foundation,SR%20Legacy&pageSize=8`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    const brutos = (data.foods ?? []).slice(0, 8) as UsdaFood[]

    const nomesPt = await traduzirNomesParaPortugues(brutos.map(f => ({ id: f.fdcId, nome: f.description })))

    const foods = brutos.map((f) => ({
      id: f.fdcId,
      nome: nomesPt.get(f.fdcId) ?? f.description,
      categoria: f.foodCategory ?? 'Outros',
      energia_kcal: getNutrient(f.foodNutrients, 1008),
      proteina_g: getNutrient(f.foodNutrients, 1003),
      carbo_g: getNutrient(f.foodNutrients, 1005),
      gordura_g: getNutrient(f.foodNutrients, 1004),
      fibra_g: getNutrient(f.foodNutrients, 1079),
    }))
    return NextResponse.json(foods)
  } catch {
    return NextResponse.json([])
  }
}
