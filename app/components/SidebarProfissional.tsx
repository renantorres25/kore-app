'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Home, Users, Calendar, User, LogOut } from 'lucide-react'

type Props = { tipo: 'nutricionista' | 'personal' }

const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good:   '#2DD4A7', sleep:   '#60A5FA',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY    = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function SidebarProfissional({ tipo }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [nome, setNome]       = useState<string | null>(null)
  const [initials, setInitials] = useState('?')

  const isNutri  = tipo === 'nutricionista'
  const accent   = isNutri ? C.good : C.sleep

  const navItems = isNutri
    ? [
        { icon: <Home size={16} />,     label: 'Início',     href: '/dashboard' },
        { icon: <Users size={16} />,    label: 'Pacientes',  href: '/nutricionista/pacientes' },
        { icon: <Calendar size={16} />, label: 'Agenda',     href: '/agenda' },
        { icon: <User size={16} />,     label: 'Perfil',     href: '/perfil' },
      ]
    : [
        { icon: <Home size={16} />,     label: 'Início',     href: '/dashboard' },
        { icon: <Users size={16} />,    label: 'Alunos',     href: '/personal' },
        { icon: <Calendar size={16} />, label: 'Agenda',     href: '/agenda' },
        { icon: <User size={16} />,     label: 'Perfil',     href: '/perfil' },
      ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('perfis').select('nome, email').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (!data) return
          setNome(data.nome)
          const words = (data.nome ?? data.email ?? '').trim().split(' ').filter(Boolean)
          setInitials(words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : (words[0]?.[0] ?? '?').toUpperCase()
          )
        })
    })
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: 220, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      padding: '28px 14px 20px',
    }}>
      {/* Logo */}
      <div style={{ paddingLeft: 10, marginBottom: 36 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 900,
          letterSpacing: '-0.04em',
          background: `linear-gradient(135deg, #fff 0%, ${C.energy2} 40%, ${C.energy} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>KORE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, color: accent, letterSpacing: '0.05em' }}>
            {isNutri ? 'Nutricionista' : 'Personal Trainer'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                background: active ? `${accent}18` : 'transparent',
                border: `1px solid ${active ? `${accent}30` : 'transparent'}`,
                cursor: 'pointer', transition: 'all 150ms ease',
                color: active ? accent : C.t2,
                fontFamily: FONT_BODY, fontSize: 13,
                fontWeight: active ? 600 : 400,
                width: '100%', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ color: active ? accent : C.t3, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={() => router.push('/perfil')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `${accent}20`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: accent, fontSize: 11, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: C.t1, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome ?? 'Usuário'}</p>
            <p style={{ color: C.t3, fontSize: 10, fontFamily: FONT_BODY, margin: 0, marginTop: 1 }}>Configurações</p>
          </div>
        </button>
        <button
          onClick={sair}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', color: C.t3, fontFamily: FONT_BODY, fontSize: 12, width: '100%', textAlign: 'left', transition: 'all 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = C.t2 }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.t3 }}
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  )
}
