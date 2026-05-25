'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

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
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* glow de fundo */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[380px] rounded-full blur-3xl opacity-[0.07]"
        style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />

      {/* voltar */}
      <button onClick={() => router.push('/')}
        className="absolute top-6 left-5 text-zinc-600 text-[10px] uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
        Início
      </button>

      <div className={`w-full max-w-sm relative transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-[5.5rem] font-black tracking-[-0.05em] leading-none select-none"
            style={{ textShadow: '0 0 80px rgba(16,185,129,0.15)' }}>
            KORE
          </h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.35em] mt-2">
            Performance integrada
          </p>
        </div>

        {/* Toggle login/cadastro */}
        <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['login', 'cadastro'] as const).map(m => (
            <button key={m} onClick={() => { setModo(m); setMensagem('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${modo === m ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-3 mb-3">
          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-white/[0.05] text-white placeholder-zinc-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-white/25 border border-white/[0.08] transition-all"
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-white/[0.05] text-white placeholder-zinc-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-white/25 border border-white/[0.08] transition-all"
          />
        </div>

        {/* Esqueci senha */}
        {modo === 'login' && (
          <div className="text-right mb-4">
            <button onClick={handleRecuperar} disabled={recuperando}
              className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors disabled:opacity-50">
              {recuperando ? 'Enviando...' : 'Esqueci minha senha'}
            </button>
          </div>
        )}

        {/* Mensagem */}
        {mensagem && (
          <div className={`rounded-2xl px-4 py-3 mb-4 text-sm leading-relaxed ${
            tipoMsg === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {mensagem}
          </div>
        )}

        {/* Botão principal */}
        <button
          onClick={handleSubmit}
          disabled={carregando}
          className="w-full bg-white text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
        >
          {carregando ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/25 border-t-black rounded-full animate-spin" />
              Aguarde...
            </span>
          ) : modo === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <p className="text-center text-zinc-800 text-[10px] mt-8">
          © 2026 KORE — Todos os direitos reservados
        </p>
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
