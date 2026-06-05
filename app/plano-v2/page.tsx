'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ChevronDown, Flame, Zap, Utensils, TrendingUp, Moon, Dumbbell, Apple, Coffee, Sun, Salad, UtensilsCrossed, Clock } from 'lucide-react'

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */
type Refeicao = {
  nome: string
  horario: string
  icone: React.ReactNode
  kcal: number
  prot: number
  alimentos: { nome: string; quantidade: string; kcal: number; prot: number }[]
  dica?: string
}

/* ─────────────────────────────────────────────
   MOCK DATA — substitua por Supabase depois
───────────────────────────────────────────── */
const PACIENTE = {
  nome: 'Rafael Souza',
  objetivo: 'Ganhar massa',
  nivel: 'Intermediário',
  diasNoPlano: 47,
  aderencia: 82,           // % aderência ao plano
  streakDias: 12,
  kcalMeta: 2850,
  protMeta: 190,
  refeicoesMeta: 6,
  kcalHoje: 2430,
  protHoje: 162,
  refeicoesHoje: 4,
  ultimaAvaliacao: '22/05/2026',
  proximaConsulta: '18/06/2026',
  sonoScore: 78,
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
    nome: 'Café da Manhã',
    horario: '07:00',
    icone: <Sun size={14} />,
    kcal: 520,
    prot: 38,
    dica: 'Priorize proteína logo ao acordar para maximizar síntese muscular.',
    alimentos: [
      { nome: 'Ovos mexidos', quantidade: '3 unidades', kcal: 210, prot: 18 },
      { nome: 'Aveia', quantidade: '60g', kcal: 220, prot: 8 },
      { nome: 'Banana', quantidade: '1 unidade', kcal: 90, prot: 1 },
    ],
  },
  {
    nome: 'Lanche Manhã',
    horario: '10:00',
    icone: <Apple size={14} />,
    kcal: 290,
    prot: 28,
    alimentos: [
      { nome: 'Whey protein', quantidade: '30g', kcal: 120, prot: 24 },
      { nome: 'Maçã', quantidade: '1 unidade', kcal: 80, prot: 0 },
      { nome: 'Pasta de amendoim', quantidade: '20g', kcal: 120, prot: 5 },
    ],
  },
  {
    nome: 'Almoço',
    horario: '13:00',
    icone: <UtensilsCrossed size={14} />,
    kcal: 720,
    prot: 52,
    dica: 'Maior refeição do dia — carboidrato complexo + proteína magra + legumes.',
    alimentos: [
      { nome: 'Frango grelhado', quantidade: '200g', kcal: 330, prot: 42 },
      { nome: 'Arroz integral', quantidade: '150g cozido', kcal: 210, prot: 5 },
      { nome: 'Brócolis + azeite', quantidade: '100g + 10ml', kcal: 120, prot: 4 },
    ],
  },
  {
    nome: 'Pré-treino',
    horario: '16:30',
    icone: <Zap size={14} />,
    kcal: 350,
    prot: 22,
    dica: '45 min antes do treino. Foco em carboidrato de rápida digestão.',
    alimentos: [
      { nome: 'Batata doce', quantidade: '120g', kcal: 180, prot: 2 },
      { nome: 'Peito de peru', quantidade: '80g', kcal: 90, prot: 18 },
      { nome: 'Café preto', quantidade: '200ml', kcal: 5, prot: 0 },
    ],
  },
  {
    nome: 'Pós-treino',
    horario: '19:00',
    icone: <Dumbbell size={14} />,
    kcal: 480,
    prot: 38,
    dica: 'Janela anabólica: consuma em até 40 min após o treino.',
    alimentos: [
      { nome: 'Whey + leite', quantidade: '40g + 200ml', kcal: 260, prot: 32 },
      { nome: 'Pão integral', quantidade: '2 fatias', kcal: 150, prot: 5 },
    ],
  },
  {
    nome: 'Ceia',
    horario: '22:00',
    icone: <Moon size={14} />,
    kcal: 290,
    prot: 22,
    dica: 'Proteína de lenta digestão + gordura boa. Evite carboidrato simples.',
    alimentos: [
      { nome: 'Iogurte grego', quantidade: '200g', kcal: 170, prot: 18 },
      { nome: 'Oleaginosas mix', quantidade: '30g', kcal: 190, prot: 6 },
    ],
  },
]

const NOTA_NUTRI = `Rafael está na fase de ganho de massa limpa. Resposta anabólica acima da média nas últimas 3 semanas. Manter volume calórico e monitorar gordura corporal quinzenalmente. Ajustar proteína caso peso estagnar.`

/* ─────────────────────────────────────────────
   HOOKS UTILITÁRIOS
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1200, delay = 200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(timer)
  }, [target, duration, delay])
  return value
}

/* ─────────────────────────────────────────────
   COMPONENTE: ANEL DE ADERÊNCIA
───────────────────────────────────────────── */
function AderenciaRing({ pct }: { pct: number }) {
  const [progress, setProgress] = useState(0)
  const size = 140
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress / 100)

  useEffect(() => {
    const timer = setTimeout(() => {
      let start: number
      const animate = (ts: number) => {
        if (!start) start = ts
        const elapsed = ts - start
        const p = Math.min(elapsed / 1000, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setProgress(Math.round(eased * pct))
        if (p < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, 300)
    return () => clearTimeout(timer)
  }, [pct])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF8A3D" />
            <stop offset="100%" stopColor="#FF5A36" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-sora), Sora, sans-serif',
          fontSize: 28, fontWeight: 700, color: 'var(--t1)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {progress}%
        </span>
        <span style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>aderência</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENTE: MINI SPARK LINE
───────────────────────────────────────────── */
function SparkLine({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 32
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      {/* last dot */}
      {(() => {
        const last = data[data.length - 1]
        const x = w
        const y = h - ((last - min) / range) * (h - 4) - 2
        return <circle cx={x} cy={y} r={3} fill={color} />
      })()}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   COMPONENTE: GRÁFICO DE EVOLUÇÃO
───────────────────────────────────────────── */
function EvolucaoChart({ dados }: { dados: typeof PACIENTE.evolucao }) {
  const vw = 400, vh = 120
  const padL = 8, padR = 8, padT = 8, padB = 24

  const kcals = dados.map(d => d.kcal)
  const prots = dados.map(d => d.prot)
  const maxK = Math.max(...kcals), minK = Math.min(...kcals)
  const maxP = Math.max(...prots), minP = Math.min(...prots)
  const chartW = vw - padL - padR
  const chartH = vh - padT - padB

  function pts(values: number[], min: number, max: number) {
    const range = max - min || 1
    return values.map((v, i) => {
      const x = padL + (i / (values.length - 1)) * chartW
      const y = padT + chartH - ((v - min) / range) * chartH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  function areaPath(values: number[], min: number, max: number) {
    const range = max - min || 1
    const points = values.map((v, i) => {
      const x = padL + (i / (values.length - 1)) * chartW
      const y = padT + chartH - ((v - min) / range) * chartH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    const bottom = padT + chartH
    return `M ${points[0]} L ${points.join(' L ')} L ${padL + chartW},${bottom} L ${padL},${bottom} Z`
  }

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradK" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2DD4A7" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2DD4A7" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines horizontais */}
      {[0.25, 0.5, 0.75].map((p, i) => (
        <line key={i}
          x1={padL} y1={padT + chartH * p}
          x2={padL + chartW} y2={padT + chartH * p}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"
        />
      ))}

      {/* Área Kcal */}
      <path d={areaPath(kcals, minK, maxK)} fill="url(#gradK)" />
      {/* Área Prot */}
      <path d={areaPath(prots, minP, maxP)} fill="url(#gradP)" />

      {/* Kcal linha */}
      <polyline
        points={pts(kcals, minK, maxK)}
        fill="none" stroke="#FF5A36" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Prot linha */}
      <polyline
        points={pts(prots, minP, maxP)}
        fill="none" stroke="#2DD4A7" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        opacity={0.9}
      />

      {/* Pontos e labels X */}
      {dados.map((d, i) => {
        const x = padL + (i / (dados.length - 1)) * chartW
        const yK = padT + chartH - ((d.kcal - minK) / (maxK - minK || 1)) * chartH
        const yP = padT + chartH - ((d.prot - minP) / (maxP - minP || 1)) * chartH
        return (
          <g key={i}>
            <circle cx={x} cy={yK} r={3} fill="#FF5A36" />
            <circle cx={x} cy={yP} r={2.5} fill="#2DD4A7" />
            <text x={x} y={vh - 4} textAnchor="middle"
              style={{ fontSize: 11, fill: 'var(--t3)', fontFamily: 'monospace' }}>
              {d.semana}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   COMPONENTE: STAT TILE
───────────────────────────────────────────── */
function StatTile({
  label, value, unit, meta, color, sparkData, delay = 0
}: {
  label: string; value: number; unit: string; meta: number; color: string; sparkData?: number[]; delay?: number
}) {
  const displayed = useCountUp(value, 1000, delay)
  const pct = Math.round((value / meta) * 100)

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--radius-inner)',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--hairline-2)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--hairline)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: pct >= 90 ? '#2DD4A7' : pct >= 70 ? '#F5B544' : '#FB7185',
          background: pct >= 90 ? 'rgba(45,212,167,0.12)' : pct >= 70 ? 'rgba(245,181,68,0.12)' : 'rgba(251,113,133,0.12)',
          padding: '2px 7px', borderRadius: 999,
        }}>
          {pct}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--font-sora), Sora, sans-serif',
          fontSize: 28, fontWeight: 700, color,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {displayed.toLocaleString('pt-BR')}
        </span>
        <span style={{ fontSize: 12, color: 'var(--t2)' }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>meta {meta.toLocaleString('pt-BR')}{unit}</span>
        {sparkData && <SparkLine data={sparkData} color={color} />}
      </div>
      {/* Barra de progresso */}
      <div style={{ height: 3, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: color,
          width: `${Math.min(pct, 100)}%`,
          transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENTE: CARD REFEIÇÃO (acordeão)
───────────────────────────────────────────── */
const ICONE_MAP = [<Sun size={14} />, <Apple size={14} />, <UtensilsCrossed size={14} />, <Zap size={14} />, <Dumbbell size={14} />, <Moon size={14} />]

function RefeicaoCard({ r, idx }: { r: Refeicao; idx: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--radius-inner)',
      overflow: 'hidden',
      transition: 'border-color 150ms ease',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--t1)', textAlign: 'left',
        }}
      >
        {/* Ícone */}
        <div style={{
          width: 32, height: 32,
          background: 'var(--energy-soft)',
          border: '1px solid rgba(255,90,54,0.2)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--energy)', flexShrink: 0,
        }}>
          {ICONE_MAP[idx] ?? <Utensils size={14} />}
        </div>

        {/* Nome + horário */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{r.nome}</div>
        </div>

        {/* Horário pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--surface-2)', border: '1px solid var(--hairline)',
          borderRadius: 999, padding: '3px 10px',
          fontSize: 11, color: 'var(--t2)',
          fontFamily: 'var(--font-geist-mono), monospace',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <Clock size={10} />
          {r.horario}
        </div>

        {/* Macros */}
        <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
          <span style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13, fontWeight: 700, color: 'var(--energy)',
          }}>
            {r.kcal} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t3)' }}>kcal</span>
          </span>
          <span style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13, fontWeight: 700, color: '#2DD4A7',
          }}>
            {r.prot}g <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t3)' }}>prot</span>
          </span>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={16}
          color="var(--t3)"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 250ms ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Acordeão */}
      <div style={{
        maxHeight: open ? 500 : 0,
        overflow: 'hidden',
        transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {r.dica && (
            <div style={{
              background: 'rgba(255,90,54,0.06)',
              border: '1px solid rgba(255,90,54,0.15)',
              borderRadius: 10, padding: '10px 12px',
              fontSize: 12, color: 'var(--t2)', lineHeight: 1.5,
            }}>
              💡 {r.dica}
            </div>
          )}
          {r.alimentos.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < r.alimentos.length - 1 ? '1px solid var(--hairline)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{a.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{a.quantidade}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
                <div>
                  <div style={{
                    fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums',
                    fontSize: 13, fontWeight: 700, color: 'var(--energy)',
                  }}>{a.kcal}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>kcal</div>
                </div>
                <div>
                  <div style={{
                    fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums',
                    fontSize: 13, fontWeight: 700, color: '#2DD4A7',
                  }}>{a.prot}g</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>prot</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────────── */
export default function PlanoV2() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const p = PACIENTE

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--t1)',
    }}>
    {/* Gradiente radial de fundo */}
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: `
        radial-gradient(ellipse 60% 40% at 15% 10%, rgba(255,90,54,0.07) 0%, transparent 70%),
        radial-gradient(ellipse 50% 35% at 85% 80%, rgba(96,165,250,0.05) 0%, transparent 65%),
        radial-gradient(ellipse 40% 30% at 50% 50%, rgba(167,139,250,0.03) 0%, transparent 60%)
      `,
    }} />
    <div style={{
      position: 'relative', zIndex: 1,
      padding: '32px 24px',
      maxWidth: 1100,
      margin: '0 auto',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'none' : 'translateY(8px)',
      transition: 'opacity 400ms ease, transform 400ms ease',
    }}>

      {/* ── HEADER DO PACIENTE ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 32,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(-8px)',
        transition: 'opacity 350ms ease 100ms, transform 350ms ease 100ms',
      }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--energy), var(--energy-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sora), Sora, sans-serif',
          fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
          boxShadow: '0 0 0 3px rgba(255,90,54,0.2)',
        }}>
          {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>

        {/* Nome e tags */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-sora), Sora, sans-serif',
            fontSize: 20, fontWeight: 700, color: 'var(--t1)',
            margin: 0, marginBottom: 6,
          }}>
            {p.nome}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Pill label={p.objetivo} />
            <Pill label={p.nivel} />
            <Pill label={`${p.diasNoPlano} dias no plano`} />
          </div>
        </div>

        {/* Streak chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,90,54,0.1)',
          border: '1px solid rgba(255,90,54,0.25)',
          borderRadius: 999, padding: '6px 14px',
        }}>
          <Flame size={16} color="var(--energy)" />
          <span style={{
            fontFamily: 'var(--font-sora), Sora, sans-serif',
            fontSize: 15, fontWeight: 700, color: 'var(--energy)',
          }}>
            {p.streakDias}
          </span>
          <span style={{ fontSize: 12, color: 'var(--t2)' }}>dias seguidos</span>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(45,212,167,0.08)',
          border: '1px solid rgba(45,212,167,0.2)',
          borderRadius: 999, padding: '6px 14px',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#2DD4A7',
            boxShadow: '0 0 6px #2DD4A7',
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2DD4A7' }}>Evoluindo</span>
        </div>
      </div>

      {/* ── LINHA HERÓI: ANEL + GRÁFICO ────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: 16, marginBottom: 16,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 400ms ease 200ms',
      }}>
        {/* Card aderência */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-card)',
          padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--t2)',
            alignSelf: 'flex-start',
          }}>
            Aderência ao Plano
          </div>
          <AderenciaRing pct={p.aderencia} />
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 8, width: '100%',
          }}>
            <MiniStat label="Última avaliação" value={p.ultimaAvaliacao} />
            <MiniStat label="Próx. consulta" value={p.proximaConsulta} />
          </div>
        </div>

        {/* Card evolução */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-card)',
          padding: 24,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
              Evolução das Metas
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <LegendaDot color="var(--energy)" label="Kcal" />
              <LegendaDot color="#2DD4A7" label="Proteína" />
            </div>
          </div>
          <div style={{ height: 140, width: '100%' }}>
            <EvolucaoChart dados={p.evolucao} />
          </div>
        </div>
      </div>

      {/* ── STAT TILES ───────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16, marginBottom: 16,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 400ms ease 300ms',
      }}>
        <StatTile
          label="Calorias hoje"
          value={p.kcalHoje}
          unit=" kcal"
          meta={p.kcalMeta}
          color="var(--energy)"
          sparkData={p.evolucao.map(d => d.kcal)}
          delay={400}
        />
        <StatTile
          label="Proteína hoje"
          value={p.protHoje}
          unit="g"
          meta={p.protMeta}
          color="#2DD4A7"
          sparkData={p.evolucao.map(d => d.prot)}
          delay={550}
        />
        <StatTile
          label="Refeições registradas"
          value={p.refeicoesHoje}
          unit={`/${p.refeicoesMeta}`}
          meta={p.refeicoesMeta}
          color="#60A5FA"
          delay={700}
        />
      </div>

      {/* ── NOTA CLÍNICA ─────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-card)',
        borderLeft: '3px solid var(--energy)',
        padding: 20, marginBottom: 16,
        display: 'flex', gap: 16,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 400ms ease 400ms',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--energy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Nota Clínica
          </div>
          <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, margin: 0 }}>
            {NOTA_NUTRI}
          </p>
        </div>
      </div>

      {/* ── REFEIÇÕES ─────────────────────────────────────────── */}
      <div style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 400ms ease 500ms',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 12 }}>
          Plano Alimentar — {REFEICOES.length} refeições
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {REFEICOES.map((r, i) => (
            <RefeicaoCard key={i} r={r} idx={i} />
          ))}
        </div>
      </div>

      {/* Rodapé label */}
      <div style={{ marginTop: 48, textAlign: 'center', fontSize: 11, color: 'var(--t3)' }}>
        KORE · Energetic Precision — plano-v2 preview
      </div>
    </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MICRO COMPONENTES
───────────────────────────────────────────── */
function Pill({ label }: { label: string }) {
  return (
    <span style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--hairline)',
      borderRadius: 999,
      padding: '3px 10px',
      fontSize: 11, color: 'var(--t2)', fontWeight: 500,
    }}>
      {label}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--hairline)',
      borderRadius: 10, padding: '10px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{value}</div>
    </div>
  )
}

function LegendaDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, color: 'var(--t2)' }}>{label}</span>
    </div>
  )
}
