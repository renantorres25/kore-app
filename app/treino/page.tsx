'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Exercicio = {
  id: string
  nome: string
  series: number
  repeticoes: number
  carga_sugerida: number | null
  observacoes: string
  ordem: number
}

type Treino = {
  id: string
  nome: string
  descricao: string | null
  plano: string
  exercicios: Exercicio[]
}

type SerieRegistrada = {
  exercicio_id: string
  numero_serie: number
  carga: number | null
  repeticoes: number
  concluida: boolean
}

// ─── CORES ────────────────────────────────────────────────────────────────────

const PLANO_CORES: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'bg-emerald-400' },
  B: { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'bg-blue-400'    },
  C: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glow: 'bg-orange-400'  },
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function TreinoCliente() {
  const router = useRouter()
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState<string | null>(null)
  const [treinoEmExecucao, setTreinoEmExecucao] = useState<Treino | null>(null)
  const [series, setSeries] = useState<Record<string, SerieRegistrada[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvandoTreino, setSalvandoTreino] = useState(false)
  const [treinoConcluido, setTreinoConcluido] = useState(false)
  const [tempoInicio, setTempoInicio] = useState<Date | null>(null)
  const [tempo, setTempo] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    carregarTreinos()
  }, [])

  useEffect(() => {
    if (treinoEmExecucao) {
      setTempoInicio(new Date())
      timerRef.current = setInterval(() => setTempo(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setTempo(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [treinoEmExecucao])

  async function carregarTreinos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    // Busca treinos do cliente diretamente — independente do personal
    const { data: treinosData } = await supabase
      .from('treinos')
      .select('id, nome, descricao, plano')
      .eq('cliente_id', session.user.id)
      .eq('status', 'pendente')
      .order('plano')

    if (!treinosData?.length) { setCarregando(false); return }

    // Busca exercícios
    const ids = treinosData.map(t => t.id)
    const { data: exercicios } = await supabase
      .from('exercicios_treino')
      .select('*')
      .in('treino_id', ids)
      .order('ordem')

    const treinosCompletos: Treino[] = treinosData.map(t => ({
      ...t,
      exercicios: exercicios?.filter(e => e.treino_id === t.id) ?? [],
    }))

    setTreinos(treinosCompletos)
    if (treinosCompletos.length) setPlanoAtivo(treinosCompletos[0].plano)
    setCarregando(false)
  }

  function iniciarTreino(treino: Treino) {
    // Inicializa séries para cada exercício
    const seriesInit: Record<string, SerieRegistrada[]> = {}
    treino.exercicios.forEach(ex => {
      seriesInit[ex.id] = Array.from({ length: ex.series }, (_, i) => ({
        exercicio_id: ex.id,
        numero_serie: i + 1,
        carga: ex.carga_sugerida,
        repeticoes: ex.repeticoes,
        concluida: false,
      }))
    })
    setSeries(seriesInit)
    setTreinoEmExecucao(treino)
    setTreinoConcluido(false)
  }

  function toggleSerie(exercicioId: string, serieIndex: number) {
    setSeries(prev => {
      const novos = [...(prev[exercicioId] ?? [])]
      novos[serieIndex] = { ...novos[serieIndex], concluida: !novos[serieIndex].concluida }
      return { ...prev, [exercicioId]: novos }
    })
  }

  function atualizarCarga(exercicioId: string, serieIndex: number, carga: number | null) {
    setSeries(prev => {
      const novos = [...(prev[exercicioId] ?? [])]
      novos[serieIndex] = { ...novos[serieIndex], carga }
      return { ...prev, [exercicioId]: novos }
    })
  }

  function atualizarReps(exercicioId: string, serieIndex: number, reps: number) {
    setSeries(prev => {
      const novos = [...(prev[exercicioId] ?? [])]
      novos[serieIndex] = { ...novos[serieIndex], repeticoes: reps }
      return { ...prev, [exercicioId]: novos }
    })
  }

  function totalSeriesConcluidas(): number {
    return Object.values(series).flat().filter(s => s.concluida).length
  }

  function totalSeries(): number {
    return Object.values(series).flat().length
  }

  function formatarTempo(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  async function finalizarTreino() {
    if (!treinoEmExecucao) return
    setSalvandoTreino(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    // Registra o treino como concluído
    const { data: treinoRegistrado } = await supabase
      .from('treinos')
      .insert({
        personal_id: null,
        cliente_id: session.user.id,
        nome: treinoEmExecucao.nome,
        descricao: treinoEmExecucao.descricao,
        plano: treinoEmExecucao.plano,
        status: 'concluido',
        data: hoje,
        concluido: true,
      })
      .select('id')
      .single()

    if (treinoRegistrado) {
      // Registra as séries
      const todasSeries = Object.values(series).flat().filter(s => s.concluida)
      if (todasSeries.length) {
        await supabase.from('series_registradas').insert(
          todasSeries.map(s => ({
            treino_id: treinoRegistrado.id,
            exercicio_id: s.exercicio_id,
            numero_serie: s.numero_serie,
            carga: s.carga,
            repeticoes: s.repeticoes,
          }))
        )
      }
    }

    setSalvandoTreino(false)
    setTreinoConcluido(true)
  }

  // ── TELA: Carregando ──────────────────────────────────────────────────────

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // ── TELA: Treino concluído ────────────────────────────────────────────────

  if (treinoConcluido && treinoEmExecucao) {
    const totalConcluidas = totalSeriesConcluidas()
    const cores = PLANO_CORES[treinoEmExecucao.plano]
    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-24 h-24 rounded-3xl ${cores.bg} ${cores.border} border flex items-center justify-center text-5xl mx-auto mb-6`}>
            ✓
          </div>
          <p className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${cores.text}`}>Treino concluído</p>
          <h2 className="text-3xl font-black text-white mb-2">{treinoEmExecucao.nome}</h2>
          <p className="text-zinc-500 text-sm mb-8">Excelente trabalho! 💪</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { val: formatarTempo(tempo), label: 'Duração' },
              { val: `${totalConcluidas}`, label: 'Séries' },
              { val: `${treinoEmExecucao.exercicios.length}`, label: 'Exercícios' },
            ].map(m => (
              <div key={m.label} className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className={`text-2xl font-black ${cores.text}`}>{m.val}</p>
                <p className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setTreinoEmExecucao(null); setTreinoConcluido(false) }}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all tracking-wide"
          >
            Voltar aos treinos
          </button>
        </div>
      </main>
    )
  }

  // ── TELA: Executando treino ───────────────────────────────────────────────

  if (treinoEmExecucao) {
    const cores = PLANO_CORES[treinoEmExecucao.plano]
    const concluidas = totalSeriesConcluidas()
    const total = totalSeries()
    const progresso = total > 0 ? (concluidas / total) * 100 : 0

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
        {/* Header fixo */}
        <div className="shrink-0 border-b border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-md mx-auto px-4 pt-12 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${cores.text}`}>Em execução · Plano {treinoEmExecucao.plano}</p>
                <h1 className="text-xl font-black text-white mt-0.5">{treinoEmExecucao.nome}</h1>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white tabular-nums">{formatarTempo(tempo)}</p>
                <p className="text-zinc-600 text-[10px]">{concluidas}/{total} séries</p>
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cores.glow} transition-all duration-500`}
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </div>

        {/* Exercícios */}
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="max-w-md mx-auto px-4 py-4 space-y-4">
            {treinoEmExecucao.exercicios.map((ex, exIdx) => {
              const exSeries = series[ex.id] ?? []
              const todasConcluidas = exSeries.every(s => s.concluida)
              return (
                <div
                  key={ex.id}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${todasConcluidas ? 'border-emerald-500/30' : 'border-white/[0.06]'}`}
                  style={{ background: todasConcluidas ? 'rgba(16,185,129,0.05)' : '#0f0f0f' }}
                >
                  {/* Header exercício */}
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${todasConcluidas ? 'bg-emerald-500/20 text-emerald-400' : `${cores.bg} ${cores.text}`}`}>
                      {todasConcluidas ? '✓' : exIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${todasConcluidas ? 'text-emerald-400' : 'text-white'}`}>{ex.nome}</p>
                      <p className="text-zinc-600 text-[11px]">{ex.series} séries · {ex.repeticoes} reps{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg sugerido` : ''}</p>
                    </div>
                  </div>

                  {ex.observacoes && (
                    <div className="mx-4 mb-3 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04]">
                      <p className="text-zinc-500 text-[11px] italic">{ex.observacoes}</p>
                    </div>
                  )}

                  {/* Séries */}
                  <div className="px-4 pb-4 space-y-2">
                    {exSeries.map((serie, sIdx) => (
                      <div
                        key={sIdx}
                        className={`flex items-center gap-2 rounded-xl p-2 transition-all ${serie.concluida ? 'bg-emerald-500/5' : 'bg-white/[0.02]'}`}
                      >
                        {/* Número série */}
                        <p className={`text-sm font-bold w-6 text-center shrink-0 ${serie.concluida ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {sIdx + 1}
                        </p>

                        {/* Carga */}
                        <div className="flex-1">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Carga (kg)</p>
                          <input
                            type="number"
                            value={serie.carga ?? ''}
                            onChange={e => atualizarCarga(ex.id, sIdx, e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="—"
                            disabled={serie.concluida}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-white/20 transition-colors placeholder:text-zinc-700 disabled:opacity-50"
                          />
                        </div>

                        {/* Reps */}
                        <div className="flex-1">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Reps</p>
                          <input
                            type="number"
                            value={serie.repeticoes}
                            onChange={e => atualizarReps(ex.id, sIdx, parseInt(e.target.value) || 0)}
                            disabled={serie.concluida}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
                          />
                        </div>

                        {/* Botão concluir */}
                        <button
                          onClick={() => toggleSerie(ex.id, sIdx)}
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-bold transition-all active:scale-90 shrink-0 ${
                            serie.concluida
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-white/[0.06] border-white/[0.12] text-zinc-400 hover:border-white/30 hover:text-white'
                          }`}
                        >
                          {serie.concluida ? '✓' : '○'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer fixo */}
        <div
          className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04] shrink-0"
          style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-md mx-auto px-4 py-4">
            <button
              onClick={finalizarTreino}
              disabled={salvandoTreino || concluidas === 0}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-wide"
            >
              {salvandoTreino ? 'Salvando...' : concluidas === total && total > 0 ? '🏁 Finalizar treino' : `Finalizar (${concluidas}/${total} séries)`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA: Selecionar treino ───────────────────────────────────────────────

  const treinoSelecionado = treinos.find(t => t.plano === planoAtivo)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div
        className="max-w-md mx-auto px-4 pb-24"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
      >
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">Meus Treinos</h1>
          <p className="text-zinc-600 text-xs mt-1">Selecione o plano e execute</p>
        </div>

        {treinos.length === 0 ? (
          /* Sem treinos */
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">🏋️</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Nenhum plano disponível</p>
              <p className="text-zinc-600 text-sm">Aguardando seu personal trainer montar os treinos</p>
            </div>
          </div>
        ) : (
          <>
            {/* Seletor de plano */}
            <div className="flex gap-2 mb-6">
              {treinos.map(t => {
                const c = PLANO_CORES[t.plano]
                return (
                  <button
                    key={t.plano}
                    onClick={() => setPlanoAtivo(t.plano)}
                    className={`flex-1 py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 ${
                      planoAtivo === t.plano
                        ? `${c.bg} ${c.border} ${c.text}`
                        : 'bg-white/[0.03] border-white/[0.06] text-zinc-600'
                    }`}
                  >
                    Plano {t.plano}
                    <span className="block text-[9px] font-normal mt-0.5 opacity-70">{t.exercicios.length} exerc.</span>
                  </button>
                )
              })}
            </div>

            {/* Card do plano selecionado */}
            {treinoSelecionado && (() => {
              const cores = PLANO_CORES[treinoSelecionado.plano]
              return (
                <div>
                  <div className={`rounded-2xl p-5 border ${cores.border} mb-4`} style={{ background: '#0f0f0f' }}>
                    <p className={`text-[10px] uppercase tracking-[0.2em] mb-1 ${cores.text}`}>Plano {treinoSelecionado.plano}</p>
                    <p className="text-white font-black text-xl mb-1">{treinoSelecionado.nome}</p>
                    {treinoSelecionado.descricao && (
                      <p className="text-zinc-500 text-xs mb-4">{treinoSelecionado.descricao}</p>
                    )}

                    {/* Preview exercícios */}
                    <div className="space-y-2 mt-4">
                      {treinoSelecionado.exercicios.map((ex, i) => (
                        <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                          <div className={`w-6 h-6 rounded-lg ${cores.bg} flex items-center justify-center shrink-0`}>
                            <span className={`text-[10px] font-black ${cores.text}`}>{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{ex.nome}</p>
                            <p className="text-zinc-600 text-[11px]">
                              {ex.series}×{ex.repeticoes}{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botão iniciar */}
                  <button
                    onClick={() => iniciarTreino(treinoSelecionado)}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-[0.05em]"
                  >
                    Iniciar Plano {treinoSelecionado.plano} →
                  </button>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </main>
  )
}