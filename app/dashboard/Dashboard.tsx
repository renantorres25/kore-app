'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import OnboardingTour from '../components/OnboardingTour'

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

type Vinculo = {
  tipo: string
  profissional_id: string
  nome: string | null
  email: string
} | null

// ─── UTILITÁRIOS DE DATA (FUSO BRASIL) ───────────────────────────────────────

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

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

function calcularStreak(datas: string[]): number {
  if (!datas.length) return 0
  const hoje = getTodayBR()
  let streak = 0
  const cursor = new Date(hoje + 'T12:00:00-03:00')

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
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [treinoHoje, setTreinoHoje] = useState<{ nome: string; plano: string; concluido: boolean } | null>(null)
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
        const hoje = getTodayBR()

        const [{ data: be }, { data: sonoHoje }, { data: treinos }, { data: vinculosData }, { data: treinoHojeData }] = await Promise.all([
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
            .eq('cliente_id', session.user.id)
            .eq('concluido', true)
            .order('data', { ascending: false })
            .limit(60),
          supabase
            .from('vinculos')
            .select('tipo, profissional_id')
            .eq('cliente_id', session.user.id)
            .eq('ativo', true),
          supabase
            .from('treinos')
            .select('nome, plano, concluido')
            .eq('cliente_id', session.user.id)
            .eq('data', hoje)
            .order('concluido', { ascending: false })
            .limit(1)
            .single(),
        ])

        if (be) setBemEstar(be)
        if (sonoHoje?.score_recuperacao) setScoreRecuperacao(sonoHoje.score_recuperacao)
        if (treinos) setStreak(calcularStreak(treinos.map((t: { data: string }) => t.data)))
        if (treinoHojeData) setTreinoHoje(treinoHojeData)

        if (vinculosData?.length) {
          const ids = vinculosData.map((v: { profissional_id: string }) => v.profissional_id)
          const { data: perfis } = await supabase
            .from('perfis')
            .select('id, nome, email')
            .in('id', ids)
          const vinculosComPerfil = vinculosData.map((v: { tipo: string; profissional_id: string }) => {
            const p = perfis?.find((pf: { id: string }) => pf.id === v.profissional_id)
            return { tipo: v.tipo, profissional_id: v.profissional_id, nome: p?.nome ?? null, email: p?.email ?? '' }
          })
          setVinculos(vinculosComPerfil)
        }
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

      {/* ── Tour de onboarding — só aparece na primeira vez para clientes ── */}
      {perfil?.tipo === 'cliente' && <OnboardingTour />}

      <div className="flex-1 overflow-y-auto pb-28">
        {perfil?.tipo === 'cliente' && (
          <DashboardCliente
            perfil={perfil}
            bemEstar={bemEstar}
            scoreRecuperacao={scoreRecuperacao}
            streak={streak}
            vinculos={vinculos}
            treinoHoje={treinoHoje}
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
                else if (item.id === 'alunos') router.push('/personal')
                else if (item.id === 'pacientes') router.push('/personal')
                else if (item.id === 'treino') router.push('/treino')
                else if (item.id === 'evolucao') router.push('/evolucao')
                else if (item.id === 'nutri') router.push('/nutricao')
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
  vinculos,
  treinoHoje,
  onLogout: _onLogout,
}: {
  perfil: Perfil
  bemEstar: BemEstar
  scoreRecuperacao: number | null
  streak: number
  vinculos: Vinculo[]
  treinoHoje: { nome: string; plano: string; concluido: boolean } | null
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
            {treinoHoje ? (
              <>
                <p className="text-white font-bold text-base">{treinoHoje.nome}</p>
                <p className={`text-xs mt-0.5 ${treinoHoje.concluido ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {treinoHoje.concluido ? '✓ Concluído hoje' : `Plano ${treinoHoje.plano} · Pronto para iniciar`}
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-bold text-base">Escolha seu treino</p>
                <p className="text-zinc-600 text-xs mt-0.5">Seus planos estão prontos</p>
              </>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${
            treinoHoje?.concluido
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          }`}>
            {treinoHoje?.concluido ? '✓' : 'TR'}
          </div>
        </div>

        {!treinoHoje?.concluido && (
          <div className="bg-white/[0.03] rounded-xl p-3.5 mb-4 border border-white/[0.05]">
            <p className="text-zinc-400 text-[11px] leading-relaxed">{getSugestaoIA()}</p>
          </div>
        )}

        <button
          onClick={() => router.push('/treino')}
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-[0.05em]"
        >
          {treinoHoje?.concluido ? 'Ver treinos' : 'Ir para treinos →'}
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
            { tipo: 'personal',      sigla: 'PT', label: 'Personal Trainer', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'   },
            { tipo: 'nutricionista', sigla: 'NU', label: 'Nutricionista',    cor: 'bg-green-500/10 text-green-400 border-green-500/20' },
          ].map((p, i) => {
            const vinculo = vinculos.find(v => v?.tipo === p.tipo)
            return (
              <div key={p.label}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${p.cor}`}>
                    {p.sigla}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{p.label}</p>
                    {vinculo ? (
                      <p className="text-emerald-400 text-xs">{vinculo.nome ?? vinculo.email}</p>
                    ) : (
                      <p className="text-zinc-600 text-xs">Não conectado</p>
                    )}
                  </div>
                  {!vinculo && (
                    <button
                      onClick={() => router.push('/convite')}
                      className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0"
                    >
                      + Conectar
                    </button>
                  )}
                  {vinculo && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </div>
                {i === 0 && <div className="h-px bg-white/[0.04] mt-3" />}
              </div>
            )
          })}
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

  const [totalAlunos, setTotalAlunos] = useState(0)
  const [treinaramHoje, setTreinaramHoje] = useState(0)
  const [alertas, setAlertas] = useState(0)
  const [alunosRecentes, setAlunosRecentes] = useState<{ nome: string | null; email: string; treinouHoje: boolean; score: number | null }[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function carregarStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: vinculos } = await supabase
        .from('vinculos')
        .select('cliente_id')
        .eq('profissional_id', session.user.id)
        .eq('tipo', 'personal')
        .eq('ativo', true)

      if (!vinculos?.length) { setLoadingStats(false); return }

      const hoje = getTodayBR()
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const ids = vinculos.map(v => v.cliente_id)
      setTotalAlunos(ids.length)

      const [{ data: perfis }, { data: treinosHoje }, { data: treinos7d }, { data: scores }] = await Promise.all([
        supabase.from('perfis').select('id, nome, email').in('id', ids),
        supabase.from('treinos').select('cliente_id').eq('concluido', true).eq('data', hoje).in('cliente_id', ids),
        supabase.from('treinos').select('cliente_id, data').eq('concluido', true).gte('data', semanaStr).in('cliente_id', ids),
        supabase.from('sono').select('usuario_id, score_recuperacao').eq('data', hoje).in('usuario_id', ids),
      ])

      const treinaramSet = new Set(treinosHoje?.map(t => t.cliente_id) ?? [])
      const scoreMap = new Map(scores?.map(s => [s.usuario_id, s.score_recuperacao]) ?? [])
      const treinos7dSet = new Map<string, number>()
      treinos7d?.forEach(t => treinos7dSet.set(t.cliente_id, (treinos7dSet.get(t.cliente_id) ?? 0) + 1))

      const alertasCount = ids.filter(id => (treinos7dSet.get(id) ?? 0) === 0).length

      setTreinaramHoje(treinaramSet.size)
      setAlertas(alertasCount)
      setAlunosRecentes(
        (perfis ?? []).map(p => ({
          nome: p.nome,
          email: p.email,
          treinouHoje: treinaramSet.has(p.id),
          score: scoreMap.get(p.id) ?? null,
        })).slice(0, 4)
      )
      setLoadingStats(false)
    }
    carregarStats()
  }, [])

  return (
    <div className="max-w-md mx-auto px-4" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.85rem] font-black tracking-tight text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-sm active:scale-90 transition-all">🔔</button>
          <button onClick={onLogout} className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center active:scale-90 transition-all">
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/[0.07]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Personal Trainer</span>
      </div>

      {/* Stats reais */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: loadingStats ? '—' : String(totalAlunos), label: 'Alunos', sub: 'ativos', cor: 'text-white' },
          { valor: loadingStats ? '—' : String(treinaramHoje), label: 'Treinaram', sub: 'hoje', cor: treinaramHoje > 0 ? 'text-emerald-400' : 'text-white' },
          { valor: loadingStats ? '—' : String(alertas), label: 'Alertas', sub: 'sem treinar 7d', cor: alertas > 0 ? 'text-orange-400' : 'text-white' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-4 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
            <p className={`text-2xl font-black ${m.cor}`}>{m.valor}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 leading-tight">{m.label}</p>
            <p className="text-zinc-700 text-[9px]">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Alunos recentes */}
      {alunosRecentes.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Seus alunos hoje</p>
            <button onClick={() => router.push('/personal')} className="text-zinc-600 text-[10px] uppercase tracking-wider hover:text-white transition-colors">Ver todos →</button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {alunosRecentes.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${a.treinouHoje ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-zinc-500'}`}>
                  {(a.nome ?? a.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{a.nome ?? a.email.split('@')[0]}</p>
                  <p className={`text-[11px] ${a.treinouHoje ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {a.treinouHoje ? '✓ Treinou hoje' : 'Não treinou hoje'}
                  </p>
                </div>
                {a.score && (
                  <div className={`text-xs font-bold shrink-0 ${a.score >= 70 ? 'text-emerald-400' : a.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {a.score}/100
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertas > 0 && (
        <div className="rounded-2xl p-4 border border-orange-500/20 bg-orange-500/5 mb-4">
          <p className="text-orange-400 text-[10px] uppercase tracking-[0.15em] mb-1">⚠ {alertas} aluno{alertas > 1 ? 's' : ''} sem treinar há 7+ dias</p>
          <p className="text-zinc-500 text-xs">Acesse a lista de alunos para ver quem precisa de atenção.</p>
          <button onClick={() => router.push('/personal')} className="mt-3 text-[11px] border border-orange-500/30 text-orange-400 rounded-lg px-3 py-1.5 active:scale-95 transition-all uppercase tracking-wider">
            Ver alunos →
          </button>
        </div>
      )}

      <button onClick={() => router.push('/personal')} className="w-full border border-white/[0.08] text-zinc-300 font-bold py-3.5 rounded-2xl hover:bg-white/[0.05] active:scale-95 transition-all text-sm tracking-[0.1em] uppercase mb-3">
        Ver todos os alunos
      </button>

      <button onClick={() => router.push('/convite')} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase">
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