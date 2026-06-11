'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '../../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA', warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"

type Log = { id: number; admin_id: string; admin_nome: string; acao: string; entidade: string | null; entidade_id: string | null; created_at: string }

const rotulo: Record<string, string> = {
  'usuario:suspender': 'Suspendeu usuário',
  'usuario:reativar': 'Reativou usuário',
  'usuario:mudar_perfil': 'Alterou perfil',
  'usuario:reset_senha': 'Enviou redefinição de senha',
  'usuario:registrar_assinatura': 'Registrou assinatura',
  'usuario:excluir': 'Excluiu usuário',
}
const corAcao: Record<string, string> = {
  'usuario:suspender': '#F5B544',
  'usuario:excluir': '#FB7185',
  'usuario:reativar': '#2DD4A7',
  'usuario:registrar_assinatura': '#2DD4A7',
}

function descrever(acao: string) {
  if (rotulo[acao]) return rotulo[acao]
  if (acao.startsWith('ticket:')) return 'Atualizou ticket'
  return acao
}
function quando(s: string) {
  try { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

export default function AuditoriaPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    adminFetch<{ logs: Log[] }>('/api/admin/auditoria').then((d) => setLogs(d.logs)).catch((e) => setErro(e.message))
  }, [])

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 900, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Conformidade</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 6px' }}>Auditoria</h1>
      <p style={{ color: C.t3, fontSize: 13, margin: '0 0 20px' }}>Registro imutável de todas as ações administrativas.</p>

      {erro && <div style={{ color: C.danger, marginBottom: 14 }}>{erro}</div>}
      {!logs && !erro && <p style={{ color: C.t2 }}>Carregando…</p>}
      {logs && logs.length === 0 && <p style={{ color: C.t3 }}>Nenhuma ação registrada ainda.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {logs?.map((l) => {
          const linkUser = l.entidade === 'perfis' && l.entidade_id
          return (
            <div key={l.id}
              onClick={() => { if (linkUser) router.push(`/admin/usuarios/${l.entidade_id}`) }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 16px', cursor: linkUser ? 'pointer' : 'default' }}>
              <span style={{ color: C.t3, fontSize: 12, minWidth: 86 }}>{quando(l.created_at)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: corAcao[l.acao] || C.t1, fontSize: 13, fontWeight: 600 }}>{descrever(l.acao)}</span>
                {linkUser && <span style={{ color: C.t3, fontSize: 11 }}> · abrir usuário</span>}
              </div>
              <span style={{ color: C.t2, fontSize: 12 }}>{l.admin_nome}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
