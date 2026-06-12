'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { registrarEvento } from '../lib/eventos'
import SidebarProfissional from '../components/SidebarProfissional'

/* Design System: Energetic Precision */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  color: C.t1,
  colorScheme: 'dark',
  fontFamily: FONT_BODY,
  fontSize: 14,
  padding: '12px 14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .15s, box-shadow .15s',
}

const corStatus: Record<string, string> = { aberto: C.warn, em_andamento: C.sleep, resolvido: C.good, fechado: C.t3 }
const rotStatus: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido', fechado: 'Fechado' }

type Ticket = { id: string; assunto: string; descricao: string | null; status: string; created_at: string }

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

export default function SuportePage() {
  const router = useRouter()
  const isDesktop = useIsDesktop()

  const [carregando, setCarregando] = useState(true)
  const [userId, setUserId] = useState('')
  const [tipo, setTipo] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])

  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const carregarTickets = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('tickets_sac')
      .select('id, assunto, descricao, status, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    setTickets((data as Ticket[]) || [])
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data: perfil } = await supabase.from('perfis').select('tipo').eq('id', session.user.id).single()
      setTipo(perfil?.tipo ?? '')
      await carregarTickets(session.user.id)
      setCarregando(false)
    })()
  }, [router, carregarTickets])

  async function enviar() {
    if (!assunto.trim()) { setErro('Descreva o assunto do chamado.'); return }
    setEnviando(true); setErro(''); setSucesso(false)
    const { error } = await supabase.from('tickets_sac').insert({
      user_id: userId,
      canal: 'in_app',
      assunto: assunto.trim(),
      descricao: descricao.trim() || null,
    })
    if (error) {
      setErro('Não foi possível abrir o chamado. Tente novamente.')
      setEnviando(false)
      return
    }
    try { registrarEvento('suporte_ticket_aberto') } catch { /* silencioso */ }
    setAssunto(''); setDescricao(''); setSucesso(true)
    await carregarTickets(userId)
    setEnviando(false)
    setTimeout(() => setSucesso(false), 3000)
  }

  const tipoSidebar = tipo === 'personal' ? 'personal' : tipo === 'nutricionista' ? 'nutricionista' : 'cliente'
  const labelStyle: React.CSSProperties = { color: C.t2, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }

  if (carregando) return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: C.energy, animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )

  return (
    <main className="md:flex" style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY }}>
      <SidebarProfissional tipo={tipoSidebar} />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
        <div style={{
          maxWidth: isDesktop ? 720 : 520, margin: '0 auto',
          padding: isDesktop ? '48px 32px 120px' : '0 16px 120px',
          paddingTop: isDesktop ? 48 : 'max(48px, calc(env(safe-area-inset-top) + 24px))',
        }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: C.t3, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>KORE</p>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.t1, lineHeight: 1.05 }}>Suporte</h1>
            <p style={{ color: C.t3, fontSize: 13, marginTop: 6 }}>Abra um chamado e acompanhe o andamento. Nossa equipe responde por aqui.</p>
          </div>

          {/* Formulário */}
          <div style={{ ...glass, padding: 20, marginBottom: 24 }}>
            <p style={{ color: C.t3, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Novo chamado</p>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Assunto</label>
              <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} maxLength={120}
                placeholder="Ex: Não consigo sincronizar o Strava"
                style={inputBase}
                onFocus={e => { e.target.style.borderColor = 'rgba(255,90,54,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,90,54,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Descrição <span style={{ color: C.t3, fontWeight: 400 }}>(opcional)</span></label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4} maxLength={2000}
                placeholder="Conte o que aconteceu, com o máximo de detalhes que puder."
                style={{ ...inputBase, resize: 'vertical' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(255,90,54,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,90,54,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'none' }} />
            </div>

            {erro && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{erro}</p>}
            {sucesso && <p style={{ color: C.good, fontSize: 13, marginBottom: 12 }}>Chamado aberto. Você pode acompanhá-lo abaixo.</p>}

            <button onClick={enviar} disabled={enviando || !assunto.trim()}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: enviando || !assunto.trim() ? 'default' : 'pointer',
                color: '#fff', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
                opacity: enviando || !assunto.trim() ? 0.35 : 1, transition: 'opacity .15s',
              }}>
              {enviando ? 'Enviando...' : 'Abrir chamado'}
            </button>
          </div>

          {/* Lista de chamados */}
          <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 12 }}>Seus chamados</p>

          {tickets.length === 0 ? (
            <div style={{ ...glass, padding: 28, textAlign: 'center' }}>
              <p style={{ color: C.t1, fontWeight: 700, fontFamily: FONT_DISPLAY, margin: 0 }}>Nenhum chamado ainda</p>
              <p style={{ color: C.t3, fontSize: 13, margin: '6px 0 0' }}>Quando você abrir um chamado, ele aparece aqui com o status.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tickets.map(t => (
                <div key={t.id} style={{ ...glass, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, color: C.t1, fontWeight: 600, fontSize: 14 }}>{t.assunto}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: corStatus[t.status] || C.t2 }}>{rotStatus[t.status] || t.status}</span>
                  </div>
                  {t.descricao && <p style={{ color: C.t2, fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>{t.descricao}</p>}
                  <p style={{ color: C.t3, fontSize: 11, margin: '10px 0 0' }}>
                    Aberto em {new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
