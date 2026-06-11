import { supabase } from './supabase'

// Chama uma rota /api/admin/* enviando o token da sessão no header Authorization.
export async function adminFetch<T = any>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.erro || `Erro ${res.status}`)
  }
  return res.json()
}
