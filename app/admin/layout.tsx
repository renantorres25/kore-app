'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
  sidebar: '#0C0E14',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"

type Estado = 'carregando' | 'ok' | 'negado'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [papel, setPapel] = useState('')

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { router.replace('/login'); return }
      const { data } = await supabase
        .from('admin_users')
        .select('papel')
        .eq('user_id', sess.session.user.id)
        .eq('ativo', true)
        .maybeSingle()
      if (!ativo) return
      if (!data) { setEstado('negado'); return }
      setPapel(data.papel)
      setEstado('ok')
    })()
    return () => { ativo = false }
  }, [router])

  if (estado === 'carregando') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 30, height: 30, border: `2px solid ${C.energy}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (estado === 'negado') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: C.t1, fontFamily: JAKARTA, textAlign: 'center', padding: 24 }}>
        <p style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800 }}>Acesso restrito</p>
        <p style={{ color: C.t2, maxWidth: 360 }}>Esta área é exclusiva da administração do KORE.</p>
        <button onClick={() => router.replace('/dashboard')}
          style={{ marginTop: 8, background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', fontWeight: 700, fontFamily: JAKARTA, border: 'none', borderRadius: 12, padding: '10px 20px', cursor: 'pointer' }}>
          Voltar ao app
        </button>
      </div>
    )
  }

  const nav = [
    { label: 'Cockpit', href: '/admin' },
    { label: 'Análise', href: '/admin/analise' },
    { label: 'Usuários', href: '/admin/usuarios' },
    { label: 'Financeiro', href: '/admin/financeiro' },
    { label: 'SAC', href: '/admin/sac' },
    { label: 'Auditoria', href: '/admin/auditoria' },
  ]

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', color: C.t1, fontFamily: JAKARTA }}>
      <aside style={{ width: 220, flexShrink: 0, background: C.sidebar, borderRight: '1px solid rgba(255,255,255,0.07)', padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em', background: `linear-gradient(135deg, #fff, ${C.energy})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', paddingLeft: 8 }}>KORE</span>
        <span style={{ color: C.energy, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, paddingLeft: 8, marginBottom: 18 }}>Admin</span>
        {nav.map((item) => {
          const ativo = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <button key={item.href} onClick={() => router.push(item.href)}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: ativo ? 'rgba(255,90,54,0.12)' : 'transparent',
                color: ativo ? C.energy : C.t2, fontWeight: ativo ? 700 : 500, fontFamily: JAKARTA, fontSize: 14 }}>
              {item.label}
            </button>
          )
        })}
        <div style={{ marginTop: 'auto', paddingLeft: 8 }}>
          <p style={{ color: C.t3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{papel}</p>
          <button onClick={sair} style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', fontFamily: JAKARTA, fontSize: 13, padding: 0 }}>Sair</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>{children}</main>
    </div>
  )
}
