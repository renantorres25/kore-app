'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type Aluno = { id: string; nome: string | null; email: string }
type Bloco = { id: string; nome: string; tipo: string; semanas: number; ordem: number; descricao: string | null; volume_alvo: number | null; unidade_volume: string | null }
type Periodizacao = { id: string; nome: string; data_inicio: string; status: string; modalidade: string | null; data_prova: string | null; volume_semanal_alvo: number | null; blocos: Bloco[] }
type BlocoRascunho = { nome: string; tipo: string; semanas: number; descricao: string; volume_alvo: number | null }
type Modalidade = 'musculacao' | 'corrida' | 'bike' | 'natacao' | 'triathlon'

const TIPO_DEF = { label: 'Custom', bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400', dot: 'bg-sky-400' }
const TIPO: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  adaptacao:   { label: 'Adaptação',   bg: 'bg-teal-500/15',    border: 'border-teal-500/30',    text: 'text-teal-400',    dot: 'bg-teal-400'    },
  adaptação:   { label: 'Adaptação',   bg: 'bg-teal-500/15',    border: 'border-teal-500/30',    text: 'text-teal-400',    dot: 'bg-teal-400'    },
  hipertrofia: { label: 'Hipertrofia', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  forca:       { label: 'Força',       bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-400'    },
  força:       { label: 'Força',       bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-400'    },
  deload:      { label: 'Deload',      bg: 'bg-zinc-500/15',    border: 'border-zinc-500/30',    text: 'text-zinc-400',    dot: 'bg-zinc-400'    },
  potencia:    { label: 'Potência',    bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400',  dot: 'bg-orange-400'  },
  potência:    { label: 'Potência',    bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400',  dot: 'bg-orange-400'  },
  resistencia: { label: 'Resistência', bg: 'bg-purple-500/15',  border: 'border-purple-500/30',  text: 'text-purple-400',  dot: 'bg-purple-400'  },
  resistência: { label: 'Resistência', bg: 'bg-purple-500/15',  border: 'border-purple-500/30',  text: 'text-purple-400',  dot: 'bg-purple-400'  },
  base:        { label: 'Base',          bg: 'bg-teal-500/15',    border: 'border-teal-500/30',    text: 'text-teal-400',    dot: 'bg-teal-400'    },
  'base aeróbica': { label: 'Base Aeróbica', bg: 'bg-teal-500/15', border: 'border-teal-500/30', text: 'text-teal-400', dot: 'bg-teal-400' },
  'base aerobica': { label: 'Base Aeróbica', bg: 'bg-teal-500/15', border: 'border-teal-500/30', text: 'text-teal-400', dot: 'bg-teal-400' },
  volume:      { label: 'Volume',        bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  limiar:      { label: 'Limiar',        bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-400'    },
  intensidade: { label: 'Intensidade',   bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400',  dot: 'bg-orange-400'  },
  vo2max:      { label: 'VO2max',        bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400'     },
  taper:       { label: 'Taper',         bg: 'bg-purple-500/15',  border: 'border-purple-500/30',  text: 'text-purple-400',  dot: 'bg-purple-400'  },
  recuperacao: { label: 'Recuperação',   bg: 'bg-zinc-500/15',    border: 'border-zinc-500/30',    text: 'text-zinc-400',    dot: 'bg-zinc-400'    },
  recuperação: { label: 'Recuperação',   bg: 'bg-zinc-500/15',    border: 'border-zinc-500/30',    text: 'text-zinc-400',    dot: 'bg-zinc-400'    },
  'específico swim/bike/run': { label: 'Específico', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  'especifico swim/bike/run': { label: 'Específico', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  brick:       { label: 'Brick',         bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400',  dot: 'bg-orange-400'  },
  competicao:  { label: 'Competição',    bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400'     },
  competição:  { label: 'Competição',    bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400'     },
  transicao:   { label: 'Transição',     bg: 'bg-zinc-500/15',    border: 'border-zinc-500/30',    text: 'text-zinc-400',    dot: 'bg-zinc-400'    },
  transição:   { label: 'Transição',     bg: 'bg-zinc-500/15',    border: 'border-zinc-500/30',    text: 'text-zinc-400',    dot: 'bg-zinc-400'    },
}

function getTipoCfg(tipo: string) {
  return TIPO[tipo.toLowerCase()] ?? TIPO_DEF
}

const MODALIDADE_INFO: Record<Modalidade, { label: string; icone: string }> = {
  musculacao: { label: 'Musculação', icone: '🏋️' },
  corrida:    { label: 'Corrida',    icone: '🏃' },
  bike:       { label: 'Bike',       icone: '🚴' },
  natacao:    { label: 'Natação',    icone: '🏊' },
  triathlon:  { label: 'Triathlon',  icone: '🏅' },
}

const BLOCOS_DATALIST: Record<Modalidade, string[]> = {
  musculacao: ['Adaptação', 'Hipertrofia', 'Força', 'Potência', 'Deload'],
  corrida:    ['Base Aeróbica', 'Volume', 'Limiar', 'Intensidade', 'VO2max', 'Taper', 'Recuperação'],
  natacao:    ['Base Aeróbica', 'Volume', 'Limiar', 'Intensidade', 'VO2max', 'Taper', 'Recuperação'],
  bike:       ['Base', 'Resistência', 'Potência', 'Limiar', 'Taper'],
  triathlon:  ['Base', 'Específico Swim/Bike/Run', 'Brick', 'Competição', 'Transição', 'Taper'],
}

const UNIDADE_VOLUME: Record<Modalidade, { unidade: string; label: string } | null> = {
  musculacao: null,
  corrida:    { unidade: 'km', label: 'Volume alvo (km/semana)' },
  natacao:    { unidade: 'km', label: 'Volume alvo (km/semana)' },
  bike:       { unidade: 'h',  label: 'Volume alvo (horas/semana)' },
  triathlon:  { unidade: 'h',  label: 'Volume alvo (horas/semana)' },
}

const BLOCOS_PADRAO_MUSCULACAO: BlocoRascunho[] = [
  { nome: 'Adaptação',   tipo: 'Adaptação',   semanas: 3, descricao: 'Fase de adaptação neuromuscular. Foco em técnica, 3-4 séries, 12-15 reps, cargas moderadas.', volume_alvo: null },
  { nome: 'Hipertrofia', tipo: 'Hipertrofia', semanas: 4, descricao: 'Foco em volume. 4 séries, 8-12 reps, 65-75% 1RM. Progressão de carga semanal.', volume_alvo: null },
  { nome: 'Força',       tipo: 'Força',       semanas: 3, descricao: 'Redução de volume, aumento de intensidade. 4-5 séries, 4-6 reps, 80-90% 1RM.', volume_alvo: null },
  { nome: 'Deload',      tipo: 'Deload',      semanas: 1, descricao: 'Semana de recuperação ativa. 50-60% do volume normal, cargas reduzidas.', volume_alvo: null },
]

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function calcSemanaAtual(dataInicio: string, blocos: Bloco[]) {
  const hoje = new Date(getTodayBR() + 'T12:00:00-03:00')
  const inicio = new Date(dataInicio + 'T12:00:00-03:00')
  const diasTotais = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  if (diasTotais < 0) return null
  const semanaTotal = Math.floor(diasTotais / 7) + 1
  let acum = 0
  for (let i = 0; i < blocos.length; i++) {
    if (semanaTotal <= acum + blocos[i].semanas) return { blocoIdx: i, semanaNoBloco: semanaTotal - acum, semanaTotal }
    acum += blocos[i].semanas
  }
  return { blocoIdx: blocos.length - 1, semanaNoBloco: blocos[blocos.length - 1]?.semanas ?? 1, semanaTotal }
}

function calcSemanasDisponiveis(dataInicio: string, dataProva: string): number | null {
  if (!dataInicio || !dataProva) return null
  const inicio = new Date(dataInicio + 'T12:00:00-03:00')
  const prova = new Date(dataProva + 'T12:00:00-03:00')
  const dias = Math.floor((prova.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  if (dias <= 0) return 0
  return Math.ceil(dias / 7)
}

function calcSemanasParaProva(dataProva: string): number | null {
  const hoje = new Date(getTodayBR() + 'T12:00:00-03:00')
  const prova = new Date(dataProva + 'T12:00:00-03:00')
  const dias = Math.floor((prova.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 0) return null
  return Math.ceil(dias / 7)
}

export default function PeriodizacaoPage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.clienteId as string

  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [periodizacao, setPeriodizacao] = useState<Periodizacao | null>(null)
  const [historico, setHistorico] = useState<Periodizacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [verHistorico, setVerHistorico] = useState(false)

  const [etapaCriacao, setEtapaCriacao] = useState<'modalidade' | 'form'>('modalidade')
  const [modalidadeForm, setModalidadeForm] = useState<Modalidade>('musculacao')
  const [nomeForm, setNomeForm] = useState('')
  const [dataInicioForm, setDataInicioForm] = useState(getTodayBR())
  const [dataProvaForm, setDataProvaForm] = useState('')
  const [distanciaProvaForm, setDistanciaProvaForm] = useState<'sprint' | 'olimpico' | '70.3' | 'full'>('70.3')
  const [blocosForm, setBlocosForm] = useState<BlocoRascunho[]>(BLOCOS_PADRAO_MUSCULACAO.map(b => ({ ...b })))

  useEffect(() => { carregar() }, [clienteId])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const [{ data: perfil }, { data: peris }] = await Promise.all([
      supabase.from('perfis').select('id,nome,email').eq('id', clienteId).single(),
      supabase.from('periodizacoes').select('id,nome,data_inicio,status,modalidade,data_prova,volume_semanal_alvo').eq('cliente_id', clienteId).eq('personal_id', session.user.id).order('created_at', { ascending: false }),
    ])
    if (perfil) setAluno(perfil)
    if (peris?.length) {
      const ativo = peris.find(p => p.status === 'ativo')
      const hist = peris.filter(p => p.status !== 'ativo')
      if (ativo) {
        const { data: blocos } = await supabase.from('blocos_periodizacao').select('*').eq('periodizacao_id', ativo.id).order('ordem')
        setPeriodizacao({ ...ativo, blocos: blocos ?? [] })
      }
      if (hist.length) {
        const histComBlocos = await Promise.all(hist.map(async p => {
          const { data: blocos } = await supabase.from('blocos_periodizacao').select('*').eq('periodizacao_id', p.id).order('ordem')
          return { ...p, blocos: blocos ?? [] }
        }))
        setHistorico(histComBlocos)
      }
    }
    setCarregando(false)
  }

  function iniciarCriacao() {
    setNomeForm('')
    setDataInicioForm(getTodayBR())
    setDataProvaForm('')
    setDistanciaProvaForm('70.3')
    setModalidadeForm('musculacao')
    setBlocosForm(BLOCOS_PADRAO_MUSCULACAO.map(b => ({ ...b })))
    setEtapaCriacao('modalidade')
    setCriando(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function escolherModalidade(m: Modalidade) {
    setModalidadeForm(m)
    setBlocosForm(m === 'musculacao' ? BLOCOS_PADRAO_MUSCULACAO.map(b => ({ ...b })) : [])
    setEtapaCriacao('form')
  }

  async function salvar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSalvando(true)
    const unidade = UNIDADE_VOLUME[modalidadeForm]?.unidade ?? 'km'
    await supabase.from('periodizacoes').update({ status: 'concluido' }).eq('cliente_id', clienteId).eq('personal_id', session.user.id).eq('status', 'ativo')
    const { data: nova } = await supabase.from('periodizacoes').insert({
      personal_id: session.user.id, cliente_id: clienteId,
      nome: nomeForm.trim() || 'Ciclo de treinamento',
      data_inicio: dataInicioForm,
      modalidade: modalidadeForm,
      data_prova: dataProvaForm || null,
      status: 'ativo',
    }).select('id,nome,data_inicio,status,modalidade,data_prova,volume_semanal_alvo').single()
    if (nova) {
      await supabase.from('blocos_periodizacao').insert(
        blocosForm.map((b, i) => ({
          periodizacao_id: nova.id,
          nome: b.nome.trim() || `Bloco ${i + 1}`,
          tipo: b.tipo, semanas: b.semanas, ordem: i + 1,
          descricao: b.descricao.trim() || null,
          volume_alvo: b.volume_alvo,
          unidade_volume: unidade,
        }))
      )
      const { data: blocos } = await supabase.from('blocos_periodizacao').select('*').eq('periodizacao_id', nova.id).order('ordem')
      setPeriodizacao({ ...nova, blocos: blocos ?? [] })
      if (periodizacao) setHistorico(p => [{ ...periodizacao }, ...p])
    }
    setCriando(false)
    setSalvando(false)
  }

  function addBloco() {
    setBlocosForm(p => [...p, { nome: '', tipo: BLOCOS_DATALIST[modalidadeForm][0], semanas: 4, descricao: '', volume_alvo: null }])
  }
  function removeBloco(i: number) { setBlocosForm(p => p.filter((_, j) => j !== i)) }
  function updateBloco(i: number, field: keyof BlocoRascunho, val: string | number | null) {
    setBlocosForm(p => p.map((b, j) => j === i ? { ...b, [field]: val } : b))
  }
  function mover(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= blocosForm.length) return
    const n = [...blocosForm];
    [n[i], n[j]] = [n[j], n[i]]
    setBlocosForm(n)
  }

  function sugerirBlocos() {
    const semanas = calcSemanasDisponiveis(dataInicioForm, dataProvaForm)
    if (!semanas || semanas < 1) return

    if (modalidadeForm === 'triathlon') {
      const taper = semanas >= 12 ? 2 : 1
      const restante = Math.max(3, semanas - taper)
      const base = Math.max(1, Math.round(restante * (4 / 14)))
      const competicao = Math.max(1, Math.round(restante * (4 / 14)))
      const especifico = Math.max(1, restante - base - competicao)
      setBlocosForm([
        { nome: 'Base', tipo: 'Base', semanas: base, descricao: '', volume_alvo: null },
        { nome: 'Específico Swim/Bike/Run', tipo: 'Específico Swim/Bike/Run', semanas: especifico, descricao: '', volume_alvo: null },
        { nome: 'Competição', tipo: 'Competição', semanas: competicao, descricao: '', volume_alvo: null },
        { nome: 'Taper', tipo: 'Taper', semanas: taper, descricao: '', volume_alvo: null },
      ])
      return
    }

    const taper = semanas >= 8 ? 2 : 1
    const restante = Math.max(3, semanas - taper)
    const base = Math.max(1, Math.round(restante * (0.30 / 0.85)))
    const volume = Math.max(1, Math.round(restante * (0.30 / 0.85)))
    const intensidade = Math.max(1, restante - base - volume)

    if (modalidadeForm === 'bike') {
      setBlocosForm([
        { nome: 'Base', tipo: 'Base', semanas: base, descricao: '', volume_alvo: null },
        { nome: 'Resistência', tipo: 'Resistência', semanas: volume, descricao: '', volume_alvo: null },
        { nome: 'Potência', tipo: 'Potência', semanas: intensidade, descricao: '', volume_alvo: null },
        { nome: 'Taper', tipo: 'Taper', semanas: taper, descricao: '', volume_alvo: null },
      ])
    } else {
      setBlocosForm([
        { nome: 'Base Aeróbica', tipo: 'Base Aeróbica', semanas: base, descricao: '', volume_alvo: null },
        { nome: 'Volume', tipo: 'Volume', semanas: volume, descricao: '', volume_alvo: null },
        { nome: 'Intensidade', tipo: 'Intensidade', semanas: intensidade, descricao: '', volume_alvo: null },
        { nome: 'Taper', tipo: 'Taper', semanas: taper, descricao: '', volume_alvo: null },
      ])
    }
  }

  async function arquivarCiclo() {
    if (!periodizacao) return
    await supabase.from('periodizacoes').update({ status: 'arquivado' }).eq('id', periodizacao.id)
    setHistorico(prev => [{ ...periodizacao, blocos: periodizacao.blocos }, ...prev])
    setPeriodizacao(null)
  }

  const semanaAtual = periodizacao ? calcSemanaAtual(periodizacao.data_inicio, periodizacao.blocos) : null
  const totalSemanas = periodizacao?.blocos.reduce((s, b) => s + b.semanas, 0) ?? 0
  const semanasParaProva = periodizacao?.data_prova ? calcSemanasParaProva(periodizacao.data_prova) : null
  const semanasDisponiveis = dataProvaForm ? calcSemanasDisponiveis(dataInicioForm, dataProvaForm) : null
  const unidadeVolume = UNIDADE_VOLUME[modalidadeForm]

  if (carregando) return (
    <main className="min-h-[100dvh] flex items-center justify-center text-white">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">
            ← {aluno?.nome ?? 'Aluno'}
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Periodização</h1>
              {periodizacao && (
                <p className="text-zinc-500 text-sm mt-0.5 flex items-center gap-1.5">
                  <span>{MODALIDADE_INFO[(periodizacao.modalidade as Modalidade) ?? 'musculacao']?.icone ?? '🏋️'}</span>
                  {periodizacao.nome}
                </p>
              )}
            </div>
            <button onClick={iniciarCriacao}
              className="bg-white text-black font-bold text-[11px] px-4 py-2 rounded-xl active:scale-95 transition-all tracking-wide">
              {periodizacao ? 'Novo ciclo' : '+ Criar'}
            </button>
          </div>
        </div>

        {/* Fase atual */}
        {periodizacao && semanaAtual && semanaAtual.blocoIdx < periodizacao.blocos.length && (() => {
          const b = periodizacao.blocos[semanaAtual.blocoIdx]
          const cfg = getTipoCfg(b.tipo)
          const pct = Math.min(100, (semanaAtual.semanaTotal / totalSemanas) * 100)
          return (
            <div className={`rounded-2xl p-5 border ${cfg.border} mb-5`} style={{ background: 'var(--surface-1)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Fase atual</p>
                {semanasParaProva !== null && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border border-amber-500/30 bg-amber-500/15 text-amber-400">
                    {semanasParaProva === 0 ? 'Prova esta semana' : `${semanasParaProva} ${semanasParaProva === 1 ? 'semana' : 'semanas'} para a prova`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
                  <div className={`w-4 h-4 rounded-full ${cfg.dot}`} />
                </div>
                <div>
                  <p className={`font-bold text-xl ${cfg.text}`}>{b.nome}</p>
                  <p className="text-zinc-500 text-[11px]">Semana {semanaAtual.semanaNoBloco} de {b.semanas} · {cfg.label}</p>
                </div>
              </div>
              <div className="h-2 bg-white/[0.09] rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full transition-all ${cfg.dot}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-zinc-600 text-[9px]">Semana {semanaAtual.semanaTotal} de {totalSemanas} no ciclo</p>
              {b.descricao && <p className="text-zinc-400 text-xs mt-4 leading-relaxed border-t border-white/[0.10] pt-3">{b.descricao}</p>}
              {b.volume_alvo != null && <p className="text-zinc-400 text-xs mt-2">Volume alvo: {b.volume_alvo} {b.unidade_volume === 'h' ? 'h/semana' : 'km/semana'}</p>}
            </div>
          )
        })()}

        {/* Timeline */}
        {periodizacao && periodizacao.blocos.length > 0 && (
          <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: 'var(--surface-1)' }}>
            <div className="px-5 py-4 border-b border-white/[0.10]">
              <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Linha do tempo · {totalSemanas} semanas</p>
            </div>
            <div className="px-5 pt-4 pb-3">
              <div className="flex rounded-lg overflow-hidden h-3 gap-px">
                {periodizacao.blocos.map((b, i) => {
                  const cfg = getTipoCfg(b.tipo)
                  const w = (b.semanas / totalSemanas) * 100
                  const isAtual = semanaAtual?.blocoIdx === i
                  return <div key={i} title={`${b.nome} (${b.semanas}s)`} style={{ width: `${w}%` }}
                    className={`${cfg.dot} transition-all ${isAtual ? 'opacity-100' : 'opacity-40'}`} />
                })}
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {periodizacao.blocos.map((b, i) => {
                const cfg = getTipoCfg(b.tipo)
                const isAtual = semanaAtual?.blocoIdx === i
                let ini = 1
                for (let j = 0; j < i; j++) ini += periodizacao.blocos[j].semanas
                return (
                  <div key={b.id} className={`flex items-center gap-3 px-5 py-3.5 ${isAtual ? 'bg-white/[0.02]' : ''}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${isAtual ? '' : 'opacity-40'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm ${isAtual ? 'text-white' : 'text-zinc-400'}`}>{b.nome}</p>
                        {isAtual && <span className="text-[8px] font-black text-black bg-white rounded-full px-1.5 py-0.5 leading-tight">AGORA</span>}
                      </div>
                      <p className="text-zinc-600 text-[10px]">
                        {cfg.label} · sem. {ini}–{ini + b.semanas - 1}
                        {b.volume_alvo != null && ` · ${b.volume_alvo}${b.unidade_volume === 'h' ? 'h' : 'km'}/sem`}
                      </p>
                      {b.descricao && isAtual && <p className="text-zinc-500 text-[10px] mt-1">{b.descricao}</p>}
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${isAtual ? cfg.text : 'text-zinc-600'}`}>{b.semanas}s</span>
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 border-t border-white/[0.10] flex items-center justify-between">
              <p className="text-zinc-700 text-[9px]">
                Início: {new Date(periodizacao.data_inicio + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })}
              </p>
              <button onClick={arquivarCiclo}
                className="text-[9px] text-zinc-500 border border-white/[0.10] rounded-lg px-2.5 py-1.5 active:scale-95 transition-all hover:text-zinc-300 uppercase tracking-wider">
                Arquivar ciclo
              </button>
            </div>
          </div>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="mb-5">
            <button onClick={() => setVerHistorico(p => !p)} className="w-full text-left text-zinc-600 text-[10px] uppercase tracking-widest flex items-center justify-between py-2">
              <span>Ciclos anteriores ({historico.length})</span>
              <span>{verHistorico ? '▲' : '▼'}</span>
            </button>
            {verHistorico && (
              <div className="space-y-3 mt-2">
                {historico.map(p => {
                  const total = p.blocos.reduce((s, b) => s + b.semanas, 0)
                  return (
                    <div key={p.id} className="rounded-2xl border border-white/[0.10] overflow-hidden" style={{ background: 'var(--surface-1)' }}>
                      <div className="px-4 py-3 border-b border-white/[0.10]">
                        <p className="text-zinc-400 font-semibold text-sm">{p.nome}</p>
                        <p className="text-zinc-600 text-[10px] mt-0.5">{total} semanas · {new Date(p.data_inicio + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })}</p>
                      </div>
                      <div className="px-4 py-2 flex gap-px">
                        {p.blocos.map((b, i) => {
                          const cfg = getTipoCfg(b.tipo)
                          return <div key={i} title={b.nome} style={{ width: `${(b.semanas / total) * 100}%` }}
                            className={`h-2 ${cfg.dot} opacity-40 rounded-sm`} />
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!periodizacao && !criando && (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">📅</div>
            <div>
              <p className="text-white font-bold mb-1">Nenhum ciclo criado</p>
              <p className="text-zinc-600 text-sm max-w-xs">Crie a periodização para planejar os blocos de treinamento ao longo do tempo.</p>
            </div>
            <button onClick={iniciarCriacao}
              className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all tracking-wide">
              + Criar primeiro ciclo
            </button>
          </div>
        )}

        {/* Fluxo de criação */}
        {criando && (
          <div ref={formRef} className="rounded-2xl border border-white/[0.10] overflow-hidden" style={{ background: 'var(--surface-1)' }}>

            {/* ETAPA 1 — Escolha da modalidade */}
            {etapaCriacao === 'modalidade' && (
              <>
                <div className="px-5 py-4 border-b border-white/[0.10]">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Qual o foco deste ciclo?</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(MODALIDADE_INFO) as Modalidade[]).map(m => (
                      <button key={m} onClick={() => escolherModalidade(m)}
                        className="rounded-2xl border border-white/[0.10] p-5 flex flex-col items-center gap-2 hover:border-white/30 hover:bg-white/[0.04] transition-all active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span className="text-3xl">{MODALIDADE_INFO[m].icone}</span>
                        <span className="text-white text-sm font-bold">{MODALIDADE_INFO[m].label}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCriando(false)}
                    className="w-full mt-4 py-3 rounded-xl border border-white/[0.10] text-zinc-400 text-sm font-bold active:scale-95 transition-all">
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {/* ETAPA 2 — Formulário específico por modalidade */}
            {etapaCriacao === 'form' && (
              <>
                <div className="px-5 py-4 border-b border-white/[0.10] flex items-center justify-between">
                  <button onClick={() => setEtapaCriacao('modalidade')} className="text-zinc-500 text-[10px] uppercase tracking-widest flex items-center gap-1 hover:text-zinc-300 transition-colors">
                    ← Trocar modalidade
                  </button>
                  <span className="text-lg">{MODALIDADE_INFO[modalidadeForm].icone} {MODALIDADE_INFO[modalidadeForm].label}</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">Nome do ciclo</label>
                    <input value={nomeForm} onChange={e => setNomeForm(e.target.value)} placeholder="ex: Prep. Meia Maratona, Base Aeróbica…"
                      className="w-full bg-white/[0.07] border border-white/[0.10] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">Data de início</label>
                    <input type="date" value={dataInicioForm} onChange={e => setDataInicioForm(e.target.value)}
                      className="w-full bg-white/[0.07] border border-white/[0.10] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30" />
                  </div>

                  {modalidadeForm !== 'musculacao' && (
                    <>
                      <div>
                        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">Data da prova alvo</label>
                        <input type="date" value={dataProvaForm} onChange={e => setDataProvaForm(e.target.value)}
                          className="w-full bg-white/[0.07] border border-white/[0.10] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30" />
                        {semanasDisponiveis !== null && (
                          <p className="text-zinc-500 text-xs mt-1.5">
                            {semanasDisponiveis} {semanasDisponiveis === 1 ? 'semana disponível' : 'semanas disponíveis'} até a prova
                          </p>
                        )}
                      </div>

                      {modalidadeForm === 'triathlon' && (
                        <div>
                          <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">Distância da prova</label>
                          <select value={distanciaProvaForm} onChange={e => setDistanciaProvaForm(e.target.value as any)}
                            className="w-full bg-white/[0.07] border border-white/[0.10] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30">
                            <option value="sprint">Sprint</option>
                            <option value="olimpico">Olímpico</option>
                            <option value="70.3">70.3</option>
                            <option value="full">Full Ironman</option>
                          </select>
                        </div>
                      )}

                      {dataProvaForm && (
                        <button onClick={sugerirBlocos}
                          className="w-full text-center text-sm font-bold text-white bg-white/[0.07] border border-white/[0.12] rounded-2xl py-3 active:scale-[0.97] transition-all hover:border-white/20">
                          Sugerir blocos automaticamente
                        </button>
                      )}
                    </>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-zinc-500 text-[10px] uppercase tracking-wider">
                        Blocos · {blocosForm.reduce((s, b) => s + b.semanas, 0)} semanas total
                      </label>
                      <button onClick={addBloco} className="text-[10px] text-zinc-400 border border-white/[0.10] rounded-lg px-3 py-1.5 hover:border-white/20 active:scale-95 transition-all">+ Bloco</button>
                    </div>
                    <div className="space-y-3">
                      {blocosForm.map((b, i) => {
                        const cfg = getTipoCfg(b.tipo)
                        return (
                          <div key={i} className={`rounded-xl border ${cfg.border} overflow-hidden`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className={`px-4 py-3 ${cfg.bg} flex items-center gap-2`}>
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-white disabled:opacity-20 text-[9px] leading-none py-0.5">▲</button>
                                <button onClick={() => mover(i, 1)} disabled={i === blocosForm.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-20 text-[9px] leading-none py-0.5">▼</button>
                              </div>
                              <input value={b.nome} onChange={e => updateBloco(i, 'nome', e.target.value)} placeholder={`Bloco ${i + 1}`}
                                className={`flex-1 bg-transparent text-sm font-bold ${cfg.text} placeholder:text-zinc-600 focus:outline-none min-w-0`} />
                              <button onClick={() => removeBloco(i)} className="text-zinc-600 hover:text-red-400 text-xs active:scale-95 transition-all shrink-0">✕</button>
                            </div>
                            <div className="p-4 space-y-3">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1">Tipo / Fase</label>
                                  <input value={b.tipo} onChange={e => updateBloco(i, 'tipo', e.target.value)}
                                    placeholder="Ex: Hipertrofia, Força, Peaking…"
                                    list={`tipos-bloco-${i}`}
                                    className="w-full bg-white/[0.07] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                                  <datalist id={`tipos-bloco-${i}`}>
                                    {BLOCOS_DATALIST[modalidadeForm].map(v => <option key={v} value={v} />)}
                                  </datalist>
                                </div>
                                <div className="w-20">
                                  <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1">Semanas</label>
                                  <input type="number" min={1} max={16} value={b.semanas}
                                    onChange={e => updateBloco(i, 'semanas', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full bg-white/[0.07] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-xs text-center focus:outline-none focus:border-white/20" />
                                </div>
                              </div>
                              {unidadeVolume && (
                                <div>
                                  <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1">{unidadeVolume.label}</label>
                                  <input type="number" min={0} step={0.5} value={b.volume_alvo ?? ''}
                                    onChange={e => updateBloco(i, 'volume_alvo', e.target.value === '' ? null : parseFloat(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-white/[0.07] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                                </div>
                              )}
                              <div>
                                <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1">Orientações do bloco</label>
                                <textarea value={b.descricao} onChange={e => updateBloco(i, 'descricao', e.target.value)} rows={2}
                                  placeholder="Foco, rep ranges, intensidade, observações…"
                                  className="w-full bg-white/[0.07] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/20 placeholder:text-zinc-700 resize-none" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setCriando(false)}
                      className="flex-1 py-3 rounded-xl border border-white/[0.10] text-zinc-400 text-sm font-bold active:scale-95 transition-all">
                      Cancelar
                    </button>
                    <button onClick={salvar} disabled={salvando}
                      className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold active:scale-95 transition-all disabled:opacity-50">
                      {salvando ? 'Salvando…' : 'Salvar ciclo'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
