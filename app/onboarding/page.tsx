'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const perfis = [
  { tipo: 'cliente',        emoji: '🏃', titulo: 'Cliente / Atleta',    descricao: 'Quero treinar, acompanhar minha evolução e me conectar com profissionais.' },
  { tipo: 'personal',       emoji: '🏋️', titulo: 'Personal Trainer',    descricao: 'Quero montar treinos, acompanhar meus alunos e ver a evolução deles.' },
  { tipo: 'nutricionista',  emoji: '🥗', titulo: 'Nutricionista',        descricao: 'Quero prescrever dietas com base nos dados reais dos meus pacientes.' },
]

export default function Onboarding() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleConfirmar() {
    if (!nome.trim()) { setErro('Digite seu nome para continuar.'); return }
    if (!selecionado) { setErro('Selecione seu perfil para continuar.'); return }

    setCarregando(true)
    setErro('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { error } = await supabase.from('perfis').insert({
      id: session.user.id,
      email: session.user.email,
      nome: nome.trim(),
      tipo: selecionado,
    })

    if (error) { setErro('Erro ao salvar perfil. Tente novamente.'); setCarregando(false); return }

    // Cliente vai para perfil completar dados (peso, altura, objetivo)
    // Profissionais vão direto para o dashboard
    if (selecionado === 'cliente') {
      router.push('/perfil?novo=true')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-widest">KORE</h1>
          <p className="text-zinc-400 mt-3 text-sm">Vamos configurar seu perfil</p>
        </div>

        <div className="mb-6">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Seu nome</label>
          <input type="text" placeholder="Como você quer ser chamado?" value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-800" />
        </div>

        <div className="mb-8">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-3 block">Quem é você na plataforma?</label>
          <div className="space-y-3">
            {perfis.map((p) => (
              <button key={p.tipo} onClick={() => setSelecionado(p.tipo)}
                className={`w-full text-left rounded-2xl p-5 border transition-all ${selecionado === p.tipo ? 'bg-white text-black border-white' : 'bg-zinc-900 text-white border-zinc-800 hover:border-zinc-600'}`}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-bold text-base">{p.titulo}</span>
                </div>
                <p className={`text-xs leading-relaxed ${selecionado === p.tipo ? 'text-zinc-600' : 'text-zinc-500'}`}>{p.descricao}</p>
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-red-400 text-sm text-center mb-4">{erro}</p>}

        <button onClick={handleConfirmar} disabled={!nome.trim() || !selecionado || carregando}
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-30">
          {carregando ? 'Salvando...' : 'Entrar no KORE →'}
        </button>

        {selecionado === 'cliente' && (
          <p className="text-zinc-600 text-xs text-center mt-4">
            Você será direcionado para completar seu perfil com peso, altura e objetivo
          </p>
        )}
      </div>
    </main>
  )
}
