'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Landing() {
  const router = useRouter()
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 60)
    return () => clearTimeout(t)
  }, [])

  const fade = (delay = 0) =>
    `transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`
    + (delay ? ` delay-[${delay}ms]` : '')

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center">

        {/* glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
          <div className="w-[700px] h-[500px] rounded-full opacity-[0.07] blur-3xl mt-[-80px]"
            style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />
        </div>

        {/* badge */}
        <div className={`mb-8 ${fade()}`}
          style={{ transitionDelay: '0ms' }}>
          <span className="inline-flex items-center gap-2 border border-emerald-500/25 bg-emerald-500/[0.07] rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] uppercase tracking-[0.25em] font-semibold">
              Plataforma de performance integrada
            </span>
          </span>
        </div>

        {/* logo */}
        <div className={`mb-4 ${fade()}`} style={{ transitionDelay: '100ms' }}>
          <h1 className="text-[7rem] sm:text-[9rem] font-black tracking-[-0.05em] leading-none select-none"
            style={{ textShadow: '0 0 120px rgba(16,185,129,0.12)' }}>
            KORE
          </h1>
        </div>

        {/* tagline */}
        <div className={`mb-6 ${fade()}`} style={{ transitionDelay: '200ms' }}>
          <p className="text-zinc-500 text-base tracking-[0.2em] uppercase">
            Performance. Integrada.
          </p>
        </div>

        {/* value prop */}
        <div className={`mb-10 max-w-xs ${fade()}`} style={{ transitionDelay: '300ms' }}>
          <p className="text-zinc-400 text-base leading-relaxed">
            O app onde{' '}
            <span className="text-white font-semibold">atletas, personal trainers</span>
            {' '}e{' '}
            <span className="text-white font-semibold">nutricionistas</span>
            {' '}trabalham juntos em torno de um objetivo.
          </p>
        </div>

        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row gap-3 w-full max-w-xs ${fade()}`} style={{ transitionDelay: '400ms' }}>
          <button onClick={() => router.push('/login?modo=cadastro')}
            className="flex-1 bg-white text-black font-black px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-100">
            Criar conta grátis
          </button>
          <button onClick={() => router.push('/login')}
            className="flex-1 border border-white/20 text-white font-semibold px-6 py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:border-white/40 hover:bg-white/[0.04]">
            Entrar
          </button>
        </div>

        {/* scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-zinc-400" />
          <p className="text-zinc-500 text-[8px] uppercase tracking-[0.3em]">ver mais</p>
        </div>
      </section>

      {/* ── TRÊS PERSPECTIVAS ────────────────────────────────────────── */}
      <section className="px-4 py-20 max-w-lg mx-auto">
        <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] text-center mb-2">Para quem é</p>
        <h2 className="text-3xl font-black text-center mb-10 leading-tight">
          Um app.<br />Três perspectivas.
        </h2>

        <div className="space-y-3">
          {([
            {
              emoji: '🏃', role: 'Atleta / Cliente', color: 'emerald' as const,
              desc: 'Acompanhe sua recuperação, treinos e dieta prescritos pelo seu time de profissionais.',
              items: ['Decisão do dia gerada por IA', 'Plano alimentar e de treino integrados', 'Score de sono e recuperação real'],
            },
            {
              emoji: '🏋️', role: 'Personal Trainer', color: 'blue' as const,
              desc: 'Monitore cada aluno em tempo real e tome decisões baseadas em dados, não em suposições.',
              items: ['Dashboard com sono, treino e bem-estar', 'Agenda de sessões integrada', 'Alertas de alunos que precisam de atenção'],
            },
            {
              emoji: '🥗', role: 'Nutricionista', color: 'green' as const,
              desc: 'Crie planos alimentares personalizados com IA e ajuste com base nos dados reais do paciente.',
              items: ['Planos alimentares com IA ou manual', 'Veja sono, treino e energia do paciente', 'Agenda de consultas e retornos'],
            },
          ] as const).map(p => {
            const C = {
              emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
              blue:    { border: 'border-blue-500/20',    bg: 'bg-blue-500/[0.04]',    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',       dot: 'bg-blue-400' },
              green:   { border: 'border-green-500/20',   bg: 'bg-green-500/[0.04]',   badge: 'text-green-400 bg-green-500/10 border-green-500/20',     dot: 'bg-green-400' },
            }[p.color]
            return (
              <div key={p.role} className={`rounded-2xl p-5 border ${C.border}`} style={{ background: '#0f0f0f' }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${C.badge}`}>{p.role}</span>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed mb-4">{p.desc}</p>
                <ul className="space-y-2">
                  {p.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${C.dot} shrink-0 mt-1.5`} />
                      <p className="text-zinc-400 text-sm">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── DIFERENCIAIS ─────────────────────────────────────────────── */}
      <section className="px-4 py-16 max-w-lg mx-auto">
        <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] text-center mb-2">O diferencial</p>
        <h2 className="text-3xl font-black text-center mb-3 leading-tight">
          Inteligência real.<br />Não só números.
        </h2>
        <p className="text-zinc-500 text-sm text-center mb-10 leading-relaxed">
          O KORE usa dados de sono, HRV, bem-estar e treino para gerar recomendações concretas — não dashboards bonitos sem uso.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '✦', title: 'Decisão do Dia', desc: 'IA analisa sono, HRV e bem-estar e diz o que você deve fazer hoje.' },
            { icon: '😴', title: 'Score de Sono', desc: 'Recuperação calculada com dados reais, não estimativas.' },
            { icon: '🔗', title: 'Time Integrado', desc: 'Personal e nutricionista veem os mesmos dados do atleta.' },
            { icon: '📅', title: 'Agenda Profissional', desc: 'Consultas e treinos agendados diretamente no app.' },
            { icon: '🥗', title: 'Plano com IA', desc: 'Nutricionista cria ou a IA gera — o atleta vê tudo detalhado.' },
            { icon: '📈', title: 'Evolução Real', desc: 'Histórico de treinos, medidas e recovery ao longo do tempo.' },
          ].map(f => (
            <div key={f.title} className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-emerald-400 text-xl mb-2">{f.icon}</p>
              <p className="text-white font-bold text-sm mb-1">{f.title}</p>
              <p className="text-zinc-600 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────────── */}
      <section className="px-4 py-16 max-w-lg mx-auto">
        <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] text-center mb-2">Como funciona</p>
        <h2 className="text-3xl font-black text-center mb-10">3 passos simples</h2>

        <div className="space-y-4">
          {[
            { n: '01', title: 'Crie sua conta', desc: 'Escolha seu perfil — atleta, personal trainer ou nutricionista. Leva menos de 1 minuto.' },
            { n: '02', title: 'Conecte seu time', desc: 'Profissional envia um convite. Atleta aceita. Todos passam a compartilhar os mesmos dados.' },
            { n: '03', title: 'Tome decisões juntos', desc: 'A IA analisa tudo e gera recomendações. Professional prescreve. Atleta executa. O ciclo se retroalimenta.' },
          ].map(s => (
            <div key={s.n} className="flex gap-4 p-5 rounded-2xl border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <span className="text-3xl font-black text-zinc-800 shrink-0 leading-none">{s.n}</span>
              <div>
                <p className="text-white font-bold text-base mb-1">{s.title}</p>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────── */}
      <section className="px-4 py-20 max-w-lg mx-auto">
        <div className="relative rounded-3xl border border-emerald-500/20 p-8 text-center overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0a1410 0%, #080a0e 100%)' }}>
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
          <div className="relative">
            <p className="text-emerald-400 text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold">✦ Gratuito para começar</p>
            <h2 className="text-3xl font-black mb-3 leading-tight">Pronto para<br />evoluir?</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              Junte-se aos atletas e profissionais que já usam o KORE para tomar decisões baseadas em dados reais.
            </p>
            <button onClick={() => router.push('/login?modo=cadastro')}
              className="w-full bg-white text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-100 mb-3">
              Criar conta grátis
            </button>
            <button onClick={() => router.push('/login')}
              className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors">
              Já tenho conta — entrar
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-4 py-10 text-center">
        <h2 className="text-2xl font-black tracking-widest text-white mb-2">KORE</h2>
        <p className="text-zinc-700 text-xs mb-1">© 2026 KORE — Todos os direitos reservados</p>
        <p className="text-zinc-800 text-[10px]">Feito no Brasil 🇧🇷 para atletas e profissionais brasileiros</p>
      </footer>

    </main>
  )
}
