'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

/* ─────────────────────────────────────────────────────────
   DESIGN SYSTEM · ENERGETIC PRECISION
   ───────────────────────────────────────────────────────── */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}

const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

const glassSubtle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
}

const dataNum = (color = C.t1): React.CSSProperties => ({ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', color })

const labelUpper: React.CSSProperties = {
  fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.t3,
}

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c(); window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

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
type MedidaCP = {
  data: string
  peso: number | null; gordura_pct: number | null; massa_muscular: number | null
  cintura: number | null; quadril: number | null; abdomen: number | null
  braco_dir: number | null; coxa_dir: number | null; panturrilha_dir: number | null
  altura: number | null; imc_calculado: number | null
}
type PlanoNutriHist = { calorias_meta: number; proteina_meta: number; created_at: string; observacoes: string | null }

// modalidade → cor semântica do design system
const MOD_CONFIG: Record<string, { label: string; hex: string }> = {
  musculacao: { label: 'Musculação', hex: C.good },
  corrida:    { label: 'Corrida',    hex: C.sleep },
  bike:       { label: 'Bike',       hex: C.energy2 },
  natacao:    { label: 'Natação',    hex: '#22D3EE' },
  crossfit:   { label: 'Crossfit',   hex: C.warn },
  outro:      { label: 'Outro',      hex: C.recovery },
}

/* ─── ÍCONE DOT POR MODALIDADE ─────────────────────────────── */
function ModDot({ tipo, size = 36 }: { tipo: string; size?: number }) {
  const cfg = MOD_CONFIG[tipo] ?? MOD_CONFIG['outro']
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
      background: `${cfg.hex}1A`, border: `1px solid ${cfg.hex}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: size * 0.28, height: size * 0.28, borderRadius: '50%', background: cfg.hex }} />
    </div>
  )
}

/* ─── SPARKLINE / GRÁFICO DE ÁREA ──────────────────────────── */
function Sparkline({ data, color, height = 60, showEndDots = true }: { data: (number | null)[]; color: string; height?: number; showEndDots?: boolean }) {
  const width = 320
  const valid = data.map((v, i) => ({ v, i })).filter(x => x.v !== null)
  if (valid.length < 2) return null
  const min = Math.min(...valid.map(x => x.v!))
  const max = Math.max(...valid.map(x => x.v!))
  const range = max - min || 1
  const uid = Math.random().toString(36).slice(2, 8)
  const xy = (i: number, v: number) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 12) - 6
    return [x, y] as const
  }
  const pts = valid.map(({ v, i }) => xy(i, v!))
  const pathD = pts.reduce((acc, [cx, cy], i) => {
    if (i === 0) return `M ${cx},${cy}`
    const [px, py] = pts[i - 1]
    const cpx = (px + cx) / 2
    return `${acc} C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`
  }, '')
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`
  const first = pts[0]
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#g-${uid})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {showEndDots && <>
        <circle cx={first[0]} cy={first[1]} r="3.2" fill={color} opacity="0.55" />
        <circle cx={last[0]} cy={last[1]} r="4.5" fill={color} />
        <circle cx={last[0]} cy={last[1]} r="8" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
      </>}
    </svg>
  )
}

/* ─── CALENDÁRIO COM CORES POR MODALIDADE ──────────────────── */
function CalendarioConsistencia({ atividades, onSelecionarDia }: {
  atividades: AtividadeDia[]
  onSelecionarDia: (data: string | null) => void
}) {
  const hoje = getTodayBR()
  const dias = getLastNDays(28)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)

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

  function getCoresDia(dia: string): string[] {
    const ativs = atividadesPorDia[dia] ?? []
    const tipos = [...new Set(ativs.map(a => a.tipo))]
    return tipos.slice(0, 3).map(t => MOD_CONFIG[t]?.hex ?? C.good)
  }

  return (
    <div>
      {/* Legenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 16 }}>
        {Object.entries(MOD_CONFIG).map(([tipo, cfg]) => (
          <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 3, background: cfg.hex }} />
            <span style={{ ...labelUpper }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 5 }}>
        {diasSemana.map(d => (
          <div key={d} style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, opacity: 0.7 }}>{d}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {semanas.map((semana, si) => (
          <div key={si} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {semana.map((dia, di) => {
              if (!dia) return <div key={di} style={{ height: 34 }} />
              const ativsDia = atividadesPorDia[dia] ?? []
              const cores = getCoresDia(dia)
              const isHoje = dia === hoje
              const isSelecionado = dia === diaSelecionado
              const temAtividade = ativsDia.length > 0
              const isHover = hover === dia

              return (
                <button
                  key={dia}
                  onClick={() => handleClick(dia)}
                  onMouseEnter={() => setHover(dia)}
                  onMouseLeave={() => setHover(null)}
                  title={`${formatDate(dia)}${temAtividade ? ` · ${ativsDia.length} atividade(s)` : ' · descanso'}`}
                  style={{
                    height: 34, borderRadius: 9, position: 'relative', overflow: 'hidden', cursor: 'pointer',
                    padding: 0, transition: 'transform .12s ease',
                    transform: isHover ? 'scale(1.08)' : 'scale(1)',
                    background: temAtividade ? 'transparent' : 'rgba(255,255,255,0.05)',
                    border: isSelecionado ? '2px solid rgba(255,255,255,0.7)'
                      : isHoje ? `1px solid ${C.energy}80`
                      : temAtividade ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {temAtividade && cores.length === 1 && (
                    <div style={{ position: 'absolute', inset: 0, background: cores[0], opacity: 0.85 }} />
                  )}
                  {temAtividade && cores.length === 2 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      <div style={{ flex: 1, background: cores[0], opacity: 0.85 }} />
                      <div style={{ flex: 1, background: cores[1], opacity: 0.85 }} />
                    </div>
                  )}
                  {temAtividade && cores.length >= 3 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, background: cores[0], opacity: 0.85 }} />
                      <div style={{ flex: 1, background: cores[1], opacity: 0.85 }} />
                      <div style={{ flex: 1, background: cores[2], opacity: 0.85 }} />
                    </div>
                  )}
                  {ativsDia.length > 3 && (
                    <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.85)' }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)' }} />
          <span style={{ ...labelUpper }}>Descanso</span>
        </div>
        {diaSelecionado && (
          <span style={{ ...labelUpper, marginLeft: 'auto' }}>Toque para fechar</span>
        )}
      </div>
    </div>
  )
}

export default function Evolucao() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
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
  const [medidasCP, setMedidasCP] = useState<MedidaCP[]>([])
  const [planosNutri, setPlanosNutri] = useState<PlanoNutriHist[]>([])

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const hoje = getTodayBR()
    const dias30 = getLastNDays(30)
    const dataInicio = dias30[0]

    const [{ data: sonoData }, { data: treinosData }, { data: atividadesData }, { data: treinosIds }, { data: medidasData }, { data: planosData }] = await Promise.all([
      supabase.from('sono').select('data, score_recuperacao').eq('usuario_id', session.user.id).gte('data', dataInicio).order('data'),
      supabase.from('treinos').select('id, data, plano, nome, calorias_estimadas').eq('cliente_id', session.user.id).eq('concluido', true).gte('data', dataInicio).order('data', { ascending: false }),
      supabase.from('atividades_livres').select('data, modalidade, duracao_min, distancia_km, distancia_m, calorias_estimadas, calorias_wearable').eq('usuario_id', session.user.id).gte('data', dataInicio).order('data', { ascending: false }),
      supabase.from('treinos').select('id, nome, plano').eq('cliente_id', session.user.id).eq('concluido', true),
      supabase.from('evolucao_medidas').select('data,peso,gordura_pct,massa_muscular,cintura,quadril,abdomen,braco_dir,coxa_dir,panturrilha_dir,altura,imc_calculado').eq('cliente_id', session.user.id).order('data'),
      supabase.from('planos_nutricionais').select('calorias_meta, proteina_meta, created_at, observacoes').eq('cliente_id', session.user.id).order('created_at'),
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

    if (medidasData?.length) setMedidasCP(medidasData as MedidaCP[])
    if (planosData?.length) setPlanosNutri(planosData as PlanoNutriHist[])

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
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_BODY }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: `2.5px solid ${C.energy}30`, borderTopColor: C.energy,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  const scoreValues = scores.map(s => s.score)
  const temDados = totalAtividades > 0 || scores.some(s => s.score !== null)
  const atividadesPorData = atividades.slice(0, 20).reduce((acc, a) => {
    if (!acc[a.data]) acc[a.data] = []
    acc[a.data].push(a)
    return acc
  }, {} as Record<string, AtividadeDia[]>)

  // ── STAT TILES ──
  const stats = [
    { val: streak, label: 'Streak', cor: C.energy, sub: 'dias' },
    { val: totalAtividades, label: 'Atividades', cor: C.good, sub: '30 dias' },
    { val: mediaScore ?? '—', label: 'Recuperação', cor: C.sleep, sub: 'score méd' },
    { val: totalCalorias > 0 ? `${Math.round(totalCalorias / 1000)}k` : '—', label: 'kcal', cor: C.energy2, sub: 'total' },
  ]

  const sectionTitle = (txt: string, right?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t2, margin: 0 }}>{txt}</p>
      {right}
    </div>
  )

  // ── BLOCOS REUTILIZÁVEIS ──

  const StatTiles = (
    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 12 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          ...glass,
          padding: '20px 18px',
          border: `1px solid ${s.cor}33`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${s.cor}0d, inset 0 1px 0 rgba(255,255,255,0.10)`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.cor, marginBottom: 12, boxShadow: `0 0 10px ${s.cor}` }} />
          <p style={{ ...dataNum(s.cor), fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1, margin: 0 }}>{s.val}</p>
          <p style={{ ...labelUpper, marginTop: 10, marginBottom: 0, color: C.t2 }}>{s.label}</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3, margin: '3px 0 0' }}>{s.sub}</p>
        </div>
      ))}
    </div>
  )

  const ScoreCard = scores.some(s => s.score !== null) ? (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px 8px' }}>
        {sectionTitle('Score de recuperação', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>14 dias</span>)}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          {mediaScore != null && (
            <p style={{ ...dataNum(C.good), fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 800, lineHeight: 1, margin: 0 }}>
              {mediaScore}<span style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 300, color: C.t3 }}>/100</span>
            </p>
          )}
          {melhorScore != null && <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t2, margin: 0 }}>máx {melhorScore}</p>}
        </div>
      </div>
      <div style={{ padding: '8px 4px 0' }}>
        <Sparkline data={scoreValues} color={C.good} height={70} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 18px 18px' }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{formatDate(scores[0].data)}</p>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{formatDate(scores[scores.length - 1].data)}</p>
      </div>
    </div>
  ) : null

  const ConsistenciaCard = (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px' }}>
        {sectionTitle('Consistência', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>28 dias</span>)}
        <CalendarioConsistencia atividades={atividades} onSelecionarDia={setDiaSelecionado} />
      </div>

      {diaSelecionado && (() => {
        const atividadesDia = atividades.filter(a => a.data === diaSelecionado)
        const scoreDia = scores.find(s => s.data === diaSelecionado)
        return (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', padding: '16px 22px' }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.t2, margin: '0 0 12px', fontWeight: 600 }}>
              {formatDateFull(diaSelecionado)}
            </p>
            {atividadesDia.length === 0 && !scoreDia?.score ? (
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, margin: 0 }}>Dia de descanso</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scoreDia?.score && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.good}1A`, border: `1px solid ${C.good}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.good }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>Recuperação</p>
                      <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, margin: 0 }}>Score do dia</p>
                    </div>
                    <p style={{ ...dataNum(scoreDia.score >= 70 ? C.good : scoreDia.score >= 50 ? C.warn : C.danger), fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {scoreDia.score}/100
                    </p>
                  </div>
                )}
                {atividadesDia.map((a, i) => {
                  const cfg = MOD_CONFIG[a.tipo] ?? MOD_CONFIG['outro']
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ModDot tipo={a.tipo} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>{a.nome}</p>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, margin: 0 }}>{a.detalhe}</p>
                      </div>
                      {a.calorias && <p style={{ ...dataNum(C.energy2), fontSize: 12, fontWeight: 700, flexShrink: 0, margin: 0 }}>~{a.calorias} kcal</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )

  const SemanaCard = atividades.length > 0 ? (() => {
    const hoje = getTodayBR()
    const hojeDate = new Date(hoje + 'T12:00:00-03:00')
    const labels = ['Sem 4', 'Sem 3', 'Sem 2', 'Esta sem']
    const semanaCores = [C.recovery, C.sleep, C.energy2, C.energy]
    const counts = [3, 2, 1, 0].map(weeksAgo => {
      const inicio = new Date(hojeDate); inicio.setDate(inicio.getDate() - (weeksAgo * 7) - 6)
      const fim = new Date(hojeDate); fim.setDate(fim.getDate() - (weeksAgo * 7))
      return atividades.filter(a => { const d = new Date(a.data + 'T12:00:00-03:00'); return d >= inicio && d <= fim }).length
    })
    const maxCount = Math.max(...counts, 1)
    return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Atividades por semana')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {counts.map((count, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...labelUpper, width: 52, flexShrink: 0 }}>{labels[i]}</span>
                <div style={{ flex: 1, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? 14 : 0,
                    borderRadius: 8, background: `linear-gradient(90deg, ${semanaCores[i]}cc, ${semanaCores[i]})`,
                    transition: 'width .7s cubic-bezier(.16,1,.3,1)',
                  }} />
                </div>
                <span style={{ ...dataNum(semanaCores[i]), fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, width: 32, textAlign: 'right', flexShrink: 0 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  })() : null

  const MusculacaoCard = volumeExercicios.length > 0 ? (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px 4px' }}>
        {sectionTitle('Evolução · Musculação')}
      </div>
      <div>
        {volumeExercicios.map((ex, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.good}14`, border: `1px solid ${C.good}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ ...dataNum(C.good), fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.t1, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.nome}</p>
              <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, margin: 0 }}>{ex.sessoesCount} sessões{ex.maxCarga > 0 ? ` · máx ${ex.maxCarga}kg` : ''}</p>
            </div>
            {ex.evolucao !== 0 && (
              <div style={{
                ...dataNum(ex.evolucao > 0 ? C.good : C.danger), fontSize: 12, fontWeight: 700, flexShrink: 0,
                padding: '4px 9px', borderRadius: 8,
                background: ex.evolucao > 0 ? `${C.good}1A` : `${C.danger}1A`,
              }}>
                {ex.evolucao > 0 ? '+' : ''}{ex.evolucao}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null

  const ComposicaoCard = medidasCP.length >= 2 ? (() => {
    const first = medidasCP[0]
    const last = medidasCP[medidasCP.length - 1]
    const deltaPeso = first.peso != null && last.peso != null ? +(last.peso - first.peso).toFixed(1) : null
    const deltaGordura = first.gordura_pct != null && last.gordura_pct != null ? +(last.gordura_pct - first.gordura_pct).toFixed(1) : null
    const deltaMuscular = first.massa_muscular != null && last.massa_muscular != null ? +(last.massa_muscular - first.massa_muscular).toFixed(1) : null
    const rows = [
      { label: 'Peso', unit: 'kg', values: medidasCP.map(m => m.peso), current: last.peso, delta: deltaPeso, color: C.sleep, inverseBetter: true },
      { label: 'Gordura', unit: '%', values: medidasCP.map(m => m.gordura_pct), current: last.gordura_pct, delta: deltaGordura, color: C.energy2, inverseBetter: true },
      { label: 'Músculo', unit: 'kg', values: medidasCP.map(m => m.massa_muscular), current: last.massa_muscular, delta: deltaMuscular, color: C.good, inverseBetter: false },
    ]
    return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Composição corporal', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>{medidasCP.length} medições</span>)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {rows.map(row => {
              if (row.current == null) return null
              const isBetter = row.delta !== null ? (row.inverseBetter ? row.delta < 0 : row.delta > 0) : false
              const isWorse = row.delta !== null ? (row.inverseBetter ? row.delta > 0 : row.delta < 0) : false
              const deltaColor = row.delta === null ? C.t3 : isBetter ? C.good : isWorse ? C.energy : C.t2
              return (
                <div key={row.label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, color: C.t2, margin: 0 }}>{row.label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <p style={{ ...dataNum(C.t1), fontSize: 14, fontWeight: 700, margin: 0 }}>{row.current}{row.unit}</p>
                      {row.delta !== null && (
                        <p style={{ ...dataNum(deltaColor), fontSize: 11, fontWeight: 600, margin: 0 }}>{row.delta > 0 ? '+' : ''}{row.delta}{row.unit}</p>
                      )}
                    </div>
                  </div>
                  <Sparkline data={row.values} color={row.color} height={48} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{formatDate(medidasCP[0].data)}</p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{formatDate(medidasCP[medidasCP.length - 1].data)}</p>
          </div>
        </div>
      </div>
    )
  })() : null

  const CircunferenciasCard = medidasCP.length >= 1 ? (() => {
    const last = medidasCP[medidasCP.length - 1]
    const first = medidasCP[0]
    const circ = [
      { label: 'Cintura', key: 'cintura' as const, cor: C.recovery, unit: 'cm', inv: true },
      { label: 'Quadril', key: 'quadril' as const, cor: C.sleep, unit: 'cm', inv: false },
      { label: 'Abdômen', key: 'abdomen' as const, cor: C.energy2, unit: 'cm', inv: true },
      { label: 'Braço', key: 'braco_dir' as const, cor: C.good, unit: 'cm', inv: false },
      { label: 'Coxa', key: 'coxa_dir' as const, cor: C.danger, unit: 'cm', inv: false },
      { label: 'Panturrilha', key: 'panturrilha_dir' as const, cor: C.warn, unit: 'cm', inv: false },
    ].filter(c => last[c.key] != null)
    if (!circ.length) return null
    const imc = last.imc_calculado ?? (last.peso && last.altura ? Math.round(last.peso / Math.pow(last.altura / 100, 2) * 10) / 10 : null)
    return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Circunferências', imc ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...labelUpper }}>IMC</span>
              <span style={{ ...dataNum(imc < 18.5 ? C.sleep : imc < 25 ? C.good : imc < 30 ? C.warn : C.danger), fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800 }}>{imc}</span>
            </div>
          ) : undefined)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {circ.map(c => {
              const cur = last[c.key] as number
              const ini = first[c.key] as number | null
              const delta = ini ? Math.round((cur - ini) * 10) / 10 : null
              const melhor = delta !== null && (c.inv ? delta < 0 : delta > 0)
              return (
                <div key={c.label} style={{ ...glassSubtle, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.cor }} />
                    <p style={{ ...labelUpper, margin: 0 }}>{c.label}</p>
                  </div>
                  <p style={{ ...dataNum(C.t1), fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, margin: 0 }}>{cur} <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 400, color: C.t3 }}>{c.unit}</span></p>
                  {delta !== null && delta !== 0 && (
                    <p style={{ ...dataNum(melhor ? C.good : C.energy), fontSize: 10, fontWeight: 600, margin: '2px 0 0' }}>{delta > 0 ? '+' : ''}{delta}</p>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{formatDate(medidasCP[0].data)}</p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>último: {formatDate(last.data)}</p>
          </div>
        </div>
      </div>
    )
  })() : null

  const NutriCard = planosNutri.length >= 1 ? (() => {
    const current = planosNutri[planosNutri.length - 1]
    const first = planosNutri[0]
    const deltaKcal = current.calorias_meta - first.calorias_meta
    const W = 300
    const H = 86
    const minK = Math.min(...planosNutri.map(p => p.calorias_meta)) - 150
    const maxK = Math.max(...planosNutri.map(p => p.calorias_meta)) + 150
    const range = maxK - minK
    const pts = planosNutri.map((p, i) => ({
      x: planosNutri.length === 1 ? W / 2 : (i / (planosNutri.length - 1)) * W,
      y: H - ((p.calorias_meta - minK) / range) * (H - 24) - 12,
      kcal: p.calorias_meta,
    }))
    const lineD = pts.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x},${pt.y}`
      const prev = pts[i - 1]
      const cpx = (prev.x + pt.x) / 2
      return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`
    }, '')
    const areaD = `${lineD} L ${W},${H} L 0,${H} Z`
    return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Histórico calórico', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>{planosNutri.length} plano{planosNutri.length !== 1 ? 's' : ''}</span>)}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={{ ...dataNum(C.energy2), fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, lineHeight: 1, margin: 0 }}>
              {current.calorias_meta.toLocaleString('pt-BR')}<span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.t3 }}> kcal</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t2, margin: 0 }}>{current.proteina_meta}g prot</p>
              {planosNutri.length > 1 && (
                <span style={{ ...dataNum(deltaKcal < 0 ? C.good : deltaKcal > 0 ? C.energy2 : C.t2), fontSize: 11, fontWeight: 600 }}>
                  · {deltaKcal > 0 ? '+' : ''}{deltaKcal} kcal
                </span>
              )}
            </div>
          </div>
          {planosNutri.length > 1 && (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-kcalhist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.energy2} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={C.energy2} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill="url(#grad-kcalhist)" />
                <path d={lineD} fill="none" stroke={C.energy2} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map(({ x, y, kcal }, i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill={C.energy2} />
                    <text x={x} y={y - 11} textAnchor="middle" fill={C.t3} fontSize="9" fontFamily={FONT_MONO}>{kcal.toLocaleString('pt-BR')}</text>
                  </g>
                ))}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{new Date(planosNutri[0].created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</p>
                <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>{new Date(current.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</p>
              </div>
            </>
          )}
          {current.observacoes && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, marginTop: 12, lineHeight: 1.6, fontStyle: 'italic' }}>{current.observacoes}</p>
          )}
        </div>
      </div>
    )
  })() : null

  const IACard = (
    <div style={{ ...glass, overflow: 'hidden', border: `1px solid ${C.energy}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: `${C.energy}1A`, border: `1px solid ${C.energy}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill={C.energy} />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.energy, margin: 0 }}>Análise de evolução IA</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3, margin: 0 }}>Todos os esportes · Powered by Claude</p>
        </div>
        {analise.carregando && (
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.energy}33`, borderTopColor: C.energy, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        )}
      </div>
      <div style={{ padding: '16px 22px' }}>
        {!analise.gerado && !analise.carregando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t2, margin: 0, lineHeight: 1.55 }}>A IA analisa todas suas atividades junto com recuperação e consistência.</p>
            <button onClick={gerarAnaliseIA} style={{
              width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
              color: C.energy, background: `${C.energy}1A`, border: `1px solid ${C.energy}4D`,
              transition: 'background .15s ease',
            }}>Analisar minha evolução</button>
          </div>
        )}
        {analise.carregando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 0.85, 0.65].map((w, i) => (
              <div key={i} style={{ height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.09)', width: `${w * 100}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}
        {analise.gerado && !analise.carregando && (
          <div>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.t1, margin: 0, lineHeight: 1.7 }}>{analise.texto}</p>
            <button onClick={gerarAnaliseIA} style={{
              marginTop: 16, fontFamily: FONT_MONO, fontSize: 10, color: C.t3, background: 'none', border: 'none',
              textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer',
            }}>Nova análise</button>
          </div>
        )}
      </div>
    </div>
  )

  const HistoricoCard = (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t2, margin: 0 }}>Histórico de atividades</p>
      </div>
      <div>
        {Object.entries(atividadesPorData).map(([data, ativsDia]) => (
          <div key={data}>
            <div style={{ padding: '12px 22px 4px' }}>
              <p style={{ ...labelUpper, fontWeight: 600, margin: 0 }}>{formatDateFull(data)}</p>
            </div>
            {ativsDia.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px' }}>
                <ModDot tipo={a.tipo} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>{a.nome}</p>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, margin: 0 }}>{a.detalhe}</p>
                </div>
                {a.calorias && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ ...dataNum(C.energy2), fontSize: 13, fontWeight: 700, margin: 0 }}>~{a.calorias}</p>
                    <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: 0 }}>kcal</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY, paddingLeft: isDesktop ? 220 : 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{
        maxWidth: isDesktop ? 1100 : 480, margin: '0 auto',
        padding: isDesktop ? '48px 32px 48px' : '0 16px 112px',
        paddingTop: isDesktop ? 48 : 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))',
      }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.energy, margin: '0 0 4px' }}>KORE</p>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isDesktop ? 36 : 30, fontWeight: 800, letterSpacing: '-0.02em', color: C.t1, margin: 0 }}>Evolução</h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t3, margin: '6px 0 0' }}>Últimos 30 dias</p>
        </div>

        {!temDados ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 22, ...glassSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l5-6 4 4 6-8" stroke={C.energy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 7v4h-4" stroke={C.energy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.t1, margin: '0 0 4px' }}>Sem dados ainda</p>
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, margin: 0 }}>Registre sua primeira atividade para ver sua evolução</p>
            </div>
            <button onClick={() => router.push('/treino')} style={{
              marginTop: 8, padding: '12px 24px', borderRadius: 12, cursor: 'pointer',
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: '#0c0d10',
              background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, border: 'none',
            }}>Ir para treinos →</button>
          </div>
        ) : isDesktop ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Stat tiles full width no topo */}
            {StatTiles}
            {/* Grid 2 colunas abaixo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {ScoreCard}
                {ConsistenciaCard}
                {MusculacaoCard}
                {ComposicaoCard}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {SemanaCard}
                {CircunferenciasCard}
                {NutriCard}
                {IACard}
              </div>
            </div>
            {HistoricoCard}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {StatTiles}
            {ScoreCard}
            {ConsistenciaCard}
            {SemanaCard}
            {MusculacaoCard}
            {ComposicaoCard}
            {CircunferenciasCard}
            {NutriCard}
            {IACard}
            {HistoricoCard}
          </div>
        )}
      </div>

      <NavBar tipo="cliente" ativa="evolucao" />
    </main>
  )
}
