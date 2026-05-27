'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import NavBar from '../../../components/NavBar'
import AlimentoBusca, { type AlimentoTACO } from '../../../components/AlimentoBusca'

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
type MedidaCP = { data: string; peso: number | null; gordura_pct: number | null; massa_muscular: number | null; cintura: number | null; quadril: number | null; braco_dir: number | null; coxa_dir: number | null }
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
  const [abaAtiva, setAbaAtiva] = useState<'hoje' | 'plano'>('hoje')
  const [carregando, setCarregando] = useState(true)

  // editor
  const [medidasCP, setMedidasCP] = useState<MedidaCP[]>([])
  const [periodizacaoFase, setPeriodizacaoFase] = useState<PeriodizacaoFase | null>(null)
  const [historicoMetas, setHistoricoMetas] = useState<MetaHistorico[]>([])

  const [caloriasSemanais, setCaloriasSemanais] = useState<number | null>(null)
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<string | null>(null)
  const [anamneseLesoes, setAnamneseLesoes] = useState<string | null>(null)
  const [anamneseRestricaoFisica, setAnamneseRestricaoFisica] = useState<string | null>(null)
  const [anamneseMedicamentos, setAnamneseMedicamentos] = useState<string | null>(null)
  const [anamneseAlergias, setAnamneseAlergias] = useState<string | null>(null)

  const [editandoFicha, setEditandoFicha] = useState(false)
  const [salvandoFicha, setSalvandoFicha] = useState(false)
  const [fichaPeso, setFichaPeso] = useState('')
  const [fichaAltura, setFichaAltura] = useState('')
  const [fichaSexo, setFichaSexo] = useState('')
  const [fichaNascimento, setFichaNascimento] = useState('')
  const [fichaObjetivo, setFichaObjetivo] = useState('')
  const [fichaMetaPeso, setFichaMetaPeso] = useState('')
  const [fichaMetaData, setFichaMetaData] = useState('')

  const [editandoPlano, setEditandoPlano] = useState(false)
  const [salvandoEd, setSalvandoEd] = useState(false)
  const [refeicoesEd, setRefeicoesEd] = useState<RefeicaoEd[]>([])
  const [notaEd, setNotaEd] = useState('')
  const [extrasEd, setExtrasEd] = useState<ExtrasEd>(EXTRAS_VAZIO)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 6)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const [
        { data: perfil }, { data: treinos7d },
        { data: trHoje }, { data: sono }, { data: bem }, { data: plano },
        { data: medidas }, { data: historicoData }, { data: periData },
        { data: anamneseData }, { data: ultimaAvalData },
      ] = await Promise.all([
        supabase.from('perfis').select('id,nome,email,peso,objetivo,altura,sexo,data_nascimento,meta_peso,meta_data_limite,nivel,fcmax,ftp').eq('id', clienteId).single(),
        supabase.from('treinos').select('data,calorias_estimadas').eq('cliente_id', clienteId).gte('data', semStr).eq('concluido', true),
        supabase.from('treinos').select('data,plano,calorias_estimadas').eq('cliente_id', clienteId).eq('data', hoje).eq('concluido', true).maybeSingle(),
        supabase.from('sono').select('score_recuperacao,duracao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('bem_estar').select('humor,energia,motivacao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('planos_nutricionais').select('id,conteudo,calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('evolucao_medidas').select('data,peso,gordura_pct,massa_muscular,cintura,quadril,braco_dir,coxa_dir').eq('cliente_id', clienteId).order('data', { ascending: true }).limit(10),
        supabase.from('planos_nutricionais').select('calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).order('created_at', { ascending: true }).limit(12),
        supabase.from('periodizacoes').select('id,nome,data_inicio').eq('cliente_id', clienteId).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1),
        supabase.from('anamneses').select('lesoes,restricoes_fisicas,medicamentos,alergias,restricoes_alimentares').eq('cliente_id', clienteId).not('profissional_id', 'is', null).order('criado_em', { ascending: false }).limit(5),
        supabase.from('agendamentos').select('data').eq('cliente_id', clienteId).eq('status', 'realizado').order('data', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (perfil) setPaciente(perfil)
      setTreinos7dDatas((treinos7d ?? []).map((t: any) => t.data))
      const calSem = (treinos7d ?? []).reduce((s: number, t: any) => s + (t.calorias_estimadas ?? 0), 0)
      if (calSem > 0) setCaloriasSemanais(calSem)
      if (ultimaAvalData?.data) setUltimaAvaliacao(ultimaAvalData.data)
      const lesoes = (anamneseData ?? []).map((a: any) => a.lesoes).filter(Boolean).join(' · ')
      const rf = (anamneseData ?? []).map((a: any) => a.restricoes_fisicas).filter(Boolean).join(' · ')
      const meds = (anamneseData ?? []).map((a: any) => a.medicamentos).filter(Boolean).join(' · ')
      const alerg = (anamneseData ?? []).map((a: any) => [a.alergias, a.restricoes_alimentares].filter(Boolean).join(', ')).filter(Boolean).join(' · ')
      if (lesoes) setAnamneseLesoes(lesoes)
      if (rf) setAnamneseRestricaoFisica(rf)
      if (meds) setAnamneseMedicamentos(meds)
      if (alerg) setAnamneseAlergias(alerg)
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

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
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
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="mb-5">
          <button onClick={() => router.push('/nutricionista/pacientes')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">
            ← Pacientes
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 font-black text-base">{paciente ? getInitials(paciente.nome, paciente.email) : '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{paciente?.nome ?? paciente?.email ?? 'Paciente'}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {paciente?.peso && <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">{paciente.peso}kg</span>}
                {paciente?.objetivo && <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</span>}
                {metaCal && <span className="text-[10px] text-green-500/70 bg-green-500/5 border border-green-500/15 rounded-full px-2 py-0.5">Meta: {metaCal}kcal</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => router.push(`/anamnese/${clienteId}`)}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-white/20 active:scale-[0.97] transition-all text-left">
            <span className="text-xl shrink-0">📋</span>
            <div>
              <p className="text-white text-sm font-bold">Anamnese</p>
              <p className="text-zinc-600 text-[10px]">Ficha de saúde</p>
            </div>
          </button>
          <button onClick={() => router.push(`/evolucao-medidas/${clienteId}`)}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-white/20 active:scale-[0.97] transition-all text-left">
            <span className="text-xl shrink-0">📏</span>
            <div>
              <p className="text-white text-sm font-bold">Medidas</p>
              <p className="text-zinc-600 text-[10px]">Evolução corporal</p>
            </div>
          </button>
        </div>

        {/* Ficha do paciente */}
        <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
          <button
            onClick={() => {
              if (!editandoFicha) {
                setFichaPeso(String(paciente?.peso ?? ''))
                setFichaAltura(String(paciente?.altura ?? ''))
                setFichaSexo(paciente?.sexo ?? '')
                setFichaNascimento(paciente?.data_nascimento ?? '')
                setFichaObjetivo(paciente?.objetivo ?? '')
                setFichaMetaPeso(String(paciente?.meta_peso ?? ''))
                setFichaMetaData(paciente?.meta_data_limite ?? '')
              }
              setEditandoFicha(p => !p)
            }}
            className="w-full flex items-center justify-between px-5 py-4 text-left active:opacity-80">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Ficha do paciente</p>
              {!editandoFicha && (
                <>
                  {paciente?.peso && <span className="text-[9px] text-zinc-600 bg-white/[0.03] border border-white/[0.05] rounded-full px-2 py-0.5">{paciente.peso}kg</span>}
                  {paciente?.altura && <span className="text-[9px] text-zinc-600 bg-white/[0.03] border border-white/[0.05] rounded-full px-2 py-0.5">{paciente.altura}cm</span>}
                  {paciente?.objetivo && <span className="text-[9px] text-zinc-600 bg-white/[0.03] border border-white/[0.05] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</span>}
                  {paciente?.meta_peso && <span className="text-[9px] text-emerald-600 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-full px-2 py-0.5">Meta: {paciente.meta_peso}kg</span>}
                  {!paciente?.peso && !paciente?.altura && !paciente?.objetivo && <span className="text-[9px] text-zinc-700">Preencher dados</span>}
                </>
              )}
            </div>
            <span className={`text-zinc-600 text-xs transition-transform duration-200 ${editandoFicha ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {editandoFicha && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/[0.04]">
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Peso (kg)</p>
                  <input type="number" value={fichaPeso} onChange={e => setFichaPeso(e.target.value)}
                    placeholder="65.0"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]" />
                </div>
                <div>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Altura (cm)</p>
                  <input type="number" value={fichaAltura} onChange={e => setFichaAltura(e.target.value)}
                    placeholder="165"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]" />
                </div>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Sexo</p>
                <div className="flex gap-2">
                  {['masculino', 'feminino', 'outro'].map(v => (
                    <button key={v} onClick={() => setFichaSexo(v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${fichaSexo === v ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-zinc-400 border-white/[0.08]'}`}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Data de nascimento</p>
                <input type="date" value={fichaNascimento} onChange={e => setFichaNascimento(e.target.value)}
                  className="w-full bg-white/[0.04] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]" />
              </div>
              <div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Objetivo</p>
                <div className="flex flex-wrap gap-2">
                  {[['perder_peso','Perder peso'],['ganhar_massa','Ganhar massa'],['melhorar_condicionamento','Condicionamento'],['saude_geral','Saúde geral']].map(([v, l]) => (
                    <button key={v} onClick={() => setFichaObjetivo(v)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${fichaObjetivo === v ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-zinc-400 border-white/[0.08]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/[0.04] pt-3">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-2.5">Meta de peso</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Peso-alvo (kg)</p>
                    <input type="number" step="0.5" value={fichaMetaPeso} onChange={e => setFichaMetaPeso(e.target.value)}
                      placeholder="Ex: 62"
                      className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30 border border-white/[0.06]" />
                  </div>
                  <div>
                    <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Prazo</p>
                    <input type="date" value={fichaMetaData} onChange={e => setFichaMetaData(e.target.value)}
                      className="w-full bg-white/[0.04] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/30 border border-white/[0.06]"
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
            <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
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

        {/* Fase de treinamento — prescrita pelo personal */}
        {periodizacaoFase && (() => {
          const TIPO_COR: Record<string, { text: string; bg: string; border: string; dot: string }> = {
            hipertrofia: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
            forca:       { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25',    dot: 'bg-blue-400'    },
            deload:      { text: 'text-zinc-400',    bg: 'bg-zinc-500/10',    border: 'border-zinc-500/25',    dot: 'bg-zinc-400'    },
            potencia:    { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/25',  dot: 'bg-orange-400'  },
            resistencia: { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/25',  dot: 'bg-purple-400'  },
          }
          const AJUSTE: Record<string, { pct: number; label: string }> = {
            hipertrofia: { pct:  0.10, label: 'Superávit para hipertrofia' },
            forca:       { pct:  0.05, label: 'Leve superávit para força' },
            deload:      { pct: -0.08, label: 'Redução na semana de deload' },
            potencia:    { pct:  0.07, label: 'Combustível para potência' },
            resistencia: { pct:  0.05, label: 'Suporte energético' },
          }
          const cfg = TIPO_COR[periodizacaoFase.tipo_bloco] ?? TIPO_COR.hipertrofia
          const ajuste = AJUSTE[periodizacaoFase.tipo_bloco]
          const metaAtual = planoAtivo?.calorias_meta
          const delta = metaAtual && ajuste ? Math.round(metaAtual * ajuste.pct) : null
          const pct = (periodizacaoFase.semana_bloco / periodizacaoFase.total_semanas_bloco) * 100
          return (
            <div className={`rounded-2xl border ${cfg.border} mb-4 overflow-hidden`} style={{ background: '#080f0d' }}>
              <div className="px-5 py-3.5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0`}>
                  <span className="text-sm">🏋️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase tracking-[0.15em] font-bold ${cfg.text}`}>Treino · {periodizacaoFase.nome_ciclo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-white text-sm font-bold">{periodizacaoFase.nome_bloco}</span>
                    <span className="text-zinc-600 text-[10px]">sem. {periodizacaoFase.semana_bloco}/{periodizacaoFase.total_semanas_bloco}</span>
                    {periodizacaoFase.plano_associado && <span className="text-zinc-600 text-[10px]">· Plano {periodizacaoFase.plano_associado}</span>}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-3">
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                </div>
                {delta !== null && (
                  <div className="flex items-center gap-2 mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <span className={`text-sm font-black ${delta >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{delta >= 0 ? '+' : ''}{delta} kcal</span>
                    <p className="text-zinc-500 text-[11px] flex-1">{ajuste?.label} · meta sugerida: <span className="text-white font-semibold">{(metaAtual! + delta).toLocaleString('pt-BR')} kcal</span></p>
                  </div>
                )}
                {!metaAtual && ajuste && (
                  <p className="text-zinc-600 text-[11px] mt-1">Prescreva um plano nutricional para ver a sugestão por fase.</p>
                )}
              </div>
            </div>
          )
        })()}

        {/* Abas */}
        <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {([['hoje', '📊 Hoje'], ['plano', '🥗 Plano']] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setAbaAtiva(id); setEditandoPlano(false) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${abaAtiva === id ? 'bg-white text-black' : 'text-zinc-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ABA HOJE ─────────────────────────────────────────────────── */}
        {abaAtiva === 'hoje' && (
          <div className="space-y-4">

            {/* Alertas clínicos */}
            {(anamneseLesoes || anamneseRestricaoFisica || anamneseMedicamentos || anamneseAlergias) && (
              <div className="rounded-2xl border border-red-500/20 overflow-hidden" style={{ background: '#140a0a' }}>
                <div className="px-5 py-3 flex items-center gap-2 border-b border-red-500/10">
                  <span className="text-red-400 text-sm">⚠</span>
                  <p className="text-red-300 text-[10px] uppercase tracking-[0.15em] font-bold">Alertas clínicos</p>
                </div>
                <div className="px-5 py-3 flex flex-col gap-2">
                  {anamneseLesoes && (
                    <div>
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Lesões</p>
                      <p className="text-red-200/80 text-[11px] leading-relaxed">{anamneseLesoes}</p>
                    </div>
                  )}
                  {anamneseRestricaoFisica && (
                    <div>
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Restrições físicas</p>
                      <p className="text-amber-200/80 text-[11px] leading-relaxed">{anamneseRestricaoFisica}</p>
                    </div>
                  )}
                  {anamneseMedicamentos && (
                    <div>
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Medicamentos</p>
                      <p className="text-zinc-300/80 text-[11px] leading-relaxed">{anamneseMedicamentos}</p>
                    </div>
                  )}
                  {anamneseAlergias && (
                    <div>
                      <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Alergias / Restrições alimentares</p>
                      <p className="text-amber-300/80 text-[11px] leading-relaxed">{anamneseAlergias}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recuperação */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">😴 Recuperação hoje</p>
              {sonoHoje?.score_recuperacao != null ? (
                <div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className={`text-5xl font-black leading-none ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {sonoHoje.score_recuperacao}
                    </span>
                    <span className="text-zinc-600 text-xl mb-1">/100</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all ${sonoHoje.score_recuperacao >= 70 ? 'bg-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${sonoHoje.score_recuperacao}%` }} />
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {sonoHoje.score_recuperacao >= 85 ? 'Excelente recuperação' : sonoHoje.score_recuperacao >= 70 ? 'Boa recuperação' : sonoHoje.score_recuperacao >= 55 ? 'Recuperação moderada' : 'Recuperação baixa'}
                  </p>
                  {sonoHoje.duracao && <p className="text-zinc-600 text-xs">Dormiu {sonoHoje.duracao}h esta noite</p>}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-2xl mb-2">🌙</p>
                  <p className="text-zinc-500 text-sm">Sem registro de sono hoje</p>
                </div>
              )}
            </div>

            {/* Treino hoje */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">🏋️ Treino hoje</p>
              {treinoHoje ? (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-emerald-400 text-base">✓</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{treinoHoje.plano ?? 'Treino concluído'}</p>
                      <p className="text-emerald-400 text-xs">Completou treino hoje</p>
                    </div>
                  </div>
                  {treinoHoje.calorias_estimadas != null && treinoHoje.calorias_estimadas > 0 && (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] mt-3">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-0.5">Gasto estimado</p>
                      <p className="text-orange-400 font-black text-base">{treinoHoje.calorias_estimadas} <span className="text-xs font-normal text-zinc-500">kcal</span></p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-zinc-600 text-lg">—</span>
                  </div>
                  <p className="text-zinc-500 text-sm">Sem treino registrado hoje</p>
                </div>
              )}
            </div>

            {/* Bem-estar */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">⚡ Bem-estar hoje</p>
              {bemEstar ? (
                <div className="space-y-3">
                  {([
                    { label: 'Humor', val: bemEstar.humor },
                    { label: 'Energia', val: bemEstar.energia },
                    { label: 'Motivação', val: bemEstar.motivacao },
                  ] as { label: string; val: number }[]).map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-3">
                      <p className="text-zinc-500 text-xs w-16 shrink-0">{label}</p>
                      <div className="flex gap-1.5 flex-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`flex-1 h-2.5 rounded-full ${i <= val ? (val >= 4 ? 'bg-green-400' : val >= 3 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/[0.08]'}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-bold w-7 text-right shrink-0 ${val >= 4 ? 'text-green-400' : val >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>{val}/5</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-zinc-600 text-sm">Sem registro de bem-estar hoje</p>
                </div>
              )}
            </div>

            {/* Treinos — 7 dias */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Treinos — últimos 7 dias</p>
              <div className="flex gap-1.5">
                {dias7d.map((dia) => {
                  const treinoNoDia = treinos7dDatas.includes(dia)
                  const isHoje = dia === hoje
                  const [,mm,dd] = dia.split('-')
                  return (
                    <div key={dia} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm ${treinoNoDia ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-white/[0.04] border border-white/[0.06] text-zinc-700'}`}>
                        {treinoNoDia ? '✓' : '·'}
                      </div>
                      <p className={`text-[8px] uppercase tracking-wider ${isHoje ? 'text-white' : 'text-zinc-700'}`}>{dd}/{mm}</p>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-md bg-blue-500/30 border border-blue-500/40" />
                  <span className="text-zinc-600 text-[9px]">Treinou</span>
                </div>
                <span className={`text-xs font-bold ml-auto ${treinos7dDatas.length >= 4 ? 'text-blue-400' : treinos7dDatas.length >= 2 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                  {treinos7dDatas.length}/7 dias
                </span>
                {caloriasSemanais != null && caloriasSemanais > 0 && (
                  <span className="text-orange-400 text-[10px] font-bold">
                    {caloriasSemanais.toLocaleString('pt-BR')} kcal gastos
                  </span>
                )}
              </div>
            </div>

            {/* Perfil atlético */}
            {(paciente?.nivel || paciente?.fcmax || paciente?.ftp || ultimaAvaliacao) && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Perfil atlético</p>
                <div className="flex flex-wrap gap-2">
                  {paciente?.nivel && (
                    <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                      Nível: {paciente.nivel}
                    </span>
                  )}
                  {paciente?.fcmax && (
                    <span className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-0.5">
                      FC máx: {paciente.fcmax} bpm
                    </span>
                  )}
                  {paciente?.ftp && (
                    <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                      FTP: {paciente.ftp}W
                    </span>
                  )}
                  {ultimaAvaliacao && (
                    <span className="text-[10px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-0.5">
                      Última aval.: {new Date(ultimaAvaliacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </span>
                  )}
                </div>
              </div>
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
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                  <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Evolução das metas nutricionais</p>
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
                <div className="rounded-2xl border border-green-500/20 px-4 py-3.5" style={{ background: '#0a0d14' }}>
                  <p className="text-green-400 text-[9px] uppercase tracking-wider mb-2">Nota clínica</p>
                  <textarea value={notaEd} onChange={e => setNotaEd(e.target.value)}
                    placeholder="Orientação geral sobre o plano para o paciente..."
                    rows={2} className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-green-500/30 border border-white/[0.06] resize-none" />
                </div>

                {/* Refeições */}
                {refeicoesEd.map((ref, rIdx) => {
                  const refCal = sumAl(ref.alimentos, 'calorias')
                  const refProt = sumAl(ref.alimentos, 'proteina')
                  return (
                    <div key={rIdx} className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: '#0f0f0f' }}>
                      {/* header refeição */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]" style={{ background: '#111' }}>
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
                            className="col-span-2 bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]" />
                          <input value={ref.horario} onChange={e => updateRefeicao(rIdx, 'horario', e.target.value)}
                            placeholder="07:00"
                            className="bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06] text-center" />
                        </div>

                        {/* alimentos */}
                        <div className="space-y-2">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimentos</p>
                          {ref.alimentos.map((al, aIdx) => (
                            <div key={aIdx} className="rounded-xl border border-white/[0.05] p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center gap-2">
                                <AlimentoBusca
                                  value={al.nome}
                                  onChange={v => updateAlimento(rIdx, aIdx, 'nome', v)}
                                  onSelect={taco => handleSelectTACO(rIdx, aIdx, taco)}
                                  placeholder="Buscar alimento (TACO) ou digitar..."
                                  className="flex-1 bg-transparent text-white placeholder-zinc-600 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15 border border-white/[0.06]"
                                />
                                {ref.alimentos.length > 1 && (
                                  <button onClick={() => removeAlimento(rIdx, aIdx)} className="text-zinc-700 hover:text-red-400 transition-colors text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-white/[0.04]">✕</button>
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
                                className="w-full bg-transparent text-white placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15 border border-white/[0.06]" />
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
                                    className="w-full bg-transparent text-orange-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500/20 border border-white/[0.06] pr-12" />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">kcal</span>
                                </div>
                                <div className="relative">
                                  <input type="number" value={al.proteina} onChange={e => updateAlimento(rIdx, aIdx, 'proteina', e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-blue-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 border border-white/[0.06] pr-10" />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">g prot</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addAlimento(rIdx)}
                            className="w-full py-2 rounded-xl border border-dashed border-white/[0.08] text-zinc-600 text-xs hover:border-white/20 hover:text-zinc-400 transition-all active:scale-95">
                            + adicionar alimento
                          </button>
                        </div>

                        {/* dica opcional */}
                        <input value={ref.dica} onChange={e => updateRefeicao(rIdx, 'dica', e.target.value)}
                          placeholder="💡 Dica para o paciente (opcional)"
                          className="w-full bg-white/[0.02] text-zinc-400 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/10 border border-white/[0.04]" />

                        {/* total refeição */}
                        {refCal > 0 && (
                          <div className="flex items-center gap-3 pt-1 border-t border-white/[0.04]">
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
                  <div className="rounded-2xl border border-white/[0.06] px-4 py-3 flex items-center justify-between" style={{ background: '#0a0a0a' }}>
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
                <div className="rounded-2xl border border-white/[0.06] p-4 space-y-3" style={{ background: '#0f0f0f' }}>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Orientações complementares (opcional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="number" value={extrasEd.hidratacaoLitros} onChange={e => setExtrasEd(p => ({ ...p, hidratacaoLitros: e.target.value }))}
                        placeholder="2.5" className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">L/dia</span>
                    </div>
                    <input value={extrasEd.hidratacaoOri} onChange={e => setExtrasEd(p => ({ ...p, hidratacaoOri: e.target.value }))}
                      placeholder="💧 Orientação de hidratação"
                      className="bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                  </div>
                  <input value={extrasEd.oriTreino} onChange={e => setExtrasEd(p => ({ ...p, oriTreino: e.target.value }))}
                    placeholder="⚡ Orientação pré/pós-treino"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                  <input value={extrasEd.estrategia} onChange={e => setExtrasEd(p => ({ ...p, estrategia: e.target.value }))}
                    placeholder="🎯 Estratégia para o desafio principal"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                  <input value={extrasEd.dicaFome} onChange={e => setExtrasEd(p => ({ ...p, dicaFome: e.target.value }))}
                    placeholder="💡 Dica de controle de fome"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditandoPlano(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-white/[0.08] text-zinc-400 text-sm font-semibold active:scale-95 transition-all">
                    Cancelar
                  </button>
                  <button onClick={salvarEdicao} disabled={salvandoEd || refeicoesEd.length === 0}
                    className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-40">
                    {salvandoEd ? 'Salvando...' : 'Salvar plano'}
                  </button>
                </div>
              </>

            ) : gerandoPlano ? (
              <div className="rounded-2xl border border-green-500/20 p-6" style={{ background: '#0a0d14' }}>
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
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                  <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-green-400 font-semibold">✦ Plano Alimentar</span>
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Ativo</span>
                      </div>
                      <p className="text-zinc-600 text-[10px]">Criado em {new Date(planoAtivo.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => iniciarEdicao(false)} className="text-[10px] text-zinc-400 border border-white/[0.1] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✏️ Editar</button>
                      <button onClick={gerarPlanoIA} className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✦ IA</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                    {[
                      { label: 'Kcal/dia', val: planoAtivo.calorias_meta ?? '—', cor: 'text-orange-400' },
                      { label: 'Proteína', val: planoAtivo.proteina_meta ? `${planoAtivo.proteina_meta}g` : '—', cor: 'text-blue-400' },
                      { label: 'Refeições', val: planoEstruturado.refeicoes.length, cor: 'text-green-400' },
                    ].map((m, i) => (
                      <div key={i} className="py-3 text-center">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-0.5">{m.label}</p>
                        <p className={`text-sm font-black ${m.cor}`}>{m.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {planoEstruturado.nota_nutri && (
                  <div className="rounded-2xl border border-green-500/15 px-4 py-3.5" style={{ background: 'linear-gradient(135deg,#0a0d14,#080a10)' }}>
                    <p className="text-green-400 text-[9px] uppercase tracking-wider mb-1.5">📋 Nota clínica</p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{planoEstruturado.nota_nutri}</p>
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
              <div className="rounded-2xl border border-green-500/20 p-6 text-center" style={{ background: 'linear-gradient(145deg,#0a0d14,#080a10)' }}>
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">🥗</div>
                <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Plano alimentar</p>
                <p className="text-white font-black text-xl mb-2">Criar dieta personalizada</p>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">Monte manualmente com alimentos e gramas, ou deixe a IA gerar um plano completo.</p>
                <div className="flex gap-2">
                  <button onClick={() => iniciarEdicao(true)} className="flex-1 border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all hover:border-white/25">✏️ Manual</button>
                  <button onClick={gerarPlanoIA} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">✦ Gerar IA</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NavBar tipo="nutricionista" ativa="pacientes" />
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
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          <p className="text-zinc-300 text-sm leading-relaxed pt-3">{conteudo}</p>
        </div>
      )}
    </div>
  )
}

function RefeicaoCard({ ref, idx }: { ref: any; idx: number }) {
  const [aberta, setAberta] = useState(false)
  const emojis = ['☀️','🍎','🍽️','⚡','💪','🌙','🥑','🫐']
  const alimentos: any[] = ref.alimentos ?? []
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
      <button onClick={() => setAberta(p => !p)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-base shrink-0">
          {emojis[idx] ?? '🥗'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-bold text-sm">{ref.nome}</p>
            {ref.horario && <span className="text-zinc-600 text-[10px] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">{ref.horario}</span>}
          </div>
          <div className="flex gap-3 mt-0.5">
            <span className="text-orange-400 text-[11px] font-semibold">{ref.calorias} kcal</span>
            <span className="text-blue-400 text-[11px]">{ref.proteina}g prot</span>
            {alimentos.length > 0 && <span className="text-zinc-600 text-[11px]">{alimentos.length} alimento{alimentos.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <span className={`text-zinc-600 text-xs transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {aberta && alimentos.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimento</p>
              <div className="flex gap-4">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Qtd.</p>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider w-10 text-right">Kcal</p>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider w-8 text-right">Prot</p>
              </div>
            </div>
            {alimentos.map((al: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                <p className="text-white text-xs font-medium flex-1 pr-2">{al.nome}</p>
                <div className="flex gap-4 items-center shrink-0">
                  <p className="text-zinc-500 text-[10px]">{al.quantidade}</p>
                  <p className="text-orange-400 text-xs font-semibold w-10 text-right">{al.calorias}</p>
                  <p className="text-blue-400 text-xs w-8 text-right">{al.proteina}g</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5 mt-1 border-t border-white/[0.06]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Total</p>
              <div className="flex gap-4 shrink-0">
                <span className="text-zinc-600 text-[10px]"></span>
                <p className="text-orange-400 text-xs font-black w-10 text-right">{ref.calorias}</p>
                <p className="text-blue-400 text-xs font-black w-8 text-right">{ref.proteina}g</p>
              </div>
            </div>
          </div>
          {ref.dica && (
            <div className="mx-4 mb-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">💡 Dica</p>
              <p className="text-zinc-400 text-xs leading-relaxed">{ref.dica}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
