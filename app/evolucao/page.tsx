'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Sparkles, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SidebarProfissional from '../components/SidebarProfissional'
import { calcularPMC, calcularFcmaxEstimado, traduzirPMC, type AtividadePMC, type PontoPMC } from '../lib/alertas-cientificos'
import {
  calcularIdade, getSunday, calcularPace, formatPaceValue, linhaTendencia, calcularZonaFC, interpretarPaceZona,
  calcularSessoesPace, calcularVolumeSemanal, calcularPaceZonaFCResumo, calcularEficienciaCardiaca,
  VOL_LABELS, VOL_SEM_DISTANCIA, MOD_LABELS_PACE, ZONAS_ORDEM, ZONA_LABELS,
  type SessaoPace, type SemanaVolume,
} from '../lib/performance-evolucao'

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

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
  padding: '6px 12px', color: '#ffffff', fontSize: 12, fontFamily: FONT_BODY, outline: 'none', colorScheme: 'dark', cursor: 'pointer',
}

const optionStyle: React.CSSProperties = {
  background: '#1a1a2e', color: '#ffffff',
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

function calcularMelhorStreak(diasAtivos: Set<string>, dias: string[]): number {
  let melhor = 0, atual = 0
  for (const d of dias) {
    if (diasAtivos.has(d)) { atual++; melhor = Math.max(melhor, atual) } else atual = 0
  }
  return melhor
}

type AtividadeDia = { data: string; tipo: string }

type AtividadeRaw = {
  data: string; modalidade: string
  duracao_min: number | null; distancia_km: number | null; distancia_m: number | null
  fc_media: number | null; fc_max: number | null
  calorias_estimadas: number | null; calorias_wearable: number | null
}

type MedidaCP = {
  data: string
  peso: number | null; gordura_pct: number | null; massa_muscular: number | null
  cintura: number | null; quadril: number | null; abdomen: number | null
  braco_dir: number | null; coxa_dir: number | null; panturrilha_dir: number | null
  altura: number | null; imc_calculado: number | null
}

// modalidade → cor semântica do design system (calendário)
const MOD_CONFIG: Record<string, { label: string; hex: string }> = {
  musculacao: { label: 'Musculação', hex: C.good },
  corrida:    { label: 'Corrida',    hex: C.sleep },
  bike:       { label: 'Bike',       hex: C.energy2 },
  natacao:    { label: 'Natação',    hex: '#22D3EE' },
  crossfit:   { label: 'Crossfit',   hex: C.warn },
  outro:      { label: 'Outro',      hex: C.recovery },
}

// cores para o gráfico de volume semanal (item 3)
const VOL_COLORS: Record<string, string> = { corrida: C.energy, bike: C.sleep, natacao: '#22D3EE', musculacao: C.recovery, crossfit: C.warn, outro: C.t2 }
const VOL_EMOJI: Record<string, string> = { musculacao: '🏋️', crossfit: '🔥' }
const ZONA_CORES: Record<string, string> = {
  Z1: C.t3, Z2: C.good, Z3: C.warn, Z4: C.energy2, Z5: C.danger,
}
const ZONA_CONFIG: Record<string, { label: string; cor: string }> = Object.fromEntries(
  ZONAS_ORDEM.map(z => [z, { label: ZONA_LABELS[z], cor: ZONA_CORES[z] }])
)

/* ─── SPARKLINE / GRÁFICO DE ÁREA ──────────────────────────── */
function Sparkline({ data, color, height = 60, showEndDots = true, domain }: {
  data: (number | null)[]; color: string; height?: number; showEndDots?: boolean
  domain?: [number, number]
}) {
  const width = 320
  const valid = data.map((v, i) => ({ v, i })).filter(x => x.v !== null)
  if (valid.length < 2) return null
  const rawMin = Math.min(...valid.map(x => x.v!))
  const rawMax = Math.max(...valid.map(x => x.v!))
  const min = domain ? domain[0] : rawMin
  const max = domain ? domain[1] : rawMax
  const range = max - min || 1
  const uid = Math.random().toString(36).slice(2, 8)
  const padY = 10
  const xy = (i: number, v: number) => {
    const x = (i / (data.length - 1)) * width
    const y = height - padY - ((v - min) / range) * (height - 2 * padY)
    return [x, Math.max(padY, Math.min(height - padY, y))] as const
  }
  const pts = valid.map(({ v, i }) => xy(i, v!))
  const pathD = pts.reduce((acc, [cx, cy], i) => {
    if (i === 0) return `M ${cx},${cy}`
    const [px, py] = pts[i - 1]
    const cpx = (px + cx) / 2
    return `${acc} C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`
  }, '')
  const first = pts[0]
  const last = pts[pts.length - 1]
  const areaD = `${pathD} L ${last[0]},${height} L ${first[0]},${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block', overflow: 'visible' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#g-${uid})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {showEndDots && <>
        <circle cx={first[0]} cy={first[1]} r="3" fill={color} opacity="0.5" />
        <circle cx={last[0]} cy={last[1]} r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color}99)` }} />
        <circle cx={last[0]} cy={last[1]} r="8" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
      </>}
    </svg>
  )
}

/* ─── LINHA COM TENDÊNCIA (pace / FC) ──────────────────────── */
function LineChartTrend({ pontos, color, formatValue, trendColor = C.t3 }: {
  pontos: { data: string; valor: number; extra?: string }[]; color: string; formatValue: (v: number) => string; trendColor?: string
}) {
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const W = 320, H = 110, padY = 14
  const valores = pontos.map(p => p.valor)
  const tendencia = linhaTendencia(valores)
  const all = [...valores, ...tendencia]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const range = (max - min) || 1
  const xy = (i: number, v: number) => {
    const x = pontos.length === 1 ? W / 2 : (i / (pontos.length - 1)) * W
    const y = H - padY - ((v - min) / range) * (H - 2 * padY)
    return [x, y] as const
  }
  const pathFrom = (vals: number[]) => vals.map((v, i) => xy(i, v)).reduce((acc, [x, y], i) => i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`, '')
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
        <path d={pathFrom(tendencia)} fill="none" stroke={trendColor} strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={pathFrom(valores)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {valores.map((v, i) => {
          const [x, y] = xy(i, v)
          const sel = selIdx === i
          return (
            <circle key={i} cx={x} cy={y} r={sel ? 5.5 : 3} fill={color}
              stroke={sel ? '#fff' : 'none'} strokeWidth={sel ? 1.5 : 0}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelIdx(sel ? null : i)} />
          )
        })}
      </svg>
      {selIdx != null && (
        <div style={{ ...glassSubtle, padding: '6px 10px', marginTop: 6 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t1 }}>
            {formatDateFull(pontos[selIdx].data)} · <span style={{ ...dataNum(color), fontWeight: 700 }}>{formatValue(valores[selIdx])}</span>
            {pontos[selIdx].extra && <> · {pontos[selIdx].extra}</>}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3 }}>{formatValue(valores[0])}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3 }}>{formatValue(valores[valores.length - 1])}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: C.t3 }}>{formatDate(pontos[0].data)}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: C.t3 }}>{formatDate(pontos[pontos.length - 1].data)}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        <Legenda cor={color} label="Real" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="9" height="2" viewBox="0 0 9 2"><line x1="0" y1="1" x2="9" y2="1" stroke={trendColor} strokeWidth="2" strokeDasharray="2 1.5" /></svg>
          <span style={labelUpper}>Tendência</span>
        </div>
      </div>
    </div>
  )
}

/* ─── LEGENDA SIMPLES ───────────────────────────────────────── */
function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 9, height: 2, borderRadius: 1, background: cor }} />
      <span style={labelUpper}>{label}</span>
    </div>
  )
}

/* ─── PMC: CTL/ATL/TSB ──────────────────────────────────────── */
function areaPath(pts: readonly (readonly [number, number])[], baseline: number): string {
  if (!pts.length) return ''
  const d = pts.map(([x, y], i) => i === 0 ? `M ${x},${y}` : `L ${x},${y}`).join(' ')
  return `${d} L ${pts[pts.length - 1][0]},${baseline} L ${pts[0][0]},${baseline} Z`
}

function PMCChart({ pontos }: { pontos: PontoPMC[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const W = 320, H = 140, padY = 10
  const allVals = pontos.flatMap(p => [p.ctl, p.atl, p.tsb])
  const min = Math.min(...allVals, 0)
  const max = Math.max(...allVals, 1)
  const range = (max - min) || 1
  const xy = (i: number, v: number) => {
    const x = pontos.length === 1 ? W / 2 : (i / (pontos.length - 1)) * W
    const y = H - padY - ((v - min) / range) * (H - 2 * padY)
    return [x, y] as const
  }
  const zeroY = H - padY - ((0 - min) / range) * (H - 2 * padY)
  const pathFrom = (key: 'ctl' | 'atl' | 'tsb') => pontos.map((p, i) => xy(i, p[key])).reduce((acc, [x, y], i) => i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`, '')
  const tsbPosPts = pontos.map((p, i) => xy(i, Math.max(0, p.tsb)))
  const tsbNegPts = pontos.map((p, i) => xy(i, Math.min(0, p.tsb)))

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const idx = Math.round(relX * (pontos.length - 1))
    setHoverIdx(Math.max(0, Math.min(pontos.length - 1, idx)))
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', cursor: 'crosshair' }} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <path d={areaPath(tsbPosPts, zeroY)} fill={C.good} opacity={0.15} />
        <path d={areaPath(tsbNegPts, zeroY)} fill={C.danger} opacity={0.15} />
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 3" />
        <path d={pathFrom('ctl')} fill="none" stroke={C.good} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFrom('atl')} fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFrom('tsb')} fill="none" stroke={C.sleep} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {hoverIdx != null && (() => {
          const [x] = xy(hoverIdx, pontos[hoverIdx].tsb)
          return <line x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        })()}
      </svg>
      {hoverIdx != null && (
        <div style={{ ...glassSubtle, position: 'absolute', top: 4, left: 4, right: 4, padding: '8px 10px' }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.t3, margin: '0 0 2px' }}>{formatDateFull(pontos[hoverIdx].data)}</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t1, margin: 0, lineHeight: 1.4 }}>
            {traduzirPMC(pontos[hoverIdx].tsb, pontos[hoverIdx].ctl, pontos[hoverIdx].atl)}
          </p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <Legenda cor={C.good} label="Fitness" />
        <Legenda cor={C.danger} label="Fadiga" />
        <Legenda cor={C.sleep} label="Forma" />
      </div>
    </div>
  )
}

/* ─── COMPOSIÇÃO: GRÁFICO COMBINADO NORMALIZADO ────────────── */
function ComposicaoChart({ tiles }: { tiles: { values: (number | null)[]; color: string }[] }) {
  const W = 320, H = 90, padY = 8
  function normPath(values: (number | null)[], color: string, key: number) {
    const valid = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v != null)
    if (valid.length < 2) return null
    const min = Math.min(...valid.map(x => x.v))
    const max = Math.max(...valid.map(x => x.v))
    const range = (max - min) || 1
    const pts = valid.map(({ v, i }) => {
      const x = (i / (values.length - 1)) * W
      const y = H - padY - ((v - min) / range) * (H - 2 * padY)
      return [x, y] as const
    })
    const d = pts.reduce((acc, [x, y], i) => i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`, '')
    return <path key={key} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', marginTop: 4, marginBottom: 8 }} preserveAspectRatio="none">
      {tiles.map((t, i) => normPath(t.values, t.color, i))}
    </svg>
  )
}

/* ─── CIRCUNFERÊNCIAS (accordion dentro de Composição) ─────── */
function CircunferenciasInner({ medidasCP }: { medidasCP: MedidaCP[] }) {
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

  if (!circ.length) return <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t3, margin: 0 }}>Sem medidas de circunferência registradas</p>

  const imc = last.imc_calculado ?? (last.peso && last.altura ? Math.round(last.peso / Math.pow(last.altura / 100, 2) * 10) / 10 : null)

  return (
    <div>
      {imc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={labelUpper}>IMC</span>
          <span style={{ ...dataNum(imc < 18.5 ? C.sleep : imc < 25 ? C.good : imc < 30 ? C.warn : C.danger), fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800 }}>{imc}</span>
        </div>
      )}
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
    </div>
  )
}

// ─── SEÇÃO MINHA META ──────────────────────────────────────────────────────
function SecaoMinhaMeta({ perfilMeta, pesoAtual, onSalvar }: {
  perfilMeta: { meta_peso: number | null; meta_data_limite: string | null; peso: number | null; objetivo: string | null }
  pesoAtual: number | null
  onSalvar: (metaPeso: number, metaData: string | null) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [formPeso, setFormPeso] = useState('')
  const [formData, setFormData] = useState('')
  const [salvando, setSalvando] = useState(false)

  const metaPeso = perfilMeta.meta_peso
  const objetivoLower = (perfilMeta.objetivo ?? '').toLowerCase()
  const goalIsGain = objetivoLower.includes('hiper') || objetivoLower.includes('ganh') || objetivoLower.includes('mass')
  const metaSugerida = !metaPeso && pesoAtual
    ? (goalIsGain ? Math.round(pesoAtual * 1.08) : Math.round(pesoAtual * 0.91))
    : null
  const metaEfetiva = metaPeso ?? metaSugerida
  const ehSugestao = !metaPeso && !!metaSugerida
  const perder = metaEfetiva != null && pesoAtual != null ? pesoAtual > metaEfetiva : !goalIsGain

  const pesoBase = perfilMeta.peso ?? pesoAtual

  function progressoPct(): number {
    if (ehSugestao || !metaEfetiva || pesoBase == null || pesoAtual == null) return 0
    const total = Math.abs(metaEfetiva - pesoBase)
    if (total === 0) return 100
    if (perder ? pesoAtual > pesoBase : pesoAtual < pesoBase) return 0
    const feito = Math.abs(pesoAtual - pesoBase)
    return Math.min(100, Math.max(0, Math.round((feito / total) * 100)))
  }
  const pct = progressoPct()

  const faltam = metaEfetiva != null && pesoAtual != null
    ? Math.round(Math.abs(pesoAtual - metaEfetiva) * 10) / 10
    : null
  const atingiu = faltam !== null && faltam < 0.5

  const deltaSugestao = metaSugerida != null && pesoAtual != null ? Math.abs(pesoAtual - metaSugerida) : null
  const semanasEstimadas = deltaSugestao != null && deltaSugestao > 0 ? Math.max(1, Math.round(deltaSugestao / 0.5)) : null

  function abrirEdicao() {
    setFormPeso(metaEfetiva != null ? String(metaEfetiva) : '')
    setFormData(perfilMeta.meta_data_limite ?? '')
    setEditando(true)
  }

  async function handleConfirmar() {
    if (metaSugerida == null) return
    setSalvando(true)
    await onSalvar(metaSugerida, null)
    setSalvando(false)
  }

  async function handleSalvarForm() {
    const mp = parseFloat(formPeso)
    if (!mp || mp <= 0) return
    setSalvando(true)
    await onSalvar(mp, formData || null)
    setSalvando(false)
    setEditando(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12, padding: '12px', color: C.t1, fontSize: 14, outline: 'none', fontFamily: FONT_BODY, colorScheme: 'dark',
  }
  const primaryBtn: React.CSSProperties = {
    flex: 1, background: C.energy, color: '#1a0a00', fontWeight: 700, padding: '12px', borderRadius: 12,
    fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: FONT_BODY,
  }
  const secondaryBtn: React.CSSProperties = {
    padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: C.t2,
    fontSize: 14, background: 'none', cursor: 'pointer', fontFamily: FONT_BODY,
  }

  const Circ = 2 * Math.PI * 28

  return (
    <div style={{ ...glass, padding: 20, marginBottom: 20 }}>
      <p style={{ ...labelUpper, margin: '0 0 14px' }}>Minha Meta</p>

      {editando ? (
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ color: C.t3, fontSize: 10, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Peso desejado (kg)</label>
              <input type="number" step="0.5" placeholder="Ex: 64" value={formPeso}
                onChange={e => setFormPeso(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ color: C.t3, fontSize: 10, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data-limite (opcional)</label>
              <input type="date" value={formData}
                onChange={e => setFormData(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSalvarForm} disabled={salvando} style={primaryBtn}>Salvar</button>
            <button onClick={() => setEditando(false)} style={secondaryBtn}>Cancelar</button>
          </div>
        </div>
      ) : !metaEfetiva ? (
        <div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t2, margin: '0 0 14px' }}>
            Você ainda não definiu uma meta de peso. Defina uma para acompanhar seu progresso.
          </p>
          <button onClick={abrirEdicao} style={{
            padding: '12px 20px', borderRadius: 12, cursor: 'pointer', border: 'none',
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: '#1a0a00',
            background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
          }}>Definir minha meta</button>
        </div>
      ) : ehSugestao ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ ...dataNum(C.t1), fontWeight: 700, fontSize: 20 }}>{pesoAtual} kg</span>
            <span style={{ color: C.t3, fontSize: 16 }}>→</span>
            <span style={{ ...dataNum(C.energy), fontWeight: 700, fontSize: 20 }}>{metaSugerida} kg</span>
            {semanasEstimadas != null && (
              <span style={{ fontSize: 11, color: C.t3, fontFamily: FONT_BODY, marginLeft: 4 }}>~{semanasEstimadas} semanas (ritmo de 0,5kg/sem)</span>
            )}
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t3, margin: '0 0 14px' }}>
            Esta meta foi sugerida pela IA com base no seu objetivo. Confirme para começar a acompanhar seu progresso.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleConfirmar} disabled={salvando} style={{
              padding: '12px 20px', borderRadius: 12, cursor: 'pointer', border: 'none',
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: '#1a0a00',
              background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
            }}>Confirmar esta meta</button>
            <button onClick={abrirEdicao} style={secondaryBtn}>Quero uma meta diferente</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              {!atingiu && (
                <circle cx="32" cy="32" r="28" fill="none" stroke={C.energy} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * Circ} ${Circ}`}
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              )}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {atingiu ? <Check size={22} style={{ color: C.good }} /> : <span style={{ ...dataNum(C.t1), fontWeight: 800, fontSize: 15 }}>{pct}%</span>}
            </div>
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            {atingiu ? (
              <p style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: C.good, margin: 0 }}>Meta atingida! 🎉</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ ...dataNum(C.t1), fontWeight: 700, fontSize: 18 }}>{pesoAtual != null ? `${pesoAtual} kg` : '—'}</span>
                <span style={{ color: C.t3, fontSize: 14 }}>→</span>
                <span style={{ ...dataNum(C.energy), fontWeight: 700, fontSize: 18 }}>{metaEfetiva} kg</span>
              </div>
            )}
            {!atingiu && (
              <p style={{ ...labelUpper, margin: 0 }}>Faltam {faltam} kg · {pct}% concluído</p>
            )}
            {perfilMeta.meta_data_limite && (
              <p style={{ fontSize: 11, color: C.t3, fontFamily: FONT_BODY, margin: '4px 0 0' }}>Prazo: {formatDateFull(perfilMeta.meta_data_limite)}</p>
            )}
          </div>

          <button onClick={abrirEdicao} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
            background: 'none', color: C.t2, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, flexShrink: 0,
          }}>Editar meta</button>
        </div>
      )}
    </div>
  )
}

export default function Evolucao() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [carregando, setCarregando] = useState(true)
  const [atividades, setAtividades] = useState<AtividadeDia[]>([])
  const [atividadesRaw, setAtividadesRaw] = useState<AtividadeRaw[]>([])
  const [streak, setStreak] = useState(0)
  const [melhorStreak, setMelhorStreak] = useState(0)
  const [semanasVolume, setSemanasVolume] = useState<SemanaVolume[]>([])
  const [sessoesPace, setSessoesPace] = useState<SessaoPace[]>([])
  const [pmcPontos, setPmcPontos] = useState<PontoPMC[]>([])
  const [volumeExercicios, setVolumeExercicios] = useState<{ nome: string; sessoesCount: number; maxCarga: number; evolucao: number }[]>([])
  const [musculacaoSessoes30d, setMusculacaoSessoes30d] = useState(0)
  const [medidasCP, setMedidasCP] = useState<MedidaCP[]>([])
  const [temNutricionista, setTemNutricionista] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [perfilMeta, setPerfilMeta] = useState<{ meta_peso: number | null; meta_data_limite: string | null; peso: number | null; objetivo: string | null }>({
    meta_peso: null, meta_data_limite: null, peso: null, objetivo: null,
  })
  const [temDados, setTemDados] = useState(false)

  const [selModalidade, setSelModalidade] = useState<string>('corrida')
  const [selZona, setSelZona] = useState<string>('Z2')
  const [semanaExpandida, setSemanaExpandida] = useState<number | null>(null)
  const [circAberto, setCircAberto] = useState(false)
  const [iaAberta, setIaAberta] = useState(false)
  const [analise, setAnalise] = useState({ texto: '', carregando: false, gerado: false })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const hoje = getTodayBR()
    const dias90 = getLastNDays(90)
    const dataInicio = dias90[0]
    const dataInicio30 = getLastNDays(30)[0]

    setUserId(session.user.id)

    const [
      { data: treinosData },
      { data: atividadesData },
      { data: treinosIds },
      { data: medidasData },
      { data: perfilData },
      { data: vinculosData },
    ] = await Promise.all([
      supabase.from('treinos').select('id, data, plano, nome, calorias_estimadas').eq('cliente_id', session.user.id).eq('concluido', true).gte('data', dataInicio).order('data', { ascending: false }),
      supabase.from('atividades_livres').select('data, modalidade, duracao_min, distancia_km, distancia_m, fc_media, fc_max, calorias_estimadas, calorias_wearable').eq('usuario_id', session.user.id).gte('data', dataInicio).order('data', { ascending: false }),
      supabase.from('treinos').select('id, nome, plano').eq('cliente_id', session.user.id).eq('concluido', true),
      supabase.from('evolucao_medidas').select('data,peso,gordura_pct,massa_muscular,cintura,quadril,abdomen,braco_dir,coxa_dir,panturrilha_dir,altura,imc_calculado').eq('cliente_id', session.user.id).order('data'),
      supabase.from('perfis').select('meta_peso, meta_data_limite, peso, objetivo, fcmax, data_nascimento').eq('id', session.user.id).single(),
      supabase.from('vinculos').select('tipo').eq('cliente_id', session.user.id).eq('ativo', true).eq('tipo', 'nutricionista'),
    ])

    if (perfilData) setPerfilMeta({
      meta_peso: perfilData.meta_peso ?? null,
      meta_data_limite: perfilData.meta_data_limite ?? null,
      peso: perfilData.peso ?? null,
      objetivo: perfilData.objetivo ?? null,
    })
    setTemNutricionista(!!vinculosData?.length)

    // ── Lista de atividades (para calendário + streak) ──
    const lista: AtividadeDia[] = []
    treinosData?.forEach((t: any) => { lista.push({ data: t.data, tipo: 'musculacao' }) })
    atividadesData?.forEach((a: any) => { lista.push({ data: a.data, tipo: a.modalidade }) })
    lista.sort((a, b) => b.data.localeCompare(a.data))
    setAtividades(lista)
    setAtividadesRaw((atividadesData ?? []) as AtividadeRaw[])

    setTemDados((atividadesData?.length ?? 0) > 0 || (treinosData?.length ?? 0) > 0 || (medidasData?.length ?? 0) > 0)

    // ── Streak atual + melhor streak (90 dias) ──
    const ativoSet = new Set(lista.map(a => a.data))
    let s = 0
    const cursor = new Date(hoje + 'T12:00:00-03:00')
    while (true) {
      const d = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      if (ativoSet.has(d)) { s++; cursor.setDate(cursor.getDate() - 1) } else break
    }
    setStreak(s)
    setMelhorStreak(Math.max(s, calcularMelhorStreak(ativoSet, dias90)))

    // ── Volume semanal por modalidade (8 semanas) ──
    const semanas = calcularVolumeSemanal((atividadesData ?? []) as any, 8)
    setSemanasVolume(semanas)

    // ── FCmax estimado (perfil + picos registrados) ──
    const atividadesMax = (atividadesData ?? []).map((a: any) => a.fc_max).filter((x: any): x is number => x != null)
    const fcmax = calcularFcmaxEstimado(perfilData?.fcmax ?? null, calcularIdade(perfilData?.data_nascimento ?? null), atividadesMax)

    // ── Pace por zona de FC (TODAS as atividades_livres com pace calculável; zona vem de fc_media / fcmax) ──
    const pace = calcularSessoesPace((atividadesData ?? []) as any, fcmax)
    setSessoesPace(pace)
    const modalidadesDisp = (['corrida', 'bike', 'natacao'] as const).filter(m => pace.some(p => p.modalidade === m))
    if (modalidadesDisp.length) {
      const m0 = modalidadesDisp[0]
      setSelModalidade(m0)
      const contagens: Record<string, number> = {}
      pace.filter(p => p.modalidade === m0 && p.zona).forEach(p => { contagens[p.zona!] = (contagens[p.zona!] ?? 0) + 1 })
      const zonasValidas = ZONAS_ORDEM.filter(z => (contagens[z] ?? 0) >= 3).sort((a, b) => (contagens[b] ?? 0) - (contagens[a] ?? 0))
      if (zonasValidas.length) setSelZona(zonasValidas[0])
    }

    // ── PMC (forma física) ──
    const atividadesPMC: AtividadePMC[] = (atividadesData ?? []).map((a: any) => ({
      data: a.data, modalidade: a.modalidade, duracao_min: a.duracao_min, distancia_km: a.distancia_km, fc_media: a.fc_media,
    }))
    const pmc = calcularPMC(atividadesPMC, fcmax, 90)
    setPmcPontos(pmc.slice(-84))

    // ── Musculação (volume de exercícios + condição de exibição) ──
    setMusculacaoSessoes30d((treinosData ?? []).filter((t: any) => t.data >= dataInicio30).length)

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

    setCarregando(false)
  }

  async function handleSalvarMeta(metaPeso: number, metaData: string | null) {
    if (!userId) return
    await supabase.from('perfis').update({ meta_peso: metaPeso, meta_data_limite: metaData }).eq('id', userId)
    setPerfilMeta(prev => ({ ...prev, meta_peso: metaPeso, meta_data_limite: metaData }))
  }

  async function gerarAnaliseIA() {
    setAnalise({ texto: '', carregando: true, gerado: false })
    const totalAtividades = atividades.length
    const resumoAtividades = atividades.slice(0, 10).map(a => `${MOD_CONFIG[a.tipo]?.label ?? a.tipo} (${formatDate(a.data)})`).join(', ')

    // Pace por zona de FC — todas as modalidades/zonas com dados suficientes
    const paceZonaLinhas = calcularPaceZonaFCResumo(sessoesPace).map(r => {
      const grandeza = r.modalidade === 'bike' ? 'Velocidade média' : 'Pace médio'
      return `- ${MOD_LABELS_PACE[r.modalidade]} ${r.zona}: ${grandeza} ${r.valorFormatado} ${r.unidade} (últimas ${r.count} atividades) — ${r.interpretacao}`
    })

    // Volume semanal multi-modalidade (últimas 8 semanas)
    const volumeSemanalLinhas = semanasVolume.map(sem => {
      const partes: string[] = []
      VOL_MODALIDADES_KM.forEach(mod => {
        const km = sem.porModalidade[mod]?.km ?? 0
        if (km > 0) partes.push(`${VOL_LABELS[mod].toLowerCase()} ${km.toFixed(1)}km`)
      })
      VOL_MODALIDADES_TEMPO.forEach(mod => {
        const sessoes = sem.porModalidade[mod]?.sessoes ?? 0
        if (sessoes > 0) partes.push(`${VOL_LABELS[mod].toLowerCase()} ${sessoes} ${sessoes === 1 ? 'sessão' : 'sessões'}`)
      })
      return `- Semana de ${formatDate(sem.inicio)}: ${partes.join(', ') || 'sem atividades'}`
    })

    // Eficiência cardíaca (FC recente vs 4 semanas atrás)
    const eficienciaCardiacaLinha = fcTendencia
      ? `FC recente ${fcTendencia.recente}bpm vs 4 semanas atrás ${fcTendencia.anterior}bpm — ${fcTrendMsg}`
      : 'sem dados suficientes'

    // PMC completo (amostragem semanal das últimas 12 semanas)
    const pmcSemanal: PontoPMC[] = []
    for (let i = pmcPontos.length - 1; i >= 0; i -= 7) pmcSemanal.unshift(pmcPontos[i])
    const pmcLinhas = pmcSemanal.map(p => `- ${formatDate(p.data)}: Fitness(CTL)=${Math.round(p.ctl)}, Fadiga(ATL)=${Math.round(p.atl)}, Forma(TSB)=${Math.round(p.tsb)}`)
    const tendenciaCTL = pmcSemanal.length >= 2
      ? (pmcSemanal[pmcSemanal.length - 1].ctl > pmcSemanal[0].ctl + 2 ? 'subindo' : pmcSemanal[pmcSemanal.length - 1].ctl < pmcSemanal[0].ctl - 2 ? 'caindo' : 'estável')
      : 'sem dados'
    const tsbAtualSinal = pmcPontos.length ? (pmcPontos[pmcPontos.length - 1].tsb >= 0 ? 'positivo' : 'negativo') : 'sem dados'

    const prompt = `Você é um coach de performance especializado em triathlon e endurance. Analise os dados abaixo do atleta e responda em português, de forma direta e personalizada. Use os dados concretos para embasar cada recomendação — não dê conselhos genéricos.

ÚLTIMOS 90 DIAS:
- Total de atividades: ${totalAtividades}
- Streak atual: ${streak} dias · Melhor streak: ${melhorStreak} dias
- Forma física (TSB mais recente): ${pmcPontos.length ? traduzirPMC(pmcPontos[pmcPontos.length - 1].tsb, pmcPontos[pmcPontos.length - 1].ctl, pmcPontos[pmcPontos.length - 1].atl) : 'sem dados'}

ATIVIDADES RECENTES: ${resumoAtividades || 'sem dados'}

MUSCULAÇÃO:
${volumeExercicios.map(e => `${e.nome}: ${e.sessoesCount}x, máx ${e.maxCarga}kg${e.evolucao !== 0 ? ` (${e.evolucao > 0 ? '+' : ''}${e.evolucao}%)` : ''}`).join(', ') || 'sem dados'}

PACE POR ZONA DE FC:
${paceZonaLinhas.length ? paceZonaLinhas.join('\n') : 'sem dados suficientes'}

VOLUME ÚLTIMAS 8 SEMANAS:
${volumeSemanalLinhas.length ? volumeSemanalLinhas.join('\n') : 'sem dados'}

EFICIÊNCIA CARDÍACA: ${eficienciaCardiacaLinha}

HISTÓRICO DE FORMA FÍSICA (últimas 12 semanas):
${pmcLinhas.length ? pmcLinhas.join('\n') : 'sem dados'}
Tendência: CTL ${tendenciaCTL}, TSB atual ${tsbAtualSinal}

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

  const pesoAtualMeta = (() => {
    for (let i = medidasCP.length - 1; i >= 0; i--) {
      if (medidasCP[i].peso != null) return medidasCP[i].peso
    }
    return perfilMeta.peso
  })()

  const sectionTitle = (txt: string, right?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t2, margin: 0 }}>{txt}</p>
      {right}
    </div>
  )

  // ── SEÇÃO 2 · STREAK ──
  const StreakCard = (
    <div style={{ ...glass, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0, animation: streak > 7 ? 'pulseFire 1.6s ease-in-out infinite' : undefined }}>🔥</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...dataNum(C.energy), fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 900 }}>{streak}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t2 }}>dia{streak !== 1 ? 's' : ''} consecutivo{streak !== 1 ? 's' : ''}</span>
        </div>
        <p style={{ ...labelUpper, margin: '2px 0 0' }}>Seu melhor streak: {melhorStreak} dias</p>
      </div>
    </div>
  )

  // ── SEÇÃO 3 · VOLUME SEMANAL POR MODALIDADE ──
  const VOL_MODALIDADES_KM = (Object.keys(VOL_LABELS) as (keyof typeof VOL_LABELS)[]).filter(m => !VOL_SEM_DISTANCIA.has(m))
  const VOL_MODALIDADES_TEMPO = [...VOL_SEM_DISTANCIA] as (keyof typeof VOL_LABELS)[]
  const VolumeSemanalCard = (() => {
    const maxTotal = Math.max(...semanasVolume.map(s => s.total), 1)
    const semDados = semanasVolume.every(s => Object.keys(s.porModalidade).length === 0)
    const modalidadesPresentes = new Set<string>()
    semanasVolume.forEach(sem => Object.entries(sem.porModalidade).forEach(([mod, d]) => { if (d.sessoes > 0) modalidadesPresentes.add(mod) }))
    return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Volume semanal', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>Últimas 8 semanas</span>)}
          {semDados ? (
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Registre corridas, pedaladas, natação, musculação ou outras atividades para ver seu volume semanal</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {semanasVolume.map((sem, i) => {
                  const aberta = semanaExpandida === i
                  const semanaVazia = Object.keys(sem.porModalidade).length === 0
                  return (
                    <div key={i}>
                      <button onClick={() => setSemanaExpandida(aberta ? null : i)} style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ ...labelUpper, width: 48, flexShrink: 0 }}>{formatDate(sem.inicio)}</span>
                        <div style={{ flex: 1, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex' }}>
                          {VOL_MODALIDADES_KM.map(mod => {
                            const km = sem.porModalidade[mod]?.km ?? 0
                            if (km <= 0) return null
                            const pct = (km / maxTotal) * 100
                            return <div key={mod} style={{ width: `${pct}%`, background: VOL_COLORS[mod] }} />
                          })}
                        </div>
                        <span style={{ ...dataNum(C.t1), fontSize: 12, fontWeight: 700, width: 48, textAlign: 'right', flexShrink: 0 }}>{sem.total.toFixed(0)}km</span>
                        {VOL_MODALIDADES_TEMPO.map(mod => {
                          const sessoes = sem.porModalidade[mod]?.sessoes ?? 0
                          if (sessoes <= 0) return null
                          return (
                            <span key={mod} style={{ ...dataNum(VOL_COLORS[mod]), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {VOL_EMOJI[mod]}{sessoes}
                            </span>
                          )
                        })}
                      </button>
                      {aberta && (
                        <div style={{ marginTop: 8, padding: '10px 12px', ...glassSubtle, fontFamily: FONT_BODY, fontSize: 12, color: C.t2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(Object.keys(VOL_LABELS) as (keyof typeof VOL_LABELS)[]).map(mod => {
                            const d = sem.porModalidade[mod]
                            if (!d || d.sessoes <= 0) return null
                            return (
                              <div key={mod} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: VOL_COLORS[mod] }} />
                                {VOL_LABELS[mod]}: {d.sessoes} {d.sessoes === 1 ? 'sessão' : 'sessões'}{VOL_SEM_DISTANCIA.has(mod) ? ` · ${d.min}min` : ` · ${d.km.toFixed(1)}km`}
                              </div>
                            )
                          })}
                          {semanaVazia && <span>Sem atividades nesta semana</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                {(Object.keys(VOL_LABELS) as (keyof typeof VOL_LABELS)[]).filter(mod => modalidadesPresentes.has(mod)).map(mod => (
                  <div key={mod} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 3, background: VOL_COLORS[mod] }} />
                    <span style={labelUpper}>{VOL_LABELS[mod]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  })()

  // ── SEÇÕES 4 & 5 · PACE POR ZONA DE FC E EFICIÊNCIA CARDÍACA (filtro compartilhado) ──
  const modalidadesDisponiveis = (['corrida', 'bike', 'natacao'] as const).filter(m => sessoesPace.some(s => s.modalidade === m))
  const contagensZona: Record<string, number> = {}
  sessoesPace.filter(s => s.modalidade === selModalidade && s.zona).forEach(s => { contagensZona[s.zona!] = (contagensZona[s.zona!] ?? 0) + 1 })
  const zonasDisponiveis = ZONAS_ORDEM.filter(z => (contagensZona[z] ?? 0) >= 3)
  const pontosZona = sessoesPace.filter(s => s.modalidade === selModalidade && s.zona === selZona).slice(-12)
  const unidadePace = selModalidade === 'bike' ? 'km/h' : selModalidade === 'natacao' ? 'min/100m' : 'min/km'
  const corZona = ZONA_CONFIG[selZona]?.cor ?? C.t3
  // corrida/natação: pace menor = melhor → invertido para aparecer mais alto no gráfico
  const valorGrafico = (p: number) => selModalidade === 'bike' ? p : -p
  const formatChartValue = (v: number) => `${formatPaceValue(selModalidade, selModalidade === 'bike' ? v : -v)} ${unidadePace}`

  const FiltroZona = modalidadesDisponiveis.length > 0 && (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <select value={selModalidade} onChange={e => {
        const m = e.target.value
        setSelModalidade(m)
        const contagens: Record<string, number> = {}
        sessoesPace.filter(s => s.modalidade === m && s.zona).forEach(s => { contagens[s.zona!] = (contagens[s.zona!] ?? 0) + 1 })
        const validas = ZONAS_ORDEM.filter(z => (contagens[z] ?? 0) >= 3).sort((a, b) => (contagens[b] ?? 0) - (contagens[a] ?? 0))
        setSelZona(validas[0] ?? 'Z2')
      }} style={selectStyle}>
        {modalidadesDisponiveis.map(m => <option key={m} value={m} style={optionStyle}>{MOD_LABELS_PACE[m]}</option>)}
      </select>
      <select value={selZona} onChange={e => setSelZona(e.target.value)} style={selectStyle}>
        {zonasDisponiveis.map(z => <option key={z} value={z} style={optionStyle}>{ZONA_CONFIG[z].label}</option>)}
      </select>
    </div>
  )

  const PaceCard = (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px' }}>
        {sectionTitle('Pace por zona de FC', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>Últimas 12 ocorrências</span>)}
        {modalidadesDisponiveis.length === 0 || zonasDisponiveis.length === 0 ? (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Seus treinos ainda não têm dados de FC suficientes para esta zona. Continue treinando com seu wearable para ver sua evolução por zona.</p>
        ) : (
          <>
            {FiltroZona}
            {pontosZona.length < 3 ? (
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Registre mais treinos nesta zona para ver sua evolução</p>
            ) : (
              <LineChartTrend
                pontos={pontosZona.map(p => ({ data: p.data, valor: valorGrafico(p.pace), extra: p.fc_media != null ? `${p.fc_media} bpm` : undefined }))}
                color={corZona}
                formatValue={formatChartValue}
              />
            )}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ ...labelUpper, margin: '0 0 8px' }}>{ZONA_CONFIG[selZona]?.label} · últimas {pontosZona.length} atividades</p>
              <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t1, margin: 0, lineHeight: 1.5 }}>
                {interpretarPaceZona(selModalidade, selZona, pontosZona.map(p => p.pace))}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // ── SEÇÃO 5 · EFICIÊNCIA CARDÍACA ──
  const pontosFC = sessoesPace.filter(s => s.modalidade === selModalidade && s.fc_media != null).slice(-12) as (SessaoPace & { fc_media: number })[]
  const temFCDados = atividadesRaw.some(a => a.fc_media != null)

  // FC média últimas 2 semanas vs 2 semanas anteriores (4 semanas atrás)
  const fcTendencia = calcularEficienciaCardiaca(atividadesRaw as any)
  const fcTrendColor = !fcTendencia ? C.t3 : fcTendencia.diff > 5 ? C.energy2 : fcTendencia.diff < -5 ? C.good : C.t3
  const fcTrendMsg = fcTendencia?.mensagem ?? null

  const FCCard = (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px' }}>
        {sectionTitle('Eficiência cardíaca')}
        {!temFCDados ? (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Seus treinos ainda não têm dados de FC — conecte um wearable ou registre manualmente</p>
        ) : (
          <>
            {modalidadesDisponiveis.length === 0 || pontosFC.length < 5 ? (
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Registre mais atividades com frequência cardíaca para ver sua eficiência</p>
            ) : (
              <>
                <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, margin: '0 0 14px', lineHeight: 1.5 }}>FC caindo para o mesmo esforço = você está mais fit</p>
                <LineChartTrend
                  pontos={pontosFC.map(p => ({ data: p.data, valor: p.fc_media }))}
                  color={C.danger}
                  trendColor={fcTrendColor}
                  formatValue={v => `${Math.round(v)} bpm`}
                />
              </>
            )}
            {fcTendencia && fcTrendMsg && (
              <div style={{ ...glassSubtle, padding: '12px 14px', marginTop: 14 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.t1, margin: '0 0 6px', fontWeight: 700 }}>
                  FC mais recente: {fcTendencia.recente}bpm · há 4 semanas: {fcTendencia.anterior}bpm
                </p>
                <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.5 }}>{fcTrendMsg}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  // ── SEÇÃO 6 · FORMA FÍSICA (PMC) ──
  const FormaFisicaCard = (
    <div style={{ ...glass, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px' }}>
        {sectionTitle('Forma física', <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3 }}>Últimas 12 semanas</span>)}
        {pmcPontos.length < 2 ? (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Registre atividades com frequência cardíaca para ver sua forma física ao longo do tempo</p>
        ) : (() => {
          const ultimo = pmcPontos[pmcPontos.length - 1]
          const ctl = Math.round(ultimo.ctl), atl = Math.round(ultimo.atl), tsb = Math.round(ultimo.tsb)
          return (
            <>
              <PMCChart pontos={pmcPontos} />
              <div style={{ ...glassSubtle, padding: '12px 14px', marginTop: 14 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.t1, margin: '0 0 6px', fontWeight: 700 }}>
                  Hoje · Fitness: {ctl} · Fadiga: {atl} · Forma: {tsb}
                </p>
                <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.5 }}>
                  {traduzirPMC(ultimo.tsb, ultimo.ctl, ultimo.atl)}
                </p>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )

  // ── SEÇÃO 7 · COMPOSIÇÃO CORPORAL ──
  const ComposicaoCard = (() => {
    if (medidasCP.length === 0) return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Composição corporal')}
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t3, textAlign: 'center', padding: '24px 0', margin: 0 }}>Peça à sua nutricionista para registrar sua composição corporal</p>
        </div>
      </div>
    )

    const dias180Inicio = getLastNDays(180)[0]
    const recentes = medidasCP.filter(m => m.data >= dias180Inicio)
    const base = recentes.length >= 2 ? recentes : medidasCP
    const last = medidasCP[medidasCP.length - 1]
    const hasGordura = medidasCP.some(m => m.gordura_pct != null)
    const hasMuscular = medidasCP.some(m => m.massa_muscular != null)

    const tiles = [
      { label: 'Peso', unit: 'kg', values: base.map(m => m.peso), current: last.peso, color: C.sleep },
      ...(hasGordura ? [{ label: '% Gordura', unit: '%', values: base.map(m => m.gordura_pct), current: last.gordura_pct, color: C.energy2 }] : []),
      ...(hasMuscular ? [{ label: 'Massa Muscular', unit: 'kg', values: base.map(m => m.massa_muscular), current: last.massa_muscular, color: C.good }] : []),
    ]
    const podeCombinar = base.length >= 2 && tiles.filter(t => t.values.filter(v => v != null).length >= 2).length >= 2

    return (
      <div style={{ ...glass, overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px' }}>
          {sectionTitle('Composição corporal', (
            <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3, textAlign: 'right' }}>
              Atualizado em {formatDate(last.data)}{temNutricionista ? ' · pela nutricionista' : ''}
            </span>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 10 }}>
            {tiles.map(t => (
              <div key={t.label} style={{ ...glassSubtle, padding: '12px 14px' }}>
                <p style={{ ...labelUpper, margin: '0 0 6px' }}>{t.label}</p>
                <p style={{ ...dataNum(C.t1), fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
                  {t.current ?? '—'}{t.current != null && <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 400, color: C.t3 }}> {t.unit}</span>}
                </p>
                {base.length >= 2 && <Sparkline data={t.values} color={t.color} height={36} showEndDots={false} />}
              </div>
            ))}
          </div>
          {podeCombinar && <ComposicaoChart tiles={tiles} />}
          {!hasGordura && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.t3, marginTop: 12, fontStyle: 'italic' }}>Peça à sua nutricionista para registrar sua composição corporal completa</p>
          )}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setCircAberto(!circAberto)} style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.t2, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
          }}>
            Circunferências
            <ChevronDown size={14} style={{ transform: circAberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {circAberto && (
            <div style={{ padding: '0 22px 20px' }}>
              <CircunferenciasInner medidasCP={medidasCP} />
            </div>
          )}
        </div>
      </div>
    )
  })()

  // ── MUSCULAÇÃO (condicional) ──
  const MusculacaoCard = musculacaoSessoes30d > 5 && volumeExercicios.length > 0 ? (
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

  // ── FAB · ANÁLISE IA ──
  const IAPanel = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: `${C.energy}1A`, border: `1px solid ${C.energy}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={14} color={C.energy} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.energy, margin: 0 }}>Análise de evolução IA</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.t3, margin: 0 }}>Todos os esportes · Powered by Claude</p>
        </div>
        {analise.carregando && (
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.energy}33`, borderTopColor: C.energy, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        )}
        <button onClick={() => setIaAberta(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, padding: 4, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ padding: '16px 22px' }}>
        {!analise.gerado && !analise.carregando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.t2, margin: 0, lineHeight: 1.55 }}>A IA analisa todas suas atividades junto com consistência e forma física.</p>
            <button onClick={gerarAnaliseIA} style={{
              width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
              color: C.energy, background: `${C.energy}1A`, border: `1px solid ${C.energy}4D`,
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

  return (
    <main className="md:flex" style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY }}>
      <SidebarProfissional tipo="cliente" />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes pulseFire{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
      `}</style>
      <div style={{
        maxWidth: isDesktop ? 720 : 480, margin: '0 auto',
        padding: isDesktop ? '48px 32px 48px' : '0 16px 112px',
        paddingTop: isDesktop ? 48 : 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))',
      }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.energy, margin: '0 0 4px' }}>KORE</p>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isDesktop ? 36 : 30, fontWeight: 800, letterSpacing: '-0.02em', color: C.t1, margin: 0 }}>Evolução</h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.t3, margin: '6px 0 0' }}>Estou evoluindo?</p>
        </div>

        <SecaoMinhaMeta perfilMeta={perfilMeta} pesoAtual={pesoAtualMeta} onSalvar={handleSalvarMeta} />

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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {StreakCard}
            {VolumeSemanalCard}
            {PaceCard}
            {FCCard}
            {FormaFisicaCard}
            {ComposicaoCard}
            {MusculacaoCard}
          </div>
        )}
      </div>
      </div>

      {/* FAB · ANÁLISE IA */}
      <button onClick={() => setIaAberta(true)} style={{
        position: 'fixed', bottom: isDesktop ? 32 : 96, right: 24, width: 56, height: 56, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${C.energy}55`, zIndex: 40,
      }}>
        <Sparkles size={22} color="#1a0a00" />
      </button>

      {iaAberta && (
        <div onClick={() => setIaAberta(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
          display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            ...glass, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto',
            margin: isDesktop ? 0 : undefined, borderRadius: isDesktop ? 20 : '20px 20px 0 0',
          }}>
            {IAPanel}
          </div>
        </div>
      )}
    </main>
  )
}
