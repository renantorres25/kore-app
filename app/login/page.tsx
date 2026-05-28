'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

const BENEFITS = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Time integrado',
    desc: 'Personal e nutricionista colaborando pelo seu resultado',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Evolução em tempo real',
    desc: 'Carga, composição corporal e metas sempre atualizados',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: 'Performance inteligente',
    desc: 'Treinos e plano alimentar personalizados para o seu objetivo',
  },
]

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
    setMensagem(texto)
    setTipoMsg(tipo)
  }

  async function handleSubmit() {
    if (!email || !senha) { msg('Preencha email e senha.'); return }
    setCarregando(true)
    setMensagem('')
    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) msg(error.message)
      else msg('Cadastro realizado! Verifique seu email para ativar a conta.', 'success')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        msg('Email ou senha incorretos.')
      } else {
        const { data: perfil } = await supabase.from('perfis').select('tipo').eq('id', data.user.id).single()
        router.push(perfil ? '/dashboard' : '/onboarding')
        return
      }
    }
    setCarregando(false)
  }

  async function handleRecuperar() {
    if (!email) { msg('Digite seu email para recuperar a senha.'); return }
    setRecuperando(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    msg('Link de recuperação enviado! Verifique seu email.', 'success')
    setRecuperando(false)
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex lg:flex-row flex-col">

      {/* ── PAINEL ESQUERDO (branding) ── */}
      <div className="lg:flex hidden lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #080808 0%, #060e08 60%, #071009 100%)' }}>

        {/* glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.18]"
          style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full blur-[100px] opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />

        {/* grid sutil */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* voltar */}
        <button onClick={() => router.push('/')}
          className="relative flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors w-fit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
          Início
        </button>

        {/* centro */}
        <div className="relative flex flex-col gap-10">
          <div>
            <p className="text-emerald-500 text-[10px] uppercase tracking-[0.35em] font-semibold mb-4">Performance integrada</p>
            <h1 className="text-[6.5rem] font-black tracking-[-0.05em] leading-none select-none text-white"
              style={{ textShadow: '0 0 120px rgba(16,185,129,0.25)' }}>
              KORE
            </h1>
            <p className="text-zinc-400 text-lg mt-4 leading-relaxed max-w-xs">
              O app onde personal e nutricionista trabalham juntos pelo seu melhor resultado.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  {b.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{b.title}</p>
                  <p className="text-zinc-500 text-[13px] leading-relaxed mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-zinc-800 text-[11px]">© 2026 KORE — Todos os direitos reservados</p>
      </div>

      {/* ── PAINEL DIREITO (form) ── */}
      <div className="lg:w-[48%] flex flex-col items-center justify-center min-h-screen px-6 py-12 relative"
        style={{ background: '#080808' }}>

        {/* separador vertical */}
        <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-2/3 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        {/* hero mobile */}
        <div className="lg:hidden w-full text-center mb-10 relative">
          <button onClick={() => router.push('/')}
            className="absolute left-0 top-0 flex items-center gap-1.5 text-zinc-600 text-[10px] uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            Início
          </button>
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />
          <h1 className="relative text-[4.5rem] font-black tracking-[-0.05em] leading-none select-none pt-8"
            style={{ textShadow: '0 0 80px rgba(16,185,129,0.2)' }}>KORE</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mt-2">Performance integrada</p>
        </div>

        <div className={`w-full max-w-sm transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white">
              {modo === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {modo === 'login'
                ? 'Entre para continuar sua jornada'
                : 'Comece sua transformação hoje'}
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
          <div className="space-y-3 mb-3">
            <div className="relative">
              <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1.5">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/40 border border-white/[0.07] focus:border-emerald-500/30 transition-all"
              />
            </div>
            <div className="relative">
              <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1.5">Senha</label>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-2xl px-4 py-3.5 pr-12 text-sm outline-none focus:ring-1 focus:ring-emerald-500/40 border border-white/[0.07] focus:border-emerald-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-4 bottom-3.5 text-zinc-600 hover:text-zinc-400 transition-colors">
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                }
              </button>
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
          <button
            onClick={handleSubmit}
            disabled={carregando}
            className="w-full relative overflow-hidden bg-emerald-500 text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 group"
          >
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative">
              {carregando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/25 border-t-black rounded-full animate-spin" />
                  Aguarde...
                </span>
              ) : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </span>
          </button>

          {/* divider + social proof */}
          <div className="flex items-center gap-3 mt-6 mb-0">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <p className="text-zinc-700 text-[10px] uppercase tracking-[0.2em]">Kore 2026</p>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
