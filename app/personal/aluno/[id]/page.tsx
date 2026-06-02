'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import ProfissionalAIChat, { type ContextoProfissional } from '../../../components/ProfissionalAIChat'

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
type Execucao = { id: string; nome: string; plano: string; data: string; volume: number; seriesFeitas: number; exercicios: { nome: string; maxCarga: number; series: number }[] }
type CargaPonto = { data: string; carga: number }
type MedidaCP = { data: string; peso: number | null; gordura_pct: number | null; massa_muscular: number | null; cintura: number | null; quadril: number | null; braco_dir: number | null; coxa_dir: number | null }
type PlanoNutri = { calorias_meta: number | null; proteina_meta: number | null; created_at: string }

function getInitials(nome: string | null, email: string): string {
  if (nome) { const p = nome.trim().split(' '); return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0][0].toUpperCase() }
  return email[0].toUpperCase()
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
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
  const [personalNome, setPersonalNome] = useState('')
  const [execucoes, setExecucoes] = useState<Execucao[]>([])
  const [cargaEvolucao, setCargaEvolucao] = useState<Record<string, CargaPonto[]>>({})
  const [diasAtividade, setDiasAtividade] = useState<Map<string, 'treino' | 'livre'>>(new Map())
  const [medidasCP, setMedidasCP] = useState<MedidaCP[]>([])
  const [planoNutri, setPlanoNutri] = useState<PlanoNutri | null>(null)
  const [restricaoNutri, setRestricaoNutri] = useState<string | null>(null)
  const [lesoes, setLesoes] = useState<string | null>(null)
  const [restricaoFisica, setRestricaoFisica] = useState<string | null>(null)
  const [medicamentos, setMedicamentos] = useState<string | null>(null)
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<string | null>(null)
  const [fasePeriodizacaoChat, setFasePeriodizacaoChat] = useState<string | null>(null)
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [salvandoFicha, setSalvandoFicha] = useState(false)
  const [fichaPeso, setFichaPeso] = useState('')
  const [fichaAltura, setFichaAltura] = useState('')
  const [fichaSexo, setFichaSexo] = useState('')
  const [fichaNascimento, setFichaNascimento] = useState('')
  const [fichaObjetivo, setFichaObjetivo] = useState('')
  const [fichaMetaPeso, setFichaMetaPeso] = useState('')
  const [fichaMetaData, setFichaMetaData] = useState('')

  useEffect(() => { carregar() }, [clienteId])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const hoje = getTodayBR()
    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [{ data: perfil }, { data: treinosData }, { data: sonoHoje }, { data: bemEstarData }, { data: treinosHist }, { data: perfilPersonal }] = await Promise.all([
      supabase.from('perfis').select('id, nome, email, peso, objetivo, altura, sexo, data_nascimento, meta_peso, meta_data_limite, nivel, fcmax, ftp').eq('id', clienteId).single(),
      supabase.from('treinos').select('id, nome, descricao, plano, status, data').eq('cliente_id', clienteId).eq('personal_id', session.user.id).order('plano'),
      supabase.from('sono').select('score_recuperacao, duracao').eq('usuario_id', clienteId).eq('data', hoje).single(),
      supabase.from('bem_estar').select('humor, energia, motivacao, dor_muscular').eq('usuario_id', clienteId).gte('data', semanaStr).order('data', { ascending: false }),
      supabase.from('treinos').select('data, concluido').eq('cliente_id', clienteId).eq('concluido', true).order('data', { ascending: false }),
      supabase.from('perfis').select('nome').eq('id', session.user.id).single(),
    ])

    if (perfil) setAluno(perfil)
    if (perfilPersonal?.nome) setPersonalNome(perfilPersonal.nome)

    const bemMedia = bemEstarData?.length
      ? Math.round(bemEstarData.slice(0, 7).reduce((acc, b) => acc + ((b.humor + b.energia + b.motivacao) / 3), 0) / Math.min(bemEstarData.length, 7))
      : null

    setMonitor({
      scoreRecuperacao: sonoHoje?.score_recuperacao ?? null,
      sonoHoras: sonoHoje?.duracao ?? null,
      bemEstarMedia: bemMedia,
      totalTreinos: treinosHist?.length ?? 0,
      treinosSemana: treinosHist?.filter(t => t.data >= semanaStr).length ?? 0,
      ultimoTreino: treinosHist?.[0]?.data ?? null,
    })

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
    const [{ data: treinosCompletos }, { data: atvsLivres30 }, { data: medidasData }, { data: planoNutriData }, { data: anamneseNutri }, { data: ultimaAvalData }] = await Promise.all([
      supabase.from('treinos').select('id, nome, plano, data').eq('cliente_id', clienteId).eq('concluido', true).order('data', { ascending: false }).limit(30),
      supabase.from('atividades_livres').select('data, modalidade').eq('usuario_id', clienteId).gte('data', trintaStr).order('data', { ascending: false }),
      supabase.from('evolucao_medidas').select('data,peso,gordura_pct,massa_muscular,cintura,quadril,braco_dir,coxa_dir').eq('cliente_id', clienteId).order('data', { ascending: true }).limit(10),
      supabase.from('planos_nutricionais').select('calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('anamneses').select('restricoes_alimentares,suplementos,lesoes,restricoes_fisicas,medicamentos').eq('cliente_id', clienteId).not('profissional_id', 'is', null).order('criado_em', { ascending: false }).limit(5),
      supabase.from('agendamentos').select('data').eq('cliente_id', clienteId).eq('profissional_id', session.user.id).eq('status', 'realizado').order('data', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (medidasData?.length) setMedidasCP(medidasData as MedidaCP[])
    if (planoNutriData) setPlanoNutri(planoNutriData)
    // Collect food restrictions from any professional's anamnese
    const restricoes = (anamneseNutri ?? []).map((a: any) => a.restricoes_alimentares).filter(Boolean).join(' · ')
    if (restricoes) setRestricaoNutri(restricoes)
    const lesoesCombined = (anamneseNutri ?? []).map((a: any) => a.lesoes).filter(Boolean).join(' · ')
    const rfCombined = (anamneseNutri ?? []).map((a: any) => a.restricoes_fisicas).filter(Boolean).join(' · ')
    const medsCombined = (anamneseNutri ?? []).map((a: any) => a.medicamentos).filter(Boolean).join(' · ')
    if (lesoesCombined) setLesoes(lesoesCombined)
    if (rfCombined) setRestricaoFisica(rfCombined)
    if (medsCombined) setMedicamentos(medsCombined)
    if (ultimaAvalData?.data) setUltimaAvaliacao(ultimaAvalData.data)

    const diasMap = new Map<string, 'treino' | 'livre'>()
    atvsLivres30?.forEach((a: { data: string }) => diasMap.set(a.data, 'livre'))
    treinosCompletos?.forEach((t: { data: string }) => diasMap.set(t.data, 'treino'))
    setDiasAtividade(diasMap)

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
        return { id: t.id, nome: t.nome, plano: t.plano, data: t.data, volume: Math.round(vol), seriesFeitas: srsT.length, exercicios: exerciciosExec }
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
    }

    // Fase de periodização para o chat
    const { data: periAtiva } = await supabase.from('periodizacoes').select('id,data_inicio').eq('cliente_id', clienteId).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (periAtiva) {
      const { data: blocos } = await supabase.from('blocos_periodizacao').select('nome,tipo,semanas,ordem').eq('periodizacao_id', periAtiva.id).order('ordem')
      if (blocos?.length) {
        const inicio = new Date(periAtiva.data_inicio + 'T12:00:00-03:00')
        const diasTotais = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24))
        const semanaTotal = Math.max(1, Math.floor(diasTotais / 7) + 1)
        let acum = 0, blocoIdx = blocos.length - 1
        for (let i = 0; i < blocos.length; i++) {
          if (semanaTotal <= acum + (blocos[i] as any).semanas) { blocoIdx = i; break }
          acum += (blocos[i] as any).semanas
        }
        const b = blocos[blocoIdx] as any
        const semanaNoBloco = semanaTotal - acum
        setFasePeriodizacaoChat(`${b.nome} (${b.tipo}) — semana ${semanaNoBloco} de ${b.semanas}`)
      }
    }

    setCarregando(false)
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
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#0d1117] text-white">
      <div className="max-w-md mx-auto px-4 pb-12" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        <div className="mb-6">
          <button onClick={() => router.push('/personal')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">← Alunos</button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 font-black text-base">{aluno ? getInitials(aluno.nome, aluno.email) : '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{aluno?.nome ?? aluno?.email ?? 'Aluno'}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {aluno?.peso && <span className="text-[10px] text-zinc-500 bg-white/[0.07] border border-white/[0.11] rounded-full px-2 py-0.5">{aluno.peso}kg</span>}
                {aluno?.objetivo && <span className="text-[10px] text-zinc-500 bg-white/[0.07] border border-white/[0.11] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[aluno.objetivo] ?? aluno.objetivo}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Alertas clínicos */}
        {(lesoes || restricaoFisica || medicamentos) && (
          <div className="rounded-2xl border border-red-500/20 mb-5 overflow-hidden" style={{ background: '#201212' }}>
            <div className="px-5 py-3 flex items-center gap-2 border-b border-red-500/10">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-red-300 text-[10px] uppercase tracking-[0.15em] font-bold">Alertas clínicos</p>
            </div>
            <div className="px-5 py-3 flex flex-col gap-2">
              {lesoes && (
                <div>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Lesões</p>
                  <p className="text-red-200/80 text-[11px] leading-relaxed">{lesoes}</p>
                </div>
              )}
              {restricaoFisica && (
                <div>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Restrições físicas</p>
                  <p className="text-amber-200/80 text-[11px] leading-relaxed">{restricaoFisica}</p>
                </div>
              )}
              {medicamentos && (
                <div>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Medicamentos</p>
                  <p className="text-zinc-300/80 text-[11px] leading-relaxed">{medicamentos}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monitoramento de hoje */}
        {monitor && (
          <div className="rounded-2xl p-4 border border-white/[0.11] mb-5" style={{ background: '#161c2c' }}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Monitoramento hoje</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Score de recuperação */}
              <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.14]">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Recuperação</p>
                {monitor.scoreRecuperacao ? (
                  <p className={`text-xl font-black ${monitor.scoreRecuperacao >= 70 ? 'text-emerald-400' : monitor.scoreRecuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {monitor.scoreRecuperacao}<span className="text-xs font-normal text-zinc-600">/100</span>
                  </p>
                ) : <p className="text-zinc-600 text-lg font-black">—</p>}
              </div>
              {/* Sono */}
              <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.14]">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Sono</p>
                {monitor.sonoHoras ? (
                  <p className="text-xl font-black text-white">{monitor.sonoHoras}<span className="text-xs font-normal text-zinc-600">h</span></p>
                ) : <p className="text-zinc-600 text-lg font-black">—</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.14]">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Bem-estar</p>
                {monitor.bemEstarMedia ? (
                  <p className={`text-base font-black ${monitor.bemEstarMedia >= 4 ? 'text-emerald-400' : monitor.bemEstarMedia >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {monitor.bemEstarMedia}<span className="text-[9px] font-normal text-zinc-600">/5</span>
                  </p>
                ) : <p className="text-zinc-600 text-base font-black">—</p>}
                <p className="text-zinc-700 text-[9px] mt-0.5">média 7d</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.14]">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Treinos</p>
                <p className="text-white text-base font-black">{monitor.treinosSemana}<span className="text-[9px] font-normal text-zinc-600">x</span></p>
                <p className="text-zinc-700 text-[9px] mt-0.5">na semana</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.14]">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Inatividade</p>
                {monitor.ultimoTreino ? (
                  <p className={`text-base font-black ${diasSemTreinar(monitor.ultimoTreino) <= 2 ? 'text-emerald-400' : diasSemTreinar(monitor.ultimoTreino) <= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {diasSemTreinar(monitor.ultimoTreino)}<span className="text-[9px] font-normal text-zinc-600">d</span>
                  </p>
                ) : <p className="text-zinc-600 text-base font-black">—</p>}
                <p className="text-zinc-700 text-[9px] mt-0.5">sem treinar</p>
              </div>
            </div>
            {(aluno?.nivel || aluno?.fcmax || aluno?.ftp || ultimaAvaliacao) && (
              <div className="mt-3 pt-3 border-t border-white/[0.09] flex flex-wrap gap-2">
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
                  <span className="text-[10px] text-zinc-400 bg-white/[0.05] border border-white/[0.11] rounded-full px-2.5 py-0.5">
                    Última aval.: {new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plano nutricional ativo — prescrito pela nutricionista */}
        {(planoNutri || restricaoNutri) && (
          <div className="rounded-2xl border border-green-500/20 mb-5 overflow-hidden" style={{ background: '#081209' }}>
            <div className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
                <span className="text-sm">🥗</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-green-300 text-[10px] uppercase tracking-[0.15em] font-bold">Nutrição prescrita</p>
                {planoNutri && (
                  <div className="flex gap-3 mt-0.5">
                    {planoNutri.calorias_meta && <span className="text-white text-sm font-bold">{planoNutri.calorias_meta} <span className="text-zinc-500 font-normal text-[11px]">kcal</span></span>}
                    {planoNutri.proteina_meta && <span className="text-blue-300 text-sm font-bold">{planoNutri.proteina_meta}<span className="text-zinc-500 font-normal text-[11px]">g prot</span></span>}
                  </div>
                )}
              </div>
              {planoNutri?.created_at && (
                <span className="text-zinc-600 text-[9px] shrink-0">
                  {new Date(planoNutri.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })}
                </span>
              )}
            </div>
            {restricaoNutri && (
              <div className="px-5 py-2.5 border-t border-green-500/10 flex items-start gap-2">
                <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚠️</span>
                <p className="text-amber-300/80 text-[11px] leading-relaxed">{restricaoNutri}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => router.push(`/anamnese/${clienteId}`)}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.14] bg-white/[0.05] hover:border-white/20 active:scale-[0.97] transition-all text-left">
            <span className="text-xl shrink-0">📋</span>
            <div>
              <p className="text-white text-sm font-bold">Anamnese</p>
              <p className="text-zinc-600 text-[10px]">Ficha de saúde</p>
            </div>
          </button>
          <button onClick={() => router.push(`/evolucao-medidas/${clienteId}`)}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.14] bg-white/[0.05] hover:border-white/20 active:scale-[0.97] transition-all text-left">
            <span className="text-xl shrink-0">📏</span>
            <div>
              <p className="text-white text-sm font-bold">Medidas</p>
              <p className="text-zinc-600 text-[10px]">Evolução corporal</p>
            </div>
          </button>
          <button onClick={() => router.push(`/personal/periodizacao/${clienteId}`)}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.14] bg-white/[0.05] hover:border-white/20 active:scale-[0.97] transition-all text-left col-span-2">
            <span className="text-xl shrink-0">📅</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">Periodização</p>
              <p className="text-zinc-600 text-[10px]">Blocos de treinamento</p>
            </div>
          </button>
        </div>

        {/* Ficha do aluno */}
        <div className="rounded-2xl border border-white/[0.11] mb-5 overflow-hidden" style={{ background: '#161c2c' }}>
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
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Ficha do aluno</p>
              {!editandoFicha && (
                <>
                  {aluno?.peso && <span className="text-[9px] text-zinc-600 bg-white/[0.05] border border-white/[0.09] rounded-full px-2 py-0.5">{aluno.peso}kg</span>}
                  {aluno?.altura && <span className="text-[9px] text-zinc-600 bg-white/[0.05] border border-white/[0.09] rounded-full px-2 py-0.5">{aluno.altura}cm</span>}
                  {aluno?.objetivo && <span className="text-[9px] text-zinc-600 bg-white/[0.05] border border-white/[0.09] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[aluno.objetivo] ?? aluno.objetivo}</span>}
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
                    className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.11]" />
                </div>
                <div>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Altura (cm)</p>
                  <input type="number" value={fichaAltura} onChange={e => setFichaAltura(e.target.value)}
                    placeholder="175"
                    className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.11]" />
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
                  className="w-full bg-white/[0.07] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.11]" />
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
                      className="w-full bg-white/[0.07] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30 border border-white/[0.11]" />
                  </div>
                  <div>
                    <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Prazo</p>
                    <input type="date" value={fichaMetaData} onChange={e => setFichaMetaData(e.target.value)}
                      className="w-full bg-white/[0.07] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30 border border-white/[0.11]"
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

        {/* Composição Corporal — empty state */}
        {medidasCP.length === 0 && (
          <div className="rounded-2xl border border-white/[0.11] mb-5 px-5 py-8 flex flex-col items-center gap-3 text-center" style={{ background: '#161c2c' }}>
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

        {/* Composição Corporal */}
        {medidasCP.length >= 2 && (() => {
          const ultima = medidasCP[medidasCP.length - 1]
          const primeira = medidasCP[0]
          type MetricaDef = { key: keyof MedidaCP; label: string; unit: string; cor: string; inverse?: boolean }
          const metricas: MetricaDef[] = [
            { key: 'peso',           label: 'Peso',         unit: 'kg', cor: '#94a3b8' },
            { key: 'gordura_pct',    label: '% Gordura',    unit: '%',  cor: '#f97316', inverse: true },
            { key: 'massa_muscular', label: 'Massa musc.',  unit: 'kg', cor: '#34d399' },
            { key: 'cintura',        label: 'Cintura',      unit: 'cm', cor: '#a78bfa', inverse: true },
            { key: 'quadril',        label: 'Quadril',      unit: 'cm', cor: '#60a5fa' },
            { key: 'braco_dir',      label: 'Braço',        unit: 'cm', cor: '#fb923c' },
            { key: 'coxa_dir',       label: 'Coxa',         unit: 'cm', cor: '#f472b6' },
          ].filter(m => ultima[m.key] != null && primeira[m.key] != null)
          if (!metricas.length) return null
          function sparkline(key: keyof MedidaCP, cor: string) {
            const pts = medidasCP.filter(m => m[key] != null)
            if (pts.length < 2) return null
            const vals = pts.map(m => m[key] as number)
            const W = 56, H = 24, maxV = Math.max(...vals), minV = Math.min(...vals), range = maxV - minV || 1
            const xStep = W / Math.max(pts.length - 1, 1)
            const toY = (v: number) => H - 3 - ((v - minV) / range) * (H - 6)
            const d = vals.map((v, j) => `${j === 0 ? 'M' : 'L'}${(j * xStep).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
            return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible"><path d={d} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />{vals.map((v, j) => <circle key={j} cx={j * xStep} cy={toY(v)} r="2" fill={cor} />)}</svg>
          }
          return (
            <div className="rounded-2xl border border-white/[0.11] mb-5 overflow-hidden" style={{ background: '#161c2c' }}>
              <div className="px-5 py-4 border-b border-white/[0.14] flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Composição Corporal</p>
                <p className="text-zinc-600 text-[9px]">{medidasCP.length} registros</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {metricas.map(m => {
                  const cur = ultima[m.key] as number
                  const ini = primeira[m.key] as number
                  const delta = Math.round((cur - ini) * 10) / 10
                  const positivo = m.inverse ? delta < 0 : delta > 0
                  const deltaCor = delta === 0 ? 'text-zinc-600' : positivo ? 'text-emerald-400' : 'text-red-400'
                  return (
                    <div key={m.key} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-400 text-[10px] uppercase tracking-wider">{m.label}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-white text-lg font-bold">{cur}</span>
                          <span className="text-zinc-600 text-[10px]">{m.unit}</span>
                          {delta !== 0 && <span className={`text-[10px] font-bold ${deltaCor}`}>{delta > 0 ? '+' : ''}{delta}{m.unit}</span>}
                        </div>
                      </div>
                      {sparkline(m.key, m.cor)}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Calendário de aderência - 28 dias */}
        <div className="rounded-2xl p-5 border border-white/[0.11] mb-5" style={{ background: '#161c2c' }}>
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Calendário de aderência · 28 dias</p>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }, (_, i) => {
              const d = new Date(getTodayBR() + 'T12:00:00-03:00')
              d.setDate(d.getDate() - (27 - i))
              const ds = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
              const tipo = diasAtividade.get(ds)
              const isHoje = ds === getTodayBR()
              return (
                <div key={i} className={[
                  'aspect-square rounded-lg flex items-center justify-center text-[8px] font-bold',
                  tipo === 'treino' ? 'bg-emerald-500/75 text-black' : tipo === 'livre' ? 'bg-blue-500/60 text-white' : 'bg-white/[0.07] text-zinc-800',
                  isHoje ? 'ring-1 ring-white/30' : '',
                ].join(' ')}>
                  {d.getDate()}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/75" /><span className="text-zinc-600 text-[9px]">Musculação</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500/60" /><span className="text-zinc-600 text-[9px]">Atividade livre</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-white/[0.07] border border-white/[0.14]" /><span className="text-zinc-600 text-[9px]">Descanso</span></div>
          </div>
        </div>

        {(() => {
          // Mostrar planos criados + próximo disponível (até o máximo)
          const planosComTreino = PLANOS_MAX.filter(p => treinos.some(t => t.plano === p))
          const proximoPlano = PLANOS_MAX.find(p => !treinos.some(t => t.plano === p))
          const planosVisiveis = proximoPlano ? [...planosComTreino, proximoPlano] : planosComTreino
          return (
            <div className="flex gap-2 mb-6 flex-wrap">
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
            <div className={`rounded-2xl p-5 border ${cores.border} mb-4`} style={{ background: '#161c2c' }}>
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
            <button onClick={abrirNovo} className="w-full border border-white/[0.14] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all tracking-wide">
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
      </div>

      {/* Últimas execuções */}
      {execucoes.length > 0 && (
        <div className="rounded-2xl border border-white/[0.11] mb-5 overflow-hidden" style={{ background: '#161c2c' }}>
          <div className="px-5 py-4 border-b border-white/[0.14]">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Últimas execuções</p>
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
                        <span key={e.nome} className="text-[10px] text-zinc-400 bg-white/[0.05] border border-white/[0.11] rounded-lg px-2 py-0.5">
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
          <div className="rounded-2xl border border-white/[0.11] mb-5 overflow-hidden" style={{ background: '#161c2c' }}>
            <div className="px-5 py-4 border-b border-white/[0.14]">
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Evolução de carga · Plano {planoAtivo}</p>
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

      {modalAberto && editandoTreino && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-t-3xl border border-white/[0.14] overflow-hidden" style={{ background: '#161c2c', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

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
                    <div key={i} className="bg-white/[0.05] rounded-2xl p-4 border border-white/[0.09]">
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
        }} pacienteId={clienteId} />
      )}

      {/* Modal confirmação de delete */}
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
    </main>
  )
}