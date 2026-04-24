'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getNavItems } from '../../utils/navigation'

type Perfil = {
  tipo: 'cliente' | 'personal' | 'nutricionista'
  nome: string | null
  email: string
}

export default function Dashboard() {
  const router = useRouter()

  // MOCK TEMPORÁRIO (depois você conecta com Supabase)
  const [perfil] = useState<Perfil>({
    tipo: 'cliente', // muda pra testar: 'personal' | 'nutricionista'
    nome: 'Renan',
    email: 'renan@email.com',
  })

  const [activeTab, setActiveTab] = useState('home')

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col">
      
      {/* CONTEÚDO MOCK */}
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-xl font-bold">Dashboard</h1>
      </div>

      {/* NAVBAR */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'rgba(8,8,8,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {getNavItems(perfil?.tipo).map((item) => {
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  switch (item.id) {
                    case 'perfil':
                      router.push('/perfil')
                      break
                    case 'alunos':
                      router.push('/personal/alunos')
                      break
                    case 'pacientes':
                      router.push('/nutri/pacientes')
                      break
                    case 'agenda':
                      router.push('/agenda')
                      break
                    default:
                      setActiveTab(item.id)
                  }
                }}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90"
              >
                <span
                  className={`text-lg transition-all duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-20'
                  }`}
                >
                  {item.icon}
                </span>

                <span
                  className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-zinc-700'
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}// force deploy