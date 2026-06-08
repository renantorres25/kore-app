'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* ─── design tokens ──────────────────────────────────────────────────────── */

const C = {
  energy: '#FF5A36',
  energy2: '#FF8A3D',
  good: '#2DD4A7',
  sleep: '#60A5FA',
  recovery: '#A78BFA',
  t1: '#F5F6F8',
  t2: '#9AA0AD',
  t3: '#7A8290',
}

const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
}

/* ─── hooks ──────────────────────────────────────────────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.unobserve(el) }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ─── ícones SVG ─────────────────────────────────────────────────────────── */

type IconProps = { size?: number; color?: string }

const IconBolt = ({ size = 22, color = C.energy }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
  </svg>
)

const IconMoon = ({ size = 22, color = C.sleep }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)

const IconDumbbell = ({ size = 22, color = C.energy }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5 17.5 17.5M3 7v10M7 5v14M17 5v14M21 7v10M5 12h2M17 12h2" />
  </svg>
)

const IconLeaf = ({ size = 22, color = C.good }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
  </svg>
)

const IconChart = ({ size = 22, color = C.energy }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" /><path d="m7 13 3-3 3 3 5-6" />
  </svg>
)

const IconTarget = ({ size = 22, color = C.energy }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
  </svg>
)

const IconHeart = ({ size = 22, color = C.energy }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
)

const IconUsers = ({ size = 22, color = C.sleep }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
  </svg>
)

const IconCheck = ({ size = 16, color = C.good }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const IconX = ({ size = 16, color = '#F87171' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const IconArrow = ({ size = 16, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/* ─── componentes visuais ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: C.energy, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.35em', fontWeight: 700, marginBottom: 16, fontFamily: JAKARTA }}>{children}</p>
  )
}

function ListaEspera() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [focus, setFocus] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setStatus('loading')
    try {
      const res = await fetch('/api/lista-espera', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch { setStatus('error') }
  }

  return (
    <section style={{ padding: '56px 20px', maxWidth: 1024, margin: '0 auto' }}>
      <div style={{ ...glass, borderRadius: 28, maxWidth: 512, margin: '0 auto', padding: 40, textAlign: 'center' }}>
        <p style={{ color: C.energy, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.35em', fontWeight: 700, marginBottom: 12, fontFamily: JAKARTA }}>Acesso antecipado</p>
        <h2 style={{ fontFamily: SORA, fontSize: 28, fontWeight: 800, color: C.t1, marginBottom: 12, lineHeight: 1.15 }}>
          Quer ser dos primeiros <br />a usar o KORE?
        </h2>
        <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 24, fontFamily: JAKARTA }}>
          Deixe seu email e avisamos quando as próximas vagas abrirem. Sem spam.
        </p>

        {status === 'done' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(45,212,167,0.18)', border: `1px solid ${C.good}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconCheck size={16} color={C.good} />
            </div>
            <p style={{ color: C.good, fontWeight: 700, fontSize: 14, fontFamily: JAKARTA }}>Email confirmado! Te avisamos em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="kore-row">
            <input
              type="email" required
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${focus ? C.energy + 'aa' : 'rgba(255,255,255,0.12)'}`,
                color: C.t1, borderRadius: 14, padding: '14px 16px', fontSize: 14,
                outline: 'none', transition: 'border-color .2s', fontFamily: JAKARTA,
              }}
            />
            <button type="submit" disabled={status === 'loading'}
              style={{
                background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
                color: '#fff', fontWeight: 800, padding: '14px 24px', borderRadius: 14, fontSize: 13,
                textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', opacity: status === 'loading' ? 0.6 : 1, fontFamily: JAKARTA,
                boxShadow: '0 8px 24px rgba(255,90,54,0.35)',
              }}>
              {status === 'loading' ? 'Salvando...' : <>Entrar na lista <IconArrow size={15} /></>}
            </button>
          </form>
        )}
        {status === 'error' && <p style={{ color: '#F87171', fontSize: 12, marginTop: 12, fontFamily: JAKARTA }}>Erro ao salvar. Tente novamente.</p>}
      </div>
    </section>
  )
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.38
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={size * 0.11} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={C.energy} strokeWidth={size * 0.11} fill="none"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.25,1,0.5,1)' }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="#fff" fontSize={size * 0.24} fontWeight="800" fontFamily={SORA}>{score}</text>
    </svg>
  )
}

function PhoneMockup({ visible }: { visible: boolean }) {
  const [score, setScore] = useState(0)
  useEffect(() => { if (!visible) return; const t = setTimeout(() => setScore(85), 700); return () => clearTimeout(t) }, [visible])
  const statCardBg = 'rgba(255,255,255,0.05)'
  return (
    <div style={{ position: 'relative', transition: 'all .9s', transitionDelay: '350ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(48px)' }}>
      <div style={{ position: 'absolute', inset: '-30%', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.28, background: `radial-gradient(circle, ${C.energy}, transparent 70%)` }} />
      <div style={{
        position: 'relative', width: 230, borderRadius: 45, border: '1px solid rgba(255,255,255,0.16)', overflow: 'hidden',
        background: '#10121c', boxShadow: '0 60px 120px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.09)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 80, height: 20, borderRadius: 999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.11)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a2d3a' }} />
          </div>
        </div>
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ color: C.t3, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Bom dia</p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: SORA }}>Pedro</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy }} className="kore-pulse" />
              <p style={{ color: C.t3, fontSize: 7 }}>ao vivo</p>
            </div>
          </div>
          {/* Recuperação */}
          <div style={{ borderRadius: 16, padding: 14, marginBottom: 8, border: `1px solid ${C.energy}40`, position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, rgba(255,90,54,0.12), rgba(255,138,61,0.04))' }}>
            <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', filter: 'blur(28px)', opacity: 0.35, background: C.energy }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{ color: C.energy, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 2 }}>Recuperação</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1, fontFamily: SORA }}>Boa — treine</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1, fontFamily: SORA }}>forte hoje</p>
                <p style={{ color: C.t2, fontSize: 7, marginTop: 4 }}>HRV 68ms · Sono 8.2h</p>
              </div>
              <ScoreRing score={score} size={54} />
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.energy}, ${C.energy2})`, borderRadius: 999, width: `${score}%`, transition: 'width 1s', transitionDelay: '800ms' }} />
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            {[
              { Icon: IconMoon, ic: C.sleep, label: 'Sono', val: '8.2h', sub: 'HRV 68ms', c: '#fff' },
              { Icon: IconDumbbell, ic: C.energy, label: 'Treino', val: 'Feito', sub: '410 kcal', c: C.good },
            ].map(s => (
              <div key={s.label} style={{ borderRadius: 12, padding: 10, border: '1px solid rgba(255,255,255,0.1)', background: statCardBg }}>
                <p style={{ color: C.t3, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <s.Icon size={9} color={s.ic} /> {s.label}
                </p>
                <p style={{ fontSize: 10, fontWeight: 800, color: s.c, fontFamily: SORA }}>{s.val}</p>
                <p style={{ color: C.t3, fontSize: 7 }}>{s.sub}</p>
              </div>
            ))}
          </div>
          {/* Decisão */}
          <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.energy}30`, background: statCardBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <IconTarget size={9} color={C.energy} />
              <p style={{ color: C.energy, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Decisão do dia</p>
            </div>
            <p style={{ color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1.3, fontFamily: SORA }}>Treino de força máxima.</p>
            <p style={{ color: C.t2, fontSize: 7, lineHeight: 1.5, marginTop: 2 }}>Recuperação ótima. Bata seu recorde hoje.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SleepChart({ active }: { active: boolean }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setDrawn(true), 400)
    return () => clearTimeout(t)
  }, [active])
  const scores = [72, 58, 85, 67, 80, 45, 85]
  const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const W = 260, H = 80
  const pts = scores.map((s, i) => ({
    x: 10 + (i / (scores.length - 1)) * (W - 20),
    y: 8 + (1 - (s - 30) / 70) * (H - 16),
  }))
  const line = pts.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${d} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`
  }, '')
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`
  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.energy} stopOpacity="0.3" />
          <stop offset="100%" stopColor={C.energy} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 50, 70, 90].map(v => {
        const y = 8 + (1 - (v - 30) / 70) * (H - 16)
        return <line key={v} x1={10} y1={y} x2={W - 10} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      })}
      <path d={area} fill="url(#sleepGrad)" />
      <path d={line} stroke={C.energy} strokeWidth="2.5" fill="none" strokeLinecap="round"
        strokeDasharray="600" strokeDashoffset={drawn ? 0 : 600}
        style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)' }} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#161822" stroke={C.energy} strokeWidth="2"
            style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.3s ease ${0.9 + i * 0.08}s` }} />
          <text x={p.x} y={H + 16} textAnchor="middle" fill={C.t3} fontSize="9" fontFamily={JAKARTA}>{days[i]}</text>
        </g>
      ))}
      {[{ label: '45', i: 5 }, { label: '85', i: 6 }].map(({ label, i }) => (
        <text key={label} x={pts[i].x} y={pts[i].y - 10} textAnchor="middle" fill={C.energy}
          fontSize="9" fontWeight="700" fontFamily={JAKARTA}
          style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.4s ease ${1.4 + i * 0.05}s` }}>{label}</text>
      ))}
    </svg>
  )
}

function WorkoutHeatmap({ active }: { active: boolean }) {
  const WEEKS = 14; const DAYS = 7; const TOTAL = WEEKS * DAYS
  const [revealed, setRevealed] = useState(-1)
  useEffect(() => {
    if (!active) return
    let i = -1
    const iv = setInterval(() => {
      i++; setRevealed(i)
      if (i >= TOTAL) clearInterval(iv)
    }, 14)
    return () => clearInterval(iv)
  }, [active])
  const cells = Array.from({ length: TOTAL }, (_, i) => {
    const v = Math.abs(Math.sin(i * 6.3 + 1.5) * Math.cos(i * 2.7 + 0.8))
    if (v > 0.72) return 4; if (v > 0.5) return 3; if (v > 0.28) return 2; if (v > 0.12) return 1; return 0
  })
  const COLORS = [
    'rgba(255,255,255,0.05)',
    'rgba(255,90,54,0.22)',
    'rgba(255,90,54,0.45)',
    'rgba(255,90,54,0.72)',
    C.energy,
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ width: 16, textAlign: 'center', fontSize: 8, color: C.t3, fontWeight: 500 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 4, gridTemplateColumns: `repeat(${DAYS}, 1fr)`, gridTemplateRows: `repeat(${WEEKS}, 1fr)` }}>
        {Array.from({ length: WEEKS }, (_, w) =>
          Array.from({ length: DAYS }, (_, d) => {
            const idx = w * DAYS + d
            return (
              <div key={`${w}-${d}`} style={{ width: 16, height: 16, borderRadius: 4, transition: 'all .2s', background: idx <= revealed ? COLORS[cells[idx]] : 'transparent' }} />
            )
          })
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ color: C.t3, fontSize: 9 }}>Menos</span>
        {COLORS.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 4, background: c }} />)}
        <span style={{ color: C.t3, fontSize: 9 }}>Mais</span>
      </div>
    </div>
  )
}

/* ─── constantes ──────────────────────────────────────────────────────────── */

const MARQUEE_ITEMS = [
  'Um app · três perfis', 'Sem WhatsApp no meio', 'Sono + Treino + Nutrição',
  'Personal conectado', 'Nutri com dados reais', 'Evolução visível',
  'Time sincronizado', 'Recuperação monitorada', 'Acompanhamento real',
]

/* ─── botões reutilizáveis ────────────────────────────────────────────────── */

function PrimaryBtn({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} className="kore-btn"
      style={{
        background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
        color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer',
        boxShadow: '0 8px 28px rgba(255,90,54,0.4)', fontFamily: JAKARTA,
        ...style,
      }}>
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} className="kore-btn"
      style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.2)',
        color: C.t1, fontWeight: 600, cursor: 'pointer', fontFamily: JAKARTA,
        ...style,
      }}>
      {children}
    </button>
  )
}

/* ─── página principal ────────────────────────────────────────────────────── */

export default function Landing() {
  const router = useRouter()
  const [vis, setVis] = useState(false)
  const [perfilTab, setPerfilTab] = useState<0 | 1 | 2>(0)
  const perfis = useInView(0.1)
  const visPerfis = useInView(0.08)
  const problema = useInView(0.2)
  const feat1 = useInView(0.15)
  const feat2 = useInView(0.15)
  const feat3 = useInView(0.15)
  const piloto = useInView(0.1)
  const como = useInView(0.1)

  useEffect(() => { const t = setTimeout(() => setVis(true), 80); return () => clearTimeout(t) }, [])

  const fadeUp = (on: boolean, delay = 0): React.CSSProperties => ({
    transition: `all .7s ease ${delay}ms`,
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0)' : 'translateY(24px)',
  })

  return (
    <main style={{ minHeight: '100vh', color: C.t1, overflowX: 'hidden', fontFamily: JAKARTA }}>
      <style>{`
        @keyframes kore-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes kore-shimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes kore-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes kore-ring { 0%{box-shadow:0 0 0 0 rgba(255,90,54,0.5)} 70%{box-shadow:0 0 0 10px rgba(255,90,54,0)} 100%{box-shadow:0 0 0 0 rgba(255,90,54,0)} }
        @keyframes kore-phone { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-16px) rotate(-3deg)} }
        @keyframes kore-floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes kore-floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
        .kore-marquee{animation:kore-marquee 28s linear infinite;display:flex}
        .kore-pulse{animation:kore-pulse 1.8s ease-in-out infinite}
        .kore-ring{animation:kore-ring 2s ease-out infinite}
        .kore-phone{animation:kore-phone 5s ease-in-out infinite}
        .kore-floatA{animation:kore-floatA 3.5s ease-in-out infinite}
        .kore-floatB{animation:kore-floatB 4.2s ease-in-out infinite .5s}
        .kore-btn{transition:transform .15s, box-shadow .2s, filter .2s}
        .kore-btn:hover{filter:brightness(1.08)}
        .kore-btn:active{transform:scale(0.96)}
        .kore-link{transition:color .2s}
        .kore-link:hover{color:#F5F6F8 !important}
        @media (min-width:640px){ .kore-row{flex-direction:row !important} }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(22,24,34,0.55)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em', background: `linear-gradient(135deg, #fff, ${C.energy})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KORE</span>
          <span style={{ fontSize: 9, color: C.energy, border: `1px solid ${C.energy}55`, background: `${C.energy}1a`, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Piloto</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.push('/login')} className="kore-link" style={{ color: C.t2, fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', fontFamily: JAKARTA }}>Entrar</button>
          <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')} style={{ fontSize: 13, padding: '9px 16px', borderRadius: 12 }}>Participar do piloto</PrimaryBtn>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 96, paddingBottom: 40, paddingLeft: 20, paddingRight: 20, overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1152, margin: '0 auto', width: '100%' }} className="kore-hero-grid">
          <style>{`
            .kore-hero-grid{display:grid;grid-template-columns:1fr;align-items:center;gap:48px}
            @media (min-width:980px){ .kore-hero-grid{grid-template-columns:1fr 1fr;gap:80px} }
            .kore-hero-h1{font-size:clamp(56px, 13vw, 120px)}
          `}</style>
          <div>
            <div style={fadeUp(vis)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${C.energy}4d`, background: `${C.energy}14`, borderRadius: 999, padding: '6px 16px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy }} className="kore-ring" />
                <span style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 700 }}>Em piloto · Brasil</span>
              </span>
            </div>

            <h1 className="kore-hero-h1" style={{ fontFamily: SORA, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.92, margin: '24px 0', ...fadeUp(vis, 100) }}>
              <span style={{
                background: `linear-gradient(135deg, #FFFFFF 35%, ${C.energy2} 75%, ${C.energy} 100%)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>KORE</span>
            </h1>

            <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 'clamp(26px, 4.5vw, 38px)', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20, ...fadeUp(vis, 160) }}>
              Treino. Nutrição. Recuperação.<br />
              <span style={{ color: C.energy }}>Tudo sincronizado.</span>
            </h2>

            <p style={{ color: C.t2, fontSize: 17, lineHeight: 1.6, marginBottom: 32, maxWidth: 420, ...fadeUp(vis, 220) }}>
              Atletas, personais e nutricionistas trabalhando juntos <strong style={{ color: C.t1, fontWeight: 700 }}>em tempo real.</strong> Um só app. O time inteiro alinhado.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, ...fadeUp(vis, 280) }} className="kore-row">
              <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')}
                style={{ flex: 1, padding: '16px 24px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Participar do piloto <IconArrow />
              </PrimaryBtn>
              <GhostBtn onClick={() => router.push('/login')}
                style={{ flex: 1, padding: '16px 24px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Entrar
              </GhostBtn>
            </div>

            <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12, ...fadeUp(vis, 360) }}>
              <span style={{ color: C.t3, fontSize: 13 }}>Em validação com atletas, personais e nutricionistas</span>
            </div>
          </div>

          {/* Phone + badges — layout estruturado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>

            {/* Coluna esquerda de badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-end' }}>
              <div className="kore-floatA">
                <BadgeChip Icon={IconHeart} color={C.energy} title="Score 85" sub="Recuperação ótima" delay={1000} visible={vis} />
              </div>
              <div className="kore-floatB">
                <BadgeChip Icon={IconDumbbell} color={C.energy2} title="Treino feito" sub="410 kcal · hoje" delay={1400} visible={vis} />
              </div>
            </div>

            {/* Telefone centralizado */}
            <div className="kore-phone">
              <PhoneMockup visible={vis} />
            </div>

            {/* Coluna direita de badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <div className="kore-floatB">
                <BadgeChip Icon={IconChart} color={C.sleep} title="HRV 68ms" sub="Acima da média" delay={1200} visible={vis} />
              </div>
              <div className="kore-floatA">
                <BadgeChip Icon={IconMoon} color={C.recovery} title="8.2h · Sono" sub="Sono profundo" delay={1600} visible={vis} />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
        <div className="kore-marquee" style={{ gap: 40 }}>
          {[...Array(2)].map((_, r) => (
            <span key={r} style={{ display: 'flex', gap: 40, flexShrink: 0, paddingRight: 40 }}>
              {MARQUEE_ITEMS.map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, color: C.t2, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy, flexShrink: 0 }} />
                  {t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* UM APP. TRÊS PERFIS                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={perfis.ref} style={{ position: 'relative', padding: '80px 20px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1024, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>O coração do produto</SectionLabel>
            <h2 style={{ fontFamily: SORA, fontSize: 'clamp(38px, 7vw, 60px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Um app.{' '}
              <span style={{ background: `linear-gradient(90deg, #fff, ${C.energy}, #fff, ${C.energy})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'kore-shimmer 4s linear infinite' }}>Três perfis.</span>
            </h2>
            <p style={{ color: C.t2, fontSize: 18, marginTop: 20, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Cada perfil acessa o que importa para ele. Todos trabalham com os mesmos dados.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              {
                sigla: 'AT', cor: C.energy, role: 'Atleta', Icon: IconBolt,
                headline: 'Veja tudo em um lugar.',
                desc: 'Sono, treino, nutrição e recuperação centralizados. Uma visão clara do seu dia — sem abrir vários apps.',
                items: ['Score de recuperação diário', 'Plano de treino do seu personal', 'Plano alimentar da sua nutri'],
                cta: 'Criar conta grátis', ctaNote: 'Gratuito para sempre · Sem cartão', primary: true,
              },
              {
                sigla: 'PT', cor: C.sleep, role: 'Personal Trainer', Icon: IconDumbbell,
                headline: 'Acompanhe com dados reais.',
                desc: 'Veja o sono, recuperação e bem-estar de cada aluno antes de prescrever. Sem depender de WhatsApp.',
                items: ['Toda sua carteira em um lugar', 'Alertas quando precisa de atenção', 'Agenda e histórico integrados'],
                cta: 'Trazer minha carteira', ctaNote: '14 dias grátis · Depois R$ 79/mês', primary: false,
              },
              {
                sigla: 'NU', cor: C.good, role: 'Nutricionista', Icon: IconLeaf,
                headline: 'Prescreva no contexto certo.',
                desc: 'Ajuste o plano com base em como o paciente está dormindo, treinando e se recuperando agora.',
                items: ['Sono e energia do paciente visíveis', 'Plano alimentar personalizado', 'Agenda de consultas integrada'],
                cta: 'Começar com pacientes', ctaNote: '14 dias grátis · Depois R$ 79/mês', primary: false,
              },
            ].map((p, idx) => (
              <div key={p.role} style={{ ...glass, padding: 24, display: 'flex', flexDirection: 'column', borderColor: `${p.cor}33`, ...fadeUp(perfis.inView, idx * 120) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${p.cor}55`, background: `${p.cor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.Icon size={22} color={p.cor} />
                  </div>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: SORA }}>{p.role}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, lineHeight: 1.3, color: p.cor, fontFamily: SORA }}>{p.headline}</p>
                <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 20, flex: 1 }}>{p.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {p.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={15} color={p.cor} /></span>
                      <p style={{ color: C.t1, fontSize: 14 }}>{item}</p>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => router.push('/login?modo=cadastro')} className="kore-btn"
                    style={{
                      width: '100%', fontSize: 14, fontWeight: 800, padding: 12, borderRadius: 12, cursor: 'pointer', fontFamily: JAKARTA,
                      ...(p.primary
                        ? { background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', border: 'none', boxShadow: '0 6px 20px rgba(255,90,54,0.35)' }
                        : { background: `${p.cor}1a`, color: p.cor, border: `1px solid ${p.cor}4d` }),
                    }}>
                    {p.cta} <IconArrow size={15} />
                  </button>
                  <p style={{ color: C.t3, fontSize: 10, textAlign: 'center', marginTop: 8 }}>{p.ctaNote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* O QUE CADA PERFIL VÊ                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={visPerfis.ref} style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel>O que cada perfil vê</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Três telas.<br /><span style={{ color: C.t2 }}>Um só contexto.</span>
          </h2>
          <p style={{ color: C.t2, fontSize: 16, marginTop: 16, maxWidth: 576, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Personal vê o sono do atleta. Nutri vê o treino. Atleta vê tudo junto. Os três trabalham com os <strong style={{ color: C.t1 }}>mesmos dados em tempo real</strong>.
          </p>
        </div>

        {/* Tabs mobile */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }} className="kore-tabs">
          <style>{`.kore-tabs{display:flex} @media(min-width:768px){.kore-tabs{display:none}}`}</style>
          {([
            { label: 'Atleta', cor: C.energy },
            { label: 'Personal', cor: C.sleep },
            { label: 'Nutricionista', cor: C.good },
          ] as const).map((t, i) => (
            <button key={i} onClick={() => setPerfilTab(i as 0 | 1 | 2)}
              style={{
                fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: JAKARTA,
                ...(perfilTab === i
                  ? { color: t.cor, border: `1px solid ${t.cor}66`, background: `${t.cor}1a` }
                  : { color: C.t3, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent' }),
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 16 }} className="kore-perfil-grid">
          <style>{`.kore-perfil-grid{grid-template-columns:1fr} @media(min-width:768px){.kore-perfil-grid{grid-template-columns:repeat(3,1fr)}}`}</style>

          {/* ── ATLETA ── */}
          <div style={{ display: perfilTab !== 0 ? undefined : 'flex', flexDirection: 'column', ...glass, overflow: 'hidden', borderColor: `${C.energy}26`, ...fadeUp(visPerfis.inView, 0) }} className={perfilTab !== 0 ? 'kore-hide-mobile' : ''}>
            <PerfilHeader Icon={IconBolt} sigla="AT" cor={C.energy} title="Atleta" sub="O que o atleta vê" />
            <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.energy}40`, background: `${C.energy}12` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ color: C.energy, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><IconBolt size={11} color={C.energy} /> Recuperação</p>
                  <span style={{ color: C.energy, fontSize: 12, fontWeight: 800, fontFamily: SORA }}>85</span>
                </div>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: SORA }}>Ótima — treine forte hoje</p>
                <p style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>HRV 68ms · Sono 8.2h</p>
              </div>
              <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.sleep}26`, background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: C.sleep, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><IconDumbbell size={11} color={C.sleep} /> Fase de treino</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: SORA }}>Força · Semana 1 de 4</p>
                <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: C.sleep, borderRadius: 999, width: '25%' }} />
                </div>
                <p style={{ color: C.t3, fontSize: 9, marginTop: 4 }}>Ciclo Verão 2026 · Personal: Rafael</p>
              </div>
              <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.good}26`, background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: C.good, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><IconLeaf size={11} color={C.good} /> Plano hoje</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: SORA }}>2.100 kcal · 180g prot</p>
                <p style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>Prescrito por Dra. Ana · Cutting</p>
              </div>
            </div>
            <PerfilFooter cor={C.energy} text="Treino, nutrição e recuperação num só lugar" />
          </div>

          {/* ── PERSONAL ── */}
          <div style={{ display: perfilTab !== 1 ? undefined : 'flex', flexDirection: 'column', ...glass, overflow: 'hidden', borderColor: `${C.sleep}26`, ...fadeUp(visPerfis.inView, 120) }} className={perfilTab !== 1 ? 'kore-hide-mobile' : ''}>
            <PerfilHeader Icon={IconDumbbell} sigla="PT" cor={C.sleep} title="Personal Trainer" sub="Dashboard de alunos" />
            <div style={{ padding: 16, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Meus alunos</p>
                <span style={{ color: C.sleep, fontSize: 9, fontWeight: 700 }}>3 ativos · 1 alerta</span>
              </div>
              {([
                { name: 'Pedro Santos', score: 85, sono: '8.2h', status: 'Pode treinar forte', cor: C.good },
                { name: 'Ana Lima', score: 42, sono: '5.1h', status: 'Moderar hoje', cor: C.energy2 },
                { name: 'Carlos Moura', score: 71, sono: '7.5h', status: 'Treino moderado', cor: '#FACC15' },
              ] as const).map((a, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 12, marginBottom: 8, border: `1px solid ${a.cor}33`, background: `${a.cor}10` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: SORA }}>{a.name}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: a.cor, fontFamily: SORA }}>{a.score}</span>
                  </div>
                  <p style={{ color: C.t3, fontSize: 9, display: 'flex', alignItems: 'center', gap: 4 }}><IconMoon size={9} color={C.t3} /> {a.sono} sono</p>
                  <p style={{ fontSize: 9, fontWeight: 600, marginTop: 2, color: a.cor }}>{a.status}</p>
                </div>
              ))}
            </div>
            <PerfilFooter cor={C.sleep} text="Prescreve baseado em dados reais, não em feeling" />
          </div>

          {/* ── NUTRICIONISTA ── */}
          <div style={{ display: perfilTab !== 2 ? undefined : 'flex', flexDirection: 'column', ...glass, overflow: 'hidden', borderColor: `${C.good}26`, ...fadeUp(visPerfis.inView, 240) }} className={perfilTab !== 2 ? 'kore-hide-mobile' : ''}>
            <PerfilHeader Icon={IconLeaf} sigla="NU" cor={C.good} title="Nutricionista" sub="Perfil do paciente" />
            <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.09)' }}>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: SORA }}>Pedro Santos</p>
                <span style={{ color: C.t3, fontSize: 9 }}>consulta: 12/mai</span>
              </div>
              <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.recovery}26`, background: `${C.recovery}10` }}>
                <p style={{ color: C.recovery, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><IconMoon size={11} color={C.recovery} /> Sono & recuperação</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: SORA }}>8.2h · Score 85 · HRV 68ms</p>
                <p style={{ color: C.good, fontSize: 9, marginTop: 2 }}>Recuperação ótima hoje</p>
              </div>
              <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.sleep}26`, background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: C.sleep, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><IconDumbbell size={11} color={C.sleep} /> Treino (via personal)</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: SORA }}>Fase Força · Sem 11 de 13</p>
                <p style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>3x/sem · volume alto esta semana</p>
              </div>
              <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.good}26`, background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: C.good, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><IconLeaf size={11} color={C.good} /> Plano ativo</p>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: SORA }}>2.100 kcal · déficit −700</p>
                <p style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>180g prot · Cutting</p>
              </div>
            </div>
            <PerfilFooter cor={C.good} text="Ajusta o plano sabendo o que o personal prescreveu" />
          </div>
        </div>
        <style>{`@media(max-width:767px){.kore-hide-mobile{display:none !important}}`}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* O PROBLEMA                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={problema.ref} style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>O problema</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Hoje, tudo está <br /><span style={{ color: C.t2 }}>espalhado.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 768, margin: '0 auto' }}>
          <div style={{ ...glass, padding: 28, borderColor: 'rgba(248,113,113,0.28)', ...fadeUp(problema.inView, 0) }}>
            <p style={{ color: '#F87171', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 20 }}>Sem o KORE</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['WhatsApp com o personal (mensagem perdida)', 'PDF de dieta no e-mail da nutri', 'Planilha de treino no Google Drive', 'App de sono separado (sem integração)', 'Personal não sabe que você dormiu mal', 'Nutri ajusta dieta sem saber do treino'].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ marginTop: 2, flexShrink: 0 }}><IconX size={15} /></span>
                  <p style={{ color: C.t2, fontSize: 14 }}>{t}</p>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ ...glass, padding: 28, borderColor: `${C.energy}40`, background: 'rgba(255,90,54,0.06)', ...fadeUp(problema.inView, 150) }}>
            <p style={{ color: C.energy, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 20 }}>Com o KORE</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Time conectado na mesma plataforma', 'Plano alimentar e de treino centralizados', 'Sono e recuperação visíveis para todos', 'Personal ajusta ao ver que você dormiu mal', 'Nutri adapta o plano com dados reais', 'Tudo em um lugar. Sem WhatsApp.'].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={15} color={C.energy} /></span>
                  <p style={{ color: C.t1, fontSize: 14 }}>{t}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FEATURES                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '40px 20px', maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SectionLabel>Como funciona na prática</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Dados reais.<br /><span style={{ color: C.t2 }}>Decisões melhores.</span>
          </h2>
        </div>

        {/* Feature 1 */}
        <div ref={feat1.ref} style={{ ...glass, overflow: 'hidden', ...fadeUp(feat1.inView, 0) }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <FeatTag Icon={IconTarget} color={C.energy} label="Recomendação diária" />
              <h3 style={{ fontFamily: SORA, fontSize: 'clamp(24px, 4vw, 30px)', fontWeight: 800, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Decisão do dia</h3>
              <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Toda manhã, a plataforma cruza dados de sono, recuperação e histórico para sugerir <strong style={{ color: C.t1 }}>o que faz mais sentido agora</strong> — treinar forte, moderar ou descansar.</p>
              <p style={{ color: C.t2, fontSize: 14, borderLeft: `2px solid ${C.energy}`, paddingLeft: 16 }}>Não é um dashboard genérico. É uma orientação prática.</p>
            </div>
            <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ width: '100%', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { cor: C.energy, label: 'Treinar forte hoje', sub: 'Score 85 · HRV ótimo · Sono 8.2h', active: true },
                  { cor: '#FACC15', label: 'Treino moderado', sub: 'Score 62 · Sono 6h', active: false },
                  { cor: '#F87171', label: 'Descanse hoje', sub: 'Score 38 · HRV baixo', active: false },
                ].map((d, i) => (
                  <div key={i} style={{ borderRadius: 14, padding: 16, border: `1px solid ${d.cor}${d.active ? '59' : '26'}`, background: `${d.cor}${d.active ? '1a' : '0d'}`, display: 'flex', alignItems: 'center', gap: 12, opacity: d.active ? 1 : 0.35 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.cor, flexShrink: 0 }} className={d.active ? 'kore-pulse' : ''} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: d.active ? d.cor : C.t3, fontFamily: SORA }}>{d.label}</p>
                      <p style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>{d.sub}</p>
                    </div>
                    {d.active && <IconArrow size={16} color={C.energy} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div ref={feat2.ref} style={{ ...glass, overflow: 'hidden', ...fadeUp(feat2.inView, 100) }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <p style={{ color: C.t3, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 500 }}>Histórico de treinos · 14 semanas</p>
                <WorkoutHeatmap active={feat2.inView} />
              </div>
            </div>
            <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <FeatTag Icon={IconChart} color={C.energy2} label="Evolução visível" />
              <h3 style={{ fontFamily: SORA, fontSize: 'clamp(24px, 4vw, 30px)', fontWeight: 800, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Padrões que você não veria sozinho.</h3>
              <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>O histórico se acumula ao longo do tempo. Cada quadrado é um dia. A cor, a intensidade. <strong style={{ color: C.t1 }}>Overtraining e consistência — visíveis com um olhar.</strong></p>
              <p style={{ color: C.t2, fontSize: 14, borderLeft: `2px solid ${C.energy2}`, paddingLeft: 16 }}>Personal e nutri veem o mesmo histórico do atleta.</p>
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div ref={feat3.ref} style={{ ...glass, overflow: 'hidden', ...fadeUp(feat3.inView, 200) }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <FeatTag Icon={IconMoon} color={C.recovery} label="Sono e recuperação" />
              <h3 style={{ fontFamily: SORA, fontSize: 'clamp(24px, 4vw, 30px)', fontWeight: 800, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Recuperação não é intuição.</h3>
              <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Score calculado com duração, HRV, sono profundo e REM. <strong style={{ color: C.t1 }}>Personal e nutri acessam esses dados</strong> para ajustar a prescrição no momento certo.</p>
              <p style={{ color: C.t2, fontSize: 14, borderLeft: `2px solid ${C.recovery}`, paddingLeft: 16 }}>Um dia mal dormido muda tudo. O KORE deixa isso visível para o time.</p>
            </div>
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ color: C.t3, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20, alignSelf: 'flex-start', fontWeight: 500 }}>Score de recuperação · 7 dias</p>
              <SleepChart active={feat3.inView} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 260, marginTop: 16 }}>
                {[
                  { v: '72', l: 'Dom', c: '#FACC15' }, { v: '58', l: 'Seg', c: C.energy2 },
                  { v: '85', l: 'Ter', c: C.energy }, { v: '67', l: 'Qua', c: '#FACC15' },
                  { v: '80', l: 'Qui', c: C.energy }, { v: '45', l: 'Sex', c: '#F87171' },
                  { v: '85', l: 'Sáb', c: C.energy },
                ].map(d => (
                  <div key={d.l} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: d.c, fontFamily: SORA }}>{d.v}</p>
                    <p style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>{d.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PILOTO                                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={piloto.ref} style={{ position: 'relative', padding: '80px 20px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 896, margin: '0 auto', textAlign: 'center' }}>
          <SectionLabel>Fase atual</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 24 }}>
            Em piloto com os <br />primeiros profissionais.
          </h2>
          <p style={{ color: C.t2, fontSize: 18, lineHeight: 1.6, marginBottom: 40, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
            Estamos validando o KORE com uma turma selecionada de atletas, personal trainers e nutricionistas. Os feedbacks estão moldando o produto agora.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
            {[
              { sigla: 'AT', Icon: IconBolt, cor: C.energy, role: 'Atletas', frase: '"Cansei de usar 3 apps diferentes para monitorar minha evolução."' },
              { sigla: 'PT', Icon: IconDumbbell, cor: C.sleep, role: 'Personal Trainers', frase: '"Quero acompanhar meus alunos com dados reais, não com WhatsApp."' },
              { sigla: 'NU', Icon: IconLeaf, cor: C.good, role: 'Nutricionistas', frase: '"Preciso ver o sono e treino do paciente antes de ajustar o plano."' },
            ].map((p, i) => (
              <div key={i} style={{ ...glass, padding: 24, textAlign: 'left', ...fadeUp(piloto.inView, i * 120) }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, border: `1px solid ${p.cor}4d`, background: `${p.cor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <p.Icon size={20} color={p.cor} />
                </div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 8, fontFamily: SORA }}>{p.role}</p>
                <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>{p.frase}</p>
              </div>
            ))}
          </div>

          <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 32px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Quero entrar no piloto <IconArrow />
          </PrimaryBtn>
          <p style={{ color: C.t3, fontSize: 12, marginTop: 16 }}>Vagas limitadas. Sem custo na fase de validação.</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COMO FUNCIONA                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={como.ref} style={{ position: 'relative', padding: '64px 20px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1024, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>Como funciona</SectionLabel>
            <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              Pronto em <br /><span style={{ color: C.t2 }}>60 segundos.</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto' }}>
            {[
              { n: '01', title: 'Crie sua conta', desc: 'Escolha seu perfil — atleta, personal trainer ou nutricionista. Sem cartão. Sem compromisso.', cor: C.energy },
              { n: '02', title: 'Conecte seu time', desc: 'O profissional envia um link de convite. O atleta aceita. Todos passam a ver os mesmos dados em tempo real.', cor: C.sleep },
              { n: '03', title: 'Acompanhe junto', desc: 'Cada um acessa o que importa para o seu perfil. Personal e nutri ajustam com base em dados reais. Atleta evolui com suporte real.', cor: C.recovery },
            ].map((s, i) => (
              <div key={s.n} style={{ ...glass, display: 'flex', gap: 20, padding: 24, ...fadeUp(como.inView, i * 120) }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${s.cor}59`, background: `${s.cor}1a`, color: s.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0, fontFamily: SORA }}>{s.n}</span>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 8, fontFamily: SORA }}>{s.title}</p>
                  <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PREÇOS                                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Preços simples</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Profissionais pagam.<br /><span style={{ color: C.energy }}>Atletas, nunca.</span>
          </h2>
          <p style={{ color: C.t3, fontSize: 14, marginTop: 16, maxWidth: 448, marginLeft: 'auto', marginRight: 'auto' }}>
            Quem tem ROI direto paga. Quem usa para evoluir, não.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 896, margin: '0 auto' }}>
          {/* Atleta */}
          <div style={{ ...glass, padding: 28, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: C.t3, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Atleta</p>
              <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', fontFamily: SORA }}>Grátis</span>
              <p style={{ color: C.t3, fontSize: 12, marginTop: 4 }}>Para sempre · Sem cartão</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {['Acesso ao app completo', 'Score de recuperação diário', 'Acompanhamento de treino e nutrição', 'Histórico e evolução', 'Conecta com seus profissionais'].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={15} color={C.energy} /></span>
                  <p style={{ color: C.t1, fontSize: 14 }}>{t}</p>
                </li>
              ))}
            </ul>
            <GhostBtn onClick={() => router.push('/login?modo=cadastro')} style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}>
              Criar conta grátis <IconArrow size={15} />
            </GhostBtn>
          </div>

          {/* Solo */}
          <div style={{ ...glass, padding: 28, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderColor: `${C.energy}40`, background: 'rgba(255,90,54,0.07)' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', filter: 'blur(60px)', opacity: 0.2, background: C.energy }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ color: C.t2, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Profissional Solo</p>
                <span style={{ fontSize: 9, color: C.energy, border: `1px solid ${C.energy}4d`, background: `${C.energy}1a`, borderRadius: 999, padding: '2px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Popular</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', fontFamily: SORA }}>R$ 79</span>
                <span style={{ color: C.t3, fontSize: 14 }}>/mês</span>
              </div>
              <p style={{ color: C.t3, fontSize: 12, marginBottom: 20 }}>14 dias grátis · Cancele quando quiser</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Toda sua carteira de clientes', 'Gestão de treinos ou nutrição', 'Agenda integrada', 'Histórico e evolução dos clientes', 'Suporte prioritário'].map(t => (
                  <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={15} color={C.energy} /></span>
                    <p style={{ color: C.t1, fontSize: 14 }}>{t}</p>
                  </li>
                ))}
              </ul>
              <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')} style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}>
                Começar 14 dias grátis <IconArrow size={15} />
              </PrimaryBtn>
            </div>
          </div>

          {/* Conectado */}
          <div style={{ ...glass, padding: 28, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: C.t3, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Profissional Conectado</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', fontFamily: SORA }}>R$ 129</span>
                <span style={{ color: C.t3, fontSize: 14 }}>/mês</span>
              </div>
              <p style={{ color: C.t3, fontSize: 12, marginTop: 4 }}>14 dias grátis · Cancele quando quiser</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {['Tudo do plano Solo', 'Colaboração com outros profissionais', 'Personal vê plano nutricional', 'Nutri vê treino e recuperação', 'O triângulo completo — diferencial exclusivo KORE'].map((t, i) => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={15} color={i >= 1 ? C.recovery : C.t3} /></span>
                  <p style={{ color: i >= 1 ? C.t1 : C.t2, fontSize: 14 }}>{t}</p>
                </li>
              ))}
            </ul>
            <button onClick={() => router.push('/login?modo=cadastro')} className="kore-btn"
              style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `1px solid ${C.recovery}4d`, background: `${C.recovery}1a`, color: C.recovery, fontFamily: JAKARTA }}>
              Começar 14 dias grátis <IconArrow size={15} />
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: C.t3, fontSize: 12, marginTop: 32 }}>
          Preços em fase piloto sujeitos a ajuste. Usuários do piloto garantem condições especiais.
        </p>
      </section>

      {/* ── LISTA DE ESPERA ── */}
      <ListaEspera />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CTA FINAL                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ ...glass, borderRadius: 28, position: 'relative', padding: 'clamp(40px, 8vw, 64px)', textAlign: 'center', overflow: 'hidden', borderColor: `${C.energy}40` }}>
          <div style={{ position: 'absolute', top: -96, left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.25, background: `radial-gradient(circle, ${C.energy}, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${C.energy}4d`, background: `${C.energy}14`, borderRadius: 999, padding: '8px 16px', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy }} className="kore-ring" />
              <span style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 700 }}>Vagas abertas · Piloto gratuito</span>
            </span>
            <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, marginBottom: 20, lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              Faça parte do piloto <br />do KORE.
            </h2>
            <p style={{ color: C.t2, fontSize: 16, lineHeight: 1.6, marginBottom: 32, maxWidth: 448, marginLeft: 'auto', marginRight: 'auto' }}>
              Estamos selecionando atletas, personal trainers e nutricionistas para validar o produto. Sem custo. Com acesso completo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }} className="kore-row">
              <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')} style={{ flex: 1, padding: '16px 24px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quero participar <IconArrow />
              </PrimaryBtn>
              <GhostBtn onClick={() => router.push('/login')} style={{ flex: 1, padding: '16px 24px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Já tenho conta
              </GhostBtn>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '32px 20px' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 16 }} className="kore-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 20, letterSpacing: '-0.04em', background: `linear-gradient(135deg, #fff, ${C.energy})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KORE</span>
            <span style={{ color: C.t3, fontSize: 12 }}>·</span>
            <span style={{ color: C.t3, fontSize: 12 }}>Treino, nutrição e recuperação conectados</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: C.t3, fontSize: 12 }}>© 2026 KORE — Em validação com os primeiros profissionais</p>
            <p style={{ color: C.t3, fontSize: 10, marginTop: 2 }}>Feito no Brasil</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

/* ─── sub-componentes auxiliares ──────────────────────────────────────────── */

function BadgeChip({ Icon, color, title, sub, delay, visible }: { Icon: React.FC<IconProps>; color: string; title: string; sub: string; delay: number; visible: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => { if (!visible) return; const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay, visible])
  return (
    <div style={{ transition: 'all .7s ease-out', opacity: show ? 1 : 0, transform: show ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(12px)' }}>
      <div style={{ borderRadius: 14, border: `1px solid ${color}44`, padding: '8px 12px', background: 'rgba(22,24,34,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}26`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
          <div>
            <p style={{ color, fontSize: 11, fontWeight: 800, lineHeight: 1, fontFamily: SORA }}>{title}</p>
            <p style={{ color: C.t2, fontSize: 9, marginTop: 2 }}>{sub}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PerfilHeader({ Icon, sigla, cor, title, sub }: { Icon: React.FC<IconProps>; sigla: string; cor: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 10, background: `${cor}1a`, border: `1px solid ${cor}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={cor} />
      </div>
      <div>
        <p style={{ color: '#fff', fontSize: 12, fontWeight: 800, fontFamily: SORA }}>{title}</p>
        <p style={{ color: C.t3, fontSize: 9 }}>{sub}</p>
      </div>
    </div>
  )
}

function PerfilFooter({ cor, text }: { cor: string; text: string }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <p style={{ color: `${cor}99`, fontSize: 9, borderLeft: `2px solid ${cor}40`, paddingLeft: 8, fontStyle: 'italic' }}>{text}</p>
    </div>
  )
}

function FeatTag({ Icon, color, label }: { Icon: React.FC<IconProps>; color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${color}4d`, background: `${color}1a`, borderRadius: 999, padding: '6px 12px', marginBottom: 20, width: 'fit-content' }}>
      <Icon size={13} color={color} />
      <span style={{ color, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>{label}</span>
    </span>
  )
}
