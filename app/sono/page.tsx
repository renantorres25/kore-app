'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { atualizarDecisaoDia } from '../lib/atualizarDecisaoDia'

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
  sono_leve: number | null
  sono_profundo: number | null
  sono_rem: number | null
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
  if (sono.qualidade) { score += (sono.qualidade / 5) * 20; total += 20 }
  if (sono.duracao_minutos) {
    const ideal = 480
    const diff = Math.abs(sono.duracao_minutos - ideal)
    const pontos = Math.max(0, 20 - (diff / ideal) * 20)
    score += pontos; total += 20
  }
  if (sono.hrv) { score += Math.min(20, (sono.hrv / 100) * 20); total += 20 }
  if (sono.sono_profundo && sono.duracao_minutos) {
    const pct = (sono.sono_profundo / sono.duracao_minutos) * 100
    score += Math.max(0, 20 - Math.abs(pct - 20)); total += 20
  }
  if (sono.sono_rem && sono.duracao_minutos) {
    const pct = (sono.sono_rem / sono.duracao_minutos) * 100
    score += Math.max(0, 20 - Math.abs(pct - 22)); total += 20
  }
  if (bemEstar) {
    const media = (bemEstar.energia + bemEstar.humor + (6 - bemEstar.dor_muscular)) / 3
    score += (media / 5) * 20; total += 20
  }
  if (total === 0) return null
  return Math.round((score / total) * 100)
}

function getCorScore(score: number) {
  if (score >= 80) return { cor: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400/20', label: 'Excelente recuperação' }
  if (score >= 60) return { cor: 'text-yellow-400',  bg: 'bg-yellow-400',  border: 'border-yellow-400/20',  label: 'Boa recuperação' }
  if (score >= 40) return { cor: 'text-orange-400',  bg: 'bg-orange-400',  border: 'border-orange-400/20',  label: 'Recuperação regular' }
  return              { cor: 'text-red-400',     bg: 'bg-red-400',     border: 'border-red-400/20',     label: 'Recuperação baixa' }
}

export default function Sono() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [analisando, setAnalisando] = useState(false)
  const [userId, setUserId] = useState('')
  const [nomePerfil, setNomePerfil] = useState('')
  const [peso, setPeso] = useState<number | null>(null)
  const [objetivo, setObjetivo] = useState<string | null>(null)
  const [sono, setSono] = useState<DadosSono>({ duracao_minutos: null, qualidade: null, fc_repouso: null, hrv: null, spo2: null, sono_leve: null, sono_profundo: null, sono_rem: null, fonte: 'manual', analise_ia: null, score_recuperacao: null })
  const [bemEstar, setBemEstar] = useState<DadosBemEstar | null>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [analiseIA, setAnaliseIA] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [horasSono, setHorasSono] = useState('')
  const [minutosSono, setMinutosSono] = useState('')
  const [qualidade, setQualidade] = useState(0)
  const [fcRepouso, setFcRepouso] = useState('')
  const [hrv, setHrv] = useState('')
  const [spo2, setSpo2] = useState('')
  const [sonoLeve, setSonoLeve] = useState('')
  const [sonoProfundo, setSonoProfundo] = useState('')
  const [sonoRem, setSonoRem] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)
      const hoje = getTodayBR()
      const { data: perfil } = await supabase.from('perfis').select('nome, peso, altura, objetivo').eq('id', session.user.id).single()
      if (perfil) { setNomePerfil(perfil.nome ?? ''); setPeso(perfil.peso); setObjetivo(perfil.objetivo) }
      const { data: sonoHoje } = await supabase.from('sono').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single()
      if (sonoHoje) {
        setSono(sonoHoje)
        if (sonoHoje.analise_ia) setAnaliseIA(sonoHoje.analise_ia)
        if (sonoHoje.duracao_minutos) { setHorasSono(String(Math.floor(sonoHoje.duracao_minutos / 60))); setMinutosSono(String(sonoHoje.duracao_minutos % 60)) }
        if (sonoHoje.fc_repouso) setFcRepouso(String(sonoHoje.fc_repouso))
        if (sonoHoje.hrv) setHrv(String(sonoHoje.hrv))
        if (sonoHoje.spo2) setSpo2(String(sonoHoje.spo2))
        if (sonoHoje.qualidade) setQualidade(sonoHoje.qualidade)
        if (sonoHoje.sono_leve) setSonoLeve(String(sonoHoje.sono_leve))
        if (sonoHoje.sono_profundo) setSonoProfundo(String(sonoHoje.sono_profundo))
        if (sonoHoje.sono_rem) setSonoRem(String(sonoHoje.sono_rem))
      } else { setEditando(true) }
      const { data: be } = await supabase.from('bem_estar').select('energia, humor, dor_muscular, qualidade_sono, notas').eq('usuario_id', session.user.id).eq('data', hoje).single()
      if (be) setBemEstar(be)
      const { data: hist } = await supabase.from('sono').select('data, duracao_minutos, qualidade, hrv, score_recuperacao, sono_profundo, sono_rem').eq('usuario_id', session.user.id).order('data', { ascending: false }).limit(7)
      if (hist) setHistorico(hist)
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function handleSalvar() {
    const duracao = (parseInt(horasSono || '0') * 60) + parseInt(minutosSono || '0')
    const payload: any = {
      usuario_id: userId,
      data: getTodayBR(),
      duracao_minutos: duracao || null,
      qualidade: qualidade || null,
      fc_repouso: fcRepouso ? parseInt(fcRepouso) : null,
      hrv: hrv ? parseInt(hrv) : null,
      spo2: spo2 ? parseFloat(spo2) : null,
      sono_leve: sonoLeve ? parseInt(sonoLeve) : null,
      sono_profundo: sonoProfundo ? parseInt(sonoProfundo) : null,
      sono_rem: sonoRem ? parseInt(sonoRem) : null,
      fonte: 'manual',
    }
    payload.score_recuperacao = getScoreRecuperacao({ ...payload }, bemEstar)
    if (sono.id) { await supabase.from('sono').update(payload).eq('id', sono.id) }
    else { await supabase.from('sono').insert(payload) }
    setAnaliseIA(null)
    setEditando(false)
    const { data: sonoAtualizado } = await supabase.from('sono').select('*').eq('usuario_id', userId).eq('data', getTodayBR()).single()
    if (sonoAtualizado) setSono(sonoAtualizado)
    atualizarDecisaoDia(userId) // ← atualiza decisão do dia em background
  }

  async function gerarAnaliseIA() {
    setAnalisando(true)
    const score = getScoreRecuperacao(sono, bemEstar)
    const totalEstagio = (sono.sono_leve ?? 0) + (sono.sono_profundo ?? 0) + (sono.sono_rem ?? 0)
    const estagiosInfo = totalEstagio > 0
      ? `Leve: ${formatarDuracao(sono.sono_leve)} (${Math.round(((sono.sono_leve ?? 0) / (sono.duracao_minutos ?? 1)) * 100)}%) | Profundo: ${formatarDuracao(sono.sono_profundo)} (${Math.round(((sono.sono_profundo ?? 0) / (sono.duracao_minutos ?? 1)) * 100)}%) | REM: ${formatarDuracao(sono.sono_rem)} (${Math.round(((sono.sono_rem ?? 0) / (sono.duracao_minutos ?? 1)) * 100)}%)`
      : 'não informado'
    const prompt = `Você é um especialista em medicina do sono e performance humana. Analise os dados abaixo e gere uma análise personalizada, direta e útil. Seja específico com os números. Termine com 1-2 recomendações práticas para hoje.

ATLETA: ${nomePerfil} | ${peso ? `${peso}kg` : '?'} | ${objetivo ?? '?'}

SONO DE HOJE:
- Duração total: ${formatarDuracao(sono.duracao_minutos)}
- Qualidade subjetiva: ${sono.qualidade ? `${sono.qualidade}/5` : 'não informado'}
- Estágios: ${estagiosInfo}
- FC em repouso: ${sono.fc_repouso ? `${sono.fc_repouso} bpm` : 'não informado'}
- HRV: ${sono.hrv ? `${sono.hrv} ms` : 'não informado'}
- SpO2: ${sono.spo2 ? `${sono.spo2}%` : 'não informado'}

BEM-ESTAR:
- Energia: ${bemEstar ? `${bemEstar.energia}/5` : '?'} | Humor: ${bemEstar ? `${bemEstar.humor}/5` : '?'} | Dor muscular: ${bemEstar ? `${bemEstar.dor_muscular}/5` : '?'}

SCORE DE RECUPERAÇÃO: ${score ? `${score}/100` : 'insuficiente'}

Responda em português. Máximo 4 parágrafos curtos. Sem markdown, sem bullets, sem títulos.`
    try {
      const response = await fetch('/api/analise-sono', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await response.json()
      setAnaliseIA(data.analise)
      if (sono.id) await supabase.from('sono').update({ analise_ia: data.analise, score_recuperacao: score }).eq('id', sono.id)
    } catch { setAnaliseIA('Não foi possível gerar a análise. Tente novamente.') }
    setAnalisando(false)
  }

  const score = sono.score_recuperacao ?? getScoreRecuperacao(sono, bemEstar)
  const corScore = score ? getCorScore(score) : null
  const temDadosSono = sono.duracao_minutos || sono.qualidade || sono.fc_repouso
  const totalEstagio = (sono.sono_leve ?? 0) + (sono.sono_profundo ?? 0) + (sono.sono_rem ?? 0)
  const duracaoRef = sono.duracao_minutos ?? totalEstagio

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-12" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95">←</button>
            <div>
              <h1 className="text-xl font-black tracking-tight">Sono & Recuperação</h1>
              <p className="text-zinc-500 text-xs capitalize">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          {temDadosSono && (
            <button onClick={() => setEditando(!editando)} className="text-[10px] text-zinc-400 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white transition-all uppercase tracking-wider active:scale-95">
              {editando ? 'Cancelar' : 'Editar'}
            </button>
          )}
        </div>

        {temDadosSono && score && !editando && (
          <div className={`rounded-3xl p-6 mb-4 border ${corScore?.border} relative overflow-hidden`} style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}>
            <div className={`absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-10 ${corScore?.bg}`} />
            <div className="relative">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.22em] mb-3">Score de recuperação</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-[5rem] font-black leading-none ${corScore?.cor}`} style={{ letterSpacing: '-0.04em' }}>{score}</span>
                <span className="text-zinc-600 text-xl font-light">/100</span>
              </div>
              <p className={`text-sm font-bold mb-4 ${corScore?.cor}`}>{corScore?.label}</p>
              <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${corScore?.bg} transition-all duration-700`} style={{ width: `${score}%` }} />
              </div>
            </div>
          </div>
        )}

        {temDadosSono && !editando && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Dados da noite</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.05]">
              <div className="p-4"><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">Duração</p><p className="text-white text-xl font-black">{formatarDuracao(sono.duracao_minutos)}</p></div>
              <div className="p-4"><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">Qualidade</p><p className="text-white text-xl font-black">{sono.qualidade ? `${sono.qualidade}/5` : '—'}</p></div>
              <div className="p-4"><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">FC Repouso</p><p className="text-white text-xl font-black">{sono.fc_repouso ? `${sono.fc_repouso} bpm` : '—'}</p></div>
              <div className="p-4"><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">HRV</p><p className="text-white text-xl font-black">{sono.hrv ? `${sono.hrv} ms` : '—'}</p></div>
              {sono.spo2 && <div className="p-4 col-span-2"><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">SpO2</p><p className="text-white text-xl font-black">{sono.spo2}%</p></div>}
            </div>
          </div>
        )}

        {temDadosSono && !editando && (sono.sono_leve || sono.sono_profundo || sono.sono_rem) && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Estágios do sono</p>
            </div>
            <div className="p-5 space-y-3">
              {duracaoRef > 0 && (
                <div className="h-6 rounded-xl overflow-hidden flex gap-0.5 mb-4">
                  {sono.sono_leve && <div className="rounded-l-xl" style={{ width: `${(sono.sono_leve / duracaoRef) * 100}%`, background: '#6366f1', opacity: 0.7 }} />}
                  {sono.sono_profundo && <div style={{ width: `${(sono.sono_profundo / duracaoRef) * 100}%`, background: '#1d4ed8', opacity: 0.9 }} />}
                  {sono.sono_rem && <div className="rounded-r-xl" style={{ width: `${(sono.sono_rem / duracaoRef) * 100}%`, background: '#7c3aed', opacity: 0.8 }} />}
                </div>
              )}
              {[
                { label: 'Sono leve', val: sono.sono_leve, cor: '#6366f1', ideal: '50–60%', desc: 'Transição e processamento' },
                { label: 'Sono profundo', val: sono.sono_profundo, cor: '#1d4ed8', ideal: '15–25%', desc: 'Recuperação muscular e imunidade' },
                { label: 'REM', val: sono.sono_rem, cor: '#7c3aed', ideal: '20–25%', desc: 'Memória, aprendizado e emoções' },
              ].map((estagio, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: estagio.cor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{estagio.label}</p>
                    <p className="text-zinc-600 text-[10px]">{estagio.desc} · ideal {estagio.ideal}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white text-sm font-bold">{formatarDuracao(estagio.val)}</p>
                    {estagio.val && duracaoRef > 0 && <p className="text-zinc-600 text-[10px]">{Math.round((estagio.val / duracaoRef) * 100)}%</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bemEstar && !editando && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Cruzamento com bem-estar</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
              {[
                { label: 'Energia', valor: bemEstar.energia },
                { label: 'Humor', valor: bemEstar.humor },
                { label: 'Dor musc.', valor: 6 - bemEstar.dor_muscular },
              ].map((item) => (
                <div key={item.label} className="p-4 text-center">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">{item.label}</p>
                  <div className="flex justify-center gap-0.5 mb-1">
                    {[1,2,3,4,5].map((i) => <div key={i} className={`w-2 h-2 rounded-full ${i <= item.valor ? 'bg-emerald-400' : 'bg-white/[0.08]'}`} />)}
                  </div>
                  <p className="text-white text-sm font-bold">{item.valor}/5</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {temDadosSono && !editando && (
          <div className="rounded-2xl border border-emerald-500/20 mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-emerald-400">✦</span>
              </div>
              <div className="flex-1">
                <p className="text-emerald-400 text-[10px] uppercase tracking-[0.2em]">Análise da IA</p>
                <p className="text-zinc-600 text-[10px]">Sono, bem-estar e perfil · Powered by Claude</p>
              </div>
              {analisando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
            <div className="px-5 py-4">
              {analisando && <div className="space-y-2">{[1, 0.8, 0.6].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}</div>}
              {analiseIA && !analisando && (
                <>
                  <p className="text-zinc-300 text-sm leading-relaxed">{analiseIA}</p>
                  <button onClick={gerarAnaliseIA} className="mt-4 text-[10px] text-zinc-600 underline underline-offset-4 hover:text-zinc-400 transition-all">Gerar nova análise</button>
                </>
              )}
              {!analiseIA && !analisando && (
                <div className="flex flex-col items-center py-4 gap-3">
                  <p className="text-zinc-600 text-sm text-center">A IA vai cruzar seus dados de sono, estágios, bem-estar e perfil para uma análise personalizada.</p>
                  <button onClick={gerarAnaliseIA} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-emerald-500/20 transition-all">✦ Gerar análise</button>
                </div>
              )}
            </div>
          </div>
        )}

        {historico.length > 0 && !editando && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Últimos 7 dias</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-end gap-2 h-16">
                {historico.slice().reverse().map((d, i) => {
                  const alt = Math.min(100, ((d.duracao_minutos ?? 0) / 60) / 10 * 100)
                  const cor = d.qualidade >= 4 ? 'bg-emerald-400' : d.qualidade >= 3 ? 'bg-yellow-400' : d.qualidade >= 1 ? 'bg-red-400' : 'bg-zinc-700'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-t-lg ${d.duracao_minutos ? cor : 'bg-white/[0.05]'} transition-all`} style={{ height: `${Math.max(8, alt)}%` }} />
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
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Duração do sono</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-600 text-xs mb-1.5 block">Horas</label>
                  <input type="number" placeholder="8" value={horasSono} onChange={e => setHorasSono(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-600 text-xs mb-1.5 block">Minutos</label>
                  <input type="number" placeholder="30" value={minutosSono} onChange={e => setMinutosSono(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-colors" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Qualidade do sono</p>
              <div className="flex gap-2">
                {[{v:1,emoji:'😫',label:'Péssimo'},{v:2,emoji:'😪',label:'Ruim'},{v:3,emoji:'😐',label:'Regular'},{v:4,emoji:'😴',label:'Bom'},{v:5,emoji:'🌙',label:'Ótimo'}].map((q) => (
                  <button key={q.v} onClick={() => setQualidade(q.v)}
                    className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${qualidade === q.v ? 'bg-white border-white' : 'bg-white/[0.03] border-white/[0.08]'}`}>
                    <span className="text-xl">{q.emoji}</span>
                    <span className={`text-[9px] mt-1 font-semibold ${qualidade === q.v ? 'text-black' : 'text-zinc-600'}`}>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 p-5" style={{ background: '#0f0f0f' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-indigo-400 text-[10px] uppercase tracking-[0.15em]">🌙 Estágios do sono</p>
                <span className="text-[9px] text-indigo-400/60 border border-indigo-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider">Opcional</span>
              </div>
              <p className="text-zinc-600 text-xs mb-4 leading-relaxed">Dados do seu wearable (Garmin, Apple Watch, Whoop...). Quanto mais info, mais precisa a análise da IA.</p>
              <div className="space-y-3">
                {[
                  { label: 'Sono leve', placeholder: 'Ex: 240', val: sonoLeve, set: setSonoLeve, cor: '#6366f1', desc: 'Fase 1 e 2 — transição e processamento leve' },
                  { label: 'Sono profundo', placeholder: 'Ex: 90', val: sonoProfundo, set: setSonoProfundo, cor: '#1d4ed8', desc: 'Fase 3 — recuperação muscular e imunidade' },
                  { label: 'REM', placeholder: 'Ex: 100', val: sonoRem, set: setSonoRem, cor: '#7c3aed', desc: 'Sonhos, memória e processamento emocional' },
                ].map((estagio, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: estagio.cor }} />
                      <label className="text-zinc-400 text-xs font-semibold">{estagio.label}</label>
                      {estagio.val && <span className="text-zinc-600 text-[10px] ml-auto">{formatarDuracao(parseInt(estagio.val))}</span>}
                    </div>
                    <p className="text-zinc-700 text-[10px] mb-1.5">{estagio.desc}</p>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder={estagio.placeholder} value={estagio.val}
                        onChange={e => estagio.set(e.target.value)}
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/30 transition-colors" />
                      <span className="text-zinc-600 text-xs shrink-0">min</span>
                    </div>
                  </div>
                ))}
                {(sonoLeve || sonoProfundo || sonoRem) && (() => {
                  const l = parseInt(sonoLeve || '0')
                  const p = parseInt(sonoProfundo || '0')
                  const r = parseInt(sonoRem || '0')
                  const total = l + p + r
                  if (total === 0) return null
                  return (
                    <div className="mt-3">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Distribuição</p>
                      <div className="h-4 rounded-lg overflow-hidden flex gap-0.5">
                        {l > 0 && <div className="rounded-l-lg" style={{ width: `${(l/total)*100}%`, background: '#6366f1', opacity: 0.7 }} />}
                        {p > 0 && <div style={{ width: `${(p/total)*100}%`, background: '#1d4ed8' }} />}
                        {r > 0 && <div className="rounded-r-lg" style={{ width: `${(r/total)*100}%`, background: '#7c3aed', opacity: 0.85 }} />}
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        {l > 0 && <span className="text-[9px]" style={{ color: '#6366f1' }}>Leve {Math.round((l/total)*100)}%</span>}
                        {p > 0 && <span className="text-[9px]" style={{ color: '#1d4ed8' }}>Profundo {Math.round((p/total)*100)}%</span>}
                        {r > 0 && <span className="text-[9px]" style={{ color: '#7c3aed' }}>REM {Math.round((r/total)*100)}%</span>}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">⌚ Dados do wearable</p>
                <span className="text-[9px] text-zinc-600 border border-white/[0.08] rounded-full px-2 py-0.5 uppercase tracking-wider">Opcional</span>
              </div>
              <p className="text-zinc-600 text-xs mb-4">FC, HRV e SpO2 melhoram muito a precisão do score.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-zinc-600 text-xs mb-1.5 block">FC em repouso (bpm)</label>
                  <input type="number" placeholder="Ex: 55" value={fcRepouso} onChange={e => setFcRepouso(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-600 text-xs mb-1.5 block">HRV (ms) — variabilidade cardíaca</label>
                  <input type="number" placeholder="Ex: 65" value={hrv} onChange={e => setHrv(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-600 text-xs mb-1.5 block">SpO2 (%) — saturação de oxigênio</label>
                  <input type="number" placeholder="Ex: 97" value={spo2} onChange={e => setSpo2(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-colors" />
                </div>
              </div>
            </div>

            <button onClick={handleSalvar} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-widest uppercase">
              Salvar dados de sono
            </button>
          </div>
        )}

        {!editando && (
          <div className="rounded-2xl border border-white/[0.06] p-5 mt-4" style={{ background: '#0f0f0f' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⌚</span>
              <div>
                <p className="text-white text-sm font-bold">Conectar wearable</p>
                <p className="text-zinc-600 text-xs">Apple Watch, Garmin, Whoop, Polar e mais</p>
              </div>
            </div>
            <button className="w-full border border-white/[0.08] text-zinc-500 font-semibold py-3 rounded-xl text-sm hover:border-white/20 hover:text-zinc-300 active:scale-95 transition-all uppercase tracking-wider">Em breve</button>
          </div>
        )}
      </div>
    </main>
  )
}