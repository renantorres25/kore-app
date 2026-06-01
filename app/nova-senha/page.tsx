'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function NovaSenha() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMsg, setTipoMsg] = useState<'error' | 'success'>('error')
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronto(true)
      else router.push('/login')
    })
  }, [router])

  async function handleSalvar() {
    if (!senha || senha.length < 6) {
      setTipoMsg('error'); setMensagem('A senha deve ter pelo menos 6 caracteres.'); return
    }
    if (senha !== confirmar) {
      setTipoMsg('error'); setMensagem('As senhas não coincidem.'); return
    }
    setCarregando(true); setMensagem('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setTipoMsg('error'); setMensagem('Erro ao atualizar senha. Tente novamente.')
    } else {
      setTipoMsg('success'); setMensagem('Senha atualizada com sucesso!')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
    setCarregando(false)
  }

  if (!pronto) return (
    <main className="min-h-screen bg-[#111111] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full blur-3xl opacity-[0.06]"
        style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10">
          <h1 className="text-[5rem] font-black tracking-[-0.05em] leading-none"
            style={{ textShadow: '0 0 60px rgba(16,185,129,0.12)' }}>
            KORE
          </h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.35em] mt-2">Nova senha</p>
        </div>

        <div className="space-y-3 mb-4">
          <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={senha}
            onChange={e => setSenha(e.target.value)}
            className="w-full bg-white/[0.05] text-white placeholder-zinc-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-white/25 border border-white/[0.14]" />
          <input type="password" placeholder="Confirmar nova senha" value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSalvar()}
            className="w-full bg-white/[0.05] text-white placeholder-zinc-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-1 focus:ring-white/25 border border-white/[0.14]" />
        </div>

        {mensagem && (
          <div className={`rounded-2xl px-4 py-3 mb-4 text-sm ${
            tipoMsg === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {mensagem}
          </div>
        )}

        <button onClick={handleSalvar} disabled={carregando}
          className="w-full bg-white text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40">
          {carregando ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/25 border-t-black rounded-full animate-spin" />
              Salvando...
            </span>
          ) : 'Salvar nova senha'}
        </button>
      </div>
    </main>
  )
}
