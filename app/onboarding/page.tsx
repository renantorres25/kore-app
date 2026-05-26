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
  const [passo, setPasso] = useState(1)
  const [nome, setNome] = useState('')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [especialidade, setEspecialidade] = useState('')
  const [registroProfissional, setRegistroProfissional] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function handleAvancar() {
    if (!nome.trim()) { setErro('Digite seu nome para continuar.'); return }
    if (!selecionado) { setErro('Selecione seu perfil para continuar.'); return }
    if (selecionado === 'personal' || selecionado === 'nutricionista') {
      setErro(''); setPasso(2)
    } else {
      handleConfirmar()
    }
  }

  async function handleConfirmar() {
    if (!nome.trim() || !selecionado) return
    setCarregando(true)
    setErro('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const payload: Record<string, string> = {
      id: session.user.id,
      email: session.user.email!,
      nome: nome.trim(),
      tipo: selecionado,
    }
    if (especialidade.trim()) payload.especialidade = especialidade.trim()
    if (registroProfissional.trim()) payload.registro_profissional = registroProfissional.trim()

    const { error } = await supabase.from('perfis').insert(payload)

    if (error) { setErro('Erro ao salvar perfil. Tente novamente.'); setCarregando(false); return }

    if (selecionado === 'cliente') {
      router.push('/perfil?novo=true')
    } else {
      router.push('/dashboard')
    }
  }

  const isProfissional = selecionado === 'personal' || selecionado === 'nutricionista'
  const labelRegistro = selecionado === 'personal' ? 'CREF' : 'CRN'
  const placeholderRegistro = selecionado === 'personal' ? 'Ex: CREF 123456-G/SP' : 'Ex: CRN-3 12345'

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-widest">KORE</h1>
          <p className="text-zinc-400 mt-3 text-sm">
            {passo === 1 ? 'Vamos configurar seu perfil' : 'Quase lá — mais um passo'}
          </p>
        </div>

        {/* Passo 1 — nome + tipo */}
        {passo === 1 && (
          <>
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

            <button onClick={handleAvancar} disabled={!nome.trim() || !selecionado || carregando}
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-30">
              {carregando ? 'Salvando...' : isProfissional ? 'Continuar →' : 'Entrar no KORE →'}
            </button>

            {selecionado === 'cliente' && (
              <p className="text-zinc-600 text-xs text-center mt-4">
                Você será direcionado para completar seu perfil com peso, altura e objetivo
              </p>
            )}
          </>
        )}

        {/* Passo 2 — dados do profissional */}
        {passo === 2 && (
          <>
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 text-sm font-black">{selecionado === 'personal' ? 'PT' : 'NU'}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{nome}</p>
                  <p className="text-zinc-500 text-xs">{selecionado === 'personal' ? 'Personal Trainer' : 'Nutricionista'}</p>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Especialidade <span className="text-zinc-700 normal-case">— opcional</span></label>
              <input type="text"
                placeholder={selecionado === 'personal' ? 'Ex: Musculação, Crossfit, Corrida' : 'Ex: Nutrição esportiva, Emagrecimento'}
                value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}
                className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-800" />
            </div>

            <div className="mb-8">
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">{labelRegistro} <span className="text-zinc-700 normal-case">— opcional</span></label>
              <input type="text"
                placeholder={placeholderRegistro}
                value={registroProfissional} onChange={(e) => setRegistroProfissional(e.target.value)}
                className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-800" />
            </div>

            {erro && <p className="text-red-400 text-sm text-center mb-4">{erro}</p>}

            <button onClick={handleConfirmar} disabled={carregando}
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-30">
              {carregando ? 'Salvando...' : 'Entrar no KORE →'}
            </button>

            <button onClick={() => { setPasso(1); setErro('') }}
              className="w-full mt-3 text-zinc-500 text-sm py-2 hover:text-white transition-colors">
              ← Voltar
            </button>
          </>
        )}
      </div>
    </main>
  )
}
