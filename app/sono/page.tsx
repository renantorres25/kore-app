'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

type DadosSono = {
  id?: string
  duracao_minutos: number | null
  qualidade: number | null
  fc_repouso: number | null
  hrv: number | null
  spo2: number | null
  fonte: string
  analise_ia?: string | null
  score_recuperacao?: number | null
}

type DadosBemEstar = {
  energia: number
  humor: number
  dor_muscular: number
  qualidade_sono: number
  notas: string | null
}

function formatarDuracao(minutos: number | null) {
  if (!minutos) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${h}h${m > 0 ? `${m}min` : ''}`
}

function getScoreRecuperacao(sono: DadosSono, bemEstar: DadosBemEstar | null) {
  let score = 0
  let total = 0
  if (sono.qualidade) { score += (sono.qualidade / 5) * 25; total += 25 }
  if (sono.duracao_minutos) {
    const ideal = 480
    const diff = Math.abs(sono.duracao_minutos - ideal)
    const pontos = Math.max(0, 25 - (diff / ideal) * 25)
    score += pontos; total += 25
  }
  if (sono.hrv) { score += Math.min(25, (sono.hrv / 100) * 25); total += 25 }
  if (bemEstar) {
    const media = (bemEstar.energia + bemEstar.humor + (6 - bemEstar.dor_muscular)) / 3
    score += (media / 5) * 25; total += 25
  }
  if (total === 0) return null
  return Math.round((score / total) * 100)
}

function getCorScore(score: number) {
  if (score >= 80) return { cor: 'text-emerald-400', bg: 'bg-emerald-400', label: 'Excelente', emoji: '🟢' }
  if (score >= 60) return { cor: 'text-yellow-400', bg: 'bg-yellow-400', label: 'Boa', emoji: '🟡' }
  if (score >= 40) return { cor: 'text-orange-400', bg: 'bg-orange-400', label: 'Regular', emoji: '🟠' }
  return { cor: 'text-red-400', bg: 'bg-red-400', label: 'Ruim', emoji: '🔴' }
}

export default function Sono() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [analisando, setAnalisando] = useState(false)
  const [userId, setUserId] = useState('')
  const [nomePerfil, setNomePerfil] = useState('')
  const [peso, setPeso] = useState<number | null>(null)
  const [altura, setAltura] = useState<number | null>(null)
  const [objetivo, setObjetivo] = useState<string | null>(null)
  const [sono, setSono] = useState<DadosSono>({ duracao_minutos: null, qualidade: null, fc_repouso: null, hrv: null, spo2: null, fonte: 'manual', analise_ia: null, score_recuperacao: null })
  const [bemEstar, setBemEstar] = useState<DadosBemEstar | null>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [analiseIA, setAnaliseIA] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [horasSono, setHorasSono] = useState('')
  const [minutosSono, setMinutosSono] = useState('')
  const [fcRepouso, setFcRepouso] = useState('')
  const [hrv, setHrv] = useState('')
  const [spo2, setSpo2] = useState('')
  const [qualidade, setQualidade] = useState(0)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)
      const hoje = getTodayBR()

      const { data: perfil } = await supabase.from('perfis').select('nome, peso, altura, objetivo').eq('id', session.user.id).single()
      if (perfil) { setNomePerfil(perfil.nome ?? ''); setPeso(perfil.peso); setAltura(perfil.altura); setObjetivo(perfil.objetivo) }

      const { data: sonoHoje } = await supabase.from('sono').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single()
      if (sonoHoje) {
        setSono(sonoHoje)
        if (sonoHoje.analise_ia) setAnaliseIA(sonoHoje.analise_ia)
        if (sonoHoje.duracao_minutos) { setHorasSono(String(Math.floor(sonoHoje.duracao_minutos / 60))); setMinutosSono(String(sonoHoje.duracao_minutos % 60)) }
        if (sonoHoje.fc_repouso) setFcRepouso(String(sonoHoje.fc_repouso))
        if (sonoHoje.hrv) setHrv(String(sonoHoje.hrv))
        if (sonoHoje.spo2) setSpo2(String(sonoHoje.spo2))
        if (sonoHoje.qualidade) setQualidade(sonoHoje.qualidade)
      } else { setEditando(true) }

      const { data: be } = await supabase.from('bem_estar').select('energia, humor, dor_muscular, qualidade_sono, notas').eq('usuario_id', session.user.id).eq('data', hoje).single()
      if (be) setBemEstar(be)

      const { data: hist } = await supabase.from('sono').select('data, duracao_minutos, qualidade, hrv, score_recuperacao').eq('usuario_id', session.user.id).order('data', { ascending: false }).limit(7)
      if (hist) setHistorico(hist)
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function handleSalvar() {
    const duracao = (parseInt(horasSono || '0') * 60) + parseInt(minutosSono || '0')
    const scoreCalculado = getScoreRecuperacao({ duracao_minutos: duracao || null, qualidade: qualidade || null, fc_repouso: fcRepouso ? parseInt(fcRepouso) : null, hrv: hrv ? parseInt(hrv) : null, spo2: spo2 ? parseFloat(spo2) : null, fonte: 'manual' }, bemEstar)
    const payload = {
      usuario_id: userId,
      data: getTodayBR(),
      duracao_minutos: duracao || null,
      qualidade: qualidade || null,
      fc_repouso: fcRepouso ? parseInt(fcRepouso) : null,
      hrv: hrv ? parseInt(hrv) : null,
      spo2: spo2 ? parseFloat(spo2) : null,
      fonte: 'manual',
      score_recuperacao: scoreCalculado,
      analise_ia: null,
    }
    if (sono.id) { await supabase.from('sono').update(payload).eq('id', sono.id) }
    else { await supabase.from('sono').insert(payload) }
    setSono({ ...payload, id: sono.id })
    setAnaliseIA(null)
    setEditando(false)
    const { data: sonoAtualizado } = await supabase.from('sono').select('*').eq('usuario_id', userId).eq('data', getTodayBR()).single()
    if (sonoAtualizado) setSono(sonoAtualizado)
  }

  async function gerarAnaliseIA() {
    setAnalisando(true)
    const score = getScoreRecuperacao(sono, bemEstar)
    const contexto = `Você é um especialista em performance humana e recuperação. Analise os dados abaixo e gere uma análise personalizada, direta e útil para o atleta. Seja específico, use os números, e termine com 1-2 recomendações práticas para hoje.

DADOS DO ATLETA:
- Nome: ${nomePerfil}
- Peso: ${peso ? `${peso}kg` : 'não informado'}
- Altura: ${altura ? `${altura}cm` : 'não informado'}
- Objetivo: ${objetivo ?? 'não informado'}

DADOS DE SONO:
- Duração: ${formatarDuracao(sono.duracao_minutos)}
- Qualidade subjetiva: ${sono.qualidade ? `${sono.qualidade}/5` : 'não informado'}
- FC em repouso: ${sono.fc_repouso ? `${sono.fc_repouso} bpm` : 'não informado'}
- HRV: ${sono.hrv ? `${sono.hrv} ms` : 'não informado'}
- SpO2: ${sono.spo2 ? `${sono.spo2}%` : 'não informado'}

BEM-ESTAR:
- Energia: ${bemEstar ? `${bemEstar.energia}/5` : 'não registrado'}
- Humor: ${bemEstar ? `${bemEstar.humor}/5` : 'não registrado'}
- Dor muscular: ${bemEstar ? `${bemEstar.dor_muscular}/5` : 'não registrado'}

SCORE DE RECUPERAÇÃO: ${score ? `${score}/100` : 'insuficiente'}

Responda em português, de forma direta e pessoal. Máximo 4 parágrafos curtos. Sem markdown, sem bullets, sem títulos.`

    try {
      const response = await fetch('/api/analise-sono', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: contexto }) })
      const data = await response.json()
      setAnaliseIA(data.analise)
      if (sono.id) await supabase.from('sono').update({ analise_ia: data.analise, score_recuperacao: score }).eq('id', sono.id)
    } catch { setAnaliseIA('Não foi possível gerar a análise. Tente novamente.') }
    setAnalisando(false)
  }

  const score = sono.score_recuperacao ?? getScoreRecuperacao(sono, bemEstar)
  const corScore = score ? getCorScore(score) : null
  const temDadosSono = sono.duracao_minutos || sono.qualidade || sono.fc_repouso

  if (carregando) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="max-w-md mx-auto px-4 py-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95">←</button>
            <div>
              <h1 className="text-xl font-black tracking-tight">Sono & Recuperação</h1>
              <p className="text-zinc-500 text-xs capitalize">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          {temDadosSono && <button onClick={() => setEditando(!editando)} className="text-[10px] text-zinc-400 border border-zinc-700 rounded-lg px-3 py-1.5 hover:border-white hover:text-white transition-all uppercase tracking-wider active:scale-95">{editando ? 'Cancelar' : 'Editar'}</button>}
        </div>

        {temDadosSono && score && !editando && (
          <div className="relative bg-gradient-to-br from-zinc-800 via-zinc-900 to-black rounded-2xl p-6 border border-zinc-700/40 mb-4 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-3">Score de recuperação</p>
            <div className="flex items-end gap-3 mb-3">
              <span className={`text-6xl font-black ${corScore?.cor}`}>{score}</span>
              <span className="text-zinc-500 text-lg mb-2">/100</span>
              <span className="mb-2 text-xl">{corScore?.emoji}</span>
            </div>
            <p className={`text-sm font-bold ${corScore?.cor} mb-3`}>{corScore?.label}</p>
            <div className="h-2 bg-zinc-800 rounded-full">
              <div className={`h-2 rounded-full transition-all duration-700 ${corScore?.bg}`} style={{ width: `${score}%` }} />
            </div>
          </div>
        )}

        {temDadosSono && !editando && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800"><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Dados da noite</p></div>
            <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800">
              <div className="p-4"><p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Duração</p><p className="text-white text-xl font-black">{formatarDuracao(sono.duracao_minutos)}</p></div>
              <div className="p-4"><p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Qualidade</p><p className="text-white text-xl font-black">{sono.qualidade ? `${sono.qualidade}/5` : '—'}</p></div>
              <div className="p-4"><p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">FC Repouso</p><p className="text-white text-xl font-black">{sono.fc_repouso ?? '—'}</p></div>
              <div className="p-4"><p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">HRV</p><p className="text-white text-xl font-black">{sono.hrv ?? '—'}</p></div>
              <div className="p-4 col-span-2"><p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">SpO2</p><p className="text-white text-xl font-black">{sono.spo2 ? `${sono.spo2}%` : '—'}</p></div>
            </div>
          </div>
        )}

        {bemEstar && !editando && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800"><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Cruzamento com bem-estar</p></div>
            <div className="grid grid-cols-3 divide-x divide-zinc-800">
              {[{ label: 'Energia', valor: bemEstar.energia }, { label: 'Humor', valor: bemEstar.humor }, { label: 'Dor musc.', valor: 6 - bemEstar.dor_muscular }].map((item) => (
                <div key={item.label} className="p-4 text-center">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">{item.label}</p>
                  <div className="flex justify-center gap-0.5 mb-1">{[1,2,3,4,5].map((i) => <div key={i} className={`w-2 h-2 rounded-full ${i <= item.valor ? 'bg-white' : 'bg-zinc-700'}`} />)}</div>
                  <p className="text-white text-sm font-bold">{item.valor}/5</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {temDadosSono && !editando && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-zinc-400 text-[10px] uppercase tracking-widest">Análise da IA</p>
              <span className="text-[10px] text-zinc-600">KORE Intelligence</span>
            </div>
            <div className="p-5">
              {analisando && <div className="flex items-center gap-3"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /><p className="text-zinc-400 text-sm">Analisando seus dados...</p></div>}
              {analiseIA && !analisando && (<><p className="text-zinc-300 text-sm leading-relaxed">{analiseIA}</p><button onClick={gerarAnaliseIA} className="mt-4 text-[10px] text-zinc-500 underline underline-offset-4 hover:text-white transition-all">Gerar nova análise</button></>)}
              {!analiseIA && !analisando && (
                <div className="flex flex-col items-center py-4 gap-3">
                  <p className="text-zinc-600 text-sm text-center">A IA vai cruzar seus dados de sono, bem-estar e perfil para gerar uma análise personalizada.</p>
                  <button onClick={gerarAnaliseIA} className="bg-white text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-zinc-100 active:scale-95 transition-all">✦ Gerar análise</button>
                </div>
              )}
            </div>
          </div>
        )}

        {historico.length > 0 && !editando && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800"><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Últimos 7 dias</p></div>
            <div className="p-5">
              <div className="flex items-end gap-2 h-16">
                {historico.slice().reverse().map((d, i) => {
                  const alt = Math.min(100, ((d.duracao_minutos ?? 0) / 10 / 60) * 100)
                  const cor = d.qualidade >= 4 ? 'bg-emerald-400' : d.qualidade >= 3 ? 'bg-yellow-400' : 'bg-red-400'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-t-sm ${d.duracao_minutos ? cor : 'bg-zinc-700'}`} style={{ height: `${Math.max(8, alt)}%` }} />
                      <p className="text-zinc-600 text-[9px]">{new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {editando && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
              <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-4">Duração do sono</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-zinc-500 text-xs mb-1 block">Horas</label><input type="number" placeholder="8" value={horasSono} onChange={(e) => setHorasSono(e.target.value)} className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700" /></div>
                <div><label className="text-zinc-500 text-xs mb-1 block">Minutos</label><input type="number" placeholder="30" value={minutosSono} onChange={(e) => setMinutosSono(e.target.value)} className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700" /></div>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
              <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-3">Qualidade do sono</p>
              <div className="flex gap-2">
                {[{v:1,emoji:'😫',label:'Péssimo'},{v:2,emoji:'😪',label:'Ruim'},{v:3,emoji:'😐',label:'Regular'},{v:4,emoji:'😴',label:'Bom'},{v:5,emoji:'🌙',label:'Ótimo'}].map((q) => (
                  <button key={q.v} onClick={() => setQualidade(q.v)} className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${qualidade === q.v ? 'bg-white border-white' : 'bg-zinc-800 border-zinc-700'}`}>
                    <span className="text-xl">{q.emoji}</span>
                    <span className={`text-[9px] mt-1 font-semibold ${qualidade === q.v ? 'text-black' : 'text-zinc-500'}`}>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
              <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Dados do wearable</p>
              <p className="text-zinc-600 text-xs mb-4">Opcional</p>
              <div className="space-y-3">
                <div><label className="text-zinc-500 text-xs mb-1 block">FC em repouso (bpm)</label><input type="number" placeholder="Ex: 55" value={fcRepouso} onChange={(e) => setFcRepouso(e.target.value)} className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700" /></div>
                <div><label className="text-zinc-500 text-xs mb-1 block">HRV (ms)</label><input type="number" placeholder="Ex: 65" value={hrv} onChange={(e) => setHrv(e.target.value)} className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700" /></div>
                <div><label className="text-zinc-500 text-xs mb-1 block">SpO2 (%)</label><input type="number" placeholder="Ex: 97" value={spo2} onChange={(e) => setSpo2(e.target.value)} className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white border border-zinc-700" /></div>
              </div>
            </div>
            <button onClick={handleSalvar} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-widest uppercase">Salvar dados</button>
          </div>
        )}

        {!editando && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
            <div className="flex items-center gap-3 mb-3"><span className="text-2xl">⌚</span><div><p className="text-white text-sm font-bold">Conectar wearable</p><p className="text-zinc-500 text-xs">Apple Watch, Garmin, Whoop, Polar e mais</p></div></div>
            <button className="w-full border border-zinc-700 text-zinc-400 font-semibold py-3 rounded-xl text-sm hover:border-white hover:text-white active:scale-95 transition-all uppercase tracking-wider">Em breve</button>
          </div>
        )}
      </div>
    </main>
  )
}