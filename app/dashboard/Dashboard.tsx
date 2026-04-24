'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ─── TYPES ────────────────────────────────────────────────────────────────────

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

// ─── UTILITÁRIOS DE DATA (FUSO BRASIL) ───────────────────────────────────────

/**
 * Retorna a data de hoje no fuso de São Paulo, formato YYYY-MM-DD.
 * Usado em TODAS as queries ao Supabase — nunca usar toISOString() para datas.
 */
function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Hora atual no fuso de São Paulo.
 */
function getHourBR(): number {
  return parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
    }),
    10
  )
}

function getGreeting(): string {
  const h = getHourBR()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getTodayString(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ─── UTILITÁRIOS GERAIS ───────────────────────────────────────────────────────

function getFirstName(nome: string | null, email: string): string {
  if (nome) return nome.split(' ')[0]
  return email.split('@')[0]
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

// ─── BEM-ESTAR ────────────────────────────────────────────────────────────────

function getMediaBemEstar(be: BemEstar): number | null {
  if (!be) return null
  const vals = [be.energia, be.humor, be.dor_muscular, be.qualidade_sono]
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function getCorMedia(media: number): string {
  if (media <= 2) return 'text-red-400'
  if (media === 3) return 'text-yellow-400'
  return 'text-emerald-400'
}

function getLabelMedia(media: number): string {
  if (media <= 1) return 'Dia difícil'
  if (media === 2) return 'Abaixo do normal'
  if (media === 3) return 'Normal'
  if (media === 4) return 'Bem disposto'
  return 'No seu melhor!'
}

// ─── SCORE DE RECUPERAÇÃO ─────────────────────────────────────────────────────

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Dia ideal para treino intenso'
  if (score >= 70) return 'Boa recuperação. Pode treinar forte'
  if (score >= 55) return 'Recuperação moderada. Treino leve'
  if (score >= 40) return 'Recuperação baixa. Considere descanso'
  return 'Recuperação crítica. Descanse hoje'
}

function getScoreCores(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400/20' }
  if (score >= 60) return { text: 'text-yellow-400',  bg: 'bg-yellow-400',  border: 'border-yellow-400/20'  }
  if (score >= 40) return { text: 'text-orange-400',  bg: 'bg-orange-400',  border: 'border-orange-400/20'  }
  return            { text: 'text-red-400',     bg: 'bg-red-400',     border: 'border-red-400/20'     }
}

// ─── STREAK ───────────────────────────────────────────────────────────────────

/**
 * Calcula streak de dias consecutivos de treino.
 * Recebe array de datas YYYY-MM-DD já ordenadas desc.
 */
function calcularStreak(datas: string[]): number {
  if (!datas.length) return 0
  const hoje = getTodayBR()
  let streak = 0
  const cursor = new Date(hoje + 'T12:00:00-03:00') // meio-dia BRT evita drift de fuso

  for (const d of datas) {
    const cursorStr = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    if (d === cursorStr) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function getNavItems(tipo?: string) {
  if (tipo === 'personal') return [
    { id: 'home',    icon: '⬜', label: 'Início'  },
    { id: 'agenda',  icon: '◫',  label: 'Agenda'  },
    { id: 'alunos',  icon: '◈',  label: 'Alunos'  },
    { id: 'perfil',  icon: '◉',  label: 'Perfil'  },
  ]
  if (tipo === 'nutricionista') return [
    { id: 'home',      icon: '⬜', label: 'Início'    },
    { id: 'agenda',    icon: '◫',  label: 'Agenda'    },
    { id: 'pacientes', icon: '◈',  label: 'Pacientes' },
    { id: 'perfil',    icon: '◉',  label: 'Perfil'    },
  ]
  return [
    { id: 'home',     icon: '⬜', label: 'Início'   },
    { id: 'treino',   icon: '◈',  label: 'Treino'   },
    { id: 'nutri',    icon: '◇',  label: 'Nutrição' },
    { id: 'evolucao', icon: '△',  label: 'Evolução' },
    { id: 'perfil',   icon: '◉',  label: 'Perfil'   },
  ]
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar>(null)
  const [scoreRecuperacao, setScoreRecuperacao] = useState<number | null>(null)
  const [streak, setStreak] = useState<number>(0)
  const [carregando, setCarregando] = useState(true)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const { data: perfilData } = await supabase
        .from('perfis')
        .select('tipo, nome, email')
        .eq('id', session.user.id)
        .single()

      if (!perfilData) { router.push('/onboarding'); return }
      setPerfil(perfilData)

      if (perfilData.tipo === 'cliente') {
        // ✅ Data sempre no fuso de São Paulo — nunca toISOString()
        const hoje = getTodayBR()

        const [{ data: be }, { data: sonoHoje }, { data: treinos }] = await Promise.all([
          supabase
            .from('bem_estar')
            .select('energia, humor, dor_muscular, qualidade_sono')
            .eq('usuario_id', session.user.id)
            .eq('data', hoje)
            .single(),
          supabase
            .from('sono')
            .select('score_recuperacao')
            .eq('usuario_id', session.user.id)
            .eq('data', hoje)
            .single(),
          supabase
            .from('treinos')
            .select('data')
            .eq('usuario_id', session.user.id)
            .eq('concluido', true)
            .order('data', { ascending: false })
            .limit(60),
        ])

        if (be) setBemEstar(be)
        if (sonoHoje?.score_recuperacao) setScoreRecuperacao(sonoHoje.score_recuperacao)
        if (treinos) setStreak(calcularStreak(treinos.map((t: { data: string }) => t.data)))
      }

      setCarregando(false)
    }
    carregarDados()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-600 text-[10px] tracking-[0.25em] uppercase">Carregando</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28">
        {perfil?.tipo === 'cliente' && (
          <DashboardCliente
            perfil={perfil}
            bemEstar={bemEstar}
            scoreRecuperacao={scoreRecuperacao}
            streak={streak}
            activeTab={activeTab}
            onLogout={handleLogout}
          />
        )}
        {perfil?.tipo === 'personal' && (
          <DashboardPersonal perfil={perfil} activeTab={activeTab} onLogout={handleLogout} />
        )}
        {perfil?.tipo === 'nutricionista' && (
          <DashboardNutricionista perfil={perfil} activeTab={activeTab} onLogout={handleLogout} />
        )}
      </div>

      {/* ── Bottom Navigation ── */}
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
          {getNavItems(perfil?.tipo).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'perfil') router.push('/perfil')
                else setActiveTab(item.id)
              }}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90"
            >
              <span className={`text-lg transition-all duration-200 ${activeTab === item.id ? 'opacity-100' : 'opacity-20'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${activeTab === item.id ? 'text-white' : 'text-zinc-700'}`}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}

// ─── MICRO-COMPONENTE ─────────────────────────────────────────────────────────

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-white text-sm font-bold">{valor}</p>
    </div>
  )
}

// ─── DASHBOARD CLIENTE ────────────────────────────────────────────────────────

function DashboardCliente({
  perfil,
  bemEstar,
  scoreRecuperacao,
  streak,
  onLogout: _onLogout,
}: {
  perfil: Perfil
  bemEstar: BemEstar
  scoreRecuperacao: number | null
  streak: number
  activeTab: string
  onLogout: () => void
}) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)
  const media     = getMediaBemEstar(bemEstar)
  const cores     = scoreRecuperacao ? getScoreCores(scoreRecuperacao) : null

  function getSugestaoIA(): string {
    if (!scoreRecuperacao) return '✦ Registre seu sono para receber sugestões personalizadas da IA.'
    if (scoreRecuperacao >= 85) return '✦ Recuperação excelente. Dia ideal para bater recordes — vá com tudo.'
    if (scoreRecuperacao >= 70) return '✦ Sua recuperação está ótima. Considere um treino de força hoje.'
    if (scoreRecuperacao >= 55) return '✦ Recuperação moderada. Prefira volume leve ou foco em técnica.'
    if (scoreRecuperacao >= 40) return '✦ Recuperação baixa. Um treino leve ou mobilidade é o ideal hoje.'
    return '✦ Recuperação crítica. Priorize descanso — seu corpo está pedindo.'
  }

  return (
    <div
      className="max-w-md mx-auto px-4"
      style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.85rem] font-black tracking-tight leading-none text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1.5 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-sm active:scale-90 transition-all">
            🔔
          </button>
          <button
            onClick={() => router.push('/perfil')}
            className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all"
          >
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      {/* ── HERO: Score de Recuperação ── */}
      {scoreRecuperacao ? (
        <button
          onClick={() => router.push('/sono')}
          className={`w-full text-left rounded-3xl p-6 mb-3 border ${cores?.border} relative overflow-hidden active:scale-[0.98] transition-all duration-200`}
          style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}
        >
          <div className={`absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-15 ${cores?.bg}`} />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.22em] mb-1.5">Recuperação hoje</p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-[5rem] font-black leading-none ${cores?.text}`}
                    style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}
                  >
                    {scoreRecuperacao}
                  </span>
                  <span className="text-zinc-600 text-xl font-light">/100</span>
                </div>
              </div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1 opacity-70">Ver análise →</span>
            </div>

            <p className={`text-sm font-bold mb-4 ${cores?.text}`}>{getScoreLabel(scoreRecuperacao)}</p>

            <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full ${cores?.bg} transition-all duration-700`}
                style={{ width: `${scoreRecuperacao}%` }}
              />
            </div>

            {bemEstar && (
              <div className="flex gap-5">
                <Metrica label="Energia"   valor={`${bemEstar.energia}/5`} />
                <div className="w-px bg-white/[0.06]" />
                <Metrica label="Humor"     valor={`${bemEstar.humor}/5`} />
                <div className="w-px bg-white/[0.06]" />
                <Metrica label="Dor musc." valor={`${6 - bemEstar.dor_muscular}/5`} />
              </div>
            )}
          </div>
        </button>
      ) : (
        <button
          onClick={() => router.push('/sono')}
          className="w-full text-left rounded-3xl p-6 mb-3 border border-white/[0.06] relative overflow-hidden active:scale-[0.98] transition-all group"
          style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-[0.04] bg-white" />
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.22em] mb-3">Recuperação hoje</p>
          <p className="text-white text-2xl font-black mb-1 group-hover:text-emerald-400 transition-colors">
            Registrar sono
          </p>
          <p className="text-zinc-600 text-xs">Saiba como seu corpo está respondendo →</p>
        </button>
      )}

      {/* ── Bem-estar ── */}
      <button
        onClick={() => router.push('/bem-estar')}
        className="w-full text-left rounded-2xl p-5 mb-3 border border-white/[0.06] active:scale-[0.98] transition-all"
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
              <div className="w-20 h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${media <= 2 ? 'bg-red-400' : media === 3 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
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
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">😐</div>
          </div>
        )}
      </button>

      {/* ── Streak ── */}
      <div className="rounded-2xl p-5 mb-3 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Streak de consistência</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {streak}
              </span>
              <span className="text-zinc-600 text-sm">dias seguidos</span>
            </div>
            <p className="text-zinc-600 text-xs mt-1">
              {streak === 0
                ? 'Faça seu primeiro treino hoje'
                : streak >= 7
                ? 'Incrível consistência! 💪'
                : 'Continue assim!'}
            </p>
          </div>
          <div className={`text-4xl transition-all duration-300 ${streak > 0 ? 'opacity-100' : 'opacity-20'}`}>🔥</div>
        </div>
      </div>

      {/* ── Treino de hoje ── */}
      <div className="rounded-2xl p-5 mb-3 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Treino de hoje</p>
            <p className="text-white font-bold text-base">Nenhum treino montado</p>
            <p className="text-zinc-600 text-xs mt-0.5">Aguardando seu personal trainer</p>
          </div>
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
            TR
          </div>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-3.5 mb-4 border border-white/[0.05]">
          <p className="text-zinc-400 text-[11px] leading-relaxed">{getSugestaoIA()}</p>
        </div>

        <button
          onClick={() => router.push('/treino')}
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-[0.05em]"
        >
          Iniciar treino livre
        </button>
      </div>

      {/* ── Plano alimentar ── */}
      <div className="rounded-2xl p-5 mb-3 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Plano alimentar</p>
            <p className="text-white font-bold">Nenhum plano ativo</p>
            <p className="text-zinc-600 text-xs mt-0.5">Aguardando sua nutricionista</p>
          </div>
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 bg-green-500/10 text-green-400 border-green-500/20">
            PA
          </div>
        </div>
      </div>

      {/* ── Meu time ── */}
      <div className="rounded-2xl p-5 mb-3 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Meu time</p>
        <div className="space-y-3">
          {[
            { sigla: 'PT', label: 'Personal Trainer', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'  },
            { sigla: 'NU', label: 'Nutricionista',    cor: 'bg-green-500/10 text-green-400 border-green-500/20' },
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
                <button
                  onClick={() => router.push('/convite')}
                  className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0"
                >
                  + Conectar
                </button>
              </div>
              {i === 0 && <div className="h-px bg-white/[0.04] mt-3" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD PERSONAL ───────────────────────────────────────────────────────

function DashboardPersonal({
  perfil,
  onLogout,
}: {
  perfil: Perfil
  activeTab: string
  onLogout: () => void
}) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)

  return (
    <div
      className="max-w-md mx-auto px-4"
      style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.85rem] font-black tracking-tight text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-sm active:scale-90 transition-all">🔔</button>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all"
          >
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/[0.07]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Personal Trainer</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: '0', label: 'Alunos',    sub: 'ativos'    },
          { valor: '0', label: 'Treinaram', sub: 'hoje'      },
          { valor: '0', label: 'Alertas',   sub: 'pendentes' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
            <p className="text-white text-2xl font-black">{m.valor}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 leading-tight">{m.label}</p>
            <p className="text-zinc-700 text-[9px]">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 border border-white/[0.06] mb-3" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em]">Agenda de hoje</p>
          <span className="text-zinc-700 text-[10px] uppercase tracking-widest">{getTodayString().split(',')[0]}</span>
        </div>
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl opacity-40">📅</div>
          <p className="text-zinc-600 text-sm">Nenhum aluno agendado</p>
          <button className="text-[11px] border border-white/[0.08] rounded-xl px-4 py-2 text-zinc-400 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
            + Agendar sessão
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
        <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em] mb-3">Alertas</p>
        <p className="text-zinc-600 text-sm">Nenhum alerta no momento.</p>
      </div>

      <button
        onClick={() => router.push('/convite')}
        className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase"
      >
        + Convidar aluno
      </button>
    </div>
  )
}

// ─── DASHBOARD NUTRICIONISTA ──────────────────────────────────────────────────

function DashboardNutricionista({
  perfil,
  onLogout,
}: {
  perfil: Perfil
  activeTab: string
  onLogout: () => void
}) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)

  return (
    <div
      className="max-w-md mx-auto px-4"
      style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.85rem] font-black tracking-tight text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-sm active:scale-90 transition-all">🔔</button>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all"
          >
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/[0.07]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Nutricionista</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: '0', label: 'Pacientes', sub: 'ativos'    },
          { valor: '0', label: 'Consultas', sub: 'hoje'      },
          { valor: '0', label: 'Alertas',   sub: 'pendentes' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
            <p className="text-white text-2xl font-black">{m.valor}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 leading-tight">{m.label}</p>
            <p className="text-zinc-700 text-[9px]">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 border border-white/[0.06] mb-3" style={{ background: '#0f0f0f' }}>
        <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em] mb-4">Agenda de hoje</p>
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl opacity-40">📋</div>
          <p className="text-zinc-600 text-sm">Nenhum paciente agendado</p>
          <button className="text-[11px] border border-white/[0.08] rounded-xl px-4 py-2 text-zinc-400 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
            + Agendar consulta
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
        <p className="text-zinc-400 text-[10px] uppercase tracking-[0.15em] mb-3">Alertas</p>
        <p className="text-zinc-600 text-sm">Nenhum alerta no momento.</p>
      </div>

      <button
        onClick={() => router.push('/convite')}
        className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase mb-3"
      >
        + Convidar paciente
      </button>
    </div>
  )
}