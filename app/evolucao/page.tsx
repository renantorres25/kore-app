'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getLastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
  }
  return days
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ScoreDia = { data: string; score: number | null }
type TreinoDia = { data: string; plano: string; nome: string; concluido: boolean }
type VolumeExercicio = { nome: string; sessoesCount: number; maxCarga: number; evolucao: number }

// ─── SVG SPARKLINE ────────────────────────────────────────────────────────────

function Sparkline({ data, color, height = 60 }: { data: (number | null)[]; color: string; height?: number }) {
  const width = 300
  const valid = data.map((v, i) => ({ v, i })).filter(x => x.v !== null)
  if (valid.length < 2) return null

  const min = Math.min(...valid.map(x => x.v!))
  const max = Math.max(...valid.map(x => x.v!))
  const range = max - min || 1

  const pts = valid.map(({ v, i }) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v! - min) / range) * (height - 8) - 4
    return `${x},${y}`
  })

  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt}`
    const [px, py] = pts[i - 1].split(',').map(Number)
    const [cx, cy] = pt.split(',').map(Number)
    const cpx = (px + cx) / 2
    return `${acc} C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`
  }, '')

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Último ponto */}
      {valid.length > 0 && (() => {
        const last = valid[valid.length - 1]
        const x = (last.i / (data.length - 1)) * width
        const y = height - ((last.v! - min) / range) * (height - 8) - 4
        return <circle cx={x} cy={y} r="4" fill={color} />
      })()}
    </svg>
  )
}

// ─── CALENDÁRIO DE CONSISTÊNCIA ───────────────────────────────────────────────

function CalendarioConsistencia({ treinos }: { treinos: TreinoDia[] }) {
  const hoje = getTodayBR()
  const dias = getLastNDays(28)
  const treinadoSet = new Set(treinos.map(t => t.data))

  const semanas: string[][] = []
  for (let i = 0; i < dias.length; i += 7) {
    semanas.push(dias.slice(i, i + 7))
  }

  return (
    <div className="space-y-1.5">
      {semanas.map((semana, si) => (
        <div key={si} className="flex gap-1.5">
          {semana.map(dia => {
            const treinou = treinadoSet.has(dia)
            const isHoje = dia === hoje
            return (
              <div
                key={dia}
                title={formatDate(dia)}
                className={`flex-1 rounded-lg transition-all ${
                  treinou
                    ? 'bg-emerald-500/80'
                    : isHoje
                    ? 'bg-white/10 ring-1 ring-white/30'
                    : 'bg-white/[0.05]'
                }`}
                style={{ height: 28 }}
              />
            )
          })}
        </div>
      ))}
      <div className="flex gap-1.5 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
          <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Treinou</span>
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <div className="w-3 h-3 rounded-sm bg-white/[0.05]" />
          <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Descansou</span>
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function Evolucao() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [scores, setScores] = useState<ScoreDia[]>([])
  const [treinos, setTreinos] = useState<TreinoDia[]>([])
  const [volumeExercicios, setVolumeExercicios] = useState<VolumeExercicio[]>([])
  const [streak, setStreak] = useState(0)
  const [totalTreinos, setTotalTreinos] = useState(0)
  const [analise, setAnalise] = useState({ texto: '', carregando: false, gerado: false })
  const [mediaScore, setMediaScore] = useState<number | null>(null)
  const [melhorScore, setMelhorScore] = useState<number | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const hoje = getTodayBR()
    const dias30 = getLastNDays(30)
    const dataInicio = dias30[0]

    // Busca scores de recuperação dos últimos 30 dias
    const { data: sonoData } = await supabase
      .from('sono')
      .select('data, score_recuperacao')
      .eq('usuario_id', session.user.id)
      .gte('data', dataInicio)
      .order('data')

    // Busca treinos concluídos
    const { data: treinosData } = await supabase
      .from('treinos')
      .select('data, plano, nome, concluido')
      .eq('cliente_id', session.user.id)
      .eq('concluido', true)
      .gte('data', dataInicio)
      .order('data')

    // Busca séries registradas para volume
    const { data: treinosIds } = await supabase
      .from('treinos')
      .select('id, nome, plano, data')
      .eq('cliente_id', session.user.id)
      .eq('concluido', true)

    let seriesData: any[] = []
    if (treinosIds?.length) {
      const ids = treinosIds.map(t => t.id)
      const { data: series } = await supabase
        .from('series_registradas')
        .select('treino_id, exercicio_id, carga, repeticoes, exercicios_treino(nome)')
        .in('treino_id', ids)
      if (series) seriesData = series
    }

    // Monta array de scores por dia
    const scoreMap = new Map(sonoData?.map(s => [s.data, s.score_recuperacao]) ?? [])
    const dias14 = getLastNDays(14)
    const scoresArray: ScoreDia[] = dias14.map(d => ({
      data: d,
      score: scoreMap.get(d) ?? null,
    }))
    setScores(scoresArray)

    // Stats de scores
    const validos = scoresArray.filter(s => s.score !== null).map(s => s.score!)
    if (validos.length) {
      setMediaScore(Math.round(validos.reduce((a, b) => a + b, 0) / validos.length))
      setMelhorScore(Math.max(...validos))
    }

    // Treinos
    const treinosArray: TreinoDia[] = treinosData?.map(t => ({
      data: t.data,
      plano: t.plano,
      nome: t.nome,
      concluido: t.concluido,
    })) ?? []
    setTreinos(treinosArray)
    setTotalTreinos(treinosArray.length)

    // Streak
    const treinados = new Set(treinosArray.map(t => t.data))
    let s = 0
    const cursor = new Date(hoje + 'T12:00:00-03:00')
    while (true) {
      const d = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      if (treinados.has(d)) { s++; cursor.setDate(cursor.getDate() - 1) }
      else break
    }
    setStreak(s)

    // Volume por exercício
    const exMap = new Map<string, { cargaMax: number; sessoes: Set<string>; cargas: number[] }>()
    seriesData.forEach((serie: any) => {
      const nome = serie.exercicios_treino?.nome ?? 'Desconhecido'
      if (!exMap.has(nome)) exMap.set(nome, { cargaMax: 0, sessoes: new Set(), cargas: [] })
      const ex = exMap.get(nome)!
      if (serie.carga) {
        ex.cargaMax = Math.max(ex.cargaMax, serie.carga)
        ex.cargas.push(serie.carga)
      }
      ex.sessoes.add(serie.treino_id)
    })

    const volumeArr: VolumeExercicio[] = Array.from(exMap.entries())
      .filter(([, v]) => v.sessoes.size > 0)
      .map(([nome, v]) => {
        const cargas = v.cargas
        const evolucao = cargas.length >= 2
          ? Math.round(((cargas[cargas.length - 1] - cargas[0]) / cargas[0]) * 100)
          : 0
        return { nome, sessoesCount: v.sessoes.size, maxCarga: v.cargaMax, evolucao }
      })
      .sort((a, b) => b.sessoesCount - a.sessoesCount)
      .slice(0, 6)

    setVolumeExercicios(volumeArr)
    setCarregando(false)
  }

  async function gerarAnaliseIA() {
    setAnalise({ texto: '', carregando: true, gerado: false })

    const scoresValidos = scores.filter(s => s.score !== null)
    const treinosSemana = treinos.filter(t => {
      const d = new Date(t.data + 'T12:00:00')
      const diff = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 7
    }).length

    const prompt = `Você é o coach de IA do KORE, plataforma de performance esportiva premium. Analise a evolução deste atleta com base nos dados reais abaixo.

DADOS DOS ÚLTIMOS 30 DIAS:
- Total de treinos concluídos: ${totalTreinos}
- Treinos na última semana: ${treinosSemana}
- Streak atual: ${streak} dias seguidos
- Score médio de recuperação: ${mediaScore ?? 'sem dados'}/100
- Melhor score de recuperação: ${melhorScore ?? 'sem dados'}/100
- Scores dos últimos 14 dias: ${scoresValidos.map(s => `${s.data}: ${s.score}`).join(', ') || 'sem dados'}

EXERCÍCIOS MAIS PRATICADOS:
${volumeExercicios.map(e => `- ${e.nome}: ${e.sessoesCount} sessões, máx ${e.maxCarga}kg${e.evolucao !== 0 ? `, evolução de carga: ${e.evolucao > 0 ? '+' : ''}${e.evolucao}%` : ''}`).join('\n') || 'sem dados suficientes'}

Gere uma análise de evolução em 3 partes (sem markdown, sem asteriscos, texto corrido):
1. Tendência geral: o que os dados dizem sobre a consistência e recuperação
2. Ponto forte: o que o atleta está fazendo bem
3. Foco para os próximos 7 dias: uma recomendação específica e acionável

Máximo 100 palavras. Seja direto, use os números reais, fale como um coach experiente.`

    try {
      const res = await fetch('/api/analise-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? 'Análise não disponível.', carregando: false, gerado: true })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar a análise. Tente novamente.', carregando: false, gerado: true })
    }
  }

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const scoreValues = scores.map(s => s.score)
  const temDados = totalTreinos > 0 || scores.some(s => s.score !== null)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
        <div className="mb-8">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
          <h1 className="text-[1.85rem] font-black tracking-tight text-white">Evolução</h1>
          <p className="text-zinc-600 text-[11px] mt-1">Últimos 30 dias</p>
        </div>

        {!temDados ? (
          /* Estado vazio */
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">📈</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Sem dados ainda</p>
              <p className="text-zinc-600 text-sm">Complete seu primeiro treino para ver sua evolução</p>
            </div>
            <button onClick={() => router.push('/treino')} className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">
              Ir para treinos →
            </button>
          </div>
        ) : (
          <>
            {/* ── Stats rápidos ── */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { val: streak, label: 'Streak', sub: 'dias', icon: '🔥', cor: streak >= 7 ? 'text-orange-400' : 'text-white' },
                { val: totalTreinos, label: 'Treinos', sub: '30 dias', icon: '💪', cor: 'text-emerald-400' },
                { val: mediaScore ?? '—', label: 'Recup. média', sub: '/100', icon: '⚡', cor: mediaScore && mediaScore >= 70 ? 'text-emerald-400' : mediaScore ? 'text-yellow-400' : 'text-zinc-500' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-4 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
                  <p className="text-lg mb-1">{s.icon}</p>
                  <p className={`text-2xl font-black tabular-nums ${s.cor}`}>{s.val}</p>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Score de recuperação ── */}
            {scores.some(s => s.score !== null) && (
              <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Score de recuperação</p>
                    <p className="text-zinc-600 text-[10px]">14 dias</p>
                  </div>
                  <div className="flex items-baseline gap-3">
                    {mediaScore && <p className="text-3xl font-black text-emerald-400 tabular-nums">{mediaScore}<span className="text-zinc-600 text-base font-light">/100</span></p>}
                    {melhorScore && <p className="text-zinc-500 text-xs">máx {melhorScore}</p>}
                  </div>
                </div>
                <div className="px-2 pb-2">
                  <Sparkline data={scoreValues} color="#10B981" height={64} />
                </div>
                {/* Labels de data */}
                <div className="flex justify-between px-4 pb-4">
                  <p className="text-zinc-700 text-[9px]">{formatDate(scores[0].data)}</p>
                  <p className="text-zinc-700 text-[9px]">{formatDate(scores[scores.length - 1].data)}</p>
                </div>
              </div>
            )}

            {/* ── Consistência ── */}
            <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Consistência</p>
                  <p className="text-zinc-600 text-[10px]">28 dias</p>
                </div>
                <CalendarioConsistencia treinos={treinos} />
              </div>
            </div>

            {/* ── Frequência semanal ── */}
            {treinos.length > 0 && (() => {
  const hoje = getTodayBR()
  const hojeDate = new Date(hoje + 'T12:00:00-03:00')
  const labels = ['Sem 4', 'Sem 3', 'Sem 2', 'Esta sem']

  // Últimas 4 semanas — domingo a sábado
  const counts = [3, 2, 1, 0].map(weeksAgo => {
    const inicio = new Date(hojeDate)
    inicio.setDate(inicio.getDate() - (weeksAgo * 7) - 6)
    const fim = new Date(hojeDate)
    fim.setDate(fim.getDate() - (weeksAgo * 7))
    return treinos.filter(t => {
      const d = new Date(t.data + 'T12:00:00-03:00')
      return d >= inicio && d <= fim
    }).length
  })
              const maxCount = Math.max(...counts, 1)

              return (
                <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
                  <div className="px-5 pt-5 pb-5">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-5">Treinos por semana</p>
                    <div className="flex items-end gap-3 h-20">
                      {counts.map((count, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <p className="text-white text-xs font-bold">{count}x</p>
                          <div className="w-full rounded-t-lg bg-emerald-500/20 overflow-hidden" style={{ height: 48 }}>
                            <div
                              className="w-full rounded-t-lg bg-emerald-400 transition-all duration-700"
                              style={{ height: `${(count / maxCount) * 100}%`, marginTop: 'auto' }}
                            />
                          </div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider">{labels[i]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Exercícios & Evolução de carga ── */}
            {volumeExercicios.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
                <div className="px-5 pt-5 pb-1">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Evolução por exercício</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {volumeExercicios.map((ex, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="text-emerald-400 text-[10px] font-black">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{ex.nome}</p>
                        <p className="text-zinc-600 text-[11px]">{ex.sessoesCount} sessões{ex.maxCarga > 0 ? ` · máx ${ex.maxCarga}kg` : ''}</p>
                      </div>
                      {ex.evolucao !== 0 && (
                        <div className={`text-xs font-bold shrink-0 ${ex.evolucao > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {ex.evolucao > 0 ? '+' : ''}{ex.evolucao}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Análise IA ── */}
            <div className="rounded-2xl border border-emerald-500/20 mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-emerald-400">✦</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Análise de evolução IA</p>
                  <p className="text-zinc-600 text-[10px]">Powered by Claude</p>
                </div>
                {analise.carregando && (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>

              <div className="px-5 py-4">
                {!analise.gerado && !analise.carregando && (
                  <div className="flex flex-col items-center py-2 gap-3">
                    <p className="text-zinc-500 text-sm text-center">A IA vai analisar sua evolução dos últimos 30 dias e dar insights personalizados.</p>
                    <button
                      onClick={gerarAnaliseIA}
                      disabled={!temDados}
                      className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-emerald-500/20 transition-all disabled:opacity-30"
                    >
                      ✦ Analisar minha evolução
                    </button>
                  </div>
                )}
                {analise.carregando && (
                  <div className="space-y-2 py-2">
                    {[1, 0.85, 0.65].map((w, i) => (
                      <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />
                    ))}
                  </div>
                )}
                {analise.gerado && !analise.carregando && (
                  <div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto}</p>
                    <button
                      onClick={gerarAnaliseIA}
                      className="mt-4 text-[10px] text-zinc-600 underline underline-offset-4 hover:text-zinc-400 transition-all"
                    >
                      Gerar nova análise
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Histórico recente ── */}
            {treinos.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                <div className="px-5 pt-5 pb-1">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Histórico recente</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[...treinos].reverse().slice(0, 8).map((t, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                        t.plano === 'A' ? 'bg-emerald-500/10 text-emerald-400' :
                        t.plano === 'B' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-orange-500/10 text-orange-400'
                      }`}>
                        {t.plano}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{t.nome}</p>
                        <p className="text-zinc-600 text-[11px]">{formatDate(t.data)}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <span className={`text-lg transition-all duration-200 ${item.id === 'evolucao' ? 'opacity-100' : 'opacity-20'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${item.id === 'evolucao' ? 'text-white' : 'text-zinc-700'}`}>
                {item.label}
              </span>
              {item.id === 'evolucao' && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}