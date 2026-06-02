'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import SidebarProfissional from '../../components/SidebarProfissional'
import { HeartPulse, Leaf, Dumbbell, Salad, Target } from 'lucide-react'

type AnamneseForm = {
  patologias: string; medicamentos: string; alergias: string; cirurgias: string
  historico_familiar: string; nivel_atividade: string; horas_sono: string
  nivel_estresse: number; fuma: boolean; alcool: string; historico_esportivo: string
  lesoes: string; restricoes_fisicas: string; restricoes_alimentares: string
  suplementos: string; refeicoes_por_dia: string; habitos_alimentares: string
  objetivo_detalhado: string; motivacao: string; prazo_semanas: string; observacoes: string
}
type OutraAnamnese = AnamneseForm & { profissional_nome: string | null; profissional_tipo: string | null }

const FORM_VAZIO: AnamneseForm = {
  patologias: '', medicamentos: '', alergias: '', cirurgias: '', historico_familiar: '',
  nivel_atividade: '', horas_sono: '', nivel_estresse: 0, fuma: false, alcool: '',
  historico_esportivo: '', lesoes: '', restricoes_fisicas: '',
  restricoes_alimentares: '', suplementos: '', refeicoes_por_dia: '', habitos_alimentares: '',
  objetivo_detalhado: '', motivacao: '', prazo_semanas: '', observacoes: '',
}

const NIVEL_ATIVIDADE = [
  { val: 'sedentario',      label: 'Sedentário',  sub: 'Sem exercício regular' },
  { val: 'levemente_ativo', label: 'Leve',         sub: '1–2x por semana' },
  { val: 'moderado',        label: 'Moderado',     sub: '3–4x por semana' },
  { val: 'muito_ativo',     label: 'Muito ativo',  sub: '5–6x por semana' },
  { val: 'atleta',          label: 'Atleta',       sub: 'Treino diário/duplo' },
]
const ALCOOL = [
  { val: 'nao', label: 'Não bebo' }, { val: 'social', label: 'Social' },
  { val: 'moderado', label: 'Moderado' }, { val: 'frequente', label: 'Frequente' },
]
const NIVEL_ATIVIDADE_LABEL: Record<string, string> = {
  sedentario: 'Sedentário', levemente_ativo: 'Levemente ativo',
  moderado: 'Moderado', muito_ativo: 'Muito ativo', atleta: 'Atleta',
}
const ALCOOL_LABEL: Record<string, string> = {
  nao: 'Não bebe', social: 'Social', moderado: 'Moderado', frequente: 'Frequente',
}

function SectionCard({ icon, titulo, subtitulo, badge, children, defaultOpen = true }: { icon: React.ReactNode; titulo: string; subtitulo?: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [aberto, setAberto] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
      <button onClick={() => setAberto(p => !p)} className="w-full px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        style={{ borderBottom: aberto ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center text-zinc-400 shrink-0">{icon}</div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{titulo}</p>
            {subtitulo && !aberto && <p className="text-zinc-600 text-xs mt-0.5">{subtitulo}</p>}
          </div>
          {badge && <span className="text-[11px] font-medium text-zinc-400 bg-white/[0.06] rounded-full px-2.5 py-0.5">{badge}</span>}
          <span className={`text-zinc-600 text-xs ml-1 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>
      {aberto && <div className="p-5 space-y-4">{children}</div>}
    </div>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-zinc-400 text-[12px] font-medium block mb-1.5">
        {label}{optional && <span className="text-zinc-700 normal-case tracking-normal ml-1">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

function ReadRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (!value && value !== false && value !== 0) return null
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value)
  return (
    <div className="flex gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-zinc-500 text-[11px] font-medium w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-zinc-300 text-sm flex-1">{display}</span>
    </div>
  )
}

const INPUT_CLASS = "w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
const TEXTAREA_CLASS = INPUT_CLASS + " resize-none"

export default function AnamnesePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.clienteId as string

  const [form, setForm] = useState<AnamneseForm>(FORM_VAZIO)
  const [anamneseId, setAnamneseId] = useState<string | null>(null)
  const [outraAnamnese, setOutraAnamnese] = useState<OutraAnamnese | null>(null)
  const [verOutra, setVerOutra] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [meuperfil, setMeuPerfil] = useState<{ tipo: string; nome: string | null } | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [backUrl, setBackUrl] = useState('/dashboard')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const meuId = session.user.id

      const [{ data: perfil }, { data: clientePerfil }] = await Promise.all([
        supabase.from('perfis').select('tipo, nome').eq('id', meuId).single(),
        supabase.from('perfis').select('nome, email').eq('id', clienteId).single(),
      ])
      setMeuPerfil(perfil)
      setClienteNome(clientePerfil?.nome ?? clientePerfil?.email ?? null)

      if (perfil?.tipo === 'personal') setBackUrl(`/personal/aluno/${clienteId}`)
      else if (perfil?.tipo === 'nutricionista') setBackUrl(`/nutricionista/paciente/${clienteId}`)
      else setBackUrl('/perfil')

      const isProfissional = perfil?.tipo === 'personal' || perfil?.tipo === 'nutricionista'

      // Load own anamnese (by profissional_id for professionals, by cliente_id for clients)
      const propria = isProfissional
        ? await supabase.from('anamneses').select('*').eq('cliente_id', clienteId).eq('profissional_id', meuId).limit(1).single()
        : await supabase.from('anamneses').select('*').eq('cliente_id', clienteId).is('profissional_id', null).limit(1).single()

      if (propria.data) {
        const e = propria.data
        setAnamneseId(e.id)
        setForm({
          patologias: e.patologias ?? '', medicamentos: e.medicamentos ?? '',
          alergias: e.alergias ?? '', cirurgias: e.cirurgias ?? '',
          historico_familiar: e.historico_familiar ?? '', nivel_atividade: e.nivel_atividade ?? '',
          horas_sono: e.horas_sono != null ? String(e.horas_sono) : '',
          nivel_estresse: e.nivel_estresse ?? 0, fuma: e.fuma ?? false, alcool: e.alcool ?? '',
          historico_esportivo: e.historico_esportivo ?? '', lesoes: e.lesoes ?? '',
          restricoes_fisicas: e.restricoes_fisicas ?? '', restricoes_alimentares: e.restricoes_alimentares ?? '',
          suplementos: e.suplementos ?? '', refeicoes_por_dia: e.refeicoes_por_dia != null ? String(e.refeicoes_por_dia) : '',
          habitos_alimentares: e.habitos_alimentares ?? '', objetivo_detalhado: e.objetivo_detalhado ?? '',
          motivacao: e.motivacao ?? '', prazo_semanas: e.prazo_semanas != null ? String(e.prazo_semanas) : '',
          observacoes: e.observacoes ?? '',
        })
      }

      // Load other professionals' anamneses
      if (isProfissional) {
        const { data: outras } = await supabase
          .from('anamneses').select('*').eq('cliente_id', clienteId).neq('profissional_id', meuId)
          .order('criado_em', { ascending: false }).limit(1)
        if (outras?.length) {
          const o = outras[0]
          // Load other professional's name/type
          const { data: outroPerfil } = o.profissional_id
            ? await supabase.from('perfis').select('nome, tipo').eq('id', o.profissional_id).single()
            : { data: null }
          setOutraAnamnese({
            patologias: o.patologias ?? '', medicamentos: o.medicamentos ?? '',
            alergias: o.alergias ?? '', cirurgias: o.cirurgias ?? '',
            historico_familiar: o.historico_familiar ?? '', nivel_atividade: o.nivel_atividade ?? '',
            horas_sono: o.horas_sono != null ? String(o.horas_sono) : '',
            nivel_estresse: o.nivel_estresse ?? 0, fuma: o.fuma ?? false, alcool: o.alcool ?? '',
            historico_esportivo: o.historico_esportivo ?? '', lesoes: o.lesoes ?? '',
            restricoes_fisicas: o.restricoes_fisicas ?? '', restricoes_alimentares: o.restricoes_alimentares ?? '',
            suplementos: o.suplementos ?? '', refeicoes_por_dia: o.refeicoes_por_dia != null ? String(o.refeicoes_por_dia) : '',
            habitos_alimentares: o.habitos_alimentares ?? '', objetivo_detalhado: o.objetivo_detalhado ?? '',
            motivacao: o.motivacao ?? '', prazo_semanas: o.prazo_semanas != null ? String(o.prazo_semanas) : '',
            observacoes: o.observacoes ?? '',
            profissional_nome: outroPerfil?.nome ?? null,
            profissional_tipo: outroPerfil?.tipo ?? null,
          })
        }
      }

      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  function set(field: keyof AnamneseForm, val: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSalvar() {
    setSalvando(true); setErro('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const isProfissional = meuperfil?.tipo === 'personal' || meuperfil?.tipo === 'nutricionista'
    const payload = {
      cliente_id: clienteId,
      profissional_id: isProfissional ? session.user.id : null,
      patologias: form.patologias.trim() || null,
      medicamentos: form.medicamentos.trim() || null,
      alergias: form.alergias.trim() || null,
      cirurgias: form.cirurgias.trim() || null,
      historico_familiar: form.historico_familiar.trim() || null,
      nivel_atividade: form.nivel_atividade || null,
      horas_sono: form.horas_sono ? parseFloat(form.horas_sono) : null,
      nivel_estresse: form.nivel_estresse || null,
      fuma: form.fuma,
      alcool: form.alcool || null,
      historico_esportivo: form.historico_esportivo.trim() || null,
      lesoes: form.lesoes.trim() || null,
      restricoes_fisicas: form.restricoes_fisicas.trim() || null,
      restricoes_alimentares: form.restricoes_alimentares.trim() || null,
      suplementos: form.suplementos.trim() || null,
      refeicoes_por_dia: form.refeicoes_por_dia ? parseInt(form.refeicoes_por_dia) : null,
      habitos_alimentares: form.habitos_alimentares.trim() || null,
      objetivo_detalhado: form.objetivo_detalhado.trim() || null,
      motivacao: form.motivacao.trim() || null,
      prazo_semanas: form.prazo_semanas ? parseInt(form.prazo_semanas) : null,
      observacoes: form.observacoes.trim() || null,
      atualizado_em: new Date().toISOString(),
    }

    let error
    if (anamneseId) {
      const res = await supabase.from('anamneses').update(payload).eq('id', anamneseId)
      error = res.error
    } else {
      const res = await supabase.from('anamneses').insert(payload).select('id').single()
      error = res.error
      if (!error && res.data) setAnamneseId(res.data.id)
    }

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
    setSucesso(true)
    setTimeout(() => { setSucesso(false); router.push(backUrl) }, 1400)
  }

  if (carregando) return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (sucesso) return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">✅</div>
        <p className="text-white font-bold text-lg">Anamnese salva!</p>
        <p className="text-zinc-500 text-sm">Voltando...</p>
      </div>
    </main>
  )

  const isProfissional = meuperfil?.tipo === 'personal' || meuperfil?.tipo === 'nutricionista'
  const outraTipoLabel = outraAnamnese?.profissional_tipo === 'personal' ? 'Personal' : outraAnamnese?.profissional_tipo === 'nutricionista' ? 'Nutricionista' : 'Profissional'
  const outraNome = outraAnamnese?.profissional_nome ?? outraTipoLabel

  const tipoSidebar = meuperfil?.tipo === 'personal' ? 'personal' : 'nutricionista'

  return (
    <main className="min-h-[100dvh] text-white md:flex" style={{ background: 'var(--bg-base)' }}>
      {isProfissional && <SidebarProfissional tipo={tipoSidebar} />}
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div className="max-w-md mx-auto px-4 pb-32 md:max-w-3xl md:px-10" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push(backUrl)} className="w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0 text-lg">←</button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Anamnese</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {isProfissional && clienteNome ? clienteNome : (anamneseId ? 'Atualizar ficha de saúde' : 'Ficha de saúde completa')}
            </p>
          </div>
          {anamneseId && (
            <span className="ml-auto text-xs uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 shrink-0">Preenchida</span>
          )}
        </div>

        {/* 2 colunas no desktop */}
        <div className="space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:gap-5">

          <SectionCard icon={<HeartPulse size={14} />} titulo="Saúde" subtitulo="Histórico médico e condições atuais">
            <Field label="Patologias / doenças diagnosticadas" optional>
              <textarea value={form.patologias} onChange={e => set('patologias', e.target.value)}
                placeholder="Ex: Hipertensão, diabetes tipo 2, hipotireoidismo..." rows={2} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Medicamentos em uso" optional>
              <textarea value={form.medicamentos} onChange={e => set('medicamentos', e.target.value)}
                placeholder="Nome do medicamento e dose..." rows={2} className={TEXTAREA_CLASS} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alergias" optional>
                <input value={form.alergias} onChange={e => set('alergias', e.target.value)}
                  placeholder="Alimentos, medicamentos..." className={INPUT_CLASS} />
              </Field>
              <Field label="Cirurgias" optional>
                <input value={form.cirurgias} onChange={e => set('cirurgias', e.target.value)}
                  placeholder="Ex: Joelho (2019)..." className={INPUT_CLASS} />
              </Field>
            </div>
            <Field label="Histórico familiar relevante" optional>
              <input value={form.historico_familiar} onChange={e => set('historico_familiar', e.target.value)}
                placeholder="Ex: Pai com diabetes, mãe com hipertensão..." className={INPUT_CLASS} />
            </Field>
          </SectionCard>

          <SectionCard icon={<Leaf size={14} />} titulo="Estilo de vida" subtitulo="Rotina, hábitos e bem-estar geral">
            <Field label="Nível de atividade física atual">
              <div className="grid grid-cols-1 gap-1.5">
                {NIVEL_ATIVIDADE.map(n => (
                  <button key={n.val} onClick={() => set('nivel_atividade', n.val)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${form.nivel_atividade === n.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.14] hover:border-white/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${form.nivel_atividade === n.val ? 'bg-black' : 'bg-white/20'}`} />
                    <div>
                      <p className={`text-sm font-bold ${form.nivel_atividade === n.val ? 'text-black' : 'text-white'}`}>{n.label}</p>
                      <p className={`text-sm ${form.nivel_atividade === n.val ? 'text-black/60' : 'text-zinc-500'}`}>{n.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas de sono por noite" optional>
                <div className="relative">
                  <input type="number" value={form.horas_sono} onChange={e => set('horas_sono', e.target.value)}
                    placeholder="7" min={0} max={24} step={0.5} className={INPUT_CLASS + " pr-10"} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">h</span>
                </div>
              </Field>
              <Field label="Nível de estresse (1–10)" optional>
                <div className="relative">
                  <input type="number" value={form.nivel_estresse || ''} onChange={e => set('nivel_estresse', parseInt(e.target.value) || 0)}
                    placeholder="5" min={1} max={10} className={INPUT_CLASS + " pr-10"} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">/10</span>
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fuma?">
                <div className="flex gap-2">
                  {[{ val: false, label: 'Não' }, { val: true, label: 'Sim' }].map(o => (
                    <button key={String(o.val)} onClick={() => set('fuma', o.val)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all active:scale-95 ${form.fuma === o.val ? 'bg-white border-white text-black' : 'bg-white/[0.05] border-white/[0.14] text-zinc-400'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Álcool" optional>
                <select value={form.alcool} onChange={e => set('alcool', e.target.value)}
                  className={INPUT_CLASS + " appearance-none"} style={{ colorScheme: 'dark', background: '#141414' }}>
                  <option value="">Selecione</option>
                  {ALCOOL.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={<Dumbbell size={14} />} titulo="Histórico esportivo" subtitulo="Experiência, lesões e limitações físicas">
            <Field label="Histórico esportivo" optional>
              <textarea value={form.historico_esportivo} onChange={e => set('historico_esportivo', e.target.value)}
                placeholder="Ex: 3 anos musculação, praticou natação na infância..." rows={3} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Lesões e histórico de dores" optional>
              <textarea value={form.lesoes} onChange={e => set('lesoes', e.target.value)}
                placeholder="Ex: Lesão no manguito rotador direito (2021), dor lombar crônica..." rows={2} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Restrições físicas / movimentos limitados" optional>
              <input value={form.restricoes_fisicas} onChange={e => set('restricoes_fisicas', e.target.value)}
                placeholder="Ex: Evitar agachamento profundo, não pode supino..." className={INPUT_CLASS} />
            </Field>
          </SectionCard>

          <SectionCard icon={<Salad size={14} />} titulo="Nutrição" subtitulo="Alimentação, restrições e suplementação">
            <Field label="Restrições alimentares" optional>
              <input value={form.restricoes_alimentares} onChange={e => set('restricoes_alimentares', e.target.value)}
                placeholder="Ex: Intolerância a lactose, vegetariano, sem glúten..." className={INPUT_CLASS} />
            </Field>
            <Field label="Suplementos em uso" optional>
              <input value={form.suplementos} onChange={e => set('suplementos', e.target.value)}
                placeholder="Ex: Whey 30g pós-treino, creatina 5g, vitamina D..." className={INPUT_CLASS} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Refeições por dia" optional>
                <input type="number" value={form.refeicoes_por_dia} onChange={e => set('refeicoes_por_dia', e.target.value)}
                  placeholder="5" min={1} max={10} className={INPUT_CLASS} />
              </Field>
            </div>
            <Field label="Hábitos alimentares" optional>
              <textarea value={form.habitos_alimentares} onChange={e => set('habitos_alimentares', e.target.value)}
                placeholder="Ex: Come muito fora, pula o café da manhã, come bem nos finais de semana..." rows={2} className={TEXTAREA_CLASS} />
            </Field>
          </SectionCard>

          <div className="md:col-span-2"><SectionCard icon={<Target size={14} />} titulo="Objetivos" subtitulo="O que o cliente quer alcançar">
            <Field label="Objetivo detalhado">
              <textarea value={form.objetivo_detalhado} onChange={e => set('objetivo_detalhado', e.target.value)}
                placeholder="Ex: Perder 8kg em 4 meses, principalmente abdômen..." rows={3} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Motivação principal" optional>
              <input value={form.motivacao} onChange={e => set('motivacao', e.target.value)}
                placeholder="Ex: Casamento em novembro, recomendação médica..." className={INPUT_CLASS} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prazo desejado" optional>
                <div className="relative">
                  <input type="number" value={form.prazo_semanas} onChange={e => set('prazo_semanas', e.target.value)}
                    placeholder="16" min={1} className={INPUT_CLASS + " pr-16"} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">sem.</span>
                </div>
              </Field>
            </div>
            <Field label="Observações adicionais" optional>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                placeholder="Qualquer outra informação relevante..." rows={2} className={TEXTAREA_CLASS} />
            </Field>
          </SectionCard></div>

          {/* ── Notas do outro profissional (read-only) ───────────────────── */}
          {outraAnamnese && (
            <div className="rounded-2xl border border-blue-500/20 overflow-hidden" style={{ background: '#101825' }}>
              <button onClick={() => setVerOutra(v => !v)}
                className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <span className="text-sm">{outraAnamnese.profissional_tipo === 'nutricionista' ? '🥗' : '🏋️'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-300 font-bold text-sm">Notas de {outraNome}</p>
                  <p className="text-zinc-500 text-xs">{outraTipoLabel} · somente leitura</p>
                </div>
                <span className="text-zinc-600 text-xs">{verOutra ? '▲' : '▼'}</span>
              </button>

              {verOutra && (
                <div className="px-5 pb-5 space-y-4 border-t border-blue-500/10">
                  {/* Saúde */}
                  {(outraAnamnese.patologias || outraAnamnese.medicamentos || outraAnamnese.alergias || outraAnamnese.cirurgias || outraAnamnese.historico_familiar) && (
                    <div className="pt-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-zinc-600 mb-2">Saúde</p>
                      <ReadRow label="Patologias" value={outraAnamnese.patologias} />
                      <ReadRow label="Medicamentos" value={outraAnamnese.medicamentos} />
                      <ReadRow label="Alergias" value={outraAnamnese.alergias} />
                      <ReadRow label="Cirurgias" value={outraAnamnese.cirurgias} />
                      <ReadRow label="Hist. familiar" value={outraAnamnese.historico_familiar} />
                    </div>
                  )}
                  {/* Estilo de vida */}
                  {(outraAnamnese.nivel_atividade || outraAnamnese.horas_sono || outraAnamnese.nivel_estresse || outraAnamnese.alcool) && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-zinc-600 mb-2">Estilo de vida</p>
                      <ReadRow label="Atividade" value={outraAnamnese.nivel_atividade ? NIVEL_ATIVIDADE_LABEL[outraAnamnese.nivel_atividade] : null} />
                      <ReadRow label="Sono" value={outraAnamnese.horas_sono ? `${outraAnamnese.horas_sono}h/noite` : null} />
                      <ReadRow label="Estresse" value={outraAnamnese.nivel_estresse ? `${outraAnamnese.nivel_estresse}/10` : null} />
                      <ReadRow label="Fuma" value={outraAnamnese.fuma} />
                      <ReadRow label="Álcool" value={outraAnamnese.alcool ? ALCOOL_LABEL[outraAnamnese.alcool] : null} />
                    </div>
                  )}
                  {/* Esportivo */}
                  {(outraAnamnese.historico_esportivo || outraAnamnese.lesoes || outraAnamnese.restricoes_fisicas) && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-zinc-600 mb-2">Histórico esportivo</p>
                      <ReadRow label="Histórico" value={outraAnamnese.historico_esportivo} />
                      <ReadRow label="Lesões" value={outraAnamnese.lesoes} />
                      <ReadRow label="Restrições" value={outraAnamnese.restricoes_fisicas} />
                    </div>
                  )}
                  {/* Nutrição */}
                  {(outraAnamnese.restricoes_alimentares || outraAnamnese.suplementos || outraAnamnese.habitos_alimentares || outraAnamnese.refeicoes_por_dia) && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-zinc-600 mb-2">Nutrição</p>
                      <ReadRow label="Restrições" value={outraAnamnese.restricoes_alimentares} />
                      <ReadRow label="Suplementos" value={outraAnamnese.suplementos} />
                      <ReadRow label="Refeições/dia" value={outraAnamnese.refeicoes_por_dia} />
                      <ReadRow label="Hábitos" value={outraAnamnese.habitos_alimentares} />
                    </div>
                  )}
                  {/* Objetivos */}
                  {(outraAnamnese.objetivo_detalhado || outraAnamnese.motivacao || outraAnamnese.observacoes) && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-zinc-600 mb-2">Objetivos</p>
                      <ReadRow label="Objetivo" value={outraAnamnese.objetivo_detalhado} />
                      <ReadRow label="Motivação" value={outraAnamnese.motivacao} />
                      <ReadRow label="Prazo" value={outraAnamnese.prazo_semanas ? `${outraAnamnese.prazo_semanas} semanas` : null} />
                      <ReadRow label="Observações" value={outraAnamnese.observacoes} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {erro && <p className="text-red-400 text-sm text-center mt-4">{erro}</p>}

        <button onClick={handleSalvar} disabled={salvando}
          className="w-full mt-6 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase">
          {salvando ? 'Salvando...' : anamneseId ? 'Atualizar anamnese' : 'Salvar anamnese'}
        </button>
      </div>
      </div>
    </main>
  )
}
