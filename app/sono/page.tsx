'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { atualizarDecisaoDia } from '../lib/atualizarDecisaoDia'
import SidebarProfissional from '../components/SidebarProfissional'

/* ── Design System: Energetic Precision ──────────────────────── */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO = "ui-monospace, 'SF Mono', Menlo, monospace"

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c()
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

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

function HrvAjuda() {
  const [aberto, setAberto] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto(!aberto)}
        style={{
          fontFamily: FONT_BODY, fontSize: 10, color: C.t3, background: 'none',
          border: 'none', cursor: 'pointer', textDecoration: 'underline',
          textUnderlineOffset: 2, padding: 0,
        }}>
        Onde encontro?
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', right: 0, bottom: 26, zIndex: 10, width: 256,
          ...glassCard, borderRadius: 16, padding: 16,
        }}>
          <p style={{ fontFamily: FONT_BODY, color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Como encontrar o HRV</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { device: 'Apple Watch', path: 'Saúde → Frequência Cardíaca → Variabilidade da FC' },
              { device: 'Garmin',      path: 'Garmin Connect → Saúde → HRV' },
              { device: 'Whoop',       path: 'Recovery → HRV' },
              { device: 'Polar',       path: 'Polar Flow → Diário → HRV' },
              { device: 'Fitbit',      path: 'App Fitbit → Hoje → Frequência Cardíaca' },
            ].map((d, i) => (
              <div key={i}>
                <p style={{ fontFamily: FONT_BODY, color: C.t1, fontSize: 11, fontWeight: 600 }}>{d.device}</p>
                <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 10, lineHeight: 1.5 }}>{d.path}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAberto(false)}
            style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 10, color: C.t3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}

function getCorScore(score: number) {
  if (score >= 80) return { cor: C.good, label: 'Excelente recuperação' }
  if (score >= 60) return { cor: C.warn, label: 'Boa recuperação' }
  if (score >= 40) return { cor: C.energy2, label: 'Recuperação regular' }
  return { cor: C.danger, label: 'Recuperação baixa' }
}

/* ── Anel SVG animado (azul) ─────────────────────────────────── */
function ScoreRing({ score, cor, size = 168 }: { score: number; cor: string; size?: number }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [offset, setOffset] = useState(c)
  useEffect(() => {
    const t = setTimeout(() => setOffset(c - (score / 100) * c), 120)
    return () => clearTimeout(t)
  }, [score, c])
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.sleep} />
          <stop offset="100%" stopColor={C.recovery} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  )
}

/* ── Reusable bits ───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: FONT_BODY, color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em' }}>{children}</p>
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${focused ? C.sleep : 'rgba(255,255,255,0.12)'}`,
    color: C.t1, borderRadius: 12, padding: '12px 16px',
    fontFamily: FONT_MONO, fontSize: 14, outline: 'none',
    transition: 'border-color 150ms ease',
    boxShadow: focused ? `0 0 0 3px rgba(96,165,250,0.15)` : 'none',
  }
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input {...props} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...inputStyle(focused), ...(props.style || {}) }} />
  )
}

export default function Sono() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
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
      if (!session) { router.push('/login'); return }
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
    if (!duracao && !qualidade) return
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid rgba(96,165,250,0.2)`, borderTopColor: C.sleep,
        animation: 'koreSpin 0.8s linear infinite',
      }} />
      <style>{`@keyframes koreSpin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )

  /* ── Sub-blocos reutilizáveis ─────────────────────────────── */

  const scoreCard = temDadosSono && score && !editando ? (
    <div style={{
      ...glassCard, padding: 28, position: 'relative', overflow: 'hidden',
      border: `1px solid rgba(96,165,250,0.28)`,
      boxShadow: `${glassCard.boxShadow}, 0 0 50px rgba(96,165,250,0.18)`,
    }}>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: C.sleep, filter: 'blur(80px)', opacity: 0.18 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ fontFamily: FONT_BODY, color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 20 }}>Score de recuperação</p>
        <div style={{ position: 'relative', width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreRing score={score} cor={C.sleep} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 800, lineHeight: 1, color: C.t1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
            <span style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 13 }}>/ 100</span>
          </div>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, marginTop: 18, color: C.sleep }}>{corScore?.label}</p>
      </div>
    </div>
  ) : null

  const dadosNoiteCard = temDadosSono && !editando ? (
    <div style={{ ...glassCard, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <SectionLabel>Dados da noite</SectionLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'Duração', val: formatarDuracao(sono.duracao_minutos) },
          { label: 'Qualidade', val: sono.qualidade ? `${sono.qualidade}/5` : '—' },
          { label: 'FC Repouso', val: sono.fc_repouso ? `${sono.fc_repouso} bpm` : '—' },
          { label: 'HRV', val: sono.hrv ? `${sono.hrv} ms` : '—' },
        ].map((d, i) => (
          <div key={i} style={{
            padding: 16,
            borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            borderTop: i >= 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>{d.label}</p>
            <p style={{ fontFamily: FONT_DISPLAY, color: C.t1, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.val}</p>
          </div>
        ))}
        {sono.spo2 && (
          <div style={{ padding: 16, gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>SpO2</p>
            <p style={{ fontFamily: FONT_DISPLAY, color: C.t1, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{sono.spo2}%</p>
          </div>
        )}
      </div>
    </div>
  ) : null

  const estagiosCard = temDadosSono && !editando && (sono.sono_leve || sono.sono_profundo || sono.sono_rem) ? (
    <div style={{ ...glassCard, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <SectionLabel>Estágios do sono</SectionLabel>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {duracaoRef > 0 && (
          <div style={{ height: 24, borderRadius: 12, overflow: 'hidden', display: 'flex', gap: 2, marginBottom: 8 }}>
            {sono.sono_leve && <div style={{ width: `${(sono.sono_leve / duracaoRef) * 100}%`, background: C.sleep, opacity: 0.55, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }} />}
            {sono.sono_profundo && <div style={{ width: `${(sono.sono_profundo / duracaoRef) * 100}%`, background: C.sleep }} />}
            {sono.sono_rem && <div style={{ width: `${(sono.sono_rem / duracaoRef) * 100}%`, background: C.recovery, opacity: 0.85, borderTopRightRadius: 12, borderBottomRightRadius: 12 }} />}
          </div>
        )}
        {[
          { label: 'Sono leve', val: sono.sono_leve, cor: C.sleep, op: 0.55, ideal: '50–60%', desc: 'Transição e processamento' },
          { label: 'Sono profundo', val: sono.sono_profundo, cor: C.sleep, op: 1, ideal: '15–25%', desc: 'Recuperação muscular e imunidade' },
          { label: 'REM', val: sono.sono_rem, cor: C.recovery, op: 0.85, ideal: '20–25%', desc: 'Memória, aprendizado e emoções' },
        ].map((estagio, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: estagio.cor, opacity: estagio.op }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: FONT_BODY, color: C.t1, fontSize: 14, fontWeight: 600 }}>{estagio.label}</p>
              <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 10 }}>{estagio.desc} · ideal {estagio.ideal}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: FONT_MONO, color: C.t1, fontSize: 14, fontWeight: 700 }}>{formatarDuracao(estagio.val)}</p>
              {estagio.val && duracaoRef > 0 && <p style={{ fontFamily: FONT_MONO, color: C.t3, fontSize: 10 }}>{Math.round((estagio.val / duracaoRef) * 100)}%</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null

  const bemEstarCard = bemEstar && !editando ? (
    <div style={{ ...glassCard, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <SectionLabel>Cruzamento com bem-estar</SectionLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          { label: 'Energia', valor: bemEstar.energia },
          { label: 'Humor', valor: bemEstar.humor },
          { label: 'Dor musc.', valor: 6 - bemEstar.dor_muscular },
        ].map((item, i) => (
          <div key={item.label} style={{ padding: 16, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>{item.label}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => <div key={n} style={{ width: 8, height: 8, borderRadius: '50%', background: n <= item.valor ? C.recovery : 'rgba(255,255,255,0.10)' }} />)}
            </div>
            <p style={{ fontFamily: FONT_MONO, color: C.t1, fontSize: 14, fontWeight: 700 }}>{item.valor}/5</p>
          </div>
        ))}
      </div>
    </div>
  ) : null

  const iaCard = temDadosSono && !editando ? (
    <div style={{ ...glassCard, overflow: 'hidden', border: `1px solid rgba(167,139,250,0.25)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 10, background: 'rgba(167,139,250,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.recovery }}>✦</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: FONT_BODY, color: C.recovery, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Análise da IA</p>
          <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 10 }}>Sono, bem-estar e perfil · Powered by Claude</p>
        </div>
        {analisando && <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid rgba(167,139,250,0.25)`, borderTopColor: C.recovery, animation: 'koreSpin 0.8s linear infinite', flexShrink: 0 }} />}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {analisando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 0.8, 0.6].map((w, i) => <div key={i} style={{ height: 12, background: 'rgba(255,255,255,0.09)', borderRadius: 999, width: `${w * 100}%`, animation: 'korePulse 1.4s ease-in-out infinite' }} />)}
          </div>
        )}
        {analiseIA && !analisando && (
          <>
            <p style={{ fontFamily: FONT_BODY, color: '#D6DAE2', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{analiseIA}</p>
            <button onClick={gerarAnaliseIA} style={{ marginTop: 16, fontFamily: FONT_BODY, fontSize: 10, color: C.t3, textDecoration: 'underline', textUnderlineOffset: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Gerar nova análise</button>
          </>
        )}
        {!analiseIA && !analisando && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 12 }}>
            <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>A IA vai cruzar seus dados de sono, estágios, bem-estar e perfil para uma análise personalizada.</p>
            <button onClick={gerarAnaliseIA} style={{
              width: '100%', background: 'rgba(167,139,250,0.12)', border: `1px solid rgba(167,139,250,0.32)`,
              color: C.recovery, fontFamily: FONT_BODY, fontWeight: 700, padding: '12px', borderRadius: 12, fontSize: 14, cursor: 'pointer',
            }}>✦ Gerar análise</button>
          </div>
        )}
      </div>
    </div>
  ) : null

  const historicoCard = historico.length > 0 && !editando ? (
    <div style={{ ...glassCard, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <SectionLabel>Últimos 7 dias</SectionLabel>
        <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 10 }}>score de recuperação</p>
      </div>
      <div style={{ padding: '16px 20px 12px' }}>
        {(() => {
          const sorted = historico.slice().reverse()
          const W = 300, H = 80, padX = 10, padY = 10
          const items = sorted.map((d, i) => {
            const sc = d.score_recuperacao ?? (d.qualidade ? Math.round((d.qualidade / 5) * 100) : null)
            const max = sorted.length > 1 ? (i / (sorted.length - 1)) : 0.5
            const barW = (W - 2 * padX) / sorted.length - 6
            const x = padX + max * (W - 2 * padX - barW)
            const h = sc != null ? (sc / 100) * (H - 2 * padY) : 0
            return { d, sc, x, barW, h }
          })
          const hasData = items.some(it => it.sc != null)
          if (!hasData) return null
          const barColor = (s: number | null) => {
            if (s == null) return 'rgba(255,255,255,0.06)'
            return s >= 60 ? C.sleep : s >= 40 ? C.recovery : C.danger
          }
          return (
            <div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.sleep} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={C.sleep} stopOpacity="0.45" />
                  </linearGradient>
                </defs>
                {items.map((it, i) => {
                  const fill = it.sc != null && it.sc >= 60 ? 'url(#barGrad)' : barColor(it.sc)
                  return (
                    <g key={i}>
                      <rect x={it.x} y={H - padY - (H - 2 * padY)} width={it.barW} height={H - 2 * padY} rx={5} fill="rgba(255,255,255,0.04)" />
                      {it.sc != null && (
                        <rect x={it.x} y={H - padY - it.h} width={it.barW} height={it.h} rx={5} fill={fill} />
                      )}
                    </g>
                  )
                })}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {sorted.map((d, i) => (
                  <span key={i} style={{ fontFamily: FONT_BODY, fontSize: 8, color: C.t3, textTransform: 'uppercase', flex: 1, textAlign: 'center' }}>
                    {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  ) : null

  const wearableCta = !editando ? (
    <div style={{ ...glassCard, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(96,165,250,0.12)', border: `1px solid rgba(96,165,250,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sleep} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6V3h6v3M9 18v3h6v-3" /></svg>
        </div>
        <div>
          <p style={{ fontFamily: FONT_BODY, color: C.t1, fontSize: 14, fontWeight: 700 }}>Conectar wearable</p>
          <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12 }}>Apple Watch, Garmin, Whoop, Polar e mais</p>
        </div>
      </div>
      <button style={{
        width: '100%', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent',
        color: C.t2, fontFamily: FONT_BODY, fontWeight: 600, padding: '12px', borderRadius: 12, fontSize: 13,
        textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
      }}>Em breve</button>
    </div>
  ) : null

  /* ── Formulário de registro ───────────────────────────────── */
  const qualOpts = [
    { v: 1, label: 'Péssimo' }, { v: 2, label: 'Ruim' }, { v: 3, label: 'Regular' },
    { v: 4, label: 'Bom' }, { v: 5, label: 'Ótimo' },
  ]

  const formulario = editando ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Duração */}
      <div style={{ ...glassCard, padding: 20 }}>
        <p style={{ ...{ fontFamily: FONT_BODY, color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }, marginBottom: 16 }}>Duração do sono</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, marginBottom: 6, display: 'block' }}>Horas</label>
            <GlassInput type="number" placeholder="8" value={horasSono} onChange={e => setHorasSono(e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, marginBottom: 6, display: 'block' }}>Minutos</label>
            <GlassInput type="number" placeholder="30" value={minutosSono} onChange={e => setMinutosSono(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Qualidade — slider estilizado */}
      <div style={{ ...glassCard, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontFamily: FONT_BODY, color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Qualidade do sono</p>
          <span style={{ fontFamily: FONT_MONO, color: qualidade ? C.sleep : C.t3, fontSize: 14, fontWeight: 700 }}>{qualidade ? `${qualidade}/5` : '—'}</span>
        </div>
        {/* trilha do slider */}
        <div style={{ position: 'relative', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${(qualidade / 5) * 100}%`, background: `linear-gradient(90deg, ${C.sleep}, ${C.recovery})`, transition: 'width 200ms ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {qualOpts.map((q) => {
            const sel = qualidade === q.v
            return (
              <button key={q.v} onClick={() => setQualidade(q.v)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: 12,
                  background: sel ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${sel ? C.sleep : 'rgba(255,255,255,0.12)'}`,
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: sel ? C.sleep : C.t2 }}>{q.v}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 9, marginTop: 4, fontWeight: 600, color: sel ? C.t1 : C.t3 }}>{q.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Estágios do sono */}
      <div style={{ ...glassCard, padding: 20, border: `1px solid rgba(167,139,250,0.22)` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontFamily: FONT_BODY, color: C.recovery, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Estágios do sono</p>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: C.recovery, border: `1px solid rgba(167,139,250,0.25)`, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Opcional</span>
        </div>
        <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>Dados do seu wearable (Garmin, Apple Watch, Whoop...). Quanto mais info, mais precisa a análise da IA.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Sono leve', placeholder: 'Ex: 240', val: sonoLeve, set: setSonoLeve, cor: C.sleep, op: 0.55, desc: 'Fase 1 e 2 — transição e processamento leve' },
            { label: 'Sono profundo', placeholder: 'Ex: 90', val: sonoProfundo, set: setSonoProfundo, cor: C.sleep, op: 1, desc: 'Fase 3 — recuperação muscular e imunidade' },
            { label: 'REM', placeholder: 'Ex: 100', val: sonoRem, set: setSonoRem, cor: C.recovery, op: 0.85, desc: 'Sonhos, memória e processamento emocional' },
          ].map((estagio, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: estagio.cor, opacity: estagio.op }} />
                <label style={{ fontFamily: FONT_BODY, color: C.t2, fontSize: 12, fontWeight: 600 }}>{estagio.label}</label>
                {estagio.val && <span style={{ fontFamily: FONT_MONO, color: C.t3, fontSize: 10, marginLeft: 'auto' }}>{formatarDuracao(parseInt(estagio.val))}</span>}
              </div>
              <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 10, marginBottom: 6 }}>{estagio.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlassInput type="number" placeholder={estagio.placeholder} value={estagio.val} onChange={e => estagio.set(e.target.value)} style={{ flex: 1 }} />
                <span style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, flexShrink: 0 }}>min</span>
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
              <div style={{ marginTop: 4 }}>
                <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Distribuição</p>
                <div style={{ height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', gap: 2 }}>
                  {l > 0 && <div style={{ width: `${(l / total) * 100}%`, background: C.sleep, opacity: 0.55, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} />}
                  {p > 0 && <div style={{ width: `${(p / total) * 100}%`, background: C.sleep }} />}
                  {r > 0 && <div style={{ width: `${(r / total) * 100}%`, background: C.recovery, opacity: 0.85, borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {l > 0 && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.sleep }}>Leve {Math.round((l / total) * 100)}%</span>}
                  {p > 0 && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.sleep }}>Profundo {Math.round((p / total) * 100)}%</span>}
                  {r > 0 && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.recovery }}>REM {Math.round((r / total) * 100)}%</span>}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Wearable */}
      <div style={{ ...glassCard, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontFamily: FONT_BODY, color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Dados do wearable</p>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: C.t3, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Opcional</span>
        </div>
        <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, marginBottom: 16 }}>FC, HRV e SpO2 melhoram muito a precisão do score.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, marginBottom: 6, display: 'block' }}>FC em repouso (bpm)</label>
            <GlassInput type="number" placeholder="Ex: 55" value={fcRepouso} onChange={e => setFcRepouso(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12 }}>HRV (ms) — variabilidade cardíaca</label>
              <HrvAjuda />
            </div>
            <GlassInput type="number" placeholder="Ex: 65" value={hrv} onChange={e => setHrv(e.target.value)} />
          </div>
          <div>
            <label style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, marginBottom: 6, display: 'block' }}>SpO2 (%) — saturação de oxigênio</label>
            <GlassInput type="number" placeholder="Ex: 97" value={spo2} onChange={e => setSpo2(e.target.value)} />
          </div>
        </div>
      </div>

      <button onClick={handleSalvar} style={{
        width: '100%', background: `linear-gradient(135deg, ${C.sleep}, ${C.recovery})`,
        color: '#0A1020', fontFamily: FONT_BODY, fontWeight: 800, padding: '16px', borderRadius: 16, fontSize: 13,
        letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
        boxShadow: '0 8px 30px rgba(96,165,250,0.3)',
      }}>
        Salvar dados de sono
      </button>
    </div>
  ) : null

  /* ── Header ───────────────────────────────────────────────── */
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isDesktop && (
          <button onClick={() => router.push('/dashboard')} style={{
            width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.t2, cursor: 'pointer', fontSize: 16,
          }}>←</button>
        )}
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: C.t1, margin: 0 }}>Sono & Recuperação</h1>
          <p style={{ fontFamily: FONT_BODY, color: C.t3, fontSize: 12, margin: 0 }}>{(() => { const d = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1); })()}</p>
        </div>
      </div>
      {temDadosSono && (
        <button onClick={() => setEditando(!editando)} style={{
          fontFamily: FONT_BODY, fontSize: 10, color: C.t2, border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 10, padding: '6px 12px', background: 'transparent', textTransform: 'uppercase',
          letterSpacing: '0.1em', cursor: 'pointer',
        }}>
          {editando ? 'Cancelar' : 'Editar'}
        </button>
      )}
    </div>
  )

  /* ── Layout ───────────────────────────────────────────────── */
  return (
    <main className="md:flex" style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY }}>
      <SidebarProfissional tipo="cliente" />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <style>{`
        @keyframes koreSpin { to { transform: rotate(360deg) } }
        @keyframes korePulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>

      <div style={{
        maxWidth: isDesktop ? 1100 : 448, margin: '0 auto',
        padding: isDesktop ? '48px 32px 48px' : '0 16px 112px',
        paddingTop: isDesktop ? 48 : 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))',
      }}>
        {header}

        {isDesktop ? (
          editando ? (
            /* Formulário em coluna única centralizada no desktop */
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              {temDadosSono && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
                  {scoreCard}
                </div>
              )}
              {formulario}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
              {/* Coluna esquerda: score + histórico */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {scoreCard}
                {historicoCard}
                {estagiosCard}
              </div>
              {/* Coluna direita: dados + bem-estar + IA + wearable */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {dadosNoiteCard}
                {bemEstarCard}
                {iaCard}
                {wearableCta}
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {scoreCard}
            {dadosNoiteCard}
            {estagiosCard}
            {bemEstarCard}
            {iaCard}
            {historicoCard}
            {formulario}
            {wearableCta}
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
