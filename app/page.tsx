'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!email || !senha) {
      setMensagem('Preencha email e senha.')
      return
    }
    setCarregando(true)
    setMensagem('')

    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) setMensagem(error.message)
      else setMensagem('Cadastro realizado! Verifique seu email para ativar a conta.')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setMensagem('Email ou senha incorretos.')
      } else {
        const { data: perfil } = await supabase
          .from('perfis')
          .select('tipo')
          .eq('id', data.user.id)
          .single()

        if (perfil) router.push('/dashboard')
        else router.push('/onboarding')
      }
    }
    setCarregando(false)
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-white tracking-widest">KORE</h1>
          <p className="text-zinc-400 mt-2 text-sm tracking-wider">
            PERFORMANCE. INTEGRADA.
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 shadow-2xl border border-zinc-800">

          {/* Abas */}
          <div className="flex mb-8 bg-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setModo('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                modo === 'login'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setModo('cadastro')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                modo === 'cadastro'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700"
            />
            <input
              type="password"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700"
            />
          </div>

          {/* Mensagem */}
          {mensagem && (
            <p className="mt-4 text-sm text-center text-zinc-400">{mensagem}</p>
          )}

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={carregando}
            className="mt-6 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          © 2026 KORE — Todos os direitos reservados
        </p>

      </div>
    </main>
  )
}