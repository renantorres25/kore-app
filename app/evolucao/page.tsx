'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

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

function formatDateFull(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

type ScoreDia = { data: string; score: number | null }

type AtividadeDia = {
  data: string
  tipo: 'musculacao' | 'corrida' | 'bike' | 'natacao' | 'crossfit' | 'outro'
  nome: string
  detalhe: string
  calorias: number | null
}

type VolumeExercicio = { nome: string; sessoesCount: number; maxCarga: number; evolucao: number }

const MOD_CONFIG: Record<string, { icon: string; cor: string; corText: string; corBorder: string; hex: string; calHex: string }> = {
  musculacao: { icon: '🏋️', cor: 'bg-emerald-500/10', corText: 'text-emerald-400', corBorder: 'border-emerald-500/20', hex: '#10B981', calHex: '#10B981' },
  corrida:    { icon: '🏃', cor: 'bg-blue-500/10',    corText: 'text-blue-400',    corBorder: 'border-blue-500/20',    hex: '#3B82F6', calHex: '#3B82F6' },
  bike:       { icon: '🚴', cor: 'bg-orange-500/10',  corText: 'text-orange-400',  corBorder: 'border-orange-500/20',  hex: '#F97316', calHex: '#F97316' },
  natacao:    { icon: '🏊', cor: 'bg-cyan-500/10',    corText: 'text-cyan-400',    corBorder: 'border-cyan-500/20',    hex: '#06B6D4', calHex: '#06B6D4' },
  crossfit:   { icon: '⚡', cor: 'bg-yellow-500/10',  corText: 'text-yellow-400',  corBorder: 'border-yellow-500/20',  hex: '#EAB308', calHex: '#EAB308' },
  outro:      { icon: '🎯', cor: 'bg-purple-500/10',  corText: 'text-purple-400',  corBorder: 'border-purple-500/20',  hex: '#A855F7', calHex: '#A855F7' },
}

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
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {(() => {
        const last = valid[valid.length - 1]
        const x = (last.i / (data.length - 1)) * width
        const y = height - ((last.v! - min) / range) * (height - 8) - 4
        return <circle cx={x} cy={y} r="4" fill={color} />
      })()}
    </svg>
  )
}

// ─── CALENDÁRIO COM CORES POR MODALIDADE ─────────────────────────────────────

function CalendarioConsistencia({ atividades, onSelecionarDia }: {
  atividades: AtividadeDia[]
  onSelecionarDia: (data: string | null) => void
}) {
  const hoje = getTodayBR()
  const dias = getLastNDays(28)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  // Agrupa atividades por data
  const atividadesPorDia = atividades.reduce((acc, a) => {
    if (!acc[a.data]) acc[a.data] = []
    acc[a.data].push(a)
    return acc
  }, {} as Record<string, AtividadeDia[]>)

  const primeiroDia = new Date(dias[0] + 'T12:00:00')
  const diaDaSemana = primeiroDia.getDay()
  const diasPadded = [...Array(diaDaSemana).fill(null), ...dias]
  const semanas: (string | null)[][] = []
  for (let i = 0; i < diasPadded.length; i += 7) semanas.push(diasPadded.slice(i, i + 7))

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  function handleClick(dia: string) {
    const novo = dia === diaSelecionado ? null : dia
    setDiaSelecionado(novo)
    onSelecionarDia(novo)
  }

  // Pega cores únicas das atividades de um dia (máx 3)
  function getCoresDia(dia: string): string[] {
    const ativs = atividadesPorDia[dia] ?? []
    const tipos = [...new Set(ativs.map(a => a.tipo))]
    return tipos.slice(0, 3).map(t => MOD_CONFIG[t]?.calHex ?? '#10B981')
  }

  return (
    <div>
      {/* Legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4">
        {Object.entries(MOD_CONFIG).map(([tipo, cfg]) => (
          <div key={tipo} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.calHex, opacity: 0.8 }} />
            <span className="text-zinc-600 text-[9px] uppercase tracking-wider">{
              tipo === 'musculacao' ? 'Musculação' :
              tipo === 'corrida' ? 'Corrida' :
              tipo === 'bike' ? 'Bike' :
              tipo === 'natacao' ? 'Natação' :
              tipo === 'crossfit' ? 'Crossfit' : 'Outro'
            }</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {diasSemana.map(d => (
          <div key={d} className="text-center">
            <span className="text-zinc-700 text-[8px] uppercase tracking-wider">{d}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7 gap-1">
            {semana.map((dia, di) => {
              if (!dia) return <div key={di} style={{ height: 32 }} />
              const ativsDia = atividadesPorDia[dia] ?? []
              const cores = getCoresDia(dia)
              const isHoje = dia === hoje
              const isSelecionado = dia === diaSelecionado
              const temAtividade = ativsDia.length > 0

              return (
                <button
                  key={dia}
                  onClick={() => handleClick(dia)}
                  title={formatDate(dia)}
                  style={{ height: 32 }}
                  className={`rounded-lg transition-all active:scale-90 overflow-hidden relative ${
                    isSelecionado ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-[#0f0f0f]' : ''
                  } ${
                    isHoje && !temAtividade ? 'ring-1 ring-white/30' : ''
                  } ${
                    !temAtividade ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  {temAtividade && cores.length === 1 && (
                    <div className="absolute inset-0 rounded-lg opacity-80" style={{ background: cores[0] }} />
                  )}
                  {temAtividade && cores.length === 2 && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden flex">
                      <div className="flex-1 opacity-80" style={{ background: cores[0] }} />
                      <div className="flex-1 opacity-80" style={{ background: cores[1] }} />
                    </div>
                  )}
                  {temAtividade && cores.length >= 3 && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden flex flex-col">
                      <div className="flex-1 opacity-80" style={{ background: cores[0] }} />
                      <div className="flex-1 opacity-80" style={{ background: cores[1] }} />
                      <div className="flex-1 opacity-80" style={{ background: cores[2] }} />
                    </div>
                  )}
                  {/* Indicador de mais atividades */}
                  {ativsDia.length > 3 && (
                    <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/60" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/[0.04] border border-white/[0.08]" />
          <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Descanso</span>
        </div>
        {diaSelecionado && (
          <span className="text-zinc-600 text-[9px] uppercase tracking-wider ml-auto">Toque para fechar</span>
        )}
      </div>
    </div>
  )
}

export default function Evolucao() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [scores, setScores] = useState<ScoreDia[]>([])
  const [atividades, setAtividades] = useState<AtividadeDia[]>([])
  const [volumeExercicios, setVolumeExercicios] = useState<VolumeExercicio[]>([])
  const [streak, setStreak] = useState(0)
  const [totalAtividades, setTotalAtividades] = useState(0)
  const [totalCalorias, setTotalCalorias] = useState(0)
  const [analise, setAnalise] = useState({ texto: '', carregando: false, gerado: false })
  const [mediaScore, setMediaScore] = useState<number | null>(null)
  const [melhorScore, setMelhorScore] = useState<number | null>(null)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const hoje = getTodayBR()
    const dias30 = getLastNDays(30)
    const dataInicio = dias30[0]

    const [{ data: sonoData }, { data: treinosData }, { data: atividadesData }, { data: treinosIds }] = await Promise.all([
      supabase.from('sono').select('data, score_recuperacao').eq('usuario_id', session.user.id).gte('data', dataInicio).order('data'),
      supabase.from('treinos').select('id, data, plano, nome, calorias_estimadas').eq('cliente_id', session.user.id).eq('concluido', true).gte('data', dataInicio).order('data', { ascending: false }),
      supabase.from('atividades_livres').select('data, modalidade, duracao_min, distancia_km, distancia_m, calorias_estimadas, calorias_wearable').eq('usuario_id', session.user.id).gte('data', dataInicio).order('data', { ascending: false }),
      supabase.from('treinos').select('id, nome, plano').eq('cliente_id', session.user.id).eq('concluido', true),
    ])

    const scoreMap = new Map(sonoData?.map(s => [s.data, s.score_recuperacao]) ?? [])
    const dias14 = getLastNDays(14)
    const scoresArray: ScoreDia[] = dias14.map(d => ({ data: d, score: scoreMap.get(d) ?? null }))
    setScores(scoresArray)

    const validos = scoresArray.filter(s => s.score !== null).map(s => s.score!)
    if (validos.length) {
      setMediaScore(Math.round(validos.reduce((a, b) => a + b, 0) / validos.length))
      setMelhorScore(Math.max(...validos))
    }

    const lista: AtividadeDia[] = []
    treinosData?.forEach((t: any) => {
      lista.push({ data: t.data, tipo: 'musculacao', nome: t.nome ?? `Treino ${t.plano}`, detalhe: `Plano ${t.plano}`, calorias: t.calorias_estimadas ?? null })
    })
    atividadesData?.forEach((a: any) => {
      const modLabel: Record<string, string> = { corrida: 'Corrida', bike: 'Bike', natacao: 'Natação', crossfit: 'Crossfit', outro: 'Atividade' }
      let detalhe = `${a.duracao_min}min`
      if (a.distancia_km) detalhe += ` · ${a.distancia_km}km`
      if (a.distancia_m) detalhe += ` · ${a.distancia_m}m`
      lista.push({ data: a.data, tipo: a.modalidade, nome: modLabel[a.modalidade] ?? 'Atividade', detalhe, calorias: a.calorias_wearable ?? a.calorias_estimadas ?? null })
    })

    lista.sort((a, b) => b.data.localeCompare(a.data))
    setAtividades(lista)
    setTotalAtividades(lista.length)
    setTotalCalorias(lista.reduce((acc, a) => acc + (a.calorias ?? 0), 0))

    const ativoSet = new Set(lista.map(a => a.data))
    let s = 0
    const cursor = new Date(hoje + 'T12:00:00-03:00')
    while (true) {
      const d = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      if (ativoSet.has(d)) { s++; cursor.setDate(cursor.getDate() - 1) } else break
    }
    setStreak(s)

    let seriesData: any[] = []
    if (treinosIds?.length) {
      const ids = treinosIds.map((t: any) => t.id)
      const { data: series } = await supabase.from('series_registradas').select('treino_id, carga, repeticoes, exercicios_treino(nome)').in('treino_id', ids)
      if (series) seriesData = series
    }

    const exMap = new Map<string, { cargaMax: number; sessoes: Set<string>; cargas: number[] }>()
    seriesData.forEach((serie: any) => {
      const nome = serie.exercicios_treino?.nome ?? 'Desconhecido'
      if (!exMap.has(nome)) exMap.set(nome, { cargaMax: 0, sessoes: new Set(), cargas: [] })
      const ex = exMap.get(nome)!
      if (serie.carga) { ex.cargaMax = Math.max(ex.cargaMax, serie.carga); ex.cargas.push(serie.carga) }
      ex.sessoes.add(serie.treino_id)
    })

    setVolumeExercicios(
      Array.from(exMap.entries()).filter(([, v]) => v.sessoes.size > 0).map(([nome, v]) => {
        const cargas = v.cargas
        const evolucao = cargas.length >= 2 ? Math.round(((cargas[cargas.length - 1] - cargas[0]) / cargas[0]) * 100) : 0
        return { nome, sessoesCount: v.sessoes.size, maxCarga: v.cargaMax, evolucao }
      }).sort((a, b) => b.sessoesCount - a.sessoesCount).slice(0, 6)
    )

    setCarregando(false)
  }

  async function gerarAnaliseIA() {
    setAnalise({ texto: '', carregando: true, gerado: false })
    const scoresValidos = scores.filter(s => s.score !== null)
    const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7)
    const atividadesSemana = atividades.filter(a => new Date(a.data + 'T12:00:00') >= semanaAtras)
    const resumoAtividades = atividades.slice(0, 10).map(a => `${a.nome} (${formatDate(a.data)})${a.calorias ? ` ~${a.calorias}kcal` : ''}`).join(', ')

    const prompt = `Coach de IA do KORE. Analise a evolução deste atleta com dados reais.

ÚLTIMOS 30 DIAS:
- Total de atividades: ${totalAtividades}
- Atividades na última semana: ${atividadesSemana.length}
- Total calorias estimadas: ~${totalCalorias}kcal
- Streak atual: ${streak} dias
- Score médio de recuperação: ${mediaScore ?? 'sem dados'}/100
- Melhor score: ${melhorScore ?? 'sem dados'}/100
- Scores 14 dias: ${scoresValidos.map(s => `${formatDate(s.data)}: ${s.score}`).join(', ') || 'sem dados'}

ATIVIDADES RECENTES: ${resumoAtividades || 'sem dados'}

MUSCULAÇÃO:
${volumeExercicios.map(e => `${e.nome}: ${e.sessoesCount}x, máx ${e.maxCarga}kg${e.evolucao !== 0 ? ` (${e.evolucao > 0 ? '+' : ''}${e.evolucao}%)` : ''}`).join(', ') || 'sem dados'}

Análise em 3 partes (máx 100 palavras, sem markdown): Consistência e tendência, Ponto mais forte, Foco para os próximos 7 dias com ação concreta`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? '', carregando: false, gerado: true })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar a análise.', carregando: false, gerado: true })
    }
  }

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const scoreValues = scores.map(s => s.score)
  const temDados = totalAtividades > 0 || scores.some(s => s.score !== null)
  const atividadesPorData = atividades.slice(0, 20).reduce((acc, a) => {
    if (!acc[a.data]) acc[a.data] = []
    acc[a.data].push(a)
    return acc
  }, {} as Record<string, AtividadeDia[]>)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        <div className="mb-8">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
          <h1 className="text-[1.85rem] font-black tracking-tight text-white">Evolução</h1>
          <p className="text-zinc-600 text-[11px] mt-1">Últimos 30 dias</p>
        </div>

        {!temDados ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">📈</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Sem dados ainda</p>
              <p className="text-zinc-600 text-sm">Registre sua primeira atividade para ver sua evolução</p>
            </div>
            <button onClick={() => router.push('/treino')} className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">Ir para treinos →</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { val: streak, label: 'Streak', cor: streak >= 7 ? 'text-orange-400' : 'text-white' },
                { val: totalAtividades, label: 'Atividades', cor: 'text-emerald-400' },
                { val: mediaScore ?? '—', label: 'Recup.', cor: mediaScore && mediaScore >= 70 ? 'text-emerald-400' : mediaScore ? 'text-yellow-400' : 'text-zinc-500' },
                { val: totalCalorias > 0 ? `${Math.round(totalCalorias/1000)}k` : '—', label: 'kcal', cor: 'text-orange-400' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-3 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
                  <p className={`text-xl font-black tabular-nums ${s.cor}`}>{s.val}</p>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

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
                <div className="flex justify-between px-4 pb-4">
                  <p className="text-zinc-700 text-[9px]">{formatDate(scores[0].data)}</p>
                  <p className="text-zinc-700 text-[9px]">{formatDate(scores[scores.length - 1].data)}</p>
                </div>
              </div>
            )}

            {/* CALENDÁRIO COLORIDO */}
            <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
              <div className="px-5 pt-5 pb-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Consistência</p>
                  <p className="text-zinc-600 text-[10px]">28 dias · toque para detalhes</p>
                </div>
                <CalendarioConsistencia atividades={atividades} onSelecionarDia={setDiaSelecionado} />
              </div>

              {diaSelecionado && (() => {
                const atividadesDia = atividades.filter(a => a.data === diaSelecionado)
                const scoreDia = scores.find(s => s.data === diaSelecionado)
                return (
                  <div className="border-t border-white/[0.06] px-5 py-4">
                    <p className="text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-3">
                      {formatDateFull(diaSelecionado)}
                    </p>
                    {atividadesDia.length === 0 && !scoreDia?.score ? (
                      <p className="text-zinc-600 text-sm">Dia de descanso 💤</p>
                    ) : (
                      <div className="space-y-2">
                        {scoreDia?.score && (
                          <div className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-sm">⚡</div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-semibold">Recuperação</p>
                              <p className="text-zinc-600 text-[11px]">Score do dia</p>
                            </div>
                            <p className={`text-sm font-bold ${scoreDia.score >= 70 ? 'text-emerald-400' : scoreDia.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {scoreDia.score}/100
                            </p>
                          </div>
                        )}
                        {atividadesDia.map((a, i) => {
                          const cfg = MOD_CONFIG[a.tipo] ?? MOD_CONFIG['outro']
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl ${cfg.cor} border ${cfg.corBorder} flex items-center justify-center shrink-0 text-base`}>
                                {cfg.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold">{a.nome}</p>
                                <p className="text-zinc-600 text-[11px]">{a.detalhe}</p>
                              </div>
                              {a.calorias && <p className="text-orange-400 text-xs font-bold shrink-0">~{a.calorias} kcal</p>}
                            </div>
                          )
                        })}
                        {atividadesDia.length === 0 && <p className="text-zinc-600 text-sm">Nenhuma atividade registrada</p>}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {atividades.length > 0 && (() => {
              const hoje = getTodayBR()
              const hojeDate = new Date(hoje + 'T12:00:00-03:00')
              const labels = ['Sem 4', 'Sem 3', 'Sem 2', 'Esta sem']
              const counts = [3, 2, 1, 0].map(weeksAgo => {
                const inicio = new Date(hojeDate); inicio.setDate(inicio.getDate() - (weeksAgo * 7) - 6)
                const fim = new Date(hojeDate); fim.setDate(fim.getDate() - (weeksAgo * 7))
                return atividades.filter(a => { const d = new Date(a.data + 'T12:00:00-03:00'); return d >= inicio && d <= fim }).length
              })
              const maxCount = Math.max(...counts, 1)
              return (
                <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
                  <div className="px-5 pt-5 pb-5">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-5">Atividades por semana</p>
                    <div className="flex items-end gap-3 h-20">
                      {counts.map((count, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <p className="text-white text-xs font-bold">{count}x</p>
                          <div className="w-full rounded-t-lg bg-emerald-500/20 overflow-hidden" style={{ height: 48 }}>
                            <div className="w-full rounded-t-lg bg-emerald-400 transition-all duration-700" style={{ height: `${(count / maxCount) * 100}%`, marginTop: 'auto' }} />
                          </div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider">{labels[i]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {volumeExercicios.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
                <div className="px-5 pt-5 pb-1">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Evolução — Musculação</p>
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
                        <div className={`text-xs font-bold shrink-0 px-2 py-1 rounded-lg ${ex.evolucao > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                          {ex.evolucao > 0 ? '+' : ''}{ex.evolucao}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-500/20 mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-emerald-400">✦</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Análise de evolução IA</p>
                  <p className="text-zinc-600 text-[10px]">Todos os esportes · Powered by Claude</p>
                </div>
                {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
              </div>
              <div className="px-5 py-4">
                {!analise.gerado && !analise.carregando && (
                  <div className="flex flex-col gap-3">
                    <p className="text-zinc-500 text-sm">A IA analisa todas suas atividades junto com recuperação e consistência.</p>
                    <button onClick={gerarAnaliseIA} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-emerald-500/20 transition-all">✦ Analisar minha evolução</button>
                  </div>
                )}
                {analise.carregando && <div className="space-y-2">{[1, 0.85, 0.65].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}</div>}
                {analise.gerado && !analise.carregando && (
                  <div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto}</p>
                    <button onClick={gerarAnaliseIA} className="mt-4 text-[10px] text-zinc-600 underline underline-offset-4 hover:text-zinc-400 transition-all">Nova análise</button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.04]">
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Histórico de atividades</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {Object.entries(atividadesPorData).map(([data, ativsDia]) => (
                  <div key={data}>
                    <div className="px-5 pt-3 pb-1">
                      <p className="text-zinc-600 text-[10px] uppercase tracking-wider font-semibold">{formatDateFull(data)}</p>
                    </div>
                    {ativsDia.map((a, i) => {
                      const cfg = MOD_CONFIG[a.tipo] ?? MOD_CONFIG['outro']
                      return (
                        <div key={i} className="flex items-center gap-3 px-5 py-3">
                          <div className={`w-9 h-9 rounded-xl ${cfg.cor} border ${cfg.corBorder} flex items-center justify-center shrink-0 text-lg`}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold">{a.nome}</p>
                            <p className="text-zinc-600 text-[11px]">{a.detalhe}</p>
                          </div>
                          {a.calorias && (
                            <div className="text-right shrink-0">
                              <p className="text-orange-400 text-xs font-bold">~{a.calorias}</p>
                              <p className="text-zinc-700 text-[9px]">kcal</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {[
            { id: 'home',     icon: '⬜', label: 'Início',   path: '/dashboard' },
            { id: 'treino',   icon: '◈',  label: 'Treino',   path: '/treino'    },
            { id: 'nutri',    icon: '◇',  label: 'Nutrição', path: '/nutricao'  },
            { id: 'evolucao', icon: '△',  label: 'Evolução', path: '/evolucao'  },
            { id: 'perfil',   icon: '◉',  label: 'Perfil',   path: '/perfil'    },
          ].map((item) => (
            <button key={item.id} onClick={() => item.path && router.push(item.path)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90">
              <span className={`text-lg transition-all duration-200 ${item.id === 'evolucao' ? 'opacity-100' : 'opacity-20'}`}>{item.icon}</span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${item.id === 'evolucao' ? 'text-white' : 'text-zinc-700'}`}>{item.label}</span>
              {item.id === 'evolucao' && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}