'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '../../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA', warn: '#F5B544',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16, padding: 18,
}

type Analise = {
  totalAtletas: number
  perfilCompleto: number | null
  comWearable: number | null
  comBemEstar: number | null
  comSono: number | null
  comTreino: number | null
  engajamento: { dia: string; n: number }[]
  ativos7Registro: number | null
}

function Barra({ label, v, total, cor }: { label: string; v: number | null; total: number; cor: string }) {
  const pct = v !== null && total > 0 ? Math.round((v / total) * 100) : null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: C.t2, fontSize: 13 }}>{label}</span>
        <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>
          {v === null ? '—' : `${v} de ${total}`}{pct !== null ? <span style={{ color: cor }}> · {pct}%</span> : null}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct ?? 0}%`, background: cor, borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function AnalisePage() {
  const [a, setA] = useState<Analise | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    adminFetch<Analise>('/api/admin/analise').then(setA).catch((e) => setErro(e.message))
  }, [])

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 1000, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Produto</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 22px' }}>Análise</h1>

      {erro && <div style={{ ...glass, borderColor: 'rgba(251,113,133,0.4)', color: '#FB7185', marginBottom: 16 }}>{erro}</div>}
      {!a && !erro && <p style={{ color: C.t2 }}>Carregando…</p>}

      {a && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* Funil de ativação */}
          <div style={glass}>
            <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 4px' }}>Ativação dos atletas</p>
            <p style={{ color: C.t3, fontSize: 12, margin: '0 0 16px' }}>Base: {a.totalAtletas} atletas</p>
            <Barra label="Perfil completo" v={a.perfilCompleto} total={a.totalAtletas} cor={C.energy} />
            <Barra label="Wearable conectado" v={a.comWearable} total={a.totalAtletas} cor={C.sleep} />
            <Barra label="Registrou bem-estar" v={a.comBemEstar} total={a.totalAtletas} cor={C.good} />
            <Barra label="Registrou sono" v={a.comSono} total={a.totalAtletas} cor={C.recovery} />
            <Barra label="Registrou treino" v={a.comTreino} total={a.totalAtletas} cor={C.warn} />
          </div>

          {/* Engajamento */}
          <div style={glass}>
            <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 4px' }}>Engajamento (14 dias)</p>
            <p style={{ color: C.t3, fontSize: 12, margin: '0 0 14px' }}>
              Registros de bem-estar por dia · {a.ativos7Registro ?? '—'} atletas ativos nos últimos 7 dias
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130 }}>
              {(() => {
                const max = Math.max(1, ...a.engajamento.map((e) => e.n))
                return a.engajamento.map((e, i) => (
                  <div key={i} title={`${e.dia}: ${e.n}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ width: '72%', height: `${Math.max(3, (e.n / max) * 100)}%`, background: `linear-gradient(180deg, ${C.good}, ${C.good}55)`, borderRadius: '4px 4px 0 0' }} />
                  </div>
                ))
              })()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ color: C.t3, fontSize: 9 }}>-14d</span>
              <span style={{ color: C.t3, fontSize: 9 }}>hoje</span>
            </div>
          </div>
        </div>
      )}

      {a && (
        <p style={{ color: C.t3, fontSize: 12, marginTop: 20 }}>
          A ativação e o engajamento vêm dos dados reais de uso do app. Coortes de retenção (D1/D7/D30) ganham precisão conforme a telemetria acumula histórico.
        </p>
      )}
    </div>
  )
}
