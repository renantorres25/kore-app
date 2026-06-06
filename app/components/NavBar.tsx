'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c()
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

/* ── Ícones ────────────────────────────────────────────────── */
function IconHome({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
}
function IconPeople({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 3.5a3.5 3.5 0 010 7" /><path d="M22 20c0-3.5-2.5-5.8-6-6" /></svg>
}
function IconAgenda({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
}
function IconPerfil({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
}
function IconTreino({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h1M16.5 6.5h1M6.5 17.5h1M16.5 17.5h1" /><path d="M7.5 6.5v11M17.5 6.5v11" /><path d="M7.5 12h9" /><path d="M3 10.5v3M21 10.5v3" /></svg>
}
function IconNutricao({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 6.5 7 8 7 13c0 4 2.5 6.5 5 6.5s5-2.5 5-6.5c0-5-3-6.5-5-6.5z" /><path d="M12 6.5V4M12 4c0 0 1.5-1 3-1.5" /></svg>
}
function IconEvolucao({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
}
function IconLogout() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
}

type NavItem = { id: string; label: string; Icon: React.FC<{ active: boolean }>; path: string }

function getItems(tipo: string): NavItem[] {
  if (tipo === 'nutricionista') return [
    { id: 'home',      label: 'Início',    Icon: IconHome,    path: '/dashboard' },
    { id: 'pacientes', label: 'Pacientes', Icon: IconPeople,  path: '/nutricionista/pacientes' },
    { id: 'agenda',    label: 'Agenda',    Icon: IconAgenda,  path: '/agenda' },
    { id: 'perfil',    label: 'Perfil',    Icon: IconPerfil,  path: '/perfil' },
  ]
  if (tipo === 'personal') return [
    { id: 'home',   label: 'Início', Icon: IconHome,    path: '/dashboard' },
    { id: 'alunos', label: 'Alunos', Icon: IconPeople,  path: '/personal' },
    { id: 'agenda', label: 'Agenda', Icon: IconAgenda,  path: '/agenda' },
    { id: 'perfil', label: 'Perfil', Icon: IconPerfil,  path: '/perfil' },
  ]
  return [
    { id: 'home',     label: 'Início',   Icon: IconHome,     path: '/dashboard' },
    { id: 'treino',   label: 'Treino',   Icon: IconTreino,   path: '/treino' },
    { id: 'nutri',    label: 'Nutrição', Icon: IconNutricao, path: '/nutricao' },
    { id: 'evolucao', label: 'Evolução', Icon: IconEvolucao, path: '/evolucao' },
    { id: 'perfil',   label: 'Perfil',   Icon: IconPerfil,   path: '/perfil' },
  ]
}

export default function NavBar({ tipo, ativa }: { tipo: string; ativa: string }) {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const items = getItems(tipo)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  /* ── SIDEBAR DESKTOP — só para clientes; profissionais usam SidebarProfissional ── */
  if (isDesktop && tipo !== 'nutricionista' && tipo !== 'personal') {
    return (
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, zIndex: 50,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: '32px 16px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 40, paddingLeft: 8 }}>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 900,
            letterSpacing: '-0.04em',
            background: `linear-gradient(135deg, #fff 0%, ${C.energy2} 40%, ${C.energy} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>KORE</span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => {
            const active = ativa === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: active ? 'rgba(255,90,54,0.12)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(255,90,54,0.25)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 150ms ease',
                  color: active ? C.energy : C.t2,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  letterSpacing: '0.01em',
                }}>
                <item.Icon active={active} />
                <span>{item.label}</span>
                {active && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: C.energy }} />}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <button onClick={handleLogout}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.t1 }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.t3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12,
            background: 'none', border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', color: C.t3,
            fontSize: 13, fontWeight: 500, transition: 'color 150ms ease',
          }}>
          <IconLogout />
          Sair
        </button>
      </aside>
    )
  }

  /* ── BOTTOM NAV MOBILE ────────────────────────────────────── */
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      borderTop: '1px solid rgba(255,255,255,0.12)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(24px) saturate(130%)',
      WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    }}>
      <div style={{ maxWidth: 448, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {items.map(item => {
          const active = ativa === item.id
          return (
            <button key={item.id} onClick={() => router.push(item.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 12px', borderRadius: 16,
                background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                color: active ? C.energy : C.t3,
              }}>
              <item.Icon active={active} />
              <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                {item.label}
              </span>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.energy }} />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
