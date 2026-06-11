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
        registrarEvento('session_started')
      }
    })
    return () => subscription.unsubscribe()
  }, [pathname, router])

  return <>{children}</>
}
