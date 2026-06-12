'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminFetch, adminPost } from '../../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA', warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 14, padding: 16,
}
const corStatus: Record<string, string> = { aberto: '#F5B544', em_andamento: '#60A5FA', resolvido: '#2DD4A7', fechado: '#7A8290' }
const rotStatus: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido', fechado: 'Fechado' }
const corPri: Record<string, string> = { alta: '#FB7185', media: '#F5B544', baixa: '#9AA0AD' }

type Ticket = { id: string; canal: string; assunto: string; descricao: string | null; status: string; prioridade: string; csat: number | null; created_at: string; solicitante_nome?: string | null; solicitante_email?: string | null }

export default function SacPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [contagem, setContagem] = useState<Record<string, number>>({})
  const [filtro, setFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('')
    try {
      const params = filtro ? `?status=${filtro}` : ''
      const data = await adminFetch<{ tickets: Ticket[]; contagem: Record<string, number> }>(`/api/admin/tickets${params}`)
      setTickets(data.tickets); setContagem(data.contagem)
    } catch (e: any) { setErro(e.message) } finally { setCarregando(false) }
  }, [filtro])

  useEffect(() => { carregar() }, [carregar])

  async function mudarStatus(id: string, status: string) {
    try { await adminPost('/api/admin/tickets', { id, status }); await carregar() } catch (e: any) { setErro(e.message) }
  }

  const filtros = [
    { label: 'Todos', val: '' },
    { label: 'Abertos', val: 'aberto' },
    { label: 'Em andamento', val: 'em_andamento' },
    { label: 'Resolvidos', val: 'resolvido' },
    { label: 'Fechados', val: 'fechado' },
  ]

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 900, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Suporte</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 18px' }}>SAC</h1>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {filtros.map((f) => (
          <button key={f.val} onClick={() => setFiltro(f.val)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: JAKARTA, fontSize: 13,
              background: filtro === f.val ? 'rgba(255,90,54,0.15)' : 'transparent',
              color: filtro === f.val ? C.energy : C.t2, fontWeight: filtro === f.val ? 700 : 500 }}>
            {f.label}{f.val && contagem[f.val] !== undefined ? ` (${contagem[f.val]})` : ''}
          </button>
        ))}
      </div>

      {erro && <div style={{ color: C.danger, marginBottom: 14 }}>{erro}</div>}
      {carregando && <p style={{ color: C.t2 }}>Carregando…</p>}

      {!carregando && tickets.length === 0 && !erro && (
        <div style={{ ...glass, textAlign: 'center', padding: 32 }}>
          <p style={{ color: C.t1, fontWeight: 700, fontFamily: SORA, margin: 0 }}>Nenhum ticket por aqui</p>
          <p style={{ color: C.t3, fontSize: 13, margin: '6px 0 0' }}>Os chamados aparecem aqui quando os usuários abrirem suporte pelo app.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tickets.map((t) => (
          <div key={t.id} style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, color: C.t1, fontWeight: 600, fontSize: 14 }}>{t.assunto}</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: corPri[t.prioridade] || C.t2 }}>{t.prioridade}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: corStatus[t.status] || C.t2 }}>{rotStatus[t.status] || t.status}</span>
            </div>
            {(t.solicitante_nome || t.solicitante_email) && (
              <p style={{ color: C.t3, fontSize: 12, margin: '4px 0 0' }}>
                {t.solicitante_nome || 'Usuário'}{t.solicitante_email ? ` · ${t.solicitante_email}` : ''}
                <span style={{ marginLeft: 8, color: C.t3 }}>· {new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </p>
            )}
            {t.descricao && <p style={{ color: C.t2, fontSize: 13, margin: '8px 0 0' }}>{t.descricao}</p>}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {t.status !== 'em_andamento' && <button onClick={() => mudarStatus(t.id, 'em_andamento')} style={mini(C.sleep)}>Em andamento</button>}
              {t.status !== 'resolvido' && <button onClick={() => mudarStatus(t.id, 'resolvido')} style={mini(C.good)}>Resolver</button>}
              {t.status !== 'fechado' && <button onClick={() => mudarStatus(t.id, 'fechado')} style={mini(C.t3)}>Fechar</button>}
              {t.status !== 'aberto' && <button onClick={() => mudarStatus(t.id, 'aberto')} style={mini(C.warn)}>Reabrir</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function mini(cor: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${cor}`, color: cor, fontWeight: 600, fontFamily: JAKARTA, fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }
}
