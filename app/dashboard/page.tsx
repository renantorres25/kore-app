'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Perfil = {
  tipo: 'cliente' | 'personal' | 'nutricionista'
  nome: string | null
  email: string
}

type BemEstar = {
  energia: number
  humor: number
  dor_muscular: number
  qualidade_sono: number
} | null

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(nome: string | null, email: string) {
  if (nome) return nome.split(' ')[0]
  return email.split('@')[0]
}

function getTodayString() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getMediaBemEstar(be: BemEstar) {
  if (!be) return null
  const vals = [be.energia, be.humor, be.dor_muscular, be.qualidade_sono]
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function getCorMedia(media: number) {
  if (media <= 2) return 'text-red-400'
  if (media === 3) return 'text-yellow-400'
  return 'text-emerald-400'
}

function getLabelMedia(media: number) {
  if (media <= 1) return 'Dia difícil'
  if (media === 2) return 'Abaixo do normal'
  if (media === 3) return 'Normal'
  if (media === 4) return 'Bem disposto'
  return 'No seu melhor!'
}

export default function Dashboard() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar>(null)
  const [scoreRecuperacao, setScoreRecuperacao] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    async function carregarPerfil() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const { data } = await supabase
        .from('perfis')
        .select('tipo, nome, email')
        .eq('id', session.user.id)
        .single()

      if (!data) { router.push('/onboarding'); return }

      setPerfil(data)

      if (data.tipo === 'cliente') {
        const hoje = new Date().toISOString().split('T')[0]

        const { data: be } = await supabase
          .from('bem_estar')
          .select('energia, humor, dor_muscular, qualidade_sono')
          .eq('usuario_id', session.user.id)
          .eq('data', hoje)
          .single()
        if (be) setBemEstar(be)

        const { data: sonoHoje } = await supabase
          .from('sono')
          .select('score_recuperacao')
          .eq('usuario_id', session.user.id)
          .eq('data', hoje)
          .single()
        if (sonoHoje?.score_recuperacao) setScoreRecuperacao(sonoHoje.score_recuperacao)
      }

      setCarregando(false)
    }
    carregarPerfil()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Carregando</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28">
        {perfil?.tipo === 'cliente' && (
          <DashboardCliente perfil={perfil} bemEstar={bemEstar} scoreRecuperacao={scoreRecuperacao} activeTab={activeTab} onLogout={handleLogout} />
        )}
        {perfil?.tipo === 'personal' && (
          <DashboardPersonal perfil={perfil} activeTab={activeTab} onLogout={handleLogout} />
        )}
        {perfil?.tipo === 'nutricionista' && (
          <DashboardNutricionista perfil={perfil} activeTab={activeTab} onLogout={handleLogout} />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-zinc-800/60 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-2">
          {getNavItems(perfil?.tipo).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'perfil') router.push('/perfil')
                else setActiveTab(item.id)
              }}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
            >
              <span className={`text-xl transition-all duration-200 ${activeTab === item.id ? 'scale-110' : 'opacity-35'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] tracking-widest uppercase font-semibold transition-all ${
                activeTab === item.id ? 'text-white' : 'text-zinc-600'
              }`}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}

function getNavItems(tipo?: string) {
  if (tipo === 'personal') {
    return [
      { id: 'home', icon: '🏠', label: 'Início' },
      { id: 'agenda', icon: '📅', label: 'Agenda' },
      { id: 'alunos', icon: '👥', label: 'Alunos' },
      { id: 'perfil', icon: '👤', label: 'Perfil' },
    ]
  }
  if (tipo === 'nutricionista') {
    return [
      { id: 'home', icon: '🏠', label: 'Início' },
      { id: 'agenda', icon: '📅', label: 'Agenda' },
      { id: 'pacientes', icon: '👥', label: 'Pacientes' },
      { id: 'perfil', icon: '👤', label: 'Perfil' },
    ]
  }
  return [
    { id: 'home', icon: '🏠', label: 'Início' },
    { id: 'treino', icon: '⚡', label: 'Treino' },
    { id: 'nutri', icon: '🥗', label: 'Nutrição' },
    { id: 'evolucao', icon: '📈', label: 'Evolução' },
    { id: 'perfil', icon: '👤', label: 'Perfil' },
  ]
}

// ─── DASHBOARD CLIENTE ────────────────────────────────────────────────────────

function DashboardCliente({ perfil, bemEstar, scoreRecuperacao, onLogout }: {
  perfil: Perfil
  bemEstar: BemEstar
  scoreRecuperacao: number | null
  activeTab: string
  onLogout: () => void
}) {
  const router = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const media = getMediaBemEstar(bemEstar)

  return (
    <div className="max-w-md mx-auto px-4 pt-8" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-sm mb-0.5">{getGreeting()},</p>
          <h1 className="text-2xl font-black tracking-tight leading-tight">{firstName} 👋</h1>
          <p className="text-zinc-600 text-xs mt-1 capitalize">{getTodayString()}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <button className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base active:scale-95 transition-all">🔔</button>
          <button onClick={onLogout} className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white active:scale-95 transition-all text-sm font-bold">↪</button>
        </div>
      </div>

      {/* Card bem-estar */}
      <button
        onClick={() => router.push('/bem-estar')}
        className="w-full text-left relative rounded-2xl p-5 mb-3 overflow-hidden border transition-all active:scale-95 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border-zinc-700/40"
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        {media ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Como estou hoje</p>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Atualizar →</span>
            </div>
            <p className={`text-3xl font-black mb-1 ${getCorMedia(media)}`}>{getLabelMedia(media)}</p>
            <div className="h-1 bg-zinc-800 rounded-full mt-3">
              <div
                className={`h-1 rounded-full transition-all ${media <= 2 ? 'bg-red-400' : media === 3 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                style={{ width: `${(media / 5) * 100}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2">Como estou hoje</p>
            <p className="text-white font-bold text-base mb-1">Registrar bem-estar</p>
            <p className="text-zinc-600 text-xs">Leva menos de 30 segundos →</p>
          </>
        )}
      </button>

      {/* Grid recuperação + streak */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => router.push('/sono')}
          className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-left active:scale-95 transition-all hover:border-zinc-600"
        >
          <div className="text-xl mb-2">🌙</div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Recuperação</p>
          {scoreRecuperacao ? (
            <>
              <p className={`text-2xl font-black ${scoreRecuperacao >= 80 ? 'text-emerald-400' : scoreRecuperacao >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {scoreRecuperacao}
              </p>
              <p className="text-zinc-600 text-[10px] mt-1">de 100 →</p>
            </>
          ) : (
            <>
              <p className="text-white text-2xl font-black">—</p>
              <p className="text-zinc-600 text-[10px] mt-1">Registrar →</p>
            </>
          )}
        </button>
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="text-xl mb-2">🔥</div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Streak</p>
          <p className="text-white text-2xl font-black">0</p>
          <p className="text-zinc-600 text-[10px] mt-1">dias seguidos</p>
        </div>
      </div>

      {/* Treino de hoje */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Treino de hoje</p>
            <p className="text-white font-bold text-base leading-snug">Nenhum treino montado</p>
          </div>
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-zinc-600 text-xs mb-4">Aguardando seu personal trainer</p>
        <button className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-zinc-100 transition-all">
          Treino livre
        </button>
      </div>

      {/* Plano alimentar */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Plano alimentar</p>
            <p className="text-white font-bold text-base">Nenhum plano ativo</p>
            <p className="text-zinc-600 text-xs mt-1">Aguardando sua nutricionista</p>
          </div>
          <span className="text-2xl">🥗</span>
        </div>
      </div>

      {/* Meu time */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-4">Meu time</p>
        <div className="space-y-3">
          {[
            { icon: '🏋️', label: 'Personal Trainer' },
            { icon: '🥗', label: 'Nutricionista' },
          ].map((p, i) => (
            <div key={p.label}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg shrink-0">{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">{p.label}</p>
                  <p className="text-zinc-600 text-xs">Não conectado</p>
                </div>
                <button className="text-[10px] text-zinc-400 border border-zinc-700 rounded-lg px-2.5 py-1.5 hover:border-zinc-400 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0">
                  + Adicionar
                </button>
              </div>
              {i === 0 && <div className="h-px bg-zinc-800 mt-3" />}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── DASHBOARD PERSONAL ───────────────────────────────────────────────────────

function DashboardPersonal({ perfil, onLogout }: { perfil: Perfil; activeTab: string; onLogout: () => void }) {
  const firstName = getFirstName(perfil.nome, perfil.email)
  return (
    <div className="max-w-md mx-auto px-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-zinc-500 text-sm mb-0.5">{getGreeting()},</p>
          <h1 className="text-2xl font-black tracking-tight">{firstName}</h1>
          <p className="text-zinc-600 text-xs mt-1 capitalize">{getTodayString()}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <button className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base active:scale-95 transition-all">🔔</button>
          <button onClick={onLogout} className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white active:scale-95 transition-all text-sm font-bold">↪</button>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-zinc-300 text-[10px] uppercase tracking-widest font-semibold">Personal Trainer</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: '0', label: 'Alunos', icon: '👥' },
          { valor: '0', label: 'Treinaram', icon: '✅' },
          { valor: '0', label: 'Alertas', icon: '🚨' },
        ].map((m) => (
          <div key={m.label} className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 text-center">
            <p className="text-base mb-1">{m.icon}</p>
            <p className="text-white text-xl font-black">{m.valor}</p>
            <p className="text-zinc-600 text-[10px] mt-0.5 leading-tight">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Agenda de hoje</p>
          <span className="text-lg">📅</span>
        </div>
        <div className="flex flex-col items-center py-5 gap-3">
          <p className="text-zinc-600 text-sm">Nenhum aluno agendado</p>
          <button className="text-xs border border-zinc-700 rounded-xl px-4 py-2 text-zinc-400 hover:border-white hover:text-white active:scale-95 transition-all uppercase tracking-wider">+ Agendar sessão</button>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Alertas</p>
          <span className="text-lg">🚨</span>
        </div>
        <p className="text-zinc-600 text-sm">Nenhum alerta no momento.</p>
      </div>
      <button className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-widest uppercase">+ Convidar aluno</button>
    </div>
  )
}

// ─── DASHBOARD NUTRICIONISTA ──────────────────────────────────────────────────

function DashboardNutricionista({ perfil, onLogout }: { perfil: Perfil; activeTab: string; onLogout: () => void }) {
  const firstName = getFirstName(perfil.nome, perfil.email)
  return (
    <div className="max-w-md mx-auto px-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-zinc-500 text-sm mb-0.5">{getGreeting()},</p>
          <h1 className="text-2xl font-black tracking-tight">{firstName}</h1>
          <p className="text-zinc-600 text-xs mt-1 capitalize">{getTodayString()}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <button className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base active:scale-95 transition-all">🔔</button>
          <button onClick={onLogout} className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white active:scale-95 transition-all text-sm font-bold">↪</button>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-zinc-300 text-[10px] uppercase tracking-widest font-semibold">Nutricionista</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: '0', label: 'Pacientes', icon: '👥' },
          { valor: '0', label: 'Consultas hoje', icon: '📋' },
          { valor: '0', label: 'Alertas', icon: '🚨' },
        ].map((m) => (
          <div key={m.label} className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 text-center">
            <p className="text-base mb-1">{m.icon}</p>
            <p className="text-white text-xl font-black">{m.valor}</p>
            <p className="text-zinc-600 text-[10px] mt-0.5 leading-tight">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Agenda de hoje</p>
          <span className="text-lg">📅</span>
        </div>
        <div className="flex flex-col items-center py-5 gap-3">
          <p className="text-zinc-600 text-sm">Nenhum paciente agendado</p>
          <button className="text-xs border border-zinc-700 rounded-xl px-4 py-2 text-zinc-400 hover:border-white hover:text-white active:scale-95 transition-all uppercase tracking-wider">+ Agendar consulta</button>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Alertas</p>
          <span className="text-lg">🚨</span>
        </div>
        <p className="text-zinc-600 text-sm">Nenhum alerta no momento.</p>
      </div>
      <button className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-widest uppercase mb-3">+ Convidar paciente</button>
    </div>
  )
}