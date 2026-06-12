'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { registrarEvento } from '../lib/eventos'

const PUBLIC_ROUTES = ['/', '/login', '/nova-senha']

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        const isPublic = PUBLIC_ROUTES.some(r => pathname === r) || pathname.startsWith('/convite')
        if (!isPublic) router.push('/login')
      } else if (event === 'SIGNED_IN') {
        // Evita ruído: SIGNED_IN dispara a cada renovação de token e em cada aba.
        // Registra apenas uma vez por sessão de navegador.
        try {
          if (typeof window !== 'undefined' && !sessionStorage.getItem('kore_sess_logged')) {
            sessionStorage.setItem('kore_sess_logged', '1')
            registrarEvento('session_started')
          }
        } catch {
          registrarEvento('session_started')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [pathname, router])

  return <>{children}</>
}
