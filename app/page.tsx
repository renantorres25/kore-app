'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
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
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return val
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.38
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f1f1f" strokeWidth={size * 0.11} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#10b981" strokeWidth={size * 0.11} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.25,1,0.5,1)' }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.24} fontWeight="900" fontFamily="system-ui,sans-serif">{score}</text>
    </svg>
  )
}

function PhoneMockup({ visible }: { visible: boolean }) {
  const [score, setScore] = useState(0)
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setScore(85), 600)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div className={`relative transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: '400ms' }}>
      <div className="absolute inset-[-20%] rounded-full blur-3xl opacity-[0.18]"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      <div className="relative w-[220px] rounded-[2.8rem] border border-white/[0.14] overflow-hidden shadow-2xl"
        style={{ background: '#0c0c0c', boxShadow: '0 50px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)' }}>

        {/* Notch */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-16 h-4 rounded-full bg-black border border-white/[0.06]" />
        </div>

        {/* App content */}
        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-600 text-[7px] uppercase tracking-[0.2em]">Bom dia</p>
              <p className="text-white text-sm font-black tracking-tight">Pedro</p>
            </div>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[9px] font-black text-emerald-400">P</div>
          </div>

          {/* Recovery card */}
          <div className="rounded-2xl p-3 mb-2 border border-emerald-500/25 relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #0c1a13, #090e0c)' }}>
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30"
              style={{ background: '#10b981' }} />
            <div className="relative flex items-center justify-between mb-2">
              <div>
                <p className="text-emerald-400 text-[7px] uppercase tracking-widest font-semibold">Recuperação</p>
                <p className="text-white text-[10px] font-black mt-0.5">Boa — treine forte</p>
                <p className="text-zinc-500 text-[7px] mt-0.5">HRV 68ms · Sono 8.2h</p>
              </div>
              <ScoreRing score={score} size={52} />
            </div>
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${score}%`, transitionDelay: '600ms' }} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[
              { icon: '😴', label: 'Sono', val: '8.2h', sub: 'HRV 68ms', color: '' },
              { icon: '🏋️', label: 'Treino', val: '✓ Feito', sub: '410 kcal', color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 border border-white/[0.06]" style={{ background: '#111' }}>
                <p className="text-zinc-600 text-[7px] uppercase tracking-wider mb-0.5">{s.icon} {s.label}</p>
                <p className={`text-[10px] font-black ${s.color || 'text-white'}`}>{s.val}</p>
                <p className="text-zinc-700 text-[7px]">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* IA decision */}
          <div className="rounded-xl p-2.5 border border-white/[0.06]" style={{ background: '#111' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-emerald-400 text-[7px] uppercase tracking-wider font-semibold">✦ Decisão do dia · IA</p>
            </div>
            <p className="text-white text-[9px] font-black leading-snug">Treino de força máxima hoje.</p>
            <p className="text-zinc-500 text-[7px] leading-relaxed mt-0.5">Recuperação ótima. Aproveite e bata recordes.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const MARQUEE_ITEMS = [
  'Score de Recuperação', 'Decisão do Dia por IA', 'Sono & HRV Real',
  'Treino Personalizado', 'Plano Alimentar com IA', 'Agenda Integrada',
  'Time Conectado', 'Evolução Completa', 'Bem-estar Diário',
]

export default function Landing() {
  const router = useRouter()
  const [vis, setVis] = useState(false)
  const stats = useInView(0.3)
  const n1 = useCountUp(89, stats.inView, 1400)
  const n2 = useCountUp(2, stats.inView, 700)
  const n3 = useCountUp(4, stats.inView, 1000)
  const feat1 = useInView(0.15)
  const feat2 = useInView(0.15)
  const feat3 = useInView(0.15)

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <style>{`
        @keyframes orb-drift-a {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(60px,-40px) scale(1.06); }
          66% { transform: translate(-30px,25px) scale(0.96); }
        }
        @keyframes orb-drift-b {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(-70px,30px) scale(1.1); }
          70% { transform: translate(40px,-15px) scale(0.93); }
        }
        @keyframes phone-float {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-14px) rotate(-3deg); }
        }
        @keyframes marquee-run {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .orb-a { animation: orb-drift-a 14s ease-in-out infinite; }
        .orb-b { animation: orb-drift-b 18s ease-in-out infinite; }
        .phone-float { animation: phone-float 5s ease-in-out infinite; }
        .marquee-run { animation: marquee-run 24s linear infinite; display:flex; }
        .text-shimmer {
          background: linear-gradient(90deg, #fff 0%, #10b981 40%, #fff 60%, #10b981 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-white font-black text-xl tracking-[-0.05em]">KORE</span>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')}
            className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors px-3 py-1.5">
            Entrar
          </button>
          <button onClick={() => router.push('/login?modo=cadastro')}
            className="bg-white text-black text-sm font-black px-4 py-2 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all">
            Criar conta
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-20 px-5">

        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-a absolute top-[15%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[80px]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
          <div className="orb-b absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[80px]"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
          <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full opacity-[0.025] blur-[60px]"
            style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />
        </div>

        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 items-center gap-16">

          {/* Left: texto */}
          <div>
            {/* Badge */}
            <div className={`mb-7 transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/[0.07] rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[10px] uppercase tracking-[0.25em] font-semibold">Performance integrada · Brasil</span>
              </span>
            </div>

            {/* Logo */}
            <div className={`mb-3 transition-all duration-700 delay-100 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <h1 className="text-[6rem] font-black tracking-[-0.06em] leading-none select-none"
                style={{ textShadow: '0 0 100px rgba(16,185,129,0.1)' }}>
                KORE
              </h1>
            </div>

            {/* Tagline */}
            <div className={`mb-4 transition-all duration-700 delay-[180ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <p className="text-2xl font-bold text-zinc-200 leading-tight">
                O sistema operacional<br />do seu corpo.
              </p>
            </div>

            {/* Description */}
            <div className={`mb-8 transition-all duration-700 delay-[260ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <p className="text-zinc-500 text-base leading-relaxed max-w-sm">
                Atleta, personal trainer e nutricionista na mesma plataforma. A IA analisa sono, HRV e bem-estar para gerar a <strong className="text-zinc-300">decisão exata</strong> do que fazer a cada dia.
              </p>
            </div>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row gap-3 max-w-sm transition-all duration-700 delay-[340ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <button onClick={() => router.push('/login?modo=cadastro')}
                className="flex-1 bg-white text-black font-black px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-100">
                Começar grátis →
              </button>
              <button onClick={() => router.push('/login')}
                className="flex-1 border border-white/[0.12] text-zinc-300 font-semibold px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/25 hover:text-white">
                Já tenho conta
              </button>
            </div>

            {/* Social proof */}
            <div className={`mt-7 flex items-center gap-3 transition-all duration-700 delay-[420ms] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <div className="flex -space-x-2">
                {[
                  { l: 'A', bg: 'bg-emerald-500' }, { l: 'M', bg: 'bg-blue-500' },
                  { l: 'P', bg: 'bg-violet-500' },  { l: 'R', bg: 'bg-orange-500' },
                ].map((x, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${x.bg} border-2 border-[#080808] flex items-center justify-center text-[9px] font-black text-white`}>{x.l}</div>
                ))}
              </div>
              <div>
                <p className="text-zinc-400 text-xs font-semibold">Atletas e profissionais ativos</p>
                <p className="text-zinc-700 text-[10px]">crescendo todo dia</p>
              </div>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="phone-float">
              <PhoneMockup visible={vis} />
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.05] py-4 overflow-hidden">
        <div className="marquee-run gap-10">
          {[...Array(2)].map((_, repeat) => (
            <span key={repeat} className="flex gap-10 flex-shrink-0 pr-10">
              {MARQUEE_ITEMS.map(t => (
                <span key={t} className="flex items-center gap-3 text-zinc-600 text-sm font-medium whitespace-nowrap">
                  <span className="w-1 h-1 rounded-full bg-emerald-500/60 shrink-0" />
                  {t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section ref={stats.ref} className="px-5 py-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.05] rounded-3xl overflow-hidden border border-white/[0.06]">
          {[
            { val: n1, suffix: '%', desc: 'dos usuários relatam melhora na recuperação nas primeiras semanas de uso' },
            { val: n2, suffix: ' em 1', desc: 'profissões diferentes — personal, nutricionista e atleta — na mesma plataforma' },
            { val: n3, suffix: ' dim.', desc: 'dimensões monitoradas em tempo real: sono, treino, nutrição e bem-estar' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col justify-between p-8" style={{ background: '#0f0f0f' }}>
              <p className="text-[3.5rem] font-black tracking-tight leading-none text-white mb-3">
                {s.val}<span className="text-emerald-400">{s.suffix}</span>
              </p>
              <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRÊS PERFIS ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">Para quem é o KORE</p>
          <h2 className="text-4xl font-black leading-tight">
            Um app.<br />
            <span className="text-shimmer">Três perspectivas.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            {
              sigla: 'AT', cor: 'emerald', role: 'Atleta',
              headline: 'Saiba exatamente o que fazer hoje.',
              desc: 'Receba a decisão do dia gerada por IA com base no seu sono, HRV e bem-estar. Sem achismo.',
              items: ['Decisão do dia personalizada', 'Score de recuperação real', 'Plano de treino e dieta do seu time'],
            },
            {
              sigla: 'PT', cor: 'blue', role: 'Personal Trainer',
              headline: 'Monitore todos em tempo real.',
              desc: 'Veja o sono, recuperação e treino de cada aluno antes de prescrever qualquer coisa.',
              items: ['Dashboard com dados de todos os alunos', 'Alertas quando aluno precisa de atenção', 'Agenda de sessões integrada'],
            },
            {
              sigla: 'NU', cor: 'green', role: 'Nutricionista',
              headline: 'Prescreva com dados reais.',
              desc: 'Crie planos alimentares que fazem sentido para o momento atual do paciente — não para um perfil genérico.',
              items: ['Vê sono, treino e energia do paciente', 'Plano alimentar detalhado com IA ou manual', 'Agenda de consultas e retornos'],
            },
          ] as const).map(p => {
            const cls = {
              emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]', badge: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10', dot: 'bg-emerald-400', sigla: 'text-emerald-400' },
              blue:    { border: 'border-blue-500/20',    bg: 'bg-blue-500/[0.05]',    badge: 'text-blue-400 border-blue-500/25 bg-blue-500/10',       dot: 'bg-blue-400',    sigla: 'text-blue-400' },
              green:   { border: 'border-green-500/20',   bg: 'bg-green-500/[0.05]',   badge: 'text-green-400 border-green-500/25 bg-green-500/10',     dot: 'bg-green-400',   sigla: 'text-green-400' },
            }[p.cor]
            return (
              <div key={p.role} className={`rounded-2xl p-6 border ${cls.border} flex flex-col`} style={{ background: '#0f0f0f' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border ${cls.badge}`}>{p.sigla}</div>
                  <span className="text-zinc-400 text-sm font-semibold">{p.role}</span>
                </div>
                <p className="text-white font-bold text-base mb-2 leading-snug">{p.headline}</p>
                <p className="text-zinc-500 text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>
                <ul className="space-y-2.5">
                  {p.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${cls.dot} shrink-0 mt-1.5`} />
                      <p className="text-zinc-400 text-sm">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FEATURES DESTAQUE ────────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-12">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">O diferencial</p>
          <h2 className="text-4xl font-black">Inteligência real.<br /><span className="text-zinc-500">Não só números.</span></h2>
        </div>

        {/* Feature 1: Decisão do dia */}
        <div ref={feat1.ref} className={`rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-700 ${feat1.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 rounded-full px-3 py-1 mb-4 w-fit">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[9px] uppercase tracking-widest font-semibold">IA proprietária</span>
              </span>
              <h3 className="text-2xl font-black mb-3">Decisão do dia</h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">
                Toda manhã, nossa IA cruza dados de sono, HRV, bem-estar e histórico de treino para gerar <strong className="text-zinc-300">uma recomendação concreta</strong> — treinar forte, moderado ou descansar.
              </p>
              <p className="text-zinc-700 text-xs">Não é um dashboard genérico. É uma decisão.</p>
            </div>
            <div className="p-6 flex items-center justify-center border-t md:border-t-0 md:border-l border-white/[0.04]"
              style={{ background: '#0a0a0a' }}>
              <div className="w-full max-w-[220px] space-y-2">
                {[
                  { cor: 'border-emerald-500/30 bg-emerald-500/[0.07]', dot: 'bg-emerald-400', label: 'Treino forte', sub: 'Score 85 · HRV ótimo', active: true },
                  { cor: 'border-yellow-500/20 bg-yellow-500/[0.05]', dot: 'bg-yellow-400', label: 'Treino moderado', sub: 'Score 62 · sono 6h', active: false },
                  { cor: 'border-red-500/20 bg-red-500/[0.05]', dot: 'bg-red-400', label: 'Descanse hoje', sub: 'Score 38 · HRV baixo', active: false },
                ].map((d, i) => (
                  <div key={i} className={`rounded-xl p-3 border flex items-center gap-3 ${d.cor} ${!d.active ? 'opacity-40' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${d.dot} shrink-0 ${d.active ? 'animate-pulse' : ''}`} />
                    <div>
                      <p className="text-white text-sm font-bold">{d.label}</p>
                      <p className="text-zinc-500 text-[10px]">{d.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Time conectado */}
        <div ref={feat2.ref} className={`rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-700 delay-100 ${feat2.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.04] order-2 md:order-1"
              style={{ background: '#0a0a0a' }}>
              <div className="w-full max-w-[240px]">
                <div className="flex items-center gap-3 mb-3">
                  {[
                    { sigla: 'AT', bg: 'bg-zinc-800', label: 'Atleta', cor: '' },
                    { sigla: 'PT', bg: 'bg-blue-500/20', label: 'Personal', cor: 'text-blue-400' },
                    { sigla: 'NU', bg: 'bg-emerald-500/20', label: 'Nutricionista', cor: 'text-emerald-400' },
                  ].map(u => (
                    <div key={u.sigla} className="flex flex-col items-center gap-1">
                      <div className={`w-9 h-9 rounded-2xl ${u.bg} border border-white/[0.06] flex items-center justify-center text-[9px] font-black ${u.cor || 'text-zinc-400'}`}>{u.sigla}</div>
                      <p className="text-zinc-600 text-[7px] uppercase tracking-wider">{u.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-zinc-700 text-[8px]">dados compartilhados</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                {[
                  { label: '😴 Sono', val: '8.2h · Score 85', cor: 'text-emerald-400' },
                  { label: '🏋️ Treino', val: '✓ Concluído', cor: 'text-blue-400' },
                  { label: '🥗 Dieta', val: 'Plano ativo', cor: 'text-green-400' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl px-3 py-2 mb-1.5 border border-white/[0.04]" style={{ background: '#111' }}>
                    <p className="text-zinc-500 text-[9px]">{r.label}</p>
                    <p className={`text-[9px] font-bold ${r.cor}`}>{r.val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 flex flex-col justify-center order-1 md:order-2">
              <span className="inline-flex items-center gap-2 border border-blue-500/25 bg-blue-500/10 rounded-full px-3 py-1 mb-4 w-fit">
                <span className="text-blue-400 text-[9px] uppercase tracking-widest font-semibold">🔗 Integração total</span>
              </span>
              <h3 className="text-2xl font-black mb-3">Todos veem os mesmos dados.</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Personal e nutricionista acessam o sono, recuperação e treino do atleta em tempo real. <strong className="text-zinc-300">Decisões alinhadas.</strong> Sem WhatsApp. Sem suposição.
              </p>
            </div>
          </div>
        </div>

        {/* Feature 3: Score de sono */}
        <div ref={feat3.ref} className={`rounded-3xl border border-white/[0.06] overflow-hidden transition-all duration-700 delay-200 ${feat3.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-purple-500/25 bg-purple-500/10 rounded-full px-3 py-1 mb-4 w-fit">
                <span className="text-purple-400 text-[9px] uppercase tracking-widest font-semibold">😴 Score de sono</span>
              </span>
              <h3 className="text-2xl font-black mb-3">Recuperação não é intuição.</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Registre seu sono e receba um score de recuperação baseado em duração, HRV, sono profundo e REM. A IA usa esses dados para calibrar <strong className="text-zinc-300">toda a prescrição do dia</strong>.
              </p>
            </div>
            <div className="p-6 flex items-center justify-center border-t md:border-t-0 md:border-l border-white/[0.04]"
              style={{ background: '#0a0a0a' }}>
              <div className="w-full max-w-[220px] space-y-2">
                {[
                  { label: 'Duração', val: '8h 12min', bar: 85, cor: 'bg-emerald-400' },
                  { label: 'HRV', val: '68ms', bar: 72, cor: 'bg-blue-400' },
                  { label: 'Sono profundo', val: '1h 48min', bar: 60, cor: 'bg-violet-400' },
                  { label: 'REM', val: '2h 05min', bar: 78, cor: 'bg-purple-400' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 border border-white/[0.06]" style={{ background: '#111' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider">{m.label}</p>
                      <p className="text-white text-[10px] font-bold">{m.val}</p>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full ${m.cor} rounded-full`} style={{ width: `${m.bar}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-3">Como funciona</p>
          <h2 className="text-4xl font-black">Simples de começar.<br /><span className="text-zinc-500">Poderoso na prática.</span></h2>
        </div>

        <div className="relative">
          <div className="absolute left-[27px] top-8 bottom-8 w-px bg-white/[0.06] hidden sm:block" />
          <div className="space-y-4">
            {[
              { n: '01', title: 'Crie sua conta em 60 segundos', desc: 'Escolha seu perfil — atleta, personal trainer ou nutricionista. Sem cartão de crédito.', cor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
              { n: '02', title: 'Conecte seu time de profissionais', desc: 'O profissional envia um link de convite. O atleta aceita. Todos passam a ver os mesmos dados em tempo real.', cor: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
              { n: '03', title: 'A IA trabalha — você executa', desc: 'Cada manhã, a IA analisa seus dados e entrega a decisão do dia. Personal e nutri ajustam a prescrição. O atleta executa com segurança.', cor: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
            ].map(s => (
              <div key={s.n} className="flex gap-5 p-5 sm:p-6 rounded-2xl border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${s.cor}`}>{s.n}</span>
                <div>
                  <p className="text-white font-bold text-base mb-1">{s.title}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-20 max-w-4xl mx-auto">
        <div className="relative rounded-3xl border border-emerald-500/20 p-10 text-center overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0b1c14, #080c0b)' }}>
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[80px] opacity-[0.1]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
          <div className="relative">
            <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[10px] uppercase tracking-[0.25em] font-semibold">Gratuito para começar</span>
            </span>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
              Pronto para treinar<br />com inteligência real?
            </h2>
            <p className="text-zinc-500 text-base leading-relaxed mb-8 max-w-sm mx-auto">
              Crie sua conta e comece a receber a decisão do dia baseada nos seus dados reais.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xs mx-auto">
              <button onClick={() => router.push('/login?modo=cadastro')}
                className="flex-1 bg-white text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-100">
                Criar conta grátis →
              </button>
              <button onClick={() => router.push('/login')}
                className="flex-1 border border-white/[0.10] text-zinc-400 font-semibold py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/20 hover:text-white">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-5 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white font-black text-xl tracking-[-0.05em]">KORE</span>
          <div className="text-center sm:text-right">
            <p className="text-zinc-700 text-xs">© 2026 KORE — Todos os direitos reservados</p>
            <p className="text-zinc-800 text-[10px] mt-0.5">Feito no Brasil 🇧🇷 para atletas e profissionais</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
