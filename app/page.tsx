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

/* ─── constantes ──────────────────────────────────────────────────────────── */

const MARQUEE_ITEMS = [
  'PMC automático', 'Alertas RED-S', 'Integração Strava', 'Periodização por prova',
  'IA clínica', 'Zonas de FC', 'ACWR automático', 'Compliance prescrito vs realizado',
  'TSB em tempo real', 'Narrativa contextualizada',
]

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

const IconFlask = ({ size = 22, color = C.energy }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6M10 2v6.2a2 2 0 0 1-.3 1.05L4.9 18.2A2 2 0 0 0 6.6 21h10.8a2 2 0 0 0 1.7-2.8l-4.8-9A2 2 0 0 1 14 8.2V2" />
    <path d="M7.5 14h9" />
  </svg>
)

const IconCalendar = ({ size = 22, color = C.good }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h2M14 14h2M8 18h2M14 18h2" />
  </svg>
)

const IconBot = ({ size = 22, color = C.recovery }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="12" rx="3" />
    <path d="M12 8V4M8.5 4h7" />
    <circle cx="8.5" cy="14" r="1" fill={color} />
    <circle cx="15.5" cy="14" r="1" fill={color} />
  </svg>
)

const IconLink = ({ size = 22, color = C.sleep }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 13.5 13 17a4 4 0 0 0 5.66 0l1.34-1.34A4 4 0 0 0 14 10l-.5.5" />
    <path d="M14.5 10.5 11 7a4 4 0 0 0-5.66 0L4 8.34A4 4 0 0 0 10 14l.5-.5" />
  </svg>
)

/* ─── componentes visuais ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: C.energy, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.35em', fontWeight: 700, marginBottom: 16, fontFamily: JAKARTA }}>{children}</p>
  )
}

function PhoneMockup({ visible }: { visible: boolean }) {
  const [tsb, setTsb] = useState(0)
  useEffect(() => { if (!visible) return; const t = setTimeout(() => setTsb(5), 700); return () => clearTimeout(t) }, [visible])
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
          {/* Forma (TSB) */}
          <div style={{ borderRadius: 16, padding: 14, marginBottom: 8, border: `1px solid ${C.good}40`, position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, rgba(45,212,167,0.14), rgba(45,212,167,0.03))' }}>
            <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', filter: 'blur(28px)', opacity: 0.35, background: C.good }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ color: C.good, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Forma (TSB)</p>
              <span style={{ color: C.good, fontSize: 14, fontWeight: 800, fontFamily: SORA, transition: 'all 1s' }}>+{tsb}</span>
            </div>
            <p style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1.3, fontFamily: SORA, position: 'relative' }}>Pronto para treinar forte</p>
            <p style={{ color: C.t2, fontSize: 7, marginTop: 4, position: 'relative' }}>CTL 62 · ATL 57</p>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            {[
              { Icon: IconDumbbell, ic: C.energy, label: 'Hoje', val: 'Bike Z2', sub: '90 min prescrito', c: '#fff' },
              { Icon: IconLink, ic: C.sleep, label: 'Strava', val: 'TSS 78', sub: 'sincronizado', c: C.good },
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
          {/* Alerta */}
          <div style={{ borderRadius: 12, padding: 12, border: `1px solid ${C.energy}30`, background: statCardBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <IconFlask size={9} color={C.energy} />
              <p style={{ color: C.energy, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Alerta automático</p>
            </div>
            <p style={{ color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1.3, fontFamily: SORA }}>ACWR 1.2 · dentro da faixa segura</p>
            <p style={{ color: C.t2, fontSize: 7, lineHeight: 1.5, marginTop: 2 }}>Carga aguda compatível com a crônica.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

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

function GhostLink({ children, href, style }: { children: React.ReactNode; href: string; style?: React.CSSProperties }) {
  return (
    <a href={href} className="kore-btn"
      style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.2)',
        color: C.t1, fontWeight: 600, cursor: 'pointer', fontFamily: JAKARTA,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...style,
      }}>
      {children}
    </a>
  )
}

/* ─── página principal ────────────────────────────────────────────────────── */

export default function Landing() {
  const router = useRouter()
  const [vis, setVis] = useState(false)
  const problema = useInView(0.2)
  const perfis = useInView(0.1)
  const diferenciais = useInView(0.1)
  const comoFunciona = useInView(0.1)
  const paraQuem = useInView(0.1)

  useEffect(() => { const t = setTimeout(() => setVis(true), 80); return () => clearTimeout(t) }, [])

  const fadeUp = (on: boolean, delay = 0): React.CSSProperties => ({
    transition: `all .7s ease ${delay}ms`,
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0)' : 'translateY(24px)',
  })

  return (
    <main style={{ minHeight: '100vh', color: C.t1, overflowX: 'hidden', fontFamily: JAKARTA }}>
      <style>{`
        @keyframes kore-shimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes kore-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes kore-ring { 0%{box-shadow:0 0 0 0 rgba(255,90,54,0.5)} 70%{box-shadow:0 0 0 10px rgba(255,90,54,0)} 100%{box-shadow:0 0 0 0 rgba(255,90,54,0)} }
        @keyframes kore-phone { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-16px) rotate(-3deg)} }
        @keyframes kore-floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes kore-floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
        @keyframes kore-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
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
      <header role="banner">
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
          <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')} style={{ fontSize: 13, padding: '9px 16px', borderRadius: 12 }}>Entrar no piloto</PrimaryBtn>
        </div>
      </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 1 — HERO                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 96, paddingBottom: 40, paddingLeft: 20, paddingRight: 20, overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1152, margin: '0 auto', width: '100%' }} className="kore-hero-grid">
          <style>{`
            .kore-hero-grid{display:grid;grid-template-columns:1fr;align-items:center;gap:48px}
            @media (min-width:980px){ .kore-hero-grid{grid-template-columns:1fr 1fr;gap:80px} }
            .kore-hero-h1{font-size:clamp(34px, 5.4vw, 60px)}
          `}</style>
          <div>
            <div style={fadeUp(vis)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${C.energy}4d`, background: `${C.energy}14`, borderRadius: 999, padding: '6px 16px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy }} className="kore-ring" />
                <span style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 700 }}>Em piloto · Brasil</span>
              </span>
            </div>

            <h1 className="kore-hero-h1" style={{ fontFamily: SORA, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '24px 0' }}>
              <span style={{ ...fadeUp(vis, 100), display: 'block', color: C.t1 }}>O que cada app vê separado</span>
              <span style={{
                ...fadeUp(vis, 160), display: 'block',
                background: `linear-gradient(135deg, #FFFFFF 35%, ${C.energy2} 75%, ${C.energy} 100%)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>— a KORE vê junto.</span>
            </h1>

            <p style={{ color: C.t2, fontSize: 17, lineHeight: 1.6, marginBottom: 32, maxWidth: 460, ...fadeUp(vis, 220) }}>
              Plataforma de saúde e performance para <strong style={{ color: C.t1, fontWeight: 700 }}>nutricionistas esportivos, personal trainers e coaches de assessoria</strong> de corrida, bike e triathlon. Cruzamento automático de treino, nutrição, FC e fadiga num só lugar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, ...fadeUp(vis, 280) }} className="kore-row">
              <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')}
                style={{ flex: 1, padding: '16px 24px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Entrar no piloto <IconArrow />
              </PrimaryBtn>
              <GhostLink href="#como-funciona"
                style={{ flex: 1, padding: '16px 24px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Ver como funciona
              </GhostLink>
            </div>

            <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12, ...fadeUp(vis, 360) }}>
              <span style={{ color: C.t3, fontSize: 13 }}>Em validação com os primeiros profissionais</span>
            </div>
          </div>

          {/* Phone + badges — layout estruturado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>

            {/* Coluna esquerda de badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-end' }}>
              <div className="kore-floatA">
                <BadgeChip Icon={IconChart} color={C.good} title="TSB +5" sub="Forma: pronto" delay={1000} visible={vis} />
              </div>
              <div className="kore-floatB">
                <BadgeChip Icon={IconLink} color={C.sleep} title="Strava" sub="12 atividades sync" delay={1400} visible={vis} />
              </div>
            </div>

            {/* Telefone centralizado */}
            <div className="kore-phone">
              <PhoneMockup visible={vis} />
            </div>

            {/* Coluna direita de badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <div className="kore-floatB">
                <BadgeChip Icon={IconFlask} color={C.energy} title="ACWR 1.2" sub="Dentro da faixa" delay={1200} visible={vis} />
              </div>
              <div className="kore-floatA">
                <BadgeChip Icon={IconCalendar} color={C.recovery} title="Periodização" sub="Base · Sem 3 de 8" delay={1600} visible={vis} />
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
      {/* SEÇÃO 2 — O PROBLEMA                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={problema.ref} style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>O problema</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Seus atletas estão <br /><span style={{ color: C.t2 }}>em apps diferentes.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 768, margin: '0 auto' }}>
          <div style={{ ...glass, padding: 28, borderColor: 'rgba(248,113,113,0.28)', ...fadeUp(problema.inView, 0) }}>
            <p style={{ color: '#F87171', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 20 }}>Sem o KORE</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['App de carga de treino', 'App de nutrição e dieta', 'App de wearable e FC', 'App de sono e recuperação', 'WhatsApp para comunicar tudo isso', 'Você cruzando planilhas manualmente'].map(t => (
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
              {['Todos os dados no mesmo lugar', 'Alertas científicos automáticos', 'IA que cruza treino + nutrição + FC', 'Prescrição estruturada por zonas', 'Atleta e profissional na mesma tela'].map(t => (
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
      {/* UM APP. TRÊS PERFIS                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={perfis.ref} style={{ padding: '64px 20px', maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>O coração do produto</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Um app.{' '}
            <span style={{ background: `linear-gradient(90deg, #fff, ${C.energy}, #fff, ${C.energy})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'kore-shimmer 4s linear infinite' }}>Três perfis.</span>
          </h2>
          <p style={{ color: C.t2, fontSize: 16, marginTop: 16, maxWidth: 576, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Cada profissional vê o que precisa. O atleta vê o que importa para ele.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              Icon: IconBolt, cor: C.energy, role: 'Atleta',
              desc: 'Veja seu treino prescrito, atividades sincronizadas do Strava, TSS, zonas de FC e compliance com o plano.',
              items: ['Treino do dia com blocos e zonas', 'Atividades do Strava com análise', 'Compliance prescrito vs realizado', 'Histórico de evolução'],
            },
            {
              Icon: IconDumbbell, cor: C.sleep, role: 'Personal / Coach',
              desc: 'Gerencie sua carteira com alertas científicos, PMC completo e prescrições estruturadas por zona.',
              items: ['Alertas ACWR, TSB, RED-S automáticos', 'PMC com CTL/ATL/TSB e narrativa', 'Prescrição por zonas de FC e %FTP', 'Periodização por data de prova'],
            },
            {
              Icon: IconLeaf, cor: C.good, role: 'Nutricionista',
              desc: 'Veja treinos, FC e fadiga dos seus pacientes. Ajuste o plano com dados reais.',
              items: ['Dados de treino e FC do paciente', 'Alertas de proteína baixa e RED-S', 'Plano alimentar integrado ao treino', 'IA com contexto completo'],
            },
          ].map((p, idx) => (
            <div key={p.role} style={{ ...glass, padding: 28, display: 'flex', flexDirection: 'column', borderColor: `${p.cor}33`, ...fadeUp(perfis.inView, idx * 120) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${p.cor}55`, background: `${p.cor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p.Icon size={22} color={p.cor} />
                </div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: SORA }}>{p.role}</span>
              </div>
              <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{p.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ marginTop: 2, flexShrink: 0 }}><IconCheck size={15} color={p.cor} /></span>
                    <p style={{ color: C.t1, fontSize: 14 }}>{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 3 — DIFERENCIAIS                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={diferenciais.ref} style={{ padding: '64px 20px', maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Diferenciais</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Ciência esportiva.<br /><span style={{ color: C.energy }}>Automática.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              Icon: IconFlask, cor: C.energy,
              title: 'ACWR, TSB, RED-S. Detectados sozinhos.',
              desc: 'O KORE monitora razão de carga aguda/crônica, fadiga acumulada (TSB), risco de RED-S, FC drift e déficit proteico — sem você precisar calcular nada.',
            },
            {
              Icon: IconChart, cor: C.good,
              title: 'Fadiga que você consegue explicar pro atleta.',
              desc: 'CTL, ATL e TSB calculados automaticamente a partir das atividades sincronizadas. Com narrativa contextualizada: o que significa, o que fazer.',
            },
            {
              Icon: IconCalendar, cor: C.recovery,
              title: 'Planejamento da base ao taper.',
              desc: 'Crie ciclos para corrida, bike, triathlon ou musculação. Defina a data da prova e o KORE sugere automaticamente as fases: base, volume, intensidade, taper.',
            },
            {
              Icon: IconBot, cor: C.sleep,
              title: 'Contexto completo. Resposta em segundos.',
              desc: 'Pergunte sobre qualquer atleta. A IA responde com TSB atual, fase de periodização, treinos recentes, nutrição e alertas — tudo integrado numa só conversa.',
            },
            {
              Icon: IconLink, cor: C.energy2,
              title: 'Atividades sincronizadas. Análise automática.',
              desc: 'Conecte o Strava do atleta e cada atividade vira análise: TSS calculado, zonas de FC, compliance com o treino prescrito vs realizado.',
            },
          ].map((f, idx) => (
            <div key={f.title} style={{ ...glass, padding: 28, borderColor: `${f.cor}33`, ...fadeUp(diferenciais.inView, (idx % 3) * 120) }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${f.cor}55`, background: `${f.cor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <f.Icon size={22} color={f.cor} />
              </div>
              <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 12, lineHeight: 1.3, color: '#fff', fontFamily: SORA }}>{f.title}</p>
              <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 4 — COMO FUNCIONA                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" ref={comoFunciona.ref} style={{ position: 'relative', padding: '64px 20px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1024, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>Como funciona</SectionLabel>
            <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              Pronto em <br /><span style={{ color: C.t2 }}>minutos.</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto' }}>
            {[
              { n: '01', Icon: IconBolt, title: 'Crie sua conta como profissional', desc: 'Cadastro gratuito no piloto. Sem cartão de crédito.', detail: 'Escolha seu perfil: Coach, Personal ou Nutricionista', cor: C.energy },
              { n: '02', Icon: IconLink, title: 'Convide seus atletas', desc: 'Eles criam a conta gratuita e conectam o Strava. Você já começa a ver os dados.', detail: 'Atleta conecta o Strava → dados sincronizam automaticamente', cor: C.sleep },
              { n: '03', Icon: IconFlask, title: 'Prescreva com dados reais', desc: 'Monte prescrições por zonas de FC e pace. A IA cruza tudo e gera alertas automáticos.', detail: 'ACWR, TSB e alertas calculados a partir da primeira atividade', cor: C.recovery },
            ].map((s, i) => (
              <div key={s.n} style={{ ...glass, display: 'flex', gap: 24, padding: 28, alignItems: 'flex-start', ...fadeUp(comoFunciona.inView, i * 120) }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <span style={{ width: 56, height: 56, borderRadius: 16, border: `1px solid ${s.cor}59`, background: `${s.cor}1a`, color: s.cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.Icon size={26} color={s.cor} />
                  </span>
                  <span style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#10121c', border: `1px solid ${s.cor}59`, color: s.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: SORA }}>{s.n}</span>
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 8, fontFamily: SORA }}>{s.title}</p>
                  <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>{s.desc}</p>
                  <p style={{ color: s.cor, fontSize: 12, borderLeft: `2px solid ${s.cor}`, paddingLeft: 12, lineHeight: 1.5 }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 5 — PARA QUEM É                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section ref={paraQuem.ref} style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Para quem é</SectionLabel>
          <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Feito para quem <br /><span style={{ color: C.t2 }}>prescreve com ciência.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              Icon: IconBolt, cor: C.energy, role: 'Coach de Assessoria',
              sub: 'Corrida · Bike · Triathlon',
              desc: 'PMC, ACWR, periodização por prova, prescrição por pace e %FTP. Tudo que você precisa para gerenciar uma assessoria com dados reais.',
            },
            {
              Icon: IconLeaf, cor: C.good, role: 'Nutricionista Esportivo',
              sub: 'Acompanhamento clínico',
              desc: 'Veja os treinos, FC e fadiga dos seus pacientes. Ajuste o plano com dados reais, não com relato.',
            },
            {
              Icon: IconDumbbell, cor: C.sleep, role: 'Personal Trainer',
              sub: 'Gestão de carteira',
              desc: 'Planos de musculação, alertas de sobrecarga, histórico de evolução de carga. Gestão completa da carteira.',
            },
          ].map((p, idx) => (
            <div key={p.role} style={{ ...glass, padding: 28, borderColor: `${p.cor}33`, ...fadeUp(paraQuem.inView, idx * 120) }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${p.cor}55`, background: `${p.cor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <p.Icon size={22} color={p.cor} />
              </div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: SORA, marginBottom: 4 }}>{p.role}</p>
              <p style={{ color: p.cor, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 16 }}>{p.sub}</p>
              <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 7 — CTA FINAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '64px 20px', maxWidth: 1024, margin: '0 auto' }}>
        <div style={{ ...glass, borderRadius: 28, position: 'relative', padding: 'clamp(40px, 8vw, 64px)', textAlign: 'center', overflow: 'hidden', borderColor: `${C.energy}40` }}>
          <div style={{ position: 'absolute', top: -96, left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.25, background: `radial-gradient(circle, ${C.energy}, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${C.energy}4d`, background: `${C.energy}14`, borderRadius: 999, padding: '8px 16px', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy }} className="kore-ring" />
              <span style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 700 }}>Vagas limitadas</span>
            </span>
            <h2 style={{ fontFamily: SORA, fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, marginBottom: 20, lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              Faça parte do piloto.
            </h2>
            <p style={{ color: C.t2, fontSize: 16, lineHeight: 1.6, marginBottom: 32, maxWidth: 448, marginLeft: 'auto', marginRight: 'auto' }}>
              Vagas limitadas. Acesso gratuito durante a fase de validação.
            </p>
            <PrimaryBtn onClick={() => router.push('/login?modo=cadastro')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 32px', borderRadius: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Entrar no piloto <IconArrow />
            </PrimaryBtn>
            <p style={{ marginTop: 20 }}>
              <button onClick={() => router.push('/login')} className="kore-link" style={{ color: C.t3, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: JAKARTA }}>
                Já tem conta? Entrar <IconArrow size={12} />
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '32px 20px' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 16 }} className="kore-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 20, letterSpacing: '-0.04em', background: `linear-gradient(135deg, #fff, ${C.energy})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KORE</span>
            <span style={{ color: C.t3, fontSize: 12 }}>·</span>
            <span style={{ color: C.t3, fontSize: 12 }}>Treino, nutrição e fadiga conectados</span>
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
