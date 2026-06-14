'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import SidebarProfissional from '../../components/SidebarProfissional'
import { HeartPulse, Leaf, Dumbbell, Salad, Target, Activity, Moon, Scale, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type AnamneseForm = {
  // Objetivo de treino (personal)
  objetivo_treino: string; motivacao_treino: string; prazo_treino_semanas: string
  // Objetivo nutricional (nutricionista)
  objetivo_nutricional: string; motivacao_nutricional: string; prazo_nutricional_semanas: string
  // Identificação extra
  profissao: string
  // Histórico clínico
  patologias: string; medicamentos: string; alergias: string; intolerancias: string
  cirurgias: string; historico_familiar: string; exames_laboratoriais: string
  // Histórico de peso
  peso_maximo: string; peso_minimo: string; peso_habitual: string
  efeito_sanfona: boolean | null; tentativas_emagrecimento: string
  // Hábitos alimentares
  refeicoes_por_dia: string; horarios_refeicoes: string
  onde_come: string; quem_prepara: string
  preferencias_alimentares: string; aversoes_alimentares: string
  restricoes_alimentares: string; consumo_agua_litros: string
  consumo_ultraprocessados: string; suplementos: string; habitos_alimentares: string
  // Sono e estilo de vida
  horas_sono: string; qualidade_sono: string; nivel_estresse: number
  fuma: boolean; alcool: string; rotina_trabalho: string
  // Atividade física
  nivel_atividade: string; modalidade_treino: string; frequencia_treino: string
  duracao_treino_min: string; horario_treino: string; historico_esportivo: string
  // Saúde GI
  funcionamento_intestinal: string; bristol_escala: string
  refluxo: boolean | null; distensao_abdominal: boolean | null; usa_probioticos: boolean | null
  // Ciclo menstrual
  ciclo_regular: boolean | null; duracao_ciclo_dias: string
  fase_ciclo: string; sintomas_ciclo: string[]
  // Legado
  lesoes: string; restricoes_fisicas: string; observacoes: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const FORM_VAZIO: AnamneseForm = {
  objetivo_treino: '', motivacao_treino: '', prazo_treino_semanas: '',
  objetivo_nutricional: '', motivacao_nutricional: '', prazo_nutricional_semanas: '',
  profissao: '',
  patologias: '', medicamentos: '', alergias: '', intolerancias: '',
  cirurgias: '', historico_familiar: '', exames_laboratoriais: '',
  peso_maximo: '', peso_minimo: '', peso_habitual: '',
  efeito_sanfona: null, tentativas_emagrecimento: '',
  refeicoes_por_dia: '', horarios_refeicoes: '',
  onde_come: '', quem_prepara: '',
  preferencias_alimentares: '', aversoes_alimentares: '',
  restricoes_alimentares: '', consumo_agua_litros: '',
  consumo_ultraprocessados: '', suplementos: '', habitos_alimentares: '',
  horas_sono: '', qualidade_sono: '', nivel_estresse: 0,
  fuma: false, alcool: '', rotina_trabalho: '',
  nivel_atividade: '', modalidade_treino: '', frequencia_treino: '',
  duracao_treino_min: '', horario_treino: '', historico_esportivo: '',
  funcionamento_intestinal: '', bristol_escala: '',
  refluxo: null, distensao_abdominal: null, usa_probioticos: null,
  ciclo_regular: null, duracao_ciclo_dias: '', fase_ciclo: '', sintomas_ciclo: [],
  lesoes: '', restricoes_fisicas: '', observacoes: '',
}

const NIVEL_ATIVIDADE = [
  { val: 'sedentario',      label: 'Sedentário',   sub: 'Sem exercício regular' },
  { val: 'levemente_ativo', label: 'Levemente ativo', sub: '1–2x por semana' },
  { val: 'moderado',        label: 'Moderado',     sub: '3–4x por semana' },
  { val: 'muito_ativo',     label: 'Muito ativo',  sub: '5–6x por semana' },
  { val: 'atleta',          label: 'Atleta',       sub: 'Treino diário / duplo' },
]
const ALCOOL = [
  { val: 'nao', label: 'Não bebo' }, { val: 'social', label: 'Social (festas)' },
  { val: 'moderado', label: 'Moderado (fins de semana)' }, { val: 'frequente', label: 'Frequente' },
]
const ONDE_COME = [
  { val: 'casa',        label: 'Em casa',        icon: '🏠' },
  { val: 'trabalho',    label: 'No trabalho',     icon: '🏢' },
  { val: 'restaurante', label: 'Restaurante',     icon: '🍽️' },
  { val: 'delivery',    label: 'Delivery',        icon: '📦' },
  { val: 'variado',     label: 'Variado',         icon: '🔀' },
]
const QUEM_PREPARA = [
  { val: 'proprio',    label: 'Eu mesmo(a)' },
  { val: 'familia',    label: 'Família' },
  { val: 'empregada',  label: 'Empregada/cozinheiro' },
  { val: 'delivery',   label: 'Delivery/pronto' },
]
const ULTRAPROCESSADOS = [
  { val: 'raramente', label: 'Raramente', sub: '< 1x/semana' },
  { val: 'semanal',   label: 'Semanal',   sub: '1–2x/semana' },
  { val: 'frequente', label: 'Frequente', sub: '3–4x/semana' },
  { val: 'diario',    label: 'Diário',    sub: 'Todo dia' },
]
const QUALIDADE_SONO = [
  { val: 'boa',     label: 'Boa',     cor: 'emerald' },
  { val: 'regular', label: 'Regular', cor: 'yellow' },
  { val: 'ruim',    label: 'Ruim',    cor: 'red' },
]
const ROTINA_TRABALHO = [
  { val: 'sedentaria', label: 'Sedentária', sub: 'Trabalho sentado (escritório)' },
  { val: 'moderada',   label: 'Moderada',   sub: 'Fica de pé, anda bastante' },
  { val: 'intensa',    label: 'Intensa',    sub: 'Trabalho físico / campo' },
  { val: 'turnos',     label: 'Turnos',     sub: 'Horários variados / noturnos' },
]
const HORARIO_TREINO = [
  { val: 'manha', label: 'Manhã', icon: '☀️' },
  { val: 'tarde',  label: 'Tarde', icon: '🌤️' },
  { val: 'noite',  label: 'Noite', icon: '🌙' },
  { val: 'variado', label: 'Variado', icon: '🔀' },
]
const FUNCIONAMENTO_INTESTINAL = [
  { val: 'regular',            label: 'Regular',            sub: 'Evacuação diária, consistente' },
  { val: 'constipacao',        label: 'Constipação',        sub: 'Infrequente, com dificuldade' },
  { val: 'diarreia_frequente', label: 'Diarreia frequente', sub: 'Fezes líquidas com frequência' },
  { val: 'irregular',          label: 'Irregular',          sub: 'Alternância, variação' },
]
const BRISTOL = [
  { tipo: 1, label: 'Tipo 1', desc: 'Caroços duros e separados', cor: 'text-red-500' },
  { tipo: 2, label: 'Tipo 2', desc: 'Salsicha irregular', cor: 'text-orange-500' },
  { tipo: 3, label: 'Tipo 3', desc: 'Salsicha com rachaduras', cor: 'text-yellow-400' },
  { tipo: 4, label: 'Tipo 4', desc: 'Salsicha macia e lisa ✓', cor: 'text-emerald-400' },
  { tipo: 5, label: 'Tipo 5', desc: 'Pedaços com bordas definidas', cor: 'text-yellow-400' },
  { tipo: 6, label: 'Tipo 6', desc: 'Pedaços fofos irregulares', cor: 'text-orange-500' },
  { tipo: 7, label: 'Tipo 7', desc: 'Aquosa, sem sólidos', cor: 'text-red-500' },
]
const FASES_CICLO = [
  { val: 'menstrual',  label: 'Menstrual',  sub: 'Dias 1–5' },
  { val: 'folicular',  label: 'Folicular',  sub: 'Dias 6–13' },
  { val: 'ovulatoria', label: 'Ovulatória', sub: 'Dias 14–16' },
  { val: 'lutea',      label: 'Lútea',      sub: 'Dias 17–28' },
]
const SINTOMAS_CICLO = [
  { val: 'tpm_intensa',       label: 'TPM intensa' },
  { val: 'retencao_hidrica',  label: 'Retenção hídrica' },
  { val: 'alteracao_apetite', label: 'Alteração de apetite' },
  { val: 'cólicas',           label: 'Cólicas intensas' },
  { val: 'fadiga',            label: 'Fadiga' },
  { val: 'insonia',           label: 'Insônia' },
]

// ─── Componentes de UI ────────────────────────────────────────────────────────
function SectionCard({ icon, titulo, subtitulo, badge, children, defaultOpen = true }: {
  icon: React.ReactNode; titulo: string; subtitulo?: string; badge?: string
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [aberto, setAberto] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.10]" style={{ background: 'var(--surface-1)' }}>
      <button onClick={() => setAberto(p => !p)}
        className="w-full px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        style={{ borderBottom: aberto ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center text-zinc-400 shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{titulo}</p>
            {subtitulo && !aberto && <p className="text-zinc-600 text-xs mt-0.5 truncate">{subtitulo}</p>}
          </div>
          {badge && <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.06] rounded-full px-2.5 py-0.5 shrink-0">{badge}</span>}
          <ChevronDown size={14} className={`text-zinc-600 shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {aberto && <div className="p-5 space-y-4">{children}</div>}
    </div>
  )
}

function Field({ label, optional, hint, children }: { label: string; optional?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-zinc-400 text-[12px] font-medium">{label}</label>
        {optional && <span className="text-zinc-700 text-[10px] normal-case tracking-normal">opcional</span>}
        {hint && <span className="text-zinc-600 text-[10px]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Chips({ opcoes, value, onChange, multi = false }: {
  opcoes: { val: string; label: string; sub?: string; icon?: string }[]
  value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean
}) {
  function toggle(v: string) {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
    } else {
      onChange((value as string) === v ? '' : v)
    }
  }
  function isActive(v: string) {
    return multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map(o => (
        <button key={o.val} type="button" onClick={() => toggle(o.val)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 ${isActive(o.val) ? 'bg-white border-white text-black' : 'bg-white/[0.04] border-white/[0.12] text-zinc-400 hover:border-white/20 hover:text-zinc-300'}`}>
          {o.icon && <span>{o.icon}</span>}
          <span>{o.label}</span>
          {o.sub && isActive(o.val) && <span className="text-black/50 text-[10px]">· {o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {([{ val: false, label: 'Não' }, { val: true, label: 'Sim' }] as const).map(o => (
        <button key={String(o.val)} type="button" onClick={() => onChange(o.val)}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${value === o.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.12] text-zinc-400 hover:text-zinc-300'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ReadRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (!value && value !== false && value !== 0) return null
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value)
  return (
    <div className="flex gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-zinc-500 text-[11px] font-medium w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-zinc-300 text-sm flex-1 leading-relaxed">{display}</span>
    </div>
  )
}

const INPUT = "w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-colors"
const TEXTAREA = INPUT + " resize-none"

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AnamnesePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.clienteId as string

  const [form, setForm] = useState<AnamneseForm>(FORM_VAZIO)
  const [anamneseId, setAnamneseId] = useState<string | null>(null)
  const [temVinculoAtivo, setTemVinculoAtivo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [meuperfil, setMeuPerfil] = useState<{ tipo: string; nome: string | null } | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [clienteSexo, setClienteSexo] = useState<string | null>(null)
  const [backUrl, setBackUrl] = useState('/dashboard')

  useEffect(() => { carregar() }, [clienteId])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const meuId = session.user.id

    const [{ data: perfil }, { data: clientePerfil }, { data: anamnese }, { data: vinculosAtivos }] = await Promise.all([
      supabase.from('perfis').select('tipo, nome').eq('id', meuId).single(),
      supabase.from('perfis').select('nome, email, sexo').eq('id', clienteId).single(),
      supabase.from('anamneses').select('*').eq('cliente_id', clienteId).maybeSingle(),
      supabase.from('vinculos').select('tipo').eq('cliente_id', clienteId).eq('ativo', true),
    ])
    setMeuPerfil(perfil)
    setClienteNome(clientePerfil?.nome ?? clientePerfil?.email ?? null)
    setClienteSexo(clientePerfil?.sexo ?? null)
    setTemVinculoAtivo((vinculosAtivos?.length ?? 0) > 0)

    if (perfil?.tipo === 'personal') setBackUrl(`/personal/aluno/${clienteId}`)
    else if (perfil?.tipo === 'nutricionista') setBackUrl(`/nutricionista/paciente/${clienteId}`)
    else setBackUrl('/perfil')

    if (anamnese) {
      const e = anamnese
      setAnamneseId(e.id)
      setForm({
        objetivo_treino: e.objetivo_treino ?? '',
        motivacao_treino: e.motivacao_treino ?? '',
        prazo_treino_semanas: e.prazo_treino_semanas != null ? String(e.prazo_treino_semanas) : '',
        objetivo_nutricional: e.objetivo_nutricional ?? '',
        motivacao_nutricional: e.motivacao_nutricional ?? '',
        prazo_nutricional_semanas: e.prazo_nutricional_semanas != null ? String(e.prazo_nutricional_semanas) : '',
        profissao: e.profissao ?? '',
        patologias: e.patologias ?? '',
        medicamentos: e.medicamentos ?? '',
        alergias: e.alergias ?? '',
        intolerancias: e.intolerancias ?? '',
        cirurgias: e.cirurgias ?? '',
        historico_familiar: e.historico_familiar ?? '',
        exames_laboratoriais: e.exames_laboratoriais ?? '',
        peso_maximo: e.peso_maximo != null ? String(e.peso_maximo) : '',
        peso_minimo: e.peso_minimo != null ? String(e.peso_minimo) : '',
        peso_habitual: e.peso_habitual != null ? String(e.peso_habitual) : '',
        efeito_sanfona: e.efeito_sanfona ?? null,
        tentativas_emagrecimento: e.tentativas_emagrecimento ?? '',
        refeicoes_por_dia: e.refeicoes_por_dia != null ? String(e.refeicoes_por_dia) : '',
        horarios_refeicoes: e.horarios_refeicoes ?? '',
        onde_come: e.onde_come ?? '',
        quem_prepara: e.quem_prepara ?? '',
        preferencias_alimentares: e.preferencias_alimentares ?? '',
        aversoes_alimentares: e.aversoes_alimentares ?? '',
        restricoes_alimentares: e.restricoes_alimentares ?? '',
        consumo_agua_litros: e.consumo_agua_litros != null ? String(e.consumo_agua_litros) : '',
        consumo_ultraprocessados: e.consumo_ultraprocessados ?? '',
        suplementos: e.suplementos ?? '',
        habitos_alimentares: e.habitos_alimentares ?? '',
        horas_sono: e.horas_sono != null ? String(e.horas_sono) : '',
        qualidade_sono: e.qualidade_sono ?? '',
        nivel_estresse: e.nivel_estresse ?? 0,
        fuma: e.fuma ?? false,
        alcool: e.alcool ?? '',
        rotina_trabalho: e.rotina_trabalho ?? '',
        nivel_atividade: e.nivel_atividade ?? '',
        modalidade_treino: e.modalidade_treino ?? '',
        frequencia_treino: e.frequencia_treino ?? '',
        duracao_treino_min: e.duracao_treino_min != null ? String(e.duracao_treino_min) : '',
        horario_treino: e.horario_treino ?? '',
        historico_esportivo: e.historico_esportivo ?? '',
        funcionamento_intestinal: e.funcionamento_intestinal ?? '',
        bristol_escala: e.bristol_escala != null ? String(e.bristol_escala) : '',
        refluxo: e.refluxo ?? null,
        distensao_abdominal: e.distensao_abdominal ?? null,
        usa_probioticos: e.usa_probioticos ?? null,
        ciclo_regular: e.ciclo_regular ?? null,
        duracao_ciclo_dias: e.duracao_ciclo_dias != null ? String(e.duracao_ciclo_dias) : '',
        fase_ciclo: e.fase_ciclo ?? '',
        sintomas_ciclo: Array.isArray(e.sintomas_ciclo) ? e.sintomas_ciclo : [],
        lesoes: e.lesoes ?? '',
        restricoes_fisicas: e.restricoes_fisicas ?? '',
        observacoes: e.observacoes ?? '',
      })
    }
    setCarregando(false)
  }

  function set(field: keyof AnamneseForm, val: string | number | boolean | string[] | null) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSalvar() {
    setSalvando(true); setErro('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const papel = meuperfil?.tipo === 'personal' ? 'personal' : meuperfil?.tipo === 'nutricionista' ? 'nutricionista' : 'atleta'
    const n = (v: string) => v.trim() || null
    const f = (v: string) => v ? parseFloat(v) : null
    const i = (v: string) => v ? parseInt(v) : null

    const campoTreino = {
      objetivo_treino: n(form.objetivo_treino), motivacao_treino: n(form.motivacao_treino),
      prazo_treino_semanas: i(form.prazo_treino_semanas),
    }
    const campoNutricional = {
      objetivo_nutricional: n(form.objetivo_nutricional), motivacao_nutricional: n(form.motivacao_nutricional),
      prazo_nutricional_semanas: i(form.prazo_nutricional_semanas),
    }

    const payload: Record<string, unknown> = {
      cliente_id: clienteId,
      atualizado_por: session.user.id,
      profissao: n(form.profissao),
      patologias: n(form.patologias), medicamentos: n(form.medicamentos),
      alergias: n(form.alergias), intolerancias: n(form.intolerancias),
      cirurgias: n(form.cirurgias), historico_familiar: n(form.historico_familiar),
      exames_laboratoriais: n(form.exames_laboratoriais),
      peso_maximo: f(form.peso_maximo), peso_minimo: f(form.peso_minimo),
      peso_habitual: f(form.peso_habitual), efeito_sanfona: form.efeito_sanfona,
      tentativas_emagrecimento: n(form.tentativas_emagrecimento),
      refeicoes_por_dia: i(form.refeicoes_por_dia), horarios_refeicoes: n(form.horarios_refeicoes),
      onde_come: n(form.onde_come), quem_prepara: n(form.quem_prepara),
      preferencias_alimentares: n(form.preferencias_alimentares),
      aversoes_alimentares: n(form.aversoes_alimentares),
      restricoes_alimentares: n(form.restricoes_alimentares),
      consumo_agua_litros: f(form.consumo_agua_litros),
      consumo_ultraprocessados: n(form.consumo_ultraprocessados),
      suplementos: n(form.suplementos), habitos_alimentares: n(form.habitos_alimentares),
      horas_sono: f(form.horas_sono), qualidade_sono: n(form.qualidade_sono),
      nivel_estresse: form.nivel_estresse || null, fuma: form.fuma, alcool: n(form.alcool),
      rotina_trabalho: n(form.rotina_trabalho),
      nivel_atividade: n(form.nivel_atividade), modalidade_treino: n(form.modalidade_treino),
      frequencia_treino: n(form.frequencia_treino), duracao_treino_min: i(form.duracao_treino_min),
      horario_treino: n(form.horario_treino), historico_esportivo: n(form.historico_esportivo),
      funcionamento_intestinal: n(form.funcionamento_intestinal),
      bristol_escala: i(form.bristol_escala), refluxo: form.refluxo,
      distensao_abdominal: form.distensao_abdominal, usa_probioticos: form.usa_probioticos,
      ciclo_regular: form.ciclo_regular,
      duracao_ciclo_dias: i(form.duracao_ciclo_dias), fase_ciclo: n(form.fase_ciclo),
      sintomas_ciclo: form.sintomas_ciclo.length > 0 ? form.sintomas_ciclo : null,
      lesoes: n(form.lesoes), restricoes_fisicas: n(form.restricoes_fisicas),
      observacoes: n(form.observacoes),
      atualizado_em: new Date().toISOString(),
    }

    if (papel === 'personal') Object.assign(payload, campoTreino)
    else if (papel === 'nutricionista') Object.assign(payload, campoNutricional)
    else Object.assign(payload, campoTreino, campoNutricional)

    let error
    if (anamneseId) {
      const res = await supabase.from('anamneses').update(payload).eq('cliente_id', clienteId).select('id')
      error = res.error
      if (!error && (res.data?.length ?? 0) === 0) error = new Error('Nenhuma linha atualizada')
    } else {
      const res = await supabase.from('anamneses').insert(payload).select('id').single()
      error = res.error
      if (!error && res.data) setAnamneseId(res.data.id)
    }

    if (error) { setErro('Erro ao salvar — verifique permissões.'); setSalvando(false); return }
    setSucesso(true)
    setTimeout(() => { setSucesso(false); router.push(backUrl) }, 1400)
  }

  if (carregando) return (
    <main className="min-h-[100dvh] flex items-center justify-center text-white">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (sucesso) return (
    <main className="min-h-[100dvh] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">✅</div>
        <p className="text-white font-bold text-lg">Anamnese salva!</p>
        <p className="text-zinc-500 text-sm">Voltando...</p>
      </div>
    </main>
  )

  const papel = meuperfil?.tipo === 'personal' ? 'personal' : meuperfil?.tipo === 'nutricionista' ? 'nutricionista' : 'atleta'
  const isProfissional = papel !== 'atleta'
  const isFeminino = clienteSexo === 'feminino' || clienteSexo === 'f' || clienteSexo === 'F'
  const tipoSidebar = meuperfil?.tipo === 'personal' ? 'personal' : 'nutricionista'
  const somenteLeitura = papel === 'atleta' && temVinculoAtivo

  return (
    <main className="min-h-[100dvh] text-white md:flex">
      {isProfissional && <SidebarProfissional tipo={tipoSidebar} />}
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div className="max-w-md mx-auto px-4 pb-32 md:max-w-3xl md:px-10" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push(backUrl)} className="w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0 text-lg">←</button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Anamnese</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {clienteNome ?? (anamneseId ? 'Atualizar ficha clínica' : 'Ficha clínica completa')}
            </p>
          </div>
          {anamneseId && (
            <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 shrink-0">Preenchida</span>
          )}
        </div>

        {somenteLeitura && (
          <div className="mb-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-300">
            Sua anamnese é gerenciada pelo seu personal e/ou nutricionista. Os dados abaixo são somente leitura.
          </div>
        )}

        <fieldset disabled={somenteLeitura} className="contents">
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">

          {/* ── 1. Objetivo da consulta ────────────────────────────────── */}
          <SectionCard icon={<Target size={14} />} titulo="Objetivo da consulta" subtitulo="O que o paciente quer alcançar">
            {(papel === 'personal' || papel === 'atleta') && (
              <>
                <Field label={papel === 'personal' ? 'Qual o objetivo do atleta com o treino?' : 'Qual o seu objetivo com o treino?'}>
                  <textarea value={form.objetivo_treino} onChange={e => set('objetivo_treino', e.target.value)}
                    placeholder="Ex: Ganhar 3kg de massa magra em 4 meses, melhorar resistência na corrida..." rows={3} className={TEXTAREA} />
                </Field>
                <Field label="Motivação para o treino" optional>
                  <input value={form.motivacao_treino} onChange={e => set('motivacao_treino', e.target.value)}
                    placeholder="Ex: Prova em novembro, retorno ao esporte..." className={INPUT} />
                </Field>
                <Field label="Prazo desejado" optional>
                  <div className="relative">
                    <input type="number" value={form.prazo_treino_semanas} onChange={e => set('prazo_treino_semanas', e.target.value)}
                      placeholder="16" min={1} className={INPUT + ' pr-16'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">sem.</span>
                  </div>
                </Field>
              </>
            )}

            {papel === 'nutricionista' && (form.objetivo_treino || form.motivacao_treino || form.prazo_treino_semanas) && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 mb-2">Objetivo de treino (definido pelo personal)</p>
                <ReadRow label="Objetivo" value={form.objetivo_treino} />
                <ReadRow label="Motivação" value={form.motivacao_treino} />
                <ReadRow label="Prazo" value={form.prazo_treino_semanas ? `${form.prazo_treino_semanas} sem.` : null} />
              </div>
            )}

            {(papel === 'nutricionista' || papel === 'atleta') && (
              <>
                <Field label={papel === 'nutricionista' ? 'Qual o objetivo nutricional do paciente?' : 'Qual o seu objetivo nutricional?'}>
                  <textarea value={form.objetivo_nutricional} onChange={e => set('objetivo_nutricional', e.target.value)}
                    placeholder="Ex: Reeducação alimentar, emagrecimento com preservação de massa magra..." rows={3} className={TEXTAREA} />
                </Field>
                <Field label="Motivação para o acompanhamento nutricional" optional>
                  <input value={form.motivacao_nutricional} onChange={e => set('motivacao_nutricional', e.target.value)}
                    placeholder="Ex: Exames alterados, melhora de performance, estética..." className={INPUT} />
                </Field>
                <Field label="Prazo desejado" optional>
                  <div className="relative">
                    <input type="number" value={form.prazo_nutricional_semanas} onChange={e => set('prazo_nutricional_semanas', e.target.value)}
                      placeholder="16" min={1} className={INPUT + ' pr-16'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">sem.</span>
                  </div>
                </Field>
              </>
            )}

            {papel === 'personal' && (form.objetivo_nutricional || form.motivacao_nutricional || form.prazo_nutricional_semanas) && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 mb-2">Objetivo nutricional (definido pela nutricionista)</p>
                <ReadRow label="Objetivo" value={form.objetivo_nutricional} />
                <ReadRow label="Motivação" value={form.motivacao_nutricional} />
                <ReadRow label="Prazo" value={form.prazo_nutricional_semanas ? `${form.prazo_nutricional_semanas} sem.` : null} />
              </div>
            )}

            <Field label="Profissão" optional>
              <input value={form.profissao} onChange={e => set('profissao', e.target.value)}
                placeholder="Ex: Professora, engenheiro..." className={INPUT} />
            </Field>
          </SectionCard>

          {/* ── 2. Histórico Clínico ───────────────────────────────────── */}
          <SectionCard icon={<HeartPulse size={14} />} titulo="Histórico Clínico" subtitulo="Doenças, medicamentos, exames laboratoriais">
            <Field label="Patologias / doenças diagnosticadas" optional>
              <textarea value={form.patologias} onChange={e => set('patologias', e.target.value)}
                placeholder="Ex: Hipertensão, diabetes tipo 2, hipotireoidismo, SOP..." rows={2} className={TEXTAREA} />
            </Field>
            <Field label="Medicamentos em uso" optional>
              <textarea value={form.medicamentos} onChange={e => set('medicamentos', e.target.value)}
                placeholder="Nome, dose e frequência de cada medicamento..." rows={2} className={TEXTAREA} />
            </Field>
            <Field label="Exames laboratoriais recentes" optional hint="(glicemia, colesterol, hemograma, TSH...)">
              <textarea value={form.exames_laboratoriais} onChange={e => set('exames_laboratoriais', e.target.value)}
                placeholder="Ex: Glicemia 98 (ref. <100), Colesterol total 210, TSH 2.4..." rows={3} className={TEXTAREA} />
            </Field>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Alergias alimentares" optional>
                <input value={form.alergias} onChange={e => set('alergias', e.target.value)}
                  placeholder="Ex: Amendoim, frutos do mar, nozes..." className={INPUT} />
              </Field>
              <Field label="Intolerâncias e sensibilidades" optional>
                <input value={form.intolerancias} onChange={e => set('intolerancias', e.target.value)}
                  placeholder="Ex: Lactose, glúten, FODMAP, frutose..." className={INPUT} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cirurgias" optional>
                <input value={form.cirurgias} onChange={e => set('cirurgias', e.target.value)}
                  placeholder="Ex: Bariátrica (2022)..." className={INPUT} />
              </Field>
              <Field label="Histórico familiar" optional>
                <input value={form.historico_familiar} onChange={e => set('historico_familiar', e.target.value)}
                  placeholder="Ex: Pai diabético, mãe hipertensa..." className={INPUT} />
              </Field>
            </div>
          </SectionCard>

          {/* ── 3. Histórico de Peso ──────────────────────────────────── */}
          <SectionCard icon={<Scale size={14} />} titulo="Histórico de Peso" subtitulo="Peso máximo, mínimo, efeito sanfona">
            <div className="grid grid-cols-3 gap-2">
              {[
                { field: 'peso_maximo' as keyof AnamneseForm,  label: 'Peso máximo', unit: 'kg' },
                { field: 'peso_minimo' as keyof AnamneseForm,  label: 'Peso mínimo', unit: 'kg' },
                { field: 'peso_habitual' as keyof AnamneseForm, label: 'Peso habitual', unit: 'kg' },
              ].map(({ field, label, unit }) => (
                <Field key={field} label={label} optional>
                  <div className="relative">
                    <input type="number" value={form[field] as string} onChange={e => set(field, e.target.value)}
                      placeholder="—" step="0.1" className={INPUT + ' pr-8'} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">{unit}</span>
                  </div>
                </Field>
              ))}
            </div>
            <Field label="Já teve efeito sanfona?">
              <YesNo value={form.efeito_sanfona} onChange={v => set('efeito_sanfona', v)} />
            </Field>
            <Field label="Tentativas anteriores de emagrecimento" optional>
              <textarea value={form.tentativas_emagrecimento} onChange={e => set('tentativas_emagrecimento', e.target.value)}
                placeholder="Ex: Low carb por 2 meses (perdeu 4kg), reeducação alimentar (ganhou tudo de volta)..." rows={2} className={TEXTAREA} />
            </Field>
          </SectionCard>

          {/* ── 4. Hábitos Alimentares ────────────────────────────────── */}
          <SectionCard icon={<Salad size={14} />} titulo="Hábitos Alimentares" subtitulo="Rotina alimentar, preferências e restrições">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Refeições por dia" optional>
                <input type="number" value={form.refeicoes_por_dia} onChange={e => set('refeicoes_por_dia', e.target.value)}
                  placeholder="5" min={1} max={10} className={INPUT} />
              </Field>
              <Field label="Consumo de água" optional>
                <div className="relative">
                  <input type="number" value={form.consumo_agua_litros} onChange={e => set('consumo_agua_litros', e.target.value)}
                    placeholder="2.0" step="0.5" className={INPUT + ' pr-6'} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">L</span>
                </div>
              </Field>
            </div>
            <Field label="Horários das refeições" optional>
              <input value={form.horarios_refeicoes} onChange={e => set('horarios_refeicoes', e.target.value)}
                placeholder="Ex: café 07h · lanche 10h · almoço 13h · lanche 16h · jantar 19h" className={INPUT} />
            </Field>
            <Field label="Onde faz as refeições" optional>
              <Chips opcoes={ONDE_COME} value={form.onde_come} onChange={v => set('onde_come', v as string)} />
            </Field>
            <Field label="Quem prepara as refeições" optional>
              <Chips opcoes={QUEM_PREPARA} value={form.quem_prepara} onChange={v => set('quem_prepara', v as string)} />
            </Field>
            <Field label="Consumo de ultraprocessados" optional>
              <Chips opcoes={ULTRAPROCESSADOS} value={form.consumo_ultraprocessados} onChange={v => set('consumo_ultraprocessados', v as string)} />
            </Field>
            <Field label="Preferências alimentares" optional>
              <input value={form.preferencias_alimentares} onChange={e => set('preferencias_alimentares', e.target.value)}
                placeholder="Ex: Adora frango, ovos, frutas, pão integral..." className={INPUT} />
            </Field>
            <Field label="Aversões alimentares" optional>
              <input value={form.aversoes_alimentares} onChange={e => set('aversoes_alimentares', e.target.value)}
                placeholder="Ex: Não come peixe, detesta brócolis, evita leite..." className={INPUT} />
            </Field>
            <Field label="Restrições alimentares" optional>
              <input value={form.restricoes_alimentares} onChange={e => set('restricoes_alimentares', e.target.value)}
                placeholder="Ex: Vegetariano, sem lactose, kosher, halal..." className={INPUT} />
            </Field>
            <Field label="Suplementos em uso" optional>
              <input value={form.suplementos} onChange={e => set('suplementos', e.target.value)}
                placeholder="Ex: Whey 30g pós-treino, creatina 5g/dia, vitamina D 5000UI..." className={INPUT} />
            </Field>
            <Field label="Observações sobre hábitos" optional>
              <textarea value={form.habitos_alimentares} onChange={e => set('habitos_alimentares', e.target.value)}
                placeholder="Ex: Come muito rápido, pula refeições sob estresse, compulsão noturna..." rows={2} className={TEXTAREA} />
            </Field>
          </SectionCard>

          {/* ── 5. Saúde Gastrointestinal ─────────────────────────────── */}
          <SectionCard icon={<Activity size={14} />} titulo="Saúde Gastrointestinal" subtitulo="Funcionamento intestinal, Bristol, refluxo">
            <Field label="Funcionamento intestinal">
              <div className="grid grid-cols-1 gap-1.5">
                {FUNCIONAMENTO_INTESTINAL.map(op => (
                  <button key={op.val} type="button" onClick={() => set('funcionamento_intestinal', op.val)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${form.funcionamento_intestinal === op.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.12] hover:border-white/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${form.funcionamento_intestinal === op.val ? 'bg-black' : 'bg-white/20'}`} />
                    <div>
                      <p className={`text-sm font-bold ${form.funcionamento_intestinal === op.val ? 'text-black' : 'text-white'}`}>{op.label}</p>
                      <p className={`text-xs ${form.funcionamento_intestinal === op.val ? 'text-black/60' : 'text-zinc-500'}`}>{op.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Escala de Bristol" optional hint="(consistência das fezes — 4 é ideal)">
              <div className="grid grid-cols-4 gap-1.5 md:grid-cols-7">
                {BRISTOL.map(b => (
                  <button key={b.tipo} type="button" onClick={() => set('bristol_escala', form.bristol_escala === String(b.tipo) ? '' : String(b.tipo))}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all active:scale-95 text-center ${form.bristol_escala === String(b.tipo) ? 'bg-white border-white' : 'bg-white/[0.04] border-white/[0.1] hover:border-white/20'}`}>
                    <span className={`text-lg font-black ${form.bristol_escala === String(b.tipo) ? 'text-black' : b.cor}`}>{b.tipo}</span>
                    <span className={`text-[8px] leading-tight mt-0.5 ${form.bristol_escala === String(b.tipo) ? 'text-black/60' : 'text-zinc-600'}`}>{b.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Refluxo?">
                <YesNo value={form.refluxo} onChange={v => set('refluxo', v)} />
              </Field>
              <Field label="Distensão?">
                <YesNo value={form.distensao_abdominal} onChange={v => set('distensao_abdominal', v)} />
              </Field>
              <Field label="Probiótico?">
                <YesNo value={form.usa_probioticos} onChange={v => set('usa_probioticos', v)} />
              </Field>
            </div>
          </SectionCard>

          {/* ── 6. Sono e Estilo de Vida ──────────────────────────────── */}
          <SectionCard icon={<Leaf size={14} />} titulo="Sono e Estilo de Vida" subtitulo="Qualidade do sono, estresse, tabagismo, álcool">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas de sono" optional>
                <div className="relative">
                  <input type="number" value={form.horas_sono} onChange={e => set('horas_sono', e.target.value)}
                    placeholder="7" min={0} max={24} step={0.5} className={INPUT + ' pr-6'} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">h</span>
                </div>
              </Field>
              <Field label="Nível de estresse" optional hint="(1–10)">
                <div className="relative">
                  <input type="number" value={form.nivel_estresse || ''} onChange={e => set('nivel_estresse', parseInt(e.target.value) || 0)}
                    placeholder="5" min={1} max={10} className={INPUT + ' pr-10'} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">/10</span>
                </div>
              </Field>
            </div>
            <Field label="Qualidade do sono" optional>
              <Chips opcoes={QUALIDADE_SONO.map(q => ({ val: q.val, label: q.label }))} value={form.qualidade_sono} onChange={v => set('qualidade_sono', v as string)} />
            </Field>
            <Field label="Rotina de trabalho" optional>
              <div className="grid grid-cols-1 gap-1.5">
                {ROTINA_TRABALHO.map(r => (
                  <button key={r.val} type="button" onClick={() => set('rotina_trabalho', r.val)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${form.rotina_trabalho === r.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.12] hover:border-white/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${form.rotina_trabalho === r.val ? 'bg-black' : 'bg-white/20'}`} />
                    <div>
                      <p className={`text-sm font-bold ${form.rotina_trabalho === r.val ? 'text-black' : 'text-white'}`}>{r.label}</p>
                      <p className={`text-xs ${form.rotina_trabalho === r.val ? 'text-black/60' : 'text-zinc-500'}`}>{r.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tabagismo">
                <YesNo value={form.fuma} onChange={v => set('fuma', v)} />
              </Field>
              <Field label="Álcool" optional>
                <select value={form.alcool} onChange={e => set('alcool', e.target.value)}
                  className={INPUT} style={{ colorScheme: 'dark', background: '#141414' }}>
                  <option value="">Selecione</option>
                  {ALCOOL.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>

          {/* ── 7. Atividade Física ───────────────────────────────────── */}
          <SectionCard icon={<Dumbbell size={14} />} titulo="Atividade Física" subtitulo="Modalidade, frequência, intensidade e horário">
            <Field label="Nível de atividade atual">
              <div className="grid grid-cols-1 gap-1.5">
                {NIVEL_ATIVIDADE.map(n => (
                  <button key={n.val} type="button" onClick={() => set('nivel_atividade', n.val)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${form.nivel_atividade === n.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.12] hover:border-white/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${form.nivel_atividade === n.val ? 'bg-black' : 'bg-white/20'}`} />
                    <div>
                      <p className={`text-sm font-bold ${form.nivel_atividade === n.val ? 'text-black' : 'text-white'}`}>{n.label}</p>
                      <p className={`text-xs ${form.nivel_atividade === n.val ? 'text-black/60' : 'text-zinc-500'}`}>{n.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Modalidade" optional>
              <input value={form.modalidade_treino} onChange={e => set('modalidade_treino', e.target.value)}
                placeholder="Ex: Musculação, corrida, natação, crossfit, bike..." className={INPUT} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Frequência" optional>
                <input value={form.frequencia_treino} onChange={e => set('frequencia_treino', e.target.value)}
                  placeholder="3x/sem" className={INPUT} />
              </Field>
              <Field label="Duração" optional>
                <div className="relative">
                  <input type="number" value={form.duracao_treino_min} onChange={e => set('duracao_treino_min', e.target.value)}
                    placeholder="60" className={INPUT + ' pr-8'} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">min</span>
                </div>
              </Field>
              <Field label="Horário" optional>
                <Chips opcoes={HORARIO_TREINO} value={form.horario_treino} onChange={v => set('horario_treino', v as string)} />
              </Field>
            </div>
            <Field label="Histórico esportivo" optional>
              <textarea value={form.historico_esportivo} onChange={e => set('historico_esportivo', e.target.value)}
                placeholder="Ex: Praticou natação na adolescência, parou há 3 anos, tem dor lombar crônica..." rows={2} className={TEXTAREA} />
            </Field>
          </SectionCard>

          {/* ── 8. Ciclo Menstrual (condicional) ─────────────────────── */}
          {isFeminino && (
            <SectionCard icon={<Moon size={14} />} titulo="Ciclo Menstrual" subtitulo="Regularidade, fase atual, sintomas" defaultOpen={false}>
              <Field label="Ciclo regular?">
                <YesNo value={form.ciclo_regular} onChange={v => set('ciclo_regular', v)} />
              </Field>
              <Field label="Duração média do ciclo" optional>
                <div className="relative">
                  <input type="number" value={form.duracao_ciclo_dias} onChange={e => set('duracao_ciclo_dias', e.target.value)}
                    placeholder="28" min={14} max={45} className={INPUT + ' pr-12'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">dias</span>
                </div>
              </Field>
              <Field label="Fase atual do ciclo" optional>
                <div className="grid grid-cols-2 gap-1.5">
                  {FASES_CICLO.map(f => (
                    <button key={f.val} type="button" onClick={() => set('fase_ciclo', form.fase_ciclo === f.val ? '' : f.val)}
                      className={`flex flex-col px-3 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${form.fase_ciclo === f.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.12] hover:border-white/20'}`}>
                      <p className={`text-xs font-bold ${form.fase_ciclo === f.val ? 'text-black' : 'text-white'}`}>{f.label}</p>
                      <p className={`text-[10px] ${form.fase_ciclo === f.val ? 'text-black/60' : 'text-zinc-500'}`}>{f.sub}</p>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Sintomas relevantes" optional>
                <div className="flex flex-wrap gap-1.5">
                  {SINTOMAS_CICLO.map(s => {
                    const marcado = form.sintomas_ciclo.includes(s.val)
                    return (
                      <button key={s.val} type="button"
                        onClick={() => set('sintomas_ciclo', marcado ? form.sintomas_ciclo.filter(v => v !== s.val) : [...form.sintomas_ciclo, s.val])}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 ${marcado ? 'bg-white/[0.12] border-white/30 text-white' : 'bg-white/[0.04] border-white/[0.12] text-zinc-500'}`}>
                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${marcado ? 'border-white bg-white' : 'border-white/30'}`}>
                          {marcado && <span className="text-black text-[8px] font-black leading-none">✓</span>}
                        </div>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </SectionCard>
          )}

          {/* ── Observações clínicas ──────────────────────────────────── */}
          <div className={isFeminino ? '' : 'md:col-span-2'}>
            <SectionCard icon={<span className="text-xs">📝</span>} titulo="Observações clínicas" subtitulo="Notas livres da consulta" defaultOpen={false}>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                placeholder="Notas adicionais, impressões da consulta, pontos de atenção..." rows={4} className={TEXTAREA} />
            </SectionCard>
          </div>

        </div>
        </fieldset>

        {erro && <p className="text-red-400 text-sm text-center mt-4 bg-red-500/10 rounded-xl py-3">{erro}</p>}

        {!somenteLeitura && (
          <button onClick={handleSalvar} disabled={salvando}
            className="w-full mt-6 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase">
            {salvando ? 'Salvando...' : anamneseId ? 'Atualizar anamnese' : 'Salvar anamnese'}
          </button>
        )}

      </div>
      </div>
    </main>
  )
}
