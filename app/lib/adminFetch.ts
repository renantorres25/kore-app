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

// Envia uma ação (POST) para uma rota /api/admin/* com o token da sessão.
export async function adminPost<T = any>(path: string, corpo: any): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(corpo),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.erro || `Erro ${res.status}`)
  }
  return res.json()
}
