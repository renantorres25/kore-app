import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin', 'sac'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const tipo = searchParams.get('tipo') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    // Seleciona apenas colunas confirmadas (sem dados sensíveis de saúde aqui).
    let query = supabaseAdmin
      .from('perfis')
      .select('id, nome, email, tipo', { count: 'exact' })

    if (tipo) query = query.eq('tipo', tipo)
    if (q) {
      const qSafe = q.replace(/[,()%*\\]/g, ' ').trim()
      if (qSafe) query = query.or(`nome.ilike.%${qSafe}%,email.ilike.%${qSafe}%`)
    }

    query = query.order('nome', { ascending: true }).range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ erro: 'Erro ao buscar usuários' }, { status: 500 })

    return NextResponse.json({ usuarios: data || [], total: count || 0, limit, offset })
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar usuários' }, { status: 500 })
  }
}
