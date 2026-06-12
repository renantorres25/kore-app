'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  padding: 20,
}

type Kpis = {
  total: number | null
  porTipo: Record<string, number>
  novos30: number | null
  novos7: number | null
  ativos7: number | null
  ativos30: number | null
  crescimentoSemanal: number[]
  vinculos: number | null
  assinantesAtivos: number
  mrr: number
  eventosHoje: number | null
  ticketsAbertos: number | null
}

function fmt(v: number | null | undefined) {
  return v === null || v === undefined ? '—' : v.toLocaleString('pt-BR')
}

function Card({ label, valor, cor, sufixo }: { label: string; valor: string; cor: string; sufixo?: string }) {
  return (
    <div style={glass}>
      <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, color: cor, margin: '8px 0 0' }}>
        {valor}{sufixo ? <span style={{ fontSize: 14, color: C.t2, fontWeight: 600 }}> {sufixo}</span> : null}
      </p>
    </div>
  )
}

export default function CockpitPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [alertas, setAlertas] = useState<{ nivel: string; texto: string }[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    adminFetch<Kpis>('/api/admin/kpis').then(setKpis).catch((e) => setErro(e.message))
    adminFetch<{ alertas: { nivel: string; texto: string }[] }>('/api/admin/alertas').then((d) => setAlertas(d.alertas)).catch(() => {})
  }, [])

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 1080 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Visão geral</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, color: C.t1, margin: '4px 0 18px' }}>Cockpit</h1>

      {alertas.length > 0 && (
        <div style={{ ...glass, marginBottom: 18 }}>
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 10px' }}>Precisa de atenção</p>
          {alertas.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.nivel === 'alerta' ? C.energy : C.sleep, flexShrink: 0 }} />
              <span style={{ color: C.t1, fontSize: 13 }}>{a.texto}</span>
            </div>
          ))}
        </div>
      )}

      {erro && (
        <div style={{ ...glass, borderColor: 'rgba(248,113,113,0.4)', color: '#F87171', marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {!kpis && !erro && <p style={{ color: C.t2 }}>Carregando indicadores…</p>}

      {kpis && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Card label="Usuários totais" valor={fmt(kpis.total)} cor={C.t1} />
            <Card label="Ativos (7 dias)" valor={fmt(kpis.ativos7)} cor={C.good} />
            <Card label="Ativos (30 dias)" valor={fmt(kpis.ativos30)} cor={C.good} />
            <Card label="Novos (7 dias)" valor={fmt(kpis.novos7)} cor={C.sleep} />
            <Card label="Novos (30 dias)" valor={fmt(kpis.novos30)} cor={C.sleep} />
            <Card label="Vínculos (triângulo)" valor={fmt(kpis.vinculos)} cor={C.recovery} />
            <Card label="Assinantes ativos" valor={fmt(kpis.assinantesAtivos)} cor={C.sleep} />
            <Card label="MRR estimado" valor={`R$ ${fmt(kpis.mrr)}`} cor={C.energy} />
            <Card label="Eventos hoje" valor={fmt(kpis.eventosHoje)} cor={C.t1} />
            <Card label="Tickets abertos" valor={fmt(kpis.ticketsAbertos)} cor={C.t1} />
          </div>

          <h2 style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, color: C.t1, margin: '28px 0 12px' }}>Usuários por perfil</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Card label="Atletas" valor={fmt(kpis.porTipo?.cliente)} cor={C.energy} />
            <Card label="Personais" valor={fmt(kpis.porTipo?.personal)} cor={C.sleep} />
            <Card label="Nutricionistas" valor={fmt(kpis.porTipo?.nutricionista)} cor={C.good} />
          </div>

          {kpis.crescimentoSemanal && kpis.crescimentoSemanal.length > 0 && (
            <>
              <h2 style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, color: C.t1, margin: '28px 0 12px' }}>Novos usuários por semana (8 semanas)</h2>
              <div style={{ ...glass, display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
                {(() => {
                  const max = Math.max(1, ...kpis.crescimentoSemanal)
                  return kpis.crescimentoSemanal.map((v, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
                      <span style={{ color: C.t2, fontSize: 11, fontWeight: 700 }}>{v}</span>
                      <div style={{ width: '70%', height: `${Math.max(4, (v / max) * 100)}%`, background: `linear-gradient(180deg, ${C.energy}, ${C.energy}66)`, borderRadius: '6px 6px 0 0' }} />
                      <span style={{ color: C.t3, fontSize: 9 }}>{i === 7 ? 'agora' : `-${7 - i}s`}</span>
                    </div>
                  ))
                })()}
              </div>
            </>
          )}

          <p style={{ color: C.t3, fontSize: 12, marginTop: 22 }}>
            MRR estimado a partir das assinaturas ativas (Solo R$79 / Conectado R$129). Métricas de receita e eventos crescem conforme o app populá-las.
          </p>
        </>
      )}
    </div>
  )
}
