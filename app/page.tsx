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

/* ─── componentes visuais ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-emerald-500/80 text-xs uppercase tracking-[0.35em] font-semibold mb-4">{children}</p>
  )
}

function ListaEspera() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

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
    <section className="px-5 py-14 max-w-5xl mx-auto">
      <div className="max-w-lg mx-auto rounded-3xl border border-white/[0.08] p-8 sm:p-10 text-center"
        style={{ background: 'linear-gradient(145deg, #0d0f18 0%, #0a0c14 100%)' }}>
        <p className="text-emerald-500/80 text-xs uppercase tracking-[0.35em] font-semibold mb-3">Acesso antecipado</p>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
          Quer ser dos primeiros<br/>a usar o KORE?
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          Deixe seu email e avisamos quando as próximas vagas abrirem. Sem spam.
        </p>

        {status === 'done' ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 text-sm">✓</span>
            </div>
            <p className="text-emerald-400 font-semibold text-sm">Email confirmado! Te avisamos em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email" required
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 bg-white/[0.05] border border-white/[0.1] text-white placeholder-zinc-600 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button type="submit" disabled={status === 'loading'}
              className="bg-emerald-500 text-black font-black px-6 py-3.5 rounded-xl text-sm uppercase tracking-[0.08em] active:scale-95 hover:bg-emerald-400 transition-all disabled:opacity-60 whitespace-nowrap">
              {status === 'loading' ? 'Salvando...' : 'Entrar na lista →'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="text-red-400 text-xs mt-3">Erro ao salvar. Tente novamente.</p>}
      </div>
    </section>
  )
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.38
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#1a1f2e" strokeWidth={size * 0.11} fill="none"/>
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
      <div className="rounded-xl border border-white/[0.16] px-3 py-2 shadow-2xl"
        style={{ background: 'rgba(10,12,22,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
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
      <div className="absolute inset-[-30%] rounded-full blur-3xl opacity-[0.22]"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}/>
      <div className="relative w-[230px] rounded-[2.8rem] border border-white/[0.18] overflow-hidden"
        style={{ background: '#08091a', boxShadow: '0 60px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-20 h-5 rounded-full bg-black flex items-center justify-center gap-1.5 border border-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-zinc-800"/>
          </div>
        </div>
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-500 text-[7px] uppercase tracking-[0.2em]">Bom dia</p>
              <p className="text-white text-sm font-black tracking-tight">Pedro ✦</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-zinc-500 text-[7px]">ao vivo</p>
            </div>
          </div>
          <div className="rounded-2xl p-3.5 mb-2 border border-emerald-500/25 relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #0c1c14, #080d0b)' }}>
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-30"
              style={{ background: '#10b981' }}/>
            <div className="relative flex items-center justify-between mb-2.5">
              <div>
                <p className="text-emerald-400 text-[7px] uppercase tracking-widest font-semibold mb-0.5">Recuperação</p>
                <p className="text-white text-[11px] font-black leading-none">Boa — treine</p>
                <p className="text-white text-[11px] font-black leading-none">forte hoje</p>
                <p className="text-zinc-400 text-[7px] mt-1">HRV 68ms · Sono 8.2h</p>
              </div>
              <ScoreRing score={score} size={54}/>
            </div>
            <div className="h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${score}%`, transitionDelay: '800ms' }}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[
              { icon: '😴', label: 'Sono', val: '8.2h', sub: 'HRV 68ms', c: '' },
              { icon: '🏋️', label: 'Treino', val: '✓ Feito', sub: '410 kcal', c: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 border border-white/[0.08]" style={{ background: '#0d0f20' }}>
                <p className="text-zinc-500 text-[7px] uppercase tracking-wider mb-0.5">{s.icon} {s.label}</p>
                <p className={`text-[10px] font-black ${s.c || 'text-white'}`}>{s.val}</p>
                <p className="text-zinc-600 text-[7px]">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-3 border border-white/[0.08]" style={{ background: '#0d0f20' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-emerald-400 text-[7px] uppercase tracking-wider font-semibold">✦ Decisão do dia</p>
            </div>
            <p className="text-white text-[9px] font-black leading-snug">Treino de força máxima.</p>
            <p className="text-zinc-400 text-[7px] leading-relaxed mt-0.5">Recuperação ótima. Bata seu recorde hoje.</p>
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
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} className="overflow-visible">
      <defs>
        <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[30, 50, 70, 90].map(v => {
        const y = 8 + (1 - (v - 30) / 70) * (H - 16)
        return <line key={v} x1={10} y1={y} x2={W - 10} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>
      })}
      <path d={area} fill="url(#sleepGrad)"/>
      <path d={line} stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round"
        strokeDasharray="600" strokeDashoffset={drawn ? 0 : 600}
        style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)' }}/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#0a0c16" stroke="#10b981" strokeWidth="2"
            style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.3s ease ${0.9 + i * 0.08}s` }}/>
          <text x={p.x} y={H + 16} textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="system-ui,sans-serif">{days[i]}</text>
        </g>
      ))}
      {[{ label: '45', i: 5 }, { label: '85', i: 6 }].map(({ label, i }) => (
        <text key={label} x={pts[i].x} y={pts[i].y - 10} textAnchor="middle" fill="#10b981"
          fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif"
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
          <div key={d} className="w-4 text-center text-[8px] text-zinc-600 font-medium">{d}</div>
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
        <span className="text-zinc-500 text-[9px]">Menos</span>
        {COLORS.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`}/>)}
        <span className="text-zinc-500 text-[9px]">Mais</span>
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

/* ─── página principal ────────────────────────────────────────────────────── */

export default function Landing() {
  const router = useRouter()
  const [vis, setVis] = useState(false)
  const [perfilTab, setPerfilTab] = useState<0|1|2>(0)
  const perfis    = useInView(0.1)
  const visPerfis = useInView(0.08)
  const problema  = useInView(0.2)
  const feat1  = useInView(0.15)
  const feat2  = useInView(0.15)
  const feat3  = useInView(0.15)
  const piloto = useInView(0.1)
  const como   = useInView(0.1)

  useEffect(() => { const t = setTimeout(() => setVis(true), 80); return () => clearTimeout(t) }, [])

  return (
    <main className="min-h-screen text-white overflow-x-hidden" style={{ background: '#06070f' }}>
      <style>{`
        @keyframes orb-a { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(70px,-50px)scale(1.07)} 66%{transform:translate(-35px,30px)scale(0.95)} }
        @keyframes orb-b { 0%,100%{transform:translate(0,0)scale(1)} 40%{transform:translate(-80px,40px)scale(1.12)} 70%{transform:translate(45px,-20px)scale(0.92)} }
        @keyframes phone-float { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-16px) rotate(-3deg)} }
        @keyframes badge-float-a { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes badge-float-b { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes marquee-run { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 70%{box-shadow:0 0 0 10px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        @keyframes grain { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-1%,-2%)} 40%{transform:translate(2%,1%)} 60%{transform:translate(-2%,2%)} 80%{transform:translate(1%,-1%)} }
        .orb-a{animation:orb-a 16s ease-in-out infinite}
        .orb-b{animation:orb-b 20s ease-in-out infinite}
        .phone-float{animation:phone-float 5s ease-in-out infinite}
        .badge-float-a{animation:badge-float-a 3.5s ease-in-out infinite}
        .badge-float-b{animation:badge-float-b 4.2s ease-in-out infinite 0.5s}
        .marquee-run{animation:marquee-run 28s linear infinite;display:flex}
        .text-shimmer{background:linear-gradient(90deg,#fff 0%,#10b981 40%,#fff 60%,#10b981 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite}
        .pulse-ring{animation:pulse-ring 2s ease-out infinite}
        .grain-anim{animation:grain 0.4s steps(1) infinite}
      `}</style>

      {/* Grain */}
      <div className="grain-anim pointer-events-none fixed inset-0 z-[200] opacity-[0.025]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 512 512\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px', mixBlendMode: 'overlay' }}/>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 lg:px-10 py-4"
        style={{ background: 'rgba(6,7,15,0.93)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-xl tracking-[-0.05em]">KORE</span>
          <span className="text-[9px] text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 rounded-full px-2 py-0.5 uppercase tracking-widest font-bold">Piloto</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')} className="text-zinc-300 text-sm font-semibold hover:text-white transition-colors px-3 py-1.5">Entrar</button>
          <button onClick={() => router.push('/login?modo=cadastro')} className="bg-emerald-500 text-black text-sm font-black px-4 py-2 rounded-xl hover:bg-emerald-400 active:scale-95 transition-all">Participar do piloto</button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 pb-10 px-5 overflow-hidden">

        {/* Fundo foto */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80&auto=format&fit=crop"
            alt="" className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.25, filter: 'saturate(0.45) brightness(0.65)' }}/>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #06070f 20%, transparent 55%, #06070f 90%)' }}/>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 60%, #06070f 100%)' }}/>
        </div>

        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }}/>

        {/* Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-a absolute top-[10%] left-[-5%] w-[700px] h-[700px] rounded-full opacity-[0.12] blur-[100px]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}/>
          <div className="orb-b absolute bottom-[5%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.08] blur-[90px]"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}/>
        </div>

        <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-20">
          <div>
            <div className={`mb-6 transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/[0.08] rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring"/>
                <span className="text-emerald-400 text-[11px] uppercase tracking-[0.25em] font-bold">Em piloto · Brasil</span>
              </span>
            </div>

            <h1 className={`font-black tracking-[-0.04em] leading-none mb-6 transition-all duration-700 delay-100 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="block text-5xl sm:text-6xl leading-tight">Treino. Nutrição.<br />Recuperação.<br />Tudo sincronizado.</span>
            </h1>

            <p className={`text-zinc-300 text-base leading-relaxed mb-8 max-w-sm transition-all duration-700 delay-[200ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              Atletas e profissionais trabalhando juntos <strong className="text-white">em tempo real.</strong>
            </p>

            <div className={`flex flex-col sm:flex-row gap-3 max-w-sm transition-all duration-700 delay-[280ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <button onClick={() => router.push('/login?modo=cadastro')}
                className="flex-1 bg-emerald-500 text-black font-black px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-emerald-400">
                Quero participar do piloto →
              </button>
              <button onClick={() => router.push('/login')}
                className="flex-1 border border-white/[0.2] text-zinc-200 font-semibold px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/40 hover:text-white">
                Entrar
              </button>
            </div>

            <div className={`mt-8 flex items-center gap-3 transition-all duration-700 delay-[360ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="text-zinc-500 text-xs">Em validação com atletas, personais e nutricionistas</span>
            </div>
          </div>

          {/* Phone + badges */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative" style={{ width: 340, height: 520 }}>
              <div className="phone-float absolute left-1/2 -translate-x-1/2 top-10">
                <PhoneMockup visible={vis}/>
              </div>

              <FloatingBadge delay={1000} className="badge-float-a top-6 left-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center text-[10px]">💚</div>
                  <div>
                    <p className="text-emerald-400 text-[11px] font-black leading-none">Score 85</p>
                    <p className="text-zinc-400 text-[9px]">Recuperação ótima</p>
                  </div>
                </div>
              </FloatingBadge>

              <FloatingBadge delay={1200} className="badge-float-b top-32 right-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-400/20 flex items-center justify-center text-[10px]">📈</div>
                  <div>
                    <p className="text-blue-400 text-[11px] font-black leading-none">HRV 68ms</p>
                    <p className="text-zinc-400 text-[9px]">Acima da média</p>
                  </div>
                </div>
              </FloatingBadge>

              <FloatingBadge delay={1400} className="badge-float-a bottom-32 left-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center text-[10px]">🏋️</div>
                  <div>
                    <p className="text-orange-400 text-[11px] font-black leading-none">✓ Treino</p>
                    <p className="text-zinc-400 text-[9px]">410 kcal · hoje</p>
                  </div>
                </div>
              </FloatingBadge>

              <FloatingBadge delay={1600} className="badge-float-b bottom-20 right-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-400/20 flex items-center justify-center text-[10px]">😴</div>
                  <div>
                    <p className="text-violet-400 text-[11px] font-black leading-none">8.2h · Sono</p>
                    <p className="text-zinc-400 text-[9px]">Sono profundo ↑</p>
                  </div>
                </div>
              </FloatingBadge>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.07] py-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="marquee-run gap-10">
          {[...Array(2)].map((_, r) => (
            <span key={r} className="flex gap-10 flex-shrink-0 pr-10">
              {MARQUEE_ITEMS.map(t => (
                <span key={t} className="flex items-center gap-3 text-zinc-400 text-sm font-medium whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0"/>
                  {t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* UM APP. TRÊS PERFIS — o coração do produto (movido pra cima)      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={perfis.ref} className="relative px-5 py-20 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1920&q=80&auto=format&fit=crop"
          alt="" className="pointer-events-none absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.24, filter: 'saturate(0.45) brightness(0.55)' }}/>
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to bottom, #06070f 0%, transparent 15%, transparent 85%, #06070f 100%)' }}/>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>O coração do produto</SectionLabel>
            <h2 className="text-5xl sm:text-6xl font-black uppercase tracking-tight">
              Um app. <span className="text-shimmer">Três perfis.</span>
            </h2>
            <p className="text-zinc-300 text-lg mt-5 max-w-lg mx-auto">
              Cada perfil acessa o que importa para ele. Todos trabalham com os mesmos dados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              {
                sigla: 'AT', cor: 'emerald' as const, role: 'Atleta',
                headline: 'Veja tudo em um lugar.',
                desc: 'Sono, treino, nutrição e recuperação centralizados. Uma visão clara do seu dia — sem abrir vários apps.',
                items: ['Score de recuperação diário', 'Plano de treino do seu personal', 'Plano alimentar da sua nutri'],
              },
              {
                sigla: 'PT', cor: 'blue' as const, role: 'Personal Trainer',
                headline: 'Acompanhe com dados reais.',
                desc: 'Veja o sono, recuperação e bem-estar de cada aluno antes de prescrever. Sem depender de WhatsApp.',
                items: ['Dados de todos os alunos', 'Alertas quando precisa de atenção', 'Agenda e histórico integrados'],
              },
              {
                sigla: 'NU', cor: 'green' as const, role: 'Nutricionista',
                headline: 'Prescreva no contexto certo.',
                desc: 'Ajuste o plano com base em como o paciente está dormindo, treinando e se recuperando agora.',
                items: ['Sono e energia do paciente visíveis', 'Plano alimentar personalizado', 'Agenda de consultas integrada'],
              },
            ] as const).map(p => {
              const C = {
                emerald: { border: 'border-emerald-500/25', badge: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', dot: 'bg-emerald-400', head: 'text-emerald-400' },
                blue:    { border: 'border-blue-500/25',    badge: 'text-blue-400 border-blue-500/30 bg-blue-500/10',       dot: 'bg-blue-400',    head: 'text-blue-400' },
                green:   { border: 'border-green-500/25',   badge: 'text-green-400 border-green-500/30 bg-green-500/10',     dot: 'bg-green-400',   head: 'text-green-400' },
              }[p.cor]
              return (
                <div key={p.role} className={`rounded-2xl p-6 border ${C.border} flex flex-col`}
                  style={{ background: 'rgba(12,14,24,0.92)', backdropFilter: 'blur(12px)' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black ${C.badge}`}>{p.sigla}</div>
                    <span className="text-white font-bold text-base">{p.role}</span>
                  </div>
                  <p className={`font-bold text-base mb-3 leading-snug ${C.head}`}>{p.headline}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>
                  <ul className="space-y-2.5">
                    {p.items.map(item => (
                      <li key={item} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${C.dot} shrink-0 mt-1.5`}/>
                        <p className="text-zinc-300 text-sm">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* O QUE CADA PERFIL VÊ                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={visPerfis.ref} className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <SectionLabel>O que cada perfil vê</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
            Três telas.<br /><span className="text-zinc-400">Um só contexto.</span>
          </h2>
          <p className="text-zinc-400 text-base mt-4 max-w-xl mx-auto leading-relaxed">
            Personal vê o sono do atleta. Nutri vê o treino. Atleta vê tudo junto. Os três trabalham com os <strong className="text-white">mesmos dados em tempo real</strong>.
          </p>
        </div>

        {/* Tabs mobile */}
        <div className="flex md:hidden gap-2 mb-6 justify-center">
          {([
            { label: 'Atleta',        active: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 border' },
            { label: 'Personal',      active: 'text-blue-400 border-blue-500/40 bg-blue-500/10 border' },
            { label: 'Nutricionista', active: 'text-green-400 border-green-500/40 bg-green-500/10 border' },
          ] as const).map((t, i) => (
            <button key={i} onClick={() => setPerfilTab(i as 0|1|2)}
              className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${perfilTab === i ? t.active : 'text-zinc-500 border border-white/[0.08]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ── ATLETA ─────────────────────────────────────────────── */}
          <div className={`${perfilTab !== 0 ? 'hidden md:flex' : 'flex'} flex-col rounded-2xl border border-emerald-500/15 overflow-hidden transition-all duration-700 ${visPerfis.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ background: 'rgba(8,14,10,0.97)', transitionDelay: '0ms' }}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] font-black text-emerald-400">AT</div>
              <div>
                <p className="text-white text-xs font-black">Atleta</p>
                <p className="text-zinc-600 text-[9px]">O que o atleta vê</p>
              </div>
            </div>
            <div className="p-4 flex-1 space-y-2.5">
              <div className="rounded-xl p-3 border border-emerald-500/25" style={{ background: 'linear-gradient(135deg,#091a10,#060e09)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-emerald-400 text-[9px] uppercase tracking-widest font-bold">⚡ Recuperação</p>
                  <span className="text-emerald-400 text-xs font-black">85</span>
                </div>
                <p className="text-white text-[11px] font-black">Ótima — treine forte hoje</p>
                <p className="text-zinc-500 text-[9px] mt-0.5">HRV 68ms · Sono 8.2h</p>
              </div>
              <div className="rounded-xl p-3 border border-blue-500/15" style={{ background: '#080a16' }}>
                <p className="text-blue-400 text-[9px] uppercase tracking-widest font-bold mb-1.5">🏋️ Fase de treino</p>
                <p className="text-white text-[11px] font-bold">Força · Semana 1 de 4</p>
                <div className="mt-2 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: '25%' }} />
                </div>
                <p className="text-zinc-600 text-[9px] mt-1">Ciclo Verão 2026 · Personal: Rafael</p>
              </div>
              <div className="rounded-xl p-3 border border-orange-500/15" style={{ background: '#100c08' }}>
                <p className="text-orange-400 text-[9px] uppercase tracking-widest font-bold mb-1">🥗 Plano hoje</p>
                <p className="text-white text-[11px] font-bold">2.100 kcal · 180g prot</p>
                <p className="text-zinc-600 text-[9px] mt-0.5">Prescrito por Dra. Ana · Cutting</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="text-emerald-400/50 text-[9px] border-l-2 border-emerald-500/25 pl-2 italic">Treino, nutrição e recuperação num só lugar</p>
            </div>
          </div>

          {/* ── PERSONAL ────────────────────────────────────────────── */}
          <div className={`${perfilTab !== 1 ? 'hidden md:flex' : 'flex'} flex-col rounded-2xl border border-blue-500/15 overflow-hidden transition-all duration-700 ${visPerfis.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ background: 'rgba(8,10,18,0.97)', transitionDelay: '120ms' }}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] font-black text-blue-400">PT</div>
              <div>
                <p className="text-white text-xs font-black">Personal Trainer</p>
                <p className="text-zinc-600 text-[9px]">Dashboard de alunos</p>
              </div>
            </div>
            <div className="p-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-500 text-[9px] uppercase tracking-widest">Meus alunos</p>
                <span className="text-blue-400 text-[9px] font-bold">3 ativos · 1 alerta</span>
              </div>
              {([
                { name: 'Pedro Santos', score: 85, sono: '8.2h', status: 'Pode treinar forte',    dot: 'bg-emerald-400', ct: 'text-emerald-400', cb: 'border-emerald-500/20 bg-emerald-500/[0.07]' },
                { name: 'Ana Lima',     score: 42, sono: '5.1h', status: '⚠ Moderar hoje',       dot: 'bg-orange-400',  ct: 'text-orange-400',  cb: 'border-orange-500/20 bg-orange-500/[0.07]' },
                { name: 'Carlos Moura', score: 71, sono: '7.5h', status: 'Treino moderado',       dot: 'bg-yellow-400',  ct: 'text-yellow-400',  cb: 'border-yellow-500/20 bg-yellow-500/[0.07]' },
              ] as const).map((a, i) => (
                <div key={i} className={`rounded-xl p-3 mb-2 border ${a.cb}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-white text-[11px] font-bold">{a.name}</p>
                    <span className={`text-xs font-black ${a.ct}`}>{a.score}</span>
                  </div>
                  <p className="text-zinc-500 text-[9px]">😴 {a.sono} sono</p>
                  <p className={`text-[9px] font-semibold mt-0.5 ${a.ct}`}>{a.status}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <p className="text-blue-400/50 text-[9px] border-l-2 border-blue-500/25 pl-2 italic">Prescreve baseado em dados reais, não em feeling</p>
            </div>
          </div>

          {/* ── NUTRICIONISTA ────────────────────────────────────────── */}
          <div className={`${perfilTab !== 2 ? 'hidden md:flex' : 'flex'} flex-col rounded-2xl border border-green-500/15 overflow-hidden transition-all duration-700 ${visPerfis.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ background: 'rgba(8,12,10,0.97)', transitionDelay: '240ms' }}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[10px] font-black text-green-400">NU</div>
              <div>
                <p className="text-white text-xs font-black">Nutricionista</p>
                <p className="text-zinc-600 text-[9px]">Perfil do paciente</p>
              </div>
            </div>
            <div className="p-4 flex-1 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                <p className="text-white text-sm font-black">Pedro Santos</p>
                <span className="text-zinc-600 text-[9px]">consulta: 12/mai</span>
              </div>
              <div className="rounded-xl p-3 border border-violet-500/15" style={{ background: '#0c0914' }}>
                <p className="text-violet-400 text-[9px] uppercase tracking-widest font-bold mb-1">😴 Sono & recuperação</p>
                <p className="text-white text-[11px] font-bold">8.2h · Score 85 · HRV 68ms</p>
                <p className="text-emerald-400 text-[9px] mt-0.5">Recuperação ótima hoje</p>
              </div>
              <div className="rounded-xl p-3 border border-blue-500/15" style={{ background: '#08090f' }}>
                <p className="text-blue-400 text-[9px] uppercase tracking-widest font-bold mb-1">🏋️ Treino (via personal)</p>
                <p className="text-white text-[11px] font-bold">Fase Força · Sem 11 de 13</p>
                <p className="text-zinc-500 text-[9px] mt-0.5">3x/sem · volume alto esta semana</p>
              </div>
              <div className="rounded-xl p-3 border border-orange-500/15" style={{ background: '#100c08' }}>
                <p className="text-orange-400 text-[9px] uppercase tracking-widest font-bold mb-1">🥗 Plano ativo</p>
                <p className="text-white text-[11px] font-bold">2.100 kcal · déficit −700</p>
                <p className="text-zinc-500 text-[9px] mt-0.5">180g prot · Cutting</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="text-green-400/50 text-[9px] border-l-2 border-green-500/25 pl-2 italic">Ajusta o plano sabendo exatamente o que o personal prescreveu</p>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* O PROBLEMA QUE RESOLVEMOS                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={problema.ref} className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel>O problema</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
            Hoje, tudo está<br /><span className="text-zinc-400">espalhado.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Antes */}
          <div className={`rounded-2xl p-7 border border-red-500/20 transition-all duration-700 ${problema.inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
            style={{ background: 'rgba(12,14,24,0.9)' }}>
            <p className="text-red-400 text-xs uppercase tracking-widest font-bold mb-5">Sem o KORE</p>
            <ul className="space-y-3">
              {[
                'WhatsApp com o personal (mensagem perdida)',
                'PDF de dieta no e-mail da nutri',
                'Planilha de treino no Google Drive',
                'App de sono separado (sem integração)',
                'Personal não sabe que você dormiu mal',
                'Nutri ajusta dieta sem saber do treino',
              ].map(t => (
                <li key={t} className="flex items-start gap-3">
                  <span className="text-red-400 mt-0.5 text-xs shrink-0">✕</span>
                  <p className="text-zinc-400 text-sm">{t}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Depois */}
          <div className={`rounded-2xl p-7 border border-emerald-500/25 transition-all duration-700 delay-150 ${problema.inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            style={{ background: 'rgba(10,20,14,0.9)' }}>
            <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold mb-5">Com o KORE</p>
            <ul className="space-y-3">
              {[
                'Time conectado na mesma plataforma',
                'Plano alimentar e de treino centralizados',
                'Sono e recuperação visíveis para todos',
                'Personal ajusta ao ver que você dormiu mal',
                'Nutri adapta o plano com dados reais',
                'Tudo em um lugar. Sem WhatsApp.',
              ].map(t => (
                <li key={t} className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 text-xs shrink-0">✓</span>
                  <p className="text-zinc-200 text-sm">{t}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FEATURES                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="px-5 py-10 max-w-5xl mx-auto space-y-5">
        <div className="text-center mb-14">
          <SectionLabel>Como funciona na prática</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
            Dados reais.<br /><span className="text-zinc-400">Decisões melhores.</span>
          </h2>
        </div>

        {/* Feature 1: Decisão do dia */}
        <div ref={feat1.ref} className={`rounded-3xl border border-white/[0.07] overflow-hidden transition-all duration-700 ${feat1.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ background: '#0c0e18' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-3 py-1.5 mb-5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">🎯 Recomendação diária</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-tight">Decisão do dia</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">Toda manhã, a plataforma cruza dados de sono, recuperação e histórico para sugerir <strong className="text-white">o que faz mais sentido agora</strong> — treinar forte, moderar ou descansar.</p>
              <p className="text-zinc-400 text-sm border-l-2 border-emerald-500/40 pl-4">Não é um dashboard genérico. É uma orientação prática.</p>
            </div>
            <div className="p-8 flex items-center justify-center border-t md:border-t-0 md:border-l border-white/[0.06] relative overflow-hidden" style={{ background: '#0a0c16' }}>
              <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80&auto=format&fit=crop"
                alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.20]"
                style={{ filter: 'saturate(0.35) brightness(0.55)' }}/>
              <div className="relative w-full max-w-[260px] space-y-3">
                {[
                  { cor: 'border-emerald-500/35 bg-emerald-500/[0.1]', dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Treinar forte hoje', sub: 'Score 85 · HRV ótimo · Sono 8.2h', active: true },
                  { cor: 'border-yellow-500/25 bg-yellow-500/[0.06]', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Treino moderado', sub: 'Score 62 · Sono 6h', active: false },
                  { cor: 'border-red-500/25 bg-red-500/[0.05]', dot: 'bg-red-400', text: 'text-red-400', label: 'Descanse hoje', sub: 'Score 38 · HRV baixo', active: false },
                ].map((d, i) => (
                  <div key={i} className={`rounded-xl p-4 border flex items-center gap-3 ${d.cor} ${!d.active ? 'opacity-30' : ''}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${d.dot} shrink-0 ${d.active ? 'animate-pulse' : ''}`}/>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${d.active ? d.text : 'text-zinc-500'}`}>{d.label}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{d.sub}</p>
                    </div>
                    {d.active && <span className="text-emerald-400 font-bold">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Heatmap */}
        <div ref={feat2.ref} className={`rounded-3xl border border-white/[0.07] overflow-hidden transition-all duration-700 delay-100 ${feat2.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ background: '#0c0e18' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 flex items-center justify-center order-2 md:order-1 border-t md:border-t-0 md:border-r border-white/[0.06]" style={{ background: '#0a0c16' }}>
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4 font-medium">Histórico de treinos · 14 semanas</p>
                <WorkoutHeatmap active={feat2.inView}/>
              </div>
            </div>
            <div className="p-8 lg:p-10 flex flex-col justify-center order-1 md:order-2">
              <span className="inline-flex items-center gap-2 border border-orange-500/30 bg-orange-500/10 rounded-full px-3 py-1.5 mb-5 w-fit">
                <span className="text-orange-400 text-[10px] uppercase tracking-widest font-bold">📊 Evolução visível</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-tight">Padrões que você não veria sozinho.</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">O histórico se acumula ao longo do tempo. Cada quadrado é um dia. A cor, a intensidade. <strong className="text-white">Overtraining e consistência — visíveis com um olhar.</strong></p>
              <p className="text-zinc-400 text-sm border-l-2 border-orange-500/40 pl-4">Personal e nutri veem o mesmo histórico do atleta.</p>
            </div>
          </div>
        </div>

        {/* Feature 3: Sono */}
        <div ref={feat3.ref} className={`rounded-3xl border border-white/[0.07] overflow-hidden transition-all duration-700 delay-200 ${feat3.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ background: '#0c0e18' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-violet-500/30 bg-violet-500/10 rounded-full px-3 py-1.5 mb-5 w-fit">
                <span className="text-violet-400 text-[10px] uppercase tracking-widest font-bold">😴 Sono e recuperação</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-tight">Recuperação não é intuição.</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">Score calculado com duração, HRV, sono profundo e REM. <strong className="text-white">Personal e nutri acessam esses dados</strong> para ajustar a prescrição no momento certo.</p>
              <p className="text-zinc-400 text-sm border-l-2 border-violet-500/40 pl-4">Um dia mal dormido muda tudo. O KORE deixa isso visível para o time.</p>
            </div>
            <div className="p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/[0.06]" style={{ background: '#0a0c16' }}>
              <p className="text-zinc-400 text-xs uppercase tracking-widest mb-5 self-start font-medium">Score de recuperação · 7 dias</p>
              <SleepChart active={feat3.inView}/>
              <div className="flex items-center justify-between w-full max-w-[260px] mt-4">
                {[
                  { v: '72', l: 'Dom', c: 'text-yellow-400' }, { v: '58', l: 'Seg', c: 'text-orange-400' },
                  { v: '85', l: 'Ter', c: 'text-emerald-400' }, { v: '67', l: 'Qua', c: 'text-yellow-400' },
                  { v: '80', l: 'Qui', c: 'text-emerald-400' }, { v: '45', l: 'Sex', c: 'text-red-400' },
                  { v: '85', l: 'Sáb', c: 'text-emerald-400' },
                ].map(d => (
                  <div key={d.l} className="text-center">
                    <p className={`text-xs font-black ${d.c}`}>{d.v}</p>
                    <p className="text-zinc-500 text-[9px] mt-0.5">{d.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PILOTO — em vez de depoimentos fictícios                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={piloto.ref} className="relative px-5 py-20 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80&auto=format&fit=crop"
          alt="" className="pointer-events-none absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.26, filter: 'saturate(0.4) brightness(0.55)' }}/>
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to bottom, #06070f 0%, transparent 15%, transparent 85%, #06070f 100%)' }}/>

        <div className="relative max-w-4xl mx-auto text-center">
          <SectionLabel>Fase atual</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-6">
            Em piloto com os<br />primeiros profissionais.
          </h2>
          <p className="text-zinc-300 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Estamos validando o KORE com uma turma selecionada de atletas, personal trainers e nutricionistas. Os feedbacks estão moldando o produto agora.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { sigla: 'AT', cor: 'emerald', role: 'Atletas', frase: '"Cansei de usar 3 apps diferentes para monitorar minha evolução."' },
              { sigla: 'PT', cor: 'blue',    role: 'Personal Trainers', frase: '"Quero acompanhar meus alunos com dados reais, não com WhatsApp."' },
              { sigla: 'NU', cor: 'green',   role: 'Nutricionistas', frase: '"Preciso ver o sono e treino do paciente antes de ajustar o plano."' },
            ].map((p, i) => {
              const C = {
                emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                blue:    'text-blue-400 border-blue-500/30 bg-blue-500/10',
                green:   'text-green-400 border-green-500/30 bg-green-500/10',
              }[p.cor] ?? ''
              return (
                <div key={i}
                  className={`rounded-2xl p-6 border border-white/[0.09] text-left transition-all duration-700 ${piloto.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ background: 'rgba(12,14,24,0.92)', backdropFilter: 'blur(12px)', transitionDelay: `${i * 120}ms` }}>
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-black mb-4 ${C}`}>{p.sigla}</div>
                  <p className="text-white font-bold text-sm mb-2">{p.role}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed italic">{p.frase}</p>
                </div>
              )
            })}
          </div>

          <button onClick={() => router.push('/login?modo=cadastro')}
            className="inline-flex items-center gap-3 bg-emerald-500 text-black font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-emerald-400">
            Quero entrar no piloto →
          </button>
          <p className="text-zinc-600 text-xs mt-4">Vagas limitadas. Sem custo na fase de validação.</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COMO FUNCIONA                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={como.ref} className="relative px-5 py-16 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1920&q=80&auto=format&fit=crop"
          alt="" className="pointer-events-none absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.24, filter: 'saturate(0.45) brightness(0.55)' }}/>
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to bottom, #06070f 0%, transparent 15%, transparent 85%, #06070f 100%)' }}/>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Como funciona</SectionLabel>
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
              Pronto em<br /><span className="text-zinc-400">60 segundos.</span>
            </h2>
          </div>
          <div className="space-y-4 max-w-2xl mx-auto">
            {[
              { n: '01', title: 'Crie sua conta', desc: 'Escolha seu perfil — atleta, personal trainer ou nutricionista. Sem cartão. Sem compromisso.', cor: 'text-emerald-400 border-emerald-500/35 bg-emerald-500/10' },
              { n: '02', title: 'Conecte seu time', desc: 'O profissional envia um link de convite. O atleta aceita. Todos passam a ver os mesmos dados em tempo real.', cor: 'text-blue-400 border-blue-500/35 bg-blue-500/10' },
              { n: '03', title: 'Acompanhe junto', desc: 'Cada um acessa o que importa para o seu perfil. Personal e nutri ajustam com base em dados reais. Atleta evolui com suporte real.', cor: 'text-violet-400 border-violet-500/35 bg-violet-500/10' },
            ].map((s, i) => (
              <div key={s.n}
                className={`flex gap-5 p-6 rounded-2xl border border-white/[0.08] transition-all duration-700 ${como.inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                style={{ background: 'rgba(12,14,24,0.9)', backdropFilter: 'blur(8px)', transitionDelay: `${i * 120}ms` }}>
                <span className={`w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-black shrink-0 ${s.cor}`}>{s.n}</span>
                <div>
                  <p className="text-white font-bold text-base mb-2">{s.title}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LISTA DE ESPERA                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <ListaEspera />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CTA FINAL                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="relative rounded-3xl border border-emerald-500/25 p-10 sm:p-16 text-center overflow-hidden">
          <img src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&q=80&auto=format&fit=crop"
            alt="" className="absolute inset-0 w-full h-full object-cover rounded-3xl"
            style={{ opacity: 0.32, filter: 'saturate(0.5) brightness(0.5)' }}/>
          <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(145deg, rgba(8,22,16,0.96), rgba(6,8,14,0.92))' }}/>
          <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[100px] opacity-[0.2]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}/>
          <div className="relative">
            <span className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-4 py-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring"/>
              <span className="text-emerald-400 text-[11px] uppercase tracking-[0.25em] font-bold">Vagas abertas · Piloto gratuito</span>
            </span>
            <h2 className="text-4xl sm:text-5xl font-black mb-5 leading-tight uppercase tracking-tight">
              Faça parte do piloto<br />do KORE.
            </h2>
            <p className="text-zinc-300 text-base leading-relaxed mb-8 max-w-md mx-auto">
              Estamos selecionando atletas, personal trainers e nutricionistas para validar o produto. Sem custo. Com acesso completo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <button onClick={() => router.push('/login?modo=cadastro')}
                className="flex-1 bg-emerald-500 text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-emerald-400">
                Quero participar →
              </button>
              <button onClick={() => router.push('/login')}
                className="flex-1 border border-white/[0.2] text-zinc-200 font-semibold py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/40 hover:text-white">
                Já tenho conta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-5 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-white font-black text-xl tracking-[-0.05em]">KORE</span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-500 text-xs">Treino, nutrição e recuperação conectados</span>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-zinc-500 text-xs">© 2026 KORE — Em validação com os primeiros profissionais</p>
            <p className="text-zinc-600 text-[10px] mt-0.5">Feito no Brasil 🇧🇷</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
