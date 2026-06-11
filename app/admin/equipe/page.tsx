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
const PAPEIS = [
  { val: 'super_admin', label: 'Super-admin' },
  { val: 'admin', label: 'Admin' },
  { val: 'financeiro', label: 'Financeiro' },
  { val: 'sac', label: 'SAC' },
  { val: 'analista', label: 'Analista' },
]
const rotPapel: Record<string, string> = Object.fromEntries(PAPEIS.map((p) => [p.val, p.label]))

type Admin = { id: string; user_id: string; papel: string; ativo: boolean; nome: string | null; email: string | null }

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  padding: '9px 12px', color: C.t1, fontFamily: JAKARTA, fontSize: 13, outline: 'none',
}

export default function EquipePage() {
  const [equipe, setEquipe] = useState<Admin[]>([])
  const [eu, setEu] = useState('')
  const [souSuper, setSouSuper] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPapel, setNovoPapel] = useState('admin')
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const d = await adminFetch<{ equipe: Admin[]; eu: string; souSuperAdmin: boolean }>('/api/admin/equipe')
      setEquipe(d.equipe); setEu(d.eu); setSouSuper(d.souSuperAdmin)
    } catch (e: any) { setErro(e.message) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function acao(corpo: any) {
    setOcupado(true); setErro(''); setMsg('')
    try {
      const r = await adminPost<{ resultado: string }>('/api/admin/equipe', corpo)
      setMsg(r.resultado); await carregar()
    } catch (e: any) { setErro(e.message) } finally { setOcupado(false) }
  }

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 820, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Acessos</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 18px' }}>Equipe admin</h1>

      {(msg || erro) && (
        <div style={{ ...glass, padding: '10px 16px', marginBottom: 16, borderColor: erro ? 'rgba(251,113,133,0.4)' : 'rgba(45,212,167,0.4)', color: erro ? C.danger : C.good }}>
          {erro || msg}
        </div>
      )}

      {souSuper && (
        <div style={{ ...glass, marginBottom: 18 }}>
          <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 10px' }}>Adicionar admin</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="e-mail do usuário do KORE" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
            <select value={novoPapel} onChange={(e) => setNovoPapel(e.target.value)} style={inputStyle}>
              {PAPEIS.map((p) => <option key={p.val} value={p.val}>{p.label}</option>)}
            </select>
            <button disabled={ocupado || !novoEmail} onClick={() => acao({ acao: 'adicionar', email: novoEmail, papel: novoPapel })}
              style={{ background: `linear-gradient(135deg, ${C.energy}, #FF8A3D)`, color: '#fff', fontWeight: 700, fontFamily: JAKARTA, fontSize: 13, border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}>
              Adicionar
            </button>
          </div>
          <p style={{ color: C.t3, fontSize: 11, marginTop: 8 }}>A pessoa precisa já ter conta no KORE (o e-mail é buscado em perfis).</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {equipe.map((a) => {
          const souEu = a.user_id === eu
          return (
            <div key={a.id} style={{ ...glass, display: 'flex', alignItems: 'center', gap: 12, opacity: a.ativo ? 1 : 0.55 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: C.t1, fontWeight: 600, fontSize: 14, margin: 0 }}>
                  {a.nome || 'Sem nome'}{souEu && <span style={{ color: C.energy, fontSize: 11, fontWeight: 700 }}> · você</span>}
                </p>
                <p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>{a.email || a.user_id}</p>
              </div>
              {souSuper && !souEu ? (
                <select value={a.papel} onChange={(e) => acao({ acao: 'mudar_papel', user_id: a.user_id, papel: e.target.value })} style={inputStyle}>
                  {PAPEIS.map((p) => <option key={p.val} value={p.val}>{p.label}</option>)}
                </select>
              ) : (
                <span style={{ color: C.t2, fontSize: 13, fontWeight: 600 }}>{rotPapel[a.papel] || a.papel}</span>
              )}
              {!a.ativo && <span style={{ color: C.danger, fontSize: 11, fontWeight: 700 }}>INATIVO</span>}
              {souSuper && !souEu && (
                a.ativo
                  ? <button disabled={ocupado} onClick={() => acao({ acao: 'desativar', user_id: a.user_id })} style={mini(C.warn)}>Desativar</button>
                  : <button disabled={ocupado} onClick={() => acao({ acao: 'ativar', user_id: a.user_id })} style={mini(C.good)}>Reativar</button>
              )}
            </div>
          )
        })}
      </div>

      {!souSuper && <p style={{ color: C.t3, fontSize: 12, marginTop: 14 }}>Apenas super-admin pode adicionar ou alterar membros da equipe.</p>}
    </div>
  )
}

function mini(cor: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${cor}`, color: cor, fontWeight: 600, fontFamily: JAKARTA, fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }
}
