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

function getScoreLabel(score: number) {
  if (score >= 85) return 'Dia ideal para treino intenso'
  if (score >= 70) return 'Boa recuperação. Pode treinar forte'
  if (score >= 55) return 'Recuperação moderada. Treino leve'
  if (score >= 40) return 'Recuperação baixa. Considere descanso'
  return 'Recuperação crítica. Descanse hoje'
}

function getScoreCores(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-400', glow: 'shadow-emerald-400/20', border: 'border-emerald-400/20' }
  if (score >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-400', glow: 'shadow-yellow-400/20', border: 'border-yellow-400/20' }
  if (score >= 40) return { text: 'text-orange-400', bg: 'bg-orange-400', glow: 'shadow-orange-400/20', border: 'border-orange-400/20' }
  return { text: 'text-red-400', bg: 'bg-red-400', glow: 'shadow-red-400/20', border: 'border-red-400/20' }
}

function getInitials(nome: string | null, email: string) {
  if (nome) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
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
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-600 text-xs tracking-[0.2em] uppercase">Carregando</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
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

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'rgba(8,8,8,0.92)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {getNavItems(perfil?.tipo).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'perfil') router.push('/perfil')
                else setActiveTab(item.id)
              }}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90"
            >
              <span className={`text-lg transition-all duration-150 ${activeTab === item.id ? 'opacity-100' : 'opacity-25'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-medium transition-all ${activeTab === item.id ? 'text-white' : 'text-zinc-700'}`}>
                {item.label}
              </span>
              {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}

function getNavItems(tipo?: string) {
  if (tipo === 'personal') return [
    { id: 'home', icon: '⬜', label: 'Início' },
    { id: 'agenda', icon: '◫', label: 'Agenda' },
    { id: 'alunos', icon: '◈', label: 'Alunos' },
    { id: 'perfil', icon: '◉', label: 'Perfil' },
  ]
  if (tipo === 'nutricionista') return [
    { id: 'home', icon: '⬜', label: 'Início' },
    { id: 'agenda', icon: '◫', label: 'Agenda' },
    { id: 'pacientes', icon: '◈', label: 'Pacientes' },
    { id: 'perfil', icon: '◉', label: 'Perfil' },
  ]
  return [
    { id: 'home', icon: '⬜', label: 'Início' },
    { id: 'treino', icon: '◈', label: 'Treino' },
    { id: 'nutri', icon: '◇', label: 'Nutrição' },
    { id: 'evolucao', icon: '△', label: 'Evolução' },
    { id: 'perfil', icon: '◉', label: 'Perfil' },
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
  const initials = getInitials(perfil.nome, perfil.email)
  const media = getMediaBemEstar(bemEstar)
  const cores = scoreRecuperacao ? getScoreCores(scoreRecuperacao) : null

  return (
    <div
      className="max-w-md mx-auto px-4"
      style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
    >

      {/* Header fixo no topo */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-xs tracking-[0.15em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.75rem] font-black tracking-tight leading-none text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1.5 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center text-sm active:scale-90 transition-all">
            🔔
          </button>
          <button
            onClick={() => router.push('/perfil')}
            className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center active:scale-90 transition-all"
          >
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      {/* HERO — Score de Recuperação */}
      {scoreRecuperacao ? (
        <button
          onClick={() => router.push('/sono')}
          className={`w-full text-left rounded-3xl p-6 mb-3 border ${cores?.border} relative overflow-hidden active:scale-[0.98] transition-all duration-200`}
          style={{ background: 'linear-gradient(135deg, #111 0%, #0a0a0a 100%)' }}
        >
          {/* Glow de fundo */}
          <div
            className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 ${cores?.bg}`}
          />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-1">Recuperação hoje</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-7xl font-black leading-none ${cores?.text}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {scoreRecuperacao}
                  </span>
                  <span className="text-zinc-600 text-lg font-light">/100</span>
                </div>
              </div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Ver análise →</span>
            </div>

            <p className={`text-sm font-semibold mb-4 ${cores?.text}`}>
              {getScoreLabel(scoreRecuperacao)}
            </p>

            {/* Barra de progresso */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cores?.bg} transition-all duration-700`}
                style={{ width: `${scoreRecuperacao}%` }}
              />
            </div>

            {/* Mini métricas */}
            <div className="flex gap-4 mt-4">
              {bemEstar && (
                <>
                  <div>
                    <p className="text-zinc-600 text-[9px] uppercase tracking-widest">Energia</p>
                    <p className="text-white text-sm font-bold">{bemEstar.energia}/5</p>
                  </div>
                  <div className="w-px bg-white/8" />
                  <div>
                    <p className="text-zinc-600 text-[9px] uppercase tracking-widest">Humor</p>
                    <p className="text-white text-sm font-bold">{bemEstar.humor}/5</p>
                  </div>
                  <div className="w-px bg-white/8" />
                  <div>
                    <p className="text-zinc-600 text-[9px] uppercase tracking-widest">Dor musc.</p>
                    <p className="text-white text-sm font-bold">{6 - bemEstar.dor_muscular}/5</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </button>
      ) : (
        /* Estado vazio — convite para registrar */
        <button
          onClick={() => router.push('/sono')}
          className="w-full text-left rounded-3xl p-6 mb-3 border border-white/6 relative overflow-hidden active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #111 0%, #0a0a0a 100%)' }}
        >
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-5 bg-white" />
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-3">Recuperação hoje</p>
          <p className="text-white text-2xl font-black mb-1">Registrar sono</p>
          <p className="text-zinc-600 text-xs">Saiba como seu corpo está respondendo →</p>
        </button>
      )}

      {/* Card bem-estar */}
      <button
        onClick={() => router.push('/bem-estar')}
        className="w-full text-left rounded-2xl p-5 mb-3 border border-white/6 active:scale-[0.98] transition-all"
        style={{ background: '#0f0f0f' }}
      >
        {media ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Como estou hoje</p>
              <p className={`text-xl font-black ${getCorMedia(media)}`}>{getLabelMedia(media)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Atualizar →</span>
              <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${media <= 2 ? 'bg-red-400' : media === 3 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                  style={{ width: `${(media / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Como estou hoje</p>
              <p className="text-white font-bold">Registrar bem-estar</p>
              <p className="text-zinc-600 text-xs mt-0.5">30 segundos →</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">😐</div>
          </div>
        )}
      </button>

      {/* Streak */}
      <div className="rounded-2xl p-5 mb-3 border border-white/6" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Streak de consistência</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">0</span>
              <span className="text-zinc-600 text-sm">dias seguidos</span>
            </div>
            <p className="text-zinc-600 text-xs mt-1">Faça seu primeiro treino hoje</p>
          </div>
          <div className="text-4xl opacity-40">🔥</div>
        </div>
      </div>

      {/* Treino de hoje */}
      <div className="rounded-2xl p-5 mb-3 border border-white/6" style={{ background: '#0f0f0f' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Treino de hoje</p>
            <p className="text-white font-bold text-base">Nenhum treino montado</p>
            <p className="text-zinc-600 text-xs mt-1">Aguardando seu personal trainer</p>
          </div>
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/20">TR</div>
        </div>

        {/* Sugestão inteligente */}
        <div className="bg-white/4 rounded-xl p-3 mb-3 border border-white/6">
          <p className="text-zinc-400 text-xs leading-relaxed">
            {scoreRecuperacao && scoreRecuperacao >= 70
              ? '✦ Sua recuperação está ótima. Considere um treino de força hoje.'
              : scoreRecuperacao && scoreRecuperacao < 50
              ? '✦ Recuperação baixa. Um treino leve ou mobilidade é o ideal hoje.'
              : '✦ Registre seu sono para receber sugestões personalizadas da IA.'}
          </p>
        </div>

        <button
          onClick={() => router.push('/treino')}
          className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-wide"
        >
          Iniciar treino livre
        </button>
      </div>

      {/* Plano alimentar */}
      <div className="rounded-2xl p-5 mb-3 border border-white/6" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Plano alimentar</p>
            <p className="text-white font-bold">Nenhum plano ativo</p>
            <p className="text-zinc-600 text-xs mt-0.5">Aguardando sua nutricionista</p>
          </div>
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 bg-green-500/20 text-green-400 border-green-500/20">PA</div>
        </div>
      </div>

      {/* Meu time — com avatares de iniciais */}
      <div className="rounded-2xl p-5 mb-3 border border-white/6" style={{ background: '#0f0f0f' }}>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Meu time</p>
        <div className="space-y-3">
          {[
            { sigla: 'PT', label: 'Personal Trainer', cor: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
            { sigla: 'NU', label: 'Nutricionista', cor: 'bg-green-500/20 text-green-400 border-green-500/20' },
          ].map((p, i) => (
            <div key={p.label}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${p.cor}`}>
                  {p.sigla}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">{p.label}</p>
                  <p className="text-zinc-600 text-xs">Não conectado</p>
                </div>
                <button className="text-[10px] text-zinc-500 border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0">
                  + Conectar
                </button>
              </div>
              {i === 0 && <div className="h-px bg-white/5 mt-3" />}
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
  const initials = getInitials(perfil.nome, perfil.email)

  return (
    <div className="max-w-md mx-auto px-4" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-xs tracking-[0.15em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.75rem] font-black tracking-tight text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center text-sm active:scale-90 transition-all">🔔</button>
          <button onClick={onLogout} className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center active:scale-90 transition-all">
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/8">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Personal Trainer</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: '0', label: 'Alunos', sub: 'ativos' },
          { valor: '0', label: 'Treinaram', sub: 'hoje' },
          { valor: '0', label: 'Alertas', sub: 'pendentes' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border border-white/6 text-center" style={{ background: '#0f0f0f' }}>
            <p className="text-white text-2xl font-black">{m.valor}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 leading-tight">{m.label}</p>
            <p className="text-zinc-700 text-[9px]">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 border border-white/6 mb-3" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em]">Agenda de hoje</p>
          <span className="text-zinc-700 text-[10px] uppercase tracking-widest">{getTodayString().split(',')[0]}</span>
        </div>
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-2xl opacity-40">📅</div>
          <p className="text-zinc-600 text-sm">Nenhum aluno agendado</p>
          <button className="text-[11px] border border-white/10 rounded-xl px-4 py-2 text-zinc-400 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
            + Agendar sessão
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 border border-white/6 mb-4" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em]">Alertas</p>
        </div>
        <p className="text-zinc-600 text-sm">Nenhum alerta no momento.</p>
      </div>

      <button className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase">
        + Convidar aluno
      </button>
    </div>
  )
}

// ─── DASHBOARD NUTRICIONISTA ──────────────────────────────────────────────────

function DashboardNutricionista({ perfil, onLogout }: { perfil: Perfil; activeTab: string; onLogout: () => void }) {
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials = getInitials(perfil.nome, perfil.email)

  return (
    <div className="max-w-md mx-auto px-4" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-xs tracking-[0.15em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.75rem] font-black tracking-tight text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center text-sm active:scale-90 transition-all">🔔</button>
          <button onClick={onLogout} className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/8 flex items-center justify-center active:scale-90 transition-all">
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/8">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Nutricionista</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: '0', label: 'Pacientes', sub: 'ativos' },
          { valor: '0', label: 'Consultas', sub: 'hoje' },
          { valor: '0', label: 'Alertas', sub: 'pendentes' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border border-white/6 text-center" style={{ background: '#0f0f0f' }}>
            <p className="text-white text-2xl font-black">{m.valor}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 leading-tight">{m.label}</p>
            <p className="text-zinc-700 text-[9px]">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 border border-white/6 mb-3" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em]">Agenda de hoje</p>
        </div>
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-2xl opacity-40">📋</div>
          <p className="text-zinc-600 text-sm">Nenhum paciente agendado</p>
          <button className="text-[11px] border border-white/10 rounded-xl px-4 py-2 text-zinc-400 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
            + Agendar consulta
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 border border-white/6 mb-4" style={{ background: '#0f0f0f' }}>
        <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em] mb-3">Alertas</p>
        <p className="text-zinc-600 text-sm">Nenhum alerta no momento.</p>
      </div>

      <button className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase mb-3">
        + Convidar paciente
      </button>
    </div>
  )
}