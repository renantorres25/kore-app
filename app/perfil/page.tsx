'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const objetivos = [
  { valor: 'perder_peso', emoji: '🔥', label: 'Perder peso' },
  { valor: 'ganhar_massa', emoji: '💪', label: 'Ganhar massa' },
  { valor: 'melhorar_condicionamento', emoji: '⚡', label: 'Melhorar condicionamento' },
  { valor: 'saude_geral', emoji: '❤️', label: 'Saúde geral' },
]

const niveis = [
  { valor: 'iniciante', emoji: '🌱', label: 'Iniciante', desc: 'Menos de 1 ano treinando' },
  { valor: 'intermediario', emoji: '📈', label: 'Intermediário', desc: '1 a 3 anos treinando' },
  { valor: 'avancado', emoji: '🏆', label: 'Avançado', desc: 'Mais de 3 anos treinando' },
]

export default function Perfil() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState('')

  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [nivel, setNivel] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      setUserId(session.user.id)

      const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        if (data.data_nascimento) setDataNascimento(data.data_nascimento)
        if (data.sexo) setSexo(data.sexo)
        if (data.peso) setPeso(String(data.peso))
        if (data.altura) setAltura(String(data.altura))
        if (data.objetivo) setObjetivo(data.objetivo)
        if (data.nivel) setNivel(data.nivel)
      }

      setCarregando(false)
    }
    carregar()
  }, [router])

  function calcularIdade() {
    if (!dataNascimento) return null
    const hoje = new Date()
    const nasc = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  function calcularIMC() {
    if (!peso || !altura) return null
    const p = parseFloat(peso)
    const a = parseFloat(altura) / 100
    return (p / (a * a)).toFixed(1)
  }

  function getStatusIMC(imc: number) {
    if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-blue-400' }
    if (imc < 25) return { label: 'Peso normal', cor: 'text-emerald-400' }
    if (imc < 30) return { label: 'Sobrepeso', cor: 'text-yellow-400' }
    return { label: 'Obesidade', cor: 'text-red-400' }
  }

  async function handleSalvar() {
    if (!dataNascimento || !sexo || !peso || !altura || !objetivo || !nivel) {
      setErro('Preencha todos os campos para continuar.')
      return
    }

    setSalvando(true)
    setErro('')

    const { error } = await supabase
      .from('perfis')
      .update({
        data_nascimento: dataNascimento,
        sexo,
        peso: parseFloat(peso),
        altura: parseInt(altura),
        objetivo,
        nivel,
        perfil_completo: true,
      })
      .eq('id', userId)

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    router.push('/dashboard')
  }

  const imc = calcularIMC()
  const statusIMC = imc ? getStatusIMC(parseFloat(imc)) : null
  const idade = calcularIdade()

  if (carregando) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="max-w-md mx-auto px-4 py-8 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Meu Perfil</h1>
            <p className="text-zinc-500 text-xs">Complete seus dados para melhores resultados</p>
          </div>
        </div>

        {/* Preview IMC */}
        {imc && (
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Idade</p>
                <p className="text-white text-xl font-black">{idade}</p>
                <p className="text-zinc-600 text-[10px]">anos</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">IMC</p>
                <p className="text-white text-xl font-black">{imc}</p>
                <p className={`text-[10px] ${statusIMC?.cor}`}>{statusIMC?.label}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Peso</p>
                <p className="text-white text-xl font-black">{peso}</p>
                <p className="text-zinc-600 text-[10px]">kg</p>
              </div>
            </div>
          </div>
        )}

        {/* Data de nascimento */}
        <div className="mb-5">
          <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">
            Data de nascimento
          </label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-800 appearance-none"
          />
        </div>

        {/* Sexo */}
        <div className="mb-5">
          <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">
            Sexo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { valor: 'masculino', label: 'Masculino', emoji: '♂️' },
              { valor: 'feminino', label: 'Feminino', emoji: '♀️' },
              { valor: 'outro', label: 'Outro', emoji: '⚧' },
            ].map((s) => (
              <button
                key={s.valor}
                onClick={() => setSexo(s.valor)}
                className={`py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${
                  sexo === s.valor
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="text-lg mb-0.5">{s.emoji}</div>
                <div className="text-[10px]">{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Peso e Altura */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">
              Peso (kg)
            </label>
            <input
              type="number"
              placeholder="75"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-800"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">
              Altura (cm)
            </label>
            <input
              type="number"
              placeholder="175"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-800"
            />
          </div>
        </div>

        {/* Objetivo */}
        <div className="mb-5">
          <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">
            Objetivo principal
          </label>
          <div className="grid grid-cols-2 gap-2">
            {objetivos.map((o) => (
              <button
                key={o.valor}
                onClick={() => setObjetivo(o.valor)}
                className={`py-4 px-3 rounded-xl border text-left transition-all active:scale-95 ${
                  objetivo === o.valor
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-white border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="text-2xl mb-1">{o.emoji}</div>
                <div className="text-xs font-semibold leading-tight">{o.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Nível */}
        <div className="mb-8">
          <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">
            Nível de experiência
          </label>
          <div className="space-y-2">
            {niveis.map((n) => (
              <button
                key={n.valor}
                onClick={() => setNivel(n.valor)}
                className={`w-full flex items-center gap-4 py-4 px-4 rounded-xl border text-left transition-all active:scale-95 ${
                  nivel === n.valor
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-white border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className="text-2xl">{n.emoji}</span>
                <div>
                  <p className="text-sm font-bold">{n.label}</p>
                  <p className={`text-xs ${nivel === n.valor ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    {n.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <p className="text-red-400 text-sm text-center mb-4">{erro}</p>
        )}

        {/* Botão salvar */}
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-40 text-sm tracking-widest uppercase"
        >
          {salvando ? 'Salvando...' : 'Salvar perfil'}
        </button>

      </div>
    </main>
  )
}