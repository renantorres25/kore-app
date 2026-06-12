'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '../../lib/adminFetch'

const C = {
  energy: '#FF5A36', good: '#2DD4A7', sleep: '#60A5FA',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"

type Usuario = { id: string; nome: string | null; email: string | null; tipo: string | null }

const corTipo: Record<string, string> = { cliente: '#FF5A36', personal: '#60A5FA', nutricionista: '#2DD4A7' }
const rotuloTipo: Record<string, string> = { cliente: 'Atleta', personal: 'Personal', nutricionista: 'Nutricionista' }

function iniciais(nome: string | null) {
  if (!nome) return '?'
  const p = nome.trim().split(' ')
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0][0]).toUpperCase()
}

export default function UsuariosPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const LIMITE = 25
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (tipo) params.set('tipo', tipo)
      params.set('limit', String(LIMITE))
      params.set('offset', String(offset))
      const data = await adminFetch<{ usuarios: Usuario[]; total: number }>(`/api/admin/usuarios?${params.toString()}`)
      setUsuarios(data.usuarios)
      setTotal(data.total)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [q, tipo, offset])

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [carregar])

  useEffect(() => { setOffset(0) }, [q, tipo])

  const filtros = [
    { label: 'Todos', val: '' },
    { label: 'Atletas', val: 'cliente' },
    { label: 'Personais', val: 'personal' },
    { label: 'Nutris', val: 'nutricionista' },
  ]

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 980 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Gestão</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, color: C.t1, margin: '4px 0 4px' }}>Usuários</h1>
      <p style={{ color: C.t3, fontSize: 13, margin: '0 0 20px' }}>{total.toLocaleString('pt-BR')} no total</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', color: C.t1, fontFamily: JAKARTA, fontSize: 14, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {filtros.map((f) => (
            <button key={f.val} onClick={() => setTipo(f.val)}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: JAKARTA, fontSize: 13,
                background: tipo === f.val ? 'rgba(255,90,54,0.15)' : 'transparent',
                color: tipo === f.val ? C.energy : C.t2, fontWeight: tipo === f.val ? 700 : 500 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {erro && <div style={{ color: '#F87171', marginBottom: 14 }}>{erro}</div>}
      {carregando && <p style={{ color: C.t2 }}>Carregando…</p>}

      {!carregando && usuarios.length === 0 && !erro && (
        <p style={{ color: C.t3 }}>Nenhum usuário encontrado.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {usuarios.map((u) => (
          <div key={u.id} onClick={() => router.push(`/admin/usuarios/${u.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: corTipo[u.tipo || ''] || C.t2, fontWeight: 700, fontSize: 13 }}>
              {iniciais(u.nome)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: C.t1, fontWeight: 600, fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nome || 'Sem nome'}</p>
              <p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email || '—'}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: corTipo[u.tipo || ''] || C.t2 }}>
              {rotuloTipo[u.tipo || ''] || u.tipo || '—'}
            </span>
          </div>
        ))}
      </div>

      {total > LIMITE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ color: C.t3, fontSize: 12 }}>
            {Math.min(offset + 1, total)}–{Math.min(offset + LIMITE, total)} de {total.toLocaleString('pt-BR')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMITE))} style={pag(offset === 0)}>Anterior</button>
            <button disabled={offset + LIMITE >= total} onClick={() => setOffset(offset + LIMITE)} style={pag(offset + LIMITE >= total)}>Próximo</button>
          </div>
        </div>
      )}
    </div>
  )
}

function pag(disabled: boolean): React.CSSProperties {
  return { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: disabled ? '#555555' : '#9AA0AD', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 13, padding: '7px 14px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer' }
}
