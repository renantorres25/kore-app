'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import NavBar from '../../../components/NavBar'
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
}
type TreinoDia = { data: string; calorias_estimadas: number | null; plano: string | null }
type Sono = { score_recuperacao: number | null; duracao: number | null }
type BemEstar = { humor: number; energia: number; motivacao: number }
type PlanoNutricional = {
  id: string; conteudo: string; calorias_meta: number | null
  proteina_meta: number | null; created_at: string
}
type MedidaCP = { id?: string; data: string; peso: number | null; gordura_pct: number | null; massa_muscular: number | null; cintura: number | null; quadril: number | null; braco_dir: number | null; coxa_dir: number | null; abdomen?: number | null; peitoral?: number | null; braco_esq?: number | null; coxa_esq?: number | null; panturrilha_dir?: number | null; panturrilha_esq?: number | null; observacoes?: string | null }
type PeriodizacaoFase = { nome_ciclo: string; nome_bloco: string; tipo_bloco: string; semana_bloco: number; total_semanas_bloco: number; semana_total: number; total_semanas: number; descricao: string | null; plano_associado: string | null }
type MetaHistorico = { calorias_meta: number | null; proteina_meta: number | null; created_at: string }
type AlimentoEd = {
  nome: string; quantidade: string; calorias: string; proteina: string
  kcal_100g?: number | null; prot_100g?: number | null; carbo_100g?: number | null
  gramas?: string
}
type RefeicaoEd = { nome: string; horario: string; dica: string; alimentos: AlimentoEd[] }
type ExtrasEd = {
  hidratacaoLitros: string; hidratacaoOri: string
  oriTreino: string; estrategia: string; dicaFome: string
}

const ALIMENTO_VAZIO: AlimentoEd = { nome: '', quantidade: '', calorias: '', proteina: '', kcal_100g: null, prot_100g: null, carbo_100g: null, gramas: '' }
const REFEICAO_VAZIA: RefeicaoEd = {
  nome: '', horario: '', dica: '',
  alimentos: [{ ...ALIMENTO_VAZIO }],
}
const EXTRAS_VAZIO: ExtrasEd = { hidratacaoLitros: '', hidratacaoOri: '', oriTreino: '', estrategia: '', dicaFome: '' }

function getTodayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

const TERMOS_VAZIOS = /^(nenhum|nada|não|nao|sem\s|n\/a|ok\b)/i
function limparAlerta(val: string | null): string | null {
  if (!val) return null
  const partes = val.split(/\s*[·,;]\s*/).map(v => v.trim())
    .filter(v => v.length > 1 && !TERMOS_VAZIOS.test(v))
  return partes.length ? partes.join(' · ') : null
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
  const [atividadesLivres14d, setAtividadesLivres14d] = useState<{
    id: string; data: string; modalidade: string; duracao_min: number; distancia_km: number | null; calorias_estimadas: number | null; intensidade: number | null
  }[]>([])
  const [recuperacao7d, setRecuperacao7d] = useState<{ data: string; score: number | null; duracao: number | null }[]>([])
  const [treinoCarregando, setTreinoCarregando] = useState(false)
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<string | null>(null)
  const [proximaConsulta, setProximaConsulta] = useState<string | null>(null)
  const [proximaFase, setProximaFase] = useState<string | null>(null)
  const [diasAteProximaFase, setDiasAteProximaFase] = useState<number | null>(null)
  const [anamneseLesoes, setAnamneseLesoes] = useState<string | null>(null)
  const [anamneseRestricaoFisica, setAnamneseRestricaoFisica] = useState<string | null>(null)
  const [anamneseMedicamentos, setAnamneseMedicamentos] = useState<string | null>(null)
  const [anamneseAlergias, setAnamneseAlergias] = useState<string | null>(null)
  const [briefingIA, setBriefingIA] = useState<string | null>(null)
  const [briefingEstruturado, setBriefingEstruturado] = useState<{
    resumo: string; evolucao: string[]; alertas: string[]; recomendacoes: string[]
  } | null>(null)
  const [gerandoBriefing, setGerandoBriefing] = useState(false)
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

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      supabase.from('perfis').select('nome').eq('id', session.user.id).single().then(({ data }) => { if (data?.nome) setNutriNome(data.nome) })
      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 6)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const [
        { data: perfil }, { data: treinos7d },
        { data: trHoje }, { data: sono }, { data: bem }, { data: plano },
        { data: medidas }, { data: historicoData }, { data: periData },
        { data: anamneseData }, { data: ultimaAvalData }, { data: proximaConsultaData },
      ] = await Promise.all([
        supabase.from('perfis').select('id,nome,email,peso,objetivo,altura,sexo,data_nascimento,meta_peso,meta_data_limite,nivel,fcmax,ftp').eq('id', clienteId).single(),
        supabase.from('treinos').select('data,calorias_estimadas').eq('cliente_id', clienteId).gte('data', semStr).eq('concluido', true),
        supabase.from('treinos').select('data,plano,calorias_estimadas').eq('cliente_id', clienteId).eq('data', hoje).eq('concluido', true).maybeSingle(),
        supabase.from('sono').select('score_recuperacao,duracao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('bem_estar').select('humor,energia,motivacao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('planos_nutricionais').select('id,conteudo,calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('evolucao_medidas').select('id,data,peso,gordura_pct,massa_muscular,cintura,quadril,abdomen,peitoral,braco_dir,braco_esq,coxa_dir,coxa_esq,panturrilha_dir,panturrilha_esq,observacoes').eq('cliente_id', clienteId).order('data', { ascending: true }).limit(20),
        supabase.from('planos_nutricionais').select('calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).order('created_at', { ascending: true }).limit(12),
        supabase.from('periodizacoes').select('id,nome,data_inicio').eq('cliente_id', clienteId).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1),
        supabase.from('anamneses').select('lesoes,restricoes_fisicas,medicamentos,alergias,restricoes_alimentares').eq('cliente_id', clienteId).not('profissional_id', 'is', null).order('criado_em', { ascending: false }).limit(5),
        supabase.from('agendamentos').select('data').eq('cliente_id', clienteId).eq('status', 'realizado').order('data', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('agendamentos').select('data,hora,tipo').eq('cliente_id', clienteId).eq('status', 'agendado').gte('data', hoje).order('data').limit(1).maybeSingle(),
      ])
      if (perfil) setPaciente(perfil)
      setTreinos7dDatas((treinos7d ?? []).map((t: any) => t.data))
      const calSem = (treinos7d ?? []).reduce((s: number, t: any) => s + (t.calorias_estimadas ?? 0), 0)
      if (calSem > 0) setCaloriasSemanais(calSem)
      if (ultimaAvalData?.data) setUltimaAvaliacao(ultimaAvalData.data)
      if (proximaConsultaData?.data) setProximaConsulta(proximaConsultaData.data)
      const lesoes = (anamneseData ?? []).map((a: any) => a.lesoes).filter(Boolean).join(' · ')
      const rf = (anamneseData ?? []).map((a: any) => a.restricoes_fisicas).filter(Boolean).join(' · ')
      const meds = (anamneseData ?? []).map((a: any) => a.medicamentos).filter(Boolean).join(' · ')
      const alerg = (anamneseData ?? []).map((a: any) => [a.alergias, a.restricoes_alimentares].filter(Boolean).join(', ')).filter(Boolean).join(' · ')
      if (lesoes) setAnamneseLesoes(lesoes)
      if (rf) setAnamneseRestricaoFisica(rf)
      if (meds) setAnamneseMedicamentos(meds)
      if (alerg) setAnamneseAlergias(alerg)

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
      setSonoHoje(sono ?? null)
      setBemEstar(bem ?? null)
      if (plano) { setPlanoAtivo(plano); setAbaAtiva('plano') }
      if (medidas?.length) setMedidasCP(medidas as MedidaCP[])
      if (historicoData?.length) setHistoricoMetas(historicoData as MetaHistorico[])

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
          // Próxima fase
          if (blocoIdx < blocos.length - 1) {
            const prox = blocos[blocoIdx + 1]
            const semanasRestantes = b.semanas - semanaNoBloco
            setProximaFase(prox.nome)
            setDiasAteProximaFase(semanasRestantes * 7)
          }
        }
        // Personal trainer vinculado a este paciente
        const { data: personalLink } = await supabase.from('vinculos').select('profissional_id').eq('cliente_id', clienteId).eq('tipo', 'personal').eq('ativo', true).maybeSingle()
        if (personalLink) {
          const { data: pp } = await supabase.from('perfis').select('nome, email').eq('id', personalLink.profissional_id).single()
          if (pp) setPersonalNome(pp.nome ?? pp.email)
        }
      } else {
        // Tenta carregar personal mesmo sem periodização
        const { data: personalLink } = await supabase.from('vinculos').select('profissional_id').eq('cliente_id', clienteId).eq('tipo', 'personal').eq('ativo', true).maybeSingle()
        if (personalLink) {
          const { data: pp } = await supabase.from('perfis').select('nome, email').eq('id', personalLink.profissional_id).single()
          if (pp) setPersonalNome(pp.nome ?? pp.email)
        }
      }

      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  // ── editor helpers ──────────────────────────────────────────────────────
  function iniciarEdicao(doZero = false) {
    if (!doZero && planoEstruturado) {
      setRefeicoesEd(planoEstruturado.refeicoes.map((r: any) => ({
        nome: r.nome ?? '', horario: r.horario ?? '', dica: r.dica ?? '',
        alimentos: (r.alimentos && r.alimentos.length > 0)
          ? r.alimentos.map((a: any) => ({
              nome: a.nome ?? '', quantidade: a.quantidade ?? '',
              calorias: String(a.calorias ?? ''), proteina: String(a.proteina ?? ''),
              kcal_100g: a.kcal_100g ?? null, prot_100g: a.prot_100g ?? null, carbo_100g: a.carbo_100g ?? null, gramas: a.gramas ?? '',
            }))
          : [{ nome: '', quantidade: '', calorias: String(r.calorias ?? ''), proteina: String(r.proteina ?? ''), kcal_100g: null, prot_100g: null, carbo_100g: null }],
      })))
      setNotaEd(planoEstruturado.nota_nutri ?? '')
      setExtrasEd({
        hidratacaoLitros: String(planoEstruturado.hidratacao?.litros_dia ?? ''),
        hidratacaoOri: planoEstruturado.hidratacao?.orientacao ?? '',
        oriTreino: planoEstruturado.orientacao_treino ?? '',
        estrategia: planoEstruturado.estrategia_desafio ?? '',
        dicaFome: planoEstruturado.dica_fome ?? '',
      })
    } else {
      setRefeicoesEd([{ ...REFEICAO_VAZIA }])
      setNotaEd('')
      setExtrasEd(EXTRAS_VAZIO)
    }
    setEditandoPlano(true)
    setAbaAtiva('plano')
  }

  function addRefeicao() {
    setRefeicoesEd(p => [...p, { nome: '', horario: '', dica: '', alimentos: [{ ...ALIMENTO_VAZIO }] }])
  }
  function removeRefeicao(i: number) {
    setRefeicoesEd(p => p.filter((_, idx) => idx !== i))
  }
  function updateRefeicao(i: number, field: 'nome' | 'horario' | 'dica', val: string) {
    setRefeicoesEd(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function addAlimento(rIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, alimentos: [...r.alimentos, { ...ALIMENTO_VAZIO }] }
      : r))
  }
  function removeAlimento(rIdx: number, aIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, alimentos: r.alimentos.filter((_, i) => i !== aIdx) }
      : r))
  }
  function updateAlimento(rIdx: number, aIdx: number, field: keyof AlimentoEd, val: string) {
    setRefeicoesEd(p => p.map((r, idx) => {
      if (idx !== rIdx) return r
      const novos = r.alimentos.map((a, i) => {
        if (i !== aIdx) return a
        const updated = { ...a, [field]: val }
        // autocalcula macros pelo campo gramas (separado da quantidade de exibição)
        if (field === 'gramas' && a.kcal_100g != null) {
          const g = parseFloat(val)
          if (!isNaN(g) && g > 0) {
            updated.calorias = String(Math.round(a.kcal_100g * g / 100))
            updated.proteina = String(((a.prot_100g ?? 0) * g / 100).toFixed(1))
          } else {
            updated.calorias = ''
            updated.proteina = ''
          }
        }
        return updated
      })
      return { ...r, alimentos: novos }
    }))
  }
  function handleSelectTACO(rIdx: number, aIdx: number, taco: AlimentoTACO) {
    setRefeicoesEd(p => p.map((r, idx) => {
      if (idx !== rIdx) return r
      const novos = r.alimentos.map((a, i) => {
        if (i !== aIdx) return a
        // ao selecionar da TACO: seta nome + armazena macros/100g, limpa gramas/calorias para redigitar
        return { ...a, nome: taco.nome, kcal_100g: taco.energia_kcal, prot_100g: taco.proteina_g, carbo_100g: taco.carbo_g, gramas: '', calorias: '', proteina: '' }
      })
      return { ...r, alimentos: novos }
    }))
  }

  async function salvarEdicao() {
    setSalvandoEd(true)
    const planoJSON: any = {
      nota_nutri: notaEd,
      refeicoes: refeicoesEd.map(r => ({
        nome: r.nome, horario: r.horario,
        ...(r.dica ? { dica: r.dica } : {}),
        calorias: sumAl(r.alimentos, 'calorias'),
        proteina: sumAl(r.alimentos, 'proteina'),
        alimentos: r.alimentos.filter(a => a.nome).map(a => ({
          nome: a.nome, quantidade: a.quantidade,
          calorias: parseFloat(a.calorias) || 0,
          proteina: parseFloat(a.proteina) || 0,
          ...(a.kcal_100g != null ? { kcal_100g: a.kcal_100g, prot_100g: a.prot_100g, carbo_100g: a.carbo_100g, gramas: a.gramas } : {}),
        })),
      })),
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

  // Load detailed training data lazily when treino tab opens
  useEffect(() => {
    if (abaAtiva === 'treino') carregarDadosTreino()
  }, [abaAtiva])

  async function carregarDadosTreino() {
    if (treinoCarregando || historicoTreinosDetalhado.length > 0) return
    setTreinoCarregando(true)
    const trinta = new Date(); trinta.setDate(trinta.getDate() - 30)
    const sete = new Date(); sete.setDate(sete.getDate() - 7)
    const q30 = trinta.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const q7 = sete.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [{ data: treinosHist }, { data: ativs }, { data: sonoHist }, { data: personalLink }] = await Promise.all([
      supabase.from('treinos').select('id,data,nome,plano,calorias_estimadas').eq('cliente_id', clienteId).eq('concluido', true).gte('data', q30).order('data', { ascending: false }),
      supabase.from('atividades_livres').select('id,data,modalidade,duracao_min,distancia_km,calorias_estimadas,intensidade').eq('usuario_id', clienteId).gte('data', q30).order('data', { ascending: false }),
      supabase.from('sono').select('data,score_recuperacao,duracao').eq('usuario_id', clienteId).gte('data', q7).order('data', { ascending: true }),
      supabase.from('vinculos').select('profissional_id, perfis(nome)').eq('cliente_id', clienteId).eq('tipo', 'personal').eq('ativo', true).maybeSingle(),
    ])

    // Set personal trainer name
    if (personalLink?.perfis) {
      setPersonalNome((personalLink.perfis as any).nome ?? null)
    }

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

    if (ativs?.length) setAtividadesLivres14d(ativs as any)
    if (sonoHist?.length) setRecuperacao7d(sonoHist.map((s: any) => ({ data: s.data, score: s.score_recuperacao, duracao: s.duracao })))
    setTreinoCarregando(false)
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
    const prompt = `Analise este paciente e retorne um JSON com este formato exato (sem texto fora do JSON):
{
  "resumo": "1-2 frases descrevendo a situação atual do paciente",
  "evolucao": ["item1", "item2", "item3"],
  "alertas": ["alerta1", "alerta2"],
  "recomendacoes": ["rec1", "rec2", "rec3"]
}

DADOS:
Paciente: ${paciente.nome}, objetivo: ${paciente.objetivo ?? '?'}
Peso atual: ${medidasCP.length >= 2 ? medidasCP[medidasCP.length-1].peso : paciente.peso}kg, variação total: ${deltaPeso ?? 'sem dados'}kg
Gordura: ${medidasCP.length >= 2 ? `${medidasCP[medidasCP.length-1].gordura_pct}% (início ${medidasCP[0].gordura_pct}%)` : 'sem dados'}
Massa muscular: ${medidasCP.length >= 2 ? `${medidasCP[medidasCP.length-1].massa_muscular}kg (início ${medidasCP[0].massa_muscular}kg)` : 'sem dados'}
Plano: ${planoAtivo ? `${planoAtivo.calorias_meta} kcal, ${planoAtivo.proteina_meta}g prot` : 'sem plano'}
Treinos esta semana: ${treinos7dDatas.length}
Fase treino: ${periodizacaoFase ? `${periodizacaoFase.nome_bloco} (sem ${periodizacaoFase.semana_bloco}/${periodizacaoFase.total_semanas_bloco})` : 'não configurada'}
Alertas clínicos: ${[lesoesFilt, rfFilt, medsFilt, alergFilt].filter(Boolean).join('; ') || 'nenhum'}
Sono hoje: ${sonoHoje?.score_recuperacao ? `${sonoHoje.score_recuperacao}/100` : 'não registrado'}`

    try {
      const res = await fetch('/api/kore-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: [{ role: 'user', content: prompt }],
          systemPrompt: 'Você é um assistente clínico de nutrição. Responda APENAS com o JSON solicitado, sem texto adicional.'
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
          } else {
            setBriefingIA(resposta)
          }
        } else {
          setBriefingIA(resposta)
        }
      } catch {
        setBriefingIA(resposta)
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
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const metaCal = getMetaCalorias(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const metaProt = getMetaProteina(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const hoje = getTodayBR()
  const dias7d = getDias7d(hoje)

  let planoEstruturado: any = null
  if (planoAtivo) { try { const p = JSON.parse(planoAtivo.conteudo); if (p.refeicoes) planoEstruturado = p } catch {} }

  const totalEdCal = refeicoesEd.reduce((s, r) => s + sumAl(r.alimentos, 'calorias'), 0)
  const totalEdProt = refeicoesEd.reduce((s, r) => s + sumAl(r.alimentos, 'proteina'), 0)

  return (
    <main className="min-h-[100dvh] text-white flex flex-col md:flex-row" style={{ background: 'var(--bg-base)' }}>

      {/* ── SIDEBAR — só desktop ─────────────────────────────────────── */}
      <SidebarProfissional tipo="nutricionista" />

      {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden md:h-screen">

      {/* ── HEADER FIXO ─────────────────────────────────────────────── */}
      <div className="shrink-0 sticky top-0 z-20 backdrop-blur-sm border-b"
           style={{ background: 'rgba(12,16,26,0.97)', borderColor: 'rgba(255,255,255,0.09)', paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="px-4 md:px-8 pb-4">
          <button onClick={() => router.push('/nutricionista/pacientes')}
            className="text-zinc-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-300 transition-colors">
            ← Pacientes
          </button>
          <div className="flex items-center justify-between gap-6">
            {/* Avatar + nome + dados primários */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-[var(--accent)] font-black text-base">{paciente ? getInitials(paciente.nome, paciente.email) : '?'}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{paciente?.nome ?? paciente?.email ?? 'Paciente'}</h1>
                  {paciente?.data_nascimento && (() => {
                    const hoje2 = new Date()
                    const nasc = new Date(paciente.data_nascimento)
                    const idade = hoje2.getFullYear() - nasc.getFullYear() - (hoje2 < new Date(hoje2.getFullYear(), nasc.getMonth(), nasc.getDate()) ? 1 : 0)
                    return <span className="text-zinc-500 text-sm">{idade} anos</span>
                  })()}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {paciente?.peso && <span className="text-xs text-zinc-400 bg-white/[0.05] rounded-full px-2.5 py-0.5">{paciente.peso} kg</span>}
                  {paciente?.objetivo && <span className="text-xs text-zinc-400 bg-white/[0.05] rounded-full px-2.5 py-0.5">{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</span>}
                  {paciente?.meta_peso && <span className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2.5 py-0.5">Meta: {paciente.meta_peso} kg</span>}
                  {metaCal && <span className="hidden md:inline text-xs text-zinc-400 bg-white/[0.05] rounded-full px-2.5 py-0.5">{metaCal} kcal/dia</span>}
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
                  <p className="text-[var(--accent)] text-sm font-medium mt-0.5">{new Date(proximaConsulta).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>
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
      <div className="shrink-0 border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
              className={`px-4 py-3.5 text-sm border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                abaAtiva === tab.id
                  ? 'border-[var(--accent)] text-white font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 font-normal'
              }`}>
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

            {/* ── 1. SITUAÇÃO ATUAL — compacto com validação ────────────── */}
            {medidasCP.length >= 1 ? (() => {
              // Filtra apenas medidas com valores válidos (sem dados corrompidos de teste)
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
                <div className="rounded-2xl px-5 py-4 flex items-center gap-0" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Situação atual</p>
                      {ultimaAvaliacao && <p className="text-zinc-600 text-[10px]">· {new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>}
                    </div>
                    <div className="flex items-center gap-6">
                      {metricas.map(m => {
                        const positivo = m.delta !== null && (m.inv ? m.delta < 0 : m.delta > 0)
                        return (
                          <div key={m.label} className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white tracking-tight leading-none">{m.val}</span>
                            <span className="text-zinc-500 text-xs">{m.unit}</span>
                            {m.delta !== null && m.delta !== 0 && (
                              <span className={`text-[10px] font-semibold ml-1 ${positivo ? 'text-emerald-400' : 'text-red-400'}`}>
                                {m.delta > 0 ? '+' : ''}{m.delta}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <button onClick={() => setAbaAtiva('evolucao')}
                    className="text-xs text-zinc-600 hover:text-[var(--accent)] transition-colors shrink-0">
                    Ver evolução →
                  </button>
                </div>
              )
            })() : (
              <div className="rounded-3xl p-8 flex items-center gap-5" style={{ background: 'var(--surface-1)' }}>
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

            {/* ── 2. ALERTAS CLÍNICOS — linhas hierarquizadas ──────────── */}
            {(() => {
              const l = limparAlerta(anamneseLesoes), r = limparAlerta(anamneseRestricaoFisica)
              const m = limparAlerta(anamneseMedicamentos), a = limparAlerta(anamneseAlergias)
              if (!l && !r && !m && !a) return null

              type AlertRow = { icon: string; cat: string; txt: string; level: 'danger' | 'warning' | 'info' }
              const rows: AlertRow[] = [
                ...(l ? l.split(/[·;]/).map(s => s.trim()).filter(Boolean).map(t => ({ icon: '🔴', cat: 'Lesão', txt: t, level: 'danger' as const })) : []),
                ...(r ? r.split(/[·;]/).map(s => s.trim()).filter(Boolean).map(t => ({ icon: '🟠', cat: 'Restrição física', txt: t, level: 'warning' as const })) : []),
                ...(m ? m.split(/[·;]/).map(s => s.trim()).filter(Boolean).map(t => ({ icon: '⚪', cat: 'Medicamento', txt: t, level: 'info' as const })) : []),
                ...(a ? a.split(/[·,;]/).map(s => s.trim()).filter(Boolean).map(t => ({ icon: '🟡', cat: 'Alergia', txt: t, level: 'warning' as const })) : []),
              ]
              const colors = { danger: 'border-red-500/20 bg-red-500/5', warning: 'border-amber-500/20 bg-amber-500/5', info: 'border-white/[0.08] bg-white/[0.03]' }
              const textColors = { danger: 'text-red-300', warning: 'text-amber-300', info: 'text-zinc-300' }

              return (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                  <div className="px-5 py-3 border-b border-white/[0.10] flex items-center gap-2">
                    <span className="text-red-400 text-xs">⚠</span>
                    <p className="text-xs font-semibold text-zinc-300 tracking-wide">Alertas clínicos</p>
                    <span className="ml-auto text-xs text-zinc-600 bg-white/[0.05] px-2 py-0.5 rounded-full">{rows.length}</span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {rows.map((row, i) => (
                      <div key={i} className={`flex items-start gap-3 px-5 py-3 ${colors[row.level]}`}>
                        <span className="text-sm shrink-0 mt-0.5">{row.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{row.cat}</p>
                          <p className={`text-sm leading-snug mt-0.5 ${textColors[row.level]}`}>{row.txt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── 3. DADOS DE HOJE — 3 colunas, números grandes ────────── */}
            <div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-[0.2em] mb-4">Dados de hoje</p>
              <div className="grid grid-cols-3 gap-4">

            {/* Recuperação */}
            <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
              <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] mb-5">Recuperação</p>
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
                  {sonoHoje.duracao && <p className="text-zinc-600 text-xs mt-0.5">{sonoHoje.duracao}h de sono</p>}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-5xl font-black text-zinc-700 leading-none">–</p>
                  <p className="text-zinc-600 text-sm mt-3">Sem registro hoje</p>
                </div>
              )}
            </div>

            {/* Treino hoje */}
            <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
              <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] mb-5">Treino hoje</p>
              {treinoHoje ? (
                <>
                  <p className="text-5xl font-black text-emerald-400 leading-none mb-3">✓</p>
                  <p className="text-white text-sm font-semibold">Plano {treinoHoje.plano}</p>
                  <p className="text-emerald-400/70 text-xs mt-0.5">Treino concluído</p>
                  {treinoHoje.calorias_estimadas != null && treinoHoje.calorias_estimadas > 0 && (
                    <p className="text-orange-400 text-2xl font-black mt-3 leading-none">{treinoHoje.calorias_estimadas}<span className="text-zinc-600 text-xs font-normal ml-1">kcal</span></p>
                  )}
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
            <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
              <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] mb-5">Bem-estar</p>
              {bemEstar ? (
                <>
                  {(() => {
                    const media = Math.round((bemEstar.humor + bemEstar.energia + bemEstar.motivacao) / 3 * 10) / 10
                    return (
                      <>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className={`text-5xl font-black leading-none tracking-tight ${media >= 4 ? 'text-emerald-400' : media >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>{media}</span>
                          <span className="text-zinc-600 text-xl">/5</span>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {[{l:'Humor',v:bemEstar.humor},{l:'Energia',v:bemEstar.energia},{l:'Motivação',v:bemEstar.motivacao}].map(({l,v}) => (
                            <div key={l} className="flex items-center gap-2">
                              <p className="text-zinc-600 text-xs w-16 shrink-0">{l}</p>
                              <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${v>=4?'bg-emerald-400':v>=3?'bg-yellow-400':'bg-red-400'}`} style={{width:`${v/5*100}%`}}/>
                              </div>
                              <span className="text-zinc-500 text-xs w-5 text-right">{v}</span>
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

            {/* ── 4. ANÁLISE IA — chamada para ação ────────────────────── */}
            {briefingEstruturado ? (
              <div className="rounded-2xl p-6" style={{ background: '#0b1610' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] text-emerald-500/70 uppercase tracking-[0.2em] flex items-center gap-2"><span>✦</span> Análise IA</p>
                  <button onClick={() => setAbaAtiva('ia')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Ver completo →</button>
                </div>
                <p className="text-zinc-200 text-base leading-relaxed">{briefingEstruturado.resumo}</p>
              </div>
            ) : (
              <button onClick={() => setAbaAtiva('ia')}
                className="w-full rounded-2xl p-6 flex items-center gap-4 text-left transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: '#0b1610', border: '1px solid rgba(16,185,129,0.12)' }}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-xl">✦</div>
                <div>
                  <p className="text-white text-base font-bold">Gerar análise inteligente</p>
                  <p className="text-zinc-500 text-sm mt-0.5">Evolução, riscos e recomendações — gerados pela IA em segundos</p>
                </div>
                <span className="text-emerald-500/50 text-xl ml-auto">→</span>
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
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
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
                  const refCal = sumAl(ref.alimentos, 'calorias')
                  const refProt = sumAl(ref.alimentos, 'proteina')
                  return (
                    <div key={rIdx} className="rounded-2xl border border-white/[0.14] overflow-hidden" style={{ background: 'var(--surface-1)' }}>
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

                        {/* alimentos */}
                        <div className="space-y-2">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimentos</p>
                          {ref.alimentos.map((al, aIdx) => (
                            <div key={aIdx} className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center gap-2">
                                <AlimentoBusca
                                  value={al.nome}
                                  onChange={v => updateAlimento(rIdx, aIdx, 'nome', v)}
                                  onSelect={taco => handleSelectTACO(rIdx, aIdx, taco)}
                                  placeholder="Buscar alimento (TACO) ou digitar..."
                                  className="flex-1 bg-transparent text-white placeholder-zinc-600 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15"
                                />
                                {ref.alimentos.length > 1 && (
                                  <button onClick={() => removeAlimento(rIdx, aIdx)} className="text-zinc-700 hover:text-red-400 transition-colors text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-white/[0.14]">✕</button>
                                )}
                              </div>
                              {/* badge TACO + campos separados: exibição vs cálculo */}
                              {al.kcal_100g != null && (
                                <div className="flex items-center gap-2 px-1 flex-wrap">
                                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">✦ TACO</span>
                                  <span className="text-zinc-600 text-[9px]">{al.kcal_100g} kcal · {al.prot_100g}g prot · {al.carbo_100g}g carb <span className="text-zinc-700">por 100g</span></span>
                                </div>
                              )}
                              {/* Quantidade para exibição no plano (ex: "2 ovos", "1 copo") */}
                              <input value={al.quantidade} onChange={e => updateAlimento(rIdx, aIdx, 'quantidade', e.target.value)}
                                placeholder="Quantidade para exibir (ex: 2 ovos, 1 copo, 100g)"
                                className="w-full bg-transparent text-white placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15" />
                              {/* Gramas para cálculo automático — só aparece quando TACO selecionado */}
                              {al.kcal_100g != null && (
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input type="number" value={al.gramas ?? ''} onChange={e => updateAlimento(rIdx, aIdx, 'gramas', e.target.value)}
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
                                  <input type="number" value={al.calorias} onChange={e => updateAlimento(rIdx, aIdx, 'calorias', e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-orange-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500/20 pr-12" />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">kcal</span>
                                </div>
                                <div className="relative">
                                  <input type="number" value={al.proteina} onChange={e => updateAlimento(rIdx, aIdx, 'proteina', e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-blue-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 pr-10" />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">g prot</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addAlimento(rIdx)}
                            className="w-full py-2 rounded-xl border border-dashed border-white/[0.14] text-zinc-600 text-xs hover:border-white/20 hover:text-zinc-400 transition-all active:scale-95">
                            + adicionar alimento
                          </button>
                        </div>

                        {/* dica opcional */}
                        <input value={ref.dica} onChange={e => updateRefeicao(rIdx, 'dica', e.target.value)}
                          placeholder="💡 Dica para o paciente (opcional)"
                          className="w-full bg-white/[0.02] text-zinc-400 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/10 border border-white/[0.14]" />

                        {/* total refeição */}
                        {refCal > 0 && (
                          <div className="flex items-center gap-3 pt-1 border-t border-white/[0.14]">
                            <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Total</span>
                            <span className="text-orange-400 text-xs font-bold">{refCal} kcal</span>
                            <span className="text-blue-400 text-xs font-bold">{refProt}g prot</span>
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
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-1)' }}>
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
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
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
              <div className="rounded-2xl border border-green-500/20 p-6 text-center" style={{ background: 'linear-gradient(145deg,#111520,#10131a)' }}>
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">🥗</div>
                <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Plano alimentar</p>
                <p className="text-white font-black text-xl mb-2">Criar dieta personalizada</p>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">Monte manualmente com alimentos e gramas, ou deixe a IA gerar um plano completo.</p>
                <div className="flex gap-2">
                  <button onClick={() => iniciarEdicao(true)} className="flex-1 border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all hover:border-white/25">✏️ Manual</button>
                  <button onClick={() => setConfirmandoIA(true)} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">✦ Gerar IA</button>
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
          const calSemTotal = [
            ...historicoTreinosDetalhado.map(t => t.calorias ?? 0),
            ...atividadesLivres14d.filter(a => {
              const d = new Date(a.data); const sete = new Date(); sete.setDate(sete.getDate() - 7)
              return d >= sete
            }).map(a => a.calorias_estimadas ?? 0)
          ].reduce((acc, v) => acc + v, 0)
          const scoreMedia = recuperacao7d.length ? Math.round(recuperacao7d.filter(r => r.score != null).reduce((a, r) => a + (r.score ?? 0), 0) / recuperacao7d.filter(r => r.score != null).length) : null

          return (
          <div className="space-y-5">
            {/* ── 1. PERSONAL TRAINER + PERIODIZAÇÃO ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
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
                      <span className="text-[var(--accent)] text-2xl font-black">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">Sem periodização ativa</p>
                )}

                {/* Métricas semanais */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Treinos', val: treinos7dDatas.length, unit: '/7d', cor: 'text-white' },
                    { label: 'Kcal gastos', val: calSemTotal > 0 ? `${(calSemTotal/1000).toFixed(1)}k` : '—', unit: '', cor: 'text-orange-300' },
                    { label: 'Recuperação', val: scoreMedia ? `${scoreMedia}` : '—', unit: '/100', cor: scoreMedia && scoreMedia >= 70 ? 'text-emerald-400' : scoreMedia && scoreMedia >= 50 ? 'text-yellow-400' : 'text-red-400' },
                    { label: 'FC máx', val: paciente?.fcmax ?? '—', unit: paciente?.fcmax ? ' bpm' : '', cor: 'text-zinc-300' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className={`text-xl font-black ${m.cor}`}>{m.val}<span className="text-xs font-normal text-zinc-600">{m.unit}</span></p>
                      <p className="text-zinc-600 text-[10px] mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Ajuste calórico */}
                {ajuste && caloriasBase && (
                  <div className="rounded-xl px-4 py-3 border border-emerald-500/20" style={{ background: 'rgba(45,212,167,0.05)' }}>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Ajuste calórico sugerido · {periodizacaoFase?.nome_bloco}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[var(--accent)] text-2xl font-black">{caloriasAjustadas?.toLocaleString('pt-BR')} kcal</span>
                      <span className="text-zinc-500 text-sm">({ajuste.pct > 0 ? '+' : ''}{Math.round(ajuste.pct * 100)}%)</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-0.5">{ajuste.label}</p>
                  </div>
                )}

                {proximaFase && diasAteProximaFase !== null && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-zinc-400 text-sm">Próxima fase:</span>
                    <span className="text-[var(--accent)] font-semibold text-sm">{proximaFase} <span className="text-zinc-600 font-normal">em {diasAteProximaFase}d</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. TENDÊNCIA DE RECUPERAÇÃO ── */}
            {recuperacao7d.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                <div className="px-5 py-4 border-b border-white/[0.07]">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Recuperação — últimos 7 dias</p>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-end gap-2 h-14">
                    {recuperacao7d.map((r, i) => {
                      const score = r.score ?? 0
                      const h = Math.max(4, Math.round((score / 100) * 56))
                      const cor = score >= 70 ? 'var(--accent)' : score >= 50 ? '#F59E0B' : '#FB7185'
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

            {/* ── 3. HISTÓRICO DE TREINOS (14 dias) ── */}
            {treinoCarregando ? (
              <div className="rounded-2xl p-8 flex items-center justify-center gap-3" style={{ background: 'var(--surface-1)' }}>
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-500 text-sm">Carregando histórico...</p>
              </div>
            ) : (
              <>
                {/* ── TREINOS DE MUSCULAÇÃO ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
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
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                  <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Atividades livres — 30 dias</p>
                    <span className="text-zinc-600 text-xs">{atividadesLivres14d.length > 0 ? `${atividadesLivres14d.length} atividades` : 'sem registros'}</span>
                  </div>
                  {atividadesLivres14d.length > 0 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {atividadesLivres14d.slice(0, 8).map(a => (
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
                          {a.calorias_estimadas && a.calorias_estimadas > 0 && (
                            <p className="text-orange-300 text-sm font-bold shrink-0">
                              {a.calorias_estimadas} <span className="text-zinc-600 text-xs font-normal">kcal</span>
                            </p>
                          )}
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
                className="flex items-center gap-2 text-sm text-emerald-400 border border-emerald-500/25 bg-emerald-500/10 rounded-xl px-5 py-2.5 active:scale-95 transition-all disabled:opacity-50 font-semibold">
                {gerandoBriefing ? (
                  <><div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /> Analisando...</>
                ) : briefingEstruturado ? '↻ Reanalisar' : '✦ Gerar análise'}
              </button>
            </div>

            {!briefingEstruturado && !briefingIA && (
              <div className="rounded-2xl border border-emerald-500/15 p-10 text-center" style={{ background: '#0a1510' }}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto mb-4">✦</div>
                <p className="text-white font-bold text-lg mb-2">Análise Inteligente do Paciente</p>
                <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">A IA vai analisar composição corporal, plano alimentar, treinos, alertas clínicos e gerar insights acionáveis para a consulta.</p>
              </div>
            )}

            {briefingEstruturado ? (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Resumo */}
                <div className="md:col-span-2 rounded-2xl border border-emerald-500/20 p-6" style={{ background: '#0a1510' }}>
                  <p className="text-[var(--accent)] text-xs uppercase tracking-wider mb-2">Situação atual</p>
                  <p className="text-white text-lg leading-relaxed">{briefingEstruturado.resumo}</p>
                </div>

                {/* Evolução */}
                <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
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
                <div className="rounded-2xl border border-amber-500/15 p-5" style={{ background: '#1a1308' }}>
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

            {/* Chat referência */}
            <div className="rounded-2xl border border-white/[0.07] p-5 flex items-center gap-4" style={{ background: 'var(--surface-1)' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-lg">✦</div>
              <div>
                <p className="text-white text-sm font-semibold">Chat clínico disponível</p>
                <p className="text-zinc-500 text-xs mt-0.5">Use o botão <span className="text-[var(--accent)]">✦</span> no canto inferior direito para perguntas específicas sobre {paciente?.nome?.split(' ')[0] ?? 'este paciente'}</p>
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
                <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !anamneseCompleta ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface-1)' }}>
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
                  <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
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
                  <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
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
                  <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
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
                  <div className="md:col-span-2 rounded-2xl p-5" style={{ background: 'var(--surface-1)' }}>
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
                className="flex items-center gap-1.5 text-sm text-[var(--accent)] border border-[var(--accent)]/25 bg-[var(--accent)]/10 rounded-xl px-4 py-2 active:scale-95 transition-all font-medium">
                + Nova avaliação
              </button>
            </div>

            {medidasCP.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface-1)' }}>
                <p className="text-3xl mb-3">📏</p>
                <p className="text-white font-semibold mb-1">Sem avaliações registradas</p>
                <p className="text-zinc-500 text-sm mb-4">Adicione a primeira avaliação corporal do paciente</p>
                <button onClick={() => setModalAvaliacao(true)}
                  className="bg-[var(--accent)] text-black font-bold px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-all">
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
                  <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
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
                        <div key={m.label} className="rounded-2xl p-6" style={{ background: 'var(--surface-1)' }}>
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
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                    <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
                      <p className="text-zinc-400 text-xs uppercase tracking-wider">Histórico de avaliações</p>
                      <button onClick={() => setModalAvaliacao(true)}
                        className="flex items-center gap-1.5 text-xs text-[var(--accent)] border border-[var(--accent)]/25 bg-[var(--accent)]/10 rounded-xl px-3 py-1.5 active:scale-95 transition-all font-medium">
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

      <div className="md:hidden"><NavBar tipo="nutricionista" ativa="pacientes" /></div>

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

      {/* Modal nota clínica avulsa */}
      {abaAtiva === 'visao-geral' && (
        <div className="fixed bottom-20 right-4 z-50">
          <details className="group">
            <summary className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center cursor-pointer text-blue-300 text-xl list-none active:scale-95 transition-all">
              📝
            </summary>
            <div className="absolute bottom-14 right-0 w-72 rounded-2xl border border-blue-500/20 p-4 space-y-3" style={{ background: '#101825' }}>
              <p className="text-blue-300 text-[10px] uppercase tracking-[0.15em] font-bold">Nota clínica</p>
              <textarea
                value={notaAvulsa}
                onChange={e => setNotaAvulsa(e.target.value)}
                placeholder="Anotações sobre o paciente, observações da consulta..."
                rows={5}
                className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/30 resize-none"
              />
              <button onClick={salvarNotaAvulsa} disabled={salvandoNota}
                className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all disabled:opacity-40">
                {salvandoNota ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>
          </details>
        </div>
      )}

      {paciente && (
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
            caloriasSemanaisGastas: caloriasSemanais,
            treinosSemana: treinos7dDatas.length,
            periodizacao: periodizacaoFase ? `${periodizacaoFase.nome_bloco} (${periodizacaoFase.tipo_bloco}) semana ${periodizacaoFase.semana_bloco}/${periodizacaoFase.total_semanas_bloco}` : null,
          },
          composicao: medidasCP.length > 0 ? {
            ultimoPeso: medidasCP[medidasCP.length - 1].peso,
            gorduraPct: medidasCP[medidasCP.length - 1].gordura_pct,
            massaMuscular: medidasCP[medidasCP.length - 1].massa_muscular,
            data: medidasCP[medidasCP.length - 1].data,
          } : null,
          ultimaAvaliacao,
        }} pacienteId={clienteId} />
      )}
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
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
      <button onClick={() => setAberta(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/[0.03] active:bg-white/[0.02] transition-colors min-h-[56px]">
        <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
          <MealIcon size={16} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{ref.nome}</p>
            {ref.horario && (
              <span className="text-zinc-300 text-[11px] font-medium bg-white/[0.10] px-2 py-0.5 rounded-md shrink-0 mono">
                {ref.horario}
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-0.5">
            <span className="text-[var(--data-energy)] text-xs font-semibold mono">{ref.calorias} kcal</span>
            <span className="text-[var(--accent)] text-xs mono">{ref.proteina}g prot</span>
            {alimentos.length > 0 && (
              <span className="text-zinc-500 text-xs bg-white/[0.05] px-1.5 rounded">
                {alimentos.length} item{alimentos.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
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
