'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Props = { tipo: 'nutricionista' | 'personal' }

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

export default function SidebarProfissional({ tipo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [nome, setNome] = useState<string | null>(null)
  const [initials, setInitials] = useState('?')

  const isNutri = tipo === 'nutricionista'
  const accent = isNutri
    ? { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' }
    : { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400'    }

  const navItems = isNutri
    ? [
        { icon: <IconHome />,     label: 'Início',     href: '/dashboard' },
        { icon: <IconUsers />,    label: 'Pacientes',  href: '/nutricionista/pacientes' },
        { icon: <IconCalendar />, label: 'Agenda',     href: '/agenda' },
        { icon: <IconUser />,     label: 'Perfil',     href: '/perfil' },
      ]
    : [
        { icon: <IconHome />,     label: 'Início',     href: '/dashboard' },
        { icon: <IconUsers />,    label: 'Alunos',     href: '/personal' },
        { icon: <IconCalendar />, label: 'Agenda',     href: '/agenda' },
        { icon: <IconUser />,     label: 'Perfil',     href: '/perfil' },
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
    <aside
      className="hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:h-screen md:sticky md:top-0 border-r"
      style={{ background: 'var(--bg-base)', borderColor: 'rgba(255,255,255,0.10)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${accent.bg} border ${accent.border} flex items-center justify-center shrink-0`}>
            <span className={`${accent.text} font-black text-sm`}>K</span>
          </div>
          <div>
            <p className="text-white font-black text-[15px] tracking-tight leading-none">KORE</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              <p className={`text-[10px] uppercase tracking-[0.12em] font-semibold ${accent.text}`}>
                {isNutri ? 'Nutricionista' : 'Personal Trainer'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all active:scale-[0.97] text-left ${
                active
                  ? `${accent.bg} ${accent.text} font-semibold`
                  : 'text-zinc-400 hover:text-white font-normal'
              }`}
              style={active ? {} : { ':hover': { background: 'rgba(255,255,255,0.05)' } } as React.CSSProperties}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '' }}
            >
              <span className={active ? accent.text : 'text-zinc-500'}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t space-y-0.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => router.push('/perfil')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.97]"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.10] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-tight">{nome ?? 'Usuário'}</p>
            <p className="text-zinc-600 text-[11px] leading-tight mt-0.5">Configurações</p>
          </div>
        </button>
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all text-sm active:scale-[0.97]"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <IconLogout />
          Sair
        </button>
      </div>
    </aside>
  )
}
