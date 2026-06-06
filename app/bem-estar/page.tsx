'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { atualizarDecisaoDia } from '../lib/atualizarDecisaoDia'
import NavBar from '../components/NavBar'

/* ─────────────────────────────────────────────────────────
   DESIGN SYSTEM — Energetic Precision
   ───────────────────────────────────────────────────────── */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}

const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

const dataNum = (color = C.t1): React.CSSProperties => ({ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', color })

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c(); window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

type Indicador = {
  id: string
  label: string
  descricao: string
  labels: string[]
  cor: string
}

const indicadores: Indicador[] = [
  { id: 'energia',        label: 'Energia',       descricao: 'Como está seu nível de energia hoje?', labels: ['Esgotado', 'Baixa', 'Normal', 'Boa', 'Máxima'],     cor: C.energy },
  { id: 'humor',          label: 'Humor',          descricao: 'Como está seu estado emocional?',       labels: ['Péssimo', 'Ruim', 'Normal', 'Bom', 'Ótimo'],        cor: C.good },
  { id: 'dor_muscular',   label: 'Dor muscular',   descricao: 'Sente dor ou fadiga nos músculos?',     labels: ['Intensa', 'Alta', 'Moderada', 'Leve', 'Nenhuma'],   cor: C.danger },
  { id: 'qualidade_sono', label: 'Sono',           descricao: 'Como foi o sono da noite anterior?',    labels: ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'],       cor: C.sleep },
]

export default function BemEstar() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
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
  function getCorMedia(m: number) { return m <= 2 ? C.danger : m === 3 ? C.warn : C.good }
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
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: isDesktop ? 220 : 0 }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${C.recovery}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )

  if (sucesso) return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: isDesktop ? 220 : 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(167,139,250,0.14)', border: `1px solid ${C.recovery}`,
          boxShadow: `0 0 40px rgba(167,139,250,0.45)`,
        }}>
          <span style={{ fontSize: 38, fontWeight: 800, color: C.recovery, fontFamily: FONT_DISPLAY }}>✓</span>
        </div>
        <p style={{ color: C.t1, fontWeight: 800, fontSize: 18, fontFamily: FONT_DISPLAY }}>Registrado!</p>
        <p style={{ color: C.t3, fontSize: 13, fontFamily: FONT_BODY }}>Voltando ao dashboard...</p>
      </div>
    </main>
  )

  /* ── Resumo (já registrado) — mostra valores em cards glass coloridos ── */
  function ResumoView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Estado geral */}
        {media && (
          <div style={{ ...glass, padding: 24, borderColor: 'rgba(167,139,250,0.30)' }}>
            <p style={{ color: C.recovery, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 10, fontFamily: FONT_BODY, fontWeight: 700 }}>Seu estado geral hoje</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: getCorMedia(media), fontFamily: FONT_DISPLAY, lineHeight: 1 }}>{getLabelMedia(media)}</p>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 48, fontWeight: 800, fontFamily: FONT_DISPLAY, ...dataNum(getCorMedia(media)), lineHeight: 0.9 }}>{media}</p>
                <p style={{ color: C.t3, fontSize: 12, fontFamily: FONT_BODY }}>de 5</p>
              </div>
            </div>
            <div style={{ marginTop: 16, height: 6, background: 'rgba(255,255,255,0.09)', borderRadius: 999 }}>
              <div style={{ height: 6, borderRadius: 999, transition: 'all .5s', width: `${(media / 5) * 100}%`, background: getCorMedia(media), boxShadow: `0 0 12px ${getCorMedia(media)}` }} />
            </div>
          </div>
        )}

        {/* Cards coloridos por indicador */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {indicadores.map((ind) => {
            const v = valores[ind.id]
            return (
              <div key={ind.id} style={{ ...glass, padding: 18, borderColor: `${ind.cor}55` }}>
                <p style={{ color: ind.cor, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 10, fontFamily: FONT_BODY, fontWeight: 700 }}>{ind.label}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <p style={{ fontSize: 40, fontWeight: 800, fontFamily: FONT_DISPLAY, ...dataNum(ind.cor), lineHeight: 0.9 }}>{v}</p>
                  <p style={{ color: C.t3, fontSize: 12, fontFamily: FONT_BODY, marginBottom: 4 }}>/5</p>
                </div>
                <p style={{ color: C.t2, fontSize: 13, fontFamily: FONT_BODY, fontWeight: 600, marginTop: 4 }}>{ind.labels[v - 1]}</p>
                <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} style={{ flex: 1, height: 4, borderRadius: 999, background: n <= v ? ind.cor : 'rgba(255,255,255,0.10)' }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {notas && (
          <div style={{ ...glass, padding: 20 }}>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 8, fontFamily: FONT_BODY, fontWeight: 700 }}>Observações</p>
            <p style={{ color: C.t1, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{notas}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY, paddingLeft: isDesktop ? 220 : 0 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px', paddingBottom: 120, paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.push('/dashboard')} style={{
            width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: C.t2,
            cursor: 'pointer', fontSize: 18, fontFamily: FONT_BODY, transition: 'all .15s',
          }}>←</button>
          <div>
            <p style={{ color: C.recovery, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: FONT_BODY, fontWeight: 700, marginBottom: 4 }}>Bem-estar</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.t1, fontFamily: FONT_DISPLAY, lineHeight: 1 }}>Como estou hoje</h1>
            <p style={{ color: C.t3, fontSize: 12, fontFamily: FONT_BODY, marginTop: 4 }}>{jaRegistrou ? 'Atualizar registro de hoje' : 'Registro diário de bem-estar'}</p>
          </div>
        </div>

        {jaRegistrou && <div style={{ marginBottom: 28 }}><ResumoView /></div>}

        {/* Check-in — sliders por métrica */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {indicadores.map((ind) => {
            const v = valores[ind.id]
            return (
              <div key={ind.id} style={{ ...glass, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <p style={{ color: ind.cor, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontFamily: FONT_BODY, fontWeight: 800, marginBottom: 4 }}>{ind.label}</p>
                    <p style={{ color: C.t3, fontSize: 12, fontFamily: FONT_BODY }}>{ind.descricao}</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 64 }}>
                    <p style={{ fontSize: 40, fontWeight: 800, fontFamily: FONT_DISPLAY, ...dataNum(v ? ind.cor : C.t3), lineHeight: 0.9 }}>{v || '–'}</p>
                  </div>
                </div>

                {/* Slider visual */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const ativo = v === n
                    const preenchido = v >= n
                    return (
                      <button key={n} onClick={() => setValor(ind.id, n)} style={{
                        flex: 1, height: ativo ? 14 : 10, borderRadius: 999, cursor: 'pointer', border: 'none', padding: 0,
                        background: preenchido ? ind.cor : 'rgba(255,255,255,0.10)',
                        boxShadow: ativo ? `0 0 16px ${ind.cor}` : 'none',
                        transition: 'all .18s', alignSelf: 'center',
                      }} aria-label={`${ind.label} nível ${n}`} />
                    )
                  })}
                </div>

                {/* Label descritivo */}
                <p style={{
                  marginTop: 14, fontSize: 15, fontWeight: 700, fontFamily: FONT_DISPLAY,
                  color: v ? ind.cor : C.t3, transition: 'color .18s',
                }}>{v ? ind.labels[v - 1] : 'Toque para avaliar'}</p>
              </div>
            )
          })}
        </div>

        {/* Observações */}
        <div style={{ ...glass, padding: 22, marginBottom: 24 }}>
          <label style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 12, display: 'block', fontFamily: FONT_BODY, fontWeight: 700 }}>
            Observações <span style={{ textTransform: 'none', color: C.t3, opacity: 0.7 }}>(opcional)</span>
          </label>
          <textarea
            placeholder="Algo específico que quer registrar?"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 14, padding: '14px 16px', color: C.t1, fontSize: 14, fontFamily: FONT_BODY,
              outline: 'none', resize: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Progresso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', transition: 'all .2s',
                background: i < total ? C.recovery : 'rgba(255,255,255,0.15)',
                boxShadow: i < total ? `0 0 10px ${C.recovery}` : 'none',
              }} />
            ))}
          </div>
          <p style={{ color: C.t3, fontSize: 12, fontFamily: FONT_BODY }}>{total} de 4 preenchidos</p>
        </div>

        {erro && <p style={{ color: C.danger, fontSize: 14, textAlign: 'center', marginBottom: 18, fontFamily: FONT_BODY }}>{erro}</p>}

        {/* Botão salvar — roxo com glow */}
        <button
          onClick={handleSalvar}
          disabled={salvando || total < 4}
          style={{
            width: '100%', padding: '18px 0', borderRadius: 18, border: 'none', cursor: salvando || total < 4 ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 800, fontFamily: FONT_DISPLAY, letterSpacing: '0.06em', color: '#fff',
            background: total < 4 ? 'rgba(167,139,250,0.25)' : `linear-gradient(135deg, ${C.recovery}, #8B6FE8)`,
            boxShadow: total < 4 ? 'none' : `0 8px 32px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.25)`,
            opacity: salvando ? 0.6 : 1, transition: 'all .2s',
          }}
        >
          {salvando ? 'Salvando...' : jaRegistrou ? 'Atualizar registro' : 'Registrar bem-estar'}
        </button>
      </div>
      <NavBar tipo="cliente" ativa="bem-estar" />
    </main>
  )
}
