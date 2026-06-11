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
const rotObjetivo: Record<string, string> = {
  perda_peso: 'Perda de peso', ganho_massa: 'Ganho de massa', manutencao: 'Manutenção', performance: 'Performance',
}

type Template = { id: string; nome: string; objetivo: string; publico: boolean; criado_por: string | null; created_at: string }

export default function ConteudoPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const d = await adminFetch<{ templates: Template[] }>('/api/admin/conteudo')
      setTemplates(d.templates)
    } catch (e: any) { setErro(e.message) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function acao(corpo: any, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return
    setOcupado(true); setErro(''); setMsg('')
    try {
      const r = await adminPost<{ resultado: string }>('/api/admin/conteudo', corpo)
      setMsg(r.resultado); await carregar()
    } catch (e: any) { setErro(e.message) } finally { setOcupado(false) }
  }

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 860, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Biblioteca</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 4px' }}>Conteúdo</h1>
      <p style={{ color: C.t3, fontSize: 13, margin: '0 0 20px' }}>Templates de plano alimentar disponíveis na plataforma.</p>

      {(msg || erro) && (
        <div style={{ ...glass, padding: '10px 16px', marginBottom: 16, borderColor: erro ? 'rgba(251,113,133,0.4)' : 'rgba(45,212,167,0.4)', color: erro ? C.danger : C.good }}>
          {erro || msg}
        </div>
      )}

      {templates.length === 0 && !erro && <p style={{ color: C.t3 }}>Carregando…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map((t) => (
          <div key={t.id} style={{ ...glass, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: C.t1, fontWeight: 600, fontSize: 14, margin: 0 }}>{t.nome}</p>
              <p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>
                {rotObjetivo[t.objetivo] || t.objetivo}{t.criado_por ? ' · criado por nutri' : ' · padrão KORE'}
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: t.publico ? C.good : C.t3 }}>
              {t.publico ? 'Público' : 'Oculto'}
            </span>
            <button disabled={ocupado} onClick={() => acao({ acao: 'toggle_publico', id: t.id, publico: !t.publico })} style={mini(C.sleep)}>
              {t.publico ? 'Despublicar' : 'Publicar'}
            </button>
            <button disabled={ocupado} onClick={() => acao({ acao: 'excluir', id: t.id }, `Excluir o template "${t.nome}"?`)} style={mini(C.danger)}>
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function mini(cor: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${cor}`, color: cor, fontWeight: 600, fontFamily: JAKARTA, fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }
}
