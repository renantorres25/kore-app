'use client'

import { useEffect, useState } from 'react'
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
  borderRadius: 16, padding: 18,
}

type Sistema = {
  integracoes: { banco: boolean; ia: boolean; email: boolean; pagamento: boolean }
  conexoes: { strava: number | null; terra: number | null }
  consentimentos: number | null
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: C.t2, fontSize: 13 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: ok ? C.good : C.warn, fontSize: 12, fontWeight: 700 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? C.good : C.warn }} />
        {ok ? 'Configurado' : 'Não configurado'}
      </span>
    </div>
  )
}

export default function SistemaPage() {
  const [s, setS] = useState<Sistema | null>(null)
  const [erro, setErro] = useState('')
  const [digestMsg, setDigestMsg] = useState('')
  const [digestErro, setDigestErro] = useState('')
  const [digestOcupado, setDigestOcupado] = useState(false)

  useEffect(() => {
    adminFetch<Sistema>('/api/admin/sistema').then(setS).catch((e) => setErro(e.message))
  }, [])

  async function enviarDigest() {
    setDigestOcupado(true); setDigestMsg(''); setDigestErro('')
    try {
      const r = await adminPost<{ enviados: number }>('/api/admin/digest', {})
      setDigestMsg(`Enviado para ${r.enviados} admin(s).`)
    } catch (e: any) { setDigestErro(e.message) } finally { setDigestOcupado(false) }
  }

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 900, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Configuração</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 22px' }}>Sistema</h1>

      {erro && <div style={{ ...glass, borderColor: 'rgba(251,113,133,0.4)', color: C.danger, marginBottom: 16 }}>{erro}</div>}
      {!s && !erro && <p style={{ color: C.t2 }}>Carregando…</p>}

      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={glass}>
            <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 6px' }}>Integrações</p>
            <Status label="Banco de dados (Supabase)" ok={s.integracoes.banco} />
            <Status label="IA (Anthropic)" ok={s.integracoes.ia} />
            <Status label="E-mail (Resend)" ok={s.integracoes.email} />
            <Status label="Pagamento" ok={s.integracoes.pagamento} />
          </div>

          <div style={glass}>
            <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 6px' }}>Wearables conectados</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: C.t2, fontSize: 13 }}>Strava</span>
              <span style={{ color: C.t1, fontWeight: 700 }}>{s.conexoes.strava ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0' }}>
              <span style={{ color: C.t2, fontSize: 13 }}>Terra</span>
              <span style={{ color: C.t1, fontWeight: 700 }}>{s.conexoes.terra ?? '—'}</span>
            </div>
          </div>

          <div style={glass}>
            <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 6px' }}>LGPD</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0' }}>
              <span style={{ color: C.t2, fontSize: 13 }}>Consentimentos registrados</span>
              <span style={{ color: C.t1, fontWeight: 700 }}>{s.consentimentos ?? '—'}</span>
            </div>
            <p style={{ color: C.t3, fontSize: 11, marginTop: 8 }}>
              A captura de consentimento no cadastro ainda não está ativa (pendência F26 da auditoria). A exclusão de dados já está disponível na ficha de cada usuário.
            </p>
          </div>

          <div style={glass}>
            <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 6px' }}>Digest semanal</p>
            <p style={{ color: C.t2, fontSize: 13, margin: '0 0 12px' }}>Envia o resumo (usuários, crescimento, MRR, SAC) por e-mail para todos os admins ativos.</p>
            {(digestMsg || digestErro) && <p style={{ color: digestErro ? C.danger : C.good, fontSize: 12, margin: '0 0 10px' }}>{digestErro || digestMsg}</p>}
            <button disabled={digestOcupado} onClick={enviarDigest}
              style={{ background: 'transparent', border: `1px solid ${C.sleep}`, color: C.sleep, fontWeight: 600, fontFamily: JAKARTA, fontSize: 13, padding: '9px 14px', borderRadius: 10, cursor: digestOcupado ? 'default' : 'pointer' }}>
              {digestOcupado ? 'Enviando…' : 'Enviar agora'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
