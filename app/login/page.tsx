'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

const BENEFITS = [
  { emoji: '👥', label: 'Personal e nutri conectados' },
  { emoji: '📈', label: 'Evolução em tempo real' },
  { emoji: '⚡', label: 'Decisões pelos seus dados' },
]

function EyeIcon({ open }: { open: boolean }) {
  return open
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
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
  const [vis, setVis] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
    const t = setTimeout(() => setVis(true), 60)
    return () => clearTimeout(t)
  }, [router])

  function msg(texto: string, tipo: 'error' | 'success' = 'error') {
    setMensagem(texto); setTipoMsg(tipo)
  }

  async function handleSubmit() {
    if (!email || !senha) { msg('Preencha email e senha.'); return }
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
    msg('Link de recuperação enviado! Verifique seu email.', 'success')
    setRecuperando(false)
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white flex lg:flex-row flex-col">

      {/* ═══════════════════════════════════════
          PAINEL ESQUERDO — desktop only
      ═══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #060d08 0%, #060a07 50%, #050905 100%)' }}>

        {/* glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10"
          style={{ background: 'radial-gradient(ellipse, #34d399 0%, transparent 70%)' }} />

        {/* grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

        {/* voltar */}
        <button onClick={() => router.push('/')}
          className="relative z-10 flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors w-fit">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
          Início
        </button>

        {/* branding */}
        <div className="relative z-10">
          <p className="text-emerald-500 text-[10px] uppercase tracking-[0.4em] font-semibold mb-5">Seu time de evolução</p>

          <h1 className="text-[7.5rem] font-black tracking-[-0.05em] leading-none select-none"
            style={{ textShadow: '0 0 140px rgba(16,185,129,0.3), 0 0 40px rgba(16,185,129,0.1)' }}>
            KORE
          </h1>

          <p className="text-zinc-300 text-xl mt-5 leading-relaxed max-w-[340px] font-light">
            Você não está seguindo um plano.<br />
            <span className="text-white font-semibold">Você tem um time.</span>
          </p>

          {/* cards de benefícios */}
          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: '👥', title: 'Personal e nutri conectados', desc: 'Seu time trabalha junto, com acesso aos mesmos dados, pelo mesmo objetivo' },
              { icon: '📈', title: 'Evolução em tempo real', desc: 'Carga, composição corporal e metas sempre atualizados para quem te acompanha' },
              { icon: '⚡', title: 'Decisões pelos seus dados', desc: 'Treino e plano alimentar ajustados com base no que seu corpo está sinalizando' },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.09] rounded-2xl px-4 py-3.5 backdrop-blur-sm">
                <span className="text-xl mt-0.5">{b.icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{b.title}</p>
                  <p className="text-zinc-500 text-[12px] leading-relaxed mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-zinc-800 text-[11px]">© 2026 KORE — Todos os direitos reservados</p>
      </div>

      {/* separador vertical */}
      <div className="hidden lg:block w-px self-stretch bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />

      {/* ═══════════════════════════════════════
          PAINEL DIREITO / MOBILE COMPLETO
      ═══════════════════════════════════════ */}
      <div className="lg:w-[48%] flex flex-col min-h-screen">

        {/* ── HERO MOBILE (escondido no desktop) ─────────── */}
        <div className="lg:hidden relative overflow-hidden flex flex-col items-center justify-end pb-8 pt-16"
          style={{ minHeight: '32vh', background: 'linear-gradient(175deg, #040c06 0%, #060e08 60%, #111111 100%)' }}>

          {/* glows mobile */}
          <div className="pointer-events-none absolute top-[-60px] left-1/2 -translate-x-1/2 w-[340px] h-[280px] rounded-full blur-[80px] opacity-30"
            style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 65%)' }} />
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-16"
            style={{ background: 'linear-gradient(to bottom, transparent, #111111)' }} />

          {/* grid mobile */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* voltar mobile */}
          <button onClick={() => router.push('/')}
            className="absolute top-5 left-5 flex items-center gap-1.5 text-zinc-600 text-[10px] uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors z-10">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
            Início
          </button>

          {/* logo */}
          <div className="relative z-10 text-center">
            <h1 className="text-[5rem] font-black tracking-[-0.05em] leading-none select-none"
              style={{ textShadow: '0 0 80px rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.15)' }}>
              KORE
            </h1>
            <p className="text-emerald-500/70 text-[9px] uppercase tracking-[0.4em] mt-2 font-medium">
              Seu time de evolução
            </p>
          </div>

          {/* chips de benefício */}
          <div className="relative z-10 flex items-center gap-2 mt-5 px-5 flex-wrap justify-center">
            {BENEFITS.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.14] rounded-full px-3 py-1.5 text-[11px] text-zinc-300 font-medium backdrop-blur-sm">
                <span className="text-sm">{b.emoji}</span>
                {b.label}
              </span>
            ))}
          </div>

          {/* tagline */}
          <p className="relative z-10 text-zinc-500 text-[11px] text-center mt-4 px-8 leading-relaxed italic">
            "Você não está seguindo um plano. Você tem um time."
          </p>
        </div>

        {/* ── FORMULÁRIO ─────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-6 py-6">
          <div className={`w-full max-w-sm transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            <div className="mb-5">
              <h2 className="text-2xl font-black text-white">
                {modo === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                {modo === 'login' ? 'Entre para continuar sua jornada' : 'Comece sua transformação hoje'}
              </p>
            </div>

            {/* toggle */}
            <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {(['login', 'cadastro'] as const).map(m => (
                <button key={m} onClick={() => { setModo(m); setMensagem('') }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${modo === m ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            {/* inputs */}
            <div className="space-y-4 mb-3">
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1.5">Email</label>
                <input
                  type="email" placeholder="seu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/40 border border-white/[0.07] focus:border-emerald-500/25 transition-all"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" value={senha}
                    onChange={e => setSenha(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-2xl px-4 py-3.5 pr-12 text-sm outline-none focus:ring-1 focus:ring-emerald-500/40 border border-white/[0.07] focus:border-emerald-500/25 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>
            </div>

            {/* esqueci */}
            {modo === 'login' && (
              <div className="text-right mb-5">
                <button onClick={handleRecuperar} disabled={recuperando}
                  className="text-zinc-600 text-xs hover:text-emerald-400 transition-colors disabled:opacity-50">
                  {recuperando ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </div>
            )}

            {/* mensagem */}
            {mensagem && (
              <div className={`rounded-2xl px-4 py-3 mb-4 text-sm leading-relaxed ${
                tipoMsg === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {mensagem}
              </div>
            )}

            {/* CTA */}
            <button onClick={handleSubmit} disabled={carregando}
              className="w-full relative overflow-hidden font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#000' }}>
              <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
              <span className="relative">
                {carregando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/25 border-t-black rounded-full animate-spin" />
                    Aguarde...
                  </span>
                ) : modo === 'login' ? 'Entrar' : 'Criar conta'}
              </span>
            </button>

            <p className="text-center text-zinc-800 text-[10px] mt-8">© 2026 KORE — Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
