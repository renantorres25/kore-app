import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Cliente com service role: roda SOMENTE no servidor (rotas /api).
// Bypassa a RLS — por isso todo uso precisa passar por requireAdmin().
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type AdminInfo = { userId: string; papel: string }

// Valida o token do chamador e confirma que ele está em admin_users (ativo).
// Retorna os dados do admin, ou null se não for admin / token inválido.
export async function requireAdmin(req: NextRequest): Promise<AdminInfo | null> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) return null

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('papel')
    .eq('user_id', userData.user.id)
    .eq('ativo', true)
    .maybeSingle()

  if (!admin) return null
  return { userId: userData.user.id, papel: admin.papel }
}
