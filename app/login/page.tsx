'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

/* ── Design tokens locais ── */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"

const BENEFITS = [
  { icon: '👥', title: 'Personal e nutri conectados', desc: 'Seu time trabalha junto, com acesso aos mesmos dados, pelo mesmo objetivo' },
  { icon: '📈', title: 'Evolução em tempo real', desc: 'Carga, composição corporal e metas sempre atualizados para quem te acompanha' },
  { icon: '⚡', title: 'Decisões pelos seus dados', desc: 'Treino e plano alimentar ajustados com base no que seu corpo está sinalizando' },
]

function EyeIcon({ open }: { open: boolean }) {
  return open
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>(
    searchParams.get('modo') === 'cadastro' ? 'cadastro' : 'login'
  )
  const [mensagem, setMensagem] = useState('')
  const [tipoMsg, setTipoMsg] = useState<'error' | 'success'>('error')
  const [carregando, setCarregando] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
    const t = setTimeout(() => setVis(true), 80)
    return () => clearTimeout(t)
  }, [router])

  function msg(texto: string, tipo: 'error' | 'success' = 'error') {
    setMensagem(texto); setTipoMsg(tipo)
  }

  async function handleSubmit() {
    if (!email || !senha) { msg('Preencha email e senha.'); return }
    if (modo === 'cadastro' && !aceiteTermos) { msg('Você precisa aceitar os Termos de Uso e a Política de Privacidade.'); return }
    setCarregando(true); setMensagem('')
    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) msg(error.message)
      else msg('Cadastro realizado! Verifique seu email para ativar a conta.', 'success')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) { msg('Email ou senha incorretos.') }
      else {
        const { data: perfil } = await supabase.from('perfis').select('tipo').eq('id', data.user.id).single()
        router.push(perfil ? '/dashboard' : '/onboarding'); return
      }
    }
    setCarregando(false)
  }

  async function handleRecuperar() {
    if (!email) { msg('Digite seu email para recuperar a senha.'); return }
    setRecuperando(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nova-senha` })
    msg('Link enviado! Verifique seu email.', 'success')
    setRecuperando(false)
  }

  const ctaDesabilitado = carregando || (modo === 'cadastro' && !aceiteTermos)

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.065)',
    backdropFilter: 'blur(16px) saturate(130%)',
    WebkitBackdropFilter: 'blur(16px) saturate(130%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 14, padding: '14px 16px',
    fontSize: 14, color: C.t1,
    outline: 'none', transition: 'border-color 200ms ease, box-shadow 200ms ease',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    colorScheme: 'dark',
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', color: C.t1 }}>

      {/* ── PAINEL ESQUERDO — desktop ── */}
      <div style={{
        display: 'none', width: '52%', flexDirection: 'column',
        justifyContent: 'center', padding: '52px 64px',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        position: 'relative', overflow: 'hidden',
      }}
        className="lg-panel"
      >
        {/* Grade sutil de fundo — estilo dashboard técnico */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
            background: 'rgba(255,90,54,0.10)', border: '1px solid rgba(255,90,54,0.25)',
            borderRadius: 999, padding: '6px 14px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy, boxShadow: `0 0 8px ${C.energy}` }} />
            <span style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700 }}>
              Seu time de evolução
            </span>
          </div>

          {/* KORE — título com glow */}
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(96px, 13vw, 144px)',
            fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.9,
            margin: 0, marginBottom: 28,
            background: `linear-gradient(160deg, #FFFFFF 0%, ${C.energy2} 35%, ${C.energy} 70%, #CC3300 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            KORE
          </h1>

          {/* Tagline */}
          <div style={{ marginBottom: 44 }}>
            <p style={{ fontSize: 22, color: C.t3, fontWeight: 300, margin: 0, lineHeight: 1.5 }}>
              Você não está seguindo um plano.
            </p>
            <p style={{
              fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.5,
              background: `linear-gradient(90deg, ${C.t1}, ${C.energy2})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Você tem um time.
            </p>
          </div>

          {/* Benefits — novo layout horizontal com número */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 20,
                padding: '18px 0',
                borderBottom: i < BENEFITS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                {/* Número */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 0
                    ? 'rgba(255,90,54,0.15)'
                    : i === 1
                    ? 'rgba(45,212,167,0.12)'
                    : 'rgba(167,139,250,0.12)',
                  border: `1px solid ${i === 0 ? 'rgba(255,90,54,0.30)' : i === 1 ? 'rgba(45,212,167,0.25)' : 'rgba(167,139,250,0.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                  color: i === 0 ? C.energy : i === 1 ? C.good : '#A78BFA',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, margin: 0, marginBottom: 4 }}>{b.title}</p>
                  <p style={{ fontSize: 13, color: C.t3, margin: 0, lineHeight: 1.55 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── PAINEL DIREITO / MOBILE ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Hero mobile */}
        <div style={{
          padding: '48px 24px 32px', textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }} className="mobile-hero">
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700, marginBottom: 12 }}>
            Seu time de evolução
          </p>
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 72, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1,
            margin: 0, marginBottom: 8,
            background: `linear-gradient(135deg, ${C.energy2}, ${C.energy})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            KORE
          </h1>
          <p style={{ fontSize: 13, color: C.t3, margin: 0 }}>Performance integrada</p>
        </div>

        {/* Formulário */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '100%', maxWidth: 400,
            opacity: vis ? 1 : 0,
            transform: vis ? 'none' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
          }}>
            {/* Título */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700,
                color: C.t1, margin: 0, marginBottom: 6, letterSpacing: '-0.02em',
              }}>
                {modo === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p style={{ fontSize: 14, color: C.t3, margin: 0 }}>
                {modo === 'login' ? 'Entre para continuar sua jornada' : 'Comece sua transformação hoje'}
              </p>
            </div>

            {/* Toggle login/cadastro */}
            <div style={{
              display: 'flex', gap: 4, padding: 4, borderRadius: 14, marginBottom: 24,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {(['login', 'cadastro'] as const).map(m => (
                <button key={m} onClick={() => { setModo(m); setMensagem('') }} style={{
                  flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, transition: 'all 200ms ease',
                  background: modo === m
                    ? `linear-gradient(135deg, ${C.energy2}, ${C.energy})`
                    : 'transparent',
                  color: modo === m ? '#fff' : C.t3,
                  boxShadow: modo === m ? `0 4px 20px rgba(255,90,54,0.35)` : 'none',
                }}>
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 8 }}>
                  Email
                </label>
                <input
                  type="email" placeholder="seu@email.com" value={email}
                  required autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  onFocus={e => { e.currentTarget.style.borderColor = `rgba(255,90,54,0.5)`; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(255,90,54,0.12)` }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 8 }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" value={senha}
                    required minLength={6} autoComplete="current-password"
                    onChange={e => setSenha(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    onFocus={e => { e.currentTarget.style.borderColor = `rgba(255,90,54,0.5)`; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(255,90,54,0.12)` }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                    style={{ ...inputStyle, paddingRight: 48 }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{
                    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: C.t3,
                    display: 'flex', alignItems: 'center',
                  }}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>
            </div>

            {/* Esqueci senha */}
            {modo === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button onClick={handleRecuperar} disabled={recuperando} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: C.t3, transition: 'color 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = C.energy)}
                onMouseLeave={e => (e.currentTarget.style.color = C.t3)}>
                  {recuperando ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </div>
            )}

            {/* Consentimento — Termos e Privacidade */}
            {modo === 'cadastro' && (
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20,
                fontSize: 12, color: C.t3, lineHeight: 1.5, cursor: 'pointer',
              }}>
                <input
                  type="checkbox" required checked={aceiteTermos}
                  onChange={e => setAceiteTermos(e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: C.energy, cursor: 'pointer', flexShrink: 0 }}
                />
                <span>
                  Li e aceito os <strong style={{ color: C.t1 }}>Termos de Uso</strong> e a{' '}
                  <strong style={{ color: C.t1 }}>Política de Privacidade</strong>
                </span>
              </label>
            )}

            {/* Mensagem */}
            {mensagem && (
              <div style={{
                borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                fontSize: 13, lineHeight: 1.5,
                background: tipoMsg === 'success' ? 'rgba(45,212,167,0.10)' : 'rgba(255,90,54,0.10)',
                border: `1px solid ${tipoMsg === 'success' ? 'rgba(45,212,167,0.25)' : 'rgba(255,90,54,0.25)'}`,
                color: tipoMsg === 'success' ? C.good : C.energy,
              }}>
                {mensagem}
              </div>
            )}

            {/* CTA */}
            <button onClick={handleSubmit} disabled={ctaDesabilitado} style={{
              width: '100%', padding: '16px 0',
              background: ctaDesabilitado ? 'rgba(255,90,54,0.4)' : `linear-gradient(135deg, ${C.energy2}, ${C.energy})`,
              border: 'none', borderRadius: 14, cursor: ctaDesabilitado ? 'not-allowed' : 'pointer',
              color: '#fff', fontSize: 14, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              boxShadow: ctaDesabilitado ? 'none' : '0 8px 32px rgba(255,90,54,0.35)',
              transition: 'all 200ms ease',
            }}>
              {carregando ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  Aguarde...
                </span>
              ) : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 32 }}>
              © 2026 KORE — Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) {
          .lg-panel { display: flex !important; }
          .mobile-hero { display: none !important; }
        }
      `}</style>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid rgba(255,90,54,0.3)',
          borderTopColor: '#FF5A36',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
