import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'

// Lista enxuta dos usuários do Auth, com cache curto em memória (por instância).
// Evita que kpis, alertas e digest varram TODO o auth.users repetidamente.
export type AuthUserLite = { id: string; created_at: string | null; last_sign_in_at: string | null }

let cache: { ts: number; users: AuthUserLite[] } | null = null
const TTL_MS = 60_000

export async function listarAuthUsers(): Promise<AuthUserLite[]> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.users

  const users: AuthUserLite[] = []
  for (let pg = 1; pg <= 50; pg++) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: pg, perPage: 1000 })
    const us = (data?.users || []) as any[]
    for (const u of us) {
      users.push({
        id: u.id,
        created_at: u.created_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
      })
    }
    if (us.length < 1000) break
  }

  cache = { ts: Date.now(), users }
  return users
}
