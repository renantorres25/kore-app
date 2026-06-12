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
type Msg = { id: string; autor_tipo: string; mensagem: string; created_at: string }

export default function SacPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [contagem, setContagem] = useState<Record<string, number>>({})
  const [filtro, setFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<Msg[]>([])
  const [carregandoMsg, setCarregandoMsg] = useState(false)
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)

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

  async function abrirConversa(id: string) {
    if (aberto === id) { setAberto(null); return }
    setAberto(id); setMensagens([]); setResposta(''); setCarregandoMsg(true)
    try {
      const d = await adminFetch<{ mensagens: Msg[] }>(`/api/admin/tickets?ticket_id=${id}`)
      setMensagens(d.mensagens)
    } catch (e: any) { setErro(e.message) } finally { setCarregandoMsg(false) }
  }

  async function responder(id: string) {
    if (!resposta.trim()) return
    setEnviando(true)
    try {
      await adminPost('/api/admin/tickets', { id, mensagem: resposta.trim() })
      setResposta('')
      const d = await adminFetch<{ mensagens: Msg[] }>(`/api/admin/tickets?ticket_id=${id}`)
      setMensagens(d.mensagens)
      await carregar()
    } catch (e: any) { setErro(e.message) } finally { setEnviando(false) }
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
              <button onClick={() => abrirConversa(t.id)} style={mini(C.energy)}>{aberto === t.id ? 'Fechar conversa' : 'Responder'}</button>
              {t.status !== 'em_andamento' && <button onClick={() => mudarStatus(t.id, 'em_andamento')} style={mini(C.sleep)}>Em andamento</button>}
              {t.status !== 'resolvido' && <button onClick={() => mudarStatus(t.id, 'resolvido')} style={mini(C.good)}>Resolver</button>}
              {t.status !== 'fechado' && <button onClick={() => mudarStatus(t.id, 'fechado')} style={mini(C.t3)}>Fechar</button>}
              {t.status !== 'aberto' && <button onClick={() => mudarStatus(t.id, 'aberto')} style={mini(C.warn)}>Reabrir</button>}
            </div>

            {aberto === t.id && (
              <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                {carregandoMsg && <p style={{ color: C.t3, fontSize: 12 }}>Carregando conversa…</p>}
                {!carregandoMsg && mensagens.length === 0 && (
                  <p style={{ color: C.t3, fontSize: 12, marginBottom: 10 }}>Ainda não há respostas. Escreva a primeira abaixo.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {mensagens.map((m) => {
                    const ehAdmin = m.autor_tipo === 'admin'
                    return (
                      <div key={m.id} style={{ alignSelf: ehAdmin ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <div style={{
                          background: ehAdmin ? 'rgba(255,90,54,0.14)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${ehAdmin ? 'rgba(255,90,54,0.3)' : 'rgba(255,255,255,0.10)'}`,
                          borderRadius: 12, padding: '9px 12px', color: C.t1, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                        }}>{m.mensagem}</div>
                        <p style={{ color: C.t3, fontSize: 10, margin: '3px 4px 0', textAlign: ehAdmin ? 'right' : 'left' }}>
                          {ehAdmin ? 'Você (SAC)' : (t.solicitante_nome || 'Usuário')} · {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={3} placeholder="Escreva sua resposta ao usuário…"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', color: C.t1, fontFamily: JAKARTA, fontSize: 13, outline: 'none', resize: 'vertical' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button onClick={() => responder(t.id)} disabled={enviando || !resposta.trim()}
                    style={{ background: `linear-gradient(135deg, ${C.energy}, #FF8A3D)`, color: '#fff', fontWeight: 700, fontFamily: JAKARTA, fontSize: 13, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: enviando || !resposta.trim() ? 'default' : 'pointer', opacity: enviando || !resposta.trim() ? 0.4 : 1 }}>
                    {enviando ? 'Enviando…' : 'Enviar resposta'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function mini(cor: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${cor}`, color: cor, fontWeight: 600, fontFamily: JAKARTA, fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }
}
