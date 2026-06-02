'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { atualizarDecisaoDia } from '../lib/atualizarDecisaoDia'
import NavBar from '../components/NavBar'

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

const indicadores = [
  { id: 'energia',       label: 'Energia',       descricao: 'Como está seu nível de energia hoje?',    icones: ['😴','😕','😐','😊','⚡'], labels: ['Esgotado','Baixa','Normal','Boa','Máxima'] },
  { id: 'humor',         label: 'Humor',          descricao: 'Como está seu estado emocional?',         icones: ['😢','😔','😐','🙂','😁'], labels: ['Péssimo','Ruim','Normal','Bom','Ótimo'] },
  { id: 'dor_muscular',  label: 'Dor muscular',   descricao: 'Sente dor ou fadiga nos músculos?',       icones: ['🔴','🟠','🟡','🟢','✅'], labels: ['Intensa','Alta','Moderada','Leve','Nenhuma'] },
  { id: 'qualidade_sono',label: 'Sono',           descricao: 'Como foi o sono da noite anterior?',      icones: ['😫','😪','😐','😴','🌙'], labels: ['Péssimo','Ruim','Regular','Bom','Ótimo'] },
]

export default function BemEstar() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [jaRegistrou, setJaRegistrou] = useState(false)
  const [userId, setUserId] = useState('')
  const [registroId, setRegistroId] = useState<string | null>(null)
  const [valores, setValores] = useState<Record<string, number>>({ energia: 0, humor: 0, dor_muscular: 0, qualidade_sono: 0 })
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const hoje = getTodayBR()
      const { data } = await supabase.from('bem_estar').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single()
      if (data) {
        setJaRegistrou(true)
        setRegistroId(data.id)
        setValores({ energia: data.energia, humor: data.humor, dor_muscular: data.dor_muscular, qualidade_sono: data.qualidade_sono })
        setNotas(data.notas ?? '')
      }
      setCarregando(false)
    }
    carregar()
  }, [router])

  function setValor(id: string, valor: number) { setValores(prev => ({ ...prev, [id]: valor })) }
  function getTotalPreenchido() { return Object.values(valores).filter(v => v > 0).length }
  function getMediaGeral() {
    const vals = Object.values(valores).filter(v => v > 0)
    if (!vals.length) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  function getCorMedia(m: number) { return m <= 2 ? 'text-red-400' : m === 3 ? 'text-yellow-400' : 'text-emerald-400' }
  function getLabelMedia(m: number) { return m <= 1 ? 'Dia difícil' : m === 2 ? 'Abaixo do normal' : m === 3 ? 'Normal' : m === 4 ? 'Bem disposto' : 'No seu melhor!' }

  async function handleSalvar() {
    if (getTotalPreenchido() < 4) { setErro('Preencha todos os indicadores antes de salvar.'); return }
    setSalvando(true)
    setErro('')
    const payload = {
      usuario_id: userId,
      data: getTodayBR(),
      energia: valores.energia,
      humor: valores.humor,
      dor_muscular: valores.dor_muscular,
      qualidade_sono: valores.qualidade_sono,
      notas: notas.trim() || null,
    }
    let error
    if (jaRegistrou && registroId) {
      const res = await supabase.from('bem_estar').update(payload).eq('id', registroId)
      error = res.error
    } else {
      const res = await supabase.from('bem_estar').insert(payload)
      error = res.error
    }
    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
    setSucesso(true)
    atualizarDecisaoDia(userId) // ← atualiza decisão do dia em background
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  const media = getMediaGeral()
  const total = getTotalPreenchido()

  if (carregando) return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (sucesso) return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">✅</div>
        <p className="text-white font-bold text-lg">Registrado!</p>
        <p className="text-zinc-500 text-sm">Voltando ao dashboard...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#0d1117] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/dashboard')} className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/[0.14] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95">←</button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Como estou hoje</h1>
            <p className="text-zinc-500 text-xs">{jaRegistrou ? 'Atualizar registro de hoje' : 'Registro diário de bem-estar'}</p>
          </div>
        </div>

        {media && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--surface-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Seu estado geral hoje</p>
                <p className={`text-xl font-black ${getCorMedia(media)}`}>{getLabelMedia(media)}</p>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-black ${getCorMedia(media)}`}>{media}</p>
                <p className="text-zinc-600 text-xs">de 5</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-white/[0.09] rounded-full">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${media <= 2 ? 'bg-red-400' : media === 3 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${(media / 5) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-5 mb-6">
          {indicadores.map((ind) => (
            <div key={ind.id} className="rounded-2xl p-5" style={{ background: 'var(--surface-1)' }}>
              <p className="text-white font-bold text-sm mb-0.5">{ind.label}</p>
              <p className="text-zinc-500 text-xs mb-4">{ind.descricao}</p>
              <div className="flex justify-between gap-1">
                {[1,2,3,4,5].map((v) => (
                  <button key={v} onClick={() => setValor(ind.id, v)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${valores[ind.id] === v ? 'bg-white border-white' : 'bg-white/[0.07] border-white/[0.14] hover:border-white/20'}`}>
                    <span className="text-xl">{ind.icones[v-1]}</span>
                    <span className={`text-[9px] font-semibold leading-tight text-center ${valores[ind.id] === v ? 'text-black' : 'text-zinc-500'}`}>{ind.labels[v-1]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="text-zinc-400 text-[10px] uppercase tracking-widest mb-2 block">Observações <span className="text-zinc-600 normal-case">(opcional)</span></label>
          <textarea placeholder="Algo específico que quer registrar?" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3}
            className="w-full bg-white/[0.07] text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20 border border-white/[0.14] resize-none" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1">
            {[0,1,2,3].map((i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < total ? 'bg-white' : 'bg-white/[0.15]'}`} />)}
          </div>
          <p className="text-zinc-500 text-xs">{total} de 4 preenchidos</p>
        </div>

        {erro && <p className="text-red-400 text-sm text-center mb-4">{erro}</p>}

        <button onClick={handleSalvar} disabled={salvando || total < 4}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase">
          {salvando ? 'Salvando...' : jaRegistrou ? 'Atualizar registro' : 'Registrar bem-estar'}
        </button>
      </div>
      <NavBar tipo="cliente" ativa="bem-estar" />
    </main>
  )
}
