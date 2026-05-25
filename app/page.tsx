'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

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

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return val
}

/* ─── componentes visuais ─────────────────────────────────────────────────── */

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.38
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#1c1c1c" strokeWidth={size * 0.11} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke="#10b981" strokeWidth={size * 0.11} fill="none"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"
        transform={`rotate(-90, ${size/2}, ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.25,1,0.5,1)' }}/>
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.24} fontWeight="900" fontFamily="system-ui,sans-serif">{score}</text>
    </svg>
  )
}

function FloatingBadge({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className={`absolute transition-all duration-700 ease-out ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-3'} ${className ?? ''}`}>
      <div className="rounded-xl border border-white/[0.12] px-3 py-2 shadow-2xl"
        style={{ background: 'rgba(11,11,11,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        {children}
      </div>
    </div>
  )
}

function PhoneMockup({ visible }: { visible: boolean }) {
  const [score, setScore] = useState(0)
  useEffect(() => { if (!visible) return; const t = setTimeout(() => setScore(85), 700); return () => clearTimeout(t) }, [visible])
  return (
    <div className={`relative transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: '350ms' }}>
      {/* glow central */}
      <div className="absolute inset-[-30%] rounded-full blur-3xl opacity-[0.16]"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}/>
      <div className="relative w-[230px] rounded-[2.8rem] border border-white/[0.16] overflow-hidden"
        style={{ background: '#0b0b0b', boxShadow: '0 60px 120px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
        {/* Dynamic island */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-20 h-5 rounded-full bg-black flex items-center justify-center gap-1.5 border border-white/[0.05]">
            <div className="w-2 h-2 rounded-full bg-zinc-800"/>
          </div>
        </div>
        {/* App content */}
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-600 text-[7px] uppercase tracking-[0.2em]">Bom dia</p>
              <p className="text-white text-sm font-black tracking-tight">Pedro ✦</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-zinc-600 text-[7px]">ao vivo</p>
            </div>
          </div>
          {/* Recovery card */}
          <div className="rounded-2xl p-3.5 mb-2 border border-emerald-500/25 relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #0c1c14, #080d0b)' }}>
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-25"
              style={{ background: '#10b981' }}/>
            <div className="relative flex items-center justify-between mb-2.5">
              <div>
                <p className="text-emerald-400 text-[7px] uppercase tracking-widest font-semibold mb-0.5">Recuperação</p>
                <p className="text-white text-[11px] font-black leading-none">Boa — treine</p>
                <p className="text-white text-[11px] font-black leading-none">forte hoje</p>
                <p className="text-zinc-500 text-[7px] mt-1">HRV 68ms · Sono 8.2h</p>
              </div>
              <ScoreRing score={score} size={54}/>
            </div>
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${score}%`, transitionDelay: '800ms' }}/>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[
              { icon: '😴', label: 'Sono', val: '8.2h', sub: 'HRV 68ms', c: '' },
              { icon: '🏋️', label: 'Treino', val: '✓ Feito', sub: '410 kcal', c: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 border border-white/[0.06]" style={{ background: '#111' }}>
                <p className="text-zinc-600 text-[7px] uppercase tracking-wider mb-0.5">{s.icon} {s.label}</p>
                <p className={`text-[10px] font-black ${s.c || 'text-white'}`}>{s.val}</p>
                <p className="text-zinc-700 text-[7px]">{s.sub}</p>
              </div>
            ))}
          </div>
          {/* AI decision */}
          <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: '#111' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-emerald-400 text-[7px] uppercase tracking-wider font-semibold">✦ Decisão do dia · IA</p>
            </div>
            <p className="text-white text-[9px] font-black leading-snug">Treino de força máxima.</p>
            <p className="text-zinc-500 text-[7px] leading-relaxed mt-0.5">Recuperação ótima. Bata seu recorde hoje.</p>
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
    <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} className="overflow-visible">
      <defs>
        <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[30, 50, 70, 90].map(v => {
        const y = 8 + (1 - (v - 30) / 70) * (H - 16)
        return <line key={v} x1={10} y1={y} x2={W - 10} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>
      })}
      <path d={area} fill="url(#sleepGrad)"/>
      <path d={line} stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round"
        strokeDasharray="600" strokeDashoffset={drawn ? 0 : 600}
        style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)' }}/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#0b0b0b" stroke="#10b981" strokeWidth="1.5"
            style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.3s ease ${0.9 + i * 0.08}s` }}/>
          <text x={p.x} y={H + 14} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="system-ui,sans-serif">{days[i]}</text>
        </g>
      ))}
      {/* Score labels */}
      {[{ v: 45, label: '45', i: 5 }, { v: 85, label: '85', i: 6 }].map(({ label, i }) => (
        <text key={label} x={pts[i].x} y={pts[i].y - 8} textAnchor="middle" fill="#10b981"
          fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif"
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
  const COLORS = ['bg-white/[0.05]', 'bg-emerald-900/60', 'bg-emerald-700/70', 'bg-emerald-500/85', 'bg-emerald-400']
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {['D','S','T','Q','Q','S','S'].map(d => (
          <div key={d} className="w-4 text-center text-[7px] text-zinc-700 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)`, gridTemplateRows: `repeat(${WEEKS}, 1fr)` }}>
        {Array.from({ length: WEEKS }, (_, w) =>
          Array.from({ length: DAYS }, (_, d) => {
            const idx = w * DAYS + d
            return (
              <div key={`${w}-${d}`} className={`w-4 h-4 rounded-sm transition-all duration-200 ${idx <= revealed ? COLORS[cells[idx]] : 'bg-transparent'}`}/>
            )
          })
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-zinc-700 text-[8px]">Menos</span>
        {COLORS.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`}/>)}
        <span className="text-zinc-700 text-[8px]">Mais</span>
      </div>
    </div>
  )
}

/* ─── constantes ──────────────────────────────────────────────────────────── */

const MARQUEE_ITEMS = [
  'Score de Recuperação', 'Decisão do Dia por IA', 'Sono & HRV Real',
  'Treino Personalizado', 'Plano Alimentar com IA', 'Agenda Integrada',
  'Time Conectado', 'Evolução Completa', 'Bem-estar Diário', 'Alertas em Tempo Real',
]

const DEPOIMENTOS = [
  {
    quote: 'Antes eu achava que meu treino estava bom. O KORE mostrou que eu treinava no limite errado — meu HRV caía toda semana e eu nem sabia.',
    nome: 'Pedro M.', cargo: 'Atleta · Crossfit · SP', avatar: 'P', cor: 'emerald',
  },
  {
    quote: 'Consigo ajustar o plano de vários pacientes com base nos dados reais de sono deles. É outro nível de acompanhamento — sem depender de WhatsApp.',
    nome: 'Carolina R.', cargo: 'Nutricionista · RJ', avatar: 'C', cor: 'green',
  },
  {
    quote: 'Meus alunos que registram o sono têm menos episódios de overtraining. Os dados falam mais alto que qualquer feeling.',
    nome: 'Marcos T.', cargo: 'Personal Trainer · Campinas', avatar: 'M', cor: 'blue',
  },
]

/* ─── página principal ────────────────────────────────────────────────────── */

export default function Landing() {
  const router = useRouter()
  const [vis, setVis] = useState(false)
  const stats  = useInView(0.3)
  const feat1  = useInView(0.15)
  const feat2  = useInView(0.15)
  const feat3  = useInView(0.15)
  const testi  = useInView(0.1)
  const n1 = useCountUp(89, stats.inView, 1400)
  const n2 = useCountUp(3, stats.inView, 700)
  const n3 = useCountUp(4, stats.inView, 1000)

  useEffect(() => { const t = setTimeout(() => setVis(true), 80); return () => clearTimeout(t) }, [])

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <style>{`
        @keyframes orb-a { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(70px,-50px)scale(1.07)} 66%{transform:translate(-35px,30px)scale(0.95)} }
        @keyframes orb-b { 0%,100%{transform:translate(0,0)scale(1)} 40%{transform:translate(-80px,40px)scale(1.12)} 70%{transform:translate(45px,-20px)scale(0.92)} }
        @keyframes orb-c { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(30px,60px)scale(1.05)} }
        @keyframes phone-float { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-16px) rotate(-3deg)} }
        @keyframes badge-float-a { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes badge-float-b { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes marquee-run { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 70%{box-shadow:0 0 0 10px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        .orb-a{animation:orb-a 16s ease-in-out infinite}
        .orb-b{animation:orb-b 20s ease-in-out infinite}
        .orb-c{animation:orb-c 12s ease-in-out infinite}
        .phone-float{animation:phone-float 5s ease-in-out infinite}
        .badge-float-a{animation:badge-float-a 3.5s ease-in-out infinite}
        .badge-float-b{animation:badge-float-b 4.2s ease-in-out infinite 0.5s}
        .marquee-run{animation:marquee-run 28s linear infinite;display:flex}
        .text-shimmer{background:linear-gradient(90deg,#fff 0%,#10b981 40%,#fff 60%,#10b981 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite}
        .pulse-ring{animation:pulse-ring 2s ease-out infinite}
      `}</style>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 lg:px-10 py-4"
        style={{ background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-xl tracking-[-0.05em]">KORE</span>
          <span className="text-[8px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5 uppercase tracking-widest font-semibold">Beta</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')} className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors px-3 py-1.5">Entrar</button>
          <button onClick={() => router.push('/login?modo=cadastro')} className="bg-white text-black text-sm font-black px-4 py-2 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all">Criar conta</button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-20 pb-10 px-5 overflow-hidden">
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }}/>

        {/* Animated orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-a absolute top-[10%] left-[-5%] w-[700px] h-[700px] rounded-full opacity-[0.05] blur-[100px]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}/>
          <div className="orb-b absolute bottom-[5%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[90px]"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}/>
          <div className="orb-c absolute top-[50%] left-[40%] w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[80px]"
            style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}/>
        </div>

        <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-20">

          {/* Texto */}
          <div>
            <div className={`mb-6 transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/[0.07] rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring"/>
                <span className="text-emerald-400 text-[10px] uppercase tracking-[0.25em] font-semibold">Performance integrada · Brasil</span>
              </span>
            </div>

            <h1 className={`font-black tracking-[-0.06em] leading-none mb-5 transition-all duration-700 delay-100 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="block text-[5.5rem] sm:text-[6.5rem]" style={{ textShadow: '0 0 80px rgba(16,185,129,0.1)' }}>KORE</span>
              <span className="block text-2xl sm:text-3xl text-zinc-300 font-bold tracking-normal mt-1">O sistema operacional<br />do seu corpo.</span>
            </h1>

            <p className={`text-zinc-500 text-base leading-relaxed mb-8 max-w-sm transition-all duration-700 delay-[200ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              Atleta, personal trainer e nutricionista na mesma plataforma. A IA analisa sono, HRV e bem-estar para gerar a <strong className="text-zinc-200">decisão exata</strong> do que fazer a cada dia.
            </p>

            <div className={`flex flex-col sm:flex-row gap-3 max-w-sm transition-all duration-700 delay-[280ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <button onClick={() => router.push('/login?modo=cadastro')}
                className="flex-1 bg-white text-black font-black px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-100">
                Começar grátis →
              </button>
              <button onClick={() => router.push('/login')}
                className="flex-1 border border-white/[0.12] text-zinc-300 font-semibold px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/25 hover:text-white">
                Entrar
              </button>
            </div>

            {/* Social proof */}
            <div className={`mt-8 flex items-center gap-4 transition-all duration-700 delay-[360ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <div className="flex -space-x-2">
                {[{ l: 'A', bg: '#10b981' }, { l: 'M', bg: '#3b82f6' }, { l: 'P', bg: '#8b5cf6' }, { l: 'C', bg: '#f97316' }].map((x, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#080808] flex items-center justify-center text-[9px] font-black text-white" style={{ background: x.bg }}>{x.l}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  {[...Array(5)].map((_, i) => <div key={i} className="w-2.5 h-2.5 text-yellow-400 text-[10px]">★</div>)}
                </div>
                <p className="text-zinc-500 text-xs">Atletas e profissionais ativos</p>
              </div>
            </div>
          </div>

          {/* Phone + floating badges */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative" style={{ width: 340, height: 520 }}>
              {/* Phone */}
              <div className="phone-float absolute left-1/2 -translate-x-1/2 top-10">
                <PhoneMockup visible={vis}/>
              </div>

              {/* Floating badge: Score */}
              <FloatingBadge delay={1000} className="badge-float-a top-6 left-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center text-[10px]">💚</div>
                  <div>
                    <p className="text-emerald-400 text-[10px] font-black leading-none">Score 85</p>
                    <p className="text-zinc-600 text-[8px]">Recuperação ótima</p>
                  </div>
                </div>
              </FloatingBadge>

              {/* Floating badge: HRV */}
              <FloatingBadge delay={1200} className="badge-float-b top-32 right-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-400/20 flex items-center justify-center text-[10px]">📈</div>
                  <div>
                    <p className="text-blue-400 text-[10px] font-black leading-none">HRV 68ms</p>
                    <p className="text-zinc-600 text-[8px]">Acima da média</p>
                  </div>
                </div>
              </FloatingBadge>

              {/* Floating badge: Treino */}
              <FloatingBadge delay={1400} className="badge-float-a bottom-32 left-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center text-[10px]">🏋️</div>
                  <div>
                    <p className="text-orange-400 text-[10px] font-black leading-none">✓ Treino</p>
                    <p className="text-zinc-600 text-[8px]">410 kcal · hoje</p>
                  </div>
                </div>
              </FloatingBadge>

              {/* Floating badge: Sono */}
              <FloatingBadge delay={1600} className="badge-float-b bottom-20 right-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-400/20 flex items-center justify-center text-[10px]">😴</div>
                  <div>
                    <p className="text-violet-400 text-[10px] font-black leading-none">8.2h</p>
                    <p className="text-zinc-600 text-[8px]">Sono profundo ↑</p>
                  </div>
                </div>
              </FloatingBadge>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.05] py-4 overflow-hidden">
        <div className="marquee-run gap-10">
          {[...Array(2)].map((_, r) => (
            <span key={r} className="flex gap-10 flex-shrink-0 pr-10">
              {MARQUEE_ITEMS.map(t => (
                <span key={t} className="flex items-center gap-3 text-zinc-600 text-sm font-medium whitespace-nowrap">
                  <span className="w-1 h-1 rounded-full bg-emerald-500/50 shrink-0"/>
                  {t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section ref={stats.ref} className="px-5 py-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-3xl overflow-hidden border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {[
            { n: n1, sfx: '%', label: 'dos usuários relatam melhora na recuperação nas primeiras semanas', sub: 'baseado em dados de sono e HRV' },
            { n: n2, sfx: ' em 1', label: 'profissões diferentes conectadas na mesma plataforma em tempo real', sub: 'atleta · personal · nutricionista' },
            { n: n3, sfx: ' dim.', label: 'dimensões monitoradas diariamente para gerar a decisão do dia', sub: 'sono · treino · nutrição · bem-estar' },
          ].map((s, i) => (
            <div key={i} className="p-8 flex flex-col gap-3" style={{ background: '#0f0f0f' }}>
              <p className="text-[3.8rem] font-black tracking-tight leading-none">
                {s.n}<span className="text-emerald-400 text-[2.5rem]">{s.sfx}</span>
              </p>
              <div>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.label}</p>
                <p className="text-zinc-700 text-[10px] mt-1 uppercase tracking-wider">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3 PERFIS ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">Para quem é</p>
          <h2 className="text-4xl font-black">Um app. <span className="text-shimmer">Três perspectivas.</span></h2>
          <p className="text-zinc-500 text-sm mt-3 max-w-sm mx-auto">Cada perfil tem acesso ao que importa para ele — sem informação de menos, sem sobrecarga.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { sigla: 'AT', cor: 'emerald' as const, role: 'Atleta', headline: 'Saiba exatamente o que fazer hoje.', desc: 'Receba a decisão do dia gerada por IA com base no seu sono, HRV e bem-estar real. Sem achismo.', items: ['Decisão do dia personalizada', 'Score de recuperação diário', 'Plano de treino e dieta do seu time'] },
            { sigla: 'PT', cor: 'blue' as const,    role: 'Personal Trainer', headline: 'Monitore todos em tempo real.', desc: 'Veja o sono, recuperação e bem-estar de cada aluno antes de prescrever qualquer coisa.', items: ['Dashboard com dados de todos os alunos', 'Alertas quando aluno precisa de atenção', 'Agenda e histórico integrados'] },
            { sigla: 'NU', cor: 'green' as const,   role: 'Nutricionista', headline: 'Prescreva com dados reais.', desc: 'Crie planos alimentares que fazem sentido para o momento atual do paciente — não para um perfil genérico.', items: ['Vê sono, treino e energia do paciente', 'Plano alimentar com IA ou totalmente manual', 'Agenda de consultas integrada'] },
          ] as const).map(p => {
            const C = {
              emerald: { border: 'border-emerald-500/20', badge: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10', dot: 'bg-emerald-400' },
              blue:    { border: 'border-blue-500/20',    badge: 'text-blue-400 border-blue-500/25 bg-blue-500/10',       dot: 'bg-blue-400' },
              green:   { border: 'border-green-500/20',   badge: 'text-green-400 border-green-500/25 bg-green-500/10',     dot: 'bg-green-400' },
            }[p.cor]
            return (
              <div key={p.role} className={`rounded-2xl p-6 border ${C.border} flex flex-col`} style={{ background: '#0f0f0f' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black ${C.badge}`}>{p.sigla}</div>
                  <span className="text-white font-bold">{p.role}</span>
                </div>
                <p className="text-white font-bold text-base mb-2 leading-snug">{p.headline}</p>
                <p className="text-zinc-500 text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>
                <ul className="space-y-2.5">
                  {p.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${C.dot} shrink-0 mt-1.5`}/>
                      <p className="text-zinc-400 text-sm">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-5xl mx-auto space-y-5">
        <div className="text-center mb-12">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">O diferencial</p>
          <h2 className="text-4xl font-black">Inteligência real.<br /><span className="text-zinc-500">Não só números.</span></h2>
        </div>

        {/* Feature 1: Decisão do dia */}
        <div ref={feat1.ref} className={`rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-700 ${feat1.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 rounded-full px-3 py-1 mb-4 w-fit">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-emerald-400 text-[9px] uppercase tracking-widest font-semibold">IA proprietária</span>
              </span>
              <h3 className="text-2xl font-black mb-3">Decisão do dia</h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-3">Toda manhã, nossa IA cruza dados de sono, HRV, bem-estar e histórico de treino para gerar <strong className="text-zinc-200">uma recomendação concreta</strong> — treinar forte, moderado ou descansar.</p>
              <p className="text-zinc-700 text-xs border-l-2 border-emerald-500/30 pl-3">Não é um dashboard genérico. É uma decisão.</p>
            </div>
            <div className="p-8 flex items-center justify-center border-t md:border-t-0 md:border-l border-white/[0.04]" style={{ background: '#0a0a0a' }}>
              <div className="w-full max-w-[240px] space-y-2.5">
                {[
                  { cor: 'border-emerald-500/30 bg-emerald-500/[0.08]', dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Treinar forte hoje', sub: 'Score 85 · HRV ótimo · Sono 8.2h', active: true },
                  { cor: 'border-yellow-500/20 bg-yellow-500/[0.05]', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Treino moderado', sub: 'Score 62 · Sono 6h', active: false },
                  { cor: 'border-red-500/20 bg-red-500/[0.04]', dot: 'bg-red-400', text: 'text-red-400', label: 'Descanse hoje', sub: 'Score 38 · HRV baixo', active: false },
                ].map((d, i) => (
                  <div key={i} className={`rounded-xl p-3.5 border flex items-center gap-3 ${d.cor} ${!d.active ? 'opacity-35' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${d.dot} shrink-0 ${d.active ? 'animate-pulse' : ''}`}/>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${d.active ? d.text : 'text-zinc-500'}`}>{d.label}</p>
                      <p className="text-zinc-600 text-[10px] mt-0.5">{d.sub}</p>
                    </div>
                    {d.active && <span className="text-emerald-400 text-xs">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Evolução / Heatmap */}
        <div ref={feat2.ref} className={`rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-700 delay-100 ${feat2.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 flex items-center justify-center order-2 md:order-1 border-t md:border-t-0 md:border-r border-white/[0.04]" style={{ background: '#0a0a0a' }}>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-3">Histórico de treinos · 14 semanas</p>
                <WorkoutHeatmap active={feat2.inView}/>
              </div>
            </div>
            <div className="p-8 flex flex-col justify-center order-1 md:order-2">
              <span className="inline-flex items-center gap-2 border border-orange-500/25 bg-orange-500/10 rounded-full px-3 py-1 mb-4 w-fit">
                <span className="text-orange-400 text-[9px] uppercase tracking-widest font-semibold">📈 Evolução real</span>
              </span>
              <h3 className="text-2xl font-black mb-3">Veja onde você estava. Veja onde está.</h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-3">O histórico de treinos, recuperação e hábitos se acumula ao longo do tempo. Cada quadrado é um dia. A cor, a intensidade. <strong className="text-zinc-200">Padrões que você não veria sozinho.</strong></p>
              <p className="text-zinc-700 text-xs border-l-2 border-orange-500/30 pl-3">Overtraining, subrecuperação e consistência — visíveis com um olhar.</p>
            </div>
          </div>
        </div>

        {/* Feature 3: Score de sono + chart */}
        <div ref={feat3.ref} className={`rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-700 delay-200 ${feat3.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-violet-500/25 bg-violet-500/10 rounded-full px-3 py-1 mb-4 w-fit">
                <span className="text-violet-400 text-[9px] uppercase tracking-widest font-semibold">😴 Score de sono</span>
              </span>
              <h3 className="text-2xl font-black mb-3">Recuperação não é intuição.</h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-3">Score de recuperação calculado com duração, HRV, sono profundo e REM. A IA usa esses dados para calibrar <strong className="text-zinc-200">toda a prescrição do dia</strong> — do treino à dieta.</p>
              <p className="text-zinc-700 text-xs border-l-2 border-violet-500/30 pl-3">Um dia mal dormido muda tudo. O KORE percebe antes de você.</p>
            </div>
            <div className="p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/[0.04]" style={{ background: '#0a0a0a' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-4 self-start">Score de recuperação · últimos 7 dias</p>
              <SleepChart active={feat3.inView}/>
              <div className="flex items-center justify-between w-full max-w-[260px] mt-4">
                {[
                  { v: '72', l: 'Dom', c: 'text-yellow-400' },
                  { v: '58', l: 'Seg', c: 'text-orange-400' },
                  { v: '85', l: 'Ter', c: 'text-emerald-400' },
                  { v: '67', l: 'Qua', c: 'text-yellow-400' },
                  { v: '80', l: 'Qui', c: 'text-emerald-400' },
                  { v: '45', l: 'Sex', c: 'text-red-400' },
                  { v: '85', l: 'Sáb', c: 'text-emerald-400' },
                ].map(d => (
                  <div key={d.l} className="text-center">
                    <p className={`text-[10px] font-black ${d.c}`}>{d.v}</p>
                    <p className="text-zinc-700 text-[7px]">{d.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ───────────────────────────────────────────────────── */}
      <section ref={testi.ref} className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">Quem usa</p>
          <h2 className="text-4xl font-black">Resultados reais.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEPOIMENTOS.map((d, i) => {
            const C = { emerald: 'bg-emerald-500 border-emerald-500/30', green: 'bg-green-500 border-green-500/30', blue: 'bg-blue-500 border-blue-500/30' }[d.cor]
            return (
              <div key={i} className={`rounded-2xl p-6 border border-white/[0.06] flex flex-col gap-4 transition-all duration-700 ${testi.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ background: '#0f0f0f', transitionDelay: `${i * 100}ms` }}>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, s) => <span key={s} className="text-yellow-400 text-xs">★</span>)}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed flex-1">"{d.quote}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                  <div className={`w-8 h-8 rounded-xl ${C} flex items-center justify-center text-[10px] font-black text-white`}>{d.avatar}</div>
                  <div>
                    <p className="text-white text-sm font-bold">{d.nome}</p>
                    <p className="text-zinc-600 text-xs">{d.cargo}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">Como funciona</p>
          <h2 className="text-4xl font-black">Simples de começar.<br /><span className="text-zinc-500">Poderoso na prática.</span></h2>
        </div>
        <div className="space-y-3 max-w-2xl mx-auto">
          {[
            { n: '01', title: 'Crie sua conta em 60 segundos', desc: 'Escolha seu perfil — atleta, personal trainer ou nutricionista. Sem cartão de crédito. Sem compromisso.', cor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
            { n: '02', title: 'Conecte seu time de profissionais', desc: 'O profissional envia um link de convite. O atleta aceita. Todos passam a ver os mesmos dados em tempo real — sem WhatsApp no meio.', cor: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
            { n: '03', title: 'A IA trabalha — você executa', desc: 'Cada manhã, a IA analisa tudo e entrega a decisão do dia. Personal e nutri ajustam a prescrição com base em dados reais. Atleta executa com confiança.', cor: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
          ].map(s => (
            <div key={s.n} className="flex gap-5 p-6 rounded-2xl border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${s.cor}`}>{s.n}</span>
              <div>
                <p className="text-white font-bold text-base mb-1">{s.title}</p>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CREDIBILIDADE TÉCNICA ─────────────────────────────────────────── */}
      <section className="px-5 py-12 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-white/[0.05] p-6" style={{ background: '#0d0d0d' }}>
          <p className="text-zinc-600 text-[9px] uppercase tracking-[0.3em] text-center mb-6">Tecnologia que sustenta</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { nome: 'Supabase', desc: 'Banco de dados & Auth', icon: '🔒', badge: 'Segurança enterprise' },
              { nome: 'Anthropic Claude', desc: 'IA de decisões', icon: '🧠', badge: 'Modelo de ponta' },
              { nome: 'Vercel', desc: 'Infraestrutura global', icon: '⚡', badge: 'Edge computing' },
              { nome: 'Next.js 14', desc: 'Performance máxima', icon: '🚀', badge: 'App Router' },
            ].map(t => (
              <div key={t.nome} className="text-center p-4 rounded-xl border border-white/[0.04]" style={{ background: '#111' }}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <p className="text-white text-sm font-bold">{t.nome}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5">{t.desc}</p>
                <span className="inline-block mt-2 text-[8px] text-zinc-600 border border-white/[0.06] rounded-full px-2 py-0.5">{t.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="relative rounded-3xl border border-emerald-500/20 p-10 sm:p-16 text-center overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0a1c13, #080c0a)' }}>
          {/* Dot grid inside CTA */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[100px] opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}/>
          <div className="relative">
            <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring"/>
              <span className="text-emerald-400 text-[10px] uppercase tracking-[0.25em] font-semibold">Gratuito para começar</span>
            </span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
              Pronto para treinar<br />com inteligência real?
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed mb-8 max-w-sm mx-auto">
              Crie sua conta e comece hoje. Seu primeiro score de recuperação vai mudar como você pensa sobre treino.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xs mx-auto">
              <button onClick={() => router.push('/login?modo=cadastro')}
                className="flex-1 bg-white text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-100">
                Criar conta grátis →
              </button>
              <button onClick={() => router.push('/login')}
                className="flex-1 border border-white/[0.12] text-zinc-300 font-semibold py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/25 hover:text-white">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-5 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-xl tracking-[-0.05em]">KORE</span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-zinc-700 text-xs">Performance integrada</span>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-zinc-700 text-xs">© 2026 KORE — Todos os direitos reservados</p>
            <p className="text-zinc-800 text-[10px] mt-0.5">Feito no Brasil 🇧🇷 para atletas e profissionais</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
