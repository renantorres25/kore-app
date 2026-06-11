'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminFetch, adminPost } from '../../../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA', warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"
const corTipo: Record<string, string> = { cliente: '#FF5A36', personal: '#60A5FA', nutricionista: '#2DD4A7' }
const rotuloTipo: Record<string, string> = { cliente: 'Atleta', personal: 'Personal', nutricionista: 'Nutricionista' }

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16, padding: 18,
}

type Detalhe = {
  perfil: any
  auth: { created_at: string | null; last_sign_in_at: string | null; email_confirmed_at: string | null; banned_until: string | null } | null
  vinculos: any[]
  assinatura: any
}

function dataBR(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
}
function idade(nasc: string | null | undefined) {
  if (!nasc) return null
  try {
    const d = new Date(nasc); const hoje = new Date()
    let a = hoje.getFullYear() - d.getFullYear()
    const m = hoje.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) a = a - 1
    return a
  } catch { return null }
}
function suspenso(banned: string | null | undefined) {
  if (!banned) return false
  try { return new Date(banned).getTime() > Date.now() } catch { return false }
}

function Linha({ k, v }: { k: string; v: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: C.t3, fontSize: 12.5 }}>{k}</span>
      <span style={{ color: C.t1, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{v === null || v === undefined || v === '' ? '—' : String(v)}</span>
    </div>
  )
}

export default function UsuarioDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')
  const [d, setD] = useState<Detalhe | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [novoTipo, setNovoTipo] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const data = await adminFetch<Detalhe>(`/api/admin/usuarios/${id}`)
      setD(data)
      setNovoTipo(data.perfil?.tipo || '')
    } catch (e: any) { setErro(e.message) }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function acao(corpo: any, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return
    setOcupado(true); setMsg(''); setErro('')
    try {
      const r = await adminPost<{ resultado: string }>(`/api/admin/usuarios/${id}`, corpo)
      setMsg(r.resultado)
      await carregar()
    } catch (e: any) { setErro(e.message) } finally { setOcupado(false) }
  }

  if (erro && !d) return <div style={{ fontFamily: JAKARTA, color: C.danger }}>{erro}</div>
  if (!d) return <p style={{ fontFamily: JAKARTA, color: C.t2 }}>Carregando…</p>

  const p = d.perfil
  const susp = suspenso(d.auth?.banned_until)
  const tipo = p?.tipo || ''

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 880, color: C.t1 }}>
      <button onClick={() => router.push('/admin/usuarios')} style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', fontFamily: JAKARTA, fontSize: 13, padding: 0, marginBottom: 14 }}>← Usuários</button>

      {/* Cabeçalho */}
      <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: corTipo[tipo] || C.t2, fontWeight: 800, fontSize: 18, fontFamily: SORA }}>
          {(p?.nome || '?').trim().charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, margin: 0 }}>{p?.nome || 'Sem nome'}</p>
          <p style={{ color: C.t3, fontSize: 13, margin: '2px 0 0' }}>{p?.email || '—'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: corTipo[tipo] || C.t2 }}>{rotuloTipo[tipo] || tipo || '—'}</span>
          {susp && <p style={{ color: C.danger, fontSize: 12, fontWeight: 700, margin: '4px 0 0' }}>SUSPENSO</p>}
        </div>
      </div>

      {(msg || erro) && (
        <div style={{ ...glass, padding: '10px 16px', marginBottom: 16, borderColor: erro ? 'rgba(251,113,133,0.4)' : 'rgba(45,212,167,0.4)', color: erro ? C.danger : C.good }}>
          {erro || msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {/* Dados do perfil */}
        <div style={glass}>
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 8px' }}>Dados do perfil</p>
          <Linha k="Objetivo" v={p?.objetivo} />
          <Linha k="Idade" v={idade(p?.data_nascimento)} />
          <Linha k="Sexo" v={p?.sexo} />
          <Linha k="Peso" v={p?.peso ? `${p.peso} kg` : null} />
          <Linha k="Altura" v={p?.altura ? `${p.altura} cm` : null} />
          <Linha k="Nível" v={p?.nivel} />
          <Linha k="Meta de peso" v={p?.meta_peso ? `${p.meta_peso} kg` : null} />
          <Linha k="FC máx" v={p?.fcmax} />
          <Linha k="FTP" v={p?.ftp} />
        </div>

        {/* Conta e atividade */}
        <div style={glass}>
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 8px' }}>Conta</p>
          <Linha k="Cadastro" v={dataBR(d.auth?.created_at)} />
          <Linha k="Último acesso" v={dataBR(d.auth?.last_sign_in_at)} />
          <Linha k="E-mail confirmado" v={d.auth?.email_confirmed_at ? 'Sim' : 'Não'} />
          <Linha k="Vínculos (time)" v={d.vinculos?.length ?? 0} />
          <Linha k="Assinatura" v={d.assinatura ? `${d.assinatura.plano} · ${d.assinatura.status}` : 'Nenhuma'} />
          <Linha k="Status" v={susp ? 'Suspenso' : 'Ativo'} />
        </div>
      </div>

      {/* Ações */}
      <div style={{ ...glass, marginTop: 16 }}>
        <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 12px' }}>Ações</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {susp ? (
            <button disabled={ocupado} onClick={() => acao({ acao: 'reativar' })}
              style={btn(C.good)}>Reativar usuário</button>
          ) : (
            <button disabled={ocupado} onClick={() => acao({ acao: 'suspender' }, 'Suspender este usuário? Ele não conseguirá acessar até ser reativado.')}
              style={btn(C.warn)}>Suspender usuário</button>
          )}

          <button disabled={ocupado} onClick={() => acao({ acao: 'reset_senha', email: p?.email }, 'Enviar e-mail de redefinição de senha para ' + (p?.email || '') + '?')}
            style={btn(C.sleep)}>Enviar redefinição de senha</button>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', color: C.t1, fontFamily: JAKARTA, fontSize: 13 }}>
              <option value="cliente">Atleta</option>
              <option value="personal">Personal</option>
              <option value="nutricionista">Nutricionista</option>
            </select>
            <button disabled={ocupado || novoTipo === tipo} onClick={() => acao({ acao: 'mudar_perfil', tipo: novoTipo }, `Alterar o perfil deste usuário para "${rotuloTipo[novoTipo]}"?`)}
              style={btn(C.energy)}>Alterar perfil</button>
          </div>
        </div>
        <p style={{ color: C.t3, fontSize: 11, marginTop: 12 }}>Toda ação fica registrada no log de auditoria.</p>
      </div>
    </div>
  )
}

function btn(cor: string): React.CSSProperties {
  return {
    background: 'transparent', border: `1px solid ${cor}`, color: cor, fontWeight: 600,
    fontFamily: JAKARTA, fontSize: 13, padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
  }
}
