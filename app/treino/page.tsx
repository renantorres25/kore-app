'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { atualizarDecisaoDia } from '../lib/atualizarDecisaoDia'
import QuizIA, { RespostasQuiz } from '../components/QuizIA'
import SidebarProfissional from '../components/SidebarProfissional'

type Exercicio = { id: string; nome: string; series: number; repeticoes: number; carga_sugerida: number | null; observacoes: string; ordem: number }
type Treino = { id: string; nome: string; descricao: string | null; plano: string; personal_id?: string | null; exercicios: Exercicio[] }
type SerieRegistrada = { exercicio_id: string; numero_serie: number; carga: number | null; repeticoes: number; concluida: boolean }
type BlocoAtual = { nome: string; tipo: string; semanaNoBloco: number; totalSemanas: number; descricao: string | null; semanaGlobal: number; totalSemanasCiclo: number; ciclonome: string }
type Modalidade = 'musculacao' | 'corrida' | 'bike' | 'natacao' | 'crossfit' | 'outro'

/* ─────────────────────────────────────────────────────────
   DESIGN SYSTEM · ENERGETIC PRECISION
   ───────────────────────────────────────────────────────── */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}

const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

const glassSubtle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 12,
  padding: '12px 14px',
  color: C.t1,
  fontSize: 14,
  fontFamily: FONT_MONO,
  fontVariantNumeric: 'tabular-nums',
  outline: 'none',
}

const labelStyle: React.CSSProperties = { color: C.t3, fontSize: 10, marginBottom: 6, display: 'block', fontFamily: FONT_BODY }

const dataNum = (color = C.t1): React.CSSProperties => ({ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', color })

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c(); window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

const MET: Record<Modalidade, number> = { musculacao: 4.5, corrida: 8.0, bike: 6.0, natacao: 7.0, crossfit: 8.5, outro: 5.0 }

function estimarCalorias(modalidade: Modalidade, duracaoMin: number, pesoKg: number): number {
  return Math.round(MET[modalidade] * pesoKg * (duracaoMin / 60))
}

function calcularPace(duracaoMin: number, distanciaKm: number): string {
  if (!duracaoMin || !distanciaKm || distanciaKm === 0) return ''
  const paceTotal = duracaoMin / distanciaKm
  const min = Math.floor(paceTotal)
  const seg = Math.round((paceTotal - min) * 60)
  return `${min}:${seg.toString().padStart(2, '0')}`
}

function calcularPaceNatacao(duracaoMin: number, distanciaM: number): string {
  if (!duracaoMin || !distanciaM || distanciaM === 0) return ''
  const pacePor100 = (duracaoMin / distanciaM) * 100
  const min = Math.floor(pacePor100)
  const seg = Math.round((pacePor100 - min) * 60)
  return `${min}:${seg.toString().padStart(2, '0')}`
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function calcVolume(series: Record<string, SerieRegistrada[]>): number {
  return Object.values(series).flat().filter(s => s.concluida && s.carga).reduce((a, s) => a + (s.carga! * s.repeticoes), 0)
}

const MODALIDADES = [
  { id: 'musculacao' as Modalidade, label: 'Musculação', hex: C.good },
  { id: 'corrida'    as Modalidade, label: 'Corrida',    hex: C.sleep },
  { id: 'bike'       as Modalidade, label: 'Bike',       hex: C.energy2 },
  { id: 'natacao'    as Modalidade, label: 'Natação',    hex: '#22D3EE' },
  { id: 'crossfit'   as Modalidade, label: 'Crossfit',   hex: C.warn },
  { id: 'outro'      as Modalidade, label: 'Outro',      hex: C.recovery },
]

const CORES_PLANO: Record<string, { hex: string }> = {
  A: { hex: C.good },
  B: { hex: C.sleep },
  C: { hex: C.energy },
}

const ZONAS_FC = [
  { valor: 'Z1', label: 'Z1 — Recuperação ativa', desc: '< 65% FCmax', hex: C.sleep },
  { valor: 'Z2', label: 'Z2 — Base aeróbica',     desc: '65–75% FCmax', hex: C.good },
  { valor: 'Z3', label: 'Z3 — Tempo',              desc: '75–85% FCmax', hex: C.warn },
  { valor: 'Z4', label: 'Z4 — Limiar',             desc: '85–92% FCmax', hex: C.energy2 },
  { valor: 'Z5', label: 'Z5 — VO2max',             desc: '> 92% FCmax',  hex: C.energy },
  { valor: 'misto', label: 'Misto',                desc: 'Várias zonas', hex: C.recovery },
]

const TIPO_BLOCO: Record<string, { hex: string }> = {
  adaptacao:  { hex: C.good },
  hipertrofia:{ hex: C.sleep },
  forca:      { hex: C.recovery },
  deload:     { hex: C.t2 },
  potencia:   { hex: C.energy },
  resistencia:{ hex: '#22D3EE' },
}

/* helpers de cor com alpha */
const alpha = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const sectionTitle = (hex: string): React.CSSProperties => ({
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: hex,
  marginBottom: 16, fontFamily: FONT_BODY, fontWeight: 700,
})

/* ─────────────────────────────────────────────────────────
   FORMULÁRIOS POR MODALIDADE
   ───────────────────────────────────────────────────────── */
function Field({ label, ...props }: any) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input {...props} style={inputStyle} />
    </div>
  )
}

function FormCorrida({ form, setForm, mod, calsPreview, duracaoAtual }: any) {
  const pace = calcularPace(duracaoAtual, parseFloat(form.distancia_km ?? '0'))
  return (
    <>
      <div style={{ ...glass, padding: 20 }}>
        <p style={sectionTitle(mod.hex)}>Percurso</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Distância (km)" type="number" step="0.1" placeholder="Ex: 10.5" value={form.distancia_km ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, distancia_km: e.target.value }))} />
            <Field label="Elevação (m)" type="number" placeholder="Ex: 150" value={form.elevacao ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, elevacao: e.target.value }))} />
          </div>
          {pace && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: alpha(mod.hex, 0.08), border: `1px solid ${alpha(mod.hex, 0.25)}`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ ...dataNum(mod.hex), fontSize: 14, fontWeight: 700 }}>Pace: {pace} min/km</p>
              <p style={{ color: C.t3, fontSize: 11, marginLeft: 'auto', fontFamily: FONT_BODY }}>automático</p>
            </div>
          )}
        </div>
      </div>
      <ZonaFC form={form} setForm={setForm} mod={mod} legenda="Zona predominante do treino — fundamental para análise da carga" />
      <div style={{ ...glass, padding: 20 }}>
        <p style={sectionTitle(mod.hex)}>Métricas</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="FC média (bpm)" type="number" placeholder="Ex: 155" value={form.fc_media ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, fc_media: e.target.value }))} />
            <Field label="FC máxima (bpm)" type="number" placeholder="Ex: 178" value={form.fc_max ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, fc_max: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cadência (ppm)" type="number" placeholder="Ex: 172" value={form.cadencia ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, cadencia: e.target.value }))} />
            <Field label="Calorias (wearable)" type="number" placeholder="Ex: 850" value={form.calorias_wearable ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, calorias_wearable: e.target.value }))} />
          </div>
        </div>
        {!form.calorias_wearable && calsPreview && <p style={{ color: C.t3, fontSize: 10, marginTop: 8, fontFamily: FONT_BODY }}>Estimativa sem wearable: ~{calsPreview} kcal</p>}
      </div>
    </>
  )
}

function FormBike({ form, setForm, mod, calsPreview, duracaoAtual }: any) {
  const velMedia = form.distancia_km && duracaoAtual ? Math.round((parseFloat(form.distancia_km) / (duracaoAtual / 60)) * 10) / 10 : null
  return (
    <>
      <div style={{ ...glass, padding: 20 }}>
        <p style={sectionTitle(mod.hex)}>Percurso</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Distância (km)" type="number" step="0.1" placeholder="Ex: 40" value={form.distancia_km ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, distancia_km: e.target.value }))} />
            <Field label="Elevação (m)" type="number" placeholder="Ex: 650" value={form.elevacao ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, elevacao: e.target.value }))} />
          </div>
          {velMedia && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: alpha(mod.hex, 0.08), border: `1px solid ${alpha(mod.hex, 0.25)}`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ ...dataNum(mod.hex), fontSize: 14, fontWeight: 700 }}>Velocidade média: {velMedia} km/h</p>
            </div>
          )}
        </div>
      </div>
      <ZonaFC form={form} setForm={setForm} mod={mod} legenda="Zona predominante — define se foi treino base ou intenso" />
      <div style={{ ...glass, padding: 20 }}>
        <p style={sectionTitle(mod.hex)}>Métricas</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Potência média (W)" type="number" placeholder="Ex: 180" value={form.potencia_media ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, potencia_media: e.target.value }))} />
            <Field label="Potência máx (W)" type="number" placeholder="Ex: 320" value={form.potencia_max ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, potencia_max: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="FC média (bpm)" type="number" placeholder="Ex: 148" value={form.fc_media ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, fc_media: e.target.value }))} />
            <Field label="Cadência (rpm)" type="number" placeholder="Ex: 88" value={form.cadencia ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, cadencia: e.target.value }))} />
          </div>
          <Field label="Calorias (wearable)" type="number" placeholder="Ex: 1200" value={form.calorias_wearable ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, calorias_wearable: e.target.value }))} />
        </div>
        {!form.calorias_wearable && calsPreview && <p style={{ color: C.t3, fontSize: 10, marginTop: 8, fontFamily: FONT_BODY }}>Estimativa sem wearable: ~{calsPreview} kcal</p>}
      </div>
    </>
  )
}

function FormNatacao({ form, setForm, mod, calsPreview, duracaoAtual }: any) {
  const paceNat = calcularPaceNatacao(duracaoAtual, parseInt(form.distancia_m ?? '0'))
  return (
    <>
      <div style={{ ...glass, padding: 20 }}>
        <p style={sectionTitle(mod.hex)}>Volume</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Distância (m)" type="number" placeholder="Ex: 2000" value={form.distancia_m ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, distancia_m: e.target.value }))} />
            <Field label="Voltas (25m)" type="number" placeholder="Ex: 80" value={form.voltas ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, voltas: e.target.value }))} />
          </div>
          {paceNat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: alpha(mod.hex, 0.08), border: `1px solid ${alpha(mod.hex, 0.25)}`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ ...dataNum(mod.hex), fontSize: 14, fontWeight: 700 }}>Pace: {paceNat} /100m</p>
            </div>
          )}
          <div>
            <label style={{ ...labelStyle, marginBottom: 12 }}>Estilo predominante</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['Livre', 'Costas', 'Peito', 'Borboleta', 'Medley', 'Misto'].map(e => {
                const on = form.estilo === e
                return (
                  <button key={e} onClick={() => setForm((p: any) => ({ ...p, estilo: e }))}
                    style={{ padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, transition: 'all .15s', cursor: 'pointer',
                      background: on ? alpha(mod.hex, 0.12) : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${on ? alpha(mod.hex, 0.4) : 'rgba(255,255,255,0.12)'}`,
                      color: on ? mod.hex : C.t3 }}>{e}</button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ ...glass, padding: 20 }}>
        <p style={sectionTitle(mod.hex)}>Métricas</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="FC pós-treino (bpm)" type="number" placeholder="Ex: 145" value={form.fc_media ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, fc_media: e.target.value }))} />
          <Field label="Calorias (wearable)" type="number" placeholder="Ex: 600" value={form.calorias_wearable ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, calorias_wearable: e.target.value }))} />
        </div>
        {!form.calorias_wearable && calsPreview && <p style={{ color: C.t3, fontSize: 10, marginTop: 8, fontFamily: FONT_BODY }}>Estimativa sem wearable: ~{calsPreview} kcal</p>}
      </div>
    </>
  )
}

function FormCrossfit({ form, setForm, mod, calsPreview }: any) {
  return (
    <div style={{ ...glass, padding: 20 }}>
      <p style={sectionTitle(mod.hex)}>WOD</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ ...labelStyle, marginBottom: 8 }}>Tipo do WOD</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['AMRAP', 'For Time', 'EMOM', 'Tabata', 'Chipper', 'Strength'].map(t => {
              const on = form.tipo_wod === t
              return (
                <button key={t} onClick={() => setForm((p: any) => ({ ...p, tipo_wod: t }))}
                  style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY, cursor: 'pointer', transition: 'all .15s',
                    background: on ? alpha(mod.hex, 0.12) : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${on ? alpha(mod.hex, 0.4) : 'rgba(255,255,255,0.12)'}`,
                    color: on ? mod.hex : C.t3 }}>{t}</button>
              )
            })}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Movimentos e cargas</label>
          <textarea placeholder="Ex: 21-15-9 Thrusters 42kg + Pull-ups" value={form.movimentos ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, movimentos: e.target.value }))} rows={2} style={{ ...inputStyle, fontFamily: FONT_BODY, resize: 'none' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Resultado / Score" type="text" placeholder="Ex: 8rds+5 / 12:34" value={form.resultado ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, resultado: e.target.value }))} />
          <Field label="Calorias (wearable)" type="number" placeholder="Ex: 500" value={form.calorias_wearable ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, calorias_wearable: e.target.value }))} />
        </div>
        {!form.calorias_wearable && calsPreview && <p style={{ color: C.t3, fontSize: 10, fontFamily: FONT_BODY }}>Estimativa sem wearable: ~{calsPreview} kcal</p>}
      </div>
    </div>
  )
}

function ZonaFC({ form, setForm, mod, legenda }: any) {
  return (
    <div style={{ ...glass, padding: 20 }}>
      <p style={{ ...sectionTitle(mod.hex), marginBottom: 4 }}>Zona de frequência cardíaca</p>
      <p style={{ color: C.t3, fontSize: 12, marginBottom: 16, fontFamily: FONT_BODY }}>{legenda}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ZONAS_FC.map(z => {
          const on = form.zona_fc === z.valor
          return (
            <button key={z.valor} onClick={() => setForm((p: any) => ({ ...p, zona_fc: z.valor }))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 12, borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all .15s',
                background: on ? alpha(z.hex, 0.15) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${on ? alpha(z.hex, 0.4) : 'rgba(255,255,255,0.11)'}`,
                color: on ? z.hex : C.t3 }}>
              <span style={{ fontSize: 12, fontWeight: 800, fontFamily: FONT_BODY }}>{z.label}</span>
              <span style={{ fontSize: 9, opacity: 0.7, marginTop: 2, fontFamily: FONT_MONO }}>{z.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   PÁGINA PRINCIPAL
   ───────────────────────────────────────────────────────── */
export default function TreinoCliente() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState<string | null>(null)
  const [treinosConcluidosHoje, setTreinosConcluidosHoje] = useState<Set<string>>(new Set())
  const [temPersonal, setTemPersonal] = useState(false)
  const [mostrarQuiz, setMostrarQuiz] = useState(false)
  const [em, setEm] = useState<Treino | null>(null)
  const [series, setSeries] = useState<Record<string, SerieRegistrada[]>>({})
  const [concluido, setConcluido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [analise, setAnalise] = useState({ texto: '', carregando: false })
  const [tela, setTela] = useState<'principal' | 'formulario' | 'conclusao_livre' | 'executando_musculacao' | 'conclusao_musculacao' | 'gerando_plano_ia'>('principal')
  const [modalidade, setModalidade] = useState<Modalidade | null>(null)
  const [form, setForm] = useState<Record<string, any>>({ intensidade: 3 })
  const [analiseLivre, setAnaliseLivre] = useState({ texto: '', carregando: false })
  const [salvandoLivre, setSalvandoLivre] = useState(false)
  const [caloriasEstimadas, setCaloriasEstimadas] = useState<number | null>(null)
  const [gerandoMensagem, setGerandoMensagem] = useState(0)
  const [perfilUsuario, setPerfilUsuario] = useState<{ peso: number | null; objetivo: string | null; nivel: string | null; nome: string | null }>({ peso: null, objetivo: null, nivel: null, nome: null })
  const [userId, setUserId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [score, setScore] = useState<number | null>(null)
  const [pesoKg, setPesoKg] = useState<number>(70)
  const [blocoAtual, setBlocoAtual] = useState<BlocoAtual | null>(null)

  const MENSAGENS_GERANDO = [
    'Analisando seu perfil e histórico...',
    'Selecionando exercícios ideais para seu objetivo...',
    'Calculando séries, repetições e cargas...',
    'Estruturando a periodização dos planos...',
    'Finalizando e salvando seus planos...',
  ]

  useEffect(() => { carregar() }, [])
  useEffect(() => {
    async function verificarHoje() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('treinos').select('plano').eq('cliente_id', session.user.id).eq('concluido', true).eq('data', getTodayBR())
      if (data) setTreinosConcluidosHoje(new Set(data.map((t: any) => t.plano)))
    }
    verificarHoje()
  }, [concluido])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUserId(session.user.id)
    const hoje = getTodayBR()
    const [{ data: sono }, { data: perfil }, { data: td }, { data: vinculo }] = await Promise.all([
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('perfis').select('peso, objetivo, nivel, nome').eq('id', session.user.id).single(),
      supabase.from('treinos').select('id, nome, descricao, plano, personal_id').eq('cliente_id', session.user.id).eq('status', 'pendente').eq('concluido', false).order('plano'),
      supabase.from('vinculos').select('id').eq('cliente_id', session.user.id).eq('tipo', 'personal').eq('ativo', true).single(),
    ])
    if (sono?.score_recuperacao) setScore(sono.score_recuperacao)
    if (perfil?.peso) setPesoKg(perfil.peso)
    if (perfil) setPerfilUsuario(perfil)
    if (vinculo) setTemPersonal(true)
    if (td?.length) {
      const ids = td.map((t: any) => t.id)
      const { data: ex } = await supabase.from('exercicios_treino').select('*').in('treino_id', ids).order('ordem')
      const completos: Treino[] = td.map((t: any) => ({ ...t, exercicios: ex?.filter((e: any) => e.treino_id === t.id) ?? [] }))
      setTreinos(completos)
      if (completos.length) setPlanoAtivo(completos[0].plano)
    }
    // Periodização: fase atual do cliente
    const { data: perData } = await supabase
      .from('periodizacoes').select('id, nome, data_inicio')
      .eq('cliente_id', session.user.id).eq('status', 'ativo').single()
    if (perData) {
      const { data: blocos } = await supabase
        .from('blocos_periodizacao').select('nome, tipo, semanas, ordem, descricao')
        .eq('periodizacao_id', perData.id).order('ordem')
      if (blocos?.length) {
        const diasDecorridos = Math.floor((Date.now() - new Date(perData.data_inicio + 'T12:00:00-03:00').getTime()) / 86400000)
        const semG = Math.max(1, Math.floor(diasDecorridos / 7) + 1)
        const totalS = (blocos as any[]).reduce((s: number, b: any) => s + b.semanas, 0)
        let acum = 0
        for (const b of blocos as any[]) {
          acum += b.semanas
          if (semG <= acum) {
            setBlocoAtual({ nome: b.nome, tipo: b.tipo, semanaNoBloco: semG - (acum - b.semanas), totalSemanas: b.semanas, descricao: b.descricao, semanaGlobal: semG, totalSemanasCiclo: totalS, ciclonome: perData.nome })
            break
          }
        }
      }
    }
    setCarregando(false)
  }

  async function gerarPlanoComIA(respostas: RespostasQuiz) {
    setMostrarQuiz(false); setTela('gerando_plano_ia')
    let idx = 0
    const intervalo = setInterval(() => { idx++; if (idx < MENSAGENS_GERANDO.length) setGerandoMensagem(idx) }, 2500)
    const OBJETIVO_LABEL: Record<string, string> = { perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa', melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral' }
    const focoArr = Array.isArray(respostas.foco) ? respostas.foco.join(', ') : respostas.foco
    const limitacaoArr = Array.isArray(respostas.limitacao) ? respostas.limitacao.join(', ') : respostas.limitacao
    const prompt = `Você é um personal trainer especialista com 15 anos de experiência. Crie um plano de musculação completo, detalhado e personalizado.

PERFIL: ${perfilUsuario.nome ?? 'Atleta'} | ${OBJETIVO_LABEL[perfilUsuario.objetivo ?? ''] ?? 'Saúde geral'} | ${perfilUsuario.peso ? `${perfilUsuario.peso}kg` : '?'}

CONSULTA:
- Dias/semana: ${respostas.dias_semana} | Duração: ${respostas.duracao} | Período: ${respostas.periodo}
- Foco muscular: ${focoArr} | Experiência: ${respostas.experiencia}
- Limitações: ${limitacaoArr} | Objetivo: ${respostas.objetivo_treino}
- Observações: ${respostas.observacoes_treino ?? 'nenhuma'}

REGRAS: 2 planos (A e B), 5-7 exercícios cada, cargas realistas, respeitar limitações, observações técnicas por exercício.

Responda APENAS JSON válido:
{"planos":[{"plano":"A","nome":"...","descricao":"...","exercicios":[{"nome":"...","series":4,"repeticoes":10,"carga_sugerida":20,"observacoes":"...","ordem":1}]},{"plano":"B","nome":"...","descricao":"...","exercicios":[...]}]}`
    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, modo: 'plano' }) })
      const data = await res.json()
      const jsonMatch = (data.analise ?? '').match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const planoGerado = JSON.parse(jsonMatch[0])
      for (const p of planoGerado.planos) {
        const { data: treinoSalvo } = await supabase.from('treinos').insert({ personal_id: null, cliente_id: userId, nome: p.nome, descricao: p.descricao, plano: p.plano, status: 'pendente', concluido: false, data: null }).select('id').single()
        if (treinoSalvo && p.exercicios?.length) {
          await supabase.from('exercicios_treino').insert(p.exercicios.map((ex: any) => ({ treino_id: treinoSalvo.id, nome: ex.nome, series: ex.series, repeticoes: ex.repeticoes, carga_sugerida: ex.carga_sugerida ?? null, observacoes: ex.observacoes ?? '', ordem: ex.ordem })))
        }
      }
      await carregar()
    } catch (e) { console.error('Erro ao gerar plano:', e) }
    finally { clearInterval(intervalo); setTela('principal'); setGerandoMensagem(0) }
  }

  function iniciarMusculacao(treino: Treino) {
    const init: Record<string, SerieRegistrada[]> = {}
    treino.exercicios.forEach(ex => { init[ex.id] = Array.from({ length: ex.series }, (_, i) => ({ exercicio_id: ex.id, numero_serie: i + 1, carga: ex.carga_sugerida, repeticoes: ex.repeticoes, concluida: false })) })
    setSeries(init); setEm(treino); setConcluido(false); setAnalise({ texto: '', carregando: false }); setTela('executando_musculacao')
  }

  function toggle(exId: string, idx: number) { setSeries(p => { const n = [...(p[exId] ?? [])]; n[idx] = { ...n[idx], concluida: !n[idx].concluida }; return { ...p, [exId]: n } }) }
  function setCarga(exId: string, idx: number, v: number | null) { setSeries(p => { const n = [...(p[exId] ?? [])]; n[idx] = { ...n[idx], carga: v }; return { ...p, [exId]: n } }) }
  function setReps(exId: string, idx: number, v: number) { setSeries(p => { const n = [...(p[exId] ?? [])]; n[idx] = { ...n[idx], repeticoes: v }; return { ...p, [exId]: n } }) }
  const totalConcluidas = () => Object.values(series).flat().filter(s => s.concluida).length
  const totalSeries = () => Object.values(series).flat().length

  async function finalizarMusculacao() {
    if (!em) return
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const duracaoMin = form.duracao_musculacao ? parseInt(form.duracao_musculacao) : 60
    const cals = estimarCalorias('musculacao', duracaoMin, pesoKg)
    setCaloriasEstimadas(cals)
    const { data: reg } = await supabase.from('treinos').insert({ personal_id: em.personal_id ?? null, cliente_id: session.user.id, nome: em.nome, descricao: em.descricao, plano: em.plano, status: 'concluido', data: getTodayBR(), concluido: true, calorias_estimadas: cals }).select('id').single()
    if (reg) {
      const done = Object.values(series).flat().filter(s => s.concluida)
      if (done.length) await supabase.from('series_registradas').insert(done.map(s => ({ treino_id: reg.id, exercicio_id: s.exercicio_id, numero_serie: s.numero_serie, carga: s.carga, repeticoes: s.repeticoes })))
    }
    setSalvando(false); setConcluido(true); setTela('conclusao_musculacao')
    gerarIAMusculacao(em, series, duracaoMin, cals)
    atualizarDecisaoDia(userId) // ← atualiza decisão do dia em background
  }

  async function gerarIAMusculacao(treino: Treino, s: Record<string, SerieRegistrada[]>, duracaoMin: number, cals: number) {
    setAnalise({ texto: '', carregando: true })
    const vol = calcVolume(s)
    const tc = Object.values(s).flat().filter(x => x.concluida).length
    const tt = Object.values(s).flat().length
    const resumo = treino.exercicios.map(ex => { const done = s[ex.id]?.filter(x => x.concluida) ?? []; if (!done.length) return null; return `${ex.nome}: ${done.length} séries (${done.map(x => x.carga ? `${x.carga}kg` : 'sem carga').join(', ')})` }).filter(Boolean).join(', ')
    const prompt = `Coach KORE. Analise este treino de musculação.\n${treino.nome} | ${tc}/${tt} séries | Volume: ${vol > 0 ? `${vol}kg` : '?'} | ${duracaoMin}min | ~${cals}kcal | Recuperação: ${score ? `${score}/100` : '?'}\nExercícios: ${resumo || '?'}\n3 partes curtas (máx 80 palavras, sem markdown): Desempenho, Destaque, Próximo passo`
    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? '', carregando: false })
    } catch { setAnalise({ texto: 'Não foi possível gerar análise.', carregando: false }) }
  }

  function abrirFormulario(mod: Modalidade) {
    setModalidade(mod); setForm({ intensidade: 3 }); setAnaliseLivre({ texto: '', carregando: false }); setCaloriasEstimadas(null); setTela('formulario')
  }

  async function salvarAtividadeLivre() {
    setSalvandoLivre(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const duracaoMin = parseInt(form.duracao_min ?? '30') || 30
    const cals = form.calorias_wearable ? parseInt(form.calorias_wearable) : estimarCalorias(modalidade!, duracaoMin, pesoKg)
    const paceCalculado = calcularPace(duracaoMin, parseFloat(form.distancia_km ?? '0'))
    const paceNatCalculado = calcularPaceNatacao(duracaoMin, parseInt(form.distancia_m ?? '0'))
    setCaloriasEstimadas(cals)
    await supabase.from('atividades_livres').insert({
      usuario_id: session.user.id, data: getTodayBR(), modalidade,
      duracao_min: duracaoMin, intensidade: form.intensidade ?? 3,
      distancia_km: form.distancia_km ? parseFloat(form.distancia_km) : null,
      elevacao: form.elevacao ? parseInt(form.elevacao) : null,
      ritmo_medio: paceCalculado || null,
      zona_fc: form.zona_fc ?? null,
      fc_media: form.fc_media ? parseInt(form.fc_media) : null,
      fc_max: form.fc_max ? parseInt(form.fc_max) : null,
      cadencia: form.cadencia ? parseInt(form.cadencia) : null,
      potencia_media: form.potencia_media ? parseInt(form.potencia_media) : null,
      potencia_max: form.potencia_max ? parseInt(form.potencia_max) : null,
      distancia_m: form.distancia_m ? parseInt(form.distancia_m) : null,
      voltas: form.voltas ? parseInt(form.voltas) : null,
      estilo_natacao: form.estilo ?? null,
      ritmo_natacao: paceNatCalculado || null,
      tipo_wod: form.tipo_wod ?? null,
      movimentos: form.movimentos ?? null,
      resultado_wod: form.resultado ?? null,
      observacoes: form.observacoes ?? null,
      calorias_estimadas: form.calorias_wearable ? null : cals,
      calorias_wearable: form.calorias_wearable ? parseInt(form.calorias_wearable) : null,
    })
    setSalvandoLivre(false); setTela('conclusao_livre')
    gerarIAAtividadeLivre(duracaoMin, cals)
    atualizarDecisaoDia(userId) // ← atualiza decisão do dia em background
  }

  async function gerarIAAtividadeLivre(duracaoMin: number, cals: number) {
    setAnaliseLivre({ texto: '', carregando: true })
    const mod = MODALIDADES.find(m => m.id === modalidade)!
    let dadosEspecificos = ''
    if (modalidade === 'corrida') {
      const pace = calcularPace(duracaoMin, parseFloat(form.distancia_km ?? '0'))
      dadosEspecificos = `Distância: ${form.distancia_km ?? '?'}km | Pace: ${pace || '?'} min/km | Elevação: ${form.elevacao ?? '?'}m | Zona FC: ${form.zona_fc ?? '?'} | FC média: ${form.fc_media ?? '?'}bpm | FC máx: ${form.fc_max ?? '?'}bpm | Cadência: ${form.cadencia ?? '?'}ppm`
    } else if (modalidade === 'bike') {
      const vel = form.distancia_km && duracaoMin ? Math.round((parseFloat(form.distancia_km) / (duracaoMin / 60)) * 10) / 10 : null
      dadosEspecificos = `Distância: ${form.distancia_km ?? '?'}km | Vel. média: ${vel ?? '?'}km/h | Elevação: ${form.elevacao ?? '?'}m | Zona FC: ${form.zona_fc ?? '?'} | Potência média: ${form.potencia_media ?? '?'}W | Potência máx: ${form.potencia_max ?? '?'}W | Cadência: ${form.cadencia ?? '?'}rpm | FC média: ${form.fc_media ?? '?'}bpm`
    } else if (modalidade === 'natacao') {
      const paceNat = calcularPaceNatacao(duracaoMin, parseInt(form.distancia_m ?? '0'))
      dadosEspecificos = `Distância: ${form.distancia_m ?? '?'}m | Voltas: ${form.voltas ?? '?'} | Estilo: ${form.estilo ?? '?'} | Pace: ${paceNat || '?'}/100m | FC pós: ${form.fc_media ?? '?'}bpm`
    } else if (modalidade === 'crossfit') {
      dadosEspecificos = `WOD: ${form.tipo_wod ?? '?'} | Movimentos: ${form.movimentos ?? '?'} | Resultado: ${form.resultado ?? '?'}`
    }
    const prompt = `Coach KORE. Analise esta atividade de ${mod.label} de forma direta e específica.\n${duracaoMin}min | Intensidade: ${form.intensidade}/5 | ~${cals}kcal | Recuperação: ${score ? `${score}/100` : '?'}\n${dadosEspecificos}\n${form.observacoes ? `Observações: ${form.observacoes}` : ''}\n3 partes curtas (máx 80 palavras, sem markdown): Desempenho com dados reais, Ponto de atenção, Próximo treino`
    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnaliseLivre({ texto: data.analise ?? '', carregando: false })
    } catch { setAnaliseLivre({ texto: 'Não foi possível gerar análise.', carregando: false }) }
  }

  /* ───── largura responsiva do container ───── */
  const containerStyle: React.CSSProperties = {
    maxWidth: isDesktop ? 1200 : 448,
    margin: '0 auto',
    paddingLeft: isDesktop ? 48 : 16,
    paddingRight: isDesktop ? 48 : 16,
  }

  if (mostrarQuiz) return <QuizIA tipo="treino" onConcluir={gerarPlanoComIA} onCancelar={() => setMostrarQuiz(false)} />

  if (carregando) return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.energy}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  if (tela === 'gerando_plano_ia') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center', maxWidth: 384, width: '100%' }}>
          <div style={{ width: 64, height: 64, borderRadius: 24, background: alpha(C.energy, 0.12), border: `1px solid ${alpha(C.energy, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.energy}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 12, fontFamily: FONT_BODY }}>KORE IA</p>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: C.t1, marginBottom: 12, fontFamily: FONT_DISPLAY }}>Montando seu plano</h2>
          <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 32, fontFamily: FONT_BODY }}>Personalizando cada detalhe com base nas suas respostas...</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MENSAGENS_GERANDO.map((msg, i) => {
              const done = i < gerandoMensagem, active = i === gerandoMensagem
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: '12px 16px', transition: 'all .5s',
                  background: done ? alpha(C.energy, 0.06) : active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${done ? alpha(C.energy, 0.2) : 'rgba(255,255,255,0.12)'}`, opacity: i > gerandoMensagem ? 0.4 : 1 }}>
                  {done ? <span style={{ color: C.energy, fontSize: 14, flexShrink: 0 }}>✓</span>
                    : active ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${alpha(C.energy, 0.6)}`, borderTopColor: C.energy, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />}
                  <p style={{ fontSize: 14, color: i <= gerandoMensagem ? '#D4D8DF' : C.t3, fontFamily: FONT_BODY }}>{msg}</p>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  if (tela === 'conclusao_musculacao' && em) {
    const c = CORES_PLANO[em.plano]
    const tc = totalConcluidas(); const tt = totalSeries()
    const vol = calcVolume(series); const pct = tt > 0 ? Math.round((tc / tt) * 100) : 0
    return (
      <main style={{ minHeight: '100dvh', color: C.t1, overflowY: 'auto', fontFamily: FONT_BODY }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
        <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px 48px', paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
          <div style={{ position: 'relative', marginBottom: 32, textAlign: 'center', paddingTop: 16 }}>
            <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', width: 288, height: 288, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.18, pointerEvents: 'none', background: c.hex }} />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 80, height: 80, borderRadius: 28, background: alpha(c.hex, 0.12), border: `1px solid ${alpha(c.hex, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 60px ${alpha(c.hex, 0.25)}` }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: c.hex, fontFamily: FONT_DISPLAY }}>✓</span>
              </div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 8, color: c.hex }}>Treino concluído · Plano {em.plano}</p>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: C.t1, marginBottom: 4, fontFamily: FONT_DISPLAY }}>{em.nome}</h1>
              <p style={{ color: C.t2, fontSize: 14 }}>{(() => { const d = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1); })()}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Séries', val: `${tc}`, extra: `/${tt}`, bar: true },
              { label: 'Volume', val: vol > 0 ? vol.toLocaleString('pt-BR') : '—', sub: 'kg × reps' },
              { label: 'Calorias est.', val: caloriasEstimadas ? `~${caloriasEstimadas}` : '—', sub: 'kcal gastas' },
              { label: 'Recuperação', val: score ? `${score}` : '—', sub: score ? '/100' : 'não registrado' },
            ].map((s, i) => (
              <div key={i} style={{ ...glass, padding: 20 }}>
                <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 30, fontWeight: 800, ...dataNum(c.hex), fontFamily: FONT_DISPLAY }}>{s.val}{(s as any).extra && <span style={{ color: C.t3, fontSize: 18, fontWeight: 300 }}>{(s as any).extra}</span>}</p>
                {(s as any).bar
                  ? <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.09)', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 999, background: c.hex, width: `${pct}%` }} /></div>
                  : <p style={{ color: C.t3, fontSize: 12, marginTop: 4 }}>{s.sub}</p>}
              </div>
            ))}
          </div>
          <AnaliseIA hex={c.hex} analise={analise} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BotaoEnergy onClick={() => router.push('/dashboard')}>Voltar ao dashboard</BotaoEnergy>
            <button onClick={() => { setEm(null); setConcluido(false); setTela('principal') }} style={{ ...glassSubtle, width: '100%', color: C.t2, fontWeight: 700, padding: '14px 0', fontSize: 14, cursor: 'pointer', fontFamily: FONT_BODY }}>Registrar outra atividade</button>
          </div>
        </div>
      </main>
    )
  }

  if (tela === 'conclusao_livre' && modalidade) {
    const mod = MODALIDADES.find(m => m.id === modalidade)!
    const duracaoMin = parseInt(form.duracao_min ?? '30') || 30
    const stats = [
      { label: 'Duração', val: `${duracaoMin}`, un: 'min' },
      { label: 'Calorias', val: `~${caloriasEstimadas ?? '—'}`, un: 'kcal' },
      ...(form.distancia_km ? [{ label: 'Distância', val: form.distancia_km, un: 'km' }] : []),
      ...(form.distancia_m ? [{ label: 'Distância', val: form.distancia_m, un: 'm' }] : []),
      ...(form.potencia_media ? [{ label: 'Potência média', val: form.potencia_media, un: 'W' }] : []),
    ]
    return (
      <main style={{ minHeight: '100dvh', color: C.t1, overflowY: 'auto', fontFamily: FONT_BODY }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
        <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px 48px', paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
          <div style={{ textAlign: 'center', paddingTop: 16, marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 28, background: alpha(mod.hex, 0.12), border: `1px solid ${alpha(mod.hex, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 60px ${alpha(mod.hex, 0.25)}` }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: mod.hex, fontFamily: FONT_DISPLAY }}>✓</span>
            </div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 8, color: mod.hex }}>Atividade registrada</p>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: C.t1, marginBottom: 4, fontFamily: FONT_DISPLAY }}>{mod.label}</h1>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ ...glass, padding: 20 }}>
                <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 30, fontWeight: 800, ...dataNum(mod.hex), fontFamily: FONT_DISPLAY }}>{s.val}<span style={{ color: C.t3, fontSize: 18, fontWeight: 300 }}>{s.un}</span></p>
              </div>
            ))}
          </div>
          <AnaliseIA hex={mod.hex} analise={analiseLivre} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BotaoEnergy onClick={() => router.push('/dashboard')}>Voltar ao dashboard</BotaoEnergy>
            <button onClick={() => { setTela('principal'); setModalidade(null); setForm({ intensidade: 3 }) }} style={{ ...glassSubtle, width: '100%', color: C.t2, fontWeight: 700, padding: '14px 0', fontSize: 14, cursor: 'pointer', fontFamily: FONT_BODY }}>Registrar outra atividade</button>
          </div>
        </div>
      </main>
    )
  }

  if (tela === 'executando_musculacao' && em) {
    const c = CORES_PLANO[em.plano]
    const tc = totalConcluidas(); const tt = totalSeries(); const prog = tt > 0 ? (tc / tt) * 100 : 0
    const concluiTudo = tc === tt && tt > 0
    return (
      <main style={{ minHeight: '100dvh', color: C.t1, display: 'flex', flexDirection: 'column', fontFamily: FONT_BODY }}>
        <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.10)', background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px 16px', paddingTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.hex }}>Plano {em.plano}</p>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginTop: 2, fontFamily: FONT_DISPLAY }}>{em.nome}</h1>
              </div>
              <p style={{ ...dataNum(C.t2), fontSize: 14 }}>{tc}/{tt} séries</p>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.09)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: c.hex, transition: 'width .5s', width: `${prog}%` }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 160 }}>
          <div style={{ maxWidth: 448, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {em.exercicios.map((ex, ei) => {
              const exs = series[ex.id] ?? []
              const ok = exs.length > 0 && exs.every(s => s.concluida)
              return (
                <div key={ex.id} style={{ ...glass, overflow: 'hidden', padding: 0, border: `1px solid ${ok ? alpha(C.good, 0.3) : 'rgba(255,255,255,0.12)'}`, background: ok ? alpha(C.good, 0.05) : (glass.background as string) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 15, fontFamily: FONT_DISPLAY,
                      background: ok ? alpha(C.good, 0.2) : alpha(c.hex, 0.15), color: ok ? C.good : c.hex }}>{ok ? '✓' : ei + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: ok ? C.good : C.t1 }}>{ex.nome}</p>
                      <p style={{ ...dataNum(C.t3), fontSize: 11 }}>{ex.series} séries · {ex.repeticoes} reps{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg sugerido` : ''}</p>
                    </div>
                  </div>
                  {ex.observacoes && <div style={{ margin: '0 16px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.10)' }}><p style={{ color: C.t2, fontSize: 11, fontStyle: 'italic' }}>{ex.observacoes}</p></div>}
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {exs.map((s, si) => (
                      <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, padding: 8, background: s.concluida ? alpha(C.good, 0.07) : 'rgba(255,255,255,0.02)' }}>
                        <p style={{ ...dataNum(s.concluida ? C.good : C.t2), fontSize: 14, fontWeight: 700, width: 24, textAlign: 'center', flexShrink: 0 }}>{si + 1}</p>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Carga (kg)</p>
                          <input type="number" value={s.carga ?? ''} onChange={e => setCarga(ex.id, si, e.target.value ? parseFloat(e.target.value) : null)} placeholder="—" disabled={s.concluida} style={{ ...inputStyle, padding: '8px', textAlign: 'center', opacity: s.concluida ? 0.5 : 1 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Reps</p>
                          <input type="number" value={s.repeticoes} onChange={e => setReps(ex.id, si, parseInt(e.target.value) || 0)} disabled={s.concluida} style={{ ...inputStyle, padding: '8px', textAlign: 'center', opacity: s.concluida ? 0.5 : 1 }} />
                        </div>
                        <button onClick={() => toggle(ex.id, si)} style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: 'all .15s', cursor: 'pointer', flexShrink: 0,
                          background: s.concluida ? alpha(C.good, 0.2) : 'rgba(255,255,255,0.09)',
                          border: `1px solid ${s.concluida ? alpha(C.good, 0.4) : 'rgba(255,255,255,0.12)'}`,
                          color: s.concluida ? C.good : C.t2 }}>{s.concluida ? '✓' : '○'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Duração do treino</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="number" placeholder="60" value={form.duracao_musculacao ?? ''} onChange={e => setForm((p: any) => ({ ...p, duracao_musculacao: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                <p style={{ color: C.t2, fontSize: 14 }}>minutos</p>
              </div>
              {form.duracao_musculacao && <p style={{ color: C.t3, fontSize: 11, marginTop: 8 }}>≈ {estimarCalorias('musculacao', parseInt(form.duracao_musculacao), pesoKg)} kcal estimadas</p>}
            </div>
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ maxWidth: 448, margin: '0 auto', padding: '16px' }}>
            <button onClick={finalizarMusculacao} disabled={salvando || tc === 0}
              style={{ width: '100%', fontWeight: 800, padding: '16px 0', borderRadius: 16, fontSize: 15, cursor: salvando || tc === 0 ? 'default' : 'pointer', opacity: salvando || tc === 0 ? 0.3 : 1, transition: 'all .15s', fontFamily: FONT_DISPLAY, color: '#0A0A0A', border: 'none',
                background: concluiTudo ? `linear-gradient(135deg, ${C.energy}, ${C.energy2})` : 'rgba(255,255,255,0.12)',
                boxShadow: concluiTudo ? `0 8px 32px ${alpha(C.energy, 0.4)}` : 'none',
                ...(concluiTudo ? {} : { color: C.t1 }) }}>
              {salvando ? 'Salvando...' : concluiTudo ? 'Finalizar treino' : `Finalizar (${tc}/${tt} séries)`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (tela === 'formulario' && modalidade) {
    const mod = MODALIDADES.find(m => m.id === modalidade)!
    const duracaoAtual = parseInt(form.duracao_min ?? '0') || 0
    const calsPreview = duracaoAtual > 0 ? estimarCalorias(modalidade, duracaoAtual, pesoKg) : null
    return (
      <main style={{ minHeight: '100dvh', color: C.t1, display: 'flex', flexDirection: 'column', fontFamily: FONT_BODY }}>
        <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.10)', background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px 16px', paddingTop: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: alpha(mod.hex, 0.12), border: `1px solid ${alpha(mod.hex, 0.3)}`, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: mod.hex }}>{mod.label}</p>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: FONT_DISPLAY }}>Registrar atividade</h1>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 128 }}>
          <div style={{ maxWidth: 448, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...glassSubtle, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy, marginTop: 6, flexShrink: 0 }} />
              <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6 }}>Quanto mais dados você preencher, mais precisa será a análise da IA. Todos os campos são opcionais exceto a duração.</p>
            </div>
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Duração <span style={{ color: mod.hex }}>*</span></p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="number" placeholder="45" value={form.duracao_min ?? ''} onChange={e => setForm((p: any) => ({ ...p, duracao_min: e.target.value }))} style={{ ...inputStyle, flex: 1, fontSize: 18, textAlign: 'center', fontWeight: 700 }} />
                <p style={{ color: C.t2, fontSize: 14 }}>minutos</p>
              </div>
              {calsPreview && !form.calorias_wearable && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy, flexShrink: 0 }} />
                  <p style={{ color: C.t2, fontSize: 11 }}>Estimativa: <span style={{ color: C.t1, fontWeight: 700, ...dataNum(C.t1) }}>~{calsPreview} kcal</span> (sem wearable)</p>
                </div>
              )}
            </div>
            {modalidade === 'corrida' && <FormCorrida form={form} setForm={setForm} mod={mod} calsPreview={calsPreview} duracaoAtual={duracaoAtual} pesoKg={pesoKg} />}
            {modalidade === 'bike' && <FormBike form={form} setForm={setForm} mod={mod} calsPreview={calsPreview} duracaoAtual={duracaoAtual} pesoKg={pesoKg} />}
            {modalidade === 'natacao' && <FormNatacao form={form} setForm={setForm} mod={mod} calsPreview={calsPreview} duracaoAtual={duracaoAtual} />}
            {modalidade === 'crossfit' && <FormCrossfit form={form} setForm={setForm} mod={mod} calsPreview={calsPreview} />}
            {modalidade === 'outro' && (
              <div style={{ ...glass, padding: 20 }}>
                <p style={sectionTitle(mod.hex)}>Dados gerais</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Field label="FC média (bpm)" type="number" placeholder="Ex: 140" value={form.fc_media ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, fc_media: e.target.value }))} />
                  <Field label="Calorias (wearable)" type="number" placeholder="Ex: 400" value={form.calorias_wearable ?? ''} onChange={(e: any) => setForm((p: any) => ({ ...p, calorias_wearable: e.target.value }))} />
                  {!form.calorias_wearable && calsPreview && <p style={{ color: C.t3, fontSize: 10 }}>Estimativa sem wearable: ~{calsPreview} kcal</p>}
                </div>
              </div>
            )}
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Intensidade percebida (PSE)</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 1, l: 'Leve' }, { v: 2, l: 'Moderado' }, { v: 3, l: 'Forte' }, { v: 4, l: 'Muito forte' }, { v: 5, l: 'Máximo' }].map(i => {
                  const on = form.intensidade === i.v
                  return (
                    <button key={i.v} onClick={() => setForm((p: any) => ({ ...p, intensidade: i.v }))}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 4px', borderRadius: 12, transition: 'all .15s', cursor: 'pointer', gap: 6,
                        background: on ? alpha(mod.hex, 0.12) : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${on ? alpha(mod.hex, 0.4) : 'rgba(255,255,255,0.12)'}`,
                        color: on ? mod.hex : C.t3 }}>
                      <span style={{ ...dataNum(on ? mod.hex : C.t3), fontSize: 18, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{i.v}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.1, textAlign: 'center' }}>{i.l}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Observações <span style={{ color: C.t3, textTransform: 'none' }}>(opcional)</span></p>
              <textarea placeholder="Como você se sentiu? Alguma dor, sensação especial, estratégia de pace..." value={form.observacoes ?? ''} onChange={e => setForm((p: any) => ({ ...p, observacoes: e.target.value }))} rows={3} style={{ ...inputStyle, fontFamily: FONT_BODY, resize: 'none' }} />
            </div>
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ maxWidth: 448, margin: '0 auto', padding: '16px', display: 'flex', gap: 12 }}>
            <button onClick={() => setTela('principal')} style={{ width: 48, height: 48, borderRadius: 14, ...glassSubtle, color: C.t2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</button>
            <button onClick={salvarAtividadeLivre} disabled={salvandoLivre || !form.duracao_min}
              style={{ flex: 1, fontWeight: 800, padding: '16px 0', borderRadius: 16, fontSize: 15, cursor: salvandoLivre || !form.duracao_min ? 'default' : 'pointer', opacity: salvandoLivre || !form.duracao_min ? 0.3 : 1, transition: 'all .15s', fontFamily: FONT_DISPLAY, color: '#0A0A0A', border: 'none',
                background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, boxShadow: `0 8px 32px ${alpha(C.energy, 0.35)}` }}>
              {salvandoLivre ? 'Salvando...' : `Salvar ${mod.label}`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  /* ───── TELA PRINCIPAL ───── */
  const sel = treinos.find(t => t.plano === planoAtivo)

  const blocoBox = blocoAtual && (() => {
    const tb = TIPO_BLOCO[blocoAtual.tipo] ?? TIPO_BLOCO.adaptacao
    const pct = Math.round((blocoAtual.semanaGlobal / blocoAtual.totalSemanasCiclo) * 100)
    return (
      <div style={{ ...glass, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.t2, marginBottom: 12 }}>{blocoAtual.ciclonome}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: alpha(tb.hex, 0.12) }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: tb.hex }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, color: tb.hex, fontFamily: FONT_DISPLAY }}>{blocoAtual.nome}</p>
              <p style={{ color: C.t2, fontSize: 11 }}>Semana {blocoAtual.semanaNoBloco} de {blocoAtual.totalSemanas}</p>
            </div>
          </div>
          <span style={{ ...dataNum(C.t3), fontSize: 10, flexShrink: 0 }}>Sem. {blocoAtual.semanaGlobal}/{blocoAtual.totalSemanasCiclo}</span>
        </div>
        <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: tb.hex, width: `${pct}%` }} />
        </div>
        {blocoAtual.descricao && <p style={{ color: C.t2, fontSize: 11, lineHeight: 1.6 }}>{blocoAtual.descricao}</p>}
      </div>
    )
  })()

  // bloco principal de planos + exercícios
  const planosBox = treinos.length > 0 && (
    <div style={{ marginBottom: 24 }}>
      <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Meus planos</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {treinos.map(t => {
          const co = CORES_PLANO[t.plano]
          const on = planoAtivo === t.plano
          return (
            <button key={t.plano} onClick={() => setPlanoAtivo(t.plano)}
              style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 800, fontSize: 14, transition: 'all .15s', cursor: 'pointer', fontFamily: FONT_DISPLAY,
                background: on ? alpha(co.hex, 0.14) : 'rgba(255,255,255,0.05)',
                border: `1px solid ${on ? alpha(co.hex, 0.4) : 'rgba(255,255,255,0.11)'}`,
                color: on ? co.hex : C.t3,
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                boxShadow: on ? `0 0 24px ${alpha(co.hex, 0.2)}` : 'none' }}>
              Plano {t.plano}
              <span style={{ display: 'block', fontSize: 9, fontWeight: 400, marginTop: 2, opacity: 0.75, fontFamily: FONT_BODY }}>{treinosConcluidosHoje.has(t.plano) ? '✓ Feito hoje' : `${t.exercicios.length} exerc.`}</span>
            </button>
          )
        })}
      </div>
      {sel && (() => {
        const co = CORES_PLANO[sel.plano]
        const isPlanoIA = !sel.personal_id
        return (
          <div style={isDesktop ? { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' } : undefined}>
            {/* coluna esquerda: card do plano com exercícios */}
            <div style={{ ...glass, padding: 20, border: `1px solid ${alpha(co.hex, 0.3)}`, marginBottom: isDesktop ? 0 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: co.hex }}>Plano {sel.plano}</p>
                {isPlanoIA && <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.energy, background: alpha(C.energy, 0.1), border: `1px solid ${alpha(C.energy, 0.2)}`, borderRadius: 999, padding: '2px 8px' }}>IA</span>}
              </div>
              <p style={{ color: C.t1, fontWeight: 800, fontSize: 20, marginBottom: 4, fontFamily: FONT_DISPLAY }}>{sel.nome}</p>
              {sel.descricao && <p style={{ color: C.t2, fontSize: 12, marginBottom: 16 }}>{sel.descricao}</p>}
              <div style={{ marginTop: 16 }}>
                {sel.exercicios.map((ex, i) => (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < sel.exercicios.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: alpha(co.hex, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ ...dataNum(co.hex), fontSize: 11, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: C.t1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.nome}</p>
                      <p style={{ ...dataNum(C.t3), fontSize: 11 }}>{ex.series}×{ex.repeticoes}{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* coluna direita (desktop): recuperação + CTA */}
            <div>
              {score && (
                <div style={{ ...glass, padding: 16, marginBottom: 16 }}>
                  <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Recuperação</p>
                  <p style={{ ...dataNum(score >= 70 ? C.good : score >= 50 ? C.warn : C.danger), fontSize: 30, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{score}<span style={{ color: C.t3, fontSize: 16, fontWeight: 300 }}>/100</span></p>
                  <p style={{ color: C.t2, fontSize: 11, marginTop: 4 }}>{score >= 70 ? 'Ótimo para treinar forte!' : score >= 50 ? 'Treine com moderação.' : 'Vá leve hoje.'}</p>
                </div>
              )}
              <button onClick={() => iniciarMusculacao(sel)}
                style={{ width: '100%', fontWeight: 800, padding: '18px 0', borderRadius: 16, fontSize: 16, cursor: 'pointer', transition: 'all .15s', fontFamily: FONT_DISPLAY, color: '#0A0A0A', border: 'none',
                  background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, boxShadow: `0 8px 32px ${alpha(C.energy, 0.4)}`, marginBottom: 16 }}>
                Iniciar Plano {sel.plano}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )

  // bloco IA / sem personal
  const iaBox = !temPersonal && (
    <div style={{ marginBottom: 24 }}>
      {treinos.length === 0 ? (
        <div style={{ ...glass, padding: 20, border: `1px solid ${alpha(C.energy, 0.25)}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 16, background: alpha(C.energy, 0.12), border: `1px solid ${alpha(C.energy, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: C.energy, fontWeight: 800, fontSize: 18, fontFamily: FONT_DISPLAY }}>K</span>
            </div>
            <div>
              <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em' }}>KORE IA · Personal virtual</p>
              <p style={{ color: C.t1, fontWeight: 800, fontSize: 16, fontFamily: FONT_DISPLAY }}>Sem personal? A IA monta seu plano</p>
            </div>
          </div>
          <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>Responda uma consulta rápida e a IA cria um plano personalizado com exercícios, séries e cargas.</p>
          <button onClick={() => setMostrarQuiz(true)}
            style={{ width: '100%', fontWeight: 800, padding: '14px 0', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: FONT_DISPLAY, color: '#0A0A0A', border: 'none',
              background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, boxShadow: `0 8px 32px ${alpha(C.energy, 0.4)}` }}>
            Iniciar consulta com IA
          </button>
        </div>
      ) : (
        <button onClick={() => setMostrarQuiz(true)}
          style={{ width: '100%', fontWeight: 700, padding: '14px 0', borderRadius: 16, fontSize: 14, cursor: 'pointer', fontFamily: FONT_DISPLAY,
            background: alpha(C.energy, 0.08), border: `1px solid ${alpha(C.energy, 0.25)}`, color: C.energy }}>
          Gerar novo plano com IA
        </button>
      )}
    </div>
  )

  // bloco atividades livres
  const MODALIDADE_ICONS: Record<string, React.ReactNode> = {
    musculacao: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6.5 6.5h1M16.5 6.5h1M6.5 17.5h1M16.5 17.5h1"/><path d="M7.5 6.5v11M17.5 6.5v11"/><path d="M7.5 12h9"/><path d="M3 10.5v3M21 10.5v3"/></svg>,
    corrida:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="13" cy="4" r="2"/><path d="M8 21l2-6 3 3 4-8"/><path d="M6 12l2-3 4 1 2-4"/></svg>,
    bike:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M6 15l4-8h4l2 4"/><path d="M14 7l2 4h-6"/></svg>,
    natacao:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><circle cx="12" cy="6" r="2"/><path d="M12 8v4"/></svg>,
    crossfit:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    outro:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>,
  }

  const atividadesBox = (
    <div>
      <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Registrar atividade</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODALIDADES.map(mod => (
          <button key={mod.id} onClick={() => abrirFormulario(mod.id)}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = alpha(mod.hex, 0.4); el.style.background = alpha(mod.hex, 0.08); el.style.transform = 'translateX(4px)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = alpha(mod.hex, 0.18); el.style.background = 'rgba(255,255,255,0.04)'; el.style.transform = 'translateX(0)' }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${alpha(mod.hex, 0.18)}`,
              transition: 'all .2s ease', textAlign: 'left',
            }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: alpha(mod.hex, 0.15), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mod.hex }}>
              {MODALIDADE_ICONS[mod.id]}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: mod.hex, fontFamily: FONT_DISPLAY }}>{mod.label}</span>
            <span style={{ marginLeft: 'auto', color: C.t3, fontSize: 16 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  )

  const divisor = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.09)' }} />
      <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>ou</p>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.09)' }} />
    </div>
  )

  return (
    <main className="md:flex" style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY }}>
      <SidebarProfissional tipo="cliente" />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div style={{ ...containerStyle, paddingBottom: 96, paddingTop: isDesktop ? 40 : 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ color: C.t3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>— Dashboard</p>
            <h1 style={{ fontSize: isDesktop ? 36 : 28, fontWeight: 800, color: C.t1, letterSpacing: '-0.02em', fontFamily: FONT_DISPLAY, margin: 0 }}>Treinos</h1>
            <p style={{ color: C.t3, fontSize: 13, marginTop: 6 }}>Planos do personal ou registre qualquer atividade</p>
          </div>
          {score && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `rgba(255,255,255,0.05)`, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '10px 16px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: score >= 70 ? C.good : score >= 50 ? C.warn : C.danger }} />
              <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>Recuperação:</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: score >= 70 ? C.good : score >= 50 ? C.warn : C.danger, fontVariantNumeric: 'tabular-nums' }}>{score}/100</span>
            </div>
          )}
        </div>

        {isDesktop ? (
          /* ── LAYOUT DESKTOP: 3 áreas ── */
          <>
            {blocoBox}
            {/* Planos + Atividades em grid principal */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
              <div>
                {planosBox}
                {iaBox}
              </div>
              <div>
                {atividadesBox}
              </div>
            </div>
          </>
        ) : (
          <>
            {blocoBox}
            {planosBox}
            {iaBox}
            {divisor}
            {atividadesBox}
          </>
        )}
      </div>
      </div>
    </main>
  )
}

/* ─────────────────────────────────────────────────────────
   COMPONENTES AUXILIARES DE UI
   ───────────────────────────────────────────────────────── */
function BotaoEnergy({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', fontWeight: 800, padding: '16px 0', borderRadius: 16, fontSize: 15, cursor: 'pointer', transition: 'all .15s', fontFamily: FONT_DISPLAY, color: '#0A0A0A', border: 'none',
        background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, boxShadow: `0 8px 32px ${alpha(C.energy, 0.4)}` }}>
      {children}
    </button>
  )
}

function AnaliseIA({ hex, analise }: { hex: string; analise: { texto: string; carregando: boolean } }) {
  return (
    <div style={{ ...glass, overflow: 'hidden', padding: 0, marginBottom: 16, border: `1px solid ${alpha(hex, 0.3)}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 10, background: alpha(hex, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: hex, fontFamily: FONT_DISPLAY }}>K</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: hex }}>Análise KORE IA</p>
          <p style={{ color: C.t3, fontSize: 10 }}>Powered by Claude</p>
        </div>
        {analise.carregando && <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${hex}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {analise.carregando
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1, 0.8, 0.6].map((w, i) => <div key={i} style={{ height: 12, background: 'rgba(255,255,255,0.09)', borderRadius: 999, animation: 'pulse 1.5s ease-in-out infinite', width: `${w * 100}%` }} />)}</div>
          : <p style={{ color: '#CBD0D8', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{analise.texto || 'Gerando análise...'}</p>}
      </div>
    </div>
  )
}
