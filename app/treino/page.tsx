'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Exercicio = { id: string; nome: string; series: number; repeticoes: number; carga_sugerida: number | null; observacoes: string; ordem: number }
type Treino = { id: string; nome: string; descricao: string | null; plano: string; personal_id?: string | null; exercicios: Exercicio[] }
type SerieRegistrada = { exercicio_id: string; numero_serie: number; carga: number | null; repeticoes: number; concluida: boolean }

const CORES: Record<string, { text: string; bg: string; border: string; glow: string; hex: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'bg-emerald-400', hex: '#10B981' },
  B: { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'bg-blue-400',    hex: '#3B82F6' },
  C: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glow: 'bg-orange-400',  hex: '#F97316' },
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function fmt(s: number): string {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
}

function calcVolume(series: Record<string, SerieRegistrada[]>): number {
  return Object.values(series).flat().filter(s => s.concluida && s.carga).reduce((a, s) => a + (s.carga! * s.repeticoes), 0)
}

export default function TreinoCliente() {
  const router = useRouter()
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState<string | null>(null)
  const [em, setEm] = useState<Treino | null>(null) // treino em execução
  const [series, setSeries] = useState<Record<string, SerieRegistrada[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [tempoFinal, setTempoFinal] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [analise, setAnalise] = useState({ texto: '', carregando: false })
  const timer = useRef<NodeJS.Timeout | null>(null)

  // Busca treinos concluídos hoje para mostrar badge
  const [treinosConcluidosHoje, setTreinosConcluidosHoje] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function verificarHoje() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('treinos')
        .select('plano')
        .eq('cliente_id', session.user.id)
        .eq('concluido', true)
        .eq('data', new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
      if (data) setTreinosConcluidosHoje(new Set(data.map(t => t.plano)))
    }
    verificarHoje()
  }, [concluido]) // re-verifica quando conclui um treino

  useEffect(() => {
    if (em && !concluido) {
      timer.current = setInterval(() => setTempo(t => t + 1), 1000)
    } else {
      if (timer.current) clearInterval(timer.current)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [em, concluido])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const hoje = getTodayBR()
    const { data: sono } = await supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single()
    if (sono?.score_recuperacao) setScore(sono.score_recuperacao)

    // Busca todos os planos pendentes do cliente (criados pelo personal)
    const { data: td } = await supabase
      .from('treinos')
      .select('id, nome, descricao, plano, personal_id')
      .eq('cliente_id', session.user.id)
      .eq('status', 'pendente')
      .eq('concluido', false)
      .order('plano')
    if (!td?.length) { setCarregando(false); return }

    const ids = td.map(t => t.id)
    const { data: ex } = await supabase.from('exercicios_treino').select('*').in('treino_id', ids).order('ordem')
    const completos: Treino[] = td.map(t => ({ ...t, exercicios: ex?.filter(e => e.treino_id === t.id) ?? [] }))

    setTreinos(completos)
    if (completos.length) setPlanoAtivo(completos[0].plano)
    setCarregando(false)
  }

  function iniciar(treino: Treino) {
    const init: Record<string, SerieRegistrada[]> = {}
    treino.exercicios.forEach(ex => {
      init[ex.id] = Array.from({ length: ex.series }, (_, i) => ({
        exercicio_id: ex.id, numero_serie: i + 1,
        carga: ex.carga_sugerida, repeticoes: ex.repeticoes, concluida: false,
      }))
    })
    setSeries(init)
    setEm(treino)
    setConcluido(false)
    setTempo(0)
    setAnalise({ texto: '', carregando: false })
  }

  function toggle(exId: string, idx: number) {
    setSeries(p => { const n = [...(p[exId]??[])]; n[idx] = { ...n[idx], concluida: !n[idx].concluida }; return { ...p, [exId]: n } })
  }

  function setCarga(exId: string, idx: number, v: number | null) {
    setSeries(p => { const n = [...(p[exId]??[])]; n[idx] = { ...n[idx], carga: v }; return { ...p, [exId]: n } })
  }

  function setReps(exId: string, idx: number, v: number) {
    setSeries(p => { const n = [...(p[exId]??[])]; n[idx] = { ...n[idx], repeticoes: v }; return { ...p, [exId]: n } })
  }

  const totalConcluidas = () => Object.values(series).flat().filter(s => s.concluida).length
  const totalSeries = () => Object.values(series).flat().length

  async function gerarIA(treino: Treino, s: Record<string, SerieRegistrada[]>, t: number) {
    setAnalise({ texto: '', carregando: true })
    const vol = calcVolume(s)
    const tc = Object.values(s).flat().filter(x => x.concluida).length
    const tt = Object.values(s).flat().length
    const resumo = treino.exercicios.map(ex => {
      const done = s[ex.id]?.filter(x => x.concluida) ?? []
      if (!done.length) return null
      return `${ex.nome}: ${done.length} séries (${done.map(x => x.carga ? `${x.carga}kg` : 'sem carga').join(', ')})`
    }).filter(Boolean).join('\n')

    const prompt = `Você é o coach de IA do KORE, app de performance esportiva premium. Analise este treino de forma direta, honesta e motivadora.

TREINO: ${treino.plano} — ${treino.nome}
Duração: ${Math.floor(t/60)} min ${t%60} seg
Séries: ${tc}/${tt} concluídas
Volume: ${vol > 0 ? `${vol}kg total` : 'não registrado'}
Score de recuperação: ${score ? `${score}/100` : 'não registrado'}

EXERCÍCIOS:
${resumo || 'Dados não disponíveis'}

Gere análise em 3 partes CURTAS (máx 80 palavras total, sem emojis, sem markdown):
1. Desempenho: avalie considerando o score de recuperação
2. Destaque: ponto mais positivo
3. Próximo passo: orientação concreta`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? 'Análise não disponível.', carregando: false })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar a análise agora.', carregando: false })
    }
  }

  async function finalizar() {
    if (!em) return
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const t = tempo
    const hoje = getTodayBR()

    // ✅ Cria NOVO registro de execução — nunca altera o plano original do personal
    const { data: reg } = await supabase.from('treinos').insert({
      personal_id: em.personal_id ?? null,
      cliente_id: session.user.id,
      nome: em.nome,
      descricao: em.descricao,
      plano: em.plano,
      status: 'concluido',
      data: hoje,
      concluido: true,
    }).select('id').single()

    if (reg) {
      const done = Object.values(series).flat().filter(s => s.concluida)
      if (done.length) {
        await supabase.from('series_registradas').insert(
          done.map(s => ({
            treino_id: reg.id,
            exercicio_id: s.exercicio_id,
            numero_serie: s.numero_serie,
            carga: s.carga,
            repeticoes: s.repeticoes,
          }))
        )
      }
    }

    setTempoFinal(t)
    setSalvando(false)
    setConcluido(true)
    gerarIA(em, series, t)
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────
  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── TELA DE CONCLUSÃO ─────────────────────────────────────────────────────────
  if (concluido && em) {
    const c = CORES[em.plano]
    const tc = totalConcluidas()
    const tt = totalSeries()
    const vol = calcVolume(series)
    const pct = tt > 0 ? Math.round((tc / tt) * 100) : 0

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pb-12" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

          {/* Hero */}
          <div className="relative mb-8 text-center pt-4">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: c.hex }} />
            <div className="relative">
              <div className={`w-20 h-20 rounded-3xl ${c.bg} border ${c.border} flex items-center justify-center mx-auto mb-5`} style={{ boxShadow: `0 0 60px ${c.hex}25` }}>
                <span className={`text-4xl font-black ${c.text}`}>✓</span>
              </div>
              <p className={`text-[10px] uppercase tracking-[0.3em] mb-2 ${c.text}`}>Treino concluído · Plano {em.plano}</p>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">{em.nome}</h1>
              <p className="text-zinc-500 text-sm capitalize">
                {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Duração', val: fmt(tempoFinal), sub: 'min:seg' },
              { label: 'Séries', val: `${tc}`, subEl: (
                <div className="mt-2 h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.glow}`} style={{ width: `${pct}%` }} />
                </div>
              ), extra: `/${tt}` },
              { label: 'Volume total', val: vol > 0 ? vol.toLocaleString('pt-BR') : '—', sub: vol > 0 ? 'kg × reps' : 'sem carga' },
              { label: 'Recuperação', val: score ? `${score}` : '—', sub: score ? '/100 hoje' : 'não registrado' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">{s.label}</p>
                <p className={`text-3xl font-black tabular-nums ${c.text}`}>
                  {s.val}{s.extra && <span className="text-zinc-600 text-lg font-light">{s.extra}</span>}
                </p>
                {s.subEl ?? <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Exercícios */}
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Exercícios realizados</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {em.exercicios.map((ex, i) => {
                const done = series[ex.id]?.filter(s => s.concluida) ?? []
                const total = series[ex.id]?.length ?? ex.series
                const ok = done.length === total && total > 0
                const max = Math.max(...done.map(s => s.carga ?? 0))
                return (
                  <div key={ex.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black ${ok ? `${c.bg} ${c.text}` : 'bg-white/[0.04] text-zinc-600'}`}>
                      {ok ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${ok ? 'text-white' : 'text-zinc-500'}`}>{ex.nome}</p>
                      <p className="text-zinc-600 text-[11px]">{done.length}/{total} séries{max > 0 ? ` · máx ${max}kg` : ''}</p>
                    </div>
                    {ok && <div className={`w-2 h-2 rounded-full ${c.glow} shrink-0`} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Análise IA */}
          <div className={`rounded-2xl border mb-4 overflow-hidden ${c.border}`} style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className={`w-7 h-7 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <span className={`text-[11px] font-black ${c.text}`}>✦</span>
              </div>
              <div className="flex-1">
                <p className={`text-[10px] uppercase tracking-[0.2em] ${c.text}`}>Análise KORE IA</p>
                <p className="text-zinc-600 text-[10px]">Powered by Claude Haiku</p>
              </div>
              {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
            <div className="px-5 py-4">
              {analise.carregando ? (
                <div className="space-y-2">
                  {[1, 0.8, 0.6].map((w, i) => (
                    <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />
                  ))}
                </div>
              ) : (
                <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto || 'Gerando análise...'}</p>
              )}
            </div>
            {!analise.carregando && score && (
              <div className="px-5 pb-4">
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <p className="text-zinc-500 text-[11px]">
                    Score de recuperação considerado: <span className={`font-bold ${c.text}`}>{score}/100</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Wearable */}
          <div className="rounded-2xl border border-white/[0.06] mb-6 p-5" style={{ background: '#0f0f0f' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 text-sm">⌚</div>
              <p className="text-zinc-400 text-xs font-semibold">Wearable não conectado</p>
            </div>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              Conecte seu Whoop, Garmin ou Apple Watch para adicionar FC média, HRV e calorias à análise da IA.
            </p>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <button onClick={() => router.push('/dashboard')} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-[0.05em]">
              Voltar ao dashboard
            </button>
            <button
              onClick={() => { setEm(null); setConcluido(false); setTempo(0); setTempoFinal(0); setAnalise({ texto: '', carregando: false }) }}
              className="w-full border border-white/[0.08] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all"
            >
              Fazer outro treino
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA EM EXECUÇÃO ──────────────────────────────────────────────────────────
  if (em) {
    const c = CORES[em.plano]
    const tc = totalConcluidas()
    const tt = totalSeries()
    const prog = tt > 0 ? (tc / tt) * 100 : 0

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
        <div className="shrink-0 border-b border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-md mx-auto px-4 pt-12 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${c.text}`}>Em execução · Plano {em.plano}</p>
                <h1 className="text-xl font-black text-white mt-0.5">{em.nome}</h1>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white tabular-nums">{fmt(tempo)}</p>
                <p className="text-zinc-600 text-[10px]">{tc}/{tt} séries</p>
              </div>
            </div>
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${c.glow} transition-all duration-500`} style={{ width: `${prog}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
          <div className="max-w-md mx-auto px-4 py-4 space-y-4">
            {em.exercicios.map((ex, ei) => {
              const exs = series[ex.id] ?? []
              const ok = exs.length > 0 && exs.every(s => s.concluida)
              return (
                <div key={ex.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${ok ? 'border-emerald-500/30' : 'border-white/[0.06]'}`} style={{ background: ok ? 'rgba(16,185,129,0.04)' : '#0f0f0f' }}>
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${ok ? 'bg-emerald-500/20 text-emerald-400' : `${c.bg} ${c.text}`}`}>
                      {ok ? '✓' : ei + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${ok ? 'text-emerald-400' : 'text-white'}`}>{ex.nome}</p>
                      <p className="text-zinc-600 text-[11px]">{ex.series} séries · {ex.repeticoes} reps{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg sugerido` : ''}</p>
                    </div>
                  </div>
                  {ex.observacoes && (
                    <div className="mx-4 mb-3 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04]">
                      <p className="text-zinc-500 text-[11px] italic">{ex.observacoes}</p>
                    </div>
                  )}
                  <div className="px-4 pb-4 space-y-2">
                    {exs.map((s, si) => (
                      <div key={si} className={`flex items-center gap-2 rounded-xl p-2 transition-all ${s.concluida ? 'bg-emerald-500/5' : 'bg-white/[0.02]'}`}>
                        <p className={`text-sm font-bold w-6 text-center shrink-0 ${s.concluida ? 'text-emerald-400' : 'text-zinc-500'}`}>{si + 1}</p>
                        <div className="flex-1">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Carga (kg)</p>
                          <input type="number" value={s.carga ?? ''} onChange={e => setCarga(ex.id, si, e.target.value ? parseFloat(e.target.value) : null)} placeholder="—" disabled={s.concluida} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-white/20 placeholder:text-zinc-700 disabled:opacity-50" />
                        </div>
                        <div className="flex-1">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Reps</p>
                          <input type="number" value={s.repeticoes} onChange={e => setReps(ex.id, si, parseInt(e.target.value) || 0)} disabled={s.concluida} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-white/20 disabled:opacity-50" />
                        </div>
                        <button onClick={() => toggle(ex.id, si)} className={`w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-bold transition-all active:scale-90 shrink-0 ${s.concluida ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/[0.06] border-white/[0.12] text-zinc-400 hover:border-white/30 hover:text-white'}`}>
                          {s.concluida ? '✓' : '○'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto px-4 py-4">
            <button onClick={finalizar} disabled={salvando || tc === 0} className={`w-full font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-wide ${tc === tt && tt > 0 ? 'bg-white text-black hover:bg-zinc-100' : 'bg-white/10 text-white border border-white/20'}`}>
              {salvando ? 'Salvando...' : tc === tt && tt > 0 ? '🏁 Finalizar treino' : `Finalizar (${tc}/${tt} séries)`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── SELEÇÃO ───────────────────────────────────────────────────────────────────
  const sel = treinos.find(t => t.plano === planoAtivo)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-24" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">← Dashboard</button>
          <h1 className="text-2xl font-black text-white tracking-tight">Meus Treinos</h1>
          <p className="text-zinc-600 text-xs mt-1">Selecione o plano e execute</p>
        </div>

        {treinos.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">🏋️</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Nenhum plano disponível</p>
              <p className="text-zinc-600 text-sm">Aguardando seu personal trainer montar os treinos</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              {treinos.map(t => {
                const co = CORES[t.plano]
                return (
                  <button key={t.plano} onClick={() => setPlanoAtivo(t.plano)} className={`flex-1 py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 ${planoAtivo === t.plano ? `${co.bg} ${co.border} ${co.text}` : 'bg-white/[0.03] border-white/[0.06] text-zinc-600'}`}>
                    Plano {t.plano}
                    <span className="block text-[9px] font-normal mt-0.5 opacity-70">
                      {treinosConcluidosHoje.has(t.plano) ? '✓ Feito hoje' : `${t.exercicios.length} exerc.`}
                    </span>
                  </button>
                )
              })}
            </div>

            {sel && (() => {
              const co = CORES[sel.plano]
              return (
                <div>
                  <div className={`rounded-2xl p-5 border ${co.border} mb-4`} style={{ background: '#0f0f0f' }}>
                    <p className={`text-[10px] uppercase tracking-[0.2em] mb-1 ${co.text}`}>Plano {sel.plano}</p>
                    <p className="text-white font-black text-xl mb-1">{sel.nome}</p>
                    {sel.descricao && <p className="text-zinc-500 text-xs mb-4">{sel.descricao}</p>}
                    <div className="space-y-2 mt-4">
                      {sel.exercicios.map((ex, i) => (
                        <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                          <div className={`w-6 h-6 rounded-lg ${co.bg} flex items-center justify-center shrink-0`}>
                            <span className={`text-[10px] font-black ${co.text}`}>{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{ex.nome}</p>
                            <p className="text-zinc-600 text-[11px]">{ex.series}×{ex.repeticoes}{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {score && (
                    <div className="rounded-2xl p-4 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-zinc-400 text-[11px]">
                          Sua recuperação hoje é <span className="text-white font-bold">{score}/100</span>
                          {score >= 70 ? ' — ótimo dia para treinar forte!' : score >= 50 ? ' — treine com moderação.' : ' — considere um treino leve.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <button onClick={() => iniciar(sel)} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-[0.05em]">
                    Iniciar Plano {sel.plano} →
                  </button>
                </div>
              )
            })()}
          </>
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
          {[
            { id: 'home',     icon: '⬜', label: 'Início',   path: '/dashboard' },
            { id: 'treino',   icon: '◈',  label: 'Treino',   path: '/treino'    },
            { id: 'nutri',    icon: '◇',  label: 'Nutrição', path: null         },
            { id: 'evolucao', icon: '△',  label: 'Evolução', path: '/evolucao'  },
            { id: 'perfil',   icon: '◉',  label: 'Perfil',   path: '/perfil'    },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => item.path && router.push(item.path)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90"
            >
              <span className={`text-lg transition-all duration-200 ${item.id === 'treino' ? 'opacity-100' : 'opacity-20'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${item.id === 'treino' ? 'text-white' : 'text-zinc-700'}`}>
                {item.label}
              </span>
              {item.id === 'treino' && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}