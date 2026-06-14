'use client'

import { X, Mail, MessageCircle, GraduationCap } from 'lucide-react'

/* Design System: Energetic Precision (mesmos tokens de app/perfil/page.tsx) */
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

const sectionTitle: React.CSSProperties = {
  color: C.t3, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14,
}

function InstagramIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export type ProfissionalEquipe = {
  tipo: string
  nome: string | null
  email: string
  whatsapp: string | null
  especialidade: string | null
  registro_profissional: string | null
  avatar_url: string | null
  foto_url: string | null
  instagram: string | null
  formacao: string | null
  modalidades: string[] | null
}

export default function ModalPerfilProfissional({ prof, onClose, isDesktop, emailUsuario }: {
  prof: ProfissionalEquipe | null
  onClose: () => void
  isDesktop: boolean
  emailUsuario?: string
}) {
  if (!prof) return null

  const label = prof.tipo === 'personal' ? 'Personal Trainer' : 'Nutricionista Esportivo'
  const profIniciais = (prof.nome || prof.email || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const fotoUrl = prof.avatar_url || prof.foto_url
  const whatsappDigitos = prof.whatsapp?.replace(/\D/g, '')
  const whatsappLink = whatsappDigitos ? `https://wa.me/55${whatsappDigitos}` : null
  const instagramHandle = prof.instagram?.replace(/^@/, '').trim()
  const instagramLink = instagramHandle ? `https://instagram.com/${instagramHandle}` : null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
      display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center',
      animation: 'fadeIn .15s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glass, maxWidth: 440, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        borderRadius: isDesktop ? 20 : '20px 20px 0 0',
        animation: isDesktop ? 'scaleIn .18s ease' : 'slideUp .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
          <button onClick={onClose} aria-label="Fechar"
            style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', color: C.t2 }}>
            <X size={16} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
            {fotoUrl ? (
              <img src={fotoUrl} alt={prof.nome || ''} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 26, color: C.t2, marginBottom: 8 }}>
                {profIniciais}
              </div>
            )}
            <p style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, color: C.t1 }}>{prof.nome || 'Profissional'}</p>
            <p style={{ color: C.energy2, fontSize: 13, fontWeight: 700 }}>{label}</p>
            {prof.registro_profissional && (
              <p style={{ color: C.t3, fontSize: 12 }}>{prof.registro_profissional}</p>
            )}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: '24px' }}>
          {/* Contato */}
          <p style={sectionTitle}>Contato</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  textAlign: 'center', padding: '14px 0', borderRadius: 14,
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none',
                  background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
                  boxShadow: '0 10px 30px rgba(255,90,54,0.35), 0 0 0 1px rgba(255,90,54,0.2)',
                }}>
                <MessageCircle size={16} />
                Chamar no WhatsApp
              </a>
            ) : (
              <p style={{ color: C.t3, fontSize: 12 }}>Sem WhatsApp cadastrado</p>
            )}
            {instagramLink && (
              <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="kore-contact-link"
                style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.t1, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                <InstagramIcon size={16} color={C.t2} />
                @{instagramHandle}
              </a>
            )}
            {prof.email && prof.email !== emailUsuario && (
              <a href={`mailto:${prof.email}`} className="kore-contact-link"
                style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.t1, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                <Mail size={16} color={C.t2} />
                {prof.email}
              </a>
            )}
          </div>

          {/* Formação */}
          {(prof.formacao || (prof.modalidades && prof.modalidades.length > 0)) && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={sectionTitle}>Formação</p>
              {prof.formacao && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: prof.modalidades?.length ? 14 : 0 }}>
                  <GraduationCap size={16} color={C.t2} style={{ marginTop: 2, flexShrink: 0 }} />
                  <p style={{ color: C.t1, fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{prof.formacao}</p>
                </div>
              )}
              {prof.modalidades && prof.modalidades.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {prof.modalidades.map(m => (
                    <span key={m} style={{ fontSize: 11, color: C.t2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 999, padding: '4px 12px' }}>{m}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <style>{`
          .kore-contact-link:hover{color:${C.t1} !important; text-decoration: underline}
        `}</style>

        {/* Footer */}
        <div style={{ padding: '0 24px 24px' }}>
          <button onClick={onClose}
            style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.t2, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer' }}>
            Fechar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
