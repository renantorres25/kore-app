'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const objetivos = [
  { valor: 'perder_peso',              emoji: '🔥', label: 'Perder peso' },
  { valor: 'ganhar_massa',             emoji: '💪', label: 'Ganhar massa' },
  { valor: 'melhorar_condicionamento', emoji: '⚡', label: 'Condicionamento' },
  { valor: 'saude_geral',              emoji: '❤️', label: 'Saúde geral' },
]

const niveis = [
  { valor: 'iniciante',     emoji: '🌱', label: 'Iniciante',     desc: 'Menos de 1 ano treinando' },
  { valor: 'intermediario', emoji: '📈', label: 'Intermediário', desc: '1 a 3 anos treinando' },
  { valor: 'avancado',      emoji: '🏆', label: 'Avançado',      desc: 'Mais de 3 anos treinando' },
]

const modalidadesOpcoes = [
  { valor: 'musculacao', label: 'Musculação', icon: '🏋️' },
  { valor: 'corrida',    label: 'Corrida',    icon: '🏃' },
  { valor: 'bike',       label: 'Bike',       icon: '🚴' },
  { valor: 'natacao',    label: 'Natação',    icon: '🏊' },
  { valor: 'crossfit',   label: 'Crossfit',   icon: '⚡' },
  { valor: 'triatlon',   label: 'Triathlon',  icon: '🏅' },
  { valor: 'futebol',    label: 'Futebol',    icon: '⚽' },
  { valor: 'outro',      label: 'Outro',      icon: '🎯' },
]

function PerfilConteudo() {
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

  // Dados básicos
  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [nivel, setNivel] = useState('')

  // Dados atléticos
  const [fcmax, setFcmax] = useState('')
  const [ftp, setFtp] = useState('')           // FTP bike (watts)
  const [modalidades, setModalidades] = useState<string[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'basico' | 'atletico'>('basico')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
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
        if (data.fcmax) setFcmax(String(data.fcmax))
        if (data.ftp) setFtp(String(data.ftp))
        if (data.modalidades) setModalidades(data.modalidades)
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

  // FCmax estimada pela fórmula 220-idade se não informado
  function getFCmaxEstimada(): number | null {
    if (fcmax) return parseInt(fcmax)
    const idade = calcularIdade()
    if (!idade) return null
    return 220 - idade
  }

  function calcularZonas() {
    const fcmaxVal = getFCmaxEstimada()
    if (!fcmaxVal) return null
    return {
      Z1: { min: Math.round(fcmaxVal * 0.50), max: Math.round(fcmaxVal * 0.60) },
      Z2: { min: Math.round(fcmaxVal * 0.60), max: Math.round(fcmaxVal * 0.70) },
      Z3: { min: Math.round(fcmaxVal * 0.70), max: Math.round(fcmaxVal * 0.80) },
      Z4: { min: Math.round(fcmaxVal * 0.80), max: Math.round(fcmaxVal * 0.90) },
      Z5: { min: Math.round(fcmaxVal * 0.90), max: fcmaxVal },
    }
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

  function toggleModalidade(val: string) {
    setModalidades(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  async function handleSalvar() {
    if (!(tipo === 'personal' || tipo === 'nutricionista') && (!dataNascimento || !sexo || !peso || !altura || !objetivo || !nivel)) {
      setErro('Preencha todos os campos básicos para continuar.')
      return
    }
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('perfis').update({
      data_nascimento: dataNascimento || null,
      sexo: sexo || null,
      peso: peso ? parseFloat(peso) : null,
      altura: altura ? parseInt(altura) : null,
      objetivo: objetivo || null,
      nivel: nivel || null,
      perfil_completo: true,
      fcmax: fcmax ? parseInt(fcmax) : null,
      ftp: ftp ? parseInt(ftp) : null,
      modalidades: modalidades.length > 0 ? modalidades : null,
    }).eq('id', userId)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
    setSalvando(false)
    if (isNovo) { router.push('/dashboard') }
    else { setSucesso(true); setTimeout(() => setSucesso(false), 2000) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const imc = calcularIMC()
  const statusIMC = imc ? getStatusIMC(parseFloat(imc)) : null
  const idade = calcularIdade()
  const zonas = calcularZonas()
  const fcmaxEstimada = getFCmaxEstimada()
  const tipoLabel = tipo === 'personal' ? 'Personal Trainer' : tipo === 'nutricionista' ? 'Nutricionista' : 'Atleta'
  const tipoColor = tipo === 'personal' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : tipo === 'nutricionista' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
  const isProf = tipo === 'personal' || tipo === 'nutricionista'
  const camposPreenchidos = isProf ? true : !!(dataNascimento && sexo && peso && altura && objetivo && nivel)
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
            {isNovo && <p className="text-zinc-500 text-xs mt-1">Complete seu perfil para a IA te ajudar melhor</p>}
          </div>
          {!isNovo && (
            <button onClick={handleLogout}
              className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
              Sair
            </button>
          )}
        </div>

        {/* Progresso novo usuário */}
        {isNovo && (
          <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider">Configuração do perfil</p>
              <p className="text-emerald-400 text-[11px] font-bold">{progresso}/6</p>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(progresso / 6) * 100}%` }} />
            </div>
            <p className="text-zinc-600 text-[10px] mt-2">
              {progresso === 6 ? '✓ Tudo preenchido! Salve para entrar.' : 'Dados básicos obrigatórios. Dados atléticos opcionais mas melhoram muito a IA.'}
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

        {/* Stats */}
        {imc && (
          <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">Idade</p>
                <p className="text-white text-xl font-black">{idade}</p>
                <p className="text-zinc-600 text-[10px]">anos</p>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">IMC</p>
                <p className="text-white text-xl font-black">{imc}</p>
                <p className={`text-[9px] font-semibold ${statusIMC?.cor}`}>{statusIMC?.label}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">FCmax</p>
                <p className={`text-xl font-black ${fcmax ? 'text-white' : 'text-zinc-500'}`}>{fcmaxEstimada ?? '—'}</p>
                <p className="text-zinc-600 text-[9px]">{fcmax ? 'real' : 'estimada'}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">FTP</p>
                <p className={`text-xl font-black ${ftp ? 'text-orange-400' : 'text-zinc-500'}`}>{ftp || '—'}</p>
                <p className="text-zinc-600 text-[9px]">watts</p>
              </div>
            </div>
          </div>
        )}

        {/* Abas — só mostra aba atlética para clientes */}
        {!isProf && (
          <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {([['basico', '👤 Dados básicos'], ['atletico', '⚡ Dados atléticos']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setAbaAtiva(id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${abaAtiva === id ? 'bg-white text-black' : 'text-zinc-500'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ABA BÁSICO */}
        {abaAtiva === 'basico' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Data de nascimento</p>
              <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)}
                className="w-full bg-white/[0.04] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
            </div>

            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Sexo</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ valor: 'masculino', label: 'Masculino', emoji: '♂️' }, { valor: 'feminino', label: 'Feminino', emoji: '♀️' }, { valor: 'outro', label: 'Outro', emoji: '⚧' }].map(s => (
                  <button key={s.valor} onClick={() => setSexo(s.valor)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${sexo === s.valor ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-zinc-400 border-white/[0.08]'}`}>
                    <div className="text-lg mb-0.5">{s.emoji}</div>
                    <div className="text-[10px]">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Medidas</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-600 text-[10px] mb-1 block">Peso (kg)</label>
                  <input type="number" placeholder="75" value={peso} onChange={e => setPeso(e.target.value)}
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] mb-1 block">Altura (cm)</label>
                  <input type="number" placeholder="175" value={altura} onChange={e => setAltura(e.target.value)}
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
                </div>
              </div>
            </div>

            {!isProf && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Objetivo principal</p>
                <div className="grid grid-cols-2 gap-2">
                  {objetivos.map(o => (
                    <button key={o.valor} onClick={() => setObjetivo(o.valor)}
                      className={`py-4 px-3 rounded-xl border text-left transition-all active:scale-95 ${objetivo === o.valor ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-white border-white/[0.08]'}`}>
                      <div className="text-2xl mb-1">{o.emoji}</div>
                      <div className="text-xs font-semibold leading-tight">{o.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isProf && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Nível de experiência</p>
                <div className="space-y-2">
                  {niveis.map(n => (
                    <button key={n.valor} onClick={() => setNivel(n.valor)}
                      className={`w-full flex items-center gap-4 py-4 px-4 rounded-xl border text-left transition-all active:scale-95 ${nivel === n.valor ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-white border-white/[0.08]'}`}>
                      <span className="text-2xl">{n.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{n.label}</p>
                        <p className={`text-xs ${nivel === n.valor ? 'text-zinc-600' : 'text-zinc-500'}`}>{n.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA ATLÉTICO */}
        {abaAtiva === 'atletico' && (
          <div className="space-y-4">

            <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3">
              <span className="text-lg shrink-0">💡</span>
              <p className="text-zinc-500 text-xs leading-relaxed">Dados opcionais — mas quanto mais você preencher, mais precisa e personalizada será a análise da IA. A FCmax real é o dado mais importante.</p>
            </div>

            {/* Modalidades */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Modalidades que pratica</p>
              <p className="text-zinc-600 text-xs mb-4">Selecione todas que fazem parte da sua rotina</p>
              <div className="grid grid-cols-4 gap-2">
                {modalidadesOpcoes.map(m => {
                  const sel = modalidades.includes(m.valor)
                  return (
                    <button key={m.valor} onClick={() => toggleModalidade(m.valor)}
                      className={`flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${sel ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'}`}>
                      <span className="text-xl mb-1">{m.icon}</span>
                      <span className="text-[9px] font-semibold text-center leading-tight">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* FCmax */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">❤️ Frequência cardíaca máxima (FCmax)</p>
              <p className="text-zinc-600 text-xs mb-4 leading-relaxed">O dado mais importante para análise de zonas. Faça um teste de FCmax ou use o valor do seu Garmin/Apple Watch. Sem isso, estimamos pela fórmula 220-idade.</p>
              <div className="flex items-center gap-3">
                <input type="number" placeholder={fcmaxEstimada ? `Estimada: ${fcmaxEstimada}` : 'Ex: 185'} value={fcmax}
                  onChange={e => setFcmax(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/30 transition-colors" />
                <span className="text-zinc-500 text-sm shrink-0">bpm</span>
              </div>
              {fcmax && zonas && (
                <div className="mt-4 space-y-2">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-2">Suas zonas calculadas</p>
                  {Object.entries(zonas).map(([zona, { min, max }]) => {
                    const cores: Record<string, string> = { Z1: 'text-blue-400', Z2: 'text-emerald-400', Z3: 'text-yellow-400', Z4: 'text-orange-400', Z5: 'text-red-400' }
                    const labels: Record<string, string> = { Z1: 'Recuperação', Z2: 'Base aeróbica', Z3: 'Tempo', Z4: 'Limiar', Z5: 'VO2max' }
                    return (
                      <div key={zona} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black ${cores[zona]}`}>{zona}</span>
                          <span className="text-zinc-600 text-[11px]">{labels[zona]}</span>
                        </div>
                        <span className={`text-sm font-bold ${cores[zona]}`}>{min}–{max} bpm</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {!fcmax && idade && (
                <p className="text-zinc-700 text-[10px] mt-2">Sem FCmax real, usaremos estimativa de {220 - idade}bpm (220 - {idade} anos)</p>
              )}
            </div>

            {/* FTP bike */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">🚴 FTP — Limiar de Potência Funcional</p>
              <p className="text-zinc-600 text-xs mb-4 leading-relaxed">Para ciclistas com medidor de potência. É a maior potência que você sustenta por 1 hora. Usado para calcular zonas de potência no bike.</p>
              <div className="flex items-center gap-3">
                <input type="number" placeholder="Ex: 220" value={ftp}
                  onChange={e => setFtp(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/30 transition-colors" />
                <span className="text-zinc-500 text-sm shrink-0">watts</span>
              </div>
              {ftp && (
                <div className="mt-4 space-y-2">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-2">Zonas de potência</p>
                  {[
                    { zona: 'Z1', label: 'Recuperação ativa', min: 0,    max: Math.round(parseInt(ftp) * 0.55), cor: 'text-blue-400' },
                    { zona: 'Z2', label: 'Endurance',          min: Math.round(parseInt(ftp) * 0.56), max: Math.round(parseInt(ftp) * 0.75), cor: 'text-emerald-400' },
                    { zona: 'Z3', label: 'Tempo',              min: Math.round(parseInt(ftp) * 0.76), max: Math.round(parseInt(ftp) * 0.90), cor: 'text-yellow-400' },
                    { zona: 'Z4', label: 'Limiar (FTP)',       min: Math.round(parseInt(ftp) * 0.91), max: Math.round(parseInt(ftp) * 1.05), cor: 'text-orange-400' },
                    { zona: 'Z5', label: 'VO2max',             min: Math.round(parseInt(ftp) * 1.06), max: Math.round(parseInt(ftp) * 1.20), cor: 'text-red-400' },
                  ].map(z => (
                    <div key={z.zona} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${z.cor}`}>{z.zona}</span>
                        <span className="text-zinc-600 text-[11px]">{z.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${z.cor}`}>{z.min}–{z.max}W</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {erro && <p className="text-red-400 text-sm text-center mt-4">{erro}</p>}
        {sucesso && <p className="text-emerald-400 text-sm text-center mt-4">✓ Perfil salvo!</p>}

        <button onClick={handleSalvar} disabled={salvando || !camposPreenchidos}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase mt-6">
          {salvando ? 'Salvando...' : isNovo ? 'Entrar no KORE →' : 'Salvar perfil'}
        </button>

        {isNovo && !camposPreenchidos && (
          <p className="text-zinc-600 text-[11px] text-center mt-3">Preencha todos os campos básicos para continuar</p>
        )}
        {isNovo && (
          <button onClick={() => router.push('/dashboard')} className="w-full text-zinc-600 text-xs py-3 mt-2 hover:text-zinc-400 transition-colors">
            Pular por enquanto — completar depois
          </button>
        )}
      </div>

      {!isNovo && <NavBar tipo={tipo || 'cliente'} ativa="perfil" />}
    </main>
  )
}

export default function Perfil() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PerfilConteudo />
    </Suspense>
  )
}
