'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import AlimentoBusca, { type AlimentoTACO } from '../../../components/AlimentoBusca'
import ProfissionalAIChat, { type ContextoProfissional } from '../../../components/ProfissionalAIChat'
import SidebarProfissional from '../../../components/SidebarProfissional'
import ModalAvaliacaoCompleta from '../../../components/ModalAvaliacaoCompleta'
import { LayoutDashboard, Utensils, Dumbbell, Sparkles, ClipboardList, TrendingUp, ChevronRight, Sun, Apple, UtensilsCrossed, Zap, Moon, Salad, Coffee, ChevronDown } from 'lucide-react'

type Paciente = {
  id: string; nome: string | null; email: string
  peso: number | null; objetivo: string | null
  altura: number | null; sexo: string | null; data_nascimento: string | null
  meta_peso: number | null; meta_data_limite: string | null
  nivel: string | null; fcmax: number | null; ftp: number | null
  whatsapp: string | null
}
type TreinoDia = { data: string; calorias_estimadas: number | null; plano: string | null }
type Sono = { score_recuperacao: number | null; duracao_minutos: number | null }
type BemEstar = { humor: number; energia: number; qualidade_sono: number; dor_muscular?: number | null; notas?: string | null }
type PlanoNutricional = {
  id: string; conteudo: string; calorias_meta: number | null
  proteina_meta: number | null; created_at: string
}
type MedidaCP = { id?: string; data: string; peso: number | null; gordura_pct: number | null; massa_muscular: number | null; cintura: number | null; quadril: number | null; braco_dir: number | null; coxa_dir: number | null; abdomen?: number | null; peitoral?: number | null; braco_esq?: number | null; coxa_esq?: number | null; panturrilha_dir?: number | null; panturrilha_esq?: number | null; observacoes?: string | null }
type PeriodizacaoFase = { nome_ciclo: string; nome_bloco: string; tipo_bloco: string; semana_bloco: number; total_semanas_bloco: number; semana_total: number; total_semanas: number; descricao: string | null; plano_associado: string | null }
type MetaHistorico = { calorias_meta: number | null; proteina_meta: number | null; created_at: string }
type SubstitutoEd = { nome: string; quantidade: string }
type SugestaoSub = { nome: string; quantidade: string; calorias: number; proteina: number }
type EstadoSugestoes = { itens: SugestaoSub[]; selecionados: boolean[]; carregando: boolean; erro?: string }
type AlimentoEd = {
  nome: string; quantidade: string; calorias: string; proteina: string
  kcal_100g?: number | null; prot_100g?: number | null; carbo_100g?: number | null
  gramas?: string; substituicoes?: SubstitutoEd[]
}
type VariacaoEd = { nome: string; dica: string; alimentos: AlimentoEd[] }
type RefeicaoEd = { nome: string; horario: string; variacoes: VariacaoEd[] }
type ExtrasEd = {
  hidratacaoLitros: string; hidratacaoOri: string
  oriTreino: string; estrategia: string; dicaFome: string
}

const ALIMENTO_VAZIO: AlimentoEd = { nome: '', quantidade: '', calorias: '', proteina: '', kcal_100g: null, prot_100g: null, carbo_100g: null, gramas: '' }
const VARIACAO_VAZIA: VariacaoEd = { nome: 'Opção A', dica: '', alimentos: [{ ...ALIMENTO_VAZIO }] }
const REFEICAO_VAZIA: RefeicaoEd = { nome: '', horario: '', variacoes: [{ ...VARIACAO_VAZIA }] }
const EXTRAS_VAZIO: ExtrasEd = { hidratacaoLitros: '', hidratacaoOri: '', oriTreino: '', estrategia: '', dicaFome: '' }

function getTodayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function diasSemTreinar(ultimoTreino: string | null): number {
  if (!ultimoTreino) return 999
  const d = new Date(ultimoTreino + 'T12:00:00-03:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getDistribuicaoModalidadeNutri(lista: { modalidade: string }[]) {
  const map: Record<string, number> = {}
  lista.forEach(a => { map[a.modalidade] = (map[a.modalidade] ?? 0) + 1 })
  const total = lista.length
  return Object.entries(map)
    .map(([tipo, count]) => ({ tipo, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

const TERMOS_VAZIOS = /^(nenhum|nada|não|nao|sem\s|n\/a|ok\b)/i
function limparAlerta(val: string | null): string | null {
  if (!val) return null
  const partes = val.split(/\s*[·,;]\s*/).map(v => v.trim())
    .filter(v => v.length > 1 && !TERMOS_VAZIOS.test(v))
  return partes.length ? partes.join(' · ') : null
}
function linkWhatsapp(numero: string): string | null {
  const digitos = numero.replace(/\D/g, '')
  if (!digitos) return null
  return `https://wa.me/55${digitos}`
}
function IconWhatsapp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.46 3.39 1.32 4.86L2 22l5.36-1.41a9.9 9.9 0 0 0 4.68 1.19h.01c5.46 0 9.91-4.45 9.91-9.91A9.84 9.84 0 0 0 12.04 2zm5.79 14.21c-.24.68-1.42 1.3-1.96 1.38-.5.08-1.13.11-1.83-.11-.42-.13-.96-.31-1.65-.6-2.91-1.26-4.81-4.18-4.95-4.37-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.13.65-.08.18-.21.76-.88.96-1.18.2-.3.4-.25.67-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.13.07.73-.17 1.41z"/>
    </svg>
  )
}
function formatarGeradoEm(d: Date | null): string | null {
  if (!d) return null
  const data = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `Gerado em ${data} às ${hora}`
}
function getMetaCalorias(peso: number | null, objetivo: string | null) {
  if (!peso) return null
  const tdee = Math.round((10 * peso + 6.25 * 170 - 5 * 25 + 5) * 1.55)
  if (objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}
function getMetaProteina(peso: number | null, objetivo: string | null) {
  if (!peso) return null
  if (objetivo === 'ganhar_massa') return Math.round(peso * 2.2)
  if (objetivo === 'perder_peso') return Math.round(peso * 2.0)
  return Math.round(peso * 1.8)
}
function getInitials(nome: string | null, email: string) {
  if (nome) { const p = nome.trim().split(' '); return (p.length >= 2 ? p[0][0] + p[p.length-1][0] : p[0][0]).toUpperCase() }
  return email[0].toUpperCase()
}
const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}
type TemplatePlano = { id: string; nome: string; descricao: string | null; objetivo: string; conteudo: any }
const OBJETIVO_TEMPLATE_LABEL: Record<string, string> = {
  perda_peso: 'Perda de peso',
  ganho_massa: 'Ganho de massa',
  manutencao: 'Manutenção',
  performance: 'Performance esportiva',
  low_carb: 'Low carb',
  vegetariano: 'Vegetariano',
}
const FASE_CICLO_LABEL: Record<string, string> = {
  menstrual: 'Menstrual (dias 1–5)',
  folicular: 'Folicular (dias 6–13)',
  ovulatoria: 'Ovulatória (dias 14–16)',
  lutea: 'Lútea (dias 17–28)',
}
function getDias7d(hoje: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje + 'T12:00:00-03:00'); d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  })
}
function sumAl(als: AlimentoEd[], field: 'calorias' | 'proteina') {
  return Math.round(als.reduce((s, a) => s + (parseFloat(a[field]) || 0), 0))
}

const EMOJIS_REFEICAO = ['☀️','🍎','🍽️','⚡','💪','🌙','🥑','🫐']

export default function NutricionistaPaciente() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [treinos7dDatas, setTreinos7dDatas] = useState<string[]>([])
  const [treinoHoje, setTreinoHoje] = useState<TreinoDia | null>(null)
  const [atividadesHoje, setAtividadesHoje] = useState<{ modalidade: string; duracao_min: number | null; calorias_wearable: number | null }[]>([])
  const [sonoHoje, setSonoHoje] = useState<Sono | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar | null>(null)
  const [planoAtivo, setPlanoAtivo] = useState<PlanoNutricional | null>(null)
  const [gerandoPlano, setGerandoPlano] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'visao-geral' | 'plano' | 'treino' | 'ia' | 'anamnese' | 'evolucao'>('visao-geral')
  const [carregando, setCarregando] = useState(true)

  // editor
  const [medidasCP, setMedidasCP] = useState<MedidaCP[]>([])
  const [periodizacaoFase, setPeriodizacaoFase] = useState<PeriodizacaoFase | null>(null)
  const [historicoMetas, setHistoricoMetas] = useState<MetaHistorico[]>([])

  const [nutriNome, setNutriNome] = useState<string | null>(null)
  const [personalNome, setPersonalNome] = useState<string | null>(null)
  const [caloriasSemanais, setCaloriasSemanais] = useState<number | null>(null)
  const [historicoTreinosDetalhado, setHistoricoTreinosDetalhado] = useState<{
    id: string; data: string; nome: string; plano: string | null; calorias: number | null; volume: number; exercicios: string[]
  }[]>([])
  const [atividadesLivres21d, setAtividadesLivres21d] = useState<{
    id: string; data: string; modalidade: string; duracao_min: number; distancia_km: number | null; calorias_estimadas: number | null; calorias_wearable: number | null; intensidade: number | null; fc_media: number | null; fc_max: number | null
  }[]>([])
  const [recuperacao7d, setRecuperacao7d] = useState<{ data: string; score: number | null; duracao: number | null }[]>([])
  const [recuperacaoPrev7d, setRecuperacaoPrev7d] = useState<{ data: string; score: number | null }[]>([])
  const [treinoCarregando, setTreinoCarregando] = useState(false)
  const [backfillando, setBackfillando] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)
  const [profId, setProfId] = useState<string | null>(null)
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<string | null>(null)
  const [proximaConsulta, setProximaConsulta] = useState<string | null>(null)
  const [proximaConsultaInfo, setProximaConsultaInfo] = useState<{ data: string; hora: string | null; tipo: string | null } | null>(null)
  const [proximaFase, setProximaFase] = useState<string | null>(null)
  const [diasAteProximaFase, setDiasAteProximaFase] = useState<number | null>(null)
  const [anamneseLesoes, setAnamneseLesoes] = useState<string | null>(null)
  const [anamneseRestricaoFisica, setAnamneseRestricaoFisica] = useState<string | null>(null)
  const [anamneseMedicamentos, setAnamneseMedicamentos] = useState<string | null>(null)
  const [anamneseAlergias, setAnamneseAlergias] = useState<string | null>(null)
  const [anamneseRestricaoAlimentar, setAnamneseRestricaoAlimentar] = useState<string | null>(null)
  const [anamneseFaseCiclo, setAnamneseFaseCiclo] = useState<string | null>(null)
  const [briefingIA, setBriefingIA] = useState<string | null>(null)
  const [briefingEstruturado, setBriefingEstruturado] = useState<{
    resumo: string; evolucao: string[]; alertas: string[]; recomendacoes: string[]
  } | null>(null)
  const [briefingGeradoEm, setBriefingGeradoEm] = useState<Date | null>(null)
  const [gerandoBriefing, setGerandoBriefing] = useState(false)
  const [historicoIACarregado, setHistoricoIACarregado] = useState(false)
  const [historicoIACarregando, setHistoricoIACarregando] = useState(false)
  const [historicoIA, setHistoricoIA] = useState<{
    atividades: { data: string; modalidade: string; duracao_min: number; distancia_km: number | null; calorias_wearable: number | null; calorias_estimadas: number | null; fc_media: number | null; fc_max: number | null }[]
    treinos: { data: string; nome: string; calorias: number | null; volume: number; exercicios: string[] }[]
    sono: { data: string; score: number | null; duracao_min: number | null }[]
  } | null>(null)

  const fcmaxEstimado = useMemo(() => {
    return paciente?.fcmax ?? (Math.max(0, ...atividadesLivres21d.filter(a => a.fc_max != null).map(a => a.fc_max as number)) || null)
  }, [paciente?.fcmax, atividadesLivres21d])

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
      const ativs = atividadesLivres21d.filter(a =>
        a.data >= iniStr && a.data <= (atual ? hoje : fimStr) &&
        a.fc_media != null && a.duracao_min != null
      )
      const carga = Math.round(ativs.reduce((acc, a) => acc + ((a.fc_media as number) / fcmaxEstimado) * (a.duracao_min as number), 0))
      return { label: atual ? 'Esta semana' : `Sem ${4 - n}`, carga, atual }
    })
  }, [fcmaxEstimado, atividadesLivres21d])

  const distModalidade28d = useMemo(() => {
    const hoje = getTodayBR()
    const vinte8 = new Date(); vinte8.setDate(vinte8.getDate() - 28)
    const vinte8Str = vinte8.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    return getDistribuicaoModalidadeNutri(atividadesLivres21d.filter(a => a.data >= vinte8Str && a.data <= hoje))
  }, [atividadesLivres21d])

  const treinamentoChat = useMemo(() => {
    const seteD = new Date(); seteD.setDate(seteD.getDate() - 7)
    const seteDStr = seteD.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const ultimoTreino = historicoTreinosDetalhado[0]?.data ?? null
    return {
      treinosSemana: historicoTreinosDetalhado.filter(t => t.data >= seteDStr).length,
      diasSemTreinar: diasSemTreinar(ultimoTreino),
      scoreRecuperacaoHoje: sonoHoje?.score_recuperacao ?? null,
      sonoHorasHoje: sonoHoje?.duracao_minutos ? Math.round((sonoHoje.duracao_minutos / 60) * 10) / 10 : null,
      periodizacaoFase: periodizacaoFase ? `${periodizacaoFase.nome_bloco} (${periodizacaoFase.tipo_bloco}) semana ${periodizacaoFase.semana_bloco}/${periodizacaoFase.total_semanas_bloco}` : null,
      exerciciosMaxCarga: [] as { nome: string; maxCarga: number; sessoes: number }[],
      planos: [] as { plano: string; nome: string; exercicios: { nome: string; series: number; repeticoes: number; carga: number | null; observacoes: string }[] }[],
    }
  }, [historicoTreinosDetalhado, sonoHoje, periodizacaoFase])

  const [atividades7dCount, setAtividades7dCount] = useState(0)
  const [anamneseCompleta, setAnamneseCompleta] = useState<any | null>(null)
  const [loadingAnamnese, setLoadingAnamnese] = useState(false)
  const [modalAvaliacao, setModalAvaliacao] = useState(false)
  const [avaliacaoExpandida, setAvaliacaoExpandida] = useState<string | null>(null)
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)
  const [formAvaliacao, setFormAvaliacao] = useState({
    data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    peso: '', gordura_pct: '', massa_muscular: '',
    cintura: '', quadril: '', braco_dir: '', coxa_dir: '', observacoes: ''
  })

  const [editandoFicha, setEditandoFicha] = useState(false)
  const [salvandoFicha, setSalvandoFicha] = useState(false)
  const [fichaPeso, setFichaPeso] = useState('')
  const [fichaAltura, setFichaAltura] = useState('')
  const [fichaSexo, setFichaSexo] = useState('')
  const [fichaNascimento, setFichaNascimento] = useState('')
  const [fichaObjetivo, setFichaObjetivo] = useState('')
  const [fichaMetaPeso, setFichaMetaPeso] = useState('')
  const [fichaMetaData, setFichaMetaData] = useState('')

  const [confirmandoIA, setConfirmandoIA] = useState(false)
  const [notaAvulsa, setNotaAvulsa] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)
  const [notaAnamneseId, setNotaAnamneseId] = useState<string | null>(null)
  const [metaSemPrazoAviso, setMetaSemPrazoAviso] = useState(false)

  const [editandoPlano, setEditandoPlano] = useState(false)
  const [salvandoEd, setSalvandoEd] = useState(false)
  const [refeicoesEd, setRefeicoesEd] = useState<RefeicaoEd[]>([])
  const [notaEd, setNotaEd] = useState('')
  const [extrasEd, setExtrasEd] = useState<ExtrasEd>(EXTRAS_VAZIO)
  const [variacaoAtivaEditor, setVariacaoAtivaEditor] = useState<Record<number, number>>({})
  const [mostrarModelos, setMostrarModelos] = useState(false)
  const [templates, setTemplates] = useState<TemplatePlano[]>([])
  const [carregandoTemplates, setCarregandoTemplates] = useState(false)
  const [filtroObjetivoModelo, setFiltroObjetivoModelo] = useState<string | null>(null)
  const [substAbertas, setSubstAbertas] = useState<Record<string, boolean>>({})
  const [sugestoesPorAlimento, setSugestoesPorAlimento] = useState<Record<string, EstadoSugestoes>>({})

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setProfId(session.user.id)
      supabase.from('perfis').select('nome').eq('id', session.user.id).single().then(({ data }) => { if (data?.nome) setNutriNome(data.nome) })
      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 6)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const [
        { data: perfil }, { data: treinos7d },
        { data: trHoje }, { data: atvsHoje }, { count: atvsCount }, { data: sono }, { data: bem }, { data: plano },
        { data: medidas }, { data: historicoData }, { data: periData },
        { data: anamneseData }, { data: ultimaAvalData }, { data: proximaConsultaData },
        { data: anamneseCompletaData },
      ] = await Promise.all([
        supabase.from('perfis').select('id,nome,email,peso,objetivo,altura,sexo,data_nascimento,meta_peso,meta_data_limite,nivel,fcmax,ftp,whatsapp').eq('id', clienteId).single(),
        supabase.from('treinos').select('data,calorias_estimadas').eq('cliente_id', clienteId).gte('data', semStr).eq('concluido', true),
        supabase.from('treinos').select('data,plano,calorias_estimadas').eq('cliente_id', clienteId).eq('data', hoje).eq('concluido', true).maybeSingle(),
        supabase.from('atividades_livres').select('modalidade,duracao_min,calorias_wearable').eq('usuario_id', clienteId).eq('data', hoje),
        supabase.from('atividades_livres').select('*', { count: 'exact', head: true }).eq('usuario_id', clienteId).gte('data', semStr),
        supabase.from('sono').select('score_recuperacao,duracao_minutos').eq('usuario_id', clienteId).eq('data', hoje).maybeSingle(),
        supabase.from('bem_estar').select('humor,energia,qualidade_sono,dor_muscular,notas').eq('usuario_id', clienteId).eq('data', hoje).maybeSingle(),
        supabase.from('planos_nutricionais').select('id,conteudo,calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('evolucao_medidas').select('id,data,peso,gordura_pct,massa_muscular,cintura,quadril,abdomen,peitoral,braco_dir,braco_esq,coxa_dir,coxa_esq,panturrilha_dir,panturrilha_esq,observacoes').eq('cliente_id', clienteId).order('data', { ascending: true }).limit(20),
        supabase.from('planos_nutricionais').select('calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).order('created_at', { ascending: true }).limit(12),
        supabase.from('periodizacoes').select('id,nome,data_inicio').eq('cliente_id', clienteId).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1),
        supabase.from('anamneses').select('lesoes,restricoes_fisicas,medicamentos,alergias,restricoes_alimentares,fase_ciclo').eq('cliente_id', clienteId).not('profissional_id', 'is', null).order('criado_em', { ascending: false }).limit(5),
        supabase.from('agendamentos').select('data').eq('cliente_id', clienteId).eq('status', 'realizado').order('data', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('agendamentos').select('data,hora,tipo').eq('cliente_id', clienteId).eq('status', 'agendado').gte('data', hoje).order('data').limit(1).maybeSingle(),
        supabase.from('anamneses').select('*').eq('cliente_id', clienteId).order('atualizado_em', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (perfil) setPaciente(perfil)
      setTreinos7dDatas((treinos7d ?? []).map((t: any) => t.data))
      setAtividades7dCount(atvsCount ?? 0)
      const calSem = (treinos7d ?? []).reduce((s: number, t: any) => s + (t.calorias_estimadas ?? 0), 0)
      if (calSem > 0) setCaloriasSemanais(calSem)
      if (ultimaAvalData?.data) setUltimaAvaliacao(ultimaAvalData.data)
      if (proximaConsultaData?.data) {
        setProximaConsulta(proximaConsultaData.data)
        setProximaConsultaInfo({ data: proximaConsultaData.data, hora: proximaConsultaData.hora ?? null, tipo: proximaConsultaData.tipo ?? null })
      }
      const lesoes = (anamneseData ?? []).map((a: any) => a.lesoes).filter(Boolean).join(' · ')
      const rf = (anamneseData ?? []).map((a: any) => a.restricoes_fisicas).filter(Boolean).join(' · ')
      const meds = (anamneseData ?? []).map((a: any) => a.medicamentos).filter(Boolean).join(' · ')
      const alerg = (anamneseData ?? []).map((a: any) => a.alergias).filter(Boolean).join(' · ')
      const restAlim = (anamneseData ?? []).map((a: any) => a.restricoes_alimentares).filter(Boolean).join(' · ')
      const faseCiclo = (anamneseData ?? []).find((a: any) => a.fase_ciclo)?.fase_ciclo ?? null
      if (lesoes) setAnamneseLesoes(lesoes)
      if (rf) setAnamneseRestricaoFisica(rf)
      if (meds) setAnamneseMedicamentos(meds)
      if (alerg) setAnamneseAlergias(alerg)
      if (restAlim) setAnamneseRestricaoAlimentar(restAlim)
      if (faseCiclo) setAnamneseFaseCiclo(faseCiclo)
      if (anamneseCompletaData) setAnamneseCompleta(anamneseCompletaData)

      // Nota clínica avulsa — armazenada na anamnese do profissional
      const { data: anamnesePropria } = await supabase
        .from('anamneses').select('id,observacoes')
        .eq('cliente_id', clienteId).eq('profissional_id', session.user.id)
        .limit(1).maybeSingle()
      if (anamnesePropria) {
        setNotaAnamneseId(anamnesePropria.id)
        setNotaAvulsa(anamnesePropria.observacoes ?? '')
      }

      setTreinoHoje(trHoje ?? null)
      setAtividadesHoje(atvsHoje ?? [])
      setSonoHoje(sono ?? null)
      setBemEstar(bem ?? null)
      if (plano) { setPlanoAtivo(plano); setAbaAtiva('plano') }
      if (medidas?.length) setMedidasCP(medidas as MedidaCP[])
      if (historicoData?.length) setHistoricoMetas(historicoData as MetaHistorico[])

      // Personal trainer vinculado — sempre busca, independente de periodização
      const { data: personalLink } = await supabase
        .from('vinculos').select('profissional_id')
        .eq('cliente_id', clienteId).eq('tipo', 'personal').eq('ativo', true)
        .maybeSingle()
      if (personalLink?.profissional_id) {
        const { data: pp } = await supabase
          .from('perfis').select('nome, email')
          .eq('id', personalLink.profissional_id).single()
        if (pp) setPersonalNome(pp.nome ?? pp.email ?? null)
      }

      // Carregar fase atual da periodização
      const periAtiva = Array.isArray(periData) ? periData[0] : periData
      if (periAtiva) {
        const { data: blocos } = await supabase.from('blocos_periodizacao').select('*').eq('periodizacao_id', periAtiva.id).order('ordem')
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
          const b = blocos[blocoIdx]
          const semanaNoBloco = Math.min(semanaTotal - acum, b.semanas)
          setPeriodizacaoFase({ nome_ciclo: periAtiva.nome, nome_bloco: b.nome, tipo_bloco: b.tipo, semana_bloco: semanaNoBloco, total_semanas_bloco: b.semanas, semana_total: semanaTotal, total_semanas: totalSemanas, descricao: b.descricao ?? null, plano_associado: b.plano_associado ?? null })
          if (blocoIdx < blocos.length - 1) {
            const prox = blocos[blocoIdx + 1]
            const semanasRestantes = b.semanas - semanaNoBloco
            setProximaFase(prox.nome)
            setDiasAteProximaFase(semanasRestantes * 7)
          }
        }
      }

      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  // ── editor helpers ──────────────────────────────────────────────────────
  function converterRefeicoesParaEditor(refeicoes: any[]): RefeicaoEd[] {
    function mapAlimentos(als: any[]): AlimentoEd[] {
      return (als ?? []).map((a: any) => ({
        nome: a.nome ?? '', quantidade: a.quantidade ?? '',
        calorias: String(a.calorias ?? ''), proteina: String(a.proteina ?? ''),
        kcal_100g: a.kcal_100g ?? null, prot_100g: a.prot_100g ?? null, carbo_100g: a.carbo_100g ?? null, gramas: a.gramas ?? '',
        substituicoes: Array.isArray(a.substituicoes)
          ? a.substituicoes.map((s: any) => ({ nome: s.nome ?? '', quantidade: s.quantidade ?? '' }))
          : undefined,
      }))
    }
    return (refeicoes ?? []).map((r: any) => {
      let variacoes: VariacaoEd[]
      if (r.variacoes && r.variacoes.length > 0) {
        variacoes = r.variacoes.map((v: any) => ({
          nome: v.nome ?? 'Opção A',
          dica: v.dica ?? '',
          alimentos: v.alimentos?.length > 0 ? mapAlimentos(v.alimentos) : [{ ...ALIMENTO_VAZIO }],
        }))
      } else {
        variacoes = [{
          nome: 'Opção A',
          dica: r.dica ?? '',
          alimentos: r.alimentos?.length > 0
            ? mapAlimentos(r.alimentos)
            : [{ nome: '', quantidade: '', calorias: String(r.calorias ?? ''), proteina: String(r.proteina ?? ''), kcal_100g: null, prot_100g: null, carbo_100g: null, gramas: '' }],
        }]
      }
      return { nome: r.nome ?? '', horario: r.horario ?? '', variacoes }
    })
  }
  function carregarConteudoNoEditor(conteudo: any) {
    setVariacaoAtivaEditor({})
    setRefeicoesEd(converterRefeicoesParaEditor(conteudo?.refeicoes ?? []))
    setNotaEd(conteudo?.nota_nutri ?? '')
    setExtrasEd({
      hidratacaoLitros: String(conteudo?.hidratacao?.litros_dia ?? ''),
      hidratacaoOri: conteudo?.hidratacao?.orientacao ?? '',
      oriTreino: conteudo?.orientacao_treino ?? '',
      estrategia: conteudo?.estrategia_desafio ?? '',
      dicaFome: conteudo?.dica_fome ?? '',
    })
  }
  function iniciarEdicao(doZero = false) {
    if (!doZero && planoEstruturado) {
      carregarConteudoNoEditor(planoEstruturado)
    } else {
      setRefeicoesEd([{ ...REFEICAO_VAZIA }])
      setNotaEd('')
      setExtrasEd(EXTRAS_VAZIO)
    }
    setEditandoPlano(true)
    setAbaAtiva('plano')
  }
  async function abrirBibliotecaModelos() {
    setMostrarModelos(true)
    if (templates.length > 0) return
    setCarregandoTemplates(true)
    const { data } = await supabase.from('templates_planos')
      .select('id,nome,descricao,objetivo,conteudo')
      .eq('publico', true)
      .order('objetivo')
    setTemplates(data ?? [])
    setCarregandoTemplates(false)
  }
  function carregarModelo(template: TemplatePlano) {
    let conteudo: any = template.conteudo
    if (typeof conteudo === 'string') { try { conteudo = JSON.parse(conteudo) } catch { conteudo = null } }
    if (!conteudo?.refeicoes) return
    carregarConteudoNoEditor(conteudo)
    setMostrarModelos(false)
    setEditandoPlano(true)
    setAbaAtiva('plano')
  }

  function addRefeicao() {
    setRefeicoesEd(p => [...p, { ...REFEICAO_VAZIA }])
  }
  function removeRefeicao(i: number) {
    setRefeicoesEd(p => p.filter((_, idx) => idx !== i))
    setVariacaoAtivaEditor(prev => { const n = { ...prev }; delete n[i]; return n })
  }
  function updateRefeicao(i: number, field: 'nome' | 'horario', val: string) {
    setRefeicoesEd(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function addVariacao(rIdx: number) {
    const currentLen = refeicoesEd[rIdx]?.variacoes.length ?? 1
    setRefeicoesEd(p => p.map((r, idx) => {
      if (idx !== rIdx) return r
      const letra = String.fromCharCode(65 + r.variacoes.length)
      return { ...r, variacoes: [...r.variacoes, { nome: `Opção ${letra}`, dica: '', alimentos: [{ ...ALIMENTO_VAZIO }] }] }
    }))
    setVariacaoAtivaEditor(prev => ({ ...prev, [rIdx]: currentLen }))
  }
  function removeVariacao(rIdx: number, vIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, variacoes: r.variacoes.filter((_, i) => i !== vIdx) }
      : r))
    setVariacaoAtivaEditor(prev => ({ ...prev, [rIdx]: Math.max(0, (prev[rIdx] ?? 1) - 1) }))
  }
  function updateVariacaoDica(rIdx: number, vIdx: number, val: string) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, variacoes: r.variacoes.map((v, vi) => vi === vIdx ? { ...v, dica: val } : v) }
      : r))
  }
  function addAlimento(rIdx: number, vIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, variacoes: r.variacoes.map((v, vi) => vi === vIdx ? { ...v, alimentos: [...v.alimentos, { ...ALIMENTO_VAZIO }] } : v) }
      : r))
  }
  function removeAlimento(rIdx: number, vIdx: number, aIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, variacoes: r.variacoes.map((v, vi) => vi === vIdx ? { ...v, alimentos: v.alimentos.filter((_, i) => i !== aIdx) } : v) }
      : r))
  }
  function updateAlimento(rIdx: number, vIdx: number, aIdx: number, field: keyof AlimentoEd, val: string) {
    setRefeicoesEd(p => p.map((r, idx) => {
      if (idx !== rIdx) return r
      return {
        ...r, variacoes: r.variacoes.map((v, vi) => {
          if (vi !== vIdx) return v
          const novos = v.alimentos.map((a, i) => {
            if (i !== aIdx) return a
            const updated = { ...a, [field]: val }
            if (field === 'gramas' && a.kcal_100g != null) {
              const g = parseFloat(val)
              if (!isNaN(g) && g > 0) {
                updated.calorias = String(Math.round(a.kcal_100g * g / 100))
                updated.proteina = String(((a.prot_100g ?? 0) * g / 100).toFixed(1))
              } else { updated.calorias = ''; updated.proteina = '' }
            }
            return updated
          })
          return { ...v, alimentos: novos }
        })
      }
    }))
  }
  function handleSelectTACO(rIdx: number, vIdx: number, aIdx: number, taco: AlimentoTACO) {
    setRefeicoesEd(p => p.map((r, idx) => {
      if (idx !== rIdx) return r
      return {
        ...r, variacoes: r.variacoes.map((v, vi) => {
          if (vi !== vIdx) return v
          const novos = v.alimentos.map((a, i) => i !== aIdx ? a
            : { ...a, nome: taco.nome, kcal_100g: taco.energia_kcal, prot_100g: taco.proteina_g, carbo_100g: taco.carbo_g, gramas: '', calorias: '', proteina: '' })
          return { ...v, alimentos: novos }
        })
      }
    }))
  }
  function chaveAlimento(rIdx: number, vIdx: number, aIdx: number) { return `${rIdx}_${vIdx}_${aIdx}` }
  function toggleSubstituicoes(rIdx: number, vIdx: number, aIdx: number) {
    const chave = chaveAlimento(rIdx, vIdx, aIdx)
    setSubstAbertas(p => ({ ...p, [chave]: !p[chave] }))
  }
  function mapAlimentoSub(rIdx: number, vIdx: number, aIdx: number, fn: (a: AlimentoEd) => AlimentoEd) {
    setRefeicoesEd(p => p.map((r, idx) => {
      if (idx !== rIdx) return r
      return {
        ...r, variacoes: r.variacoes.map((v, vi) => {
          if (vi !== vIdx) return v
          return { ...v, alimentos: v.alimentos.map((a, i) => i !== aIdx ? a : fn(a)) }
        })
      }
    }))
  }
  function addSubstituicao(rIdx: number, vIdx: number, aIdx: number) {
    mapAlimentoSub(rIdx, vIdx, aIdx, a => ({ ...a, substituicoes: [...(a.substituicoes ?? []), { nome: '', quantidade: '' }] }))
    setSubstAbertas(p => ({ ...p, [chaveAlimento(rIdx, vIdx, aIdx)]: true }))
  }
  function updateSubstituicao(rIdx: number, vIdx: number, aIdx: number, sIdx: number, field: keyof SubstitutoEd, val: string) {
    mapAlimentoSub(rIdx, vIdx, aIdx, a => ({ ...a, substituicoes: (a.substituicoes ?? []).map((s, si) => si !== sIdx ? s : { ...s, [field]: val }) }))
  }
  function removeSubstituicao(rIdx: number, vIdx: number, aIdx: number, sIdx: number) {
    mapAlimentoSub(rIdx, vIdx, aIdx, a => ({ ...a, substituicoes: (a.substituicoes ?? []).filter((_, si) => si !== sIdx) }))
  }
  async function sugerirSubstituicoes(rIdx: number, vIdx: number, aIdx: number) {
    const chave = chaveAlimento(rIdx, vIdx, aIdx)
    const al = refeicoesEd[rIdx]?.variacoes[vIdx]?.alimentos[aIdx]
    if (!al?.nome) return
    setSugestoesPorAlimento(p => ({ ...p, [chave]: { itens: [], selecionados: [], carregando: true } }))
    setSubstAbertas(p => ({ ...p, [chave]: true }))
    try {
      const restricoes = limparAlerta(anamneseRestricaoAlimentar) ?? limparAlerta(anamneseAlergias)
      const res = await fetch('/api/sugerir-substituicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: profId,
          alimento: {
            nome: al.nome,
            quantidade: al.quantidade || (al.gramas ? `${al.gramas}g` : ''),
            calorias: parseFloat(al.calorias) || 0,
            proteina: parseFloat(al.proteina) || 0,
          },
          paciente: { objetivo: paciente?.objetivo ?? null, peso: paciente?.peso ?? null, restricoes },
        }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.sugestoes)) {
        setSugestoesPorAlimento(p => ({ ...p, [chave]: { itens: [], selecionados: [], carregando: false, erro: data.erro ?? 'Não foi possível gerar sugestões agora.' } }))
        return
      }
      setSugestoesPorAlimento(p => ({ ...p, [chave]: { itens: data.sugestoes, selecionados: data.sugestoes.map(() => false), carregando: false } }))
    } catch {
      setSugestoesPorAlimento(p => ({ ...p, [chave]: { itens: [], selecionados: [], carregando: false, erro: 'Erro de conexão ao gerar sugestões.' } }))
    }
  }
  function toggleSugestaoSelecionada(rIdx: number, vIdx: number, aIdx: number, sgIdx: number) {
    const chave = chaveAlimento(rIdx, vIdx, aIdx)
    setSugestoesPorAlimento(p => {
      const atual = p[chave]
      if (!atual) return p
      return { ...p, [chave]: { ...atual, selecionados: atual.selecionados.map((v, i) => i === sgIdx ? !v : v) } }
    })
  }
  function aprovarSugestoes(rIdx: number, vIdx: number, aIdx: number) {
    const chave = chaveAlimento(rIdx, vIdx, aIdx)
    const atual = sugestoesPorAlimento[chave]
    if (!atual) return
    const aprovados = atual.itens.filter((_, i) => atual.selecionados[i]).map(s => ({ nome: s.nome, quantidade: s.quantidade }))
    if (aprovados.length === 0) return
    mapAlimentoSub(rIdx, vIdx, aIdx, a => ({ ...a, substituicoes: [...(a.substituicoes ?? []), ...aprovados] }))
    setSugestoesPorAlimento(p => { const n = { ...p }; delete n[chave]; return n })
  }
  function descartarSugestoes(rIdx: number, vIdx: number, aIdx: number) {
    const chave = chaveAlimento(rIdx, vIdx, aIdx)
    setSugestoesPorAlimento(p => { const n = { ...p }; delete n[chave]; return n })
  }

  async function salvarEdicao() {
    setSalvandoEd(true)
    const planoJSON: any = {
      nota_nutri: notaEd,
      refeicoes: refeicoesEd.map(r => {
        const variacoes = r.variacoes.map((v, vi) => ({
          nome: v.nome || `Opção ${String.fromCharCode(65 + vi)}`,
          ...(v.dica ? { dica: v.dica } : {}),
          calorias: sumAl(v.alimentos, 'calorias'),
          proteina: sumAl(v.alimentos, 'proteina'),
          alimentos: v.alimentos.filter(a => a.nome).map(a => {
            const substituicoes = (a.substituicoes ?? []).filter(s => s.nome.trim())
            return {
              nome: a.nome, quantidade: a.quantidade,
              calorias: parseFloat(a.calorias) || 0,
              proteina: parseFloat(a.proteina) || 0,
              ...(a.kcal_100g != null ? { kcal_100g: a.kcal_100g, prot_100g: a.prot_100g, carbo_100g: a.carbo_100g, gramas: a.gramas } : {}),
              ...(substituicoes.length > 0 ? { substituicoes } : {}),
            }
          }),
        }))
        const calRef = variacoes[0]?.calorias ?? 0
        const protRef = variacoes[0]?.proteina ?? 0
        return {
          nome: r.nome, horario: r.horario,
          calorias: calRef, proteina: protRef,
          variacoes,
          // legado para compatibilidade com visualizações antigas
          alimentos: variacoes[0]?.alimentos ?? [],
        }
      }),
    }
    if (extrasEd.hidratacaoLitros || extrasEd.hidratacaoOri)
      planoJSON.hidratacao = { litros_dia: parseFloat(extrasEd.hidratacaoLitros) || 0, orientacao: extrasEd.hidratacaoOri }
    if (extrasEd.oriTreino) planoJSON.orientacao_treino = extrasEd.oriTreino
    if (extrasEd.estrategia) planoJSON.estrategia_desafio = extrasEd.estrategia
    if (extrasEd.dicaFome) planoJSON.dica_fome = extrasEd.dicaFome
    const totalCal = planoJSON.refeicoes.reduce((s: number, r: any) => s + r.calorias, 0)
    const totalProt = planoJSON.refeicoes.reduce((s: number, r: any) => s + r.proteina, 0)
    await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', clienteId).eq('ativo', true)
    const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
      usuario_id: clienteId, criado_por: 'nutricionista',
      conteudo: JSON.stringify(planoJSON),
      calorias_meta: totalCal || metaCal,
      proteina_meta: totalProt || metaProt,
      refeicoes_por_dia: refeicoesEd.length, ativo: true,
    }).select('id,conteudo,calorias_meta,proteina_meta,created_at').single()
    if (novoPlano) setPlanoAtivo(novoPlano)
    setEditandoPlano(false)
    setSalvandoEd(false)
  }

  async function salvarFicha() {
    if (fichaMetaPeso && !fichaMetaData) {
      setMetaSemPrazoAviso(true)
      return
    }
    setMetaSemPrazoAviso(false)
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
    setPaciente(prev => prev ? { ...prev, ...updates } : prev)
    setEditandoFicha(false)
    setSalvandoFicha(false)
  }

  async function salvarNotaAvulsa() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSalvandoNota(true)
    if (notaAnamneseId) {
      await supabase.from('anamneses').update({ observacoes: notaAvulsa, atualizado_em: new Date().toISOString() }).eq('id', notaAnamneseId)
    } else {
      const { data: nova } = await supabase.from('anamneses').insert({
        cliente_id: clienteId, profissional_id: session.user.id,
        observacoes: notaAvulsa, atualizado_em: new Date().toISOString(),
      }).select('id').single()
      if (nova) setNotaAnamneseId(nova.id)
    }
    setSalvandoNota(false)
  }

  // Load training data on mount (needed for AI chat context) and when treino tab opens
  useEffect(() => {
    carregarDadosTreino()
  }, [])

  useEffect(() => {
    if (abaAtiva === 'treino') carregarDadosTreino()
  }, [abaAtiva])

  useEffect(() => {
    if (abaAtiva === 'ia' && !historicoIACarregado && !historicoIACarregando) {
      carregarHistoricoCompletoIA()
    }
  }, [abaAtiva])

  async function sincronizarStrava() {
    setBackfillando(true); setBackfillMsg(null)
    try {
      const res = await fetch('/api/strava/sync-atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: clienteId, dias: 30 }),
      })
      const data = await res.json()
      if (data.sucesso) {
        const parts = []
        if (data.inseridos > 0) parts.push(`${data.inseridos} nova${data.inseridos > 1 ? 's' : ''}`)
        if (data.atualizados > 0) parts.push(`${data.atualizados} cal. atualizadas`)
        setBackfillMsg(parts.length ? `✓ ${parts.join(' · ')}` : '✓ Tudo sincronizado')
        if (data.inseridos > 0 || data.atualizados > 0) {
          setHistoricoTreinosDetalhado([])
          setAtividadesLivres21d([])
          setTimeout(() => carregarDadosTreino(true), 100)
        }
      } else {
        setBackfillMsg(data.erro ?? 'Erro ao sincronizar')
      }
    } catch {
      setBackfillMsg('Erro de conexão')
    }
    setBackfillando(false)
    setTimeout(() => setBackfillMsg(null), 6000)
  }

  async function backfillCalorias() {
    setBackfillando(true); setBackfillMsg(null)
    try {
      const res = await fetch('/api/strava/backfill-calorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: clienteId }),
      })
      const data = await res.json()
      if (data.sucesso) {
        const msg = data.atualizados > 0
          ? `✓ ${data.atualizados} atividades atualizadas`
          : 'Nenhuma caloria disponível no Strava para as atividades restantes'
        setBackfillMsg(msg)
        if (data.atualizados > 0) {
          setHistoricoTreinosDetalhado([])
          setAtividadesLivres21d([])
          setTimeout(() => carregarDadosTreino(true), 100)
        }
      } else {
        setBackfillMsg(data.erro ?? 'Erro ao buscar calorias')
      }
    } catch {
      setBackfillMsg('Erro de conexão')
    }
    setBackfillando(false)
    setTimeout(() => setBackfillMsg(null), 5000)
  }

  async function carregarDadosTreino(force = false) {
    if (!force && (treinoCarregando || historicoTreinosDetalhado.length > 0)) return
    setTreinoCarregando(true)
    const trinta = new Date(); trinta.setDate(trinta.getDate() - 30)
    const q30 = trinta.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    // Semana calendário dom→sab (alinhada com getDay() == 0 para domingo)
    const todayLoadStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const dLoadBase = new Date(todayLoadStr + 'T12:00:00-03:00')
    const currStartLoad = new Date(dLoadBase); currStartLoad.setDate(dLoadBase.getDate() - dLoadBase.getDay())
    const currEndLoad   = new Date(dLoadBase); currEndLoad.setDate(dLoadBase.getDate() - dLoadBase.getDay() + 6)
    const prevStartLoad = new Date(dLoadBase); prevStartLoad.setDate(dLoadBase.getDate() - dLoadBase.getDay() - 7)
    const prevEndLoad   = new Date(dLoadBase); prevEndLoad.setDate(dLoadBase.getDate() - dLoadBase.getDay() - 1)
    const currWeekStartLoad = currStartLoad.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const currWeekEndLoad = currEndLoad.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const prevWeekStartLoad = prevStartLoad.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const prevWeekEndLoad = prevEndLoad.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [{ data: treinosHist }, { data: ativs }, { data: sonoHist }, { data: personalNomeRpc }] = await Promise.all([
      supabase.from('treinos').select('id,data,nome,plano,calorias_estimadas').eq('cliente_id', clienteId).eq('concluido', true).gte('data', q30).order('data', { ascending: false }),
      supabase.from('atividades_livres').select('id,data,modalidade,duracao_min,distancia_km,calorias_estimadas,calorias_wearable,intensidade,fc_media,fc_max').eq('usuario_id', clienteId).gte('data', q30).order('data', { ascending: false }),
      supabase.from('sono').select('data,score_recuperacao,duracao_minutos').eq('usuario_id', clienteId).gte('data', prevWeekStartLoad).order('data', { ascending: true }),
      supabase.rpc('get_personal_trainer_nome', { p_cliente_id: clienteId }),
    ])

    // RPC SECURITY DEFINER: vinculos.profissional_id referencia auth.users (não perfis), então o
    // PostgREST não resolve o embed perfis(...), e a RLS de vinculos impede o nutricionista de
    // ler o vínculo "personal" do paciente diretamente. A função no banco faz a checagem de
    // autorização e retorna apenas o nome do personal trainer.
    setPersonalNome((personalNomeRpc as string | null) ?? null)

    if (treinosHist?.length) {
      const ids = treinosHist.map((t: any) => t.id)
      const { data: exs } = await supabase.from('exercicios_treino').select('id,treino_id,nome').in('treino_id', ids)
      const { data: series } = ids.length
        ? await supabase.from('series_registradas').select('exercicio_id,carga,repeticoes').in('exercicio_id', (exs ?? []).map((e: any) => e.id))
        : { data: [] }

      const hist = (treinosHist as any[]).map(t => {
        const exsTreino = (exs ?? []).filter((e: any) => e.treino_id === t.id)
        const seriesTreino = (series ?? []).filter((s: any) => exsTreino.some((e: any) => e.id === s.exercicio_id))
        const vol = seriesTreino.reduce((acc: number, s: any) => acc + ((s.carga ?? 0) * (s.repeticoes ?? 0)), 0)
        return { id: t.id, data: t.data, nome: t.nome, plano: t.plano, calorias: t.calorias_estimadas, volume: Math.round(vol), exercicios: exsTreino.slice(0, 4).map((e: any) => e.nome) }
      })
      setHistoricoTreinosDetalhado(hist)
    }

    if (ativs?.length) setAtividadesLivres21d(ativs as any)
    if (sonoHist?.length) {
      const sonoArr = sonoHist as any[]
      const curr7 = sonoArr.filter(s => s.data >= currWeekStartLoad && s.data <= currWeekEndLoad)
      const prev7 = sonoArr.filter(s => s.data >= prevWeekStartLoad && s.data <= prevWeekEndLoad)
      setRecuperacao7d(curr7.map((s: any) => ({ data: s.data, score: s.score_recuperacao, duracao: s.duracao_minutos })))
      setRecuperacaoPrev7d(prev7.map((s: any) => ({ data: s.data, score: s.score_recuperacao })))
    }
    setTreinoCarregando(false)
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

  async function gerarPlanoIA() {
    if (!paciente) return
    setGerandoPlano(true); setEditandoPlano(false); setAbaAtiva('plano')
    const metaCalLocal = getMetaCalorias(paciente.peso, paciente.objetivo)
    const metaProtLocal = getMetaProteina(paciente.peso, paciente.objetivo)
    const obj = OBJETIVO_LABEL[paciente.objetivo ?? ''] ?? 'Saúde geral'
    const numRef = paciente.objetivo === 'ganhar_massa' ? 6 : 5
    const prompt = `Você é uma nutricionista esportiva. Crie um plano alimentar completo e personalizado.

PERFIL: Nome: ${paciente.nome ?? 'Paciente'}, Objetivo: ${obj}, Peso: ${paciente.peso ?? '?'}kg
Meta calórica: ${metaCalLocal ?? 2000}kcal/dia, Meta proteína: ${metaProtLocal ?? 120}g/dia

INSTRUÇÕES: Exatamente ${numRef} refeições. Cada alimento com quantidade precisa em gramas e macros individuais.
Total ~${metaCalLocal ?? 2000}kcal e ~${metaProtLocal ?? 120}g proteína.

Responda APENAS JSON válido:
{
  "nota_nutri": "Nota clínica curta.",
  "refeicoes": [
    {
      "nome": "Café da Manhã", "horario": "07:00", "calorias": 480, "proteina": 32,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "3 unidades (150g)", "calorias": 215, "proteina": 19, "carboidrato": 2, "gordura": 15 }
      ],
      "dica": "Dica prática."
    }
  ],
  "hidratacao": { "litros_dia": 3.0, "orientacao": "Orientação." }
}`
    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, modo: 'plano' }) })
      const data = await res.json()
      const jsonMatch = (data.analise ?? '').match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const planoJSON = JSON.parse(jsonMatch[0])
      await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', clienteId).eq('ativo', true)
      const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
        usuario_id: clienteId, criado_por: 'nutricionista', conteudo: JSON.stringify(planoJSON),
        calorias_meta: metaCalLocal, proteina_meta: metaProtLocal,
        refeicoes_por_dia: planoJSON.refeicoes?.length ?? numRef, ativo: true,
      }).select('id,conteudo,calorias_meta,proteina_meta,created_at').single()
      if (novoPlano) setPlanoAtivo(novoPlano)
    } catch (e) { console.error(e) } finally { setGerandoPlano(false) }
  }

  async function gerarBriefing() {
    if (gerandoBriefing || !paciente) return
    setGerandoBriefing(true)
    const lesoesFilt = limparAlerta(anamneseLesoes)
    const rfFilt = limparAlerta(anamneseRestricaoFisica)
    const medsFilt = limparAlerta(anamneseMedicamentos)
    const alergFilt = limparAlerta(anamneseAlergias)
    const deltaPeso = medidasCP.length >= 2 && medidasCP[0].peso && medidasCP[medidasCP.length-1].peso
      ? ((medidasCP[medidasCP.length-1].peso ?? 0) - medidasCP[0].peso!).toFixed(1)
      : null
    const atvsHojeTexto = atividadesHoje.length > 0
      ? atividadesHoje.map(a => `${a.modalidade} ${a.duracao_min ?? '?'}min`).join(', ')
      : 'nenhuma'
    const calSemTexto = caloriasSemanais > 0 ? `${caloriasSemanais} kcal gastas na semana` : 'sem dados de gasto calórico'
    const pesoAtual = medidasCP.length > 0 ? medidasCP[medidasCP.length-1].peso : paciente.peso
    const pesoInicial = medidasCP.length >= 2 ? medidasCP[0].peso : null

    const prompt = `Gere um briefing pré-consulta clínico conciso. Retorne APENAS este JSON (sem texto fora):
{
  "resumo": "2 frases clínicas sobre a situação atual — mencione evolução recente e ponto de atenção principal",
  "evolucao": ["conquista ou dado positivo relevante", "segundo ponto de evolução", "terceiro se houver"],
  "alertas": ["alerta clínico prioritário se houver", "segundo alerta se houver"],
  "recomendacoes": ["ajuste ou reforço para a consulta de hoje", "segunda recomendação prática"]
}

DADOS DO PACIENTE (últimos 7 dias):
Nome: ${paciente.nome} | Objetivo: ${paciente.objetivo ?? 'não definido'} | Idade: ${paciente.data_nascimento ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / 31557600000) + ' anos' : '?'}
Peso: ${pesoAtual ?? '?'}kg${pesoInicial && pesoAtual ? ` (variação: ${((pesoAtual - pesoInicial) >= 0 ? '+' : '')}${((pesoAtual - pesoInicial)).toFixed(1)}kg desde início)` : ''}
Gordura corporal: ${medidasCP.length >= 2 ? `${medidasCP[medidasCP.length-1].gordura_pct ?? '?'}% (era ${medidasCP[0].gordura_pct ?? '?'}%)` : 'sem dados'}
Plano nutricional: ${planoAtivo ? `${planoAtivo.calorias_meta} kcal/dia, ${planoAtivo.proteina_meta}g proteína` : 'SEM PLANO PRESCRITO'}
Gasto energético: ${calSemTexto}
Treinos esta semana: ${treinos7dDatas.length + atividades7dCount} sessões (${treinos7dDatas.length} plano + ${atividades7dCount} Strava)
Atividade hoje: ${atvsHojeTexto}
Recuperação hoje (sono): ${sonoHoje?.score_recuperacao != null ? `${sonoHoje.score_recuperacao}/100` : 'não registrada'}
Fase de treino: ${periodizacaoFase ? `${periodizacaoFase.nome_bloco} — semana ${periodizacaoFase.semana_bloco}/${periodizacaoFase.total_semanas_bloco}` : 'sem periodização'}
Alertas clínicos: ${[lesoesFilt, rfFilt, medsFilt, alergFilt].filter(Boolean).join('; ') || 'nenhum registrado'}`

    try {
      const res = await fetch('/api/kore-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: [{ role: 'user', content: prompt }],
          systemPrompt: 'Você é um assistente clínico de nutrição. Responda APENAS com o JSON solicitado, sem texto adicional.',
          usuarioId: profId,
        })
      })
      const data = await res.json()
      const resposta = data.resposta ?? ''
      // Try to parse as structured JSON
      try {
        const match = resposta.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (parsed.resumo && parsed.evolucao && parsed.alertas && parsed.recomendacoes) {
            setBriefingEstruturado(parsed)
            setBriefingIA(parsed.resumo) // keep for compatibility
            setBriefingGeradoEm(new Date())
          } else {
            setBriefingIA(resposta)
            setBriefingGeradoEm(new Date())
          }
        } else {
          setBriefingIA(resposta)
          setBriefingGeradoEm(new Date())
        }
      } catch {
        setBriefingIA(resposta)
        setBriefingGeradoEm(new Date())
      }
    } catch { setBriefingIA('Erro ao gerar briefing.') }
    setGerandoBriefing(false)
  }

  async function salvarAvaliacao() {
    setSalvandoAvaliacao(true)
    const { error } = await supabase.from('evolucao_medidas').insert({
      cliente_id: clienteId,
      data: formAvaliacao.data,
      peso: formAvaliacao.peso ? parseFloat(formAvaliacao.peso) : null,
      gordura_pct: formAvaliacao.gordura_pct ? parseFloat(formAvaliacao.gordura_pct) : null,
      massa_muscular: formAvaliacao.massa_muscular ? parseFloat(formAvaliacao.massa_muscular) : null,
      cintura: formAvaliacao.cintura ? parseFloat(formAvaliacao.cintura) : null,
      quadril: formAvaliacao.quadril ? parseFloat(formAvaliacao.quadril) : null,
      braco_dir: formAvaliacao.braco_dir ? parseFloat(formAvaliacao.braco_dir) : null,
      coxa_dir: formAvaliacao.coxa_dir ? parseFloat(formAvaliacao.coxa_dir) : null,
      observacoes: formAvaliacao.observacoes || null,
    })
    if (!error) {
      // Reload medidasCP
      const { data: novas } = await supabase.from('evolucao_medidas')
        .select('id,data,peso,gordura_pct,massa_muscular,cintura,quadril,abdomen,peitoral,braco_dir,braco_esq,coxa_dir,coxa_esq,panturrilha_dir,panturrilha_esq,observacoes')
        .eq('cliente_id', clienteId).order('data', { ascending: true }).limit(20)
      if (novas) setMedidasCP(novas as MedidaCP[])
      setModalAvaliacao(false)
      setFormAvaliacao({ data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }), peso: '', gordura_pct: '', massa_muscular: '', cintura: '', quadril: '', braco_dir: '', coxa_dir: '', observacoes: '' })
      setAbaAtiva('evolucao')
    }
    setSalvandoAvaliacao(false)
  }

  if (carregando) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const metaCal = getMetaCalorias(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const metaProt = getMetaProteina(paciente?.peso ?? null, paciente?.objetivo ?? null)
  // Peso exibido no cabeçalho: usa o registro mais recente de evolucao_medidas (fonte de verdade
  // da composição corporal); cai para perfis.peso só quando não há nenhuma avaliação registrada.
  const pesoHeader = medidasCP.length > 0 ? medidasCP[medidasCP.length - 1].peso ?? paciente?.peso ?? null : paciente?.peso ?? null
  const hoje = getTodayBR()
  const dias7d = getDias7d(hoje)

  let planoEstruturado: any = null
  if (planoAtivo) { try { const p = JSON.parse(planoAtivo.conteudo); if (p.refeicoes) planoEstruturado = p } catch {} }

  const totalEdCal = refeicoesEd.reduce((s, r, rIdx) => {
    const vIdx = variacaoAtivaEditor[rIdx] ?? 0
    return s + sumAl(r.variacoes[vIdx]?.alimentos ?? [], 'calorias')
  }, 0)
  const totalEdProt = refeicoesEd.reduce((s, r, rIdx) => {
    const vIdx = variacaoAtivaEditor[rIdx] ?? 0
    return s + sumAl(r.variacoes[vIdx]?.alimentos ?? [], 'proteina')
  }, 0)

  return (
    <main className="min-h-[100dvh] text-white flex flex-col md:flex-row">

      {/* ── SIDEBAR — só desktop ─────────────────────────────────────── */}
      <SidebarProfissional tipo="nutricionista" />

      {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden md:h-screen">

      {/* ── HEADER FIXO ─────────────────────────────────────────────── */}
      <div className="shrink-0 sticky top-0 z-20 border-b"
           style={{ background: 'linear-gradient(135deg, rgba(28,22,30,0.96) 0%, rgba(20,22,34,0.96) 100%)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)', borderColor: 'rgba(255,255,255,0.10)', paddingTop: 'max(0.75rem, env(safe-area-inset-top))', boxShadow: '0 1px 0 rgba(255,90,54,0.08)' }}>
        <div className="px-4 md:px-8 pb-4">
          <button onClick={() => router.push('/nutricionista/pacientes')}
            style={{ color: '#7A8290', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F5F6F8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#7A8290')}>
            ← Dashboard
          </button>
          <div className="flex items-center justify-between gap-6">
            {/* Avatar + nome + dados primários */}
            <div className="flex items-center gap-4 min-w-0">
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(45,212,167,0.12)', border: '1px solid rgba(45,212,167,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(45,212,167,0.15)' }}>
                <span style={{ color: '#2DD4A7', fontWeight: 900, fontSize: 16, fontFamily: "'Sora', system-ui" }}>{paciente ? getInitials(paciente.nome, paciente.email) : '?'}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 style={{ fontFamily: "'Sora', system-ui", fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#F5F6F8', lineHeight: 1 }}>{paciente?.nome ?? paciente?.email ?? 'Paciente'}</h1>
                  {paciente?.whatsapp && linkWhatsapp(paciente.whatsapp) && (
                    <a href={linkWhatsapp(paciente.whatsapp)!} target="_blank" rel="noopener noreferrer"
                      title="Conversar no WhatsApp"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0"
                      style={{ color: '#2DD4A7', background: 'rgba(45,212,167,0.10)', border: '1px solid rgba(45,212,167,0.20)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(45,212,167,0.18)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(45,212,167,0.10)')}>
                      <IconWhatsapp size={14} />
                    </a>
                  )}
                  {paciente?.data_nascimento && (() => {
                    const hoje2 = new Date()
                    const nasc = new Date(paciente.data_nascimento)
                    const idade = hoje2.getFullYear() - nasc.getFullYear() - (hoje2 < new Date(hoje2.getFullYear(), nasc.getMonth(), nasc.getDate()) ? 1 : 0)
                    return <span className="text-zinc-500 text-sm">{idade} anos</span>
                  })()}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {pesoHeader != null && <span style={{ fontSize: 11, color: '#9AA0AD', background: 'rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 10px' }}>{pesoHeader} kg</span>}
                  {paciente?.objetivo && <span style={{ fontSize: 11, color: '#9AA0AD', background: 'rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 10px' }}>{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</span>}
                  {paciente?.meta_peso && <span style={{ fontSize: 11, color: '#2DD4A7', background: 'rgba(45,212,167,0.1)', border: '1px solid rgba(45,212,167,0.2)', borderRadius: 99, padding: '3px 10px' }}>Meta: {paciente.meta_peso} kg</span>}
                  {metaCal && <span style={{ fontSize: 11, color: '#9AA0AD', background: 'rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 10px', display: 'none' }} className="md:inline-block">{metaCal} kcal/dia</span>}
                </div>
              </div>
            </div>

            {/* Dados contextuais — desktop only */}
            <div className="hidden md:flex items-center gap-6 shrink-0">
              {ultimaAvaliacao && (
                <div className="text-right">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Última consulta</p>
                  <p className="text-zinc-300 text-sm font-medium mt-0.5">{new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>
                </div>
              )}
              {proximaConsulta && (
                <div className="text-right">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Próxima consulta</p>
                  <p className="text-[#2DD4A7] text-sm font-medium mt-0.5">{new Date(proximaConsulta).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>
                </div>
              )}
              {medidasCP.length >= 2 && (() => {
                const ultima = medidasCP[medidasCP.length - 1]
                const primeira = medidasCP[0]
                const deltaPeso = ultima.peso && primeira.peso ? Math.round((ultima.peso - primeira.peso) * 10) / 10 : null
                const evoluindo = deltaPeso !== null && (paciente?.objetivo === 'perder_peso' ? deltaPeso < 0 : deltaPeso > 0)
                return (
                  <div className="text-right">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Status</p>
                    <span className={`text-sm font-semibold mt-0.5 ${evoluindo ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {evoluindo ? '↗ Evoluindo' : deltaPeso === 0 ? '→ Estável' : '↘ Monitorar'}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA DE ABAS ────────────────────────────────────────────── */}
      <div className="shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex px-4 md:px-8 min-w-max">
          {([
            { id: 'visao-geral', label: 'Visão Geral',  Icon: LayoutDashboard },
            { id: 'plano',       label: 'Plano',         Icon: Utensils },
            { id: 'treino',      label: 'Treino',        Icon: Dumbbell },
            { id: 'ia',          label: 'IA Clínica',    Icon: Sparkles },
            { id: 'anamnese',    label: 'Anamnese',      Icon: ClipboardList },
            { id: 'evolucao',    label: 'Evolução',      Icon: TrendingUp },
          ] as { id: string; label: string; Icon: React.ComponentType<{size?: number; className?: string}> }[]).map(tab => (
            <button key={tab.id}
              onClick={() => {
                if (tab.id === 'anamnese' && !anamneseCompleta && !loadingAnamnese) {
                  setLoadingAnamnese(true)
                  supabase.from('anamneses').select('*').eq('cliente_id', clienteId).order('atualizado_em', { ascending: false }).limit(1).maybeSingle()
                    .then(({ data }) => { setAnamneseCompleta(data); setLoadingAnamnese(false) })
                }
                setAbaAtiva(tab.id as any); setEditandoPlano(false)
              }}
              style={{
                padding: '12px 16px', fontSize: 13, borderBottom: `2px solid ${abaAtiva === tab.id ? '#FF5A36' : 'transparent'}`,
                color: abaAtiva === tab.id ? '#F5F6F8' : '#7A8290', fontWeight: abaAtiva === tab.id ? 700 : 400,
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', borderBottom: `2px solid ${abaAtiva === tab.id ? '#FF5A36' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 150ms',
              }}>
              <tab.Icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTEÚDO SINGLE-COLUMN ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 pb-28 md:pb-10">




        {/* ── ABA VISÃO GERAL ──────────────────────────────────────────── */}
        {abaAtiva === 'visao-geral' && (
          <div className="space-y-8">

            {/* ── 1. PERFIL NUTRICIONAL — bloco prioritário ────────────── */}
            <div style={{ background: 'rgba(45,212,167,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(45,212,167,0.18)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(45,212,167,0.10)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Salad size={13} className="text-emerald-400 shrink-0" />
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">Perfil nutricional</p>
                {paciente?.meta_data_limite && (
                  <span className="ml-auto text-[10px] text-zinc-600">
                    Prazo: {new Date(paciente.meta_data_limite).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                  </span>
                )}
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Coluna esquerda: objetivo, meta, ciclo */}
                <div className="space-y-3">
                  {paciente?.objetivo ? (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Objetivo</p>
                      <p className="text-white font-bold text-base">{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</p>
                      {paciente.meta_peso && (
                        <p className="text-emerald-400 text-sm mt-0.5">Meta: {paciente.meta_peso} kg</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-700 text-sm italic">Objetivo não definido</p>
                  )}
                  {anamneseFaseCiclo && (paciente?.sexo === 'feminino' || paciente?.sexo === 'f' || paciente?.sexo === 'F') && (
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2.5">
                      <span className="text-base">🌙</span>
                      <div>
                        <p className="text-[10px] text-purple-400/70 uppercase tracking-wider">Fase do ciclo</p>
                        <p className="text-purple-300 text-sm font-medium mt-0.5">{FASE_CICLO_LABEL[anamneseFaseCiclo] ?? anamneseFaseCiclo}</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Coluna direita: alertas alimentares + medicamentos */}
                <div className="space-y-2.5">
                  {[
                    { icon: '🟡', label: 'Alergias alimentares',    val: limparAlerta(anamneseAlergias),           color: 'text-amber-300' },
                    { icon: '🔶', label: 'Restrições alimentares',  val: limparAlerta(anamneseRestricaoAlimentar), color: 'text-orange-300' },
                    { icon: '💊', label: 'Medicamentos em uso',     val: limparAlerta(anamneseMedicamentos),        color: 'text-zinc-300' },
                  ].filter(r => r.val).map((row, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-sm shrink-0 mt-0.5">{row.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-600 text-[10px] uppercase tracking-wider">{row.label}</p>
                        <p className={`text-sm leading-snug mt-0.5 ${row.color}`}>{row.val}</p>
                      </div>
                    </div>
                  ))}
                  {!anamneseAlergias && !anamneseRestricaoAlimentar && !anamneseMedicamentos && (
                    <p className="text-zinc-700 text-sm italic">Sem alertas nutricionais registrados</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── 2. SITUAÇÃO ATUAL — composição corporal ──────────────── */}
            {medidasCP.length >= 1 ? (() => {
              const validas = medidasCP.filter(m =>
                (m.peso == null || (m.peso > 30 && m.peso < 300)) &&
                (m.gordura_pct == null || (m.gordura_pct > 0 && m.gordura_pct < 60)) &&
                (m.massa_muscular == null || (m.massa_muscular > 10 && m.massa_muscular < 150))
              )
              if (!validas.length) return null
              const ultima = validas[validas.length - 1]
              const primeira = validas.length >= 2 ? validas[0] : null
              type MC = { label: string; val: number | null; unit: string; delta: number | null; inv: boolean }
              const metricas: MC[] = [
                { label: 'Peso', val: ultima.peso, unit: 'kg', delta: primeira?.peso ? Math.round(((ultima.peso ?? 0) - primeira.peso) * 10) / 10 : null, inv: false },
                { label: 'Gordura', val: ultima.gordura_pct, unit: '%', delta: primeira?.gordura_pct ? Math.round(((ultima.gordura_pct ?? 0) - primeira.gordura_pct) * 10) / 10 : null, inv: true },
                { label: 'Músculo', val: ultima.massa_muscular, unit: 'kg', delta: primeira?.massa_muscular ? Math.round(((ultima.massa_muscular ?? 0) - primeira.massa_muscular) * 10) / 10 : null, inv: false },
              ].filter(m => m.val != null)
              return (
                <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Composição corporal</p>
                      {ultimaAvaliacao && <p className="text-zinc-600 text-[10px]">· {new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>}
                    </div>
                    <div className="flex items-end gap-6">
                      {metricas.map(m => {
                        const positivo = m.delta !== null && (m.inv ? m.delta < 0 : m.delta > 0)
                        return (
                          <div key={m.label}>
                            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">{m.label}</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-white tracking-tight leading-none">{m.val}</span>
                              <span className="text-zinc-500 text-xs">{m.unit}</span>
                              {m.delta !== null && m.delta !== 0 && (
                                <span className={`text-[10px] font-semibold ml-1 ${positivo ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {m.delta > 0 ? '+' : ''}{m.delta}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <button onClick={() => setAbaAtiva('evolucao')}
                    className="text-xs text-zinc-600 hover:text-[#2DD4A7] transition-colors shrink-0">
                    Ver evolução →
                  </button>
                </div>
              )
            })() : (
              <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20, padding: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center text-2xl shrink-0">📏</div>
                <div>
                  <p className="text-white font-bold mb-1">Sem avaliações corporais</p>
                  <p className="text-zinc-500 text-sm">Registre peso, gordura e massa muscular para acompanhar a evolução</p>
                </div>
                <button onClick={() => setAbaAtiva('evolucao')} className="ml-auto text-sm text-white bg-white/[0.08] px-4 py-2 rounded-xl shrink-0 hover:bg-white/[0.12] transition-all">
                  Adicionar →
                </button>
              </div>
            )}

            {/* ── 3. DADOS DE HOJE — 3 colunas, números grandes ────────── */}
            <div>
              <p style={{ fontSize: 10, color: '#7A8290', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16, fontWeight: 700 }}>Dados de hoje</p>
              <div className="grid grid-cols-3 gap-4">

            {/* Recuperação */}
            <div style={{ background: 'rgba(45,212,167,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(45,212,167,0.18)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: '#2DD4A7', opacity: 0.07, filter: 'blur(20px)' }} />
              <p style={{ fontSize: 10, color: '#2DD4A7', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 16, fontWeight: 700 }}>Recuperação</p>
              {sonoHoje?.score_recuperacao != null ? (
                <>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className={`text-5xl font-black leading-none tracking-tight ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {sonoHoje.score_recuperacao}
                    </span>
                    <span className="text-zinc-600 text-xl">/100</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full ${sonoHoje.score_recuperacao >= 70 ? 'bg-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${sonoHoje.score_recuperacao}%` }} />
                  </div>
                  <p className={`text-sm font-medium ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {sonoHoje.score_recuperacao >= 85 ? 'Excelente' : sonoHoje.score_recuperacao >= 70 ? 'Boa' : sonoHoje.score_recuperacao >= 55 ? 'Moderada' : 'Baixa'}
                  </p>
                  {sonoHoje.duracao_minutos && <p className="text-zinc-600 text-xs mt-0.5">{Math.round(sonoHoje.duracao_minutos / 60 * 10) / 10}h de sono</p>}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-5xl font-black text-zinc-700 leading-none">–</p>
                  <p className="text-zinc-600 text-sm mt-3">Sem registro hoje</p>
                </div>
              )}
            </div>

            {/* Treino hoje */}
            <div style={{ background: 'rgba(255,90,54,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,90,54,0.18)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: '#FF5A36', opacity: 0.07, filter: 'blur(20px)' }} />
              <p style={{ fontSize: 10, color: '#FF8A3D', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 16, fontWeight: 700 }}>Treino hoje</p>
              {treinoHoje ? (
                <>
                  <p className="text-5xl font-black text-emerald-400 leading-none mb-3">✓</p>
                  <p className="text-white text-sm font-semibold">Plano {treinoHoje.plano}</p>
                  <p className="text-emerald-400/70 text-xs mt-0.5">Treino concluído</p>
                  {treinoHoje.calorias_estimadas != null && treinoHoje.calorias_estimadas > 0 && (
                    <p className="text-orange-400 text-2xl font-black mt-3 leading-none">{treinoHoje.calorias_estimadas}<span className="text-zinc-600 text-xs font-normal ml-1">kcal</span></p>
                  )}
                </>
              ) : atividadesHoje.length > 0 ? (
                <>
                  <p className="text-5xl font-black text-emerald-400 leading-none mb-3">✓</p>
                  <p className="text-white text-sm font-semibold capitalize">{atividadesHoje[0].modalidade}{atividadesHoje.length > 1 ? ` +${atividadesHoje.length - 1}` : ''}</p>
                  <p className="text-emerald-400/70 text-xs mt-0.5">Strava · {atividadesHoje.reduce((s, a) => s + (a.duracao_min ?? 0), 0)}min</p>
                  {(() => { const cal = atividadesHoje.reduce((s, a) => s + (a.calorias_wearable ?? 0), 0); return cal > 0 ? <p className="text-orange-400 text-2xl font-black mt-3 leading-none">{cal}<span className="text-zinc-600 text-xs font-normal ml-1">kcal</span></p> : null })()}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-5xl font-black text-zinc-700 leading-none">–</p>
                  <p className="text-zinc-600 text-sm mt-3">Sem treino hoje</p>
                  <p className="text-zinc-700 text-xs mt-0.5">{treinos7dDatas.length > 0 ? `${treinos7dDatas.length} treinos essa semana` : 'Nenhum treino essa semana'}</p>
                </div>
              )}
            </div>

            {/* Bem-estar */}
            <div style={{ background: 'rgba(96,165,250,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: '#60A5FA', opacity: 0.07, filter: 'blur(20px)' }} />
              <p style={{ fontSize: 10, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 16, fontWeight: 700 }}>Bem-estar</p>
              {bemEstar ? (
                <>
                  {(() => {
                    const metricas = [{l:'Humor',v:bemEstar.humor},{l:'Energia',v:bemEstar.energia},{l:'Qualidade sono',v:bemEstar.qualidade_sono}]
                    const valores = metricas.map(m => m.v).filter((v): v is number => v != null)
                    const media = valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length * 10) / 10 : null
                    return (
                      <>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className={`text-5xl font-black leading-none tracking-tight ${media == null ? 'text-zinc-600' : media >= 4 ? 'text-emerald-400' : media >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>{media ?? '–'}</span>
                          <span className="text-zinc-600 text-xl">/5</span>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {metricas.map(({l,v}) => (
                            <div key={l} className="flex items-center gap-2">
                              <p className="text-zinc-600 text-xs w-16 shrink-0">{l}</p>
                              <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${v == null ? '' : v>=4?'bg-emerald-400':v>=3?'bg-yellow-400':'bg-red-400'}`} style={{width:`${v == null ? 0 : v/5*100}%`}}/>
                              </div>
                              <span className="text-zinc-500 text-xs w-5 text-right">{v ?? '–'}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-5xl font-black text-zinc-700 leading-none">–</p>
                  <p className="text-zinc-600 text-sm mt-3">Sem registro hoje</p>
                </div>
              )}
            </div>

              </div>{/* end grid cols-3 */}
            </div>{/* end dados de hoje */}

            {/* ── 4. BRIEFING PRÉ-CONSULTA ─────────────────────────────── */}
            {gerandoBriefing && !briefingEstruturado ? (
              <div className="rounded-2xl p-6 animate-pulse" style={{ background: '#0b1610', border: '1px solid rgba(16,185,129,0.10)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 animate-ping" />
                  <p className="text-[11px] text-emerald-500/50 uppercase tracking-[0.2em]">Gerando briefing clínico...</p>
                </div>
                <div className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-white/[0.05] rounded-full w-full" />
                  <div className="h-3.5 bg-white/[0.05] rounded-full w-4/5" />
                  <div className="h-3.5 bg-white/[0.05] rounded-full w-3/5 mt-3" />
                </div>
              </div>
            ) : briefingEstruturado ? (
              <div style={{ background: 'rgba(45,212,167,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(45,212,167,0.15)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="px-6 pt-5 pb-4 border-b border-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-emerald-500/60 uppercase tracking-[0.25em] flex items-center gap-1.5"><span>✦</span> Briefing pré-consulta</p>
                    <div className="flex items-center gap-3">
                      <button onClick={gerarBriefing} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">↻ Regen</button>
                      <button onClick={() => setAbaAtiva('ia')} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">Ver completo →</button>
                    </div>
                  </div>
                  <p className="text-zinc-200 text-[15px] leading-relaxed mt-3">{briefingEstruturado.resumo}</p>
                </div>
                {briefingEstruturado.alertas?.filter(Boolean).length > 0 && (
                  <div className="px-6 py-3 flex flex-wrap gap-2">
                    {briefingEstruturado.alertas.filter(Boolean).map((a, i) => (
                      <span key={i} className="text-[12px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1">⚠ {a}</span>
                    ))}
                  </div>
                )}
                {briefingEstruturado.recomendacoes?.filter(Boolean).length > 0 && (
                  <div className="px-6 pb-4 pt-1 flex flex-wrap gap-2">
                    {briefingEstruturado.recomendacoes.filter(Boolean).slice(0, 2).map((r, i) => (
                      <span key={i} className="text-[12px] text-emerald-400/80 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-1">→ {r}</span>
                    ))}
                  </div>
                )}
                {briefingGeradoEm && (
                  <p className="px-6 pb-4 text-[11px] text-zinc-600">{formatarGeradoEm(briefingGeradoEm)}</p>
                )}
              </div>
            ) : (
              <button onClick={gerarBriefing}
                className="w-full rounded-2xl p-5 flex items-center gap-4 text-left transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: '#0b1610', border: '1px solid rgba(16,185,129,0.10)' }}>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-lg">✦</div>
                <div>
                  <p className="text-white text-sm font-bold">Preparar briefing pré-consulta</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Análise clínica dos últimos 7 dias — gere antes de cada consulta</p>
                </div>
                <span className="text-emerald-500/40 ml-auto">→</span>
              </button>
            )}

          </div>
        )}

        {/* ── ABA PLANO ────────────────────────────────────────────────── */}
        {abaAtiva === 'plano' && (
          <div className="space-y-4">

            {/* Histórico de metas nutricionais */}
            {historicoMetas.length >= 2 && !editandoPlano && (() => {
              const comCal = historicoMetas.filter(m => m.calorias_meta)
              const comProt = historicoMetas.filter(m => m.proteina_meta)
              if (comCal.length < 2) return null
              const W = 200, H = 40
              function linha(pts: MetaHistorico[], key: 'calorias_meta' | 'proteina_meta', cor: string) {
                const vals = pts.map(m => m[key] as number)
                const maxV = Math.max(...vals), minV = Math.min(...vals), range = maxV - minV || 1
                const xStep = W / Math.max(pts.length - 1, 1)
                const toY = (v: number) => H - 4 - ((v - minV) / range) * (H - 8)
                const d = vals.map((v, j) => `${j === 0 ? 'M' : 'L'}${(j * xStep).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
                return <path key={key} d={d} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              }
              const primeiro = comCal[0], ultimo = comCal[comCal.length - 1]
              const deltaCal = (ultimo.calorias_meta ?? 0) - (primeiro.calorias_meta ?? 0)
              return (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <div className="px-5 py-4 border-b border-white/[0.14] flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Evolução das metas nutricionais</p>
                    <p className="text-zinc-600 text-[9px]">{historicoMetas.length} planos</p>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-end gap-4 mb-3">
                      <div>
                        <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Atual</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-white text-xl font-black">{ultimo.calorias_meta?.toLocaleString('pt-BR')}</span>
                          <span className="text-zinc-500 text-[11px]">kcal</span>
                          {deltaCal !== 0 && <span className={`text-[10px] font-bold ${deltaCal > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{deltaCal > 0 ? '+' : ''}{deltaCal}</span>}
                        </div>
                      </div>
                      {ultimo.proteina_meta && (
                        <div>
                          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Proteína</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-blue-300 text-xl font-black">{ultimo.proteina_meta}</span>
                            <span className="text-zinc-500 text-[11px]">g</span>
                          </div>
                        </div>
                      )}
                      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="ml-auto shrink-0 overflow-visible">
                        {comCal.length >= 2 && linha(comCal, 'calorias_meta', '#f97316')}
                        {comProt.length >= 2 && linha(comProt, 'proteina_meta', '#60a5fa')}
                      </svg>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-zinc-600 text-[9px]">Calorias</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-zinc-600 text-[9px]">Proteína</span></div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── EDITOR MANUAL ───────────────────────────────────────── */}
            {editandoPlano ? (
              <>
                {/* Nota clínica */}
                <div className="rounded-2xl border border-green-500/20 px-4 py-3.5" style={{ background: '#0c1220' }}>
                  <p className="text-green-400 text-[9px] uppercase tracking-wider mb-2">Nota clínica</p>
                  <textarea value={notaEd} onChange={e => setNotaEd(e.target.value)}
                    placeholder="Orientação geral sobre o plano para o paciente..."
                    rows={2} className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-green-500/30 resize-none" />
                </div>

                {/* Refeições */}
                {refeicoesEd.map((ref, rIdx) => {
                  const vIdx = variacaoAtivaEditor[rIdx] ?? 0
                  const varAtiva = ref.variacoes[vIdx] ?? ref.variacoes[0]
                  const refCal = sumAl(varAtiva?.alimentos ?? [], 'calorias')
                  const refProt = sumAl(varAtiva?.alimentos ?? [], 'proteina')
                  return (
                    <div key={rIdx} className="rounded-2xl border border-white/[0.14] overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                      {/* header refeição */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.14]" style={{ background: '#1c1c1c' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{EMOJIS_REFEICAO[rIdx] ?? '🥗'}</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Refeição {rIdx + 1}</span>
                          {refCal > 0 && <span className="text-orange-400 text-[10px] font-bold">{refCal} kcal</span>}
                          {refProt > 0 && <span className="text-blue-400 text-[10px]">{refProt}g</span>}
                        </div>
                        {refeicoesEd.length > 1 && (
                          <button onClick={() => removeRefeicao(rIdx)} className="text-red-400/50 text-[10px] hover:text-red-400 transition-colors">✕ remover</button>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {/* nome + horário */}
                        <div className="grid grid-cols-3 gap-2">
                          <input value={ref.nome} onChange={e => updateRefeicao(rIdx, 'nome', e.target.value)}
                            placeholder="Ex: Café da Manhã"
                            className="col-span-2 bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20" />
                          <input value={ref.horario} onChange={e => updateRefeicao(rIdx, 'horario', e.target.value)}
                            placeholder="07:00"
                            className="bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 text-center" />
                        </div>

                        {/* tabs de variações */}
                        <div className="flex items-center gap-1 border-b border-white/[0.08] pb-1">
                          {ref.variacoes.map((v, vi) => (
                            <button key={vi}
                              onClick={() => setVariacaoAtivaEditor(p => ({ ...p, [rIdx]: vi }))}
                              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all ${vIdx === vi ? 'text-white border-[#2DD4A7]' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                              {v.nome || `Opção ${String.fromCharCode(65 + vi)}`}
                            </button>
                          ))}
                          {ref.variacoes.length < 3 && (
                            <button onClick={() => addVariacao(rIdx)}
                              className="ml-1 px-2 py-1 text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors rounded border border-dashed border-white/[0.1] hover:border-emerald-500/30">
                              + variação
                            </button>
                          )}
                          {vIdx > 0 && (
                            <button onClick={() => removeVariacao(rIdx, vIdx)}
                              className="ml-auto text-[10px] text-red-400/40 hover:text-red-400 transition-colors">
                              ✕ remover opção
                            </button>
                          )}
                        </div>

                        {/* conteúdo da variação ativa */}
                        {varAtiva && (
                          <div className="space-y-2">
                            <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimentos — {varAtiva.nome}</p>
                            {varAtiva.alimentos.map((al, aIdx) => (
                              <div key={aIdx} className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                  <AlimentoBusca
                                    value={al.nome}
                                    onChange={v => updateAlimento(rIdx, vIdx, aIdx, 'nome', v)}
                                    onSelect={taco => handleSelectTACO(rIdx, vIdx, aIdx, taco)}
                                    placeholder="Buscar alimento (TACO) ou digitar..."
                                    className="flex-1 bg-transparent text-white placeholder-zinc-600 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15"
                                  />
                                  {varAtiva.alimentos.length > 1 && (
                                    <button onClick={() => removeAlimento(rIdx, vIdx, aIdx)} className="text-zinc-700 hover:text-red-400 transition-colors text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-white/[0.14]">✕</button>
                                  )}
                                </div>
                                {al.kcal_100g != null && (
                                  <div className="flex items-center gap-2 px-1 flex-wrap">
                                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">✦ TACO</span>
                                    <span className="text-zinc-600 text-[9px]">{al.kcal_100g} kcal · {al.prot_100g}g prot · {al.carbo_100g}g carb <span className="text-zinc-700">por 100g</span></span>
                                  </div>
                                )}
                                <input value={al.quantidade} onChange={e => updateAlimento(rIdx, vIdx, aIdx, 'quantidade', e.target.value)}
                                  placeholder="Quantidade para exibir (ex: 2 ovos, 1 copo, 100g)"
                                  className="w-full bg-transparent text-white placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15" />
                                {al.kcal_100g != null && (
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <input type="number" value={al.gramas ?? ''} onChange={e => updateAlimento(rIdx, vIdx, aIdx, 'gramas', e.target.value)}
                                        placeholder="Gramas para calcular macros (ex: 120)"
                                        className="w-full bg-emerald-500/5 border border-emerald-500/20 text-white placeholder-zinc-600 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30" />
                                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">g</span>
                                    </div>
                                    {al.gramas && parseFloat(al.gramas) > 0 && (
                                      <div className="text-right shrink-0">
                                        <span className="text-orange-400 text-[11px] font-bold">{Math.round(al.kcal_100g * parseFloat(al.gramas) / 100)} kcal</span>
                                        <span className="text-zinc-600 text-[11px] mx-1">·</span>
                                        <span className="text-blue-400 text-[11px]">{((al.prot_100g ?? 0) * parseFloat(al.gramas) / 100).toFixed(1)}g</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="relative">
                                    <input type="number" value={al.calorias} onChange={e => updateAlimento(rIdx, vIdx, aIdx, 'calorias', e.target.value)}
                                      placeholder="0"
                                      className="w-full bg-transparent text-orange-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500/20 pr-12" />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">kcal</span>
                                  </div>
                                  <div className="relative">
                                    <input type="number" value={al.proteina} onChange={e => updateAlimento(rIdx, vIdx, aIdx, 'proteina', e.target.value)}
                                      placeholder="0"
                                      className="w-full bg-transparent text-blue-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 pr-10" />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">g prot</span>
                                  </div>
                                </div>

                                {/* Substituições */}
                                <div className="pt-1">
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => toggleSubstituicoes(rIdx, vIdx, aIdx)}
                                      className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                                      <span>{substAbertas[chaveAlimento(rIdx, vIdx, aIdx)] ? '− substituição' : '+ substituição'}</span>
                                      {(al.substituicoes?.length ?? 0) > 0 && (
                                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 text-[9px]">{al.substituicoes!.length}</span>
                                      )}
                                    </button>
                                    {al.nome && (
                                      <button onClick={() => sugerirSubstituicoes(rIdx, vIdx, aIdx)}
                                        disabled={sugestoesPorAlimento[chaveAlimento(rIdx, vIdx, aIdx)]?.carregando}
                                        className="text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors flex items-center gap-1 disabled:opacity-40">
                                        <Sparkles size={11} />
                                        {sugestoesPorAlimento[chaveAlimento(rIdx, vIdx, aIdx)]?.carregando ? 'Gerando sugestões…' : 'Sugerir substituições'}
                                      </button>
                                    )}
                                  </div>
                                  {substAbertas[chaveAlimento(rIdx, vIdx, aIdx)] && (
                                    <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-white/[0.08]">
                                      {(al.substituicoes ?? []).map((s, sIdx) => (
                                        <div key={sIdx} className="flex items-center gap-1.5">
                                          <span className="text-zinc-600 text-[10px] shrink-0">ou</span>
                                          <input value={s.nome} onChange={e => updateSubstituicao(rIdx, vIdx, aIdx, sIdx, 'nome', e.target.value)}
                                            placeholder="Alimento substituto"
                                            className="flex-1 min-w-0 bg-white/[0.04] text-white placeholder-zinc-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-white/15" />
                                          <input value={s.quantidade} onChange={e => updateSubstituicao(rIdx, vIdx, aIdx, sIdx, 'quantidade', e.target.value)}
                                            placeholder="qtd (ex: 250g)"
                                            className="w-28 shrink-0 bg-white/[0.04] text-white placeholder-zinc-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-white/15" />
                                          <button onClick={() => removeSubstituicao(rIdx, vIdx, aIdx, sIdx)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs shrink-0 w-6 h-6 flex items-center justify-center rounded-lg border border-white/[0.1]">✕</button>
                                        </div>
                                      ))}
                                      <button onClick={() => addSubstituicao(rIdx, vIdx, aIdx)}
                                        className="text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors">
                                        + adicionar substituto
                                      </button>
                                    </div>
                                  )}

                                  {/* Sugestões da IA — pendentes de aprovação */}
                                  {(() => {
                                    const sug = sugestoesPorAlimento[chaveAlimento(rIdx, vIdx, aIdx)]
                                    if (!sug || sug.carregando) return null
                                    if (sug.erro) return (
                                      <p className="mt-2 text-red-400/80 text-[10px]">{sug.erro}</p>
                                    )
                                    if (sug.itens.length === 0) return null
                                    return (
                                      <div className="mt-2 rounded-xl p-3 space-y-2" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)' }}>
                                        <p className="text-blue-300/80 text-[9.5px] leading-relaxed">⚠ Sugestões baseadas em equivalência calórica e proteica. Revise antes de salvar.</p>
                                        <div className="space-y-1.5">
                                          {sug.itens.map((item, sgIdx) => (
                                            <label key={sgIdx} className="flex items-start gap-2.5 cursor-pointer">
                                              <input type="checkbox" checked={sug.selecionados[sgIdx] ?? false}
                                                onChange={() => toggleSugestaoSelecionada(rIdx, vIdx, aIdx, sgIdx)}
                                                className="mt-0.5 accent-emerald-500 w-3.5 h-3.5" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-white text-xs font-medium leading-snug">{item.nome}{item.quantidade ? <span className="text-zinc-500 font-normal"> — {item.quantidade}</span> : null}</p>
                                                <p className="text-zinc-500 text-[10px]">{item.calorias} kcal · {item.proteina}g prot</p>
                                              </div>
                                            </label>
                                          ))}
                                        </div>
                                        <div className="flex items-center gap-3 pt-0.5">
                                          <button onClick={() => aprovarSugestoes(rIdx, vIdx, aIdx)}
                                            disabled={!sug.selecionados.some(Boolean)}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-30">
                                            ✓ Adicionar selecionados
                                          </button>
                                          <button onClick={() => descartarSugestoes(rIdx, vIdx, aIdx)}
                                            className="text-zinc-600 hover:text-zinc-400 text-[10px] transition-colors">
                                            descartar
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                </div>
                              </div>
                            ))}
                            <button onClick={() => addAlimento(rIdx, vIdx)}
                              className="w-full py-2 rounded-xl border border-dashed border-white/[0.14] text-zinc-600 text-xs hover:border-white/20 hover:text-zinc-400 transition-all active:scale-95">
                              + adicionar alimento
                            </button>
                            <input value={varAtiva.dica} onChange={e => updateVariacaoDica(rIdx, vIdx, e.target.value)}
                              placeholder="💡 Dica para o paciente (opcional)"
                              className="w-full bg-white/[0.02] text-zinc-400 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/10 border border-white/[0.14]" />
                            {refCal > 0 && (
                              <div className="flex items-center gap-3 pt-1 border-t border-white/[0.14]">
                                <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Total {varAtiva.nome}</span>
                                <span className="text-orange-400 text-xs font-bold">{refCal} kcal</span>
                                <span className="text-blue-400 text-xs font-bold">{refProt}g prot</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <button onClick={addRefeicao}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/[0.1] text-zinc-500 text-sm hover:border-white/20 hover:text-zinc-300 transition-all active:scale-95">
                  + Adicionar refeição
                </button>

                {/* total do dia */}
                {totalEdCal > 0 && (
                  <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: '#141414' }}>
                    <div>
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Total do dia</p>
                      <div className="flex items-center gap-4">
                        <span className="text-orange-400 font-black text-base">{totalEdCal} <span className="text-xs font-normal">kcal</span></span>
                        <span className="text-blue-400 font-black text-base">{totalEdProt}<span className="text-xs font-normal">g prot</span></span>
                      </div>
                    </div>
                    {metaCal && (
                      <div className="text-right">
                        <p className="text-zinc-700 text-[9px]">Meta: {metaCal}kcal</p>
                        <p className={`text-[10px] font-semibold ${Math.abs(totalEdCal - metaCal) <= metaCal*0.1 ? 'text-green-400' : totalEdCal < metaCal ? 'text-yellow-400' : 'text-orange-400'}`}>
                          {totalEdCal < metaCal ? `−${metaCal - totalEdCal}` : `+${totalEdCal - metaCal}`} kcal
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Seções extras opcionais */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Orientações complementares (opcional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="number" value={extrasEd.hidratacaoLitros} onChange={e => setExtrasEd(p => ({ ...p, hidratacaoLitros: e.target.value }))}
                        placeholder="2.5" className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">L/dia</span>
                    </div>
                    <input value={extrasEd.hidratacaoOri} onChange={e => setExtrasEd(p => ({ ...p, hidratacaoOri: e.target.value }))}
                      placeholder="💧 Orientação de hidratação"
                      className="bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                  </div>
                  <input value={extrasEd.oriTreino} onChange={e => setExtrasEd(p => ({ ...p, oriTreino: e.target.value }))}
                    placeholder="⚡ Orientação pré/pós-treino"
                    className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                  <input value={extrasEd.estrategia} onChange={e => setExtrasEd(p => ({ ...p, estrategia: e.target.value }))}
                    placeholder="🎯 Estratégia para o desafio principal"
                    className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                  <input value={extrasEd.dicaFome} onChange={e => setExtrasEd(p => ({ ...p, dicaFome: e.target.value }))}
                    placeholder="💡 Dica de controle de fome"
                    className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditandoPlano(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-white/[0.14] text-zinc-400 text-sm font-semibold active:scale-95 transition-all">
                    Cancelar
                  </button>
                  <button onClick={salvarEdicao} disabled={salvandoEd || refeicoesEd.length === 0}
                    className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-40">
                    {salvandoEd ? 'Salvando...' : 'Salvar plano'}
                  </button>
                </div>
              </>

            ) : gerandoPlano ? (
              <div className="rounded-2xl border border-green-500/20 p-6" style={{ background: '#0c1220' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div>
                    <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-semibold">Gerando plano</p>
                    <p className="text-white font-bold">Montando dieta personalizada...</p>
                  </div>
                </div>
                {['Analisando perfil e objetivos','Calculando distribuição calórica','Selecionando alimentos e quantidades','Montando refeições e macros'].map((msg, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin shrink-0" style={{ animationDelay: `${i * 0.15}s` }} />
                    <p className="text-zinc-500 text-sm">{msg}</p>
                  </div>
                ))}
              </div>

            ) : planoAtivo && planoEstruturado ? (
              <>
                {/* header plano ativo */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <div className="px-5 py-4 border-b border-white/[0.14] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-green-400 font-semibold">✦ Plano Alimentar</span>
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Ativo</span>
                      </div>
                      <p className="text-zinc-600 text-[10px]">Criado em {new Date(planoAtivo.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => iniciarEdicao(false)} className="text-[10px] text-zinc-400 border border-white/[0.1] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✏️ Editar</button>
                      <button onClick={() => setConfirmandoIA(true)} className="text-[10px] text-zinc-500 border border-white/[0.14] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✦ IA</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                    {[
                      { label: 'Kcal/dia', val: planoAtivo.calorias_meta ?? '—' },
                      { label: 'Proteína', val: planoAtivo.proteina_meta ? `${planoAtivo.proteina_meta}g` : '—' },
                      { label: 'Refeições', val: planoEstruturado.refeicoes.length },
                    ].map((m, i) => (
                      <div key={i} className="py-3 text-center">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">{m.label}</p>
                        <p className="text-white text-base font-bold">{m.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {planoEstruturado.nota_nutri && (
                  <div className="rounded-2xl px-5 py-4 max-w-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Nota clínica</p>
                    <p className="text-zinc-200 text-sm leading-relaxed" style={{ maxWidth: '65ch' }}>{planoEstruturado.nota_nutri}</p>
                  </div>
                )}

                {/* refeições com alimentos */}
                <div className="space-y-2">
                  {planoEstruturado.refeicoes.map((ref: any, i: number) => (
                    <RefeicaoCard key={i} ref={ref} idx={i} />
                  ))}
                </div>

                {/* Seções extras do plano */}
                {planoEstruturado.hidratacao && (
                  <PlanoExtra
                    icon="💧" titulo="Hidratação personalizada"
                    subtitulo={`${planoEstruturado.hidratacao.litros_dia}L por dia · baseado no seu peso e treino`}
                    conteudo={planoEstruturado.hidratacao.orientacao}
                    cor="blue"
                  />
                )}
                {planoEstruturado.orientacao_treino && (
                  <PlanoExtra
                    icon="⚡" titulo="Orientação de treino"
                    subtitulo="Pré e pós-treino com alimentos"
                    conteudo={planoEstruturado.orientacao_treino}
                    cor="yellow"
                  />
                )}
                {planoEstruturado.estrategia_desafio && (
                  <PlanoExtra
                    icon="🎯" titulo="Estratégia para o desafio"
                    subtitulo="Como superar o maior obstáculo"
                    conteudo={planoEstruturado.estrategia_desafio}
                    cor="orange"
                  />
                )}
                {planoEstruturado.dica_fome && (
                  <PlanoExtra
                    icon="💡" titulo="Controle de fome"
                    subtitulo="Estratégia para o período crítico"
                    conteudo={planoEstruturado.dica_fome}
                    cor="green"
                  />
                )}
              </>

            ) : (
              <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,90,54,0.15)', borderRadius: 20, padding: 24, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,90,54,0.10)', border: '1px solid rgba(255,90,54,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>🥗</div>
                <p style={{ color: '#FF8A3D', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8 }}>Plano alimentar</p>
                <p style={{ color: '#F5F6F8', fontWeight: 900, fontSize: 20, marginBottom: 8, fontFamily: "'Sora', system-ui" }}>Criar dieta personalizada</p>
                <p style={{ color: '#9AA0AD', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>Monte manualmente com alimentos e gramas, use um modelo pronto como ponto de partida, ou deixe a IA gerar um plano completo.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => iniciarEdicao(true)} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.14)', color: '#9AA0AD', fontWeight: 700, padding: '14px 0', borderRadius: 16, fontSize: 13, background: 'transparent', cursor: 'pointer', transition: 'all 150ms' }}>✏️ Manual</button>
                  <button onClick={abrirBibliotecaModelos} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.14)', color: '#9AA0AD', fontWeight: 700, padding: '14px 0', borderRadius: 16, fontSize: 13, background: 'transparent', cursor: 'pointer', transition: 'all 150ms' }}>📋 Modelo</button>
                  <button onClick={() => setConfirmandoIA(true)} style={{ flex: 1, background: 'linear-gradient(135deg, #FF5A36, #FF8A3D)', color: '#fff', fontWeight: 700, padding: '14px 0', borderRadius: 16, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(255,90,54,0.35)' }}>✦ Gerar IA</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA TREINO ────────────────────────────────────────────── */}
        {abaAtiva === 'treino' && (() => {
          const AJUSTE_FASE: Record<string, { pct: number; label: string }> = {
            hipertrofia: { pct: 0.10, label: 'Superávit para hipertrofia' },
            adaptacao: { pct: 0.05, label: 'Leve superávit para adaptação' }, adaptação: { pct: 0.05, label: 'Leve superávit para adaptação' },
            forca: { pct: 0.05, label: 'Leve superávit para força' }, força: { pct: 0.05, label: 'Leve superávit para força' },
            deload: { pct: -0.08, label: 'Reduzir no deload' },
            potencia: { pct: 0.07, label: 'Combustível para potência' },
            resistencia: { pct: 0.05, label: 'Suporte energético' },
          }
          const tipoFase = periodizacaoFase?.tipo_bloco?.toLowerCase() ?? ''
          const ajuste = AJUSTE_FASE[tipoFase]
          const caloriasBase = planoAtivo?.calorias_meta
          const caloriasAjustadas = caloriasBase && ajuste ? Math.round(caloriasBase * (1 + ajuste.pct)) : null
          const pct = periodizacaoFase ? (periodizacaoFase.semana_bloco / periodizacaoFase.total_semanas_bloco) * 100 : 0
          // Semana calendário dom→sab (alinhada com getDay() == 0 para domingo)
          const dBase = new Date(hoje + 'T12:00:00-03:00')
          const currStart = new Date(dBase); currStart.setDate(dBase.getDate() - dBase.getDay())
          const currEnd   = new Date(dBase); currEnd.setDate(dBase.getDate() - dBase.getDay() + 6)
          const prevStart = new Date(dBase); prevStart.setDate(dBase.getDate() - dBase.getDay() - 7)
          const prevEnd   = new Date(dBase); prevEnd.setDate(dBase.getDate() - dBase.getDay() - 1)
          const q7CurrStr = currStart.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
          const q7CurrEndStr = currEnd.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
          const q14CurrStr = prevStart.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
          const q14CurrEndStr = prevEnd.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

          const calSemTotal = [
            ...historicoTreinosDetalhado.filter(t => t.data >= q7CurrStr && t.data <= q7CurrEndStr).map(t => t.calorias ?? 0),
            ...atividadesLivres21d.filter(a => a.data >= q7CurrStr && a.data <= q7CurrEndStr).map(a => a.calorias_wearable ?? a.calorias_estimadas ?? 0)
          ].reduce((acc, v) => acc + v, 0)
          const scoreMedia = recuperacao7d.length ? Math.round(recuperacao7d.filter(r => r.score != null).reduce((a, r) => a + (r.score ?? 0), 0) / recuperacao7d.filter(r => r.score != null).length) : null

          const treinosCurr = historicoTreinosDetalhado.filter(t => t.data >= q7CurrStr && t.data <= q7CurrEndStr)
          const treinosPrev = historicoTreinosDetalhado.filter(t => t.data >= q14CurrStr && t.data <= q14CurrEndStr)
          const ativsCurr = atividadesLivres21d.filter(a => a.data >= q7CurrStr && a.data <= q7CurrEndStr)
          const ativsPrev = atividadesLivres21d.filter(a => a.data >= q14CurrStr && a.data <= q14CurrEndStr)

          const semSessoes = treinosCurr.length + ativsCurr.length
          const prevSessoes = treinosPrev.length + ativsPrev.length
          const semKcal = treinosCurr.reduce((s, t) => s + (t.calorias ?? 0), 0) + ativsCurr.reduce((s, a) => s + (a.calorias_wearable ?? a.calorias_estimadas ?? 0), 0)
          const prevKcal = treinosPrev.reduce((s, t) => s + (t.calorias ?? 0), 0) + ativsPrev.reduce((s, a) => s + (a.calorias_wearable ?? a.calorias_estimadas ?? 0), 0)
          const semMin = ativsCurr.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosCurr.length * 60
          const prevMin = ativsPrev.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosPrev.length * 60
          const semHoras = semMin / 60
          const prevHoras = prevMin / 60
          const prevRecupArr = recuperacaoPrev7d.filter(r => r.score != null).map(r => r.score!)
          const prevScoreMedia = prevRecupArr.length ? Math.round(prevRecupArr.reduce((a, b) => a + b, 0) / prevRecupArr.length) : null
          const semDelta = (curr: number | null, prev: number | null): number | null => {
            if (prev === null || prev === 0 || curr === null) return null
            return Math.round(((curr - prev) / prev) * 100)
          }

          return (
          <div className="space-y-5">
            {/* ── 1. PERSONAL TRAINER + PERIODIZAÇÃO ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
              <div className="px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] mb-0.5">Personal Trainer</p>
                    <p className="text-white font-bold text-base">{personalNome ?? 'Não vinculado'}</p>
                  </div>
                  {paciente?.nivel && (
                    <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">Nível: {paciente.nivel}</span>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 space-y-4">
                {periodizacaoFase ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white text-lg font-black">{periodizacaoFase.nome_bloco}</p>
                        <p className="text-zinc-500 text-sm">Semana {periodizacaoFase.semana_bloco} de {periodizacaoFase.total_semanas_bloco}</p>
                      </div>
                      <span className="text-[#2DD4A7] text-2xl font-black">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#2DD4A7' }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">Sem periodização ativa</p>
                )}


                {/* Ajuste calórico */}
                {ajuste && caloriasBase && (
                  <div className="rounded-xl px-4 py-3 border border-emerald-500/20" style={{ background: 'rgba(45,212,167,0.05)' }}>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Ajuste calórico sugerido · {periodizacaoFase?.nome_bloco}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[#2DD4A7] text-2xl font-black">{caloriasAjustadas?.toLocaleString('pt-BR')} kcal</span>
                      <span className="text-zinc-500 text-sm">({ajuste.pct > 0 ? '+' : ''}{Math.round(ajuste.pct * 100)}%)</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-0.5">{ajuste.label}</p>
                  </div>
                )}

                {proximaFase && diasAteProximaFase !== null && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-zinc-400 text-sm">Próxima fase:</span>
                    <span className="text-[#2DD4A7] font-semibold text-sm">{proximaFase} <span className="text-zinc-600 font-normal">em {diasAteProximaFase}d</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. TENDÊNCIA DE RECUPERAÇÃO ── */}
            {recuperacao7d.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                <div className="px-5 py-4 border-b border-white/[0.07]">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Recuperação — últimos 7 dias</p>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-end gap-2 h-14">
                    {recuperacao7d.map((r, i) => {
                      const score = r.score ?? 0
                      const h = Math.max(4, Math.round((score / 100) * 56))
                      const cor = score >= 70 ? '#2DD4A7' : score >= 50 ? '#F59E0B' : '#FB7185'
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-sm" style={{ height: `${h}px`, background: cor, opacity: 0.8 }} title={`${r.data}: ${score}/100`} />
                          <p className="text-zinc-700 text-[9px]">{r.data.slice(8,10)}/{r.data.slice(5,7)}</p>
                        </div>
                      )
                    })}
                  </div>
                  {scoreMedia && (
                    <p className="text-zinc-500 text-xs mt-3">
                      Média 7d: <span className={`font-semibold ${scoreMedia >= 70 ? 'text-emerald-400' : scoreMedia >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{scoreMedia}/100</span>
                      {scoreMedia < 60 && <span className="text-amber-400 ml-2">⚠ Baixa recuperação — considere ajustar calorias</span>}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── 3. RESUMO SEMANAL DE TREINO ── */}
            {!treinoCarregando && (() => {
              // Período "duas semanas atrás" (baseline para delta do bloco esquerdo)
              const antStart = new Date(dBase); antStart.setDate(dBase.getDate() - dBase.getDay() - 14)
              const antEnd   = new Date(dBase); antEnd.setDate(dBase.getDate() - dBase.getDay() - 8)
              const q21CurrStr    = antStart.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
              const q21CurrEndStr = antEnd.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

              // Duas semanas atrás
              const treinosAnt = historicoTreinosDetalhado.filter(t => t.data >= q21CurrStr && t.data <= q21CurrEndStr)
              const ativsAnt   = atividadesLivres21d.filter(a => a.data >= q21CurrStr && a.data <= q21CurrEndStr)
              const antSessoes = treinosAnt.length + ativsAnt.length
              const antKcal    = treinosAnt.reduce((s, t) => s + (t.calorias ?? 0), 0)
                               + ativsAnt.reduce((s, a) => s + (a.calorias_wearable ?? a.calorias_estimadas ?? 0), 0)
              const antMin     = ativsAnt.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosAnt.length * 60
              const antHoras   = antMin / 60

              // Semana atual — do domingo desta semana até hoje
              const treinosAtual = historicoTreinosDetalhado.filter(t => t.data >= q7CurrStr && t.data <= hoje)
              const ativsAtual   = atividadesLivres21d.filter(a => a.data >= q7CurrStr && a.data <= hoje)
              const atualSessoes = treinosAtual.length + ativsAtual.length
              const atualKcal    = treinosAtual.reduce((s, t) => s + (t.calorias ?? 0), 0)
                                 + ativsAtual.reduce((s, a) => s + (a.calorias_wearable ?? a.calorias_estimadas ?? 0), 0)
              const atualMin     = ativsAtual.reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosAtual.length * 60
              const atualHoras   = atualMin / 60
              const diasDecorridos = dBase.getDay() === 0 ? 7 : dBase.getDay()

              // Distribuição por modalidade — semana atual
              const modalMap: Record<string, { min: number; sessoes: number }> = {}
              if (treinosAtual.length > 0) modalMap['Musculação'] = { min: treinosAtual.length * 60, sessoes: treinosAtual.length }
              ativsAtual.forEach(a => {
                const m = a.modalidade ? (a.modalidade.charAt(0).toUpperCase() + a.modalidade.slice(1).toLowerCase()) : 'Outro'
                if (!modalMap[m]) modalMap[m] = { min: 0, sessoes: 0 }
                modalMap[m].min += a.duracao_min ?? 0
                modalMap[m].sessoes += 1
              })
              const totalMinModal = Object.values(modalMap).reduce((s, v) => s + v.min, 0)
              const modais = Object.entries(modalMap)
                .map(([nome, { min, sessoes }]) => ({
                  nome, sessoes,
                  horas: min >= 60 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}min` : ''}` : `${min}min`,
                  pct: totalMinModal > 0 ? Math.round(min / totalMinModal * 100) : 0,
                }))
                .sort((a, b) => b.pct - a.pct)

              if (prevSessoes === 0 && prevKcal === 0 && atualSessoes === 0 && atualKcal === 0) return null

              const fmtDate = (d: Date) =>
                d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

              const labelModalidade = (m: string) => ({
                'Natacao': 'Natação', 'Natação': 'Natação',
                'Musculacao': 'Musculação', 'Musculação': 'Musculação',
              } as Record<string, string>)[m] ?? m

              return (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <div className="px-5 py-3.5 border-b border-white/[0.07]">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Resumo semanal de treino</p>
                  </div>

                  {/* Mobile: col-reverse (atual em cima) — Desktop: row */}
                  <div className="flex flex-col-reverse md:flex-row">

                    {/* BLOCO ESQUERDO — Semana passada + deltas vs duas semanas atrás */}
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
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Kcal gastas</p>
                          <div className="flex items-center leading-none">
                            <span className="text-2xl font-black text-orange-300">{prevKcal > 0 ? prevKcal.toLocaleString('pt-BR') : '—'}</span>
                            {prevKcal > 0 && (() => {
                              const d = semDelta(prevKcal, antKcal)
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
                      </div>
                    </div>

                    {/* BLOCO DIREITO — Semana atual + barra de progresso (sem deltas) */}
                    <div className="flex-1 p-5 border-b md:border-b-0 border-white/[0.07]">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Semana atual</p>
                      <p className="text-zinc-500 text-[11px] mb-4">{fmtDate(currStart)} – hoje</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Sessões</p>
                          <p className="text-2xl font-black text-white leading-none">{atualSessoes > 0 ? atualSessoes : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Kcal gastas</p>
                          <p className="text-2xl font-black text-orange-300 leading-none">{atualKcal > 0 ? atualKcal.toLocaleString('pt-BR') : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Horas de treino</p>
                          <p className="text-2xl font-black text-white leading-none">{atualHoras > 0 ? atualHoras.toFixed(1) : '—'}</p>
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

                  {/* Distribuição por modalidade — semana atual */}
                  {modais.length > 0 && (
                    <div className="border-t border-white/[0.07] px-5 pt-4 pb-5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Distribuição por modalidade · por tempo de atividade</p>
                      <div className="space-y-2.5">
                        {modais.map(m => (
                          <div key={m.nome}>
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-zinc-300 text-xs w-24 shrink-0 truncate font-medium">{labelModalidade(m.nome)}</p>
                              <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#2DD4A7] transition-all" style={{ width: `${m.pct}%` }} />
                              </div>
                              <p className="text-zinc-400 text-xs w-8 text-right shrink-0 font-semibold">{m.pct}%</p>
                            </div>
                            <p className="text-zinc-600 text-[10px] pl-[6.5rem]">{m.horas} · {m.sessoes} sessão{m.sessoes !== 1 ? 'ões' : ''}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── 4. HISTÓRICO DE TREINOS (30 dias) ── */}
            {treinoCarregando ? (
              <div className="rounded-2xl p-8 flex items-center justify-center gap-3" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-500 text-sm">Carregando histórico...</p>
              </div>
            ) : (
              <>
                {/* ── TREINOS DE MUSCULAÇÃO ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Treinos de musculação — 30 dias</p>
                    <span className="text-zinc-600 text-xs">{historicoTreinosDetalhado.length > 0 ? `${historicoTreinosDetalhado.length} sessões` : 'sem registros'}</span>
                  </div>
                  {historicoTreinosDetalhado.length > 0 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {historicoTreinosDetalhado.slice(0, 10).map(t => (
                        <div key={t.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-zinc-500 bg-white/[0.05] border border-white/[0.07] rounded-md px-2 py-0.5">
                                  {new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                                {t.plano && (
                                  <span className="text-[10px] font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.06] rounded-md px-1.5 py-0.5">
                                    Plano {t.plano}
                                  </span>
                                )}
                              </div>
                              <p className="text-white text-sm font-semibold">{t.nome}</p>
                              {t.exercicios.length > 0 && (
                                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{t.exercicios.join(' · ')}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {t.calorias && t.calorias > 0 && (
                                <p className="text-orange-300 text-sm font-bold">{t.calorias} <span className="text-zinc-600 text-xs font-normal">kcal</span></p>
                              )}
                              {t.volume > 0 && (
                                <p className="text-zinc-500 text-xs mt-0.5">{t.volume >= 1000 ? `${(t.volume/1000).toFixed(1)}t` : `${t.volume}kg`} vol.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <p className="text-zinc-500 text-sm">Nenhum treino de musculação nos últimos 30 dias</p>
                    </div>
                  )}
                </div>

                {/* ── ATIVIDADES LIVRES ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Atividades livres — 30 dias</p>
                      <span className="text-zinc-600 text-xs">{atividadesLivres21d.length > 0 ? `${atividadesLivres21d.length} atividades` : 'sem registros'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {backfillMsg && <span className="text-[10px] text-emerald-400">{backfillMsg}</span>}
                      <button onClick={sincronizarStrava} disabled={backfillando}
                        className="flex items-center gap-1.5 text-[10px] text-blue-300 border border-blue-500/25 bg-blue-500/8 rounded-lg px-2.5 py-1.5 hover:border-blue-500/40 transition-all active:scale-95 disabled:opacity-50">
                        {backfillando
                          ? <><div className="w-2.5 h-2.5 border border-blue-300 border-t-transparent rounded-full animate-spin" /> Sincronizando...</>
                          : <>↑ Sincronizar Strava</>
                        }
                      </button>
                    </div>
                  </div>
                  {atividadesLivres21d.length > 0 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {atividadesLivres21d.slice(0, 20).map(a => (
                        <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-zinc-500 bg-white/[0.05] border border-white/[0.07] rounded-md px-2 py-0.5">
                                {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                              {a.intensidade && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                                  a.intensidade >= 4 ? 'text-red-300 bg-red-500/10 border-red-500/20' :
                                  a.intensidade >= 3 ? 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' :
                                  'text-zinc-400 bg-white/[0.04] border-white/[0.07]'
                                }`}>Int. {a.intensidade}/5</span>
                              )}
                            </div>
                            <p className="text-white text-sm font-semibold capitalize">{a.modalidade}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">
                              {a.duracao_min} min{a.distancia_km ? ` · ${a.distancia_km} km` : ''}
                            </p>
                          </div>
                          {(() => {
                            const kcal = a.calorias_wearable ?? a.calorias_estimadas
                            if (!kcal) return null
                            return (
                              <p className="text-orange-300 text-sm font-bold shrink-0">
                                {a.calorias_wearable ? '~' : ''}{kcal} <span className="text-zinc-600 text-xs font-normal">kcal</span>
                              </p>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <p className="text-zinc-500 text-sm">Nenhuma atividade livre registrada nos últimos 30 dias</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          )
        })()}

        {/* ── ABA IA CLÍNICA ─────────────────────────────────────────── */}
        {abaAtiva === 'ia' && (
          <div className="space-y-5">
            {/* Header + Gerar */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-xl">IA Clínica</h2>
                <p className="text-zinc-500 text-sm">Análise inteligente do paciente baseada em todos os dados disponíveis</p>
              </div>
              <button onClick={gerarBriefing} disabled={gerandoBriefing}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', background: 'linear-gradient(135deg, #FF5A36, #FF8A3D)', border: 'none', borderRadius: 14, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,90,54,0.35)', opacity: gerandoBriefing ? 0.6 : 1, transition: 'all 150ms' }}>
                {gerandoBriefing ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analisando...</>
                ) : briefingEstruturado ? '↻ Reanalisar' : '✦ Gerar análise'}
              </button>
            </div>

            {!briefingEstruturado && !briefingIA && (
              <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,90,54,0.12)', borderRadius: 20, padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,90,54,0.08)', border: '1px solid rgba(255,90,54,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>✦</div>
                <p style={{ color: '#F5F6F8', fontWeight: 800, fontSize: 18, marginBottom: 8, fontFamily: "'Sora', system-ui" }}>Análise Inteligente do Paciente</p>
                <p style={{ color: '#9AA0AD', fontSize: 13, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>A IA vai analisar composição corporal, plano alimentar, treinos, alertas clínicos e gerar insights acionáveis para a consulta.</p>
              </div>
            )}

            {briefingEstruturado ? (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Resumo */}
                <div className="md:col-span-2" style={{ background: 'rgba(255,90,54,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,90,54,0.15)', borderRadius: 20, padding: 24 }}>
                  <p style={{ color: '#FF8A3D', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>Situação atual</p>
                  <p className="text-white text-lg leading-relaxed">{briefingEstruturado.resumo}</p>
                </div>

                {/* Evolução */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                  <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><span>📈</span> Evolução recente</p>
                  <ul className="space-y-2">
                    {briefingEstruturado.evolucao.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                        <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Alertas */}
                <div style={{ background: 'rgba(245,181,68,0.05)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(245,181,68,0.18)', borderRadius: 20, padding: 20 }}>
                  <p className="text-amber-400/80 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><span>⚠</span> Pontos de atenção</p>
                  <ul className="space-y-2">
                    {briefingEstruturado.alertas.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                        <span className="text-amber-400 mt-0.5 shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recomendações */}
                <div className="md:col-span-2 rounded-2xl border border-blue-500/15 p-5" style={{ background: '#0a0f1a' }}>
                  <p className="text-blue-400/80 text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><span>💡</span> Recomendações para esta consulta</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    {briefingEstruturado.recomendacoes.map((rec, i) => (
                      <div key={i} className="rounded-xl border border-blue-500/10 bg-blue-500/5 px-4 py-3">
                        <span className="text-blue-300 text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : briefingIA ? (
              <div className="rounded-2xl border border-emerald-500/20 p-6" style={{ background: '#0a1510' }}>
                <p className="text-zinc-200 text-base leading-relaxed">{briefingIA}</p>
              </div>
            ) : null}

            {(briefingEstruturado || briefingIA) && briefingGeradoEm && (
              <p className="text-[11px] text-zinc-600 -mt-2">{formatarGeradoEm(briefingGeradoEm)} · análise é um snapshot, não tempo real</p>
            )}

            {/* Chat referência */}
            <div className="rounded-2xl border border-white/[0.07] p-5 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-lg">✦</div>
              <div>
                <p className="text-white text-sm font-semibold">Chat clínico disponível</p>
                <p className="text-zinc-500 text-xs mt-0.5">Use o botão <span className="text-[#2DD4A7]">✦</span> no canto inferior direito para perguntas específicas sobre {paciente?.nome?.split(' ')[0] ?? 'este paciente'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA ANAMNESE ─────────────────────────────────────────────── */}
        {abaAtiva === 'anamnese' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-xl">Anamnese</h2>
                <p className="text-zinc-500 text-sm">Histórico clínico e restrições do paciente</p>
              </div>
              <button onClick={() => router.push(`/anamnese/${clienteId}`)}
                className="text-sm text-zinc-300 rounded-xl px-4 py-2 hover:border-white/20 transition-all">
                ✏️ Editar anamnese
              </button>
            </div>

            {loadingAnamnese ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-[#2DD4A7] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !anamneseCompleta ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                <p className="text-3xl mb-3">📋</p>
                <p className="text-white font-semibold mb-1">Anamnese não preenchida</p>
                <p className="text-zinc-500 text-sm mb-4">Preencha a anamnese do paciente para registrar histórico clínico</p>
                <button onClick={() => router.push(`/anamnese/${clienteId}`)}
                  className="bg-white text-black font-bold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-all">
                  Preencher anamnese
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Saúde */}
                {(anamneseCompleta.patologias || anamneseCompleta.medicamentos || anamneseCompleta.alergias || anamneseCompleta.historico_familiar) && (
                  <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">🏥 Saúde</p>
                    <div className="space-y-3">
                      {anamneseCompleta.patologias && <div><p className="text-zinc-600 text-xs mb-1">Patologias</p><p className="text-zinc-200 text-sm">{anamneseCompleta.patologias}</p></div>}
                      {anamneseCompleta.medicamentos && <div><p className="text-zinc-600 text-xs mb-1">Medicamentos</p><p className="text-zinc-200 text-sm">{anamneseCompleta.medicamentos}</p></div>}
                      {anamneseCompleta.alergias && <div><p className="text-zinc-600 text-xs mb-1">Alergias</p><p className="text-amber-300 text-sm">{anamneseCompleta.alergias}</p></div>}
                      {anamneseCompleta.historico_familiar && <div><p className="text-zinc-600 text-xs mb-1">Histórico familiar</p><p className="text-zinc-200 text-sm">{anamneseCompleta.historico_familiar}</p></div>}
                    </div>
                  </div>
                )}
                {/* Estilo de vida */}
                {(anamneseCompleta.nivel_atividade || anamneseCompleta.horas_sono || anamneseCompleta.nivel_estresse) && (
                  <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">🌿 Estilo de vida</p>
                    <div className="space-y-3">
                      {anamneseCompleta.nivel_atividade && <div><p className="text-zinc-600 text-xs mb-1">Atividade física</p><p className="text-zinc-200 text-sm capitalize">{anamneseCompleta.nivel_atividade.replace('_', ' ')}</p></div>}
                      {anamneseCompleta.horas_sono && <div><p className="text-zinc-600 text-xs mb-1">Horas de sono</p><p className="text-zinc-200 text-sm">{anamneseCompleta.horas_sono}h/noite</p></div>}
                      {anamneseCompleta.nivel_estresse && <div><p className="text-zinc-600 text-xs mb-1">Estresse</p><p className="text-zinc-200 text-sm">{anamneseCompleta.nivel_estresse}/10</p></div>}
                      {anamneseCompleta.alcool && <div><p className="text-zinc-600 text-xs mb-1">Álcool</p><p className="text-zinc-200 text-sm capitalize">{anamneseCompleta.alcool}</p></div>}
                    </div>
                  </div>
                )}
                {/* Histórico esportivo */}
                {(anamneseCompleta.lesoes || anamneseCompleta.restricoes_fisicas || anamneseCompleta.historico_esportivo) && (
                  <div className="rounded-2xl border border-red-500/15 p-5" style={{ background: '#1a0f0f' }}>
                    <p className="text-red-400/80 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">⚠ Histórico esportivo</p>
                    <div className="space-y-3">
                      {anamneseCompleta.lesoes && <div><p className="text-zinc-600 text-xs mb-1">Lesões</p><p className="text-red-200 text-sm">{anamneseCompleta.lesoes}</p></div>}
                      {anamneseCompleta.restricoes_fisicas && <div><p className="text-zinc-600 text-xs mb-1">Restrições físicas</p><p className="text-amber-200 text-sm">{anamneseCompleta.restricoes_fisicas}</p></div>}
                      {anamneseCompleta.historico_esportivo && <div><p className="text-zinc-600 text-xs mb-1">Histórico</p><p className="text-zinc-200 text-sm">{anamneseCompleta.historico_esportivo}</p></div>}
                    </div>
                  </div>
                )}
                {/* Nutrição */}
                {(anamneseCompleta.restricoes_alimentares || anamneseCompleta.suplementos || anamneseCompleta.habitos_alimentares) && (
                  <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">🥗 Nutrição</p>
                    <div className="space-y-3">
                      {anamneseCompleta.restricoes_alimentares && <div><p className="text-zinc-600 text-xs mb-1">Restrições alimentares</p><p className="text-amber-300 text-sm">{anamneseCompleta.restricoes_alimentares}</p></div>}
                      {anamneseCompleta.suplementos && <div><p className="text-zinc-600 text-xs mb-1">Suplementos</p><p className="text-zinc-200 text-sm">{anamneseCompleta.suplementos}</p></div>}
                      {anamneseCompleta.refeicoes_por_dia && <div><p className="text-zinc-600 text-xs mb-1">Refeições/dia</p><p className="text-zinc-200 text-sm">{anamneseCompleta.refeicoes_por_dia}x</p></div>}
                      {anamneseCompleta.habitos_alimentares && <div><p className="text-zinc-600 text-xs mb-1">Hábitos</p><p className="text-zinc-200 text-sm">{anamneseCompleta.habitos_alimentares}</p></div>}
                    </div>
                  </div>
                )}
                {/* Objetivos */}
                {anamneseCompleta.objetivo_detalhado && (
                  <div className="md:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">🎯 Objetivos</p>
                    <p className="text-zinc-200 text-sm leading-relaxed">{anamneseCompleta.objetivo_detalhado}</p>
                    {anamneseCompleta.motivacao && <p className="text-zinc-500 text-xs mt-2">Motivação: {anamneseCompleta.motivacao}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ABA EVOLUÇÃO ─────────────────────────────────────────────── */}
        {abaAtiva === 'evolucao' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-xl">Evolução Corporal</h2>
                <p className="text-zinc-500 text-sm">{medidasCP.length} avaliações registradas</p>
              </div>
              <button onClick={() => setModalAvaliacao(true)}
                className="flex items-center gap-1.5 text-sm text-[#2DD4A7] border border-[#2DD4A7]/25 bg-[#2DD4A7]/10 rounded-xl px-4 py-2 active:scale-95 transition-all font-medium">
                + Nova avaliação
              </button>
            </div>

            {medidasCP.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                <p className="text-3xl mb-3">📏</p>
                <p className="text-white font-semibold mb-1">Sem avaliações registradas</p>
                <p className="text-zinc-500 text-sm mb-4">Adicione a primeira avaliação corporal do paciente</p>
                <button onClick={() => setModalAvaliacao(true)}
                  className="bg-[#2DD4A7] text-black font-bold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-all">
                  Registrar primeira avaliação
                </button>
              </div>
            ) : (() => {
              const ultima = medidasCP[medidasCP.length - 1]
              const primeira = medidasCP[0]
              type MetricaEv = { label: string; key: 'peso' | 'gordura_pct' | 'massa_muscular' | 'cintura' | 'quadril'; unit: string; cor: string; inv: boolean }
              const metricas: MetricaEv[] = ([
                { label: 'Peso', key: 'peso' as const, unit: 'kg', cor: '#94a3b8', inv: false },
                { label: '% Gordura', key: 'gordura_pct' as const, unit: '%', cor: '#f97316', inv: true },
                { label: 'Massa muscular', key: 'massa_muscular' as const, unit: 'kg', cor: '#34d399', inv: false },
                { label: 'Cintura', key: 'cintura' as const, unit: 'cm', cor: '#a78bfa', inv: true },
                { label: 'Quadril', key: 'quadril' as const, unit: 'cm', cor: '#60a5fa', inv: false },
              ] as MetricaEv[]).filter(m => ultima[m.key] != null)

              function sparkline(key: keyof typeof ultima, cor: string, unit: string) {
                const pts = medidasCP.filter(m => m[key] != null)
                if (pts.length < 2) return null
                const vals = pts.map(m => m[key] as number)
                const dates = pts.map(m => new Date(m.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
                const W = 140, H = 48, pad = 4
                const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1
                const xStep = (W - pad * 2) / Math.max(pts.length - 1, 1)
                const toY = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2)
                const toX = (i: number) => pad + i * xStep
                const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
                return (
                  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible">
                    <path d={d} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                    {vals.map((v, i) => (
                      <g key={i}>
                        <circle cx={toX(i)} cy={toY(v)} r="3.5" fill={cor} opacity="0.9" className="cursor-pointer" />
                        <title>{dates[i]}: {String(v).replace('.', ',')} {unit}</title>
                      </g>
                    ))}
                  </svg>
                )
              }

              return (
                <>
                  {/* Resumo da última avaliação */}
                  <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-zinc-400 text-xs uppercase tracking-wider">Última avaliação</p>
                      <p className="text-zinc-500 text-xs">{new Date(ultima.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                      {metricas.map(m => {
                        const cur = ultima[m.key] as number
                        const ini = primeira[m.key] as number | null
                        const delta = ini !== null ? Math.round((cur - ini) * 10) / 10 : null
                        const pos = delta !== null && (m.inv ? delta < 0 : delta > 0)
                        return (
                          <div key={m.label} className="text-center">
                            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">{m.label}</p>
                            <p className="text-white text-xl font-black">{cur}<span className="text-zinc-600 text-xs font-normal ml-0.5">{m.unit}</span></p>
                            {delta !== null && delta !== 0 && (
                              <p className={`text-xs mt-0.5 ${pos ? 'text-emerald-400' : 'text-zinc-500'}`}>{delta > 0 ? '+' : ''}{delta}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Gráficos de evolução */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {metricas.slice(0, 4).map(m => {
                      const pts = medidasCP.filter(d => d[m.key] != null)
                      if (pts.length < 2) return null
                      return (
                        <div key={m.label} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-zinc-400 text-xs uppercase tracking-wider">{m.label}</p>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-white text-2xl font-black">{ultima[m.key]}</span>
                                <span className="text-zinc-600 text-xs">{m.unit}</span>
                                {(() => {
                                  const delta = primeira[m.key] && ultima[m.key] ? Math.round(((ultima[m.key] as number) - (primeira[m.key] as number)) * 10) / 10 : null
                                  const pos = delta !== null && (m.inv ? delta < 0 : delta > 0)
                                  return delta !== null && delta !== 0 ? <span className={`text-sm font-semibold ${pos ? 'text-emerald-400' : 'text-zinc-500'}`}>{delta > 0 ? '+' : ''}{String(delta).replace(".", ",")} {m.unit} total</span> : null
                                })()}
                              </div>
                            </div>
                            <p className="text-zinc-600 text-xs">{pts.length} medições</p>
                          </div>
                          {sparkline(m.key, m.cor, m.unit)}
                        </div>
                      )
                    }).filter(Boolean)}
                  </div>

                  {/* Histórico de avaliações — accordion clicável */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
                    <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
                      <p className="text-zinc-400 text-xs uppercase tracking-wider">Histórico de avaliações</p>
                      <button onClick={() => setModalAvaliacao(true)}
                        className="flex items-center gap-1.5 text-xs text-[#2DD4A7] border border-[#2DD4A7]/25 bg-[#2DD4A7]/10 rounded-xl px-3 py-1.5 active:scale-95 transition-all font-medium">
                        + Nova avaliação
                      </button>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {[...medidasCP].reverse().map((m, i) => {
                        const key = m.data + (m.id ?? i)
                        const aberto = avaliacaoExpandida === key
                        const campos: { label: string; val: number | null | undefined; unit: string; cor: string }[] = [
                          { label: 'Peso', val: m.peso, unit: 'kg', cor: 'text-zinc-300' },
                          { label: '% Gordura', val: m.gordura_pct, unit: '%', cor: 'text-orange-300' },
                          { label: 'Massa muscular', val: m.massa_muscular, unit: 'kg', cor: 'text-emerald-300' },
                          { label: 'Cintura', val: m.cintura, unit: 'cm', cor: 'text-violet-300' },
                          { label: 'Quadril', val: m.quadril, unit: 'cm', cor: 'text-blue-300' },
                          { label: 'Braço Dir.', val: m.braco_dir, unit: 'cm', cor: 'text-zinc-400' },
                          { label: 'Coxa Dir.', val: m.coxa_dir, unit: 'cm', cor: 'text-zinc-400' },
                          { label: 'Abdômen', val: (m as any).abdomen, unit: 'cm', cor: 'text-zinc-400' },
                          { label: 'Peitoral', val: (m as any).peitoral, unit: 'cm', cor: 'text-zinc-400' },
                        ].filter(c => c.val != null)
                        return (
                          <div key={key}>
                            <button onClick={() => setAvaliacaoExpandida(aberto ? null : key)}
                              className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/[0.03] transition-all">
                              <div className="flex-1 flex items-center gap-3 flex-wrap">
                                <p className="text-zinc-300 text-sm font-medium w-32 shrink-0">
                                  {new Date(m.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {m.peso && <span className="text-xs text-zinc-300 bg-white/[0.06] rounded-full px-2.5 py-0.5 mono">{String(m.peso).replace(".", ",")} kg</span>}
                                  {m.gordura_pct && <span className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/15 rounded-full px-2.5 py-0.5 mono">{m.gordura_pct}%</span>}
                                  {m.massa_muscular && <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2.5 py-0.5 mono">{m.massa_muscular}kg</span>}
                                  {!aberto && m.cintura && <span className="text-xs text-zinc-500 bg-white/[0.03] rounded-full px-2.5 py-0.5 mono">{m.cintura}cm cin.</span>}
                                </div>
                              </div>
                              <ChevronDown size={15} className={`text-zinc-600 shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
                            </button>

                            {aberto && (
                              <div className="px-5 pb-4 pt-1 bg-white/[0.02]">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {campos.map(c => (
                                    <div key={c.label} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
                                      <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">{c.label}</p>
                                      <p className={`text-base font-bold mono ${c.cor}`}>{String(c.val).replace('.', ',')} <span className="text-zinc-600 text-xs font-normal">{c.unit}</span></p>
                                    </div>
                                  ))}
                                </div>
                                {(m as any).observacoes && (
                                  <p className="mt-3 text-zinc-400 text-sm italic border-l-2 border-white/[0.10] pl-3">{(m as any).observacoes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        </div>
      </div>
      {/* ── FIM CONTEÚDO SINGLE-COLUMN ───────────────────────────────── */}
      </div>
      {/* ── FIM CONTEÚDO PRINCIPAL ───────────────────────────────────── */}

      {/* NavBar mobile removido — SidebarProfissional cuida da navegação */}

      {/* ── MODAL AVALIAÇÃO COMPLETA ─────────────────────────────────── */}
      {modalAvaliacao && paciente && (
        <ModalAvaliacaoCompleta
          clienteId={clienteId}
          paciente={paciente}
          onClose={() => setModalAvaliacao(false)}
          onSaved={async () => {
            const { data: novas } = await supabase.from('evolucao_medidas')
              .select('id,data,peso,gordura_pct,massa_muscular,cintura,quadril,abdomen,peitoral,braco_dir,braco_esq,coxa_dir,coxa_esq,panturrilha_dir,panturrilha_esq,observacoes')
              .eq('cliente_id', clienteId).order('data', { ascending: true }).limit(20)
            if (novas) setMedidasCP(novas as MedidaCP[])
            setModalAvaliacao(false)
            setAbaAtiva('evolucao')
          }}
        />
      )}

      {/* Modal confirmação IA */}
      {confirmandoIA && (
        <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmandoIA(false) }}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl border border-white/[0.14] px-5 pt-6 pb-10 space-y-4" style={{ background: '#1c1c1c' }}>
            <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-2 text-2xl">✦</div>
            <p className="text-white font-black text-xl text-center">Gerar plano com IA?</p>
            <p className="text-zinc-400 text-sm text-center leading-relaxed">
              Isso criará um novo plano e salvará no histórico. O plano atual ficará como versão anterior.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmandoIA(false)}
                className="flex-1 border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                Cancelar
              </button>
              <button onClick={() => { setConfirmandoIA(false); gerarPlanoIA() }}
                className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                ✦ Gerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal biblioteca de modelos */}
      {mostrarModelos && (
        <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setMostrarModelos(false) }}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl border border-white/[0.14] px-5 pt-6 pb-10 space-y-4" style={{ background: '#1c1c1c', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mx-auto mb-1 text-2xl">📋</div>
            <p className="text-white font-black text-xl text-center">Modelos de plano alimentar</p>
            <p className="text-zinc-400 text-sm text-center leading-relaxed">
              Ponto de partida pronto — selecione um modelo, ele será carregado no editor e você ajusta livremente para o paciente.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              <button onClick={() => setFiltroObjetivoModelo(null)}
                style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid', borderColor: filtroObjetivoModelo === null ? 'rgba(255,138,61,0.4)' : 'rgba(255,255,255,0.14)', background: filtroObjetivoModelo === null ? 'rgba(255,138,61,0.15)' : 'transparent', color: filtroObjetivoModelo === null ? '#FF8A3D' : '#9AA0AD' }}>
                Todos
              </button>
              {Object.entries(OBJETIVO_TEMPLATE_LABEL).map(([chave, label]) => (
                <button key={chave} onClick={() => setFiltroObjetivoModelo(chave)}
                  style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid', borderColor: filtroObjetivoModelo === chave ? 'rgba(255,138,61,0.4)' : 'rgba(255,255,255,0.14)', background: filtroObjetivoModelo === chave ? 'rgba(255,138,61,0.15)' : 'transparent', color: filtroObjetivoModelo === chave ? '#FF8A3D' : '#9AA0AD' }}>
                  {label}
                </button>
              ))}
            </div>

            {carregandoTemplates ? (
              <p className="text-zinc-500 text-sm text-center py-8">Carregando modelos...</p>
            ) : (() => {
              const filtrados = templates.filter(t => !filtroObjetivoModelo || t.objetivo === filtroObjetivoModelo)
              if (filtrados.length === 0) {
                return <p className="text-zinc-500 text-sm text-center py-8">Nenhum modelo encontrado para esse filtro.</p>
              }
              return (
                <div className="space-y-3">
                  {filtrados.map(t => (
                    <div key={t.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 16 }}>
                      <p style={{ color: '#FF8A3D', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 6 }}>
                        {OBJETIVO_TEMPLATE_LABEL[t.objetivo] ?? t.objetivo}
                      </p>
                      <p style={{ color: '#F5F6F8', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{t.nome}</p>
                      {t.descricao && <p style={{ color: '#9AA0AD', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{t.descricao}</p>}
                      <button onClick={() => carregarModelo(t)}
                        style={{ width: '100%', background: 'rgba(255,138,61,0.15)', border: '1px solid rgba(255,138,61,0.25)', color: '#FF8A3D', fontWeight: 700, padding: '10px 0', borderRadius: 12, fontSize: 12, cursor: 'pointer', transition: 'all 150ms' }}>
                        Usar modelo →
                      </button>
                    </div>
                  ))}
                </div>
              )
            })()}

            <p style={{ color: '#6B7280', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
              Os modelos são pontos de partida — não substituem a avaliação individual do paciente.
            </p>

            <button onClick={() => setMostrarModelos(false)}
              className="w-full border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Nota clínica — card integrado no conteúdo */}
      {abaAtiva === 'visao-geral' && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, width: 280 }}>
          <details>
            <summary style={{
              width: 44, height: 44, borderRadius: 14, cursor: 'pointer', listStyle: 'none',
              background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, marginLeft: 'auto', transition: 'all 150ms',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>📝</summary>
            <div style={{
              position: 'absolute', bottom: 52, right: 0, width: 280,
              background: 'rgba(22,24,34,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <p style={{ color: '#FF8A3D', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 10 }}>Nota clínica</p>
              <textarea
                value={notaAvulsa}
                onChange={e => setNotaAvulsa(e.target.value)}
                placeholder="Anotações sobre o paciente, observações da consulta..."
                rows={5}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '10px 12px', color: '#F5F6F8', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button onClick={salvarNotaAvulsa} disabled={salvandoNota}
                style={{ width: '100%', marginTop: 10, background: 'rgba(255,138,61,0.15)', border: '1px solid rgba(255,138,61,0.25)', color: '#FF8A3D', fontWeight: 700, padding: '10px 0', borderRadius: 12, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', opacity: salvandoNota ? 0.5 : 1, transition: 'all 150ms' }}>
                {salvandoNota ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>
          </details>
        </div>
      )}

      {paciente && (() => {
        const hojeAI = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        const dBaseAI = new Date(hojeAI + 'T12:00:00-03:00')
        const currSunAI = new Date(dBaseAI)
        currSunAI.setDate(dBaseAI.getDate() - dBaseAI.getDay())
        const q7AI = currSunAI.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

        const atividadesSem = [
          ...historicoTreinosDetalhado.filter(t => t.data >= q7AI).map(t => ({
            data: t.data,
            modalidade: 'musculação',
            duracao_min: null as number | null,
            distancia_km: null as number | null,
            calorias: t.calorias,
          })),
          ...atividadesLivres21d.filter(a => a.data >= q7AI).map(a => ({
            data: a.data,
            modalidade: a.modalidade,
            duracao_min: a.duracao_min,
            distancia_km: a.distancia_km,
            calorias: a.calorias_wearable ?? a.calorias_estimadas ?? null,
          })),
        ].sort((a, b) => b.data.localeCompare(a.data))

        const calTotalAI = atividadesSem.reduce((s, a) => s + (a.calorias ?? 0), 0)

        return (
          <ProfissionalAIChat contexto={{
            profissionalTipo: 'nutricionista',
            profissionalNome: nutriNome,
            paciente: {
              nome: paciente.nome,
              peso: paciente.peso,
              altura: paciente.altura,
              objetivo: paciente.objetivo,
              nivel: paciente.nivel ?? null,
              metaPeso: paciente.meta_peso,
              metaDataLimite: paciente.meta_data_limite,
              fcmax: paciente.fcmax ?? null,
              ftp: paciente.ftp ?? null,
            },
            alertasClinicos: {
              lesoes: anamneseLesoes,
              restricoesFisicas: anamneseRestricaoFisica,
              medicamentos: anamneseMedicamentos,
              alergias: anamneseAlergias,
            },
            nutricao: {
              caloriasPrescritas: planoAtivo?.calorias_meta ?? null,
              proteinaPrescritas: planoAtivo?.proteina_meta ?? null,
              caloriasSemanaisGastas: calTotalAI > 0 ? calTotalAI : caloriasSemanais,
              treinosSemana: atividadesSem.length,
              periodizacao: periodizacaoFase ? `${periodizacaoFase.nome_bloco} (${periodizacaoFase.tipo_bloco}) semana ${periodizacaoFase.semana_bloco}/${periodizacaoFase.total_semanas_bloco}` : null,
              atividadesSemana: atividadesSem,
            },
            composicao: medidasCP.length > 0 ? {
              ultimoPeso: medidasCP[medidasCP.length - 1].peso,
              gorduraPct: medidasCP[medidasCP.length - 1].gordura_pct,
              massaMuscular: medidasCP[medidasCP.length - 1].massa_muscular,
              data: medidasCP[medidasCP.length - 1].data,
            } : null,
            ultimaAvaliacao,
            proximaConsulta: proximaConsultaInfo,
            anamneseCompleta,
            sono: {
              hoje: sonoHoje ? { score: sonoHoje.score_recuperacao, duracaoMin: sonoHoje.duracao_minutos } : null,
              historico7d: recuperacao7d.map(r => ({ data: r.data, score: r.score, duracaoMin: r.duracao })),
            },
            bemEstarHoje: bemEstar ? { humor: bemEstar.humor, energia: bemEstar.energia, dorMuscular: bemEstar.dor_muscular ?? null, notas: bemEstar.notas ?? null } : null,
            planoAlimentar: planoEstruturado ? {
              calorias: planoAtivo?.calorias_meta ?? null,
              proteina: planoAtivo?.proteina_meta ?? null,
              refeicoes: (planoEstruturado.refeicoes ?? []).map((r: any) => ({
                nome: r.nome, horario: r.horario, calorias: r.calorias, proteina: r.proteina,
                alimentos: (r.alimentos ?? []).map((a: any) => a.nome).filter(Boolean),
              })),
              suplementos: (planoEstruturado.suplementos ?? []).map((s: any) => typeof s === 'string' ? s : s?.nome).filter(Boolean),
              hidratacao: planoEstruturado.hidratacao ?? null,
              orientacaoTreino: planoEstruturado.orientacao_treino ?? null,
              observacoes: planoEstruturado.nota_nutri ?? null,
            } : null,
            treinosRegistrados: historicoTreinosDetalhado,
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
            treinamento: treinamentoChat,
          }} pacienteId={clienteId} />
        )
      })()}
    </main>
  )
}

function PlanoExtra({ icon, titulo, subtitulo, conteudo, cor }: {
  icon: string; titulo: string; subtitulo: string; conteudo: string; cor: 'blue' | 'yellow' | 'orange' | 'green'
}) {
  const [aberto, setAberto] = useState(false)
  const cores: Record<string, { borda: string; titulo: string; bg: string }> = {
    blue:   { borda: 'border-blue-500/20',   titulo: 'text-blue-400',   bg: 'bg-blue-500/5' },
    yellow: { borda: 'border-yellow-500/20', titulo: 'text-yellow-400', bg: 'bg-yellow-500/5' },
    orange: { borda: 'border-orange-500/20', titulo: 'text-orange-400', bg: 'bg-orange-500/5' },
    green:  { borda: 'border-green-500/20',  titulo: 'text-green-400',  bg: 'bg-green-500/5' },
  }
  const c = cores[cor]
  return (
    <div className={`rounded-2xl border ${c.borda} ${c.bg} overflow-hidden`}>
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:opacity-80">
        <span className="text-xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${c.titulo}`}>{titulo}</p>
          <p className="text-zinc-500 text-xs">{subtitulo}</p>
        </div>
        <span className={`text-zinc-600 text-xs transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {aberto && (
        <div className="px-4 pb-4 border-t border-white/[0.14]">
          <p className="text-zinc-300 text-sm leading-relaxed pt-3">{conteudo}</p>
        </div>
      )}
    </div>
  )
}

const MEAL_ICONS = [Sun, Apple, UtensilsCrossed, Zap, Dumbbell, Moon, Salad, Coffee]

function RefeicaoCard({ ref, idx }: { ref: any; idx: number }) {
  const [aberta, setAberta] = useState(false)
  const MealIcon = MEAL_ICONS[idx % MEAL_ICONS.length] ?? UtensilsCrossed
  const alimentos: any[] = ref.alimentos ?? []
  // Refeição sem nome, sem horário, sem alimentos e com calorias/proteína zeradas é registro
  // incompleto (placeholder vazio salvo no plano) — nunca mostrar como se fosse uma refeição válida de 0 kcal
  const incompleta = !ref.nome && !ref.horario && alimentos.length === 0 && !ref.calorias && !ref.proteina
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 20 }}>
      <button onClick={() => setAberta(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/[0.03] active:bg-white/[0.02] transition-colors min-h-[56px]">
        <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
          <MealIcon size={16} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{ref.nome || (incompleta ? 'Refeição incompleta' : 'Sem nome')}</p>
            {ref.horario && (
              <span className="text-zinc-300 text-[11px] font-medium bg-white/[0.10] px-2 py-0.5 rounded-md shrink-0 mono">
                {ref.horario}
              </span>
            )}
          </div>
          {incompleta ? (
            <div className="flex gap-2 mt-0.5">
              <span className="text-amber-400 text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                ⚠ Dados incompletos — nenhum alimento cadastrado
              </span>
            </div>
          ) : (
            <div className="flex gap-3 mt-0.5">
              <span className="text-[var(--data-energy)] text-xs font-semibold mono">{ref.calorias} kcal</span>
              <span className="text-[#2DD4A7] text-xs mono">{ref.proteina}g prot</span>
              {alimentos.length > 0 && (
                <span className="text-zinc-500 text-xs bg-white/[0.05] px-1.5 rounded">
                  {alimentos.length} item{alimentos.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${aberta ? 'rotate-180' : ''}`} />
      </button>

      {aberta && alimentos.length > 0 && (
        <div className="border-t border-white/[0.14]">
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Alimento</p>
              <div className="flex gap-5">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Qtd.</p>
                <p className="text-zinc-500 text-xs uppercase tracking-wider w-12 text-right">Kcal</p>
                <p className="text-zinc-500 text-xs uppercase tracking-wider w-10 text-right">Prot.</p>
              </div>
            </div>
            {alimentos.map((al: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                <p className="text-white text-sm flex-1 pr-3">{al.nome}</p>
                <div className="flex gap-5 items-center shrink-0">
                  <p className="text-zinc-500 text-xs">{al.quantidade}</p>
                  <p className="text-zinc-200 text-sm font-semibold w-12 text-right">{al.calorias}</p>
                  <p className="text-zinc-200 text-sm w-10 text-right">{al.proteina}g</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-3 mt-1 border-t border-white/[0.11]">
              <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total</p>
              <div className="flex gap-5 shrink-0">
                <span className="text-zinc-600 text-xs"></span>
                <p className="text-white text-sm font-bold w-12 text-right">{ref.calorias}</p>
                <p className="text-white text-sm font-bold w-10 text-right">{ref.proteina}g</p>
              </div>
            </div>
          </div>
          {ref.dica && (
            <div className="mx-4 mb-3 rounded-xl bg-white/[0.02] border border-white/[0.14] px-3 py-2.5">
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">💡 Dica</p>
              <p className="text-zinc-300 text-sm leading-relaxed">{ref.dica}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
