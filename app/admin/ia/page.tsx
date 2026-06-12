'use client'

import { useState } from 'react'
import { adminPost } from '../../lib/adminFetch'

const C = {
  energy: '#FF5A36', energy2: '#FF8A3D', good: '#2DD4A7', sleep: '#60A5FA',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290', danger: '#FB7185',
}
const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16, padding: 18,
}

const EXEMPLOS = [
  'Quantos atletas temos e qual a proporção por perfil?',
  'Qual o MRR atual e quantas assinaturas ativas?',
  'Quantos vínculos (triângulos) existem hoje?',
  'Há tickets de SAC abertos?',
]

export default function IaPage() {
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function perguntar(p?: string) {
    const q = (p ?? pergunta).trim()
    if (!q) return
    if (p) setPergunta(p)
    setCarregando(true); setErro(''); setResposta('')
    try {
      const r = await adminPost<{ resposta: string }>('/api/admin/ia', { pergunta: q })
      setResposta(r.resposta)
    } catch (e: any) { setErro(e.message) } finally { setCarregando(false) }
  }

  return (
    <div style={{ fontFamily: JAKARTA, maxWidth: 760, color: C.t1 }}>
      <p style={{ color: C.energy, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, margin: 0 }}>Inteligência</p>
      <h1 style={{ fontFamily: SORA, fontSize: 30, fontWeight: 800, margin: '4px 0 6px' }}>Pergunte aos dados</h1>
      <p style={{ color: C.t3, fontSize: 13, margin: '0 0 20px' }}>Faça uma pergunta em linguagem natural. A IA responde com base nos números reais da plataforma.</p>

      <div style={{ ...glass, marginBottom: 16 }}>
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) perguntar() }}
          placeholder="Ex.: Quantos atletas estão sem registro de sono?"
          rows={3}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px', color: C.t1, fontFamily: JAKARTA, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button disabled={carregando || !pergunta.trim()} onClick={() => perguntar()}
            style={{ background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', fontWeight: 700, fontFamily: JAKARTA, fontSize: 14, border: 'none', borderRadius: 12, padding: '10px 22px', cursor: carregando ? 'default' : 'pointer', opacity: carregando ? 0.6 : 1 }}>
            {carregando ? 'Pensando…' : 'Perguntar'}
          </button>
        </div>
      </div>

      {erro && <div style={{ ...glass, color: C.danger, marginBottom: 16 }}>{erro}</div>}

      {resposta && (
        <div style={{ ...glass, marginBottom: 16, borderColor: 'rgba(255,90,54,0.3)' }}>
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '0 0 8px' }}>Resposta</p>
          <p style={{ color: C.t1, fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{resposta}</p>
        </div>
      )}

      <p style={{ color: C.t3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, margin: '8px 0 8px' }}>Exemplos</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {EXEMPLOS.map((ex) => (
          <button key={ex} disabled={carregando} onClick={() => perguntar(ex)}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: C.t2, fontFamily: JAKARTA, fontSize: 12.5, padding: '8px 12px', borderRadius: 20, cursor: 'pointer' }}>
            {ex}
          </button>
        ))}
      </div>

      <p style={{ color: C.t3, fontSize: 11, marginTop: 18 }}>A IA vê apenas um resumo agregado dos números — não tem acesso a dados individuais de usuários.</p>
    </div>
  )
}
