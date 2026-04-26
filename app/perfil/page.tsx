'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

const objetivos = [
  { valor: 'perder_peso',               emoji: '🔥', label: 'Perder peso' },
  { valor: 'ganhar_massa',              emoji: '💪', label: 'Ganhar massa' },
  { valor: 'melhorar_condicionamento',  emoji: '⚡', label: 'Condicionamento' },
  { valor: 'saude_geral',               emoji: '❤️', label: 'Saúde geral' },
]

const niveis = [
  { valor: 'iniciante',     emoji: '🌱', label: 'Iniciante',     desc: 'Menos de 1 ano treinando' },
  { valor: 'intermediario', emoji: '📈', label: 'Intermediário', desc: '1 a 3 anos treinando' },
  { valor: 'avancado',      emoji: '🏆', label: 'Avançado',      desc: 'Mais de 3 anos treinando' },
]

export default function Perfil() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNovo = searchParams.get('novo') === 'true'

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [userId, setUserId] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState('')
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
      setEmail(session.user.email ?? '')

      const { data } = await supabase.from('perfis').select('*').eq('id', session.user.id).single()
      if (data) {
        setNome(data.nome ?? '')
        setTipo(data.tipo ?? '')
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
    if (imc < 25)   return { label: 'Peso normal',    cor: 'text-emerald-400' }
    if (imc < 30)   return { label: 'Sobrepeso',      cor: 'text-yellow-400' }
    return                  { label: 'Obesidade',      cor: 'text-red-400' }
  }

  async function handleSalvar() {
    if (!dataNascimento || !sexo || !peso || !altura || !objetivo || !nivel) {
      setErro('Preencha todos os campos para continuar.')
      return
    }
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('perfis').update({
      data_nascimento: dataNascimento,
      sexo,
      peso: parseFloat(peso),
      altura: parseInt(altura),
      objetivo,
      nivel,
      perfil_completo: true,
    }).eq('id', userId)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return }

    setSalvando(false)

    // Se é novo usuário, vai para o dashboard após salvar
    if (isNovo) {
      router.push('/dashboard')
    } else {
      setSucesso(true)
      setTimeout(() => setSucesso(false), 2000)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const imc = calcularIMC()
  const statusIMC = imc ? getStatusIMC(parseFloat(imc)) : null
  const idade = calcularIdade()
  const tipoLabel = tipo === 'personal' ? 'Personal Trainer' : tipo === 'nutricionista' ? 'Nutricionista' : 'Atleta'
  const tipoColor = tipo === 'personal' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : tipo === 'nutricionista' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'

  const camposPreenchidos = dataNascimento && sexo && peso && altura && objetivo && nivel
  const progresso = [dataNascimento, sexo, peso, altura, objetivo, nivel].filter(Boolean).length

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
            <h1 className="text-[1.85rem] font-black tracking-tight text-white">
              {isNovo ? 'Bem-vindo! 👋' : 'Perfil'}
            </h1>
            {isNovo && (
              <p className="text-zinc-500 text-xs mt-1">Complete seu perfil para a IA te ajudar melhor</p>
            )}
          </div>
          {!isNovo && (
            <button onClick={handleLogout}
              className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
              Sair
            </button>
          )}
        </div>

        {/* Barra de progresso — só para novo usuário */}
        {isNovo && (
          <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider">Configuração do perfil</p>
              <p className="text-emerald-400 text-[11px] font-bold">{progresso}/6</p>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(progresso / 6) * 100}%` }} />
            </div>
            <p className="text-zinc-600 text-[10px] mt-2">
              {progresso === 6
                ? '✓ Tudo preenchido! Salve para entrar no KORE.'
                : 'Preencha todos os dados para que a IA possa te ajudar com precisão.'}
            </p>
          </div>
        )}

        {/* Card identidade */}
        <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-white">{(nome || email)[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-lg leading-tight truncate">{nome || 'Sem nome'}</p>
              <p className="text-zinc-500 text-xs truncate">{email}</p>
              <div className={`inline-flex items-center gap-1.5 mt-1.5 rounded-full px-2.5 py-1 border text-[10px] font-semibold uppercase tracking-wider ${tipoColor}`}>
                <span className="w-1 h-1 rounded-full bg-current" />
                {tipoLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Stats IMC — só se tiver dados */}
        {imc && (
          <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">Idade</p>
                <p className="text-white text-2xl font-black">{idade}</p>
                <p className="text-zinc-600 text-[10px]">anos</p>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">IMC</p>
                <p className="text-white text-2xl font-black">{imc}</p>
                <p className={`text-[10px] font-semibold ${statusIMC?.cor}`}>{statusIMC?.label}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">Peso</p>
                <p className="text-white text-2xl font-black">{peso}</p>
                <p className="text-zinc-600 text-[10px]">kg</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="space-y-4">

          {/* Data nascimento */}
          <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Data de nascimento</p>
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)}
              className="w-full bg-white/[0.04] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08] appearance-none" />
          </div>

          {/* Sexo */}
          <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Sexo</p>
            <div className="grid grid-cols-3 gap-2">
              {[{ valor: 'masculino', label: 'Masculino', emoji: '♂️' }, { valor: 'feminino', label: 'Feminino', emoji: '♀️' }, { valor: 'outro', label: 'Outro', emoji: '⚧' }].map((s) => (
                <button key={s.valor} onClick={() => setSexo(s.valor)}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${sexo === s.valor ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:border-white/20'}`}>
                  <div className="text-lg mb-0.5">{s.emoji}</div>
                  <div className="text-[10px]">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Peso e Altura */}
          <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Medidas</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-600 text-[10px] mb-1 block">Peso (kg)</label>
                <input type="number" placeholder="75" value={peso} onChange={(e) => setPeso(e.target.value)}
                  className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
              </div>
              <div>
                <label className="text-zinc-600 text-[10px] mb-1 block">Altura (cm)</label>
                <input type="number" placeholder="175" value={altura} onChange={(e) => setAltura(e.target.value)}
                  className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
              </div>
            </div>
          </div>

          {/* Objetivo */}
          <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Objetivo principal</p>
            <div className="grid grid-cols-2 gap-2">
              {objetivos.map((o) => (
                <button key={o.valor} onClick={() => setObjetivo(o.valor)}
                  className={`py-4 px-3 rounded-xl border text-left transition-all active:scale-95 ${objetivo === o.valor ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-white border-white/[0.08] hover:border-white/20'}`}>
                  <div className="text-2xl mb-1">{o.emoji}</div>
                  <div className="text-xs font-semibold leading-tight">{o.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nível */}
          <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Nível de experiência</p>
            <div className="space-y-2">
              {niveis.map((n) => (
                <button key={n.valor} onClick={() => setNivel(n.valor)}
                  className={`w-full flex items-center gap-4 py-4 px-4 rounded-xl border text-left transition-all active:scale-95 ${nivel === n.valor ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-white border-white/[0.08] hover:border-white/20'}`}>
                  <span className="text-2xl">{n.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{n.label}</p>
                    <p className={`text-xs ${nivel === n.valor ? 'text-zinc-600' : 'text-zinc-500'}`}>{n.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {erro && <p className="text-red-400 text-sm text-center mt-4">{erro}</p>}
        {sucesso && <p className="text-emerald-400 text-sm text-center mt-4">✓ Perfil salvo!</p>}

        <button onClick={handleSalvar} disabled={salvando || !camposPreenchidos}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase mt-6">
          {salvando ? 'Salvando...' : isNovo ? 'Entrar no KORE →' : 'Salvar perfil'}
        </button>

        {isNovo && !camposPreenchidos && (
          <p className="text-zinc-600 text-[11px] text-center mt-3">
            Preencha todos os campos para continuar
          </p>
        )}

        {/* Pular por enquanto — só para novo usuário */}
        {isNovo && (
          <button onClick={() => router.push('/dashboard')}
            className="w-full text-zinc-600 text-xs py-3 mt-2 hover:text-zinc-400 transition-colors">
            Pular por enquanto — completar depois
          </button>
        )}

      </div>

      {/* Bottom Nav — esconde para novo usuário para não distrair */}
      {!isNovo && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
          <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
            {[
              { id: 'home',     icon: '⬜', label: 'Início',   path: '/dashboard' },
              { id: 'treino',   icon: '◈',  label: 'Treino',   path: '/treino'    },
              { id: 'nutri',    icon: '◇',  label: 'Nutrição', path: '/nutricao'  },
              { id: 'evolucao', icon: '△',  label: 'Evolução', path: '/evolucao'  },
              { id: 'perfil',   icon: '◉',  label: 'Perfil',   path: '/perfil'    },
            ].map((item) => (
              <button key={item.id} onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90">
                <span className={`text-lg transition-all duration-200 ${item.id === 'perfil' ? 'opacity-100' : 'opacity-20'}`}>{item.icon}</span>
                <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${item.id === 'perfil' ? 'text-white' : 'text-zinc-700'}`}>{item.label}</span>
                {item.id === 'perfil' && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
              </button>
            ))}
          </div>
        </nav>
      )}
    </main>
  )
}