'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
  ChevronDown, Flame, Zap, Utensils, TrendingUp, Moon, Dumbbell,
  Apple, Sun, UtensilsCrossed, Clock, Sparkles, ArrowUpRight,
} from 'lucide-react'

/* ═════════════════════════════════════════════════════════════
   KORE · plano-v2 — "Energetic Precision"
   Premium health/performance UI · pure CSS animations.
   ═════════════════════════════════════════════════════════════ */

/* ── Paleta local (rgba direto p/ controle fino) ──────────────── */
const C = {
  energy: '#FF5A36',
  energy2: '#FF8A3D',
  good: '#2DD4A7',
  sleep: '#60A5FA',
  recovery: '#A78BFA',
  warn: '#F5B544',
  danger: '#FB7185',
  t1: '#F5F6F8',
  t2: '#9AA0AD',
  t3: '#7A8290',
}

const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO = "var(--font-geist-mono), 'JetBrains Mono', monospace"

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */
type Refeicao = {
  nome: string
  horario: string
  kcal: number
  prot: number
  alimentos: { nome: string; quantidade: string; kcal: number; prot: number }[]
  dica?: string
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const PACIENTE = {
  nome: 'Rafael Souza',
  objetivo: 'Ganhar massa',
  nivel: 'Intermediário',
  diasNoPlano: 47,
  aderencia: 82,
  streakDias: 12,
  kcalMeta: 2850,
  protMeta: 190,
  refeicoesMeta: 6,
  kcalHoje: 2430,
  protHoje: 162,
  refeicoesHoje: 4,
  ultimaAvaliacao: '22/05/2026',
  proximaConsulta: '18/06/2026',
  evolucao: [
    { semana: 'S1', kcal: 2100, prot: 140 },
    { semana: 'S2', kcal: 2300, prot: 152 },
    { semana: 'S3', kcal: 2500, prot: 165 },
    { semana: 'S4', kcal: 2650, prot: 170 },
    { semana: 'S5', kcal: 2430, prot: 162 },
  ],
}

const REFEICOES: Refeicao[] = [
  {
    nome: 'Café da Manhã', horario: '07:00', kcal: 520, prot: 38,
    dica: 'Priorize proteína logo ao acordar para maximizar a síntese muscular.',
    alimentos: [
      { nome: 'Ovos mexidos', quantidade: '3 unidades', kcal: 210, prot: 18 },
      { nome: 'Aveia', quantidade: '60g', kcal: 220, prot: 8 },
      { nome: 'Banana', quantidade: '1 unidade', kcal: 90, prot: 1 },
    ],
  },
  {
    nome: 'Lanche Manhã', horario: '10:00', kcal: 290, prot: 28,
    alimentos: [
      { nome: 'Whey protein', quantidade: '30g', kcal: 120, prot: 24 },
      { nome: 'Maçã', quantidade: '1 unidade', kcal: 80, prot: 0 },
      { nome: 'Pasta de amendoim', quantidade: '20g', kcal: 120, prot: 5 },
    ],
  },
  {
    nome: 'Almoço', horario: '13:00', kcal: 720, prot: 52,
    dica: 'Maior refeição do dia — carboidrato complexo + proteína magra + legumes.',
    alimentos: [
      { nome: 'Frango grelhado', quantidade: '200g', kcal: 330, prot: 42 },
      { nome: 'Arroz integral', quantidade: '150g cozido', kcal: 210, prot: 5 },
      { nome: 'Brócolis + azeite', quantidade: '100g + 10ml', kcal: 120, prot: 4 },
    ],
  },
  {
    nome: 'Pré-treino', horario: '16:30', kcal: 350, prot: 22,
    dica: '45 min antes do treino. Foco em carboidrato de rápida digestão.',
    alimentos: [
      { nome: 'Batata doce', quantidade: '120g', kcal: 180, prot: 2 },
      { nome: 'Peito de peru', quantidade: '80g', kcal: 90, prot: 18 },
      { nome: 'Café preto', quantidade: '200ml', kcal: 5, prot: 0 },
    ],
  },
  {
    nome: 'Pós-treino', horario: '19:00', kcal: 480, prot: 38,
    dica: 'Janela anabólica: consuma em até 40 min após o treino.',
    alimentos: [
      { nome: 'Whey + leite', quantidade: '40g + 200ml', kcal: 260, prot: 32 },
      { nome: 'Pão integral', quantidade: '2 fatias', kcal: 150, prot: 5 },
    ],
  },
  {
    nome: 'Ceia', horario: '22:00', kcal: 290, prot: 22,
    dica: 'Proteína de lenta digestão + gordura boa. Evite carboidrato simples.',
    alimentos: [
      { nome: 'Iogurte grego', quantidade: '200g', kcal: 170, prot: 18 },
      { nome: 'Oleaginosas mix', quantidade: '30g', kcal: 190, prot: 6 },
    ],
  },
]

const NOTA_NUTRI = `Rafael está na fase de ganho de massa limpa. Resposta anabólica acima da média nas últimas 3 semanas. Manter volume calórico e monitorar gordura corporal quinzenalmente. Ajustar proteína caso o peso estagnar.`

const ICONE_MAP = [Sun, Apple, UtensilsCrossed, Zap, Dumbbell, Moon]

/* ─────────────────────────────────────────────
   HOOKS UTILITÁRIOS
───────────────────────────────────────────── */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useCountUp(target: number, duration = 1100, delay = 200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const timer = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        setValue(Math.round(easeOutCubic(p) * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [target, duration, delay])
  return value
}

/** Detecta largura da janela para responsividade */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

/** Reveal escalonado — NÃO é hook, apenas retorna CSSProperties */
function revealStyle(delay: number, mounted: boolean): React.CSSProperties {
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : 'translateY(14px)',
    transition: `opacity 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    willChange: 'opacity, transform',
  }
}

/* ─────────────────────────────────────────────
   ANEL DE ADERÊNCIA — SVG animado via rAF
───────────────────────────────────────────── */
function AderenciaRing({ pct }: { pct: number }) {
  const [progress, setProgress] = useState(0)
  const size = 156
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress / 100)

  useEffect(() => {
    let raf = 0
    const timer = setTimeout(() => {
      const start = performance.now()
      const animate = (now: number) => {
        const p = Math.min((now - start) / 1300, 1)
        setProgress(easeOutCubic(p) * pct)
        if (p < 1) raf = requestAnimationFrame(animate)
      }
      raf = requestAnimationFrame(animate)
    }, 450)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [pct])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={C.energy2} />
            <stop offset="100%" stopColor={C.energy} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        />
        {/* Glow layer (blur só no glow, não no stroke principal) */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={C.energy} strokeWidth={stroke + 4}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          opacity={0.18}
          style={{ filter: 'blur(6px)' }}
        />
        {/* Stroke principal — nítido */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="url(#ringGrad)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 42, fontWeight: 700,
          letterSpacing: '-0.02em', lineHeight: 1,
          background: `linear-gradient(135deg, ${C.energy2}, ${C.energy})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {Math.round(progress)}<span style={{ fontSize: 20 }}>%</span>
        </span>
        <span style={{
          fontSize: 10.5, color: C.t2, marginTop: 6,
          textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600,
        }}>
          aderência
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SPARKLINE
───────────────────────────────────────────── */
function SparkLine({ data, color }: { data: number[]; color: string }) {
  const w = 76, h = 28
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const xy = (v: number, i: number) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return [x, y] as const
  }
  const pts = data.map((v, i) => xy(v, i).join(',')).join(' ')
  const [lx, ly] = xy(data[data.length - 1], data.length - 1)
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <polyline
        points={pts} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.85}
      />
      <circle cx={lx} cy={ly} r={4} fill={color} opacity={0.25} />
      <circle cx={lx} cy={ly} r={2.6} fill={color} />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   GRÁFICO DE EVOLUÇÃO — SVG que preenche o card
───────────────────────────────────────────── */
function EvolucaoChart({ dados, mounted }: { dados: typeof PACIENTE.evolucao; mounted: boolean }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: typeof dados[0] } | null>(null)
  const vw = 480, vh = 200
  const padX = 14, padT = 18, padB = 30
  const cw = vw - padX * 2
  const ch = vh - padT - padB

  const kcals = dados.map(d => d.kcal)
  const prots = dados.map(d => d.prot)
  const maxK = Math.max(...kcals), minK = Math.min(...kcals)
  const maxP = Math.max(...prots), minP = Math.min(...prots)

  const coord = (v: number, i: number, mn: number, mx: number) => {
    const range = mx - mn || 1
    const x = padX + (i / (dados.length - 1)) * cw
    const y = padT + ch - ((v - mn) / range) * ch
    return [x, y] as const
  }
  const line = (vals: number[], mn: number, mx: number) =>
    vals.map((v, i) => coord(v, i, mn, mx).join(',')).join(' ')
  const area = (vals: number[], mn: number, mx: number) => {
    const p = vals.map((v, i) => coord(v, i, mn, mx).join(','))
    return `M ${p[0]} L ${p.join(' L ')} L ${padX + cw},${padT + ch} L ${padX},${padT + ch} Z`
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="none"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="gradK" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.energy} stopOpacity="0.28" />
            <stop offset="100%" stopColor={C.energy} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.good} stopOpacity="0.16" />
            <stop offset="100%" stopColor={C.good} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="strokeK" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.energy2} />
            <stop offset="100%" stopColor={C.energy} />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((p, i) => (
          <line key={i} x1={padX} y1={padT + ch * p} x2={padX + cw} y2={padT + ch * p}
            stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
        ))}

        <g style={{ opacity: mounted ? 1 : 0, transition: 'opacity 900ms ease 350ms' }}>
          <path d={area(kcals, minK, maxK)} fill="url(#gradK)" />
          <path d={area(prots, minP, maxP)} fill="url(#gradP)" />
          <polyline points={line(prots, minP, maxP)} fill="none" stroke={C.good}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <polyline points={line(kcals, minK, maxK)} fill="none" stroke="url(#strokeK)"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {dados.map((d, i) => {
            const [xk, yk] = coord(d.kcal, i, minK, maxK)
            const [xp, yp] = coord(d.prot, i, minP, maxP)
            const isActive = tooltip?.d === d
            return (
              <g key={i}
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setTooltip({ x: xk, y: yk, d })}
              >
                {/* Hit area invisível maior para facilitar hover */}
                <rect x={xk - 18} y={padT} width={36} height={ch} fill="transparent" />
                {/* Linha vertical no hover */}
                {isActive && (
                  <line x1={xk} y1={padT} x2={xk} y2={padT + ch}
                    stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,3" />
                )}
                <circle cx={xp} cy={yp} r={isActive ? 5 : 2.5} fill={C.good}
                  style={{ transition: 'r 150ms ease' }} />
                <circle cx={xk} cy={yk} r={isActive ? 7 : 3.5} fill={C.energy} opacity={isActive ? 0.25 : 0}
                  style={{ transition: 'r 150ms ease, opacity 150ms ease' }} />
                <circle cx={xk} cy={yk} r={isActive ? 5 : 3} fill={C.energy}
                  style={{ transition: 'r 150ms ease' }} />
              </g>
            )
          })}
        </g>

        {dados.map((d, i) => {
          const x = padX + (i / (dados.length - 1)) * cw
          return (
            <text key={i} x={x} y={vh - 8} textAnchor="middle"
              style={{ fontSize: 11, fill: C.t3, fontFamily: FONT_MONO, letterSpacing: '0.05em' }}>
              {d.semana}
            </text>
          )
        })}
      </svg>

      {/* Tooltip flutuante */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          top: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,14,20,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 10, padding: '8px 14px',
          display: 'flex', gap: 16, alignItems: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none', zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.t2, fontFamily: FONT_MONO }}>{tooltip.d.semana}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.energy, fontFamily: FONT_MONO }}>
            {tooltip.d.kcal.toLocaleString('pt-BR')} <span style={{ fontSize: 10, color: C.t3 }}>kcal</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.good, fontFamily: FONT_MONO }}>
            {tooltip.d.prot}g <span style={{ fontSize: 10, color: C.t3 }}>prot</span>
          </span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   CARD WRAPPER — glass real + hover lift
───────────────────────────────────────────── */
function GlassCard({
  children, style, accent, interactive = false, ...rest
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
  interactive?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  const [hover, setHover] = useState(false)
  const glow = accent ?? 'rgba(255,255,255,0.04)'
  const base: React.CSSProperties = {
    background: 'rgba(255,255,255,0.065)',
    backdropFilter: 'blur(16px) saturate(130%)',
    WebkitBackdropFilter: 'blur(16px) saturate(130%)',
    border: `1px solid ${hover && interactive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 'var(--radius-card)',
    boxShadow: hover && interactive
      ? `0 0 0 1px rgba(255,255,255,0.10), 0 30px 80px rgba(0,0,0,0.55), 0 0 70px ${glow}, inset 0 1px 0 rgba(255,255,255,0.14)`
      : `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${glow}, inset 0 1px 0 rgba(255,255,255,0.10)`,
    transform: hover && interactive ? 'translateY(-4px) translateZ(0)' : 'translateZ(0)',
    transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease',
    isolation: 'isolate',
    willChange: 'transform',
    ...style,
  }
  return (
    <div
      {...rest}
      style={base}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAT TILE
───────────────────────────────────────────── */
function StatTile({
  label, value, unit, meta, color, sparkData, delay = 0, mounted,
}: {
  label: string; value: number; unit: string; meta: number
  color: string; sparkData?: number[]; delay?: number; mounted: boolean
}) {
  const displayed = useCountUp(value, 1100, delay)
  const pct = Math.round((value / meta) * 100)
  const pctColor = pct >= 90 ? C.good : pct >= 70 ? C.warn : C.danger

  return (
    <GlassCard interactive accent={`${color}1f`} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, color: C.t2, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: pctColor,
          background: `${pctColor}1c`, border: `1px solid ${pctColor}33`,
          padding: '3px 9px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontFamily: FONT_MONO,
        }}>
          {pct}%
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 700,
          color, letterSpacing: '-0.03em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {displayed.toLocaleString('pt-BR')}
        </span>
        <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>{unit}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
        <span style={{ fontSize: 11, color: C.t3, fontFamily: FONT_MONO }}>
          meta {meta.toLocaleString('pt-BR')}{unit}
        </span>
        {sparkData && <SparkLine data={sparkData} color={color} />}
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 12px ${color}66`,
          width: mounted ? `${Math.min(pct, 100)}%` : '0%',
          transition: `width 1.2s cubic-bezier(0.22,1,0.36,1) ${delay + 200}ms`,
        }} />
      </div>
    </GlassCard>
  )
}

/* ─────────────────────────────────────────────
   CARD REFEIÇÃO (acordeão)
───────────────────────────────────────────── */
function RefeicaoCard({ r, idx }: { r: Refeicao; idx: number }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)
  const Icone = ICONE_MAP[idx] ?? Utensils
  const panelId = `refeicao-panel-${idx}`
  const btnId = `refeicao-btn-${idx}`

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(14px) saturate(125%)',
        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
        border: `1px solid ${open || hover ? 'rgba(255,90,54,0.30)' : 'rgba(255,255,255,0.10)'}`,
        borderRadius: 'var(--radius-inner)',
        overflow: 'hidden',
        boxShadow: open || hover
          ? '0 0 0 1px rgba(255,255,255,0.06), 0 18px 50px rgba(0,0,0,0.45), 0 0 36px rgba(255,90,54,0.10), inset 0 1px 0 rgba(255,255,255,0.10)'
          : '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)',
        transition: 'border-color 240ms ease, box-shadow 240ms ease',
      }}
    >
      <button
        id={btnId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.t1, textAlign: 'left',
        }}
      >
        <div style={{
          width: 38, height: 38, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(255,138,61,0.22), rgba(255,90,54,0.14))',
          border: '1px solid rgba(255,90,54,0.28)',
          borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.energy,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>
          <Icone size={17} strokeWidth={2.2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, letterSpacing: '-0.01em' }}>
            {r.nome}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 999, padding: '4px 11px',
          fontSize: 11.5, color: C.t2,
          fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums',
        }}>
          <Clock size={11} strokeWidth={2.2} />
          {r.horario}
        </div>

        <div style={{ display: 'flex', gap: 16, marginLeft: 4 }}>
          <span style={{ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: C.energy }}>
            {r.kcal}<span style={{ fontSize: 10, fontWeight: 500, color: C.t3, marginLeft: 3 }}>kcal</span>
          </span>
          <span style={{ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: C.good }}>
            {r.prot}g<span style={{ fontSize: 10, fontWeight: 500, color: C.t3, marginLeft: 3 }}>prot</span>
          </span>
        </div>

        <ChevronDown
          size={17} color={C.t3} strokeWidth={2.4}
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
            color: open ? C.energy : C.t3,
          }}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 320ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div ref={innerRef} style={{ padding: '2px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {r.dica && (
              <div style={{
                display: 'flex', gap: 9, alignItems: 'flex-start',
                background: 'rgba(255,90,54,0.09)',
                border: '1px solid rgba(255,90,54,0.22)',
                borderRadius: 11, padding: '11px 13px',
                fontSize: 12.5, color: C.t2, lineHeight: 1.55,
              }}>
                <Sparkles size={14} color={C.energy} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{r.dica}</span>
              </div>
            )}
            {r.alimentos.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: i < r.alimentos.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13.5, color: C.t1, fontWeight: 500 }}>{a.nome}</div>
                  <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2 }}>{a.quantidade}</div>
                </div>
                <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 700, color: C.energy }}>{a.kcal}</div>
                    <div style={{ fontSize: 9.5, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>kcal</div>
                  </div>
                  <div style={{ minWidth: 32 }}>
                    <div style={{ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 700, color: C.good }}>{a.prot}g</div>
                    <div style={{ fontSize: 9.5, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>prot</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MICRO COMPONENTES
───────────────────────────────────────────── */
type PillCfg = { bg: string; border: string; color: string }
const PILL_CONFIGS: Record<string, PillCfg> = {
  'Ganhar massa':              { bg: 'rgba(255,90,54,0.12)',   border: 'rgba(255,90,54,0.30)',   color: '#FF8A3D' },
  'Perder peso':               { bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.30)', color: '#FB7185' },
  'Manter peso':               { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)',  color: '#60A5FA' },
  'Melhorar condicionamento':  { bg: 'rgba(45,212,167,0.12)',  border: 'rgba(45,212,167,0.30)',  color: '#2DD4A7' },
  'Saúde geral':               { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.30)', color: '#A78BFA' },
  'Intermediário':             { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.30)', color: '#A78BFA' },
  'Avançado':                  { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)',  color: '#60A5FA' },
  'Iniciante':                 { bg: 'rgba(45,212,167,0.12)',  border: 'rgba(45,212,167,0.30)',  color: '#2DD4A7' },
}
const PILL_DEFAULT: PillCfg = { bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.13)', color: C.t2 }

function Pill({ label }: { label: string }) {
  const isDiasNoPlano = label.includes('dias no plano')
  const cfg: PillCfg = isDiasNoPlano
    ? { bg: 'rgba(45,212,167,0.10)', border: 'rgba(45,212,167,0.25)', color: '#2DD4A7' }
    : (PILL_CONFIGS[label] ?? PILL_DEFAULT)

  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      borderRadius: 999, padding: '5px 13px',
      fontSize: 12, fontWeight: 600,
      backdropFilter: 'blur(8px)',
      letterSpacing: '0.01em',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {isDiasNoPlano && <span style={{ fontSize: 10 }}>📅</span>}
      {label}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 12, padding: '12px 13px',
    }}>
      <div style={{
        fontSize: 9.5, color: C.t3, marginBottom: 5,
        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
      }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.t1, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function LegendaDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}88` }} />
      <span style={{ fontSize: 11.5, color: C.t2, fontWeight: 500 }}>{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────────── */
export default function PlanoV2() {
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const p = PACIENTE

  return (
    <div style={{ minHeight: '100vh', background: '#161822', color: C.t1, fontFamily: FONT_BODY }}>
      {/* ── Gradiente de fundo vivo — cobre TODA a página ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 75% 55% at 8% 15%, rgba(255,90,54,0.45) 0%, transparent 55%),
          radial-gradient(ellipse 60% 45% at 92% 10%, rgba(255,138,61,0.28) 0%, transparent 50%),
          radial-gradient(ellipse 80% 55% at 50% 55%, rgba(167,139,250,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 70% 55% at 5% 88%, rgba(96,165,250,0.28) 0%, transparent 50%),
          radial-gradient(ellipse 65% 50% at 95% 92%, rgba(45,212,167,0.20) 0%, transparent 50%)
        `,
      }} />
      {/* ── Noise overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '140px',
        mixBlendMode: 'overlay',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '24px 16px 48px' : '36px 24px 64px', maxWidth: 1120, margin: '0 auto' }}>

        {/* ── HEADER DO PACIENTE ── */}
        <header style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 12 : 16, flexWrap: 'wrap',
          marginBottom: 24, ...revealStyle(0, mounted),
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.energy2}, ${C.energy})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: '#fff',
            boxShadow: '0 0 0 3px rgba(255,90,54,0.18), 0 10px 30px rgba(255,90,54,0.30)',
            letterSpacing: '-0.02em',
          }}>
            {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 700, color: C.t1,
              margin: 0, marginBottom: 8, letterSpacing: '-0.025em',
            }}>
              {p.nome}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
              <Pill label={p.objetivo} />
              <Pill label={p.nivel} />
              <Pill label={`${p.diasNoPlano} dias no plano`} />
            </div>
          </div>

          {/* Streak + badge — agrupados para quebrar juntos no mobile */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg, rgba(255,90,54,0.20), rgba(255,138,61,0.12))',
              border: '1px solid rgba(255,90,54,0.40)',
              borderRadius: 999, padding: '7px 15px',
              boxShadow: '0 0 24px rgba(255,90,54,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}>
              <Flame size={17} color={C.energy} className="float" fill={C.energy} fillOpacity={0.25} />
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.energy, fontVariantNumeric: 'tabular-nums' }}>
                {p.streakDias}
              </span>
              <span style={{ fontSize: 12, color: C.t2, fontWeight: 500 }}>dias seguidos</span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(45,212,167,0.09)',
              border: '1px solid rgba(45,212,167,0.24)',
              borderRadius: 999, padding: '7px 15px',
            }}>
              <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: C.good, color: C.good }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.good }}>Evoluindo</span>
            </div>
          </div>
        </header>

        {/* ── LINHA HERÓI ── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '0.85fr 1.6fr',
          gap: 18, marginBottom: 18, ...revealStyle(120, mounted),
        }}>
          {/* Aderência */}
          <GlassCard interactive accent="rgba(255,90,54,0.16)" style={{
            padding: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, color: C.t2,
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Aderência ao Plano
            </div>
            <AderenciaRing pct={p.aderencia} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
              <MiniStat label="Última aval." value={p.ultimaAvaliacao} />
              <MiniStat label="Próx. consulta" value={p.proximaConsulta} />
            </div>
          </GlassCard>

          {/* Evolução */}
          <GlassCard interactive style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Evolução das Metas
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <TrendingUp size={15} color={C.good} strokeWidth={2.4} />
                  <span style={{ fontSize: 13, color: C.t1, fontWeight: 600 }}>
                    +15,7% <span style={{ color: C.t3, fontWeight: 400 }}>de proteína em 5 semanas</span>
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <LegendaDot color={C.energy} label="Kcal" />
                <LegendaDot color={C.good} label="Proteína" />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 168, marginTop: 8 }}>
              <EvolucaoChart dados={p.evolucao} mounted={mounted} />
            </div>
          </GlassCard>
        </section>

        {/* ── STAT TILES ── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 18, marginBottom: 18, ...revealStyle(240, mounted),
        }}>
          <StatTile label="Calorias hoje" value={p.kcalHoje} unit=" kcal" meta={p.kcalMeta}
            color={C.energy} sparkData={p.evolucao.map(d => d.kcal)} delay={400} mounted={mounted} />
          <StatTile label="Proteína hoje" value={p.protHoje} unit="g" meta={p.protMeta}
            color={C.good} sparkData={p.evolucao.map(d => d.prot)} delay={520} mounted={mounted} />
          <StatTile label="Refeições" value={p.refeicoesHoje} unit={`/${p.refeicoesMeta}`} meta={p.refeicoesMeta}
            color={C.sleep} delay={640} mounted={mounted} />
        </section>

        {/* ── NOTA CLÍNICA ── */}
        <section style={{ marginBottom: 18, ...revealStyle(340, mounted) }}>
          <div style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(14px) saturate(125%)',
            WebkitBackdropFilter: 'blur(14px) saturate(125%)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderLeft: `3px solid ${C.energy}`,
            borderRadius: 'var(--radius-card)',
            padding: '20px 24px',
            boxShadow: '0 18px 50px rgba(0,0,0,0.4), 0 0 36px rgba(255,90,54,0.07), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
            }}>
              <Sparkles size={14} color={C.energy} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.energy, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                Nota Clínica
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.7, margin: 0, maxWidth: 760 }}>
              {NOTA_NUTRI}
            </p>
          </div>
        </section>

        {/* ── REFEIÇÕES ── */}
        <section style={{ ...revealStyle(440, mounted) }}>
          {/* Header + totais do dia */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.t2, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Plano Alimentar · {REFEICOES.length} refeições
            </div>
            {/* Totais do dia */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,90,54,0.10)', border: '1px solid rgba(255,90,54,0.22)',
                borderRadius: 999, padding: '4px 12px',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.energy, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>
                  {REFEICOES.reduce((s, r) => s + r.kcal, 0).toLocaleString('pt-BR')}
                </span>
                <span style={{ fontSize: 10, color: C.t3 }}>kcal total</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(45,212,167,0.10)', border: '1px solid rgba(45,212,167,0.22)',
                borderRadius: 999, padding: '4px 12px',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.good, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>
                  {REFEICOES.reduce((s, r) => s + r.prot, 0)}g
                </span>
                <span style={{ fontSize: 10, color: C.t3 }}>prot total</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REFEICOES.map((r, i) => (
              <div key={i} style={revealStyle(500 + i * 60, mounted)}>
                <RefeicaoCard r={r} idx={i} />
              </div>
            ))}
          </div>
        </section>

        {/* ── RODAPÉ ── */}
        <footer style={{
          marginTop: 56, textAlign: 'center',
          fontSize: 11, color: C.t3, letterSpacing: '0.1em',
          ...revealStyle(800, mounted),
        }}>
          KORE · ENERGETIC PRECISION — plano-v2 preview
        </footer>
      </div>
    </div>
  )
}
