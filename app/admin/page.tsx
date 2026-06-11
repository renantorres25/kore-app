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
  const [erro, setErro] = useState('')

  useEffect(() => {
    adminFetch<Kpis>('/api/admin/kpis').then(setKpis).catch((e) => setErro(e.message))
  }, [])

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 1080 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Visão geral</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, color: C.t1, margin: '4px 0 22px' }}>Cockpit</h1>

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

          <p style={{ color: C.t3, fontSize: 12, marginTop: 22 }}>
            MRR estimado a partir das assinaturas ativas (Solo R$79 / Conectado R$129). Métricas de receita e eventos crescem conforme o app populá-las.
          </p>
        </>
      )}
    </div>
  )
}
