'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import ProfissionalAIChat, { type ContextoProfissional } from '../../../components/ProfissionalAIChat'
import SidebarProfissional from '../../../components/SidebarProfissional'
import { LayoutDashboard, Dumbbell, TrendingUp, UserCircle } from 'lucide-react'
import CalendarioConsistencia, { type AtividadeDia, MOD_CONFIG } from '../../../components/CalendarioConsistencia'
import { calcularPMC, type PontoPMC } from '../../../lib/alertas-cientificos'
import { gerarNarrativaBloco } from '../../../lib/narrativa-treino'

type Aluno = { id: string; nome: string | null; email: string; peso: number | null; objetivo: string | null; altura: number | null; sexo: string | null; data_nascimento: string | null; meta_peso: number | null; meta_data_limite: string | null; nivel: string | null; fcmax: number | null; ftp: number | null }
type Exercicio = { id?: string; nome: string; series: number; repeticoes: number; carga_sugerida: number | null; observacoes: string; ordem: number }
type Treino = { id: string; nome: string; descricao: string | null; plano: string; status: string; data: string | null; exercicios: Exercicio[] }
type Monitor = {
  scoreRecuperacao: number | null
  sonoHoras: number | null
  bemEstarMedia: number | null
  totalTreinos: number
  treinosSemana: number
  ultimoTreino: string | null
}
type Execucao = { id: string; nome: string; plano: string; data: string; calorias: number | null; volume: number; seriesFeitas: number; exercicios: { nome: string; maxCarga: number; series: number }[] }
type CargaPonto = { data: string; carga: number }
type MedidaCP = { data: string; peso: number | null; gordura_pct: number | null; massa_muscular: number | null; cintura: number | null; quadril: number | null; braco_dir: number | null; coxa_dir: number | null }
type PlanoNutri = { id?: string; conteudo?: string | null; calorias_meta: number | null; proteina_meta: number | null; created_at: string }
type FaseCiclo = {
  nomeCiclo: string
  nomeBloco: string
  tipoBloco: string
  semanaBloco: number
  semanasBloco: number
  totalSemanas: number
  diasAteProximoBloco: number | null
}
type BlocoSessao = {
  id?: string
  ordem: number
  nome: string
  duracao_min: number | null
  distancia_km: number | null
  repeticoes: number | null
  zona_fc: string | null
  fc_min: number | null
  fc_max: number | null
  pace_alvo: string | null
  ftp_pct: number | null
  watts_alvo: number | null
  observacao: string | null
}
type SessaoPresc = {
  id?: string
  data: string
  modalidade: 'corrida' | 'bike' | 'natacao' | 'musculacao' | 'descanso'
  tipo_sessao: string | null
  duracao_min: number | null
  distancia_km: number | null
  observacao: string | null
  status: string
  blocos: BlocoSessao[]
}

const MODALIDADES_TREINO = [
  { nome: 'Musculação', icone: '🏋️', disponivel: true },
  { nome: 'Assessoria de Corrida', icone: '🏃', disponivel: false },
  { nome: 'Assessoria de Bike', icone: '🚴', disponivel: false },
  { nome: 'Assessoria de Natação', icone: '🏊', disponivel: false },
  { nome: 'Triathlon', icone: '🔱', disponivel: false },
] as const

type StatusAderencia = 'concluido' | 'parcial' | 'nao_realizado' | 'realizado_sem_planejamento'
const STATUS_ICON: Record<StatusAderencia, string> = { concluido: '✅', parcial: '⚠️', nao_realizado: '❌', realizado_sem_planejamento: '⬜' }

const STATUS_BADGE: Record<string, { label: string; emoji: string; cls: string }> = {
  planejado: { label: 'Planejado', emoji: '🗓️', cls: 'text-zinc-400 bg-white/[0.05] border-white/[0.14]' },
  concluido: { label: 'Realizado', emoji: '✅', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  parcial: { label: 'Parcial', emoji: '⚠️', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  nao_realizado: { label: 'Não realizado', emoji: '❌', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  realizado_sem_planejamento: { label: 'Realizado sem planejamento', emoji: '⬜', cls: 'text-zinc-400 bg-white/[0.05] border-white/[0.14]' },
}

type IndicadorAderencia = { icone: '✅' | '⚠️' | null; prescrito: string | null; realizado: string | null }

// "5:30/km" ou "1:45/100m" → segundos
function parsePaceToSec(pace: string | null): number | null {
  if (!pace) return null
  const m = pace.match(/(\d+):(\d{2})/)
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

function formatSecToPace(sec: number): string {
  const min = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${min}:${s.toString().padStart(2, '0')}`
}

// Compara prescrito vs realizado dentro de uma tolerância (relativa ou absoluta)
function compararIndicador(prescrito: number | null, realizado: number | null, tolerancia: number, relativo: boolean): '✅' | '⚠️' | null {
  if (prescrito == null || realizado == null) return null
  const diff = relativo ? Math.abs(realizado - prescrito) / prescrito : Math.abs(realizado - prescrito)
  return diff <= tolerancia ? '✅' : '⚠️'
}

function getInitials(nome: string | null, email: string): string {
  if (nome) { const p = nome.trim().split(' '); return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0][0].toUpperCase() }
  return email[0].toUpperCase()
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function gerarNarrativaPMC(
  pontos: PontoPMC[],
  proximaProva: string | null // data ISO, null por enquanto
): { emoji: string; titulo: string; linhas: string[]; cor: 'vermelho' | 'amarelo' | 'verde' } {

  const ultimo = pontos[pontos.length - 1]
  const { ctl, atl, tsb } = ultimo

  // Quantos dias consecutivos com TSB negativo?
  let diasNegativo = 0
  for (let i = pontos.length - 1; i >= 0; i--) {
    if (pontos[i].tsb < 0) diasNegativo++
    else break
  }

  // ATL % acima do CTL
  const atlAcimaCtl = ctl > 0 ? Math.round(((atl - ctl) / ctl) * 100) : 0

  // Dias até a prova (para taper)
  const diasAteProva = proximaProva
    ? Math.round((new Date(proximaProva).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  // TSB ideal para competir: entre +10 e +25
  // Para chegar em TSB +15 saindo de TSB atual, precisa de ~(tsb negativo / 8) dias de redução
  const diasTaperNecessario = tsb < 0 ? Math.round(Math.abs(tsb) / 8) : 0

  // SOBRECARGA ELEVADA
  if (tsb < -40) {
    const linhas = [
      `ATL ${atlAcimaCtl}% acima da carga crônica (CTL)`,
      `Atleta em zona de sobrecarga há ${diasNegativo} dias`,
    ]
    if (diasAteProva != null && diasAteProva > 0) {
      linhas.push(`Competição em ${diasAteProva} dias — taper de ${diasTaperNecessario} dias necessário`)
      if (diasAteProva < diasTaperNecessario) {
        linhas.push(`⚠️ Tempo insuficiente para recuperação completa antes da prova`)
      }
    } else {
      linhas.push(`Reduza volume por ${Math.min(diasTaperNecessario, 5)} dias antes de aumentar intensidade`)
    }
    return { emoji: '🔴', titulo: 'Fadiga acumulada elevada', linhas, cor: 'vermelho' }
  }

  // FADIGA ALTA MAS CONTROLADA
  if (tsb < -10) {
    const linhas = [
      `ATL ${atlAcimaCtl > 0 ? atlAcimaCtl + '% acima' : Math.abs(atlAcimaCtl) + '% abaixo'} da carga crônica`,
      `TSB negativo há ${diasNegativo} dias — carga de construção normal`,
    ]
    if (diasAteProva != null && diasAteProva > 0) {
      linhas.push(`Competição em ${diasAteProva} dias`)
      if (diasAteProva <= diasTaperNecessario + 3) {
        linhas.push(`Inicie redução de volume agora para chegar fresco`)
      } else {
        linhas.push(`Ainda há janela para manter carga antes do taper`)
      }
    } else {
      linhas.push(`Monitore sono e recuperação diariamente`)
    }
    return { emoji: '🟡', titulo: 'Fadiga alta — fase de construção', linhas, cor: 'amarelo' }
  }

  // EQUILÍBRIO
  if (tsb >= -10 && tsb <= 10) {
    const linhas = [
      `CTL e ATL equilibrados — atleta em manutenção`,
      `Bom momento para manter consistência de treino`,
    ]
    if (diasAteProva != null && diasAteProva > 0 && diasAteProva <= 14) {
      linhas.push(`Competição em ${diasAteProva} dias — redução leve de volume recomendada`)
    }
    return { emoji: '🟡', titulo: 'Equilíbrio — manutenção', linhas, cor: 'amarelo' }
  }

  // EM FORMA
  const linhas = [
    `TSB positivo — atleta descansada e em forma`,
    `CTL ${ctl.toFixed(1)} indica boa base de condicionamento`,
  ]
  if (diasAteProva != null && diasAteProva > 0 && diasAteProva <= 7) {
    linhas.push(`Competição em ${diasAteProva} dias — momento ideal para competir`)
  } else if (diasAteProva != null && diasAteProva > 7) {
    linhas.push(`Pode aumentar carga gradualmente — ACWR alvo: 1.0–1.3`)
  } else {
    linhas.push(`Pode aumentar carga gradualmente — ACWR alvo: 1.0–1.3`)
  }
  return { emoji: '🟢', titulo: 'Em forma — pronta para competir ou aumentar carga', linhas, cor: 'verde' }
}

function getInicioFimSemana(offset: number): { inicio: string; fim: string } {
  const hoje = getTodayBR()
  const dBase = new Date(hoje + 'T12:00:00-03:00')
  const fmtISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const ini = new Date(dBase); ini.setDate(dBase.getDate() - dBase.getDay() + offset * 7)
  const fim = new Date(dBase); fim.setDate(dBase.getDate() - dBase.getDay() + offset * 7 + 6)
  return { inicio: fmtISO(ini), fim: fmtISO(fim) }
}

function formatDiaDetalhe(dataStr: string): string {
  const d = new Date(dataStr + 'T12:00:00-03:00')
  const s = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getDistribuicaoModalidade(lista: AtividadeDia[]) {
  const map: Record<string, number> = {}
  lista.forEach(a => { map[a.tipo] = (map[a.tipo] ?? 0) + 1 })
  const total = lista.length
  return Object.entries(map)
    .map(([tipo, count]) => ({ tipo, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function getZonaFC(fcMedia: number, fcmax: number): { zona: number; label: string; cor: string } {
  const pct = fcMedia / fcmax
  if (pct < 0.60) return { zona: 1, label: 'Z1 · Recuperação', cor: '#60a5fa' }
  if (pct < 0.70) return { zona: 2, label: 'Z2 · Base aeróbica', cor: '#34d399' }
  if (pct < 0.80) return { zona: 3, label: 'Z3 · Limiar', cor: '#fbbf24' }
  if (pct < 0.90) return { zona: 4, label: 'Z4 · Anaeróbico', cor: '#f97316' }
  return { zona: 5, label: 'Z5 · VO2max', cor: '#f87171' }
}

function diasSemTreinar(ultimoTreino: string | null): number {
  if (!ultimoTreino) return 999
  const d = new Date(ultimoTreino + 'T12:00:00-03:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

const PLANOS_MAX = ['A', 'B', 'C', 'D', 'E']
const CORES: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  B: { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  C: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  D: { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20'  },
  E: { text: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20'    },
}
const TIPO_COR_LISTA: Record<string, string> = {
  adaptacao:   'text-teal-400 border-teal-500/20 bg-teal-500/10',
  hipertrofia: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  forca:       'text-blue-400 border-blue-500/20 bg-blue-500/10',
  resistencia: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
  deload:      'text-zinc-400 border-zinc-500/20 bg-zinc-500/10',
  potencia:    'text-orange-400 border-orange-500/20 bg-orange-500/10',
}

const ZONAS_FC: Record<string, { label: string; min: number; max: number }> = {
  Z1: { label: 'Recuperação',   min: 0.50, max: 0.60 },
  Z2: { label: 'Base aeróbica', min: 0.60, max: 0.70 },
  Z3: { label: 'Limiar',        min: 0.70, max: 0.80 },
  Z4: { label: 'Anaeróbico',    min: 0.80, max: 0.90 },
  Z5: { label: 'VO2max',        min: 0.90, max: 1.00 },
}
function calcularFaixaFC(zona: string | null, fcmax: number | null): { min: number; max: number } | null {
  if (!zona || !fcmax) return null
  const z = ZONAS_FC[zona]
  if (!z) return null
  return { min: Math.round(fcmax * z.min), max: Math.round(fcmax * z.max) }
}
function calcularWatts(ftpPct: number | null, ftp: number | null): number | null {
  if (!ftpPct || !ftp) return null
  return Math.round(ftp * (ftpPct / 100))
}

const MODALIDADES_SESSAO: Record<string, { label: string; icone: string; text: string; bg: string; border: string }> = {
  corrida:    { label: 'Corrida',    icone: '🏃', text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  bike:       { label: 'Bike',       icone: '🚴', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  natacao:    { label: 'Natação',    icone: '🏊', text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
  musculacao: { label: 'Musculação', icone: '🏋️', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  descanso:   { label: 'Descanso',   icone: '😴', text: 'text-zinc-400',   bg: 'bg-zinc-500/10',   border: 'border-zinc-500/20' },
}
const TIPOS_SESSAO = ['continuo', 'intervalado', 'longo', 'regenerativo', 'fartlek', 'ritmo', 'tecnico'] as const
const TIPO_SESSAO_LABEL: Record<string, string> = {
  continuo: 'Contínuo', intervalado: 'Intervalado', longo: 'Longo', regenerativo: 'Regenerativo',
  fartlek: 'Fartlek', ritmo: 'Ritmo', tecnico: 'Técnico',
}
const NOMES_BLOCO = ['Aquecimento', 'Principal', 'Desaquecimento', 'Intervalo', 'Outro'] as const
const DIAS_SEMANA_LABEL = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function getTabsModalidadeSessao(modalidadeEscolhida: 'musculacao' | 'triathlon' | 'corrida' | 'bike' | 'natacao' | null): SessaoPresc['modalidade'][] {
  switch (modalidadeEscolhida) {
    case 'corrida': return ['corrida', 'musculacao', 'descanso']
    case 'bike': return ['bike', 'musculacao', 'descanso']
    case 'natacao': return ['natacao', 'musculacao', 'descanso']
    default: return ['corrida', 'bike', 'natacao', 'musculacao', 'descanso']
  }
}

function vazioBloco(ordem: number): BlocoSessao {
  return { ordem, nome: 'Principal', duracao_min: null, distancia_km: null, repeticoes: null, zona_fc: null, fc_min: null, fc_max: null, pace_alvo: null, ftp_pct: null, watts_alvo: null, observacao: null }
}
function vazioSessao(data: string, modalidade: SessaoPresc['modalidade'] = 'corrida'): SessaoPresc {
  return { data, modalidade, tipo_sessao: 'continuo', duracao_min: null, distancia_km: null, observacao: null, status: 'planejado', blocos: [vazioBloco(1)] }
}

export default function PersonalAluno() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState('A')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoTreino, setEditandoTreino] = useState<Treino | null>(null)
  const [confirmaDeleteId, setConfirmaDeleteId] = useState<string | null>(null)
  const [modalEmBreve, setModalEmBreve] = useState<string | null>(null)
  const [modalidadeEscolhida, setModalidadeEscolhida] = useState<'musculacao' | 'triathlon' | 'corrida' | 'bike' | 'natacao' | null>(null)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [sessoesPrescritas, setSessoesPrescritas] = useState<SessaoPresc[]>([])
  const [carregandoSessoes, setCarregandoSessoes] = useState(false)
  const [sessaoEditando, setSessaoEditando] = useState<SessaoPresc | null>(null)
  const [diaEditando, setDiaEditando] = useState<string | null>(null)
  const [sessaoDetalhe, setSessaoDetalhe] = useState<SessaoPresc | null>(null)
  const [salvandoSessao, setSalvandoSessao] = useState(false)
  const [confirmaDeleteSessaoId, setConfirmaDeleteSessaoId] = useState<string | null>(null)
  const [excluindoSessao, setExcluindoSessao] = useState(false)
  const [personalNome, setPersonalNome] = useState('')
  const [execucoes, setExecucoes] = useState<Execucao[]>([])
  const [cargaEvolucao, setCargaEvolucao] = useState<Record<string, CargaPonto[]>>({})
  const [treinosDatas, setTreinosDatas] = useState<string[]>([])
  const [atividadesLivres, setAtividadesLivres] = useState<{ data: string; duracao_min: number | null }[]>([])
  const [cargaPorData, setCargaPorData] = useState<Record<string, number>>({})
  const [atividadesCalendario, setAtividadesCalendario] = useState<AtividadeDia[]>([])
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [pontosPMC, setPontosPMC] = useState<PontoPMC[]>([])
  const [pmcCarregado, setPmcCarregado] = useState(false)
  const [carregandoPMC, setCarregandoPMC] = useState(false)
  const fcmaxEstimado = useMemo(() => {
    return aluno?.fcmax ?? (Math.max(0, ...atividadesCalendario.filter(a => a.fc_max != null).map(a => a.fc_max as number)) || null)
  }, [aluno?.fcmax, atividadesCalendario])
  const cargaInternaSemanas = useMemo(() => {
    if (!fcmaxEstimado) return null
    const hoje = getTodayBR()
    const dBase = new Date(hoje + 'T12:00:00-03:00')
    const fmtISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    return [3, 2, 1, 0].map(n => {
      const ini = new Date(dBase); ini.setDate(dBase.getDate() - dBase.getDay() - n * 7)
      const fim = new Date(dBase); fim.setDate(dBase.getDate() - dBase.getDay() - n * 7 + 6)
      const iniStr = fmtISO(ini), fimStr = fmtISO(fim)
      const atual = n === 0
      const ativs = atividadesCalendario.filter(a =>
        a.data >= iniStr && a.data <= (atual ? hoje : fimStr) &&
        a.fc_media != null && a.duracao_min != null
      )
      const carga = Math.round(ativs.reduce((acc, a) => acc + ((a.fc_media as number) / fcmaxEstimado) * (a.duracao_min as number), 0))
      return { label: atual ? 'Esta semana' : `Sem ${4 - n}`, carga, atual }
    })
  }, [fcmaxEstimado, atividadesCalendario])
  const distModalidade28d = useMemo(() => getDistribuicaoModalidade(atividadesCalendario), [atividadesCalendario])
  const itensAderenciaSemana = useMemo(() => {
    const { inicio } = getInicioFimSemana(semanaOffset)
    const iniDate = new Date(inicio + 'T12:00:00-03:00')
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(iniDate); d.setDate(iniDate.getDate() + i)
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    })
    const hoje = getTodayBR()

    const sessoesSemana = sessoesPrescritas.filter(s =>
      dias.includes(s.data) && (['corrida', 'bike', 'natacao'] as const).includes(s.modalidade as 'corrida' | 'bike' | 'natacao')
    )

    const itensSessoes = sessoesSemana
      .filter(sessao => sessao.data <= hoje) // só avalia aderência de dias já passados/hoje
      .map(sessao => {
        const ativ = atividadesCalendario.find(a => a.data === sessao.data && a.tipo === sessao.modalidade)
        let status: StatusAderencia
        if (!ativ) {
          status = 'nao_realizado'
        } else if (sessao.duracao_min != null && ativ.duracao_min != null && ativ.duracao_min < sessao.duracao_min * 0.7) {
          status = 'parcial'
        } else {
          status = 'concluido'
        }

        // Indicador: duração
        const durSomaBlocos = sessao.blocos.reduce((acc, b) => acc + (b.duracao_min ?? 0), 0)
        const prescritoMin = durSomaBlocos > 0 ? durSomaBlocos : sessao.duracao_min
        const realizadoMin = ativ?.duracao_min ?? null
        const indDuracao: IndicadorAderencia = {
          icone: ativ ? compararIndicador(prescritoMin, realizadoMin, 0.15, true) : null,
          prescrito: prescritoMin != null ? `${prescritoMin}min` : null,
          realizado: realizadoMin != null ? `${realizadoMin}min` : null,
        }

        // Indicador: distância
        const distSomaBlocos = sessao.blocos.reduce((acc, b) => acc + (b.distancia_km ?? 0), 0)
        const prescritoDist = distSomaBlocos > 0 ? distSomaBlocos : sessao.distancia_km
        const realizadoDist = ativ?.distancia_km ?? null
        const indDistancia: IndicadorAderencia = {
          icone: ativ ? compararIndicador(prescritoDist, realizadoDist, 0.10, true) : null,
          prescrito: prescritoDist != null ? `${prescritoDist.toFixed(1).replace('.', ',')}km` : null,
          realizado: realizadoDist != null ? `${realizadoDist.toFixed(1).replace('.', ',')}km` : null,
        }

        // Indicador: pace (corrida = min/km, natação = min/100m; bike não se aplica)
        let indPace: IndicadorAderencia = { icone: null, prescrito: null, realizado: null }
        if (sessao.modalidade === 'corrida' || sessao.modalidade === 'natacao') {
          const blocoPrincipal = sessao.blocos.find(b => b.nome === 'Principal') ?? sessao.blocos[0]
          const prescritoPaceSec = blocoPrincipal ? parsePaceToSec(blocoPrincipal.pace_alvo) : null
          let realizadoPaceSec: number | null = null
          if (ativ?.duracao_min != null) {
            if (sessao.modalidade === 'corrida' && ativ.distancia_km) {
              realizadoPaceSec = (ativ.duracao_min * 60) / ativ.distancia_km
            } else if (sessao.modalidade === 'natacao' && ativ.distancia_m) {
              realizadoPaceSec = (ativ.duracao_min * 60) / (ativ.distancia_m / 100)
            }
          }
          const unidade = sessao.modalidade === 'corrida' ? '/km' : '/100m'
          indPace = {
            icone: ativ ? compararIndicador(prescritoPaceSec, realizadoPaceSec, 0.08, true) : null,
            prescrito: prescritoPaceSec != null ? `${formatSecToPace(prescritoPaceSec)}${unidade}` : null,
            realizado: realizadoPaceSec != null ? `${formatSecToPace(realizadoPaceSec)}${unidade}` : null,
          }
        }

        // Indicador: FC média (faixa prescrita = média dos fc_min/fc_max dos blocos)
        const blocosComFC = sessao.blocos.filter(b => b.fc_min != null && b.fc_max != null)
        const fcMinPrescrito = blocosComFC.length > 0
          ? Math.round(blocosComFC.reduce((acc, b) => acc + b.fc_min!, 0) / blocosComFC.length)
          : null
        const fcMaxPrescrito = blocosComFC.length > 0
          ? Math.round(blocosComFC.reduce((acc, b) => acc + b.fc_max!, 0) / blocosComFC.length)
          : null
        const realizadoFC = ativ?.fc_media ?? null
        let iconeFC: '✅' | '⚠️' | null = null
        if (ativ && realizadoFC != null && fcMinPrescrito != null && fcMaxPrescrito != null) {
          const tolerancia = 7
          iconeFC = (realizadoFC >= fcMinPrescrito - tolerancia && realizadoFC <= fcMaxPrescrito + tolerancia) ? '✅' : '⚠️'
        }
        const indFC: IndicadorAderencia = {
          icone: iconeFC,
          prescrito: (fcMinPrescrito != null && fcMaxPrescrito != null) ? `${fcMinPrescrito}–${fcMaxPrescrito}bpm` : null,
          realizado: realizadoFC != null ? `${realizadoFC}bpm` : null,
        }

        return { sessao, ativ, status, indDuracao, indDistancia, indPace, indFC }
      })

    // Atividades realizadas sem sessão prescrita correspondente (mesmo dia + modalidade)
    const indVazio: IndicadorAderencia = { icone: null, prescrito: null, realizado: null }
    const extras = dias
      .filter(d => d <= hoje)
      .flatMap(d => {
        const ativsDia = atividadesCalendario.filter(a =>
          a.data === d && (['corrida', 'bike', 'natacao'] as const).includes(a.tipo as 'corrida' | 'bike' | 'natacao')
        )
        return ativsDia
          .filter(ativ => !sessoesSemana.some(s => s.data === d && s.modalidade === ativ.tipo))
          .map(ativ => {
            const sessaoFake: SessaoPresc = {
              data: d, modalidade: ativ.tipo as 'corrida' | 'bike' | 'natacao', tipo_sessao: null,
              duracao_min: null, distancia_km: null, observacao: null, status: 'realizado_sem_planejamento', blocos: [],
            }
            return {
              sessao: sessaoFake,
              ativ,
              status: 'realizado_sem_planejamento' as StatusAderencia,
              indDuracao: { ...indVazio, realizado: ativ.duracao_min != null ? `${ativ.duracao_min}min` : null },
              indDistancia: { ...indVazio, realizado: ativ.distancia_km != null ? `${ativ.distancia_km.toFixed(1)}km` : null },
              indPace: indVazio,
              indFC: { ...indVazio, realizado: ativ.fc_media != null ? `${ativ.fc_media}bpm` : null },
            }
          })
      })

    return [...itensSessoes, ...extras].sort((a, b) => a.sessao.data.localeCompare(b.sessao.data))
  }, [sessoesPrescritas, atividadesCalendario, semanaOffset])

  // Persiste o status calculado de volta em sessoes_prescritas quando ele difere do salvo
  useEffect(() => {
    const pendentes = itensAderenciaSemana.filter(it => it.sessao.id && it.status !== it.sessao.status)
    if (pendentes.length === 0) return
    ;(async () => {
      for (const it of pendentes) {
        await supabase.from('sessoes_prescritas').update({ status: it.status }).eq('id', it.sessao.id)
      }
      setSessoesPrescritas(prev => prev.map(s => {
        const match = pendentes.find(p => p.sessao.id === s.id)
        return match ? { ...s, status: match.status } : s
      }))
    })()
  }, [itensAderenciaSemana])

  const [medidasCP, setMedidasCP] = useState<MedidaCP[]>([])
  const [historicoIACarregado, setHistoricoIACarregado] = useState(false)
  const [historicoIACarregando, setHistoricoIACarregando] = useState(false)
  const [historicoIA, setHistoricoIA] = useState<{
    atividades: { data: string; modalidade: string; duracao_min: number; distancia_km: number | null; calorias_wearable: number | null; calorias_estimadas: number | null; fc_media: number | null; fc_max: number | null }[]
    treinos: { data: string; nome: string; calorias: number | null; volume: number; exercicios: string[] }[]
    sono: { data: string; score: number | null; duracao_min: number | null }[]
  } | null>(null)
  const [planoNutri, setPlanoNutri] = useState<PlanoNutri | null>(null)
  const [restricaoNutri, setRestricaoNutri] = useState<string | null>(null)
  const [lesoes, setLesoes] = useState<string | null>(null)
  const [restricaoFisica, setRestricaoFisica] = useState<string | null>(null)
  const [medicamentos, setMedicamentos] = useState<string | null>(null)
  const [alergias, setAlergias] = useState<string | null>(null)
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<string | null>(null)
  const [proximaConsultaInfo, setProximaConsultaInfo] = useState<{ data: string; hora: string | null; tipo: string | null } | null>(null)
  const [anamneseCompleta, setAnamneseCompleta] = useState<any | null>(null)
  const [sonoHojeInfo, setSonoHojeInfo] = useState<{ score: number | null; duracaoMin: number | null } | null>(null)
  const [sonoHistorico7d, setSonoHistorico7d] = useState<{ data: string; score: number | null; duracaoMin: number | null }[]>([])
  const [bemEstarHojeInfo, setBemEstarHojeInfo] = useState<{ humor: number | null; energia: number | null; motivacao: number | null; dorMuscular: number | null; notas: string | null } | null>(null)
  const [fasePeriodizacaoChat, setFasePeriodizacaoChat] = useState<string | null>(null)
  const [faseCiclo, setFaseCiclo] = useState<FaseCiclo | null>(null)
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [salvandoFicha, setSalvandoFicha] = useState(false)
  const [fichaPeso, setFichaPeso] = useState('')
  const [fichaAltura, setFichaAltura] = useState('')
  const [fichaSexo, setFichaSexo] = useState('')
  const [fichaNascimento, setFichaNascimento] = useState('')
  const [fichaObjetivo, setFichaObjetivo] = useState('')
  const [fichaMetaPeso, setFichaMetaPeso] = useState('')
  const [fichaMetaData, setFichaMetaData] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'visao-geral' | 'treinos' | 'evolucao' | 'perfil'>('visao-geral')

  useEffect(() => { carregar() }, [clienteId])

  useEffect(() => {
    if (treinos.length > 0 && modalidadeEscolhida === null) setModalidadeEscolhida('musculacao')
  }, [treinos])

  useEffect(() => {
    if (['triathlon', 'corrida', 'bike', 'natacao'].includes(modalidadeEscolhida ?? '') && clienteId) carregarSessoesSemana(semanaOffset)
  }, [modalidadeEscolhida, semanaOffset, clienteId])

  useEffect(() => {
    if (clienteId && !historicoIACarregado && !historicoIACarregando) {
      carregarHistoricoCompletoIA()
    }
  }, [clienteId])

  useEffect(() => {
    if (clienteId && fcmaxEstimado != null && !pmcCarregado && !carregandoPMC) {
      carregarPMC()
    }
  }, [clienteId, fcmaxEstimado, pmcCarregado, carregandoPMC])

  async function carregarPMC() {
    setCarregandoPMC(true)
    const d = new Date()
    d.setDate(d.getDate() - 90)
    const noventaDiasAtras = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const { data } = await supabase
      .from('atividades_livres')
      .select('data, modalidade, duracao_min, distancia_km, fc_media')
      .eq('usuario_id', clienteId)
      .gte('data', noventaDiasAtras)
      .not('fc_media', 'is', null)
      .order('data')
    if (data && fcmaxEstimado != null) {
      const pontosPMC = calcularPMC(data, fcmaxEstimado, 90)
      setPontosPMC(pontosPMC)

      const ultimoPonto = pontosPMC[pontosPMC.length - 1]
      if (ultimoPonto) {
        await supabase.from('perfis').update({
          tsb_atual: ultimoPonto.tsb,
          atl_atual: ultimoPonto.atl,
          ctl_atual: ultimoPonto.ctl,
          metricas_atualizadas_em: new Date().toISOString()
        }).eq('id', clienteId)
      }
    }
    setPmcCarregado(true)
    setCarregandoPMC(false)
  }

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const hoje = getTodayBR()
    const hojeDate = new Date()
    const domingoSemana = new Date(hojeDate)
    domingoSemana.setDate(hojeDate.getDate() - hojeDate.getDay())
    const semanaStr = domingoSemana.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [{ data: perfil }, { data: treinosData }, { data: sonoHoje }, { data: bemEstarData }, { data: treinosHist }, { data: perfilPersonal }] = await Promise.all([
      supabase.from('perfis').select('id, nome, email, peso, objetivo, altura, sexo, data_nascimento, meta_peso, meta_data_limite, nivel, fcmax, ftp').eq('id', clienteId).single(),
      supabase.from('treinos').select('id, nome, descricao, plano, status, data').eq('cliente_id', clienteId).eq('personal_id', session.user.id).order('plano'),
      supabase.from('sono').select('score_recuperacao, duracao_minutos').eq('usuario_id', clienteId).eq('data', hoje).single(),
      supabase.from('bem_estar').select('data, humor, energia, motivacao, dor_muscular, notas').eq('usuario_id', clienteId).gte('data', semanaStr).order('data', { ascending: false }),
      supabase.from('treinos').select('data, concluido').eq('cliente_id', clienteId).eq('concluido', true).order('data', { ascending: false }),
      supabase.from('perfis').select('nome').eq('id', session.user.id).single(),
    ])

    if (perfil) setAluno(perfil)
    if (perfilPersonal?.nome) setPersonalNome(perfilPersonal.nome)

    const bemMedia = bemEstarData?.length
      ? Math.round(bemEstarData.slice(0, 7).reduce((acc, b) => acc + ((b.humor + b.energia + b.motivacao) / 3), 0) / Math.min(bemEstarData.length, 7))
      : null

    setSonoHojeInfo({ score: sonoHoje?.score_recuperacao ?? null, duracaoMin: sonoHoje?.duracao_minutos ?? null })
    const bemHoje = (bemEstarData ?? []).find((b: any) => b.data === hoje)
    if (bemHoje) setBemEstarHojeInfo({ humor: bemHoje.humor ?? null, energia: bemHoje.energia ?? null, motivacao: bemHoje.motivacao ?? null, dorMuscular: bemHoje.dor_muscular ?? null, notas: bemHoje.notas ?? null })

    if (treinosData?.length) {
      const ids = treinosData.map(t => t.id)
      const { data: exercicios } = await supabase.from('exercicios_treino').select('*').in('treino_id', ids).order('ordem')
      setTreinos(treinosData.map(t => ({ ...t, exercicios: exercicios?.filter(e => e.treino_id === t.id) ?? [] })))
    } else {
      setTreinos([])
    }

    // Histórico de execuções + evolução de carga + calendário + composição corporal
    const trinta = new Date(); trinta.setDate(trinta.getDate() - 30)
    const trintaStr = trinta.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const seteAtras = new Date(); seteAtras.setDate(seteAtras.getDate() - 6)
    const seteStr = seteAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const [
      { data: treinosCompletos }, { data: atvsLivres30 }, { data: medidasData },
      { data: planoNutriData }, { data: anamneseNutri }, { data: ultimaAvalData },
      { data: anamneseCompletaData }, { data: sonoHistData }, { data: proximaConsultaData },
    ] = await Promise.all([
      supabase.from('treinos').select('id, nome, plano, data, calorias_estimadas').eq('cliente_id', clienteId).eq('concluido', true).order('data', { ascending: false }).limit(30),
      supabase.from('atividades_livres').select('data, modalidade, duracao_min, distancia_km, distancia_m, calorias_estimadas, calorias_wearable, fc_media, fc_max').eq('usuario_id', clienteId).gte('data', trintaStr).order('data', { ascending: false }),
      supabase.from('evolucao_medidas').select('data,peso,gordura_pct,massa_muscular,cintura,quadril,braco_dir,coxa_dir').eq('cliente_id', clienteId).order('data', { ascending: true }).limit(10),
      supabase.from('planos_nutricionais').select('id,conteudo,calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('anamneses').select('restricoes_alimentares,suplementos,lesoes,restricoes_fisicas,medicamentos,alergias').eq('cliente_id', clienteId).not('profissional_id', 'is', null).order('criado_em', { ascending: false }).limit(5),
      supabase.from('agendamentos').select('data').eq('cliente_id', clienteId).eq('profissional_id', session.user.id).eq('status', 'realizado').order('data', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('anamneses').select('*').eq('cliente_id', clienteId).order('atualizado_em', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sono').select('data,score_recuperacao,duracao_minutos').eq('usuario_id', clienteId).gte('data', seteStr).order('data', { ascending: true }),
      supabase.from('agendamentos').select('data,hora,tipo').eq('cliente_id', clienteId).eq('status', 'agendado').gte('data', hoje).order('data').limit(1).maybeSingle(),
    ])

    const treinosPrescritosNaSemana = treinosHist?.filter(t => t.data >= semanaStr).length ?? 0
    const atividadesNaSemana = atvsLivres30?.filter(a => a.data >= semanaStr).length ?? 0
    const totalTreinosSemana = treinosPrescritosNaSemana + atividadesNaSemana

    const ultimoTreinoData = treinosHist?.[0]?.data ?? null
    const ultimaAtivData = atvsLivres30?.[0]?.data ?? null
    const ultimaAtividadeReal = [ultimoTreinoData, ultimaAtivData]
      .filter((d): d is string => Boolean(d))
      .sort()
      .reverse()[0] ?? null

    setMonitor({
      scoreRecuperacao: sonoHoje?.score_recuperacao ?? null,
      sonoHoras: sonoHoje?.duracao_minutos ? Math.round((sonoHoje.duracao_minutos / 60) * 10) / 10 : null,
      bemEstarMedia: bemMedia,
      totalTreinos: treinosHist?.length ?? 0,
      treinosSemana: totalTreinosSemana,
      ultimoTreino: ultimaAtividadeReal,
    })

    if (medidasData?.length) setMedidasCP(medidasData as MedidaCP[])
    if (planoNutriData) setPlanoNutri(planoNutriData)
    if (anamneseCompletaData) setAnamneseCompleta(anamneseCompletaData)
    if (sonoHistData?.length) setSonoHistorico7d(sonoHistData.map((s: any) => ({ data: s.data, score: s.score_recuperacao, duracaoMin: s.duracao_minutos })))
    if (proximaConsultaData?.data) setProximaConsultaInfo({ data: proximaConsultaData.data, hora: proximaConsultaData.hora ?? null, tipo: proximaConsultaData.tipo ?? null })
    // Collect food restrictions from any professional's anamnese
    const restricoes = (anamneseNutri ?? []).map((a: any) => a.restricoes_alimentares).filter(Boolean).join(' · ')
    if (restricoes) setRestricaoNutri(restricoes)
    const lesoesCombined = (anamneseNutri ?? []).map((a: any) => a.lesoes).filter(Boolean).join(' · ')
    const rfCombined = (anamneseNutri ?? []).map((a: any) => a.restricoes_fisicas).filter(Boolean).join(' · ')
    const medsCombined = (anamneseNutri ?? []).map((a: any) => a.medicamentos).filter(Boolean).join(' · ')
    const alergiasCombined = (anamneseNutri ?? []).map((a: any) => a.alergias).filter(Boolean).join(' · ')
    if (lesoesCombined) setLesoes(lesoesCombined)
    if (rfCombined) setRestricaoFisica(rfCombined)
    if (medsCombined) setMedicamentos(medsCombined)
    if (alergiasCombined) setAlergias(alergiasCombined)
    if (ultimaAvalData?.data) setUltimaAvaliacao(ultimaAvalData.data)

    const modLabelCalendario: Record<string, string> = { corrida: 'Corrida', bike: 'Bike', natacao: 'Natação', crossfit: 'Crossfit', outro: 'Atividade' }
    const listaCalendario: AtividadeDia[] = []
    treinosCompletos?.forEach((t: any) => {
      listaCalendario.push({ data: t.data, tipo: 'musculacao', nome: t.nome ?? `Treino ${t.plano}`, detalhe: `Plano ${t.plano}`, calorias: t.calorias_estimadas ?? null })
    })
    atvsLivres30?.forEach((a: any) => {
      let detalhe = a.duracao_min ? `${a.duracao_min}min` : ''
      if (a.distancia_km) detalhe += `${detalhe ? ' · ' : ''}${a.distancia_km}km`
      if (a.distancia_m) detalhe += `${detalhe ? ' · ' : ''}${a.distancia_m}m`
      listaCalendario.push({ data: a.data, tipo: a.modalidade, nome: modLabelCalendario[a.modalidade] ?? 'Atividade', detalhe, calorias: a.calorias_wearable ?? a.calorias_estimadas ?? null, fc_media: a.fc_media ?? null, fc_max: a.fc_max ?? null, duracao_min: a.duracao_min ?? null, distancia_km: a.distancia_km ?? null, distancia_m: a.distancia_m ?? null })
    })
    setAtividadesCalendario(listaCalendario)
    setTreinosDatas((treinosCompletos ?? []).map((t: any) => t.data))
    setAtividadesLivres((atvsLivres30 ?? []).map((a: any) => ({ data: a.data, duracao_min: a.duracao_min ?? null })))

    if (treinosCompletos?.length) {
      const tIds = treinosCompletos.map((t: { id: string }) => t.id)
      const { data: exsHist } = await supabase.from('exercicios_treino').select('id, treino_id, nome').in('treino_id', tIds)
      const exIds = (exsHist ?? []).map((e: { id: string }) => e.id)
      const { data: seriesHist } = exIds.length
        ? await supabase.from('series_registradas').select('exercicio_id, carga, repeticoes').in('exercicio_id', exIds).not('carga', 'is', null)
        : { data: [] }
      const execData: Execucao[] = (treinosCompletos as any[]).slice(0, 8).map((t: any) => {
        const exsT = (exsHist ?? []).filter((e: any) => e.treino_id === t.id)
        const srsT = (seriesHist ?? []).filter((s: any) => exsT.some((e: any) => e.id === s.exercicio_id))
        const vol = srsT.reduce((acc: number, s: any) => acc + ((s.carga ?? 0) * (s.repeticoes ?? 0)), 0)
        const exMap = new Map<string, { maxCarga: number; series: number }>()
        for (const s of srsT as any[]) {
          const ex = (exsHist ?? []).find((e: any) => e.id === s.exercicio_id)
          if (!ex) continue
          if (!exMap.has(ex.nome)) exMap.set(ex.nome, { maxCarga: 0, series: 0 })
          const cur = exMap.get(ex.nome)!
          if ((s.carga ?? 0) > cur.maxCarga) cur.maxCarga = s.carga ?? 0
          cur.series++
        }
        const exerciciosExec = Array.from(exMap.entries()).map(([nome, v]) => ({ nome, maxCarga: v.maxCarga, series: v.series })).slice(0, 4)
        return { id: t.id, nome: t.nome, plano: t.plano, data: t.data, calorias: t.calorias_estimadas ?? null, volume: Math.round(vol), seriesFeitas: srsT.length, exercicios: exerciciosExec }
      })
      setExecucoes(execData)
      const cargaMap: Record<string, CargaPonto[]> = {}
      for (const t of [...(treinosCompletos as any[])].reverse()) {
        const exsT = (exsHist ?? []).filter((e: any) => e.treino_id === t.id)
        for (const ex of (exsT as any[])) {
          const srsEx = (seriesHist ?? []).filter((s: any) => s.exercicio_id === ex.id)
          if (!srsEx.length) continue
          const maxCarga = Math.max(...srsEx.map((s: any) => s.carga ?? 0))
          if (maxCarga <= 0) continue
          if (!cargaMap[ex.nome]) cargaMap[ex.nome] = []
          if (!cargaMap[ex.nome].find((p: CargaPonto) => p.data === t.data))
            cargaMap[ex.nome].push({ data: t.data, carga: maxCarga })
        }
      }
      setCargaEvolucao(cargaMap)

      const cargaPorDataMap: Record<string, number> = {}
      for (const t of (treinosCompletos as any[])) {
        const exsT = (exsHist ?? []).filter((e: any) => e.treino_id === t.id)
        const srsT = (seriesHist ?? []).filter((s: any) => exsT.some((e: any) => e.id === s.exercicio_id))
        const vol = srsT.reduce((acc: number, s: any) => acc + ((s.carga ?? 0) * (s.repeticoes ?? 0)), 0)
        cargaPorDataMap[t.data] = (cargaPorDataMap[t.data] ?? 0) + vol
      }
      setCargaPorData(cargaPorDataMap)
    }

    // Fase de periodização ativa
    const { data: periAtiva } = await supabase.from('periodizacoes').select('id,nome,data_inicio').eq('cliente_id', clienteId).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (periAtiva) {
      const { data: blocos } = await supabase.from('blocos_periodizacao').select('nome,tipo,semanas,ordem').eq('periodizacao_id', periAtiva.id).order('ordem')
      if (blocos?.length) {
        const inicio = new Date(periAtiva.data_inicio + 'T12:00:00-03:00')
        const diasTotais = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24))
        const semanaTotal = Math.max(1, Math.floor(diasTotais / 7) + 1)
        const totalSemanas = blocos.reduce((s: number, b: any) => s + b.semanas, 0)
        let acum = 0, blocoIdx = blocos.length - 1
        for (let i = 0; i < blocos.length; i++) {
          if (semanaTotal <= acum + (blocos[i] as any).semanas) { blocoIdx = i; break }
          acum += (blocos[i] as any).semanas
        }
        const b = blocos[blocoIdx] as any
        const semanaNoBloco = Math.min(semanaTotal - acum, b.semanas)
        const semanasRestantesBloco = b.semanas - semanaNoBloco
        const diasAteProximo = blocoIdx < blocos.length - 1 ? semanasRestantesBloco * 7 : null
        setFaseCiclo({ nomeCiclo: periAtiva.nome, nomeBloco: b.nome, tipoBloco: b.tipo, semanaBloco: semanaNoBloco, semanasBloco: b.semanas, totalSemanas, diasAteProximoBloco: diasAteProximo })
        setFasePeriodizacaoChat(`${b.nome} (${b.tipo}) — semana ${semanaNoBloco} de ${b.semanas}`)
      }
    }

    setCarregando(false)
  }

  async function carregarHistoricoCompletoIA() {
    if (historicoIACarregado || historicoIACarregando || !clienteId) return
    setHistoricoIACarregando(true)

    const seisM = new Date()
    seisM.setDate(seisM.getDate() - 180)
    const q180 = seisM.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [{ data: ativs6m }, { data: sono6m }, { data: treinos6m }] = await Promise.all([
      supabase.from('atividades_livres')
        .select('data,modalidade,duracao_min,distancia_km,calorias_estimadas,calorias_wearable,fc_media,fc_max')
        .eq('usuario_id', clienteId).gte('data', q180).order('data', { ascending: false }),
      supabase.from('sono')
        .select('data,score_recuperacao,duracao_minutos')
        .eq('usuario_id', clienteId).gte('data', q180).order('data', { ascending: false }),
      supabase.from('treinos')
        .select('id,data,nome,calorias_estimadas')
        .eq('cliente_id', clienteId).eq('concluido', true).gte('data', q180).order('data', { ascending: false }),
    ])

    let treinosMapeados: { data: string; nome: string; calorias: number | null; volume: number; exercicios: string[] }[] = []
    if (treinos6m?.length) {
      const ids = (treinos6m as any[]).map(t => t.id)
      const { data: exs } = await supabase
        .from('exercicios_treino').select('treino_id,nome').in('treino_id', ids)
      treinosMapeados = (treinos6m as any[]).map(t => ({
        data: t.data,
        nome: t.nome,
        calorias: t.calorias_estimadas,
        volume: 0,
        exercicios: ((exs ?? []) as any[]).filter(e => e.treino_id === t.id).slice(0, 3).map((e: any) => e.nome),
      }))
    }

    setHistoricoIA({
      atividades: (ativs6m ?? []).map((a: any) => ({
        data: a.data,
        modalidade: a.modalidade,
        duracao_min: a.duracao_min,
        distancia_km: a.distancia_km,
        calorias_wearable: a.calorias_wearable,
        calorias_estimadas: a.calorias_estimadas,
        fc_media: a.fc_media ?? null,
        fc_max: a.fc_max ?? null,
      })),
      treinos: treinosMapeados,
      sono: ((sono6m ?? []) as any[]).map(s => ({ data: s.data, score: s.score_recuperacao, duracao_min: s.duracao_minutos })),
    })
    setHistoricoIACarregado(true)
    setHistoricoIACarregando(false)
  }

  async function carregarSessoesSemana(offset: number) {
    setCarregandoSessoes(true)
    const { inicio, fim } = getInicioFimSemana(offset)
    const { data, error } = await supabase
      .from('sessoes_prescritas')
      .select('*, blocos_sessao(*)')
      .eq('atleta_id', clienteId)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data')

    if (!error && data) {
      setSessoesPrescritas(data.map((s: any) => ({
        id: s.id,
        data: s.data,
        modalidade: s.modalidade,
        tipo_sessao: s.tipo_sessao,
        duracao_min: s.duracao_min,
        distancia_km: s.distancia_km,
        observacao: s.observacao,
        status: s.status,
        blocos: (s.blocos_sessao ?? [])
          .slice()
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((b: any) => ({
            id: b.id, ordem: b.ordem, nome: b.nome, duracao_min: b.duracao_min, distancia_km: b.distancia_km,
            repeticoes: b.repeticoes, zona_fc: b.zona_fc, fc_min: b.fc_min, fc_max: b.fc_max,
            pace_alvo: b.pace_alvo, ftp_pct: b.ftp_pct, watts_alvo: b.watts_alvo, observacao: b.observacao,
          })),
      })))
    }
    setCarregandoSessoes(false)
  }

  function updateBlocoEditando(i: number, patch: Partial<BlocoSessao>) {
    setSessaoEditando(prev => {
      if (!prev) return prev
      return { ...prev, blocos: prev.blocos.map((b, j) => j === i ? { ...b, ...patch } : b) }
    })
  }
  function addBlocoEditando() {
    setSessaoEditando(prev => prev ? { ...prev, blocos: [...prev.blocos, vazioBloco(prev.blocos.length + 1)] } : prev)
  }
  function removerBlocoEditando(i: number) {
    setSessaoEditando(prev => {
      if (!prev || prev.blocos.length <= 1) return prev
      return { ...prev, blocos: prev.blocos.filter((_, j) => j !== i).map((b, j) => ({ ...b, ordem: j + 1 })) }
    })
  }
  function setZonaBloco(i: number, zona: string) {
    setSessaoEditando(prev => {
      if (!prev) return prev
      const atual = prev.blocos[i]
      const novaZona = atual.zona_fc === zona ? null : zona
      const faixa = calcularFaixaFC(novaZona, fcmaxEstimado)
      return { ...prev, blocos: prev.blocos.map((b, j) => j === i ? { ...b, zona_fc: novaZona, fc_min: faixa?.min ?? null, fc_max: faixa?.max ?? null } : b) }
    })
  }

  async function salvarSessao() {
    if (!sessaoEditando || !diaEditando) return
    setSalvandoSessao(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSalvandoSessao(false); return }

    const blocos = sessaoEditando.modalidade === 'descanso' ? [] : sessaoEditando.blocos
    const payload = {
      coach_id: session.user.id,
      atleta_id: clienteId,
      data: diaEditando,
      modalidade: sessaoEditando.modalidade,
      tipo_sessao: sessaoEditando.modalidade === 'descanso' ? null : sessaoEditando.tipo_sessao,
      duracao_min: sessaoEditando.duracao_min,
      distancia_km: sessaoEditando.distancia_km,
      observacao: sessaoEditando.observacao,
      status: sessaoEditando.status,
    }

    let sessaoId = sessaoEditando.id
    if (sessaoId) {
      await supabase.from('sessoes_prescritas').update(payload).eq('id', sessaoId)
      await supabase.from('blocos_sessao').delete().eq('sessao_id', sessaoId)
    } else {
      const { data: nova, error } = await supabase.from('sessoes_prescritas').insert(payload).select('id').single()
      if (error || !nova) { setSalvandoSessao(false); return }
      sessaoId = nova.id
    }

    if (blocos.length > 0 && sessaoId) {
      await supabase.from('blocos_sessao').insert(blocos.map((b, i) => ({
        sessao_id: sessaoId,
        ordem: i + 1,
        nome: b.nome,
        duracao_min: b.duracao_min,
        distancia_km: b.distancia_km,
        repeticoes: b.repeticoes,
        zona_fc: b.zona_fc,
        fc_min: b.fc_min,
        fc_max: b.fc_max,
        pace_alvo: b.pace_alvo,
        ftp_pct: b.ftp_pct,
        watts_alvo: b.watts_alvo,
        observacao: b.observacao,
      })))
    }

    await carregarSessoesSemana(semanaOffset)
    setSalvandoSessao(false)
    setDiaEditando(null)
    setSessaoEditando(null)
  }

  async function excluirSessao(id: string) {
    setExcluindoSessao(true)
    await supabase.from('blocos_sessao').delete().eq('sessao_id', id)
    await supabase.from('sessoes_prescritas').delete().eq('id', id)
    await carregarSessoesSemana(semanaOffset)
    setExcluindoSessao(false)
    setConfirmaDeleteSessaoId(null)
    setDiaEditando(null)
    setSessaoEditando(null)
  }

  function vazio(ordem: number): Exercicio { return { nome: '', series: 3, repeticoes: 12, carga_sugerida: null, observacoes: '', ordem } }

  function abrirNovo() {
    setErroSalvar('')
    setEditandoTreino({ id: '', nome: `Treino ${planoAtivo}`, descricao: '', plano: planoAtivo, status: 'pendente', data: null, exercicios: [vazio(1)] })
    setModalAberto(true)
  }

  function abrirEditar(treino: Treino) {
    setErroSalvar('')
    setEditandoTreino({ ...treino, exercicios: [...treino.exercicios] })
    setModalAberto(true)
  }

  function addExercicio() {
    if (!editandoTreino) return
    setEditandoTreino({ ...editandoTreino, exercicios: [...editandoTreino.exercicios, vazio(editandoTreino.exercicios.length + 1)] })
  }

  function removerExercicio(i: number) {
    if (!editandoTreino) return
    setEditandoTreino({ ...editandoTreino, exercicios: editandoTreino.exercicios.filter((_, j) => j !== i).map((e, j) => ({ ...e, ordem: j + 1 })) })
  }

  function updateEx(i: number, campo: keyof Exercicio, valor: string | number | null) {
    if (!editandoTreino) return
    const novos = [...editandoTreino.exercicios]
    novos[i] = { ...novos[i], [campo]: valor }
    setEditandoTreino({ ...editandoTreino, exercicios: novos })
  }

  async function salvar() {
    if (!editandoTreino) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSalvando(true)
    setErroSalvar('')
    try {
      let tid = editandoTreino.id
      if (!tid) {
        const { data: novo, error } = await supabase.from('treinos').insert({
          personal_id: session.user.id, cliente_id: clienteId,
          nome: editandoTreino.nome, descricao: editandoTreino.descricao,
          plano: editandoTreino.plano, status: 'pendente',
        }).select('id').single()
        if (error) throw error
        tid = novo.id
      } else {
        const { error } = await supabase.from('treinos').update({ nome: editandoTreino.nome, descricao: editandoTreino.descricao, plano: editandoTreino.plano }).eq('id', tid)
        if (error) throw error
        await supabase.from('exercicios_treino').delete().eq('treino_id', tid)
      }
      const exs = editandoTreino.exercicios.filter(e => e.nome.trim()).map(e => ({ treino_id: tid, nome: e.nome.trim(), series: e.series, repeticoes: e.repeticoes, carga_sugerida: e.carga_sugerida, observacoes: e.observacoes, ordem: e.ordem }))
      if (exs.length) {
        const { error } = await supabase.from('exercicios_treino').insert(exs)
        if (error) throw error
      }
      // Notifica aluno por email ao prescrever novo treino (fire-and-forget)
      if (!editandoTreino.id && aluno?.email) {
        fetch('/api/notif-treino', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aluno_email: aluno.email,
            aluno_nome: aluno.nome,
            personal_nome: personalNome || 'Seu personal',
            treino_nome: editandoTreino.nome,
            plano: editandoTreino.plano,
          }),
        }).catch(console.error)
      }

      setModalAberto(false)
      setEditandoTreino(null)
      await carregar()
    } catch (err: any) {
      setErroSalvar(err?.message ?? 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function deletar(treinoId: string) {
    await supabase.from('exercicios_treino').delete().eq('treino_id', treinoId)
    await supabase.from('treinos').delete().eq('id', treinoId)
    await carregar()
  }

  async function salvarFicha() {
    setSalvandoFicha(true)
    const updates = {
      peso: fichaPeso ? parseFloat(fichaPeso) || null : null,
      altura: fichaAltura ? parseFloat(fichaAltura) || null : null,
      sexo: fichaSexo || null,
      data_nascimento: fichaNascimento || null,
      objetivo: fichaObjetivo || null,
      meta_peso: fichaMetaPeso ? parseFloat(fichaMetaPeso) || null : null,
      meta_data_limite: fichaMetaData || null,
    }
    await supabase.from('perfis').update(updates).eq('id', clienteId)
    setAluno(prev => prev ? { ...prev, ...updates } : prev)
    setEditandoFicha(false)
    setSalvandoFicha(false)
  }

  const treinoDoPlano = treinos.find(t => t.plano === planoAtivo)
  const cores = CORES[planoAtivo]

  if (carregando) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] text-white flex flex-col md:flex-row">
      <SidebarProfissional tipo="personal" />

      <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden md:h-screen">

        {/* ── HEADER FIXO ─────────────────────────────────────────────── */}
        <div className="shrink-0 sticky top-0 z-20 border-b"
             style={{ background: 'linear-gradient(135deg, rgba(28,22,30,0.96) 0%, rgba(20,22,34,0.96) 100%)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)', borderColor: 'rgba(255,255,255,0.10)', paddingTop: 'max(0.75rem, env(safe-area-inset-top))', boxShadow: '0 1px 0 rgba(255,90,54,0.08)' }}>
          <div className="px-4 md:px-8 pb-4">
            <button onClick={() => router.push('/personal')}
              style={{ color: '#7A8290', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F5F6F8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#7A8290')}>
              ← Alunos
            </button>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(52,211,153,0.12)' }}>
                  <span style={{ color: '#34d399', fontWeight: 900, fontSize: 16 }}>{aluno ? getInitials(aluno.nome, aluno.email) : '?'}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#F5F6F8', lineHeight: 1 }} className="truncate">
                      {aluno?.nome ?? aluno?.email ?? 'Aluno'}
                    </h1>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {aluno?.peso && (
                      <span style={{ fontSize: 11, color: '#9AA0AD', background: 'rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 10px' }}>
                        {aluno.peso} kg
                      </span>
                    )}
                    {aluno?.objetivo && (
                      <span style={{ fontSize: 11, color: '#9AA0AD', background: 'rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 10px' }}>
                        {OBJETIVO_LABEL[aluno.objetivo] ?? aluno.objetivo}
                      </span>
                    )}
                    {aluno?.meta_peso && (
                      <span style={{ fontSize: 11, color: '#34d399', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 99, padding: '3px 10px' }}>
                        Meta: {aluno.meta_peso} kg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* desktop: última aval + próxima + nível */}
              <div className="hidden md:flex items-center gap-6 shrink-0">
                {ultimaAvaliacao && (
                  <div className="text-right">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Última aval.</p>
                    <p className="text-zinc-300 text-sm font-medium mt-0.5">
                      {new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </p>
                  </div>
                )}
                {proximaConsultaInfo && (
                  <div className="text-right">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Próxima aval.</p>
                    <p className="text-[#34d399] text-sm font-medium mt-0.5">
                      {new Date(proximaConsultaInfo.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </p>
                  </div>
                )}
                {aluno?.nivel && (
                  <span className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
                    Nível: {aluno.nivel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── BARRA DE ABAS ────────────────────────────────────────────── */}
        <div className="shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex px-4 md:px-8 min-w-max">
            {([
              { id: 'visao-geral', label: 'Visão Geral', Icon: LayoutDashboard },
              { id: 'treinos',     label: 'Treinos',     Icon: Dumbbell },
              { id: 'evolucao',    label: 'Evolução',    Icon: TrendingUp },
              { id: 'perfil',      label: 'Perfil',      Icon: UserCircle },
            ] as { id: string; label: string; Icon: React.ComponentType<{ size?: number }> }[]).map(tab => (
              <button key={tab.id} onClick={() => setAbaAtiva(tab.id as any)}
                style={{
                  padding: '12px 16px', fontSize: 13,
                  color: abaAtiva === tab.id ? '#F5F6F8' : '#7A8290',
                  fontWeight: abaAtiva === tab.id ? 700 : 400,
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none',
                  borderBottom: `2px solid ${abaAtiva === tab.id ? '#FF5A36' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                <tab.Icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTEÚDO DAS ABAS ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 pb-28 md:pb-10">

            {/* ── ABA VISÃO GERAL ──────────────────────────────────────── */}
            {abaAtiva === 'visao-geral' && (
              <div className="space-y-5">

                {/* Alertas clínicos */}
                {(lesoes || restricaoFisica || medicamentos) && (
                  <div style={{ background: 'rgba(255,90,54,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,90,54,0.18)', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,90,54,0.10)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, color: '#f87171' }}>⚠</span>
                      <p style={{ fontSize: 11, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Alertas clínicos</p>
                    </div>
                    <div style={{ padding: '12px 20px' }} className="flex flex-col gap-3">
                      {lesoes && (
                        <div>
                          <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1">Lesões</p>
                          <p className="text-red-200/80 text-sm leading-relaxed">{lesoes}</p>
                        </div>
                      )}
                      {restricaoFisica && (
                        <div>
                          <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1">Restrições físicas</p>
                          <p className="text-amber-200/80 text-sm leading-relaxed">{restricaoFisica}</p>
                        </div>
                      )}
                      {medicamentos && (
                        <div>
                          <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1">Medicamentos</p>
                          <p className="text-zinc-300/80 text-sm leading-relaxed">{medicamentos}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status de hoje */}
                {monitor && (() => {
                  const recuperacao = monitor.scoreRecuperacao
                  const bemHoje = (bemEstarHojeInfo && bemEstarHojeInfo.humor != null && bemEstarHojeInfo.energia != null && bemEstarHojeInfo.motivacao != null)
                    ? (bemEstarHojeInfo.humor + bemEstarHojeInfo.energia + bemEstarHojeInfo.motivacao) / 3
                    : null
                  const dias = monitor.ultimoTreino ? diasSemTreinar(monitor.ultimoTreino) : null

                  let nivel: 'verde' | 'amarelo' | 'vermelho' | 'cinza' = 'cinza'
                  let texto = 'Sem dados hoje'

                  if (recuperacao != null || bemHoje != null) {
                    const ruim = (recuperacao != null && recuperacao < 50) || (bemHoje != null && bemHoje < 3) || (dias != null && dias >= 7)
                    const cautela = (recuperacao != null && recuperacao < 70) || (bemHoje != null && bemHoje < 4)
                    if (ruim) { nivel = 'vermelho'; texto = 'Considerar descanso' }
                    else if (cautela) { nivel = 'amarelo'; texto = 'Treinar com cautela' }
                    else { nivel = 'verde'; texto = 'Treinar normalmente' }
                  }

                  const SEMAFORO_CFG = {
                    verde:    { cor: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
                    amarelo:  { cor: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
                    vermelho: { cor: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
                    cinza:    { cor: '#71717a', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)' },
                  } as const
                  const cfg = SEMAFORO_CFG[nivel]

                  return (
                    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                      <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16, fontWeight: 700 }}>Status de hoje</p>

                      <div className="flex items-center gap-3 mb-4 px-4 py-3.5 rounded-2xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ background: cfg.cor, boxShadow: `0 0 12px ${cfg.cor}` }} />
                        <p className="text-white font-black text-base">{texto}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                          <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Recuperação</p>
                          {recuperacao != null ? (
                            <p className={`text-2xl font-black leading-none ${recuperacao >= 70 ? 'text-emerald-400' : recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {recuperacao}<span className="text-zinc-500 text-[11px] font-normal">/100</span>
                            </p>
                          ) : <p className="text-zinc-700 text-2xl font-black leading-none">—</p>}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                          <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Sono</p>
                          {monitor.sonoHoras ? (
                            <p className="text-2xl font-black text-white leading-none">{monitor.sonoHoras}<span className="text-zinc-500 text-[11px] font-normal">h</span></p>
                          ) : <p className="text-zinc-700 text-2xl font-black leading-none">—</p>}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                          <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Bem-estar</p>
                          {bemHoje != null ? (
                            <p className={`text-2xl font-black leading-none ${bemHoje >= 4 ? 'text-emerald-400' : bemHoje >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {bemHoje.toFixed(1)}<span className="text-zinc-500 text-[11px] font-normal">/4</span>
                            </p>
                          ) : <p className="text-zinc-700 text-2xl font-black leading-none">—</p>}
                          <p className="text-zinc-600 text-[11px] mt-1">hoje</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                          <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Inatividade</p>
                          {dias != null ? (
                            <p className={`text-2xl font-black leading-none ${dias <= 2 ? 'text-emerald-400' : dias <= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {dias}<span className="text-zinc-500 text-[11px] font-normal">d</span>
                            </p>
                          ) : <p className="text-zinc-700 text-2xl font-black leading-none">—</p>}
                          <p className="text-zinc-600 text-[11px] mt-1">sem treinar</p>
                        </div>
                      </div>

                      {(aluno?.nivel || aluno?.fcmax || aluno?.ftp || ultimaAvaliacao) && (
                        <div className="mt-4 pt-4 border-t border-white/[0.09] flex flex-wrap gap-2">
                          {aluno?.nivel && (
                            <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                              Nível: {aluno.nivel}
                            </span>
                          )}
                          {aluno?.fcmax && (
                            <span className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-0.5">
                              FC máx: {aluno.fcmax} bpm
                            </span>
                          )}
                          {aluno?.ftp && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                              FTP: {aluno.ftp}W
                            </span>
                          )}
                          {ultimaAvaliacao && (
                            <span className="text-[10px] text-zinc-400 bg-white/[0.05] rounded-full px-2.5 py-0.5">
                              Última aval.: {new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Resumo semanal */}
                {(() => {
                  const hoje = getTodayBR()
                  const dBase = new Date(hoje + 'T12:00:00-03:00')
                  const fmtISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
                  const currStart = new Date(dBase); currStart.setDate(dBase.getDate() - dBase.getDay())
                  const prevStart = new Date(dBase); prevStart.setDate(dBase.getDate() - dBase.getDay() - 7)
                  const prevEnd   = new Date(dBase); prevEnd.setDate(dBase.getDate() - dBase.getDay() - 1)
                  const antStart  = new Date(dBase); antStart.setDate(dBase.getDate() - dBase.getDay() - 14)
                  const antEnd    = new Date(dBase); antEnd.setDate(dBase.getDate() - dBase.getDay() - 8)

                  const currStartStr = fmtISO(currStart)
                  const prevStartStr = fmtISO(prevStart), prevEndStr = fmtISO(prevEnd)
                  const antStartStr = fmtISO(antStart), antEndStr = fmtISO(antEnd)

                  const treinosPrev   = treinosDatas.filter(d => d >= prevStartStr && d <= prevEndStr)
                  const treinosAnt    = treinosDatas.filter(d => d >= antStartStr && d <= antEndStr)
                  const treinosAtual  = treinosDatas.filter(d => d >= currStartStr && d <= hoje)
                  const ativsPrev     = atividadesLivres.filter(a => a.data >= prevStartStr && a.data <= prevEndStr)
                  const ativsAnt      = atividadesLivres.filter(a => a.data >= antStartStr && a.data <= antEndStr)
                  const ativsAtual    = atividadesLivres.filter(a => a.data >= currStartStr && a.data <= hoje)

                  const prevSessoes  = treinosPrev.length + ativsPrev.length
                  const antSessoes   = treinosAnt.length + ativsAnt.length
                  const atualSessoes = treinosAtual.length + ativsAtual.length

                  const prevMin  = ativsPrev.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosPrev.length * 60
                  const antMin   = ativsAnt.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosAnt.length * 60
                  const atualMin = ativsAtual.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosAtual.length * 60
                  const prevHoras = prevMin / 60, antHoras = antMin / 60, atualHoras = atualMin / 60

                  const sumCarga = (start: string, end: string) =>
                    Object.entries(cargaPorData).filter(([d]) => d >= start && d <= end).reduce((s, [, v]) => s + v, 0)
                  const cargaPrev  = sumCarga(prevStartStr, prevEndStr)
                  const cargaAnt   = sumCarga(antStartStr, antEndStr)
                  const cargaAtual = sumCarga(currStartStr, hoje)

                  const semDelta = (curr: number, prev: number): number | null => {
                    if (prev === 0 || curr === 0) return null
                    return Math.round(((curr - prev) / prev) * 100)
                  }

                  const fmtCarga = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`
                  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
                  const diasDecorridos = dBase.getDay() === 0 ? 7 : dBase.getDay()

                  if (prevSessoes === 0 && atualSessoes === 0) return null

                  return (
                    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, overflow: 'hidden' }}>
                      <div className="px-5 py-3.5 border-b border-white/[0.07]">
                        <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>Resumo semanal</p>
                      </div>
                      <div className="flex flex-col-reverse md:flex-row">
                        {/* Semana passada */}
                        <div className="flex-1 p-5 md:border-r border-white/[0.07]">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Semana passada</p>
                          <p className="text-zinc-500 text-[11px] mb-4">{fmtDate(prevStart)} – {fmtDate(prevEnd)}</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Sessões</p>
                              <div className="flex items-center leading-none">
                                <span className="text-2xl font-black text-white">{prevSessoes > 0 ? prevSessoes : '—'}</span>
                                {prevSessoes > 0 && (() => {
                                  const d = semDelta(prevSessoes, antSessoes)
                                  if (d === null) return null
                                  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-2 ${d >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>{d >= 0 ? '+' : ''}{d}%</span>
                                })()}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Horas de treino</p>
                              <div className="flex items-center leading-none">
                                <span className="text-2xl font-black text-white">{prevHoras > 0 ? prevHoras.toFixed(1) : '—'}</span>
                                {prevHoras > 0 && (() => {
                                  const d = semDelta(prevHoras, antHoras)
                                  if (d === null) return null
                                  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-2 ${d >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>{d >= 0 ? '+' : ''}{d}%</span>
                                })()}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Carga total</p>
                              <div className="flex items-center leading-none">
                                <span className="text-2xl font-black text-blue-300">{cargaPrev > 0 ? fmtCarga(cargaPrev) : '—'}</span>
                                {cargaPrev > 0 && (() => {
                                  const d = semDelta(cargaPrev, cargaAnt)
                                  if (d === null) return null
                                  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-2 ${d >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>{d >= 0 ? '+' : ''}{d}%</span>
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Semana atual */}
                        <div className="flex-1 p-5 border-b md:border-b-0 border-white/[0.07]">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Semana atual</p>
                          <p className="text-zinc-500 text-[11px] mb-4">{fmtDate(currStart)} – hoje</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Sessões</p>
                              <p className="text-2xl font-black text-white leading-none">{atualSessoes > 0 ? atualSessoes : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Horas de treino</p>
                              <p className="text-2xl font-black text-white leading-none">{atualHoras > 0 ? atualHoras.toFixed(1) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Carga acumulada</p>
                              <p className="text-2xl font-black text-blue-300 leading-none">{cargaAtual > 0 ? fmtCarga(cargaAtual) : '—'}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between mb-1.5">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Progresso da semana</p>
                              <p className="text-[10px] text-zinc-500">{diasDecorridos} de 7 dias</p>
                            </div>
                            <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.round((diasDecorridos / 7) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Periodização ativa */}
                <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                  <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16, fontWeight: 700 }}>Periodização ativa</p>
                  {faseCiclo ? (
                    <>
                      <p className="text-zinc-500 text-xs mb-3">{faseCiclo.nomeCiclo}</p>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${TIPO_COR_LISTA[faseCiclo.tipoBloco.toLowerCase()] ?? 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10'}`}>
                            {faseCiclo.tipoBloco}
                          </span>
                          <p className="text-white text-lg font-black mt-2">{faseCiclo.nomeBloco}</p>
                          <p className="text-zinc-500 text-sm">Semana {faseCiclo.semanaBloco} de {faseCiclo.semanasBloco}</p>
                        </div>
                        <span className="text-[#2DD4A7] text-2xl font-black">{Math.round((faseCiclo.semanaBloco / faseCiclo.semanasBloco) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden mb-4">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((faseCiclo.semanaBloco / faseCiclo.semanasBloco) * 100)}%`, background: '#2DD4A7' }} />
                      </div>
                      {faseCiclo.diasAteProximoBloco !== null && (
                        <p className="text-zinc-500 text-xs mb-4">Próximo bloco em {faseCiclo.diasAteProximoBloco}d</p>
                      )}
                      <button onClick={() => router.push(`/personal/periodizacao/${clienteId}`)}
                        className="w-full text-center text-sm font-bold text-white bg-white/[0.07] border border-white/[0.12] rounded-2xl py-3 active:scale-[0.97] transition-all hover:border-white/20">
                        Ver periodização completa
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-zinc-500 text-sm mb-4">Sem periodização ativa</p>
                      <button onClick={() => router.push(`/personal/periodizacao/${clienteId}`)}
                        className="w-full text-center text-sm font-bold text-white bg-white/[0.07] border border-white/[0.12] rounded-2xl py-3 active:scale-[0.97] transition-all hover:border-white/20">
                        Criar periodização
                      </button>
                    </div>
                  )}
                </div>

                {/* Plano nutricional ativo */}
                {(planoNutri || restricaoNutri) && (
                  <div style={{ background: 'rgba(52,211,153,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="text-sm">🥗</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 11, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Nutrição prescrita</p>
                        {planoNutri && (
                          <div className="flex gap-4 mt-1.5 items-baseline">
                            {planoNutri.calorias_meta && <span className="text-2xl font-black text-white leading-none">{planoNutri.calorias_meta}<span className="text-zinc-500 font-normal text-[11px] ml-1">kcal</span></span>}
                            {planoNutri.proteina_meta && <span className="text-2xl font-black text-blue-300 leading-none">{planoNutri.proteina_meta}<span className="text-zinc-500 font-normal text-[11px] ml-1">g prot</span></span>}
                          </div>
                        )}
                      </div>
                      {planoNutri?.created_at && (
                        <span className="text-zinc-600 text-[10px] shrink-0">
                          {new Date(planoNutri.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })}
                        </span>
                      )}
                    </div>
                    {restricaoNutri && (
                      <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(52,211,153,0.10)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚠️</span>
                        <p className="text-amber-300/80 text-sm leading-relaxed">{restricaoNutri}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Preparar briefing pré-treino */}
                <button
                  className="w-full rounded-2xl p-5 flex items-center gap-4 text-left transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: '#0b1610', border: '1px solid rgba(16,185,129,0.10)' }}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-lg">✦</div>
                  <div>
                    <p className="text-white text-sm font-bold">Preparar briefing pré-treino</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Análise clínica dos últimos 7 dias — gere antes de cada sessão</p>
                  </div>
                  <span className="text-emerald-500/40 ml-auto">→</span>
                </button>

              </div>
            )}

            {/* ── ABA EVOLUÇÃO ─────────────────────────────────────────── */}
            {abaAtiva === 'evolucao' && (
              <div className="space-y-5">

                {/* Composição Corporal — empty state */}
                {medidasCP.length === 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                    <span className="text-3xl">📏</span>
                    <div>
                      <p className="text-white text-sm font-bold">Sem medidas corporais</p>
                      <p className="text-zinc-600 text-xs mt-1">Registre as medidas iniciais do aluno para acompanhar a evolução</p>
                    </div>
                    <button onClick={() => router.push(`/evolucao-medidas/${clienteId}`)}
                      className="mt-1 text-xs text-blue-400 border border-blue-500/20 bg-blue-500/10 rounded-xl px-4 py-2 hover:bg-blue-500/20 active:scale-95 transition-all font-semibold">
                      + Registrar primeira medida
                    </button>
                  </div>
                )}

                {/* Composição Corporal — compacto */}
                {medidasCP.length >= 1 && (() => {
                  const primeira = medidasCP[0]
                  const ultima = medidasCP[medidasCP.length - 1]
                  const rows = [
                    { label: 'Peso',     unit: 'kg', current: ultima.peso,          prev: primeira.peso,          inverse: true  },
                    { label: 'Gordura',  unit: '%',  current: ultima.gordura_pct,    prev: primeira.gordura_pct,    inverse: true  },
                    { label: 'Músculo',  unit: 'kg', current: ultima.massa_muscular, prev: primeira.massa_muscular, inverse: false },
                  ].filter(r => r.current != null)
                  if (!rows.length) return null
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                      <div className="flex items-center justify-between mb-4">
                        <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>Composição Corporal</p>
                        <button onClick={() => setAbaAtiva('perfil')} className="text-[11px] text-blue-400 font-semibold hover:underline">Ver evolução →</button>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        {rows.map(r => {
                          const delta = r.prev != null && r.current != null ? Math.round((r.current - r.prev) * 10) / 10 : null
                          const positivo = delta !== null && (r.inverse ? delta < 0 : delta > 0)
                          const deltaCor = !delta ? 'text-zinc-600' : positivo ? 'text-emerald-400' : 'text-red-400'
                          return (
                            <div key={r.label} className="flex-1 text-center">
                              <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1">{r.label}</p>
                              <p className="text-white text-xl font-black leading-none">{r.current}<span className="text-zinc-500 text-xs font-normal">{r.unit}</span></p>
                              {delta !== null && delta !== 0 && <p className={`text-[10px] font-bold mt-1 ${deltaCor}`}>{delta > 0 ? '+' : ''}{delta}{r.unit}</p>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Calendário de consistência */}
                <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                  <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16, fontWeight: 700 }}>Calendário de consistência · 28 dias</p>
                  <CalendarioConsistencia atividades={atividadesCalendario} onSelecionarDia={setDiaSelecionado} />
                </div>

                {/* Painel de detalhe do dia */}
                {diaSelecionado && (
                  <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                    <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 700 }}>{formatDiaDetalhe(diaSelecionado)}</p>
                    {(() => {
                      const ativsDia = atividadesCalendario.filter(a => a.data === diaSelecionado)
                      if (!ativsDia.length) return <p className="text-zinc-600 text-sm">Dia de descanso</p>
                      return (
                        <div className="space-y-3">
                          {ativsDia.map((a, i) => {
                            const cfg = MOD_CONFIG[a.tipo] ?? MOD_CONFIG['outro']
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.hex }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-semibold">{a.nome}</p>
                                  {(a.detalhe || a.fc_media != null || a.fc_max != null) && (
                                    <p className="text-zinc-500 text-[11px]">
                                      {a.detalhe}
                                      {a.fc_media != null && <span className="text-red-300">{a.detalhe ? ' · ' : ''}FC méd {a.fc_media}bpm</span>}
                                      {a.fc_max != null && <span className="text-red-500">{(a.detalhe || a.fc_media != null) ? ' · ' : ''}FC máx {a.fc_max}bpm</span>}
                                    </p>
                                  )}
                                  {a.fc_media != null && fcmaxEstimado != null && (() => {
                                    const zona = getZonaFC(a.fc_media, fcmaxEstimado)
                                    return (
                                      <span
                                        className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ color: zona.cor, background: `${zona.cor}1A`, border: `1px solid ${zona.cor}33` }}
                                      >
                                        {zona.label}
                                      </span>
                                    )
                                  })()}
                                </div>
                                {a.calorias != null && (
                                  <p className="text-orange-400 text-sm font-bold shrink-0">{a.calorias} kcal</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Distribuição por modalidade */}
                {atividadesCalendario.length > 0 && (() => {
                  const hoje = getTodayBR()
                  const dBase = new Date(hoje + 'T12:00:00-03:00')
                  const fmtISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
                  const semanaPassadaIni = new Date(dBase); semanaPassadaIni.setDate(dBase.getDate() - dBase.getDay() - 7)
                  const semanaPassadaFim = new Date(dBase); semanaPassadaFim.setDate(dBase.getDate() - dBase.getDay() - 1)
                  const vinte8DiasAtras  = new Date(dBase); vinte8DiasAtras.setDate(dBase.getDate() - 27)

                  const semanaPassadaIniStr = fmtISO(semanaPassadaIni)
                  const semanaPassadaFimStr = fmtISO(semanaPassadaFim)
                  const vinte8Str = fmtISO(vinte8DiasAtras)

                  const distSemana = getDistribuicaoModalidade(atividadesCalendario.filter(a => a.data >= semanaPassadaIniStr && a.data <= semanaPassadaFimStr))
                  const dist28Dias = getDistribuicaoModalidade(atividadesCalendario.filter(a => a.data >= vinte8Str && a.data <= hoje))

                  if (!distSemana.length && !dist28Dias.length) return null

                  const renderBars = (dist: { tipo: string; count: number; pct: number }[]) => dist.length ? (
                    <div className="space-y-2.5">
                      {dist.map(d => {
                        const cfg = MOD_CONFIG[d.tipo] ?? MOD_CONFIG['outro']
                        return (
                          <div key={d.tipo}>
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-zinc-300 text-xs w-24 shrink-0 truncate font-medium">{cfg.label}</p>
                              <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: cfg.hex }} />
                              </div>
                              <p className="text-zinc-400 text-xs w-8 text-right shrink-0 font-semibold">{d.pct}%</p>
                            </div>
                            <p className="text-zinc-600 text-[10px] pl-[6.5rem]">{d.count} sessão{d.count !== 1 ? 'ões' : ''}</p>
                          </div>
                        )
                      })}
                    </div>
                  ) : <p className="text-zinc-600 text-xs">Sem atividades</p>

                  return (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                      <div className="px-5 py-3.5 border-b border-white/[0.07]">
                        <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Distribuição por modalidade</p>
                      </div>
                      <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-5 md:border-r border-white/[0.07]">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Semana passada</p>
                          {renderBars(distSemana)}
                        </div>
                        <div className="flex-1 p-5 border-t md:border-t-0 border-white/[0.07]">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Últimos 28 dias</p>
                          {renderBars(dist28Dias)}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Carga interna semanal */}
                {fcmaxEstimado != null && (() => {
                  const hoje = getTodayBR()
                  const dBase = new Date(hoje + 'T12:00:00-03:00')
                  const fmtISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

                  const semanas = [3, 2, 1, 0].map(n => {
                    const ini = new Date(dBase); ini.setDate(dBase.getDate() - dBase.getDay() - n * 7)
                    const fim = new Date(dBase); fim.setDate(dBase.getDate() - dBase.getDay() - n * 7 + 6)
                    const iniStr = fmtISO(ini)
                    const fimStr = fmtISO(fim)
                    const atual = n === 0

                    const ativs = atividadesCalendario.filter(a =>
                      a.data >= iniStr && a.data <= (atual ? hoje : fimStr) && a.fc_media != null && a.duracao_min != null
                    )

                    let cargaTotal = 0, pctPonderado = 0, minTotal = 0
                    ativs.forEach(a => {
                      const min = a.duracao_min ?? 0
                      const pct = (a.fc_media as number) / fcmaxEstimado
                      cargaTotal += pct * min
                      pctPonderado += pct * min
                      minTotal += min
                    })
                    const pctMedio = minTotal > 0 ? pctPonderado / minTotal : 0

                    return { label: atual ? 'Esta sem.' : `Sem ${4 - n}`, carga: Math.round(cargaTotal), pctMedio, atual }
                  })

                  if (!semanas.some(s => s.carga > 0)) return null

                  const maxCarga = Math.max(...semanas.map(s => s.carga), 1)

                  const semanasCompletas = semanas.filter(s => !s.atual && s.carga > 0)
                  const mediaHistorica = semanasCompletas.length
                    ? Math.round(semanasCompletas.reduce((acc, s) => acc + s.carga, 0) / semanasCompletas.length) || null
                    : null

                  const corCarga = (pct: number) => {
                    if (pct < 0.70) return '#34d399'
                    if (pct < 0.80) return '#fbbf24'
                    if (pct < 0.90) return '#f97316'
                    return '#f87171'
                  }

                  return (
                    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                      <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16, fontWeight: 700 }}>Carga interna · Últimas 4 semanas</p>
                      <div className="space-y-2.5">
                        {semanas.map((s, i) => {
                          const cor = s.carga > 0 ? corCarga(s.pctMedio) : 'rgba(255,255,255,0.15)'
                          const acimaMedia = mediaHistorica == null || s.carga >= mediaHistorica
                          const opacidade = s.atual ? 0.6 : (acimaMedia ? 1 : 0.5)
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <p className="text-zinc-400 text-xs w-16 shrink-0 font-medium">{s.label}</p>
                              <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full relative">
                                <div className="h-full rounded-full transition-all" style={{ width: `${(s.carga / maxCarga) * 100}%`, background: cor, opacity: opacidade }} />
                                {mediaHistorica != null && (
                                  <div className="absolute" style={{ left: `${(mediaHistorica / maxCarga) * 100}%`, top: -3, bottom: -3, borderLeft: '1px dashed rgba(255,255,255,0.3)' }} />
                                )}
                              </div>
                              <p className="text-zinc-400 text-xs w-10 text-right shrink-0 font-semibold">{s.carga}</p>
                            </div>
                          )
                        })}
                      </div>
                      {mediaHistorica != null && (
                        <p className="text-zinc-600 text-[10px] mt-3">Média das últimas {semanasCompletas.length} semana{semanasCompletas.length !== 1 ? 's' : ''}: {mediaHistorica}</p>
                      )}
                    </div>
                  )
                })()}

                {/* Performance Management Chart (PMC) */}
                {pontosPMC.length > 0 && (() => {
                  const W = 280, H = 100
                  const valores = pontosPMC.flatMap(p => [p.ctl, p.atl, p.tsb])
                  const maxV = Math.max(...valores, 1)
                  const minV = Math.min(...valores, 0)
                  const range = maxV - minV || 1
                  const toY = (v: number) => H - 3 - ((v - minV) / range) * (H - 6)
                  const xStep = W / Math.max(pontosPMC.length - 1, 1)
                  const pathFor = (key: 'ctl' | 'atl' | 'tsb') =>
                    pontosPMC.map((p, j) => `${j === 0 ? 'M' : 'L'}${(j * xStep).toFixed(1)},${toY(p[key]).toFixed(1)}`).join(' ')

                  const ultimo = pontosPMC[pontosPMC.length - 1]

                  return (
                    <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                      <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16, fontWeight: 700 }}>Performance Management Chart</p>

                      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
                        <line x1="0" y1={toY(0)} x2={W} y2={toY(0)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2,2" />
                        <path d={pathFor('ctl')} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={pathFor('atl')} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {pontosPMC.slice(0, -1).map((p, j) => {
                          const next = pontosPMC[j + 1]
                          const cor = (p.tsb + next.tsb) / 2 >= 0 ? '#34d399' : '#f87171'
                          return <line key={j} x1={j * xStep} y1={toY(p.tsb)} x2={(j + 1) * xStep} y2={toY(next.tsb)} stroke={cor} strokeWidth="1.5" strokeLinecap="round" />
                        })}
                      </svg>

                      <div className="flex items-center gap-4 mt-3">
                        <p className="text-[11px] text-zinc-400"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#60a5fa' }} />CTL: <span className="text-white font-bold">{ultimo.ctl}</span></p>
                        <p className="text-[11px] text-zinc-400"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#f97316' }} />ATL: <span className="text-white font-bold">{ultimo.atl}</span></p>
                        <p className="text-[11px] text-zinc-400"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: ultimo.tsb >= 0 ? '#34d399' : '#f87171' }} />TSB: <span className="text-white font-bold">{ultimo.tsb}</span></p>
                      </div>

                      {(() => {
                        const narrativa = gerarNarrativaPMC(pontosPMC, null) // null = sem prova cadastrada ainda
                        const corTexto = narrativa.cor === 'vermelho' ? 'text-red-400' : narrativa.cor === 'amarelo' ? 'text-amber-400' : 'text-emerald-400'
                        const corBg = narrativa.cor === 'vermelho' ? 'rgba(248,113,113,0.08)' : narrativa.cor === 'amarelo' ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)'
                        const corBorder = narrativa.cor === 'vermelho' ? 'rgba(248,113,113,0.20)' : narrativa.cor === 'amarelo' ? 'rgba(251,191,36,0.20)' : 'rgba(52,211,153,0.20)'
                        return (
                          <div className="mt-4 rounded-xl px-4 py-3" style={{ background: corBg, border: `1px solid ${corBorder}` }}>
                            <p className={`text-sm font-bold mb-2 ${corTexto}`}>{narrativa.emoji} {narrativa.titulo}</p>
                            {narrativa.linhas.map((linha, i) => (
                              <p key={i} className="text-zinc-400 text-[11px] leading-relaxed">{linha}</p>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}

              </div>
            )}

            {/* ── ABA PERFIL ───────────────────────────────────────────── */}
            {abaAtiva === 'perfil' && (
              <div className="space-y-5">

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => router.push(`/anamnese/${clienteId}`)}
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                    className="active:scale-[0.97] transition-all hover:border-white/20">
                    <span className="text-xl shrink-0">📋</span>
                    <div>
                      <p className="text-white text-sm font-bold">Anamnese</p>
                      <p className="text-zinc-500 text-[11px]">Ficha de saúde</p>
                    </div>
                  </button>
                  <button onClick={() => router.push(`/evolucao-medidas/${clienteId}`)}
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                    className="active:scale-[0.97] transition-all hover:border-white/20">
                    <span className="text-xl shrink-0">📏</span>
                    <div>
                      <p className="text-white text-sm font-bold">Medidas</p>
                      <p className="text-zinc-500 text-[11px]">Evolução corporal</p>
                    </div>
                  </button>
                </div>

                {/* Ficha do aluno */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                  <button
                    onClick={() => {
                      if (!editandoFicha) {
                        setFichaPeso(String(aluno?.peso ?? ''))
                        setFichaAltura(String(aluno?.altura ?? ''))
                        setFichaSexo(aluno?.sexo ?? '')
                        setFichaNascimento(aluno?.data_nascimento ?? '')
                        setFichaObjetivo(aluno?.objetivo ?? '')
                        setFichaMetaPeso(String(aluno?.meta_peso ?? ''))
                        setFichaMetaData(aluno?.meta_data_limite ?? '')
                      }
                      setEditandoFicha(p => !p)
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 text-left active:opacity-80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Ficha do aluno</p>
                      {!editandoFicha && (
                        <>
                          {aluno?.peso && <span className="text-[9px] text-zinc-600 bg-white/[0.05] rounded-full px-2 py-0.5">{aluno.peso}kg</span>}
                          {aluno?.altura && <span className="text-[9px] text-zinc-600 bg-white/[0.05] rounded-full px-2 py-0.5">{aluno.altura}cm</span>}
                          {aluno?.objetivo && <span className="text-[9px] text-zinc-600 bg-white/[0.05] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[aluno.objetivo] ?? aluno.objetivo}</span>}
                          {aluno?.meta_peso && <span className="text-[9px] text-emerald-600 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-full px-2 py-0.5">Meta: {aluno.meta_peso}kg</span>}
                          {!aluno?.peso && !aluno?.altura && !aluno?.objetivo && <span className="text-[9px] text-zinc-700">Preencher dados</span>}
                        </>
                      )}
                    </div>
                    <span className={`text-zinc-600 text-xs transition-transform duration-200 ${editandoFicha ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {editandoFicha && (
                    <div className="px-5 pb-5 space-y-3 border-t border-white/[0.14]">
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Peso (kg)</p>
                          <input type="number" value={fichaPeso} onChange={e => setFichaPeso(e.target.value)}
                            placeholder="75.5"
                            className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20" />
                        </div>
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Altura (cm)</p>
                          <input type="number" value={fichaAltura} onChange={e => setFichaAltura(e.target.value)}
                            placeholder="175"
                            className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20" />
                        </div>
                      </div>
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Sexo</p>
                        <div className="flex gap-2">
                          {['masculino', 'feminino', 'outro'].map(v => (
                            <button key={v} onClick={() => setFichaSexo(v)}
                              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${fichaSexo === v ? 'bg-white text-black border-white' : 'bg-white/[0.05] text-zinc-400 border-white/[0.14]'}`}>
                              {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Data de nascimento</p>
                        <input type="date" value={fichaNascimento} onChange={e => setFichaNascimento(e.target.value)}
                          className="w-full bg-white/[0.07] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20" />
                      </div>
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Objetivo</p>
                        <div className="flex flex-wrap gap-2">
                          {[['perder_peso','Perder peso'],['ganhar_massa','Ganhar massa'],['melhorar_condicionamento','Condicionamento'],['saude_geral','Saúde geral']].map(([v, l]) => (
                            <button key={v} onClick={() => setFichaObjetivo(v)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${fichaObjetivo === v ? 'bg-white text-black border-white' : 'bg-white/[0.05] text-zinc-400 border-white/[0.14]'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-white/[0.14] pt-3">
                        <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-2.5">Meta de peso</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Peso-alvo (kg)</p>
                            <input type="number" step="0.5" value={fichaMetaPeso} onChange={e => setFichaMetaPeso(e.target.value)}
                              placeholder="Ex: 78"
                              className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30" />
                          </div>
                          <div>
                            <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Prazo</p>
                            <input type="date" value={fichaMetaData} onChange={e => setFichaMetaData(e.target.value)}
                              className="w-full bg-white/[0.07] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30"
                              style={{ colorScheme: 'dark' }} />
                          </div>
                        </div>
                      </div>
                      <button onClick={salvarFicha} disabled={salvandoFicha}
                        className="w-full bg-white text-black font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-40">
                        {salvandoFicha ? 'Salvando...' : 'Salvar ficha'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── ABA TREINOS ──────────────────────────────────────────── */}
            {abaAtiva === 'treinos' && (
              <div className="space-y-5">

                {modalidadeEscolhida === null ? (
                  <div className="py-6">
                    <div className="text-center mb-5">
                      <p className="text-white font-bold mb-1">Escolha a modalidade</p>
                      <p className="text-zinc-600 text-sm">Selecione o tipo de treino para começar</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {MODALIDADES_TREINO.map((m, i) => (
                        <button
                          key={m.nome}
                          onClick={() => {
                            const nome: string = m.nome
                            if (nome === 'Triathlon') setModalidadeEscolhida('triathlon')
                            else if (nome === 'Assessoria de Corrida') setModalidadeEscolhida('corrida')
                            else if (nome === 'Assessoria de Bike') setModalidadeEscolhida('bike')
                            else if (nome === 'Assessoria de Natação') setModalidadeEscolhida('natacao')
                            else if (m.disponivel) { setModalidadeEscolhida('musculacao'); abrirNovo() }
                            else setModalEmBreve(nome)
                          }}
                          className={`flex flex-col items-center justify-center gap-1.5 py-4 active:scale-95 transition-all ${i === 4 ? 'col-span-2' : ''}`}
                          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16 }}
                        >
                          <span className="text-2xl">{m.icone}</span>
                          <span className="text-white font-bold text-xs text-center">{m.nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : modalidadeEscolhida === 'musculacao' ? (
                  <>
                  <button onClick={() => setModalidadeEscolhida(null)} className="text-zinc-500 text-xs font-bold uppercase tracking-wider hover:text-white transition-all active:scale-95">← Voltar</button>

                  {treinos.length > 0 && (() => {
                  const planosComTreino = PLANOS_MAX.filter(p => treinos.some(t => t.plano === p))
                  const proximoPlano = PLANOS_MAX.find(p => !treinos.some(t => t.plano === p))
                  const planosVisiveis = proximoPlano ? [...planosComTreino, proximoPlano] : planosComTreino
                  return (
                    <div className="flex gap-2 flex-wrap">
                      {planosVisiveis.map(p => {
                        const c = CORES[p] ?? CORES.A
                        const tem = treinos.some(t => t.plano === p)
                        return (
                          <button key={p} onClick={() => setPlanoAtivo(p)}
                            className={`relative flex-1 min-w-[4rem] py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 ${planoAtivo === p ? `${c.bg} ${c.border} ${c.text}` : tem ? 'bg-white/[0.05] border-white/[0.11] text-zinc-400' : 'bg-white/[0.02] border-white/[0.14] text-zinc-600'}`}>
                            {tem ? `Plano ${p}` : `+ Plano ${p}`}
                            {tem && (
                              <span className="block text-[9px] font-normal mt-0.5 opacity-70">
                                {treinos.find(t => t.plano === p)?.exercicios.length ?? 0} exerc.
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}

                {treinoDoPlano ? (
                  <div>
                    <div className={`rounded-2xl p-5 border ${cores.border}`} style={{ background: 'var(--surface-1)' }}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className={`text-[10px] uppercase tracking-[0.2em] mb-1 ${cores.text}`}>Plano {planoAtivo}</p>
                          <p className="text-white font-black text-lg">{treinoDoPlano.nome}</p>
                          {treinoDoPlano.descricao && <p className="text-zinc-500 text-xs mt-1">{treinoDoPlano.descricao}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => abrirEditar(treinoDoPlano)} className="text-[10px] text-zinc-500 border border-white/[0.14] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">Editar</button>
                          <button onClick={() => setConfirmaDeleteId(treinoDoPlano.id)} className="text-[10px] text-red-500/70 border border-red-500/20 rounded-lg px-3 py-1.5 hover:border-red-500/50 hover:text-red-400 active:scale-95 transition-all uppercase tracking-wider">✕</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {treinoDoPlano.exercicios.map((ex, i) => (
                          <div key={i} className="bg-white/[0.05] rounded-xl p-3.5 border border-white/[0.14]">
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-lg ${cores.bg} ${cores.border} border flex items-center justify-center shrink-0 mt-0.5`}>
                                <span className={`text-[10px] font-black ${cores.text}`}>{i + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-sm mb-1">{ex.nome}</p>
                                <div className="flex gap-3 flex-wrap">
                                  <span className="text-zinc-500 text-[11px]">{ex.series} séries</span>
                                  <span className="text-zinc-700 text-[11px]">·</span>
                                  <span className="text-zinc-500 text-[11px]">{ex.repeticoes} reps</span>
                                  {ex.carga_sugerida && <><span className="text-zinc-700 text-[11px]">·</span><span className="text-zinc-500 text-[11px]">{ex.carga_sugerida}kg sugerido</span></>}
                                </div>
                                {ex.observacoes && <p className="text-zinc-600 text-[11px] mt-1 italic">{ex.observacoes}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={abrirNovo} className="w-full border border-white/[0.14] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all tracking-wide mt-4">
                      + Substituir Plano {planoAtivo}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-16 gap-4">
                    <div className={`w-16 h-16 rounded-3xl ${cores.bg} ${cores.border} border flex items-center justify-center`}>
                      <span className={`text-2xl font-black ${cores.text}`}>{planoAtivo}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold mb-1">Plano {planoAtivo} vazio</p>
                      <p className="text-zinc-600 text-sm">Monte o treino para este aluno</p>
                    </div>
                    <button onClick={abrirNovo} className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all tracking-wide">
                      + Criar Plano {planoAtivo}
                    </button>
                  </div>
                )}

                {/* Últimas execuções */}
                {execucoes.length > 0 && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                    <div className="px-5 py-4 border-b border-white/[0.14]">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Últimas execuções</p>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {execucoes.map((ex) => {
                        const c = CORES[ex.plano] ?? CORES.A
                        const dataLabel = new Date(ex.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })
                        return (
                          <div key={ex.id} className="px-5 py-3.5">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-8 h-8 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center shrink-0`}>
                                <span className={`text-[10px] font-black ${c.text}`}>{ex.plano}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{ex.nome}</p>
                                <p className="text-zinc-600 text-[10px]">
                                  {dataLabel}
                                  {ex.seriesFeitas > 0 && ` · ${ex.seriesFeitas} séries`}
                                  {ex.volume > 0 && ` · ${ex.volume >= 1000 ? `${(ex.volume / 1000).toFixed(1)}t` : `${ex.volume}kg`} vol.`}
                                </p>
                              </div>
                            </div>
                            {ex.exercicios.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-11">
                                {ex.exercicios.map(e => (
                                  <span key={e.nome} className="text-[10px] text-zinc-400 bg-white/[0.05] rounded-lg px-2 py-0.5">
                                    {e.nome}{e.maxCarga > 0 ? ` · ${e.maxCarga}kg` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Evolução de carga por exercício */}
                {treinoDoPlano && (() => {
                  const exsComDados = treinoDoPlano.exercicios.filter(ex => (cargaEvolucao[ex.nome]?.length ?? 0) >= 2)
                  if (!exsComDados.length) return null
                  return (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                      <div className="px-5 py-4 border-b border-white/[0.14]">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Evolução de carga · Plano {planoAtivo}</p>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {exsComDados.map((ex, i) => {
                          const pontos = cargaEvolucao[ex.nome]
                          const primeiro = pontos[0].carga
                          const ultimo = pontos[pontos.length - 1].carga
                          const delta = Math.round((ultimo - primeiro) * 10) / 10
                          const maxC = Math.max(...pontos.map(p => p.carga))
                          const minC = Math.min(...pontos.map(p => p.carga))
                          const W = 64, H = 26
                          const range = maxC - minC || 1
                          const toY = (v: number) => H - 3 - ((v - minC) / range) * (H - 6)
                          const xStep = W / Math.max(pontos.length - 1, 1)
                          const linePath = pontos.map((p, j) => `${j === 0 ? 'M' : 'L'}${(j * xStep).toFixed(1)},${toY(p.carga).toFixed(1)}`).join(' ')
                          const cor = delta >= 0 ? '#34d399' : '#f87171'
                          return (
                            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{ex.nome}</p>
                                <p className="text-zinc-600 text-[10px]">{primeiro}kg → {ultimo}kg</p>
                              </div>
                              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible">
                                <path d={linePath} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                {pontos.map((p, j) => <circle key={j} cx={j * xStep} cy={toY(p.carga)} r="2" fill={cor} />)}
                              </svg>
                              <div className="text-right shrink-0 w-14">
                                <p className="text-white text-sm font-bold">{ultimo} kg</p>
                                {delta !== 0 && <p className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{delta > 0 ? '+' : ''}{delta}kg</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                  </>
                ) : (
                  <>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setModalidadeEscolhida(null)} className="text-zinc-500 text-xs font-bold uppercase tracking-wider hover:text-white transition-all active:scale-95">← Voltar</button>
                    {modalidadeEscolhida !== 'triathlon' && (
                      <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        {modalidadeEscolhida === 'corrida' ? 'Assessoria de Corrida' : modalidadeEscolhida === 'bike' ? 'Assessoria de Bike' : modalidadeEscolhida === 'natacao' ? 'Assessoria de Natação' : ''}
                      </span>
                    )}
                  </div>

                  {/* Header da semana */}
                  {(() => {
                    const { inicio, fim } = getInicioFimSemana(semanaOffset)
                    const fmtCurto = (s: string) => {
                      const d = new Date(s + 'T12:00:00-03:00')
                      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
                    }
                    return (
                      <div className="flex items-center justify-between gap-2">
                        <button onClick={() => setSemanaOffset(o => o - 1)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all shrink-0"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }}>
                          ←
                        </button>
                        <div className="text-center">
                          <p className="text-white font-bold text-sm">{fmtCurto(inicio)} – {fmtCurto(fim)}</p>
                          {semanaOffset === 0 && <p className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">Semana atual</p>}
                        </div>
                        <button onClick={() => setSemanaOffset(o => o + 1)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all shrink-0"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }}>
                          →
                        </button>
                      </div>
                    )
                  })()}

                  {/* Grid dos 7 dias */}
                  {(() => {
                    const { inicio } = getInicioFimSemana(semanaOffset)
                    const iniDate = new Date(inicio + 'T12:00:00-03:00')
                    const hoje = getTodayBR()
                    const dias = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(iniDate); d.setDate(iniDate.getDate() + i)
                      return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
                    })
                    const modalidadePadrao: SessaoPresc['modalidade'] =
                      modalidadeEscolhida === 'bike' ? 'bike' : modalidadeEscolhida === 'natacao' ? 'natacao' : 'corrida'
                    return (
                      <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible">
                        {dias.map((dataStr, i) => {
                          const sessoesDoDia = sessoesPrescritas.filter(s => s.data === dataStr)
                          const d = new Date(dataStr + 'T12:00:00-03:00')
                          const numeroDia = d.getDate()
                          const isHoje = dataStr === hoje
                          const temSessoes = sessoesDoDia.length > 0
                          return (
                            <div
                              key={dataStr}
                              className={`shrink-0 w-[100px] sm:w-auto min-h-[110px] flex flex-col gap-1.5 p-2.5 rounded-2xl ${isHoje ? 'ring-1 ring-white/30' : ''}`}
                              style={temSessoes
                                ? { background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16 }
                                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
                              }
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{DIAS_SEMANA_LABEL[i]}</span>
                                <span className="text-zinc-600 text-[10px]">{numeroDia}</span>
                              </div>
                              {temSessoes ? (
                                <div className="flex-1 w-full flex flex-col divide-y divide-white/[0.06]">
                                  {sessoesDoDia.map((sessao, idx) => {
                                    const mod = MODALIDADES_SESSAO[sessao.modalidade]
                                    return (
                                      <div key={sessao.id ?? idx} className={`relative w-full ${idx > 0 ? 'pt-1.5' : ''} ${idx < sessoesDoDia.length - 1 ? 'pb-1.5' : ''}`}>
                                        <button
                                          onClick={() => {
                                            setDiaEditando(dataStr)
                                            setSessaoEditando({ ...sessao, blocos: sessao.blocos.map(b => ({ ...b })) })
                                          }}
                                          className="w-full flex flex-col items-start gap-0.5 text-left active:scale-95 transition-all pr-5"
                                        >
                                          <span className={`text-xl ${mod.text}`}>{mod.icone}</span>
                                          <p className="text-white text-xs font-bold leading-tight">
                                            {sessao.modalidade === 'descanso' ? 'Descanso' : (sessao.tipo_sessao ? (TIPO_SESSAO_LABEL[sessao.tipo_sessao] ?? sessao.tipo_sessao) : mod.label)}
                                          </p>
                                          {sessao.duracao_min != null && <p className="text-zinc-500 text-[10px]">{sessao.duracao_min} min</p>}
                                          {sessao.distancia_km != null && <p className="text-zinc-500 text-[10px]">{sessao.distancia_km} km</p>}
                                        </button>
                                        <button
                                          onClick={() => setSessaoDetalhe(sessao)}
                                          title="Ver detalhe"
                                          className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-white active:scale-90 transition-all"
                                        >
                                          <span className="text-[11px]">ⓘ</span>
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setDiaEditando(dataStr)
                                    setSessaoEditando(vazioSessao(dataStr, modalidadePadrao))
                                  }}
                                  className="flex-1 w-full flex items-center justify-center active:scale-95 transition-all"
                                >
                                  <span className="text-zinc-600 text-lg">+</span>
                                </button>
                              )}
                              {temSessoes && (
                                <button
                                  onClick={() => {
                                    setDiaEditando(dataStr)
                                    setSessaoEditando(vazioSessao(dataStr, modalidadePadrao))
                                  }}
                                  className="self-end w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white active:scale-90 transition-all"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Aderência da Semana */}
                  {(() => {
                    const itens = itensAderenciaSemana
                    if (!itens.length) return null

                    const score = Math.round((itens.filter(it => it.status !== 'nao_realizado').length / itens.length) * 100)
                    const corScore = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'

                    return (
                      <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 20 }}>
                        <div className="flex items-center justify-between mb-4">
                          <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>Aderência da Semana</p>
                          <span className="text-sm font-black" style={{ color: corScore }}>Aderência: {score}%</span>
                        </div>
                        <div className="space-y-2.5">
                          {itens.map((it, i) => {
                            const mod = MODALIDADES_SESSAO[it.sessao.modalidade]
                            const dataLabel = new Date(it.sessao.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', timeZone: 'America/Sao_Paulo' })
                            const indicadores = [
                              { label: 'Duração', ind: it.indDuracao },
                              { label: 'Distância', ind: it.indDistancia },
                              { label: 'Pace', ind: it.indPace },
                              { label: 'FC', ind: it.indFC },
                            ].filter(x => x.ind.prescrito != null)
                            return (
                              <div key={i}
                                onClick={() => setSessaoDetalhe(it.sessao)}
                                className="flex items-start gap-2.5 -mx-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                                <span className={`text-base ${mod.text}`}>{mod.icone}</span>
                                <span className="text-base">{STATUS_ICON[it.status]}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-semibold capitalize">
                                    {dataLabel}
                                    {it.status === 'realizado_sem_planejamento' && <span className="text-zinc-500 font-normal normal-case"> · Realizado sem planejamento</span>}
                                  </p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                    {indicadores.map(({ label, ind }) => (
                                      <p key={label} className="text-zinc-500 text-[10px]">
                                        {ind.icone ? `${ind.icone} ` : ''}{label}: {ind.prescrito ?? '–'}{ind.realizado != null ? ` → ${ind.realizado}` : ''}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                <span className="text-zinc-600 text-sm self-center shrink-0">›</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  </>
                )}

              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── CHAT IA FLUTUANTE (todas as abas) ───────────────────────── */}
      {aluno && (
        <ProfissionalAIChat contexto={{
          profissionalTipo: 'personal',
          profissionalNome: personalNome || null,
          paciente: {
            nome: aluno.nome,
            peso: aluno.peso,
            altura: aluno.altura,
            objetivo: aluno.objetivo,
            nivel: aluno.nivel,
            metaPeso: aluno.meta_peso,
            metaDataLimite: aluno.meta_data_limite,
            fcmax: aluno.fcmax,
            ftp: aluno.ftp,
          },
          alertasClinicos: {
            lesoes,
            restricoesFisicas: restricaoFisica,
            medicamentos,
            alergias,
            restricoesAlimentares: restricaoNutri,
          },
          treinamento: {
            treinosSemana: monitor?.treinosSemana ?? 0,
            diasSemTreinar: monitor?.ultimoTreino ? diasSemTreinar(monitor.ultimoTreino) : null,
            scoreRecuperacaoHoje: monitor?.scoreRecuperacao ?? null,
            sonoHorasHoje: monitor?.sonoHoras ?? null,
            exerciciosMaxCarga: Object.entries(cargaEvolucao)
              .map(([nome, pontos]) => ({
                nome,
                maxCarga: Math.max(...pontos.map(p => p.carga)),
                sessoes: pontos.length,
              }))
              .sort((a, b) => b.sessoes - a.sessoes)
              .slice(0, 6),
            periodizacaoFase: fasePeriodizacaoChat,
            planos: treinos.map(t => ({
              plano: t.plano,
              nome: t.nome,
              exercicios: t.exercicios.map(e => ({
                nome: e.nome,
                series: e.series,
                repeticoes: e.repeticoes,
                carga: e.carga_sugerida,
                observacoes: e.observacoes ?? '',
              })),
            })),
          },
          nutricao: planoNutri ? {
            caloriasPrescritas: planoNutri.calorias_meta,
            proteinaPrescritas: planoNutri.proteina_meta,
            caloriasSemanaisGastas: null,
            treinosSemana: monitor?.treinosSemana ?? 0,
            periodizacao: fasePeriodizacaoChat,
          } : null,
          composicao: medidasCP.length > 0 ? {
            ultimoPeso: medidasCP[medidasCP.length - 1].peso,
            gorduraPct: medidasCP[medidasCP.length - 1].gordura_pct,
            massaMuscular: medidasCP[medidasCP.length - 1].massa_muscular,
            data: medidasCP[medidasCP.length - 1].data,
          } : null,
          ultimaAvaliacao,
          proximaConsulta: proximaConsultaInfo,
          anamneseCompleta,
          sono: { hoje: sonoHojeInfo, historico7d: sonoHistorico7d },
          bemEstarHoje: bemEstarHojeInfo,
          planoAlimentar: (() => {
            if (!planoNutri?.conteudo) return null
            try {
              const p = JSON.parse(planoNutri.conteudo)
              if (!p.refeicoes) return null
              return {
                calorias: planoNutri.calorias_meta,
                proteina: planoNutri.proteina_meta,
                refeicoes: (p.refeicoes ?? []).map((r: any) => ({
                  nome: r.nome, horario: r.horario, calorias: r.calorias, proteina: r.proteina,
                  alimentos: (r.alimentos ?? []).map((a: any) => a.nome).filter(Boolean),
                })),
                suplementos: (p.suplementos ?? []).map((s: any) => typeof s === 'string' ? s : s?.nome).filter(Boolean),
                hidratacao: p.hidratacao ?? null,
                orientacaoTreino: p.orientacao_treino ?? null,
                observacoes: p.nota_nutri ?? null,
              }
            } catch { return null }
          })(),
          treinosRegistrados: execucoes.map(e => ({ data: e.data, nome: e.nome, calorias: e.calorias, volume: e.volume, exercicios: e.exercicios.map(ex => ex.nome) })),
          medidasHistorico: medidasCP.map(m => ({ data: m.data, peso: m.peso, gorduraPct: m.gordura_pct, massaMuscular: m.massa_muscular })),
          historicoCompleto: historicoIA ? {
            atividades: historicoIA.atividades.map(a => ({
              data: a.data,
              modalidade: a.modalidade,
              duracao_min: a.duracao_min,
              distancia_km: a.distancia_km,
              calorias: a.calorias_wearable ?? a.calorias_estimadas ?? null,
              fc_media: a.fc_media ?? null,
              fc_max: a.fc_max ?? null,
            })),
            treinos: historicoIA.treinos,
            sono: historicoIA.sono,
          } : null,
          fcmaxEstimado: fcmaxEstimado ?? null,
          cargaInternaSemanas: cargaInternaSemanas ?? null,
          distModalidade28d: distModalidade28d ?? null,
          pmcAtual: pontosPMC.length > 0 ? {
            tsb: pontosPMC[pontosPMC.length - 1].tsb,
            ctl: pontosPMC[pontosPMC.length - 1].ctl,
            atl: pontosPMC[pontosPMC.length - 1].atl,
            diasEmSobrecarga: (() => {
              let dias = 0
              for (let i = pontosPMC.length - 1; i >= 0; i--) {
                if (pontosPMC[i].tsb < -20) dias++
                else break
              }
              return dias
            })(),
            interpretacao: pontosPMC[pontosPMC.length - 1].tsb > 10
              ? 'Em forma — pronta para competir ou aumentar carga'
              : pontosPMC[pontosPMC.length - 1].tsb > -10
              ? 'Equilíbrio — manutenção'
              : pontosPMC[pontosPMC.length - 1].tsb > -30
              ? 'Em carga — fase de construção normal'
              : 'Sobrecarga — reduzir volume recomendado'
          } : null,
        }} pacienteId={clienteId} historicoIACarregando={historicoIACarregando} />
      )}

      {/* ── MODAL EDITAR TREINO ──────────────────────────────────────── */}
      {modalAberto && editandoTreino && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-t-3xl border border-white/[0.14] overflow-hidden" style={{ background: 'var(--surface-1)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

            <div className="flex items-center justify-between p-5 border-b border-white/[0.11] shrink-0">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.2em] mb-0.5 ${CORES[editandoTreino.plano].text}`}>Plano {editandoTreino.plano}</p>
                <p className="text-white font-black text-lg">{editandoTreino.id ? 'Editar treino' : 'Novo treino'}</p>
              </div>
              <button onClick={() => { setModalAberto(false); setEditandoTreino(null) }} className="w-9 h-9 rounded-xl bg-white/[0.09] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Nome do treino</label>
                <input value={editandoTreino.nome} onChange={e => setEditandoTreino({ ...editandoTreino, nome: e.target.value })} placeholder="Ex: Treino A — Peito e Tríceps" className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Observações gerais</label>
                <textarea value={editandoTreino.descricao ?? ''} onChange={e => setEditandoTreino({ ...editandoTreino, descricao: e.target.value })} placeholder="Foco do treino, intensidade, observações..." rows={2} className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-zinc-500 text-[10px] uppercase tracking-widest">Exercícios</label>
                  <span className="text-zinc-600 text-[10px]">{editandoTreino.exercicios.length} adicionado{editandoTreino.exercicios.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3">
                  {editandoTreino.exercicios.map((ex, i) => (
                    <div key={i} className="bg-white/[0.05] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${CORES[editandoTreino.plano].text}`}>Exercício {i + 1}</span>
                        {editandoTreino.exercicios.length > 1 && <button onClick={() => removerExercicio(i)} className="text-red-500/50 hover:text-red-400 text-xs active:scale-90 transition-all">remover</button>}
                      </div>
                      <input value={ex.nome} onChange={e => updateEx(i, 'nome', e.target.value)} placeholder="Nome do exercício" className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors mb-3" />
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Séries</label>
                          <input type="number" value={ex.series} onChange={e => updateEx(i, 'series', parseInt(e.target.value) || 0)} className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors text-center" />
                        </div>
                        <div>
                          <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Reps</label>
                          <input type="number" value={ex.repeticoes} onChange={e => updateEx(i, 'repeticoes', parseInt(e.target.value) || 0)} className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors text-center" />
                        </div>
                        <div>
                          <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Carga (kg)</label>
                          <input type="number" value={ex.carga_sugerida ?? ''} onChange={e => updateEx(i, 'carga_sugerida', e.target.value ? parseFloat(e.target.value) : null)} placeholder="—" className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors text-center placeholder:text-zinc-700" />
                        </div>
                      </div>
                      {(() => {
                        const hist = ex.nome.trim() ? cargaEvolucao[ex.nome.trim()] : null
                        if (!hist?.length) return null
                        const ultima = hist[hist.length - 1]
                        const sugestao = Math.round((ultima.carga + 2.5) * 2) / 2
                        return (
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <p className="text-zinc-600 text-[10px] flex-1">Última vez: <span className="text-zinc-400 font-semibold">{ultima.carga}kg</span> · {new Date(ultima.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</p>
                            <button onClick={() => updateEx(i, 'carga_sugerida', sugestao)}
                              className="text-[9px] text-blue-400 border border-blue-500/20 bg-blue-500/10 rounded-lg px-2 py-1 active:scale-95 transition-all uppercase tracking-wider shrink-0">
                              +2.5kg →
                            </button>
                          </div>
                        )
                      })()}
                      <input value={ex.observacoes} onChange={e => updateEx(i, 'observacoes', e.target.value)} placeholder="Observações (opcional)" className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-zinc-400 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-colors" />
                    </div>
                  ))}
                </div>
                <button onClick={addExercicio} className="w-full mt-3 border border-dashed border-white/[0.12] text-zinc-500 font-semibold py-3 rounded-xl text-sm hover:border-white/25 hover:text-zinc-300 active:scale-95 transition-all">
                  + Adicionar exercício
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-white/[0.11] shrink-0">
              {erroSalvar && <p className="text-red-400 text-xs text-center mb-3 bg-red-500/10 rounded-xl py-2 px-3">{erroSalvar}</p>}
              <button onClick={salvar} disabled={salvando || !editandoTreino.nome.trim()} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all tracking-wide">
                {salvando ? 'Salvando...' : `Salvar Plano ${editandoTreino.plano}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAÇÃO DE DELETE ──────────────────────────────── */}
      {confirmaDeleteId && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setConfirmaDeleteId(null)}>
          <div className="w-full max-w-md rounded-t-3xl border border-white/[0.14] px-5 pt-6 pb-10 space-y-4"
            style={{ background: '#1c1c1c' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-1 text-2xl">⚠️</div>
            <p className="text-white font-black text-xl text-center">Excluir treino?</p>
            <p className="text-zinc-400 text-sm text-center leading-relaxed">
              Isso remove o treino e todos os exercícios permanentemente. Não é possível desfazer.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmaDeleteId(null)}
                className="flex-1 border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={async () => { await deletar(confirmaDeleteId); setConfirmaDeleteId(null) }}
                className="flex-1 bg-red-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EM BREVE (modalidades futuras) ──────────────────────── */}
      {modalEmBreve && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModalEmBreve(null)}>
          <div className="w-full max-w-md rounded-t-3xl border border-white/[0.14] px-5 pt-6 pb-10 space-y-4"
            style={{ background: '#1c1c1c' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/[0.14] flex items-center justify-center mx-auto mb-1 text-2xl">🚧</div>
            <p className="text-white font-black text-xl text-center">Em breve</p>
            <p className="text-zinc-400 text-sm text-center leading-relaxed">
              Prescrição de {modalEmBreve} chegando na próxima versão.
            </p>
            <button onClick={() => setModalEmBreve(null)}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* ── DRAWER: DETALHE DA SESSÃO (Triathlon) ───────────────────── */}
      {sessaoDetalhe && (() => {
        const mod = MODALIDADES_SESSAO[sessaoDetalhe.modalidade]
        const item = itensAderenciaSemana.find(it => sessaoDetalhe.id
          ? it.sessao.id === sessaoDetalhe.id
          : !it.sessao.id && it.sessao.data === sessaoDetalhe.data && it.sessao.modalidade === sessaoDetalhe.modalidade)
        const badge = STATUS_BADGE[item?.status ?? 'planejado'] ?? STATUS_BADGE.planejado
        const indicadores = item ? [
          { label: 'Duração', ind: item.indDuracao },
          { label: 'Distância', ind: item.indDistancia },
          { label: 'Pace', ind: item.indPace },
          { label: 'FC', ind: item.indFC },
        ].filter(x => x.ind.prescrito != null) : []
        return (
          <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSessaoDetalhe(null)}>
            <div className="w-full max-w-lg sm:m-4 rounded-t-3xl sm:rounded-3xl border border-white/[0.14] overflow-hidden flex flex-col"
              style={{ background: 'var(--surface-1)', maxHeight: '92vh' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.11] shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${mod.text}`}>{mod.icone}</span>
                  <div>
                    <p className="text-white font-black text-lg">
                      {sessaoDetalhe.modalidade === 'descanso' ? 'Descanso' : (sessaoDetalhe.tipo_sessao ? (TIPO_SESSAO_LABEL[sessaoDetalhe.tipo_sessao] ?? sessaoDetalhe.tipo_sessao) : mod.label)}
                    </p>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] mt-0.5">{formatDiaDetalhe(sessaoDetalhe.data)}</p>
                  </div>
                </div>
                <button onClick={() => setSessaoDetalhe(null)}
                  className="w-9 h-9 rounded-xl bg-white/[0.09] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all">
                  ✕
                </button>
              </div>

              {/* Corpo */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">

                {/* Status */}
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${badge.cls}`}>
                  <span>{badge.emoji}</span>
                  <span>{badge.label}</span>
                </div>

                {/* Resumo prescrito */}
                {(sessaoDetalhe.duracao_min != null || sessaoDetalhe.distancia_km != null) && (
                  <div className="flex gap-3 flex-wrap">
                    {sessaoDetalhe.duracao_min != null && <span className="text-zinc-400 text-xs">{sessaoDetalhe.duracao_min} min</span>}
                    {sessaoDetalhe.distancia_km != null && <span className="text-zinc-400 text-xs">{sessaoDetalhe.distancia_km} km</span>}
                  </div>
                )}

                {sessaoDetalhe.observacao && (
                  <p className="text-zinc-400 text-xs italic leading-relaxed">{sessaoDetalhe.observacao}</p>
                )}

                {/* Blocos */}
                {sessaoDetalhe.blocos.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Blocos</p>
                    <div className="space-y-2">
                      {sessaoDetalhe.blocos.map((b, i) => (
                        <div key={i} className="bg-white/[0.05] rounded-xl p-3 text-zinc-300 text-xs leading-relaxed">
                          {gerarNarrativaBloco(b, sessaoDetalhe.modalidade)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Realizado */}
                {item?.ativ && (() => {
                  const ativ = item.ativ
                  const horas = ativ.duracao_min != null ? Math.floor(ativ.duracao_min / 60) : null
                  const minRestante = ativ.duracao_min != null ? ativ.duracao_min % 60 : null
                  const duracaoFmt = ativ.duracao_min != null
                    ? (horas! > 0 ? `${horas}h ${minRestante}min` : `${minRestante}min`)
                    : null
                  const distFmt = ativ.distancia_km != null ? `${ativ.distancia_km.toFixed(1).replace('.', ',')}km` : null

                  let paceFmt: string | null = null
                  let paceLabel = 'Pace médio'
                  if (ativ.duracao_min != null) {
                    if (sessaoDetalhe.modalidade === 'natacao' && ativ.distancia_m) {
                      const sec = (ativ.duracao_min * 60) / (ativ.distancia_m / 100)
                      paceFmt = `${Math.floor(sec / 60)}:${Math.round(sec % 60).toString().padStart(2, '0')} min/100m`
                    } else if (sessaoDetalhe.modalidade === 'corrida' && ativ.distancia_km) {
                      const sec = (ativ.duracao_min * 60) / ativ.distancia_km
                      paceFmt = `${Math.floor(sec / 60)}:${Math.round(sec % 60).toString().padStart(2, '0')} min/km`
                    } else if (sessaoDetalhe.modalidade === 'bike' && ativ.distancia_km) {
                      const kmh = ativ.distancia_km / (ativ.duracao_min / 60)
                      paceFmt = `${kmh.toFixed(1).replace('.', ',')} km/h`
                      paceLabel = 'Velocidade média'
                    }
                  }

                  if (!duracaoFmt && !distFmt && ativ.fc_media == null && !paceFmt && ativ.calorias == null) return null

                  return (
                    <div className="rounded-xl p-3 bg-emerald-950/40 border border-emerald-500/20 space-y-1">
                      <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold mb-1">Realizado</p>
                      {(duracaoFmt || distFmt) && (
                        <p className="text-zinc-200 text-xs">
                          {mod.icone} {duracaoFmt}{duracaoFmt && distFmt ? '  •  ' : ''}{distFmt}
                        </p>
                      )}
                      {ativ.fc_media != null && <p className="text-zinc-200 text-xs">❤️ FC média: {ativ.fc_media}bpm</p>}
                      {paceFmt != null && <p className="text-zinc-200 text-xs">⚡ {paceLabel}: {paceFmt}</p>}
                      {ativ.calorias != null && <p className="text-zinc-200 text-xs">🔥 {ativ.calorias} kcal</p>}
                    </div>
                  )
                })()}

                {/* Compliance */}
                {indicadores.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Compliance</p>
                    <div className="space-y-1.5">
                      {indicadores.map(({ label, ind }) => (
                        <p key={label} className="text-zinc-400 text-xs">
                          {ind.icone ? `${ind.icone} ` : '· '}{label}: {ind.prescrito ?? '–'}{ind.realizado != null ? ` → ${ind.realizado}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-white/[0.11] flex gap-3 shrink-0">
                <button onClick={() => setSessaoDetalhe(null)}
                  className="flex-1 border border-white/[0.14] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                  Fechar
                </button>
                <button onClick={() => {
                  setDiaEditando(sessaoDetalhe.data)
                  setSessaoEditando({ ...sessaoDetalhe, blocos: sessaoDetalhe.blocos.map(b => ({ ...b })) })
                  setSessaoDetalhe(null)
                }}
                  className="flex-1 bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                  Editar
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* ── MODAL: PRESCREVER/EDITAR SESSÃO (Triathlon) ─────────────── */}
      {diaEditando && sessaoEditando && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setDiaEditando(null); setSessaoEditando(null) }}>
          <div className="w-full max-w-lg sm:m-4 rounded-t-3xl sm:rounded-3xl border border-white/[0.14] overflow-hidden flex flex-col"
            style={{ background: 'var(--surface-1)', maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.11] shrink-0">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-0.5">{formatDiaDetalhe(diaEditando)}</p>
                <p className="text-white font-black text-lg">{sessaoEditando.id ? 'Editar sessão' : 'Nova sessão'}</p>
              </div>
              <button onClick={() => { setDiaEditando(null); setSessaoEditando(null) }}
                className="w-9 h-9 rounded-xl bg-white/[0.09] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all">
                ✕
              </button>
            </div>

            {/* Corpo */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Modalidade */}
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Modalidade</label>
                <div className={`grid gap-2 ${getTabsModalidadeSessao(modalidadeEscolhida).length === 5 ? 'grid-cols-5' : 'grid-cols-3'}`}>
                  {getTabsModalidadeSessao(modalidadeEscolhida).map(mKey => {
                    const m = MODALIDADES_SESSAO[mKey]
                    const ativo = sessaoEditando.modalidade === mKey
                    return (
                      <button key={mKey}
                        onClick={() => setSessaoEditando(prev => prev ? { ...prev, modalidade: mKey } : prev)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-[11px] font-bold transition-all active:scale-95 ${ativo ? `${m.bg} ${m.border} ${m.text}` : 'bg-white/[0.05] border-white/[0.11] text-zinc-500'}`}>
                        <span className="text-xl">{m.icone}</span>
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {sessaoEditando.modalidade !== 'descanso' && (
                <>
                  {/* Tipo de sessão */}
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Tipo de sessão</label>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_SESSAO.map(t => (
                        <button key={t}
                          onClick={() => setSessaoEditando(prev => prev ? { ...prev, tipo_sessao: t } : prev)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${sessaoEditando.tipo_sessao === t ? 'bg-white text-black border-white' : 'bg-white/[0.05] text-zinc-400 border-white/[0.14]'}`}>
                          {TIPO_SESSAO_LABEL[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blocos */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-zinc-500 text-[10px] uppercase tracking-widest">Blocos</label>
                      <span className="text-zinc-600 text-[10px]">{sessaoEditando.blocos.length} bloco{sessaoEditando.blocos.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-3">
                      {sessaoEditando.blocos.map((bloco, i) => {
                        const watts = calcularWatts(bloco.ftp_pct, aluno?.ftp ?? null)
                        const usaDistancia = bloco.distancia_km != null
                        return (
                          <div key={i} className="bg-white/[0.05] rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <select value={bloco.nome} onChange={e => updateBlocoEditando(i, { nome: e.target.value })}
                                className="bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-white/20">
                                {NOMES_BLOCO.map(n => <option key={n} value={n} className="bg-[#1c1c1c]">{n}</option>)}
                              </select>
                              {sessaoEditando.blocos.length > 1 && (
                                <button onClick={() => removerBlocoEditando(i)}
                                  className="text-red-500/60 hover:text-red-400 text-[11px] font-semibold active:scale-90 transition-all">
                                  Remover
                                </button>
                              )}
                            </div>

                            {/* Duração / Distância */}
                            <div>
                              <div className="flex gap-2 mb-2">
                                <button onClick={() => updateBlocoEditando(i, { distancia_km: null, duracao_min: bloco.duracao_min ?? 0 })}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${!usaDistancia ? 'bg-white text-black border-white' : 'bg-white/[0.05] text-zinc-500 border-white/[0.14]'}`}>
                                  Duração (min)
                                </button>
                                <button onClick={() => updateBlocoEditando(i, { duracao_min: null, distancia_km: bloco.distancia_km ?? 0 })}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${usaDistancia ? 'bg-white text-black border-white' : 'bg-white/[0.05] text-zinc-500 border-white/[0.14]'}`}>
                                  Distância (km)
                                </button>
                              </div>
                              {usaDistancia ? (
                                <input type="number" step="0.1" inputMode="decimal" value={bloco.distancia_km ?? ''}
                                  onChange={e => updateBlocoEditando(i, { distancia_km: e.target.value ? parseFloat(e.target.value) : null })}
                                  placeholder="Ex: 5"
                                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
                              ) : (
                                <input type="number" inputMode="numeric" value={bloco.duracao_min ?? ''}
                                  onChange={e => updateBlocoEditando(i, { duracao_min: e.target.value ? parseInt(e.target.value) : null })}
                                  placeholder="Ex: 20"
                                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
                              )}
                            </div>

                            {/* Repetições — intervalado */}
                            {sessaoEditando.tipo_sessao === 'intervalado' && (
                              <div>
                                <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Repetições</label>
                                <input type="number" inputMode="numeric" value={bloco.repeticoes ?? ''}
                                  onChange={e => updateBlocoEditando(i, { repeticoes: e.target.value ? parseInt(e.target.value) : null })}
                                  placeholder="Ex: 6"
                                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
                              </div>
                            )}

                            {/* Zona de FC — não exibe para musculação */}
                            {sessaoEditando.modalidade !== 'musculacao' && (
                              <div>
                                <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Zona de FC</label>
                                <div className="flex gap-1.5">
                                  {Object.keys(ZONAS_FC).map(z => (
                                    <button key={z} onClick={() => setZonaBloco(i, z)}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95 ${bloco.zona_fc === z ? 'bg-white text-black border-white' : 'bg-white/[0.05] text-zinc-400 border-white/[0.14]'}`}>
                                      {z}
                                    </button>
                                  ))}
                                </div>
                                {bloco.fc_min != null && bloco.fc_max != null && (
                                  <p className="text-zinc-500 text-[10px] mt-1.5">{bloco.zona_fc} → {bloco.fc_min}–{bloco.fc_max} bpm</p>
                                )}
                              </div>
                            )}

                            {/* Pace alvo — corrida/natação */}
                            {(sessaoEditando.modalidade === 'corrida' || sessaoEditando.modalidade === 'natacao') && (
                              <div>
                                <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">
                                  {sessaoEditando.modalidade === 'natacao' ? 'Pace/100m' : 'Pace alvo'}
                                </label>
                                <input value={bloco.pace_alvo ?? ''}
                                  onChange={e => updateBlocoEditando(i, { pace_alvo: e.target.value || null })}
                                  placeholder={sessaoEditando.modalidade === 'natacao' ? 'Ex: 1:45/100m' : 'Ex: 5:30/km'}
                                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
                              </div>
                            )}

                            {/* % FTP — bike */}
                            {sessaoEditando.modalidade === 'bike' && (
                              <div>
                                <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">% FTP</label>
                                <input type="number" inputMode="numeric" value={bloco.ftp_pct ?? ''}
                                  onChange={e => {
                                    const pct = e.target.value ? parseInt(e.target.value) : null
                                    updateBlocoEditando(i, { ftp_pct: pct, watts_alvo: calcularWatts(pct, aluno?.ftp ?? null) })
                                  }}
                                  placeholder="Ex: 75"
                                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
                                {watts != null && <p className="text-zinc-500 text-[10px] mt-1.5">{bloco.ftp_pct}% FTP → {watts}W</p>}
                              </div>
                            )}

                            {/* Observação do bloco */}
                            <div>
                              <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Observação</label>
                              <input value={bloco.observacao ?? ''}
                                onChange={e => updateBlocoEditando(i, { observacao: e.target.value || null })}
                                placeholder="Opcional"
                                className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20" />
                            </div>

                            {/* Prévia narrativa */}
                            <p className="text-zinc-500 text-[10px] italic">{gerarNarrativaBloco(bloco, sessaoEditando.modalidade)}</p>
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={addBlocoEditando}
                      className="w-full mt-3 py-3 rounded-xl border border-dashed border-white/[0.14] text-zinc-500 text-xs font-bold active:scale-95 transition-all">
                      + Adicionar bloco
                    </button>
                  </div>
                </>
              )}

              {/* Observação geral */}
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Observação geral</label>
                <textarea value={sessaoEditando.observacao ?? ''}
                  onChange={e => setSessaoEditando(prev => prev ? { ...prev, observacao: e.target.value || null } : prev)}
                  placeholder="Opcional" rows={2}
                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/[0.11] flex gap-3 shrink-0">
              {sessaoEditando.id && (
                <button onClick={() => setConfirmaDeleteSessaoId(sessaoEditando.id!)}
                  className="w-14 border border-red-500/25 text-red-400 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                  🗑
                </button>
              )}
              <button onClick={() => { setDiaEditando(null); setSessaoEditando(null) }}
                className="flex-1 border border-white/[0.14] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={() => salvarSessao()} disabled={salvandoSessao}
                className="flex-1 bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-50">
                {salvandoSessao ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAÇÃO DE EXCLUSÃO DE SESSÃO ─────────────────── */}
      {confirmaDeleteSessaoId && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setConfirmaDeleteSessaoId(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/[0.14] px-5 pt-6 pb-10 sm:pb-6 space-y-4"
            style={{ background: '#1c1c1c' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-1 text-2xl">⚠️</div>
            <p className="text-white font-black text-xl text-center">Excluir sessão?</p>
            <p className="text-zinc-400 text-sm text-center leading-relaxed">
              Isso remove a sessão e todos os blocos prescritos permanentemente. Não é possível desfazer.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmaDeleteSessaoId(null)}
                className="flex-1 border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={() => excluirSessao(confirmaDeleteSessaoId)} disabled={excluindoSessao}
                className="flex-1 bg-red-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-50">
                {excluindoSessao ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
