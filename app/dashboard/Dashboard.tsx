'use client'

import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import OnboardingTour from '../components/OnboardingTour'
import SidebarProfissional from '../components/SidebarProfissional'
import {
  Bell, AlertTriangle, ChevronRight, X, Calendar, Moon, Sparkles,
  Dumbbell, Utensils, Check, Plus, UserPlus, ClipboardList,
} from 'lucide-react'

/* ═════════════════════════════════════════════════════════════
   KORE · Dashboard — "Energetic Precision"
   Visual redesign · lógica de negócio 100% preservada.
   ═════════════════════════════════════════════════════════════ */

const C = {
  energy:   '#FF5A36',
  energy2:  '#FF8A3D',
  good:     '#2DD4A7',
  sleep:    '#60A5FA',
  recovery: '#A78BFA',
  warn:     '#F5B544',
  danger:   '#FB7185',
  t1:       '#F5F6F8',
  t2:       '#9AA0AD',
  t3:       '#7A8290',
}

const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY    = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO    = "var(--font-geist-mono), 'JetBrains Mono', monospace"

/** Hook de breakpoint desktop (≥1024px) */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isDesktop
}

/** Glass card padrão do design system. */
function glass(extra?: CSSProperties, accent?: string): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.065)',
    backdropFilter: 'blur(16px) saturate(130%)',
    WebkitBackdropFilter: 'blur(16px) saturate(130%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    boxShadow: accent
      ? `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${accent}, inset 0 1px 0 rgba(255,255,255,0.10)`
      : '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
    ...extra,
  }
}

type Perfil = {
  tipo: 'cliente' | 'personal' | 'nutricionista'
  nome: string | null
  email: string
  peso: number | null
  objetivo: string | null
  meta_peso: number | null
  meta_data_limite: string | null
}

type BemEstar = {
  energia: number
  humor: number
  dor_muscular: number
  qualidade_sono: number
} | null

type Vinculo = {
  tipo: string
  profissional_id: string
  nome: string | null
  email: string
} | null

type NutricaoHoje = {
  calorias: number | null
  proteina: number | null
  qualidade_alimentacao: number | null
} | null

type DecisaoDia = {
  decisao: string        // "Treino moderado — não force hoje"
  motivo: string         // "HRV baixo, sono 6h20"
  treino: string         // "Plano B com volume reduzido"
  nutricao: string       // "Aumente carboidrato hoje"
  sono: string           // "Tente dormir antes das 23h"
  cor: 'verde' | 'amarelo' | 'laranja' | 'vermelho'
} | null

type Notif = {
  id: string
  tipo: 'agendamento' | 'lembrete' | 'alerta'
  titulo: string
  corpo: string
  icon: string
  link?: string
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getHourBR(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }), 10)
}

function MiniSparkline({ values, color = C.good }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const W = 64, H = 24, pad = 2
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1
  const xStep = (W - pad * 2) / Math.max(values.length - 1, 1)
  const toY = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * xStep).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const last = values[values.length - 1], first = values[0]
  const trend = last > first ? C.good : last < first ? C.danger : C.t3
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={trend} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  )
}

function getGreeting(): string {
  const h = getHourBR()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getTodayString(): string {
  // lowercase-first to avoid "Terça-Feira, 2 De Junho" capitalization bug
  const raw = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long',
  })
  // Only capitalize the first letter, rest stays lowercase
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

function getFirstName(nome: string | null, email: string): string {
  if (nome) return nome.split(' ')[0]
  return email.split('@')[0]
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

function getMetaCalorias(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  const tmb = 10 * peso + 6.25 * 170 - 5 * 25 + 5
  const tdee = Math.round(tmb * 1.55)
  if (objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}

function getMetaProteina(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  if (objetivo === 'ganhar_massa') return Math.round(peso * 2.2)
  if (objetivo === 'perder_peso') return Math.round(peso * 2.0)
  return Math.round(peso * 1.8)
}

function getMediaBemEstar(be: BemEstar): number | null {
  if (!be) return null
  const vals = [be.energia, be.humor, be.dor_muscular, be.qualidade_sono]
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function getCorMedia(media: number): string {
  if (media <= 2) return C.danger
  if (media === 3) return C.warn
  return C.good
}

function getLabelMedia(media: number): string {
  if (media <= 1) return 'Dia difícil'
  if (media === 2) return 'Abaixo do normal'
  if (media === 3) return 'Normal'
  if (media === 4) return 'Bem disposto'
  return 'No seu melhor!'
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Dia ideal para treino intenso'
  if (score >= 70) return 'Boa recuperação. Pode treinar forte'
  if (score >= 55) return 'Recuperação moderada. Treino leve'
  if (score >= 40) return 'Recuperação baixa. Considere descanso'
  return 'Recuperação crítica. Descanse hoje'
}

function getScoreHex(score: number): string {
  if (score >= 80) return C.good
  if (score >= 60) return C.warn
  if (score >= 40) return C.energy2
  return C.danger
}

function calcularStreak(datas: string[]): number {
  if (!datas.length) return 0
  const hoje = getTodayBR()
  let streak = 0
  const cursor = new Date(hoje + 'T12:00:00-03:00')
  for (const d of datas) {
    const cursorStr = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    if (d === cursorStr) { streak++; cursor.setDate(cursor.getDate() - 1) }
    else break
  }
  return streak
}

// ─── CORES DO CARD DE DECISÃO ────────────────────────────────────────────────
function getCoresDecisao(cor: 'verde' | 'amarelo' | 'laranja' | 'vermelho') {
  if (cor === 'verde')    return { glow: C.good,    border: `${C.good}55`,    badgeBg: `${C.good}1a`,    badgeText: C.good }
  if (cor === 'amarelo')  return { glow: C.warn,    border: `${C.warn}55`,    badgeBg: `${C.warn}1a`,    badgeText: C.warn }
  if (cor === 'laranja')  return { glow: C.energy,  border: `${C.energy}55`,  badgeBg: `${C.energy}1a`,  badgeText: C.energy2 }
  return                         { glow: C.danger,  border: `${C.danger}55`,  badgeBg: `${C.danger}1a`,  badgeText: C.danger }
}

// ─── NAV ICONS ────────────────────────────────────────────────────────────────
function IconHome({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
}
function IconTreino({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h1M16.5 6.5h1M6.5 17.5h1M16.5 17.5h1" /><path d="M7.5 6.5v11M17.5 6.5v11" /><path d="M7.5 12h9" /><path d="M3 10.5v3M21 10.5v3" /></svg>
}
function IconNutricao({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 6.5 7 8 7 13c0 4 2.5 6.5 5 6.5s5-2.5 5-6.5c0-5-3-6.5-5-6.5z" /><path d="M12 6.5V4M12 4c0 0 1.5-1 3-1.5" /></svg>
}
function IconEvolucao({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
}
function IconPerfil({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
}
function IconAlunos({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 3.5a3.5 3.5 0 010 7" /><path d="M22 20c0-3.5-2.5-5.8-6-6" /></svg>
}
function IconAgenda({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
}

type NavItem = { id: string; label: string; Icon: React.FC<{ active: boolean }> }

function getNavItems(tipo?: string): NavItem[] {
  if (tipo === 'personal') return [
    { id: 'home',   label: 'Início', Icon: IconHome   },
    { id: 'alunos', label: 'Alunos', Icon: IconAlunos },
    { id: 'agenda', label: 'Agenda', Icon: IconAgenda },
    { id: 'perfil', label: 'Perfil', Icon: IconPerfil },
  ]
  if (tipo === 'nutricionista') return [
    { id: 'home',      label: 'Início',    Icon: IconHome   },
    { id: 'pacientes', label: 'Pacientes', Icon: IconAlunos },
    { id: 'agenda',    label: 'Agenda',    Icon: IconAgenda },
    { id: 'perfil',    label: 'Perfil',    Icon: IconPerfil },
  ]
  return [
    { id: 'home',     label: 'Início',   Icon: IconHome     },
    { id: 'treino',   label: 'Treino',   Icon: IconTreino   },
    { id: 'nutri',    label: 'Nutrição', Icon: IconNutricao },
    { id: 'evolucao', label: 'Evolução', Icon: IconEvolucao },
    { id: 'perfil',   label: 'Perfil',   Icon: IconPerfil   },
  ]
}

export default function Dashboard() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar>(null)
  const [scoreRecuperacao, setScoreRecuperacao] = useState<number | null>(null)
  const [streak, setStreak] = useState<number>(0)
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [treinoHoje, setTreinoHoje] = useState<{ nome: string; plano: string; concluido: boolean } | null>(null)
  const [nutricaoHoje, setNutricaoHoje] = useState<NutricaoHoje>(null)
  const [decisaoDia, setDecisaoDia] = useState<DecisaoDia>(null)
  const [gerandoDecisao, setGerandoDecisao] = useState(false)
  const [temSonoHoje, setTemSonoHoje] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [userId, setUserId] = useState('')
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [recentDays, setRecentDays] = useState<boolean[]>(Array(7).fill(false))
  const [sonoHistorico, setSonoHistorico] = useState<{ data: string; score_recuperacao: number | null; qualidade: number | null }[]>([])
  const [pesoAtual, setPesoAtual] = useState<number | null>(null)
  const [pesoDelta, setPesoDelta] = useState<number | null>(null)
  const [planoNutriRefeicoes, setPlanoNutriRefeicoes] = useState<{ nome: string; horario: string; calorias: number; proteina: number; alimentos: { nome: string; quantidade: string }[] }[]>([])
  const [fasePeriodizacao, setFasePeriodizacao] = useState<{ nomeBloco: string; tipoBloco: string; semanaBloco: number; semanasBloco: number; semanaTotal: number; totalSemanas: number; descricao: string | null } | null>(null)

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis').select('tipo, nome, email, peso, objetivo, meta_peso, meta_data_limite').eq('id', session.user.id).single()

      // Auth/network error → session expired → back to login; no profile → onboarding
      if (!perfilData) {
        if (perfilError?.code === 'PGRST116' || !perfilError) { router.push('/onboarding'); return }
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      setPerfil(perfilData)

      if (perfilData.tipo === 'cliente') {
        const hoje = getTodayBR()

        const [
          { data: be },
          { data: sonoHoje },
          { data: treinos },
          { data: atvsLivres },
          { data: vinculosData },
          { data: treinoHojeData },
          { data: nutricaoData },
          { data: decisaoData },
          { data: sonoHistData },
          { data: medidasData },
          { data: planoData },
        ] = await Promise.all([
          supabase.from('bem_estar').select('energia, humor, dor_muscular, qualidade_sono').eq('usuario_id', session.user.id).eq('data', hoje).single(),
          supabase.from('sono').select('score_recuperacao, duracao_minutos, hrv, sono_profundo, sono_rem').eq('usuario_id', session.user.id).eq('data', hoje).single(),
          supabase.from('treinos').select('data').eq('cliente_id', session.user.id).eq('concluido', true).order('data', { ascending: false }).limit(60),
          supabase.from('atividades_livres').select('data').eq('usuario_id', session.user.id).order('data', { ascending: false }).limit(60),
          supabase.from('vinculos').select('tipo, profissional_id').eq('cliente_id', session.user.id).eq('ativo', true),
          supabase.from('treinos').select('nome, plano, concluido').eq('cliente_id', session.user.id).eq('data', hoje).order('concluido', { ascending: false }).limit(1).single(),
          supabase.from('nutricao').select('calorias, proteina, qualidade_alimentacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
          supabase.from('decisao_dia').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single(),
          supabase.from('sono').select('data, score_recuperacao, qualidade').eq('usuario_id', session.user.id).order('data', { ascending: false }).limit(7),
          supabase.from('evolucao_medidas').select('peso, data').eq('cliente_id', session.user.id).not('peso', 'is', null).order('data', { ascending: false }).limit(2),
          supabase.from('planos_nutricionais').select('conteudo').eq('usuario_id', session.user.id).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
        ])

        if (planoData?.conteudo) {
          try {
            const p = JSON.parse(planoData.conteudo)
            if (Array.isArray(p.refeicoes)) setPlanoNutriRefeicoes(p.refeicoes)
          } catch {}
        }
        if (be) setBemEstar(be)
        if (sonoHoje?.score_recuperacao) setScoreRecuperacao(sonoHoje.score_recuperacao)
        if (sonoHoje) setTemSonoHoje(true)
        if (treinoHojeData) setTreinoHoje(treinoHojeData)
        if (nutricaoData) setNutricaoHoje(nutricaoData)
        if (sonoHistData) setSonoHistorico(sonoHistData)
        if (medidasData?.length) {
          setPesoAtual(medidasData[0].peso)
          if (medidasData.length >= 2) {
            setPesoDelta(Math.round((medidasData[0].peso - medidasData[1].peso) * 10) / 10)
          }
        }

        // Streak — une treinos + atividades livres
        const todasDatas = [
          ...(treinos?.map((t: { data: string }) => t.data) ?? []),
          ...(atvsLivres?.map((a: { data: string }) => a.data) ?? []),
        ]
        const datasUnicas = [...new Set(todasDatas)].sort((a, b) => b.localeCompare(a))
        setStreak(calcularStreak(datasUnicas))

        const hoje7 = getTodayBR()
        const datasSet = new Set(datasUnicas)
        const d7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(hoje7 + 'T12:00:00-03:00')
          d.setDate(d.getDate() - (6 - i))
          return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        })
        setRecentDays(d7.map(d => datasSet.has(d)))

        // Decisão do dia já salva no banco?
        if (decisaoData) {
          setDecisaoDia({
            decisao: decisaoData.decisao,
            motivo: decisaoData.motivo,
            treino: decisaoData.treino,
            nutricao: decisaoData.nutricao,
            sono: decisaoData.sono_rec,
            cor: decisaoData.cor,
          })
        } else if (sonoHoje?.score_recuperacao) {
          // Tem sono mas ainda não tem decisão — gera automaticamente
          gerarDecisaoDia(session.user.id, sonoHoje, be, perfilData)
        }

        if (vinculosData?.length) {
          const ids = vinculosData.map((v: { profissional_id: string }) => v.profissional_id)
          const { data: perfis } = await supabase.from('perfis').select('id, nome, email').in('id', ids)
          const vinculosComPerfil = vinculosData.map((v: { tipo: string; profissional_id: string }) => {
            const p = perfis?.find((pf: { id: string }) => pf.id === v.profissional_id)
            return { tipo: v.tipo, profissional_id: v.profissional_id, nome: p?.nome ?? null, email: p?.email ?? '' }
          })
          setVinculos(vinculosComPerfil)
        }

        // Fase de periodização do atleta
        const { data: periAtiva } = await supabase.from('periodizacoes').select('id,data_inicio').eq('cliente_id', session.user.id).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (periAtiva) {
          const { data: blocos } = await supabase.from('blocos_periodizacao').select('nome,tipo,semanas,descricao,ordem').eq('periodizacao_id', periAtiva.id).order('ordem')
          if (blocos?.length) {
            const inicio = new Date(periAtiva.data_inicio + 'T12:00:00-03:00')
            const diasTotais = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24))
            const semanaTotal = Math.max(1, Math.floor(diasTotais / 7) + 1)
            const totalSemanas = blocos.reduce((s: number, b: any) => s + b.semanas, 0)
            let acum = 0, blocoIdx = blocos.length - 1
            for (let i = 0; i < blocos.length; i++) {
              if (semanaTotal <= acum + blocos[i].semanas) { blocoIdx = i; break }
              acum += blocos[i].semanas
            }
            const b = blocos[blocoIdx] as any
            const semanaNoBloco = Math.min(semanaTotal - acum, b.semanas)
            setFasePeriodizacao({ nomeBloco: b.nome, tipoBloco: b.tipo, semanaBloco: semanaNoBloco, semanasBloco: b.semanas, semanaTotal, totalSemanas, descricao: b.descricao ?? null })
          }
        }
      }

      // Notificações: busca agendamentos próximos (próximas 3 dias)
      const notifsList: Notif[] = []
      const hojeNotif = getTodayBR()
      const em3dias = new Date(hojeNotif + 'T12:00:00-03:00'); em3dias.setDate(em3dias.getDate() + 3)
      const em3diasStr = em3dias.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const agendQuery = perfilData?.tipo === 'cliente'
        ? supabase.from('agendamentos').select('id,data,hora,tipo,status').eq('cliente_id', session.user.id).eq('status', 'agendado').gte('data', hojeNotif).lte('data', em3diasStr).order('data').order('hora').limit(5)
        : supabase.from('agendamentos').select('id,data,hora,tipo,status').eq('profissional_id', session.user.id).eq('status', 'agendado').gte('data', hojeNotif).lte('data', em3diasStr).order('data').order('hora').limit(5)

      const { data: agendamentos } = await agendQuery

      if (agendamentos?.length) {
        for (const ag of agendamentos) {
          const amanha = new Date(hojeNotif + 'T12:00:00-03:00'); amanha.setDate(amanha.getDate() + 1)
          const amanhaStr = amanha.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
          const dLabel = ag.data === hojeNotif ? 'Hoje' : ag.data === amanhaStr ? 'Amanhã' : ag.data.slice(8,10) + '/' + ag.data.slice(5,7)
          const h = ag.hora?.substring(0, 5) ?? ''
          notifsList.push({
            id: ag.id,
            tipo: 'agendamento',
            titulo: ag.tipo,
            corpo: `${dLabel} às ${h}`,
            icon: '📅',
            link: '/agenda',
          })
        }
      }

      setNotifs(notifsList)
      setCarregando(false)
    }
    carregarDados()
  }, [router])

  async function gerarDecisaoDia(uid: string, sono: any, be: any, perfil: any) {
    setGerandoDecisao(true)
    try {
      const score = sono?.score_recuperacao ?? 0
      const prompt = `Você é o coach de IA do KORE. Analise os dados abaixo e gere a DECISÃO DO DIA para este atleta.

ATLETA: ${perfil.nome ?? 'Atleta'} | Objetivo: ${perfil.objetivo ?? 'saúde geral'}

DADOS DE HOJE:
- Score de recuperação: ${score}/100
- Sono: ${sono?.duracao_minutos ? `${Math.floor(sono.duracao_minutos/60)}h${sono.duracao_minutos%60}min` : 'não informado'}
- HRV: ${sono?.hrv ? `${sono.hrv}ms` : 'não informado'}
- Sono profundo: ${sono?.sono_profundo ? `${sono.sono_profundo}min` : 'não informado'}
- REM: ${sono?.sono_rem ? `${sono.sono_rem}min` : 'não informado'}
- Energia: ${be?.energia ?? '?'}/5
- Humor: ${be?.humor ?? '?'}/5
- Dor muscular: ${be?.dor_muscular ?? '?'}/5

Responda APENAS em JSON válido, sem markdown:
{
  "decisao": "frase curta e direta (ex: Treino intenso — você está ótimo hoje)",
  "motivo": "1 linha explicando o porquê com dados reais",
  "treino": "recomendação específica de treino para hoje",
  "nutricao": "ajuste nutricional para hoje se necessário",
  "sono_rec": "recomendação de sono para esta noite",
  "cor": "verde | amarelo | laranja | vermelho"
}`

      const res = await fetch('/api/analise-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modo: 'plano' }),
      })
      const data = await res.json()
      const texto = data.analise ?? ''
      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON inválido')
      const resultado = JSON.parse(jsonMatch[0])

      // Salva no banco
      await supabase.from('decisao_dia').upsert({
        usuario_id: uid,
        data: getTodayBR(),
        decisao: resultado.decisao,
        motivo: resultado.motivo,
        treino: resultado.treino,
        nutricao: resultado.nutricao,
        sono_rec: resultado.sono_rec,
        cor: resultado.cor,
      }, { onConflict: 'usuario_id,data' })

      setDecisaoDia({
        decisao: resultado.decisao,
        motivo: resultado.motivo,
        treino: resultado.treino,
        nutricao: resultado.nutricao,
        sono: resultado.sono_rec,
        cor: resultado.cor,
      })
    } catch (e) {
      console.error('Erro ao gerar decisão do dia:', e)
    }
    setGerandoDecisao(false)
  }

  async function handleSalvarMeta(metaPeso: number, metaData: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('perfis').update({ meta_peso: metaPeso, meta_data_limite: metaData }).eq('id', session.user.id)
    setPerfil(prev => prev ? { ...prev, meta_peso: metaPeso, meta_data_limite: metaData } : prev)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (carregando) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_BODY }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: `2px solid ${C.energy}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: C.t3, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Carregando</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100dvh', color: C.t1, display: 'flex', flexDirection: isDesktop ? 'row' : 'column', fontFamily: FONT_BODY }}>
      {perfil?.tipo === 'cliente' && <OnboardingTour />}

      {/* ── SIDEBAR DESKTOP ── */}
      {isDesktop && (
        <aside style={{
          width: 220, flexShrink: 0,
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          padding: '32px 16px',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 40, paddingLeft: 8 }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 900,
              letterSpacing: '-0.04em',
              background: `linear-gradient(135deg, #fff 0%, ${C.energy2} 40%, ${C.energy} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>KORE</span>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {getNavItems(perfil?.tipo).map(item => {
              const active = activeTab === item.id
              return (
                <button key={item.id} onClick={() => {
                  if (item.id === 'perfil') router.push('/perfil')
                  else if (item.id === 'alunos') router.push('/personal')
                  else if (item.id === 'pacientes') router.push('/nutricionista/pacientes')
                  else if (item.id === 'agenda') router.push('/agenda')
                  else if (item.id === 'treino') router.push('/treino')
                  else if (item.id === 'evolucao') router.push('/evolucao')
                  else if (item.id === 'nutri') router.push('/nutricao')
                  else setActiveTab(item.id)
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: active ? `rgba(255,90,54,0.12)` : 'transparent',
                  border: `1px solid ${active ? 'rgba(255,90,54,0.25)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 150ms ease',
                  color: active ? C.energy : C.t2,
                }}>
                  <item.Icon active={active} />
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: '0.01em' }}>
                    {item.label}
                  </span>
                  {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.energy }} />}
                </button>
              )
            })}
          </nav>

          {/* Logout */}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12, marginTop: 8,
            background: 'none', border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', color: C.t3, transition: 'color 150ms ease',
            fontSize: 13, fontWeight: 500,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sair
          </button>
        </aside>
      )}

      {/* Painel de Notificações */}
      {showNotifs && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNotifs(false) }}>
          <div style={glass({ width: '100%', maxWidth: 448, margin: '0 auto', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Notificações</h2>
              <button onClick={() => setShowNotifs(false)} style={{ color: C.t2, lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {notifs.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.t3 }}><Bell size={26} /></div>
                <p style={{ color: C.t1, fontWeight: 700, marginBottom: 4 }}>Tudo em dia!</p>
                <p style={{ color: C.t3, fontSize: 14 }}>Nenhuma notificação no momento.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifs.map(n => (
                  <button key={n.id} onClick={() => { setShowNotifs(false); if (n.link) router.push(n.link) }}
                    style={glass({ textAlign: 'left', padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 16, width: '100%' })}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: n.tipo === 'agendamento' ? `${C.sleep}1a` : n.tipo === 'alerta' ? `${C.danger}1a` : 'rgba(255,255,255,0.06)', color: n.tipo === 'agendamento' ? C.sleep : n.tipo === 'alerta' ? C.danger : C.t2 }}>
                      {n.tipo === 'agendamento' ? <Calendar size={18} /> : n.tipo === 'alerta' ? <AlertTriangle size={18} /> : <Bell size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: C.t1, fontWeight: 700, fontSize: 14 }}>{n.titulo}</p>
                      <p style={{ color: C.t2, fontSize: 12, marginTop: 2 }}>{n.corpo}</p>
                    </div>
                    {n.link && <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={16} /></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isDesktop ? 40 : 112, marginLeft: isDesktop ? 220 : 0 }}>
        {perfil?.tipo === 'cliente' && (
          <DashboardCliente
            perfil={perfil}
            bemEstar={bemEstar}
            scoreRecuperacao={scoreRecuperacao}
            streak={streak}
            recentDays={recentDays}
            sonoHistorico={sonoHistorico}
            vinculos={vinculos}
            treinoHoje={treinoHoje}
            nutricaoHoje={nutricaoHoje}
            decisaoDia={decisaoDia}
            gerandoDecisao={gerandoDecisao}
            temSonoHoje={temSonoHoje}
            activeTab={activeTab}
            userId={userId}
            pesoAtual={pesoAtual}
            pesoDelta={pesoDelta}
            onSalvarMeta={handleSalvarMeta}
            onLogout={handleLogout}
            onOpenNotifs={() => setShowNotifs(true)}
            notifCount={notifs.length}
            planoNutriRefeicoes={planoNutriRefeicoes}
            fasePeriodizacao={fasePeriodizacao}
            isDesktop={isDesktop}
          />
        )}
        {perfil?.tipo === 'personal' && <DashboardPersonal perfil={perfil} activeTab={activeTab} onLogout={handleLogout} onOpenNotifs={() => setShowNotifs(true)} notifCount={notifs.length} isDesktop={isDesktop} />}
        {perfil?.tipo === 'nutricionista' && <DashboardNutricionista perfil={perfil} activeTab={activeTab} onLogout={handleLogout} onOpenNotifs={() => setShowNotifs(true)} notifCount={notifs.length} isDesktop={isDesktop} />}
      </div>

      {!isDesktop && <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, borderTop: '1px solid rgba(255,255,255,0.12)', paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(130%)', WebkitBackdropFilter: 'blur(24px) saturate(130%)' }}>
        <div style={{ maxWidth: 448, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px' }}>
          {getNavItems(perfil?.tipo).map((item) => {
            const active = activeTab === item.id
            return (
              <button key={item.id}
                onClick={() => {
                  if (item.id === 'perfil') router.push('/perfil')
                  else if (item.id === 'alunos') router.push('/personal')
                  else if (item.id === 'pacientes') router.push('/nutricionista/pacientes')
                  else if (item.id === 'agenda') router.push('/agenda')
                  else if (item.id === 'treino') router.push('/treino')
                  else if (item.id === 'evolucao') router.push('/evolucao')
                  else if (item.id === 'nutri') router.push('/nutricao')
                  else setActiveTab(item.id)
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 16, background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                <span style={{ color: active ? C.energy : C.t3, transition: 'all 0.2s' }}>
                  <item.Icon active={active} />
                </span>
                <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: active ? C.energy : C.t3 }}>
                  {item.label}
                </span>
                {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.energy }} />}
              </button>
            )
          })}
        </div>
      </nav>}
    </main>
  )
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</p>
      <p style={{ color: C.t1, fontSize: 14, fontWeight: 700, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{valor}</p>
    </div>
  )
}

// ─── CARD DECISÃO DO DIA ──────────────────────────────────────────────────────
function CardDecisaoDia({
  decisao, gerandoDecisao, temSonoHoje, router
}: {
  decisao: DecisaoDia
  gerandoDecisao: boolean
  temSonoHoje: boolean
  router: ReturnType<typeof useRouter>
}) {
  // Sem sono → convite para registrar
  if (!temSonoHoje) {
    return (
      <button onClick={() => router.push('/sono')}
        style={glass({ width: '100%', textAlign: 'left', padding: 20, marginBottom: 12, position: 'relative', overflow: 'hidden', cursor: 'pointer' }, `${C.sleep}1f`)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: `${C.sleep}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.sleep }}><Moon size={18} /></div>
          <div>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={10} /> Decisão do dia</p>
            <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>Registre seu sono</p>
          </div>
        </div>
        <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6 }}>Assim que você registrar como dormiu, a IA gera sua decisão do dia: o que treinar, o que comer e como se recuperar.</p>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.energy }} />
          <p style={{ color: C.energy, fontSize: 11, fontWeight: 600 }}>Registrar agora → 30 segundos</p>
        </div>
      </button>
    )
  }

  // Gerando...
  if (gerandoDecisao || (!decisao && temSonoHoje)) {
    return (
      <div style={glass({ padding: 20, marginBottom: 12, position: 'relative', overflow: 'hidden', border: `1px solid ${C.good}33` })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${C.energy}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          <p style={{ color: C.good, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={10} /> Gerando decisão do dia...</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 0.75, 0.55].map((w, i) => (
            <div key={i} style={{ height: 12, background: 'rgba(255,255,255,0.09)', borderRadius: 99, animation: 'pulse 1.5s ease-in-out infinite', width: `${w * 100}%` }} />
          ))}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      </div>
    )
  }

  if (!decisao) return null

  const cores = getCoresDecisao(decisao.cor)

  return (
    <div style={glass({ padding: 20, marginBottom: 12, position: 'relative', overflow: 'hidden', border: `1px solid ${cores.border}` }, `${cores.glow}2e`)}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 192, height: 192, borderRadius: '50%', filter: 'blur(48px)', opacity: 0.18, background: cores.glow }} />
      <div style={{ position: 'relative' }}>
        <p style={{ color: cores.badgeText, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}><Sparkles size={11} /> Decisão do dia</p>

        <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1.15, marginBottom: 4 }}>{decisao.decisao}</p>
        <p style={{ color: C.t2, fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>{decisao.motivo}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { Icon: Dumbbell, color: C.energy, label: 'Treino', val: decisao.treino },
            { Icon: Utensils, color: C.good, label: 'Nutrição', val: decisao.nutricao },
            { Icon: Moon, color: C.sleep, label: 'Sono', val: decisao.sono },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ flexShrink: 0, marginTop: 1, color: item.color }}><item.Icon size={16} /></span>
              <div>
                <span style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}: </span>
                <span style={{ color: C.t1, fontSize: 12, opacity: 0.85 }}>{item.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SonoMiniChart({ historico }: { historico: { data: string; score_recuperacao: number | null; qualidade: number | null }[] }) {
  const hoje = getTodayBR()
  const dotColor = (s: number) => getScoreHex(s)

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje + 'T12:00:00-03:00')
    d.setDate(d.getDate() - (6 - i))
    const ds = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const found = historico.find(s => s.data === ds)
    const score = found?.score_recuperacao ?? (found?.qualidade ? Math.round((found.qualidade / 5) * 100) : null)
    const raw = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')
    const dayName = raw.charAt(0).toUpperCase() + raw.slice(1, 3)
    return { score, dayName }
  })

  if (!dias.some(d => d.score != null)) return null

  const W = 280, H = 60, padX = 10, padY = 12
  const toY = (s: number) => H - padY - (s / 100) * (H - 2 * padY)
  const withX = dias.map((d, i) => ({ ...d, x: padX + (i / 6) * (W - 2 * padX) }))
  const valid = withX.filter(d => d.score != null) as (typeof withX[0] & { score: number })[]
  const last = valid[valid.length - 1]
  const lineColor = last ? dotColor(last.score) : C.good
  const smoothLine = valid.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x.toFixed(1)},${toY(pt.score).toFixed(1)}`
    const prev = valid[i - 1]
    const cpX = (prev.x + pt.x) / 2
    return `${acc} C${cpX.toFixed(1)},${toY(prev.score).toFixed(1)} ${cpX.toFixed(1)},${toY(pt.score).toFixed(1)} ${pt.x.toFixed(1)},${toY(pt.score).toFixed(1)}`
  }, '')
  const area = valid.length > 1 ? `${smoothLine} L${valid[valid.length-1].x.toFixed(1)},${H} L${valid[0].x.toFixed(1)},${H} Z` : ''
  const labelY = (pt: typeof valid[0]) => Math.max(10, toY(pt.score) - 7)

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Score · 7 dias</p>
        {last && <p style={{ color: lineColor, fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO }}>Hoje: {last.score}</p>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
        <defs>
          <linearGradient id="dashSonoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={toY(50)} x2={W - padX} y2={toY(50)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
        {area && <path d={area} fill="url(#dashSonoGrad)" />}
        {valid.length > 1 && <path d={smoothLine} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />}
        {valid.map((d, i) => (
          <circle key={i} cx={d.x} cy={toY(d.score)} r={d === last ? 4 : 2.5}
            fill={dotColor(d.score)} opacity={d === last ? 1 : 0.7}
            style={d === last ? { filter: `drop-shadow(0 0 4px ${dotColor(d.score)}99)` } : undefined} />
        ))}
        {last && <text x={last.x} y={labelY(last)} textAnchor="middle" fill={dotColor(last.score)} fontSize="8" fontWeight="bold">{last.score}</text>}
      </svg>
      <div style={{ display: 'flex', marginTop: 4 }}>
        {withX.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 8, fontFamily: FONT_MONO, color: d.score != null ? dotColor(d.score) : 'rgba(255,255,255,0.18)' }}>
              {d.score != null ? d.score : '—'}
            </span>
            <span style={{ color: C.t3, fontSize: 7, textTransform: 'uppercase' }}>{d.dayName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const size = 120, stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = getScoreHex(score)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 8px ${color}99)` }} />
      </svg>
      <div style={{ position: 'relative', textAlign: 'center', zIndex: 10 }}>
        <span style={{ fontSize: 38, fontFamily: FONT_DISPLAY, fontWeight: 900, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{score}</span>
        <span style={{ display: 'block', color: C.t3, fontSize: 9, marginTop: 1, letterSpacing: '0.08em' }}>/100</span>
      </div>
    </div>
  )
}

// ─── CARD META PESSOAL ────────────────────────────────────────────────────────
function CardMeta({
  perfil, pesoAtual, pesoDelta, userId, onSalvarMeta, router
}: {
  perfil: Perfil; pesoAtual: number | null; pesoDelta: number | null
  userId: string; onSalvarMeta: (metaPeso: number, metaData: string) => Promise<void>
  router: ReturnType<typeof useRouter>
}) {
  const [editando, setEditando] = useState(false)
  const [formMeta, setFormMeta] = useState({
    peso: perfil.meta_peso ? String(perfil.meta_peso) : '',
    data: perfil.meta_data_limite ?? '',
  })

  const metaPeso      = perfil.meta_peso
  const metaDataLimite = perfil.meta_data_limite
  const pesoBase      = perfil.peso
  const pesoCurrent   = pesoAtual ?? pesoBase

  const objetivoLower = (perfil.objetivo ?? '').toLowerCase()
  const goalIsGain    = objetivoLower.includes('hiper') || objetivoLower.includes('ganh') || objetivoLower.includes('mass')
  const metaSugerida  = !metaPeso && pesoCurrent
    ? (goalIsGain ? Math.round(pesoCurrent * 1.08) : Math.round(pesoCurrent * 0.91))
    : null
  const metaEfetiva   = metaPeso ?? metaSugerida
  const ehSugestao    = !metaPeso && !!metaSugerida

  const perder = metaEfetiva != null && pesoCurrent != null ? pesoCurrent > metaEfetiva : !goalIsGain

  function diasRestantes(): number | null {
    if (!metaDataLimite) return null
    const hoje = new Date(getTodayBR() + 'T12:00:00-03:00')
    const meta = new Date(metaDataLimite + 'T12:00:00-03:00')
    return Math.max(0, Math.round((meta.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)))
  }

  function progressoPct(): number {
    if (ehSugestao || !metaEfetiva || !pesoBase || pesoCurrent == null) return 0
    const total = Math.abs(metaEfetiva - pesoBase)
    if (total === 0) return 100
    if (perder ? pesoCurrent > pesoBase : pesoCurrent < pesoBase) return 0
    const feito = Math.abs(pesoCurrent - pesoBase)
    return Math.min(100, Math.max(0, Math.round((feito / total) * 100)))
  }

  const faltam = metaEfetiva != null && pesoCurrent != null
    ? Math.round(Math.abs(pesoCurrent - metaEfetiva) * 10) / 10
    : null
  const atingiu     = faltam !== null && faltam < 0.5
  const dias        = diasRestantes()
  const pct         = progressoPct()
  const totalGoal   = pesoCurrent != null && metaEfetiva != null ? Math.round(Math.abs(pesoCurrent - metaEfetiva) * 10) / 10 : null
  const deltaAlcancado = pesoBase != null && pesoCurrent != null
    ? Math.round(Math.abs(pesoBase - pesoCurrent) * 10) / 10
    : 0
  const progredindo = pesoBase != null && pesoCurrent != null
    ? (perder ? pesoCurrent <= pesoBase : pesoCurrent >= pesoBase)
    : false

  function handleSalvar() {
    const mp = parseFloat(formMeta.peso)
    if (!mp || !formMeta.data) return
    onSalvarMeta(mp, formMeta.data)
    setEditando(false)
  }

  const labelStyle: CSSProperties = { color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }
  const inputStyle: CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12, padding: '12px', color: C.t1, fontSize: 14, outline: 'none', fontFamily: FONT_BODY,
  }

  if (!metaEfetiva && !editando) {
    return (
      <button onClick={() => setEditando(true)}
        style={glass({ width: '100%', textAlign: 'left', padding: 20, marginBottom: 12, border: '1px dashed rgba(255,255,255,0.18)', cursor: 'pointer' })}>
        <p style={{ ...labelStyle, marginBottom: 12 }}>Meta pessoal</p>
        <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Definir minha meta →</p>
        <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6 }}>Onde você quer chegar? Defina seu peso-alvo e acompanhe cada kg de progresso.</p>
      </button>
    )
  }

  if (editando) {
    return (
      <div style={glass({ padding: 20, marginBottom: 12, border: `1px solid ${C.good}33` })}>
        <p style={{ ...labelStyle, marginBottom: 16 }}>Meta pessoal</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ color: C.t3, fontSize: 10, marginBottom: 6, display: 'block' }}>Peso-alvo (kg)</label>
            <input type="number" step="0.5" placeholder="Ex: 80" value={formMeta.peso}
              onChange={e => setFormMeta(p => ({ ...p, peso: e.target.value }))}
              style={inputStyle} />
          </div>
          <div>
            <label style={{ color: C.t3, fontSize: 10, marginBottom: 6, display: 'block' }}>Data-limite</label>
            <input type="date" value={formMeta.data}
              onChange={e => setFormMeta(p => ({ ...p, data: e.target.value }))}
              style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={handleSalvar}
              style={{ flex: 1, background: C.good, color: '#06231b', fontWeight: 700, padding: '12px', borderRadius: 12, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Salvar meta
            </button>
            <button onClick={() => setEditando(false)}
              style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: C.t2, fontSize: 14, background: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const Circ = 2 * Math.PI * 30 // circumference r=30 → ~188.5

  return (
    <div style={glass({ padding: 20, marginBottom: 12 }, `${C.energy}1f`)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={labelStyle}>Meta pessoal</p>
          {ehSugestao && <span style={{ fontSize: 9, color: C.good, border: `1px solid ${C.good}4d`, borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>IA</span>}
        </div>
        <button onClick={() => setEditando(true)}
          style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '6px 12px', background: 'none', cursor: 'pointer' }}>
          {ehSugestao ? 'confirmar' : 'editar'}
        </button>
      </div>

      {atingiu ? (
        <p style={{ color: C.good, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, marginBottom: 16 }}>Meta atingida!</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          {/* Gauge circular */}
          <div style={{ position: 'relative', flexShrink: 0, width: 76, height: 76 }}>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5.5" />
              <circle cx="38" cy="38" r="30" fill="none"
                stroke={ehSugestao ? C.good : (pct > 0 && progredindo ? C.good : pct === 0 ? C.t3 : C.danger)}
                strokeWidth="5.5" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * Circ} ${Circ}`}
                transform="rotate(-90 38 38)"
                style={{ transition: 'stroke-dasharray 0.7s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, lineHeight: 1 }}>{pct}%</span>
            </div>
          </div>

          {/* Info direita */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {ehSugestao ? (
              <>
                <p style={{ color: C.energy, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, lineHeight: 1.1, marginBottom: 2 }}>
                  {totalGoal != null ? `${perder ? '-' : '+'}${totalGoal.toFixed(1)} kg` : '—'}
                </p>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 12 }}>objetivo sugerido pela IA</p>
              </>
            ) : (
              <>
                <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, lineHeight: 1.1, marginBottom: 2 }}>
                  {faltam != null ? `${faltam.toFixed(1)} kg` : '—'}
                </p>
                <p style={{ color: C.t2, fontSize: 12, marginBottom: 12 }}>
                  {deltaAlcancado > 0 && progredindo ? `${deltaAlcancado.toFixed(1)} kg já conquistados` : 'faltam para a meta'}
                </p>
              </>
            )}
            {/* Chips INÍCIO · HOJE · META */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!ehSugestao && pesoBase != null && (
                <>
                  <div>
                    <p style={{ color: C.t2, fontSize: 12, fontWeight: 700, lineHeight: 1.1, fontFamily: FONT_MONO }}>{pesoBase} kg</p>
                    <p style={{ color: C.t3, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>início</p>
                  </div>
                  <span style={{ color: C.t3, fontSize: 10 }}>→</span>
                </>
              )}
              <div>
                <p style={{ color: C.t1, fontSize: 12, fontWeight: 800, lineHeight: 1.1, fontFamily: FONT_MONO }}>{pesoCurrent != null ? `${pesoCurrent} kg` : '—'}</p>
                <p style={{ color: C.t3, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>hoje</p>
              </div>
              <span style={{ color: C.t3, fontSize: 10 }}>→</span>
              <div>
                <p style={{ color: C.energy, fontSize: 12, fontWeight: 700, lineHeight: 1.1, fontFamily: FONT_MONO }}>{metaEfetiva} kg</p>
                <p style={{ color: C.t3, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>meta</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de progresso */}
      {!atingiu && (
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.7s ease', width: `${pct}%`, background: ehSugestao ? `${C.good}4d` : C.good }} />
        </div>
      )}

      {/* Rodapé */}
      {ehSugestao ? (
        <button onClick={() => setEditando(true)}
          style={{ width: '100%', background: `${C.energy}1a`, border: `1px solid ${C.energy}33`, color: C.energy2, fontWeight: 700, padding: '12px', borderRadius: 12, fontSize: 14, letterSpacing: '0.04em', cursor: 'pointer' }}>
          Confirmar esta meta →
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {!atingiu && faltam != null && (
            <p style={{ color: C.t2, fontSize: 12, flex: 1 }}>
              {metaDataLimite && `até ${new Date(metaDataLimite + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
              {dias != null && metaDataLimite && ` · `}
              {dias != null && <span style={{ color: C.t1, fontWeight: 600 }}>{dias}d</span>}
            </p>
          )}
          <button onClick={() => router.push('/evolucao-medidas/' + userId)}
            style={{ fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
            VER EVOLUÇÃO →
          </button>
        </div>
      )}
    </div>
  )
}

function DashboardCliente({
  perfil, bemEstar, scoreRecuperacao, streak, recentDays, sonoHistorico, vinculos, treinoHoje, nutricaoHoje,
  decisaoDia, gerandoDecisao, temSonoHoje, userId, pesoAtual, pesoDelta, onSalvarMeta,
  onLogout: _onLogout, onOpenNotifs, notifCount, planoNutriRefeicoes, fasePeriodizacao, isDesktop,
}: {
  perfil: Perfil; bemEstar: BemEstar; scoreRecuperacao: number | null; streak: number
  recentDays: boolean[]; sonoHistorico: { data: string; score_recuperacao: number | null; qualidade: number | null }[]
  vinculos: Vinculo[]; treinoHoje: { nome: string; plano: string; concluido: boolean } | null
  nutricaoHoje: NutricaoHoje; decisaoDia: DecisaoDia; gerandoDecisao: boolean; temSonoHoje: boolean
  activeTab: string; userId: string; pesoAtual: number | null; pesoDelta: number | null
  onSalvarMeta: (metaPeso: number, metaData: string) => Promise<void>
  onLogout: () => void; onOpenNotifs: () => void; notifCount: number
  planoNutriRefeicoes: { nome: string; horario: string; calorias: number; proteina: number; alimentos: { nome: string; quantidade: string }[] }[]
  fasePeriodizacao: { nomeBloco: string; tipoBloco: string; semanaBloco: number; semanasBloco: number; semanaTotal: number; totalSemanas: number; descricao: string | null } | null
  isDesktop?: boolean
}) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)
  const scoreColor     = scoreRecuperacao ? getScoreHex(scoreRecuperacao) : C.good
  const vinculoNutri   = vinculos.find(v => v?.tipo === 'nutricionista')

  function getRefeicaoAtual() {
    if (!planoNutriRefeicoes.length) return null
    const agora = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }), 10) * 60
      + parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', minute: 'numeric' }), 10)
    const comHorario = planoNutriRefeicoes.filter(r => r.horario).map(r => {
      const [h, m] = r.horario.split(':').map(Number)
      return { ...r, minutos: (h || 0) * 60 + (m || 0) }
    }).sort((a, b) => a.minutos - b.minutos)
    if (!comHorario.length) return planoNutriRefeicoes[0]
    // Próxima refeição (horário >= agora) ou a última do dia
    return comHorario.find(r => r.minutos >= agora) ?? comHorario[comHorario.length - 1]
  }
  const refeicaoAtual = getRefeicaoAtual()
  const vinculoPersonal = vinculos.find(v => v?.tipo === 'personal')

  const iconBtnStyle: CSSProperties = {
    position: 'relative', width: 36, height: 36, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.15s',
  }

  return (
    <div style={{ maxWidth: isDesktop ? 1200 : 448, margin: '0 auto', padding: isDesktop ? '36px 32px' : '0 16px', paddingTop: isDesktop ? 36 : 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ color: C.t2, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{getGreeting()}</p>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: C.t1 }}>{firstName}</h1>
          <p style={{ color: C.t3, fontSize: 11, marginTop: 6 }}>{getTodayString()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onOpenNotifs} style={iconBtnStyle}>
            <Bell size={16} style={{ color: C.t2 }} />
            {notifCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: C.energy, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
          <button onClick={() => router.push('/perfil')} style={{ width: 36, height: 36, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: FONT_DISPLAY }}>{initials}</span>
          </button>
        </div>
      </div>

      {/* ── GRID DESKTOP: 2 colunas / Mobile: 1 coluna ── */}
      <div style={{
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '1fr 1.4fr' : undefined,
        gap: isDesktop ? 20 : undefined,
        alignItems: 'start',
      }}>

      {/* COLUNA ESQUERDA */}
      <div>
      {/* Meta pessoal — primeiro da home, motivação central */}
      <CardMeta
        perfil={perfil}
        pesoAtual={pesoAtual}
        pesoDelta={pesoDelta}
        userId={userId}
        onSalvarMeta={onSalvarMeta}
        router={router}
      />

      {/* Decisão do dia — só aparece quando há sono registrado */}
      {temSonoHoje && (
        <CardDecisaoDia
          decisao={decisaoDia}
          gerandoDecisao={gerandoDecisao}
          temSonoHoje={temSonoHoje}
          router={router}
        />
      )}

      </div>{/* fim coluna esquerda */}

      {/* COLUNA DIREITA */}
      <div>
      {/* Score de recuperação */}
      {scoreRecuperacao ? (
        <button onClick={() => router.push('/sono')}
          style={glass({ width: '100%', textAlign: 'left', padding: 24, marginBottom: 12, position: 'relative', overflow: 'hidden', cursor: 'pointer' }, `${scoreColor}26`)}>
          <div style={{ position: 'absolute', top: -48, right: -48, width: 224, height: 224, borderRadius: '50%', filter: 'blur(48px)', opacity: 0.16, background: scoreColor }} />
          <div style={{ position: 'relative' }}>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 16 }}>Recuperação hoje</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ScoreRing score={scoreRecuperacao} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.15, marginBottom: 4, color: scoreColor }}>{getScoreLabel(scoreRecuperacao)}</p>
                <p style={{ color: C.t3, fontSize: 11, marginBottom: 12 }}>Ver análise completa →</p>
                {bemEstar && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Metrica label="Energia"   valor={`${bemEstar.energia}/5`} />
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                    <Metrica label="Humor"     valor={`${bemEstar.humor}/5`} />
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                    <Metrica label="Dor musc." valor={`${6 - bemEstar.dor_muscular}/5`} />
                  </div>
                )}
              </div>
            </div>
            <SonoMiniChart historico={sonoHistorico} />
          </div>
        </button>
      ) : (
        <button onClick={() => router.push('/sono')}
          style={glass({ width: '100%', textAlign: 'left', padding: 24, marginBottom: 12, position: 'relative', overflow: 'hidden', cursor: 'pointer' })}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Recuperação hoje</p>
            <span style={{ fontSize: 9, color: C.t3, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>demo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: 0.5 }}>
            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                <circle cx="36" cy="36" r="28" fill="none" stroke={C.good} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - 72 / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontFamily: FONT_DISPLAY, fontWeight: 800, color: C.t1, fontVariantNumeric: 'tabular-nums' }}>72</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 16, fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.15, marginBottom: 4, color: C.good }}>Boa recuperação</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div><p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Energia</p><p style={{ color: C.t2, fontSize: 12, fontWeight: 700 }}>4/5</p></div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div><p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Humor</p><p style={{ color: C.t2, fontSize: 12, fontWeight: 700 }}>4/5</p></div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div><p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dor musc.</p><p style={{ color: C.t2, fontSize: 12, fontWeight: 700 }}>4/5</p></div>
              </div>
            </div>
          </div>
          <p style={{ color: C.t3, fontSize: 12, marginTop: 16 }}>Registre seu sono para ativar seu score real →</p>
        </button>
      )}

      {/* Fase de periodização */}
      {fasePeriodizacao && (() => {
        const CORES_FASE: Record<string, string> = {
          adaptacao:   C.good,
          hipertrofia: C.good,
          forca:       C.sleep,
          deload:      C.t2,
          potencia:    C.energy,
          resistencia: C.recovery,
        }
        const cor = CORES_FASE[fasePeriodizacao.tipoBloco] ?? C.good
        const pct = Math.min(100, (fasePeriodizacao.semanaBloco / fasePeriodizacao.semanasBloco) * 100)
        return (
          <div style={glass({ padding: 20, marginBottom: 12, border: `1px solid ${cor}33` })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Fase atual</p>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
                Sem. {fasePeriodizacao.semanaBloco}/{fasePeriodizacao.semanasBloco}
              </span>
            </div>
            <p style={{ fontSize: 20, fontFamily: FONT_DISPLAY, fontWeight: 800, marginBottom: 12, color: cor }}>{fasePeriodizacao.nomeBloco}</p>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.09)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', borderRadius: 99, background: cor, width: `${pct}%` }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: C.t3, fontSize: 10 }}>Semana {fasePeriodizacao.semanaTotal} de {fasePeriodizacao.totalSemanas} no ciclo</p>
              {fasePeriodizacao.descricao && <p style={{ color: C.t2, fontSize: 10, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fasePeriodizacao.descricao}</p>}
            </div>
          </div>
        )
      })()}

      {/* Treino de hoje */}
      <div style={glass({ padding: 20, marginBottom: 12 })}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Treino de hoje</p>
          <div style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${treinoHoje?.concluido ? `${C.good}33` : `${C.warn}33`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: treinoHoje?.concluido ? `${C.good}1a` : `${C.warn}1a`, color: treinoHoje?.concluido ? C.good : C.warn }}>
            {treinoHoje?.concluido ? <Check size={18} /> : <Dumbbell size={18} />}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: C.t1, fontWeight: 700, fontSize: 16, marginBottom: 2, fontFamily: FONT_DISPLAY }}>
            {treinoHoje ? treinoHoje.nome : 'Escolha seu treino'}
          </p>
          {treinoHoje?.concluido ? (
            <p style={{ color: C.good, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Concluído hoje</p>
          ) : vinculoPersonal ? (
            <p style={{ color: C.sleep, fontWeight: 700, fontSize: 14 }}>{vinculoPersonal.nome ?? vinculoPersonal.email}</p>
          ) : (
            <p style={{ color: C.t3, fontSize: 12 }}>Seus planos estão prontos</p>
          )}
        </div>
        <button onClick={() => router.push('/treino')}
          style={{ width: '100%', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', fontWeight: 700, padding: '14px', borderRadius: 12, fontSize: 14, letterSpacing: '0.03em', border: 'none', cursor: 'pointer', boxShadow: `0 8px 24px ${C.energy}44` }}>
          {treinoHoje?.concluido ? 'Ver treinos' : 'Ir para treino do dia →'}
        </button>
      </div>

      {/* Nutrição */}
      <button onClick={() => router.push('/nutricao')}
        style={glass({ width: '100%', textAlign: 'left', padding: 20, marginBottom: 12, cursor: 'pointer' })}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Minha nutrição</p>
            {vinculoNutri && (
              <p style={{ color: C.good, fontWeight: 700, fontSize: 14, marginTop: 2 }}>{vinculoNutri.nome ?? vinculoNutri.email}</p>
            )}
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${vinculoNutri ? `${C.good}33` : 'rgba(255,255,255,0.11)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: vinculoNutri ? `${C.good}1a` : 'rgba(255,255,255,0.07)', color: vinculoNutri ? C.good : C.t3 }}><Utensils size={18} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          {vinculoNutri && refeicaoAtual ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <p style={{ color: C.t1, fontWeight: 700, fontSize: 16, fontFamily: FONT_DISPLAY }}>{refeicaoAtual.nome}</p>
                {refeicaoAtual.horario && (
                  <span style={{ color: C.t2, fontSize: 12 }}>{refeicaoAtual.horario}</span>
                )}
              </div>
              {refeicaoAtual.alimentos?.length > 0 && (
                <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {refeicaoAtual.alimentos.slice(0, 3).map(a => a.nome).join(', ')}
                  {refeicaoAtual.alimentos.length > 3 ? ` +${refeicaoAtual.alimentos.length - 3} alimento${refeicaoAtual.alimentos.length - 3 > 1 ? 's' : ''}` : ''}
                </p>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                {refeicaoAtual.calorias > 0 && (
                  <span style={{ color: C.energy2, fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO }}>{refeicaoAtual.calorias} kcal</span>
                )}
                {refeicaoAtual.proteina > 0 && (
                  <span style={{ color: C.sleep, fontSize: 12, fontFamily: FONT_MONO }}>{refeicaoAtual.proteina}g prot</span>
                )}
              </div>
            </>
          ) : (
            <>
              <p style={{ color: C.t1, fontWeight: 700, fontSize: 16, marginBottom: 2, fontFamily: FONT_DISPLAY }}>
                {vinculoNutri ? 'Plano ativo' : 'Sem plano alimentar'}
              </p>
              {!vinculoNutri && (
                <p style={{ color: C.t3, fontSize: 12 }}>Conecte um nutricionista para receber seu plano</p>
              )}
            </>
          )}
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.09)', color: C.t1, fontWeight: 700, padding: '14px', borderRadius: 12, fontSize: 14, textAlign: 'center', letterSpacing: '0.03em' }}>
          Ver meu plano alimentar →
        </div>
      </button>

      {/* Meu time */}
      <div style={glass({ padding: 20, marginBottom: 12 })}>
        <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Meu time</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { tipo: 'personal',      label: 'Personal Trainer', cor: C.sleep, Icon: Dumbbell },
            { tipo: 'nutricionista', label: 'Nutricionista',    cor: C.good,  Icon: Utensils },
          ].map((p, i) => {
            const vinculo = vinculos.find(v => v?.tipo === p.tipo)
            return (
              <div key={p.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${p.cor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${p.cor}1a`, color: p.cor }}><p.Icon size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</p>
                    {vinculo
                      ? <p style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: p.cor, fontFamily: FONT_DISPLAY }}>{vinculo.nome ?? vinculo.email}</p>
                      : <p style={{ color: C.t3, fontSize: 14, marginTop: 2 }}>Não conectado</p>}
                  </div>
                  {!vinculo && (
                    <button onClick={() => router.push('/convite')}
                      style={{ fontSize: 10, color: C.t2, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '6px 12px', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={11} /> Conectar
                    </button>
                  )}
                  {vinculo && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.good, flexShrink: 0 }} />}
                </div>
                {i === 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginTop: 12 }} />}
              </div>
            )
          })}
        </div>
      </div>
      </div>{/* fim coluna direita */}
      </div>{/* fim grid */}
    </div>
  )
}

function DashboardPersonal({ perfil, onLogout, onOpenNotifs, notifCount, isDesktop }: { perfil: Perfil; activeTab: string; onLogout: () => void; onOpenNotifs: () => void; notifCount: number; isDesktop?: boolean }) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [treinaramHoje, setTreinaramHoje] = useState(0)
  const [alertas, setAlertas] = useState(0)
  const [alunosRecentes, setAlunosRecentes] = useState<{ nome: string | null; email: string; treinouHoje: boolean; score: number | null }[]>([])
  const [notifBlocos, setNotifBlocos] = useState<{ clienteId: string; nome: string | null; email: string; blocoAtual: string; proximoBloco: string; diasRestantes: number }[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function carregarStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: vinculos } = await supabase.from('vinculos').select('cliente_id').eq('profissional_id', session.user.id).eq('tipo', 'personal').eq('ativo', true)
      if (!vinculos?.length) { setLoadingStats(false); return }
      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const ids = vinculos.map(v => v.cliente_id)
      setTotalAlunos(ids.length)
      const [{ data: perfis }, { data: treinosHoje }, { data: treinos7d }, { data: scores }] = await Promise.all([
        supabase.from('perfis').select('id, nome, email').in('id', ids),
        supabase.from('treinos').select('cliente_id').eq('concluido', true).eq('data', hoje).in('cliente_id', ids),
        supabase.from('treinos').select('cliente_id, data').eq('concluido', true).gte('data', semanaStr).in('cliente_id', ids),
        supabase.from('sono').select('usuario_id, score_recuperacao').eq('data', hoje).in('usuario_id', ids),
      ])
      const treinaramSet = new Set(treinosHoje?.map(t => t.cliente_id) ?? [])
      const scoreMap = new Map(scores?.map(s => [s.usuario_id, s.score_recuperacao]) ?? [])
      const treinos7dSet = new Map<string, number>()
      treinos7d?.forEach(t => treinos7dSet.set(t.cliente_id, (treinos7dSet.get(t.cliente_id) ?? 0) + 1))
      const alertasCount = ids.filter(id => (treinos7dSet.get(id) ?? 0) === 0).length
      setTreinaramHoje(treinaramSet.size)
      setAlertas(alertasCount)
      setAlunosRecentes((perfis ?? []).map(p => ({ nome: p.nome, email: p.email, treinouHoje: treinaramSet.has(p.id), score: scoreMap.get(p.id) ?? null })).slice(0, 4))

      // Notificações de fim de bloco
      const { data: perisAtivas } = await supabase.from('periodizacoes').select('id,nome,data_inicio,cliente_id').in('cliente_id', ids).eq('personal_id', session.user.id).eq('status', 'ativo')
      if (perisAtivas?.length) {
        const notifs: typeof notifBlocos = []
        for (const peri of perisAtivas) {
          const { data: blocos } = await supabase.from('blocos_periodizacao').select('nome,tipo,semanas,ordem').eq('periodizacao_id', peri.id).order('ordem')
          if (!blocos?.length) continue
          const inicio = new Date(peri.data_inicio + 'T12:00:00-03:00')
          const diasTotais = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24))
          if (diasTotais < 0) continue
          const semanaTotal = Math.floor(diasTotais / 7) + 1
          let acum = 0, blocoIdx = blocos.length - 1
          for (let i = 0; i < blocos.length; i++) {
            if (semanaTotal <= acum + blocos[i].semanas) { blocoIdx = i; break }
            acum += blocos[i].semanas
          }
          if (blocoIdx >= blocos.length - 1) continue // já no último bloco
          const b = blocos[blocoIdx]
          const semanaNoBloco = semanaTotal - acum
          const semanasRestantes = b.semanas - semanaNoBloco
          const diasRestantes = semanasRestantes * 7
          const threshold = Math.max(7, Math.round(b.semanas * 0.35) * 7)
          if (diasRestantes <= threshold) {
            const proximo = blocos[blocoIdx + 1]
            const perfil = perfis?.find((p: any) => p.id === peri.cliente_id)
            notifs.push({ clienteId: peri.cliente_id, nome: perfil?.nome ?? null, email: perfil?.email ?? '', blocoAtual: b.nome, proximoBloco: proximo.nome, diasRestantes })
          }
        }
        setNotifBlocos(notifs)
      }

      setLoadingStats(false)
    }
    carregarStats()
  }, [])

  return (
    <div className="max-w-md mx-auto md:max-w-[1100px] md:px-10" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))', paddingBottom: '7rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ color: C.t2, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{getGreeting()}</p>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.t1 }}>{firstName}</h1>
          <p style={{ color: C.t3, fontSize: 11, marginTop: 4 }}>{getTodayString()}</p>
        </div>
        <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onOpenNotifs} style={{ position: 'relative', width: 36, height: 36, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
            <Bell size={16} style={{ color: C.t2 }} />
            {notifCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: C.energy, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
        </div>
      </div>
      <div className="md:hidden" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 99, padding: '6px 12px', marginBottom: 24, border: `1px solid ${C.sleep}33`, background: `${C.sleep}12` }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.sleep, flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <span style={{ color: C.sleep, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>Personal Trainer</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { valor: loadingStats ? '—' : String(totalAlunos),   label: 'Alunos',    sub: 'ativos',         cor: C.t1 },
          { valor: loadingStats ? '—' : String(treinaramHoje), label: 'Treinaram', sub: 'hoje',           cor: treinaramHoje > 0 ? C.good : C.t1 },
          { valor: loadingStats ? '—' : String(alertas),       label: 'Alertas',   sub: 'sem treinar 7d', cor: alertas > 0 ? C.energy : C.t1 },
        ].map((m) => (
          <div key={m.label} style={glass({ padding: 20 })}>
            <p style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>{m.label}</p>
            <p style={{ fontSize: 44, fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: m.cor, fontVariantNumeric: 'tabular-nums' }}>{m.valor}</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
              <p style={{ color: C.t3, fontSize: 12 }}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>
      {!loadingStats && totalAlunos === 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden', border: `1px solid ${C.sleep}33` })}>
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.sleep}1a` }}>
            <p style={{ color: C.sleep, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>Primeiros passos</p>
            <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Bem-vindo ao KORE, {firstName}!</p>
            <p style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>Siga os passos abaixo para começar a acompanhar seus alunos.</p>
          </div>
          <div>
            {[
              { num: '1', done: true,  label: 'Criar sua conta', desc: 'Feito! Você está dentro.' },
              { num: '2', done: false, label: 'Convidar seu primeiro aluno', desc: 'Envie um link por email — leva 30 segundos.', action: () => router.push('/convite'), actionLabel: 'Convidar agora →' },
              { num: '3', done: false, label: 'Montar o treino do aluno', desc: 'Após aceitar o convite, monte o plano de treino.', action: null, actionLabel: null },
            ].map((s, idx) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px', borderTop: idx > 0 ? `1px solid ${C.sleep}14` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 11, fontWeight: 800, background: s.done ? `${C.good}26` : `${C.sleep}1a`, border: `1px solid ${s.done ? `${C.good}4d` : `${C.sleep}33`}`, color: s.done ? C.good : C.sleep }}>
                  {s.done ? <Check size={13} /> : s.num}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: s.done ? C.t3 : C.t1, textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</p>
                  <p style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>{s.desc}</p>
                  {s.action && (
                    <button onClick={s.action} style={{ marginTop: 8, fontSize: 12, color: C.sleep, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {s.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alunosRecentes.length > 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden' })}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Seus alunos hoje</p>
            <button onClick={() => router.push('/personal')} style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todos →</button>
          </div>
          <div>
            {alunosRecentes.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, background: a.treinouHoje ? `${C.good}1a` : 'rgba(255,255,255,0.07)', color: a.treinouHoje ? C.good : C.t2 }}>
                  {(a.nome ?? a.email)[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.t1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome ?? a.email.split('@')[0]}</p>
                  <p style={{ fontSize: 11, color: a.treinouHoje ? C.good : C.t3 }}>{a.treinouHoje ? '✓ Treinou hoje' : 'Não treinou hoje'}</p>
                </div>
                {a.score && <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: FONT_MONO, color: a.score >= 70 ? C.good : a.score >= 50 ? C.warn : C.danger }}>{a.score}/100</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {notifBlocos.length > 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden', border: `1px solid ${C.sleep}33` })}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.sleep}1a`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.sleep }}><Calendar size={14} /></span>
            <p style={{ color: C.sleep, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Prepare os próximos blocos</p>
          </div>
          <div>
            {notifBlocos.map((n, i) => (
              <button key={i} onClick={() => router.push(`/personal/aluno/${n.clienteId}`)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', borderTop: i > 0 ? `1px solid ${C.sleep}14` : 'none', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: 12, background: `${C.sleep}1a`, border: `1px solid ${C.sleep}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: C.sleep, fontSize: 12, fontWeight: 800 }}>{(n.nome ?? n.email)[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.t1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nome ?? n.email.split('@')[0]}</p>
                  <p style={{ color: C.t3, fontSize: 10 }}>{n.blocoAtual} → <span style={{ color: C.sleep, fontWeight: 600 }}>{n.proximoBloco}</span> em {n.diasRestantes}d</p>
                </div>
                <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {alertas > 0 && (
        <div style={glass({ padding: 16, border: `1px solid ${C.energy}33`, marginBottom: 16 }, `${C.energy}1a`)}>
          <p style={{ color: C.energy, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {alertas} aluno{alertas > 1 ? 's' : ''} sem treinar há 7+ dias</p>
          <p style={{ color: C.t2, fontSize: 12 }}>Acesse a lista de alunos para ver quem precisa de atenção.</p>
          <button onClick={() => router.push('/personal')} style={{ marginTop: 12, fontSize: 11, border: `1px solid ${C.energy}4d`, color: C.energy, borderRadius: 8, padding: '6px 12px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', cursor: 'pointer' }}>Ver alunos →</button>
        </div>
      )}
      <button onClick={() => router.push('/personal')} style={glass({ width: '100%', color: C.t2, fontWeight: 600, padding: '14px', fontSize: 14, marginBottom: 12, cursor: 'pointer' })}>Ver todos os alunos</button>
      <button onClick={() => router.push('/convite')} style={{ width: '100%', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', fontWeight: 700, padding: '16px', borderRadius: 20, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: `0 8px 24px ${C.energy}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><UserPlus size={16} /> Convidar aluno</button>
    </div>
  )
}

function DashboardNutricionista({ perfil, onLogout, onOpenNotifs, notifCount, isDesktop }: { perfil: Perfil; activeTab: string; onLogout: () => void; onOpenNotifs: () => void; notifCount: number; isDesktop?: boolean }) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)

  const [loadingStats, setLoadingStats] = useState(true)
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [boaRecuperacao, setBoaRecuperacao] = useState(0)
  const [treinaram7d, setTreinaram7d] = useState(0)
  const [semPlano, setSemPlano] = useState(0)
  const [sparklines, setSparklines] = useState<{ pacientes: number[]; recuperacao: number[]; treinos: number[] }>({
    pacientes: [2,2,2,2,2], recuperacao: [0,0,0,0,0], treinos: [0,0,0,0,0]
  })
  const [pacientesRecentes, setPacientesRecentes] = useState<{
    id: string; nome: string | null; email: string
    sonoScore: number | null; treinos7d: number; kcal7d: number
    temPlano: boolean; diasDesdeUltimoPlano: number | null
  }[]>([])
  const [planosParaRevisar, setPlanosParaRevisar] = useState<{
    pacienteId: string; nome: string | null; email: string; diasDesdeRevisao: number
  }[]>([])
  const [consultasHoje, setConsultasHoje] = useState<{
    id: string; hora: string; tipo: string; clienteNome: string | null; clienteId: string
  }[]>([])
  const [semSono7d, setSemSono7d] = useState<{ id: string; nome: string | null; email: string }[]>([])

  useEffect(() => {
    async function carregarStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const hoje = getTodayBR()
      const hojeDate = new Date(hoje + 'T12:00:00-03:00')
      const domingoSemana = new Date(hojeDate)
      domingoSemana.setDate(hojeDate.getDate() - hojeDate.getDay())
      const semStr = domingoSemana.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const { data: vinculos } = await supabase.from('vinculos').select('cliente_id').eq('profissional_id', session.user.id).eq('tipo', 'nutricionista').eq('ativo', true)
      if (!vinculos?.length) { setLoadingStats(false); return }

      const ids = vinculos.map(v => v.cliente_id)
      setTotalPacientes(ids.length)

      const [{ data: perfis }, { data: sonos }, { data: treinos }, { data: atividades }, { data: planos }] = await Promise.all([
        supabase.from('perfis').select('id, nome, email').in('id', ids),
        supabase.from('sono').select('usuario_id, score_recuperacao').in('usuario_id', ids).eq('data', hoje),
        supabase.from('treinos').select('cliente_id, calorias_estimadas').in('cliente_id', ids).gte('data', semStr).eq('concluido', true),
        supabase.from('atividades_livres').select('usuario_id, calorias_estimadas, calorias_wearable').in('usuario_id', ids).gte('data', semStr),
        supabase.from('planos_nutricionais').select('usuario_id, created_at').in('usuario_id', ids).eq('ativo', true).order('created_at', { ascending: false }),
      ])

      const sonoMap = new Map(sonos?.map(s => [s.usuario_id, s.score_recuperacao]) ?? [])
      const treinos7dSet = new Map<string, number>()
      const kcalMap = new Map<string, number>()
      treinos?.forEach(t => {
        treinos7dSet.set(t.cliente_id, (treinos7dSet.get(t.cliente_id) ?? 0) + 1)
        if (t.calorias_estimadas) kcalMap.set(t.cliente_id, (kcalMap.get(t.cliente_id) ?? 0) + t.calorias_estimadas)
      })
      atividades?.forEach(a => {
        treinos7dSet.set(a.usuario_id, (treinos7dSet.get(a.usuario_id) ?? 0) + 1)
        const kcal = a.calorias_wearable ?? a.calorias_estimadas ?? 0
        if (kcal) kcalMap.set(a.usuario_id, (kcalMap.get(a.usuario_id) ?? 0) + kcal)
      })

      // Plano mais recente por paciente
      const planoMaisRecenteMap = new Map<string, string>()
      planos?.forEach(p => { if (!planoMaisRecenteMap.has(p.usuario_id)) planoMaisRecenteMap.set(p.usuario_id, p.created_at) })
      const planosSet = new Set(planoMaisRecenteMap.keys())

      // Planos para revisar (>30 dias sem atualização)
      const hoje30 = Date.now()
      const revisarList: typeof planosParaRevisar = []
      planoMaisRecenteMap.forEach((createdAt, pacienteId) => {
        const dias = Math.floor((hoje30 - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
        if (dias >= 30) {
          const p = perfis?.find((pf: any) => pf.id === pacienteId)
          revisarList.push({ pacienteId, nome: p?.nome ?? null, email: p?.email ?? '', diasDesdeRevisao: dias })
        }
      })
      setPlanosParaRevisar(revisarList.sort((a, b) => b.diasDesdeRevisao - a.diasDesdeRevisao))

      // Consultas de hoje
      const { data: agendHoje } = await supabase.from('agendamentos')
        .select('id, hora, tipo, cliente_id').eq('profissional_id', session.user.id)
        .eq('data', hoje).eq('status', 'agendado').order('hora')
      if (agendHoje?.length) {
        const clienteIds = agendHoje.map((a: any) => a.cliente_id)
        const { data: clientePerfs } = await supabase.from('perfis').select('id, nome').in('id', clienteIds)
        setConsultasHoje(agendHoje.map((a: any) => ({
          id: a.id, hora: a.hora?.substring(0,5) ?? '', tipo: a.tipo,
          clienteId: a.cliente_id,
          clienteNome: clientePerfs?.find((p: any) => p.id === a.cliente_id)?.nome ?? null,
        })))
      }

      // Pacientes sem sono em 7 dias (risco)
      const sete = new Date(); sete.setDate(sete.getDate() - 7)
      const seteStr = sete.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const { data: somSono7d } = await supabase.from('sono').select('usuario_id').in('usuario_id', ids).gte('data', seteStr)
      const temSonoSet = new Set(somSono7d?.map((s: any) => s.usuario_id) ?? [])
      const semSonoList = (perfis ?? []).filter((p: any) => !temSonoSet.has(p.id)).slice(0, 3)
      setSemSono7d(semSonoList.map((p: any) => ({ id: p.id, nome: p.nome, email: p.email })))

      setBoaRecuperacao(ids.filter(id => (sonoMap.get(id) ?? 0) >= 60).length)
      setTreinaram7d(ids.filter(id => (treinos7dSet.get(id) ?? 0) > 0).length)
      setSemPlano(ids.filter(id => !planosSet.has(id)).length)

      const recentes = (perfis ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        sonoScore: sonoMap.get(p.id) ?? null,
        treinos7d: treinos7dSet.get(p.id) ?? 0,
        kcal7d: kcalMap.get(p.id) ?? 0,
        temPlano: planosSet.has(p.id),
        diasDesdeUltimoPlano: planoMaisRecenteMap.has(p.id)
          ? Math.floor((hoje30 - new Date(planoMaisRecenteMap.get(p.id)!).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }))
      setPacientesRecentes(recentes)
      setLoadingStats(false)
    }
    carregarStats()
  }, [])

  return (
    <div className="max-w-md mx-auto md:max-w-[1100px] md:px-10" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))', paddingBottom: '7rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <p style={{ color: C.t2, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{getGreeting()}</p>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.t1, lineHeight: 1 }}>{firstName}</h1>
          <p style={{ color: C.t3, fontSize: 14, marginTop: 6 }}>{getTodayString()}</p>
        </div>
        <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onOpenNotifs} style={{ position: 'relative', width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
            <Bell size={16} style={{ color: C.t2 }} />
            {notifCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: C.energy, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
        </div>
      </div>
      <div className="md:hidden" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 99, padding: '6px 12px', marginBottom: 24, border: `1px solid ${C.good}33`, background: `${C.good}12` }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.good, flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <span style={{ color: C.good, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>Nutricionista</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { valor: loadingStats ? '—' : String(totalPacientes),  label: 'Pacientes',       sub: 'ativos',      spark: sparklines.pacientes,    cor: C.sleep },
          { valor: loadingStats ? '—' : String(boaRecuperacao),  label: 'Boa recuperação', sub: 'hoje',        spark: sparklines.recuperacao,  cor: C.good },
          { valor: loadingStats ? '—' : String(treinaram7d),     label: 'Treinaram',       sub: 'essa semana', spark: sparklines.treinos,      cor: C.energy },
        ].map((m) => (
          <div key={m.label} style={glass({ padding: 20, position: 'relative', overflow: 'hidden', border: `1px solid ${m.cor}22` })}>
            <div style={{ position: 'absolute', top: -32, right: -32, width: 96, height: 96, borderRadius: '50%', background: m.cor, opacity: 0.07, filter: 'blur(24px)', pointerEvents: 'none' }} />
            <p style={{ fontSize: 10, color: m.cor, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, fontWeight: 600, opacity: 0.9 }}>{m.label}</p>
            <p style={{ color: m.cor, fontSize: 44, fontFamily: FONT_DISPLAY, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 32px ${m.cor}44` }}>{m.valor}</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
              <p style={{ color: C.t3, fontSize: 11 }}>{m.sub}</p>
              {m.spark.some(v => v > 0) && <MiniSparkline values={m.spark} color={m.cor} />}
            </div>
          </div>
        ))}
      </div>

      {/* Consultas de hoje */}
      {consultasHoje.length > 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden' })}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: C.t1, fontWeight: 600, fontSize: 14, fontFamily: FONT_DISPLAY }}>Consultas de hoje</p>
            <span style={{ color: C.t3, fontSize: 12 }}>{consultasHoje.length} agendada{consultasHoje.length !== 1 ? 's' : ''}</span>
          </div>
          <div>
            {consultasHoje.map((c, i) => (
              <button key={c.id} onClick={() => router.push(`/nutricionista/paciente/${c.clienteId}`)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' }}>
                <span style={{ color: C.good, fontSize: 14, fontWeight: 700, width: 40, flexShrink: 0, fontFamily: FONT_MONO }}>{c.hora}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.t1, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.clienteNome ?? 'Paciente'}</p>
                  <p style={{ color: C.t3, fontSize: 12 }}>{c.tipo}</p>
                </div>
                <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pacientes em risco — sem registrar sono há 7d */}
      {semSono7d.length > 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden', border: `1px solid ${C.warn}28` })}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.warn}1a`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.warn }}><AlertTriangle size={13} /></span>
            <p style={{ color: C.warn, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>Sem registro de sono — 7 dias</p>
          </div>
          <div>
            {semSono7d.map((p, i) => (
              <button key={p.id} onClick={() => router.push(`/nutricionista/paciente/${p.id}`)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', textAlign: 'left', background: 'none', border: 'none', borderTop: i > 0 ? `1px solid ${C.warn}12` : 'none', cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: 10, background: `${C.warn}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: C.warn, fontSize: 12, fontWeight: 700 }}>{(p.nome ?? p.email)[0].toUpperCase()}</span>
                </div>
                <p style={{ color: C.t2, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome ?? p.email}</p>
                <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {semPlano > 0 && (
        <div style={glass({ padding: 16, border: `1px solid ${C.warn}33`, marginBottom: 16 }, `${C.warn}14`)}>
          <p style={{ color: C.warn, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{semPlano} paciente{semPlano > 1 ? 's' : ''} sem plano alimentar</p>
          <p style={{ color: C.t2, fontSize: 12, marginTop: 4 }}>Crie um plano personalizado para completar o acompanhamento.</p>
          <button onClick={() => router.push('/nutricionista/pacientes')} style={{ marginTop: 12, fontSize: 12, border: `1px solid ${C.warn}4d`, color: C.warn, borderRadius: 8, padding: '6px 12px', background: 'none', cursor: 'pointer' }}>Ver pacientes →</button>
        </div>
      )}

      {!loadingStats && totalPacientes === 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden', border: `1px solid ${C.good}33` })}>
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.good}1a` }}>
            <p style={{ color: C.good, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>Primeiros passos</p>
            <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Bem-vindo ao KORE, {firstName}!</p>
            <p style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>Siga os passos abaixo para começar a acompanhar seus pacientes.</p>
          </div>
          <div>
            {[
              { num: '1', done: true,  label: 'Criar sua conta', desc: 'Feito! Você está dentro.' },
              { num: '2', done: false, label: 'Convidar seu primeiro paciente', desc: 'Envie um link por email — leva 30 segundos.', action: () => router.push('/convite'), actionLabel: 'Convidar agora →' },
              { num: '3', done: false, label: 'Prescrever o plano alimentar', desc: 'Após aceitar o convite, monte o plano nutricional.', action: null, actionLabel: null },
            ].map((s, idx) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px', borderTop: idx > 0 ? `1px solid ${C.good}14` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 11, fontWeight: 800, background: s.done ? `${C.good}26` : `${C.good}1a`, border: `1px solid ${C.good}33`, color: C.good }}>
                  {s.done ? <Check size={13} /> : s.num}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: s.done ? C.t3 : C.t1, textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</p>
                  <p style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>{s.desc}</p>
                  {s.action && (
                    <button onClick={s.action} style={{ marginTop: 8, fontSize: 12, color: C.good, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {s.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planos para revisar */}
      {planosParaRevisar.length > 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden', border: `1px solid ${C.good}33` })}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.good}1a`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.good }}><ClipboardList size={14} /></span>
            <p style={{ color: C.good, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Planos para revisar</p>
          </div>
          <div>
            {planosParaRevisar.map((p, i) => (
              <button key={i} onClick={() => router.push(`/nutricionista/paciente/${p.pacienteId}`)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', borderTop: i > 0 ? `1px solid ${C.good}14` : 'none', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: 12, background: `${C.good}1a`, border: `1px solid ${C.good}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: C.good, fontSize: 12, fontWeight: 800 }}>{(p.nome ?? p.email)[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.t1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome ?? p.email.split('@')[0]}</p>
                  <p style={{ color: C.t3, fontSize: 10 }}>Plano sem revisão há <span style={{ color: C.warn, fontWeight: 600 }}>{p.diasDesdeRevisao} dias</span></p>
                </div>
                <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pacientesRecentes.length > 0 && (
        <div style={glass({ marginBottom: 16, overflow: 'hidden' })}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: C.t1, fontWeight: 600, fontSize: 14, fontFamily: FONT_DISPLAY }}>Seus pacientes</p>
            <button onClick={() => router.push('/nutricionista/pacientes')} style={{ color: C.t3, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Ver todos →</button>
          </div>
          <div>
            {pacientesRecentes.map((p, i) => {
              const planoAntigo = p.diasDesdeUltimoPlano != null && p.diasDesdeUltimoPlano >= 30
              return (
                <button key={i} onClick={() => router.push(`/nutricionista/paciente/${p.id}`)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', textAlign: 'left', background: 'none', border: 'none', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: C.t2, fontSize: 14, fontWeight: 700 }}>{(p.nome ?? p.email)[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ color: C.t1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome ?? p.email.split('@')[0]}</p>
                      {!p.temPlano && <span style={{ fontSize: 11, color: C.warn, border: `1px solid ${C.warn}33`, borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>Sem plano</span>}
                      {planoAntigo && <span style={{ fontSize: 11, color: C.t3, borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>{p.diasDesdeUltimoPlano}d sem revisão</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: C.t3, fontSize: 12 }}>
                      {p.sonoScore != null && <span>Recup.: {p.sonoScore}/100</span>}
                      {p.treinos7d > 0 && <span>{p.treinos7d}x treinos</span>}
                      {p.kcal7d > 0 && <span>{p.kcal7d >= 1000 ? `${(p.kcal7d/1000).toFixed(1)}k` : p.kcal7d} kcal/sem.</span>}
                    </div>
                  </div>
                  <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={14} /></span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button onClick={() => router.push('/nutricionista/pacientes')} style={glass({ width: '100%', color: C.t2, fontWeight: 600, padding: '14px', fontSize: 14, marginBottom: 12, cursor: 'pointer' })}>Ver todos os pacientes</button>
      <button onClick={() => router.push('/convite')} style={{ width: '100%', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', fontWeight: 700, padding: '16px', borderRadius: 20, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: `0 8px 24px ${C.energy}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><UserPlus size={16} /> Convidar paciente</button>
    </div>
  )
} C.t3, fontSize: 12 }}>
                      {p.sonoScore != null && <span>Recup.: {p.sonoScore}/100</span>}
                      {p.treinos7d > 0 && <span>{p.treinos7d}x treinos</span>}
                      {p.kcal7d > 0 && <span>{p.kcal7d >= 1000 ? `${(p.kcal7d/1000).toFixed(1)}k` : p.kcal7d} kcal/sem.</span>}
                    </div>
                  </div>
                  <span style={{ color: C.t3, flexShrink: 0 }}><ChevronRight size={14} /></span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button onClick={() => router.push('/nutricionista/pacientes')} style={glass({ width: '100%', color: C.t2, fontWeight: 600, padding: '14px', fontSize: 14, marginBottom: 12, cursor: 'pointer' })}>Ver todos os pacientes</button>
      <button onClick={() => router.push('/convite')} style={{ width: '100%', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`, color: '#fff', fontWeight: 700, padding: '16px', borderRadius: 20, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: `0 8px 24px ${C.energy}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><UserPlus size={16} /> Convidar paciente</button>
    </div>
  )
}
