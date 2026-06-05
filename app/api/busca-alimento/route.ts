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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.trim().length < 2) return NextResponse.json([])

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&api_key=${USDA_KEY}&dataType=Foundation,SR%20Legacy&pageSize=8`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    const foods = (data.foods ?? []).slice(0, 8).map((f: UsdaFood) => ({
      id: f.fdcId,
      nome: f.description,
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
