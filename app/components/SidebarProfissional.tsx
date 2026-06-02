'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Home, Users, Calendar, User, LogOut } from 'lucide-react'

type Props = { tipo: 'nutricionista' | 'personal' }

const IconHome = () => <Home size={16} />
const IconUsers = () => <Users size={16} />
const IconCalendar = () => <Calendar size={16} />
const IconUser = () => <User size={16} />
const IconLogout = () => <LogOut size={15} />

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
              <p className={`text-[12px] font-medium ${accent.text}`}>
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
