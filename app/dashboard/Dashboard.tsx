'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import OnboardingTour from '../components/OnboardingTour'
import SidebarProfissional from '../components/SidebarProfissional'

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

function getGreeting(): string {
  const h = getHourBR()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getTodayString(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long',
  })
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
  if (media <= 2) return 'text-red-400'
  if (media === 3) return 'text-yellow-400'
  return 'text-emerald-400'
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

function getScoreCores(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400/20' }
  if (score >= 60) return { text: 'text-yellow-400',  bg: 'bg-yellow-400',  border: 'border-yellow-400/20'  }
  if (score >= 40) return { text: 'text-orange-400',  bg: 'bg-orange-400',  border: 'border-orange-400/20'  }
  return              { text: 'text-red-400',     bg: 'bg-red-400',     border: 'border-red-400/20'     }
}

function getScoreHex(score: number): string {
  if (score >= 80) return '#34d399'
  if (score >= 60) return '#facc15'
  if (score >= 40) return '#fb923c'
  return '#f87171'
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
  if (cor === 'verde')    return { border: 'border-emerald-500/30', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400', glow: '#10B981' }
  if (cor === 'amarelo')  return { border: 'border-yellow-500/30',  badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',    dot: 'bg-yellow-400',  glow: '#EAB308' }
  if (cor === 'laranja')  return { border: 'border-orange-500/30',  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',    dot: 'bg-orange-400',  glow: '#F97316' }
  return                         { border: 'border-red-500/30',     badge: 'bg-red-500/10 text-red-400 border-red-500/20',            dot: 'bg-red-400',     glow: '#EF4444' }
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
      <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-600 text-[10px] tracking-[0.25em] uppercase">Carregando</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#0d1117] text-white flex flex-col">
      {perfil?.tipo === 'cliente' && <OnboardingTour />}

      {/* Painel de Notificações */}
      {showNotifs && (
        <div className="fixed inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNotifs(false) }}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl border border-white/[0.14] px-5 pt-5 pb-10"
            style={{ background: '#1c1c1c' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-black text-lg">Notificações</h2>
              <button onClick={() => setShowNotifs(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-3">🔔</p>
                <p className="text-white font-bold mb-1">Tudo em dia!</p>
                <p className="text-zinc-600 text-sm">Nenhuma notificação no momento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifs.map(n => (
                  <button key={n.id} onClick={() => { setShowNotifs(false); if (n.link) router.push(n.link) }}
                    className="w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-all flex items-center gap-3"
                    style={{ background: 'var(--surface-1)' }}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${n.tipo === 'agendamento' ? 'bg-blue-500/10' : n.tipo === 'alerta' ? 'bg-red-500/10' : 'bg-zinc-800'}`}>
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm">{n.titulo}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{n.corpo}</p>
                    </div>
                    {n.link && <span className="text-zinc-600 text-sm shrink-0">›</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-28">
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
          />
        )}
        {perfil?.tipo === 'personal' && <DashboardPersonal perfil={perfil} activeTab={activeTab} onLogout={handleLogout} onOpenNotifs={() => setShowNotifs(true)} notifCount={notifs.length} />}
        {perfil?.tipo === 'nutricionista' && <DashboardNutricionista perfil={perfil} activeTab={activeTab} onLogout={handleLogout} onOpenNotifs={() => setShowNotifs(true)} notifCount={notifs.length} />}
      </div>

      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.14] ${(perfil?.tipo === 'nutricionista' || perfil?.tipo === 'personal') ? 'md:hidden' : ''}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(13,17,23,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-2">
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
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-150 active:scale-90">
                <span className={`transition-all duration-200 ${active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  <item.Icon active={active} />
                </span>
                <span className={`text-[9px] tracking-[0.1em] uppercase font-semibold transition-all ${active ? 'text-emerald-400' : 'text-zinc-700'}`}>
                  {item.label}
                </span>
                {active && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-white text-sm font-bold">{valor}</p>
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
        className="w-full text-left rounded-3xl p-5 mb-3 relative overflow-hidden active:scale-[0.98] transition-all group"
        style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.09] flex items-center justify-center shrink-0 text-lg">🌙</div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">✦ Decisão do dia</p>
            <p className="text-white font-black text-base group-hover:text-emerald-400 transition-colors">Registre seu sono</p>
          </div>
        </div>
        <p className="text-zinc-600 text-xs leading-relaxed">Assim que você registrar como dormiu, a IA gera sua decisão do dia: o que treinar, o que comer e como se recuperar.</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <p className="text-emerald-400 text-[11px] font-semibold">Registrar agora → 30 segundos</p>
        </div>
      </button>
    )
  }

  // Gerando...
  if (gerandoDecisao || (!decisao && temSonoHoje)) {
    return (
      <div className="rounded-3xl p-5 mb-3 border border-emerald-500/20 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0a1410 0%, #080d0a 100%)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-emerald-400 text-[10px] uppercase tracking-[0.2em]">✦ Gerando decisão do dia...</p>
        </div>
        <div className="space-y-2">
          {[1, 0.75, 0.55].map((w, i) => (
            <div key={i} className="h-3 bg-white/[0.09] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!decisao) return null

  const cores = getCoresDecisao(decisao.cor)

  return (
    <div className={`rounded-3xl p-5 mb-3 border ${cores.border} relative overflow-hidden`}
      style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}>
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-10"
        style={{ background: cores.glow }} />
      <div className="relative">
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-3">✦ Decisão do dia</p>

        <p className="text-white font-black text-xl leading-tight mb-1">{decisao.decisao}</p>
        <p className="text-zinc-500 text-xs mb-4 leading-relaxed">{decisao.motivo}</p>

        <div className="space-y-2.5">
          {[
            { icon: '🏋️', label: 'Treino', val: decisao.treino },
            { icon: '🍽️', label: 'Nutrição', val: decisao.nutricao },
            { icon: '💤', label: 'Sono', val: decisao.sono },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">{item.label}: </span>
                <span className="text-zinc-300 text-xs">{item.val}</span>
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
  const dotColor = (s: number) => s >= 80 ? '#34d399' : s >= 60 ? '#facc15' : s >= 40 ? '#fb923c' : '#f87171'

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

  const W = 280, H = 56, padX = 10, padY = 8
  const toY = (s: number) => H - padY - (s / 100) * (H - 2 * padY)
  const withX = dias.map((d, i) => ({ ...d, x: padX + (i / 6) * (W - 2 * padX) }))
  const valid = withX.filter(d => d.score != null) as (typeof withX[0] & { score: number })[]
  const line = valid.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x.toFixed(1)},${toY(d.score).toFixed(1)}`).join(' ')
  const area = valid.length > 1 ? `${line} L${valid[valid.length-1].x.toFixed(1)},${H} L${valid[0].x.toFixed(1)},${H} Z` : ''
  const last = valid[valid.length - 1]

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.14]">
      <p className="text-zinc-600 text-[9px] uppercase tracking-[0.18em] mb-2">Score de recuperação · 7 dias</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: H }}>
        <defs>
          <linearGradient id="dashSonoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#dashSonoGrad)" />}
        {valid.length > 1 && <path d={line} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />}
        {valid.map((d, i) => <circle key={i} cx={d.x} cy={toY(d.score)} r="3" fill={dotColor(d.score)} />)}
        {last && <text x={last.x} y={toY(last.score) - 7} textAnchor="middle" fill={dotColor(last.score)} fontSize="9" fontWeight="bold">{last.score}</text>}
      </svg>
      <div className="flex mt-0.5">
        {withX.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="font-bold text-[9px]" style={{ color: d.score != null ? dotColor(d.score) : 'transparent' }}>
              {d.score ?? 0}
            </span>
            <span className="text-zinc-700 text-[8px] uppercase">{d.dayName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const size = 120, stroke = 9
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = getScoreHex(score)
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="relative text-center z-10">
        <span className="text-3xl font-black leading-none" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
        <span className="block text-zinc-600 text-[10px] mt-0.5">/100</span>
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

  if (!metaEfetiva && !editando) {
    return (
      <button onClick={() => setEditando(true)}
        className="w-full text-left rounded-2xl p-5 mb-3 border border-dashed border-white/[0.15] active:scale-[0.98] transition-all"
        style={{ background: 'var(--surface-1)' }}>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Meta pessoal</p>
        <p className="text-white font-black text-xl mb-1.5">Definir minha meta →</p>
        <p className="text-zinc-600 text-sm leading-relaxed">Onde você quer chegar? Defina seu peso-alvo e acompanhe cada kg de progresso.</p>
      </button>
    )
  }

  if (editando) {
    return (
      <div className="rounded-2xl p-5 mb-3 border border-emerald-500/20" style={{ background: 'var(--surface-1)' }}>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Meta pessoal</p>
        <div className="space-y-3">
          <div>
            <label className="text-zinc-600 text-[10px] mb-1.5 block">Peso-alvo (kg)</label>
            <input type="number" step="0.5" placeholder="Ex: 80" value={formMeta.peso}
              onChange={e => setFormMeta(p => ({ ...p, peso: e.target.value }))}
              className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/30 placeholder:text-zinc-700" />
          </div>
          <div>
            <label className="text-zinc-600 text-[10px] mb-1.5 block">Data-limite</label>
            <input type="date" value={formMeta.data}
              onChange={e => setFormMeta(p => ({ ...p, data: e.target.value }))}
              className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/30"
              style={{ colorScheme: 'dark' }} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSalvar}
              className="flex-1 bg-emerald-500 text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-all">
              Salvar meta
            </button>
            <button onClick={() => setEditando(false)}
              className="px-4 py-3 border border-white/[0.1] rounded-xl text-zinc-500 text-sm active:scale-95 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const C = 2 * Math.PI * 30 // circumference r=30 → ~188.5

  return (
    <div className="rounded-2xl p-5 mb-3" style={{ background: 'var(--surface-1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Meta pessoal</p>
          {ehSugestao && <span className="text-[9px] text-emerald-400 border border-emerald-500/30 rounded-md px-1.5 py-0.5 uppercase tracking-wider">IA</span>}
        </div>
        <button onClick={() => setEditando(true)}
          className="text-zinc-600 text-[10px] uppercase tracking-wider border border-white/[0.14] rounded-lg px-3 py-1.5 hover:text-white hover:border-white/20 transition-all active:scale-95">
          {ehSugestao ? 'confirmar' : 'editar'}
        </button>
      </div>

      {atingiu ? (
        <p className="text-[var(--accent)] font-black text-3xl mb-4">Meta atingida! 🎉</p>
      ) : (
        <div className="flex items-center gap-5 mb-4">
          {/* Gauge circular */}
          <div className="relative shrink-0 w-[76px] h-[76px]">
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5.5" />
              <circle cx="38" cy="38" r="30" fill="none"
                stroke={ehSugestao ? '#34d399' : (pct > 0 && progredindo ? '#34d399' : pct === 0 ? '#52525b' : '#f87171')}
                strokeWidth="5.5" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * C} ${C}`}
                transform="rotate(-90 38 38)"
                style={{ transition: 'stroke-dasharray 0.7s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-black text-base leading-none">{pct}%</span>
            </div>
          </div>

          {/* Info direita */}
          <div className="flex-1 min-w-0">
            {ehSugestao ? (
              <>
                <p className="text-[var(--accent)] font-black text-2xl leading-tight mb-0.5">
                  {totalGoal != null ? `${perder ? '-' : '+'}${totalGoal.toFixed(1)} kg` : '—'}
                </p>
                <p className="text-zinc-500 text-xs mb-3">objetivo sugerido pela IA</p>
              </>
            ) : (
              <>
                <p className="text-white font-black text-2xl leading-tight mb-0.5">
                  {faltam != null ? `${faltam.toFixed(1)} kg` : '—'}
                </p>
                <p className="text-zinc-500 text-xs mb-3">
                  {deltaAlcancado > 0 && progredindo ? `${deltaAlcancado.toFixed(1)} kg já conquistados` : 'faltam para a meta'}
                </p>
              </>
            )}
            {/* Chips INÍCIO · HOJE · META */}
            <div className="flex items-center gap-3">
              {!ehSugestao && pesoBase != null && (
                <>
                  <div>
                    <p className="text-zinc-400 text-xs font-bold leading-tight">{pesoBase} kg</p>
                    <p className="text-zinc-600 text-[8px] uppercase tracking-wider">início</p>
                  </div>
                  <span className="text-zinc-700 text-[10px]">→</span>
                </>
              )}
              <div>
                <p className="text-white text-xs font-black leading-tight">{pesoCurrent != null ? `${pesoCurrent} kg` : '—'}</p>
                <p className="text-zinc-500 text-[8px] uppercase tracking-wider">hoje</p>
              </div>
              <span className="text-zinc-700 text-[10px]">→</span>
              <div>
                <p className="text-[var(--accent)] text-xs font-bold leading-tight">{metaEfetiva} kg</p>
                <p className="text-zinc-600 text-[8px] uppercase tracking-wider">meta</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de progresso */}
      {!atingiu && (
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-4">
          <div className={`h-full rounded-full transition-all duration-700 ${ehSugestao ? 'bg-emerald-400/30' : 'bg-emerald-400'}`}
            style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Rodapé */}
      {ehSugestao ? (
        <button onClick={() => setEditando(true)}
          className="w-full bg-emerald-500/10 border border-emerald-500/20 text-[var(--accent)] font-bold py-3 rounded-xl text-sm active:scale-95 transition-all tracking-[0.04em]">
          Confirmar esta meta →
        </button>
      ) : (
        <div className="flex items-center pt-3 border-t border-white/[0.14]">
          {!atingiu && faltam != null && (
            <p className="text-zinc-500 text-xs flex-1">
              {metaDataLimite && `até ${new Date(metaDataLimite + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
              {dias != null && metaDataLimite && ` · `}
              {dias != null && <span className="text-white font-semibold">{dias}d</span>}
            </p>
          )}
          <button onClick={() => router.push('/evolucao-medidas/' + userId)}
            className="text-[10px] text-zinc-600 uppercase tracking-wider hover:text-white transition-colors shrink-0 active:scale-95">
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
  onLogout: _onLogout, onOpenNotifs, notifCount, planoNutriRefeicoes, fasePeriodizacao,
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
}) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)
  const cores          = scoreRecuperacao ? getScoreCores(scoreRecuperacao) : null
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

  return (
    <div className="max-w-md mx-auto px-4" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.85rem] font-black tracking-tight leading-none text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1.5 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenNotifs} className="relative w-9 h-9 rounded-2xl bg-zinc-900 flex items-center justify-center text-sm active:scale-90 transition-all">
            🔔
            {notifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
          <button onClick={() => router.push('/perfil')} className="w-9 h-9 rounded-2xl bg-zinc-900 flex items-center justify-center active:scale-90 transition-all">
            <span className="text-xs font-black text-white">{initials}</span>
          </button>
        </div>
      </div>

      {/* Meta pessoal — primeiro da home, motivação central */}
      <CardMeta
        perfil={perfil}
        pesoAtual={pesoAtual}
        pesoDelta={pesoDelta}
        userId={userId}
        onSalvarMeta={onSalvarMeta}
        router={router}
      />

      {/* ✦ Decisão do dia — só aparece quando há sono registrado */}
      {temSonoHoje && (
        <CardDecisaoDia
          decisao={decisaoDia}
          gerandoDecisao={gerandoDecisao}
          temSonoHoje={temSonoHoje}
          router={router}
        />
      )}

      {/* Score de recuperação */}
      {scoreRecuperacao ? (
        <button onClick={() => router.push('/sono')}
          className={`w-full text-left rounded-3xl p-6 mb-3 border ${cores?.border} relative overflow-hidden active:scale-[0.98] transition-all duration-200`}
          style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}>
          <div className={`absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-15 ${cores?.bg}`} />
          <div className="relative">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.22em] mb-4">Recuperação hoje</p>
            <div className="flex items-center gap-5">
              <ScoreRing score={scoreRecuperacao} />
              <div className="flex-1 min-w-0">
                <p className={`text-base font-black leading-tight mb-1 ${cores?.text}`}>{getScoreLabel(scoreRecuperacao)}</p>
                <p className="text-zinc-600 text-[11px] mb-3">Ver análise completa →</p>
                {bemEstar && (
                  <div className="flex gap-4">
                    <Metrica label="Energia"   valor={`${bemEstar.energia}/5`} />
                    <div className="w-px bg-white/[0.09]" />
                    <Metrica label="Humor"     valor={`${bemEstar.humor}/5`} />
                    <div className="w-px bg-white/[0.09]" />
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
          className="w-full text-left rounded-3xl p-6 mb-3 relative overflow-hidden active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.22em]">Recuperação hoje</p>
            <span className="text-[9px] text-zinc-600 border border-white/[0.14] rounded-md px-1.5 py-0.5 uppercase tracking-wider">demo</span>
          </div>
          <div className="flex items-center gap-5 opacity-50">
            <div className="relative w-[72px] h-[72px] shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="36" cy="36" r="28" fill="none" stroke="#34d399" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - 72 / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>72</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black leading-tight mb-1 text-[var(--accent)]">Boa recuperação</p>
              <div className="flex gap-4 mt-2">
                <div><p className="text-zinc-600 text-[9px] uppercase tracking-wider">Energia</p><p className="text-zinc-400 text-xs font-bold">4/5</p></div>
                <div className="w-px bg-white/[0.09]" />
                <div><p className="text-zinc-600 text-[9px] uppercase tracking-wider">Humor</p><p className="text-zinc-400 text-xs font-bold">4/5</p></div>
                <div className="w-px bg-white/[0.09]" />
                <div><p className="text-zinc-600 text-[9px] uppercase tracking-wider">Dor musc.</p><p className="text-zinc-400 text-xs font-bold">4/5</p></div>
              </div>
            </div>
          </div>
          <p className="text-zinc-600 text-xs mt-4">Registre seu sono para ativar seu score real →</p>
        </button>
      )}

      {/* Fase de periodização */}
      {fasePeriodizacao && (() => {
        const CORES_FASE: Record<string, { text: string; bar: string; border: string }> = {
          adaptacao:   { text: 'text-teal-400',    bar: 'bg-teal-400',    border: 'border-teal-500/20'    },
          hipertrofia: { text: 'text-emerald-400', bar: 'bg-emerald-400', border: 'border-emerald-500/20' },
          forca:       { text: 'text-blue-400',    bar: 'bg-blue-400',    border: 'border-blue-500/20'    },
          deload:      { text: 'text-zinc-400',    bar: 'bg-zinc-400',    border: 'border-zinc-500/20'    },
          potencia:    { text: 'text-orange-400',  bar: 'bg-orange-400',  border: 'border-orange-500/20'  },
          resistencia: { text: 'text-purple-400',  bar: 'bg-purple-400',  border: 'border-purple-500/20'  },
        }
        const c = CORES_FASE[fasePeriodizacao.tipoBloco] ?? CORES_FASE.hipertrofia
        const pct = Math.min(100, (fasePeriodizacao.semanaBloco / fasePeriodizacao.semanasBloco) * 100)
        return (
          <div className={`rounded-2xl p-5 mb-3 border ${c.border}`} style={{ background: 'var(--surface-1)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Fase atual</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${c.text}`}>
                Sem. {fasePeriodizacao.semanaBloco}/{fasePeriodizacao.semanasBloco}
              </span>
            </div>
            <p className={`text-xl font-black mb-3 ${c.text}`}>{fasePeriodizacao.nomeBloco}</p>
            <div className="h-2 bg-white/[0.09] rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-zinc-600 text-[10px]">Semana {fasePeriodizacao.semanaTotal} de {fasePeriodizacao.totalSemanas} no ciclo</p>
              {fasePeriodizacao.descricao && <p className="text-zinc-500 text-[10px] max-w-[60%] text-right truncate">{fasePeriodizacao.descricao}</p>}
            </div>
          </div>
        )
      })()}

      {/* Treino de hoje */}
      <div className="rounded-2xl p-5 mb-3" style={{ background: 'var(--surface-1)' }}>
        <div className="flex items-start justify-between mb-1">
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Treino de hoje</p>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${treinoHoje?.concluido ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
            {treinoHoje?.concluido ? '✓' : 'TR'}
          </div>
        </div>
        <div className="mb-4">
          <p className="text-white font-bold text-base mb-0.5">
            {treinoHoje ? treinoHoje.nome : 'Escolha seu treino'}
          </p>
          {treinoHoje?.concluido ? (
            <p className="text-[var(--accent)] font-black text-sm">✓ Concluído hoje</p>
          ) : vinculoPersonal ? (
            <p className="text-blue-400 font-black text-sm">{vinculoPersonal.nome ?? vinculoPersonal.email}</p>
          ) : (
            <p className="text-zinc-600 text-xs">Seus planos estão prontos</p>
          )}
        </div>
        <button onClick={() => router.push('/treino')}
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm active:scale-95 hover:bg-zinc-100 transition-all tracking-[0.05em]">
          {treinoHoje?.concluido ? 'Ver treinos' : 'Ir para treino do dia →'}
        </button>
      </div>

      {/* Nutrição */}
      <button onClick={() => router.push('/nutricao')}
        className="w-full text-left rounded-2xl p-5 mb-3 active:scale-[0.98] transition-all"
        style={{ background: 'var(--surface-1)' }}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Minha nutrição</p>
            {vinculoNutri && (
              <p className="text-green-400 font-black text-sm mt-0.5">{vinculoNutri.nome ?? vinculoNutri.email}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${vinculoNutri ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/[0.07] text-zinc-600 border-white/[0.11]'}`}>NU</div>
        </div>
        <div className="mb-4">
          {vinculoNutri && refeicaoAtual ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-white font-bold text-base">{refeicaoAtual.nome}</p>
                {refeicaoAtual.horario && (
                  <span className="text-zinc-500 text-xs">{refeicaoAtual.horario}</span>
                )}
              </div>
              {refeicaoAtual.alimentos?.length > 0 && (
                <p className="text-zinc-400 text-xs leading-relaxed mb-2 line-clamp-2">
                  {refeicaoAtual.alimentos.slice(0, 3).map(a => a.nome).join(', ')}
                  {refeicaoAtual.alimentos.length > 3 ? ` +${refeicaoAtual.alimentos.length - 3} alimento${refeicaoAtual.alimentos.length - 3 > 1 ? 's' : ''}` : ''}
                </p>
              )}
              <div className="flex gap-3">
                {refeicaoAtual.calorias > 0 && (
                  <span className="text-orange-400 text-xs font-bold">{refeicaoAtual.calorias} kcal</span>
                )}
                {refeicaoAtual.proteina > 0 && (
                  <span className="text-blue-400 text-xs">{refeicaoAtual.proteina}g prot</span>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-white font-bold text-base mb-0.5">
                {vinculoNutri ? 'Plano ativo' : 'Sem plano alimentar'}
              </p>
              {!vinculoNutri && (
                <p className="text-zinc-600 text-xs">Conecte um nutricionista para receber seu plano</p>
              )}
            </>
          )}
        </div>
        <div className="w-full bg-white/[0.09] text-white font-bold py-3.5 rounded-xl text-sm text-center tracking-[0.05em]">
          Ver meu plano alimentar →
        </div>
      </button>

      {/* Meu time */}
      <div className="rounded-2xl p-5 mb-3" style={{ background: 'var(--surface-1)' }}>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Meu time</p>
        <div className="space-y-3">
          {[
            { tipo: 'personal',      sigla: 'PT', label: 'Personal Trainer', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'   },
            { tipo: 'nutricionista', sigla: 'NU', label: 'Nutricionista',    cor: 'bg-green-500/10 text-green-400 border-green-500/20' },
          ].map((p, i) => {
            const vinculo = vinculos.find(v => v?.tipo === p.tipo)
            return (
              <div key={p.label}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${p.cor}`}>{p.sigla}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{p.label}</p>
                    {vinculo
                      ? <p className={`font-black text-base mt-0.5 ${p.tipo === 'personal' ? 'text-blue-400' : 'text-green-400'}`}>{vinculo.nome ?? vinculo.email}</p>
                      : <p className="text-zinc-600 text-sm mt-0.5">Não conectado</p>}
                  </div>
                  {!vinculo && (
                    <button onClick={() => router.push('/convite')}
                      className="text-[10px] text-zinc-500 border border-white/[0.14] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0">
                      + Conectar
                    </button>
                  )}
                  {vinculo && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                </div>
                {i === 0 && <div className="h-px bg-white/[0.07] mt-3" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DashboardPersonal({ perfil, onLogout, onOpenNotifs, notifCount }: { perfil: Perfil; activeTab: string; onLogout: () => void; onOpenNotifs: () => void; notifCount: number }) {
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
    <div className="md:flex md:h-screen" style={{ background: 'var(--bg-base)' }}>
      <SidebarProfissional tipo="personal" />
      <div className="flex-1 md:overflow-y-auto">
    <div className="max-w-md mx-auto px-4 md:max-w-[1100px] md:px-10" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))', paddingBottom: '7rem' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">{getGreeting()}</p>
          <h1 className="text-[1.85rem] font-black tracking-tight text-white">{firstName}</h1>
          <p className="text-zinc-600 text-[11px] mt-1 capitalize tracking-wide">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={onOpenNotifs} className="relative w-9 h-9 rounded-2xl bg-zinc-900 flex items-center justify-center text-sm active:scale-90 transition-all">
            🔔
            {notifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
        </div>
      </div>
      <div className="md:hidden inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-emerald-500/20 bg-emerald-500/[0.07]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Personal Trainer</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { valor: loadingStats ? '—' : String(totalAlunos),   label: 'Alunos',    sub: 'ativos',         cor: 'text-white' },
          { valor: loadingStats ? '—' : String(treinaramHoje), label: 'Treinaram', sub: 'hoje',           cor: treinaramHoje > 0 ? 'text-emerald-400' : 'text-white' },
          { valor: loadingStats ? '—' : String(alertas),       label: 'Alertas',   sub: 'sem treinar 7d', cor: alertas > 0 ? 'text-orange-400' : 'text-white' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
            <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] mb-3">{m.label}</p>
            <p className={`text-5xl font-black leading-none tracking-tight ${m.cor}`}>{m.valor}</p>
            <p className="text-zinc-600 text-xs mt-2">{m.sub}</p>
          </div>
        ))}
      </div>
      {!loadingStats && totalAlunos === 0 && (
        <div className="rounded-2xl border border-blue-500/20 mb-4 overflow-hidden" style={{ background: '#0f1a24' }}>
          <div className="px-5 pt-5 pb-4 border-b border-blue-500/10">
            <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Primeiros passos</p>
            <p className="text-white font-black text-lg">Bem-vindo ao KORE, {firstName}!</p>
            <p className="text-zinc-500 text-sm mt-1">Siga os passos abaixo para começar a acompanhar seus alunos.</p>
          </div>
          <div className="divide-y divide-blue-500/[0.08]">
            {[
              { num: '1', done: true,  label: 'Criar sua conta', desc: 'Feito! Você está dentro.' },
              { num: '2', done: false, label: 'Convidar seu primeiro aluno', desc: 'Envie um link por email — leva 30 segundos.', action: () => router.push('/convite'), actionLabel: 'Convidar agora →' },
              { num: '3', done: false, label: 'Montar o treino do aluno', desc: 'Após aceitar o convite, monte o plano de treino.', action: null, actionLabel: null },
            ].map((s) => (
              <div key={s.num} className="flex items-start gap-4 px-5 py-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-black ${s.done ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
                  {s.done ? '✓' : s.num}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${s.done ? 'text-zinc-500 line-through' : 'text-white'}`}>{s.label}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{s.desc}</p>
                  {s.action && (
                    <button onClick={s.action} className="mt-2 text-xs text-blue-400 font-semibold hover:text-blue-300 transition-colors">
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
        <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: 'var(--surface-1)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.14]">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Seus alunos hoje</p>
            <button onClick={() => router.push('/personal')} className="text-zinc-600 text-[10px] uppercase tracking-wider hover:text-white transition-colors">Ver todos →</button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {alunosRecentes.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${a.treinouHoje ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.07] text-zinc-500'}`}>
                  {(a.nome ?? a.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{a.nome ?? a.email.split('@')[0]}</p>
                  <p className={`text-[11px] ${a.treinouHoje ? 'text-emerald-400' : 'text-zinc-600'}`}>{a.treinouHoje ? '✓ Treinou hoje' : 'Não treinou hoje'}</p>
                </div>
                {a.score && <div className={`text-xs font-bold shrink-0 ${a.score >= 70 ? 'text-emerald-400' : a.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{a.score}/100</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {notifBlocos.length > 0 && (
        <div className="rounded-2xl border border-blue-500/20 mb-4 overflow-hidden" style={{ background: '#0f1a24' }}>
          <div className="px-5 py-3 border-b border-blue-500/10 flex items-center gap-2">
            <span className="text-blue-400 text-sm">📅</span>
            <p className="text-blue-300 text-[10px] uppercase tracking-[0.15em] font-bold">Prepare os próximos blocos</p>
          </div>
          <div className="divide-y divide-blue-500/[0.08]">
            {notifBlocos.map((n, i) => (
              <button key={i} onClick={() => router.push(`/personal/aluno/${n.clienteId}`)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:scale-[0.98] transition-all">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-blue-400 text-xs font-black">{(n.nome ?? n.email)[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{n.nome ?? n.email.split('@')[0]}</p>
                  <p className="text-zinc-500 text-[10px]">{n.blocoAtual} → <span className="text-blue-300 font-semibold">{n.proximoBloco}</span> em {n.diasRestantes}d</p>
                </div>
                <span className="text-zinc-600 text-sm shrink-0">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {alertas > 0 && (
        <div className="rounded-2xl p-4 border border-orange-500/20 bg-orange-500/5 mb-4">
          <p className="text-orange-400 text-[10px] uppercase tracking-[0.15em] mb-1">⚠ {alertas} aluno{alertas > 1 ? 's' : ''} sem treinar há 7+ dias</p>
          <p className="text-zinc-500 text-xs">Acesse a lista de alunos para ver quem precisa de atenção.</p>
          <button onClick={() => router.push('/personal')} className="mt-3 text-[11px] border border-orange-500/30 text-orange-400 rounded-lg px-3 py-1.5 active:scale-95 transition-all uppercase tracking-wider">Ver alunos →</button>
        </div>
      )}
      <button onClick={() => router.push('/personal')} className="w-full border border-white/[0.14] text-zinc-300 font-bold py-3.5 rounded-2xl hover:bg-white/[0.05] active:scale-95 transition-all text-sm tracking-[0.1em] uppercase mb-3">Ver todos os alunos</button>
      <button onClick={() => router.push('/convite')} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase">+ Convidar aluno</button>
    </div>
      </div>
    </div>
  )
}

function DashboardNutricionista({ perfil, onLogout, onOpenNotifs, notifCount }: { perfil: Perfil; activeTab: string; onLogout: () => void; onOpenNotifs: () => void; notifCount: number }) {
  const router    = useRouter()
  const firstName = getFirstName(perfil.nome, perfil.email)
  const initials  = getInitials(perfil.nome, perfil.email)

  const [loadingStats, setLoadingStats] = useState(true)
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [boaRecuperacao, setBoaRecuperacao] = useState(0)
  const [treinaram7d, setTreinaram7d] = useState(0)
  const [semPlano, setSemPlano] = useState(0)
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
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

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
    <div className="md:flex md:h-screen" style={{ background: 'var(--bg-base)' }}>
      <SidebarProfissional tipo="nutricionista" />
      <div className="flex-1 md:overflow-y-auto">
    <div className="max-w-md mx-auto px-4 md:max-w-3xl md:px-10" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))', paddingBottom: '7rem' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-xs tracking-[0.2em] uppercase mb-1">{getGreeting()}</p>
          <h1 className="text-4xl font-black tracking-tight text-white leading-none">{firstName}</h1>
          <p className="text-zinc-500 text-sm mt-1.5 capitalize">{getTodayString()}</p>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={onOpenNotifs} className="relative w-10 h-10 rounded-2xl bg-white/[0.07] flex items-center justify-center text-sm active:scale-90 transition-all">
            🔔
            {notifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
        </div>
      </div>
      <div className="md:hidden inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border border-green-500/20 bg-green-500/[0.07]">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        <span className="text-green-400 text-xs uppercase tracking-[0.15em] font-semibold">Nutricionista</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { valor: loadingStats ? '—' : String(totalPacientes),  label: 'Pacientes',     sub: 'ativos' },
          { valor: loadingStats ? '—' : String(boaRecuperacao),  label: 'Boa recuperação', sub: 'hoje' },
          { valor: loadingStats ? '—' : String(treinaram7d),     label: 'Treinaram',     sub: 'essa semana' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
            <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] mb-3">{m.label}</p>
            <p className="text-white text-5xl font-black leading-none tracking-tight">{m.valor}</p>
            <p className="text-zinc-600 text-xs mt-2">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Consultas de hoje */}
      {consultasHoje.length > 0 && (
        <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: 'var(--surface-1)' }}>
          <div className="px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Consultas de hoje</p>
            <span className="text-zinc-500 text-xs">{consultasHoje.length} agendada{consultasHoje.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {consultasHoje.map(c => (
              <button key={c.id} onClick={() => router.push(`/nutricionista/paciente/${c.clienteId}`)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.03] transition-all">
                <span className="text-zinc-400 text-sm font-semibold w-10 shrink-0">{c.hora}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.clienteNome ?? 'Paciente'}</p>
                  <p className="text-zinc-500 text-xs">{c.tipo}</p>
                </div>
                <span className="text-zinc-600 text-xs shrink-0">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pacientes em risco — sem registrar sono há 7d */}
      {semSono7d.length > 0 && (
        <div className="rounded-2xl border border-amber-500/15 mb-4 overflow-hidden" style={{ background: '#1a1608' }}>
          <div className="px-5 py-3 border-b border-amber-500/10 flex items-center gap-2">
            <span className="text-amber-400 text-sm">⚠</span>
            <p className="text-amber-300/80 text-xs uppercase tracking-[0.12em] font-semibold">Sem registro de sono — 7 dias</p>
          </div>
          <div className="divide-y divide-amber-500/[0.07]">
            {semSono7d.map(p => (
              <button key={p.id} onClick={() => router.push(`/nutricionista/paciente/${p.id}`)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <span className="text-amber-400 text-xs font-bold">{(p.nome ?? p.email)[0].toUpperCase()}</span>
                </div>
                <p className="text-zinc-300 text-sm flex-1 truncate">{p.nome ?? p.email}</p>
                <span className="text-zinc-600 text-xs shrink-0">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {semPlano > 0 && (
        <div className="rounded-2xl p-4 border border-yellow-500/20 bg-yellow-500/[0.05] mb-4">
          <p className="text-yellow-400 text-xs uppercase tracking-[0.12em] mb-1">{semPlano} paciente{semPlano > 1 ? 's' : ''} sem plano alimentar</p>
          <p className="text-zinc-500 text-xs mt-1">Crie um plano personalizado para completar o acompanhamento.</p>
          <button onClick={() => router.push('/nutricionista/pacientes')} className="mt-3 text-xs border border-yellow-500/30 text-yellow-400 rounded-lg px-3 py-1.5 active:scale-95 transition-all">Ver pacientes →</button>
        </div>
      )}

      {!loadingStats && totalPacientes === 0 && (
        <div className="rounded-2xl border border-green-500/20 mb-4 overflow-hidden" style={{ background: '#141f18' }}>
          <div className="px-5 pt-5 pb-4 border-b border-green-500/10">
            <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Primeiros passos</p>
            <p className="text-white font-black text-lg">Bem-vindo ao KORE, {firstName}!</p>
            <p className="text-zinc-500 text-sm mt-1">Siga os passos abaixo para começar a acompanhar seus pacientes.</p>
          </div>
          <div className="divide-y divide-green-500/[0.08]">
            {[
              { num: '1', done: true,  label: 'Criar sua conta', desc: 'Feito! Você está dentro.' },
              { num: '2', done: false, label: 'Convidar seu primeiro paciente', desc: 'Envie um link por email — leva 30 segundos.', action: () => router.push('/convite'), actionLabel: 'Convidar agora →' },
              { num: '3', done: false, label: 'Prescrever o plano alimentar', desc: 'Após aceitar o convite, monte o plano nutricional.', action: null, actionLabel: null },
            ].map((s) => (
              <div key={s.num} className="flex items-start gap-4 px-5 py-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-black ${s.done ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                  {s.done ? '✓' : s.num}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${s.done ? 'text-zinc-500 line-through' : 'text-white'}`}>{s.label}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{s.desc}</p>
                  {s.action && (
                    <button onClick={s.action} className="mt-2 text-xs text-green-400 font-semibold hover:text-green-300 transition-colors">
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
        <div className="rounded-2xl border border-green-500/20 mb-4 overflow-hidden" style={{ background: '#141f18' }}>
          <div className="px-5 py-3 border-b border-green-500/10 flex items-center gap-2">
            <span className="text-green-400 text-sm">📋</span>
            <p className="text-green-300 text-[10px] uppercase tracking-[0.15em] font-bold">Planos para revisar</p>
          </div>
          <div className="divide-y divide-green-500/[0.08]">
            {planosParaRevisar.map((p, i) => (
              <button key={i} onClick={() => router.push(`/nutricionista/paciente/${p.pacienteId}`)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:scale-[0.98] transition-all">
                <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <span className="text-green-400 text-xs font-black">{(p.nome ?? p.email)[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{p.nome ?? p.email.split('@')[0]}</p>
                  <p className="text-zinc-500 text-[10px]">Plano sem revisão há <span className="text-amber-400 font-semibold">{p.diasDesdeRevisao} dias</span></p>
                </div>
                <span className="text-zinc-600 text-sm shrink-0">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pacientesRecentes.length > 0 && (
        <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: 'var(--surface-1)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
            <p className="text-white font-semibold text-sm">Seus pacientes</p>
            <button onClick={() => router.push('/nutricionista/pacientes')} className="text-zinc-500 text-xs hover:text-white transition-colors">Ver todos →</button>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {pacientesRecentes.map((p, i) => {
              const planoAntigo = p.diasDesdeUltimoPlano != null && p.diasDesdeUltimoPlano >= 30
              return (
                <button key={i} onClick={() => router.push(`/nutricionista/paciente/${p.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/[0.03] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
                    <span className="text-zinc-300 text-sm font-bold">{(p.nome ?? p.email)[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-semibold truncate">{p.nome ?? p.email.split('@')[0]}</p>
                      {!p.temPlano && <span className="text-xs text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">Sem plano</span>}
                      {planoAntigo && <span className="text-xs text-zinc-500 rounded-full px-2 py-0.5 shrink-0">{p.diasDesdeUltimoPlano}d sem revisão</span>}
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 text-xs">
                      {p.sonoScore != null && <span>Recup.: {p.sonoScore}/100</span>}
                      {p.treinos7d > 0 && <span>{p.treinos7d}x treinos</span>}
                      {p.kcal7d > 0 && <span>{p.kcal7d >= 1000 ? `${(p.kcal7d/1000).toFixed(1)}k` : p.kcal7d} kcal/sem.</span>}
                    </div>
                  </div>
                  <span className="text-zinc-600 text-sm shrink-0">›</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button onClick={() => router.push('/nutricionista/pacientes')} className="w-full border border-white/[0.14] text-zinc-300 font-bold py-3.5 rounded-2xl hover:bg-white/[0.05] active:scale-95 transition-all text-sm tracking-[0.1em] uppercase mb-3">Ver todos os pacientes</button>
      <button onClick={() => router.push('/convite')} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all text-sm tracking-[0.1em] uppercase">+ Convidar paciente</button>
    </div>
    </div>
    </div>
  )
}
