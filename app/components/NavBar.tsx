'use client'

import { useRouter } from 'next/navigation'

function IconHome({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
}
function IconPeople({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 3.5a3.5 3.5 0 010 7" /><path d="M22 20c0-3.5-2.5-5.8-6-6" /></svg>
}
function IconAgenda({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
}
function IconPerfil({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
}
function IconTreino({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h1M16.5 6.5h1M6.5 17.5h1M16.5 17.5h1" /><path d="M7.5 6.5v11M17.5 6.5v11" /><path d="M7.5 12h9" /><path d="M3 10.5v3M21 10.5v3" /></svg>
}
function IconNutricao({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 6.5 7 8 7 13c0 4 2.5 6.5 5 6.5s5-2.5 5-6.5c0-5-3-6.5-5-6.5z" /><path d="M12 6.5V4M12 4c0 0 1.5-1 3-1.5" /></svg>
}
function IconEvolucao({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
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
  const items = getItems(tipo)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-2">
        {items.map(item => {
          const active = ativa === item.id
          return (
            <button key={item.id} onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-150 active:scale-90">
              <span className={`transition-all duration-200 ${active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                <item.Icon active={active} />
              </span>
              <span className={`text-[9px] tracking-[0.1em] uppercase font-semibold transition-all ${active ? 'text-emerald-400' : 'text-zinc-700'}`}>
                {item.label}
              </span>
              {active && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
