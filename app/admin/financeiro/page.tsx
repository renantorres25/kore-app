'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '../../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA', warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16, padding: 18,
}
const corStatus: Record<string, string> = { ativa: '#2DD4A7', trial: '#60A5FA', inadimplente: '#F5B544', cancelada: '#FB7185' }

type Fin = {
  resumo: { mrr: number; ativas: number; trial: number; inadimplentes: number; canceladas: number; porPlano: Record<string, number> }
  assinaturas: any[]
  pagamentos: any[]
}

function Card({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div style={glass}>
      <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: SORA, fontSize: 26, fontWeight: 800, color: cor, margin: '8px 0 0' }}>{valor}</p>
    </div>
  )
}

export default function FinanceiroPage() {
  const [f, setF] = useState<Fin | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    adminFetch<Fin>('/api/admin/financeiro').then(setF).catch((e) => setErro(e.message))
  }, [])

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 1000, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Receita</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 22px' }}>Financeiro</h1>

      {erro && <div style={{ ...glass, borderColor: 'rgba(251,113,133,0.4)', color: C.danger, marginBottom: 16 }}>{erro}</div>}
      {!f && !erro && <p style={{ color: C.t2 }}>Carregando…</p>}

      {f && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <Card label="MRR" valor={`R$ ${f.resumo.mrr.toLocaleString('pt-BR')}`} cor={C.energy} />
            <Card label="Ativas" valor={String(f.resumo.ativas)} cor={C.good} />
            <Card label="Em trial" valor={String(f.resumo.trial)} cor={C.sleep} />
            <Card label="Inadimplentes" valor={String(f.resumo.inadimplentes)} cor={C.warn} />
            <Card label="Canceladas" valor={String(f.resumo.canceladas)} cor={C.t2} />
          </div>

          <h2 style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, margin: '26px 0 12px' }}>Assinaturas</h2>
          {f.assinaturas.length === 0 ? (
            <p style={{ color: C.t3 }}>Nenhuma assinatura registrada ainda. Você pode registrar uma assinatura manualmente na ficha de cada usuário (Usuários → abrir um usuário).</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {f.assinaturas.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, ...glass, padding: '12px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.t1, fontWeight: 600, fontSize: 14, margin: 0 }}>{a.nome || 'Usuário'}</p>
                    <p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>{a.email || a.user_id}</p>
                  </div>
                  <span style={{ color: C.t2, fontSize: 13, textTransform: 'capitalize' }}>{a.plano}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: corStatus[a.status] || C.t2 }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, margin: '26px 0 12px' }}>Pagamentos recentes</h2>
          {f.pagamentos.length === 0 ? (
            <p style={{ color: C.t3 }}>Nenhum pagamento registrado. A integração automática entra quando o provedor de pagamento for definido.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {f.pagamentos.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', ...glass, padding: '10px 16px' }}>
                  <span style={{ color: C.t1, fontSize: 13 }}>R$ {Number(p.valor).toLocaleString('pt-BR')}</span>
                  <span style={{ color: corStatus[p.status] || C.t2, fontSize: 12, fontWeight: 700 }}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
