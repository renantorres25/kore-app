'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type AnamneseForm = {
  patologias: string
  medicamentos: string
  alergias: string
  cirurgias: string
  historico_familiar: string
  nivel_atividade: string
  horas_sono: string
  nivel_estresse: number
  fuma: boolean
  alcool: string
  historico_esportivo: string
  lesoes: string
  restricoes_fisicas: string
  restricoes_alimentares: string
  suplementos: string
  refeicoes_por_dia: string
  habitos_alimentares: string
  objetivo_detalhado: string
  motivacao: string
  prazo_semanas: string
  observacoes: string
}

const FORM_VAZIO: AnamneseForm = {
  patologias: '', medicamentos: '', alergias: '', cirurgias: '', historico_familiar: '',
  nivel_atividade: '', horas_sono: '', nivel_estresse: 0, fuma: false, alcool: '',
  historico_esportivo: '', lesoes: '', restricoes_fisicas: '',
  restricoes_alimentares: '', suplementos: '', refeicoes_por_dia: '', habitos_alimentares: '',
  objetivo_detalhado: '', motivacao: '', prazo_semanas: '', observacoes: '',
}

const NIVEL_ATIVIDADE = [
  { val: 'sedentario',      label: 'Sedentário',      sub: 'Sem exercício regular' },
  { val: 'levemente_ativo', label: 'Leve',            sub: '1–2x por semana' },
  { val: 'moderado',        label: 'Moderado',        sub: '3–4x por semana' },
  { val: 'muito_ativo',     label: 'Muito ativo',     sub: '5–6x por semana' },
  { val: 'atleta',          label: 'Atleta',          sub: 'Treino diário/duplo' },
]

const ALCOOL = [
  { val: 'nao',       label: 'Não bebo' },
  { val: 'social',    label: 'Social' },
  { val: 'moderado',  label: 'Moderado' },
  { val: 'frequente', label: 'Frequente' },
]

function SectionCard({ icon, titulo, subtitulo, children }: { icon: string; titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
      <div className="px-5 py-4 border-b border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="text-white font-bold text-sm">{titulo}</p>
            {subtitulo && <p className="text-zinc-600 text-[11px] mt-0.5">{subtitulo}</p>}
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">
        {label} {optional && <span className="text-zinc-700 normal-case tracking-normal">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

const INPUT_CLASS = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
const TEXTAREA_CLASS = INPUT_CLASS + " resize-none"

export default function AnamnesePage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.clienteId as string

  const [form, setForm] = useState<AnamneseForm>(FORM_VAZIO)
  const [anamneseId, setAnamneseId] = useState<string | null>(null)
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

      // Load viewer profile
      const { data: perfil } = await supabase.from('perfis').select('tipo, nome').eq('id', meuId).single()
      setMeuPerfil(perfil)

      // Load client name
      const { data: clientePerfil } = await supabase.from('perfis').select('nome, email').eq('id', clienteId).single()
      setClienteNome(clientePerfil?.nome ?? clientePerfil?.email ?? null)

      // Determine back URL
      if (perfil?.tipo === 'personal') setBackUrl(`/personal/aluno/${clienteId}`)
      else if (perfil?.tipo === 'nutricionista') setBackUrl(`/nutricionista/paciente/${clienteId}`)
      else setBackUrl('/perfil')

      // Load existing anamnese
      const { data: existente } = await supabase.from('anamneses').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false }).limit(1).single()

      if (existente) {
        setAnamneseId(existente.id)
        setForm({
          patologias: existente.patologias ?? '',
          medicamentos: existente.medicamentos ?? '',
          alergias: existente.alergias ?? '',
          cirurgias: existente.cirurgias ?? '',
          historico_familiar: existente.historico_familiar ?? '',
          nivel_atividade: existente.nivel_atividade ?? '',
          horas_sono: existente.horas_sono != null ? String(existente.horas_sono) : '',
          nivel_estresse: existente.nivel_estresse ?? 0,
          fuma: existente.fuma ?? false,
          alcool: existente.alcool ?? '',
          historico_esportivo: existente.historico_esportivo ?? '',
          lesoes: existente.lesoes ?? '',
          restricoes_fisicas: existente.restricoes_fisicas ?? '',
          restricoes_alimentares: existente.restricoes_alimentares ?? '',
          suplementos: existente.suplementos ?? '',
          refeicoes_por_dia: existente.refeicoes_por_dia != null ? String(existente.refeicoes_por_dia) : '',
          habitos_alimentares: existente.habitos_alimentares ?? '',
          objetivo_detalhado: existente.objetivo_detalhado ?? '',
          motivacao: existente.motivacao ?? '',
          prazo_semanas: existente.prazo_semanas != null ? String(existente.prazo_semanas) : '',
          observacoes: existente.observacoes ?? '',
        })
      }
      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  function set(field: keyof AnamneseForm, val: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const payload = {
      cliente_id: clienteId,
      profissional_id: meuperfil?.tipo !== 'cliente' ? session.user.id : null,
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
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (sucesso) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">✅</div>
        <p className="text-white font-bold text-lg">Anamnese salva!</p>
        <p className="text-zinc-500 text-sm">Voltando...</p>
      </div>
    </main>
  )

  const isProfissional = meuperfil?.tipo === 'personal' || meuperfil?.tipo === 'nutricionista'

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-32" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => router.push(backUrl)} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0">←</button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Anamnese</h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              {isProfissional && clienteNome ? clienteNome : (anamneseId ? 'Atualizar ficha' : 'Ficha de saúde completa')}
            </p>
          </div>
          {anamneseId && (
            <span className="ml-auto text-[9px] uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 shrink-0">Preenchida</span>
          )}
        </div>

        <div className="space-y-5">

          {/* Saúde */}
          <SectionCard icon="🏥" titulo="Saúde" subtitulo="Histórico médico e condições atuais">
            <Field label="Patologias / doenças diagnosticadas" optional>
              <textarea value={form.patologias} onChange={e => set('patologias', e.target.value)}
                placeholder="Ex: Hipertensão, diabetes tipo 2, hipotireoidismo..."
                rows={2} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Medicamentos em uso" optional>
              <textarea value={form.medicamentos} onChange={e => set('medicamentos', e.target.value)}
                placeholder="Nome do medicamento e dose..."
                rows={2} className={TEXTAREA_CLASS} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alergias" optional>
                <input value={form.alergias} onChange={e => set('alergias', e.target.value)}
                  placeholder="Alimentos, medicamentos..."
                  className={INPUT_CLASS} />
              </Field>
              <Field label="Cirurgias" optional>
                <input value={form.cirurgias} onChange={e => set('cirurgias', e.target.value)}
                  placeholder="Ex: Joelho (2019)..."
                  className={INPUT_CLASS} />
              </Field>
            </div>
            <Field label="Histórico familiar relevante" optional>
              <input value={form.historico_familiar} onChange={e => set('historico_familiar', e.target.value)}
                placeholder="Ex: Pai com diabetes, mãe com hipertensão..."
                className={INPUT_CLASS} />
            </Field>
          </SectionCard>

          {/* Estilo de vida */}
          <SectionCard icon="🌿" titulo="Estilo de vida" subtitulo="Rotina, hábitos e bem-estar geral">
            <Field label="Nível de atividade física atual">
              <div className="grid grid-cols-1 gap-1.5">
                {NIVEL_ATIVIDADE.map(n => (
                  <button key={n.val} onClick={() => set('nivel_atividade', n.val)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${form.nivel_atividade === n.val ? 'bg-white border-white text-black' : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${form.nivel_atividade === n.val ? 'bg-black' : 'bg-white/20'}`} />
                    <div>
                      <p className={`text-sm font-bold ${form.nivel_atividade === n.val ? 'text-black' : 'text-white'}`}>{n.label}</p>
                      <p className={`text-[11px] ${form.nivel_atividade === n.val ? 'text-black/60' : 'text-zinc-500'}`}>{n.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas de sono por noite" optional>
                <div className="relative">
                  <input type="number" value={form.horas_sono} onChange={e => set('horas_sono', e.target.value)}
                    placeholder="7" min={0} max={24} step={0.5}
                    className={INPUT_CLASS + " pr-10"} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[11px]">h</span>
                </div>
              </Field>
              <Field label="Nível de estresse (1–10)" optional>
                <div className="relative">
                  <input type="number" value={form.nivel_estresse || ''} onChange={e => set('nivel_estresse', parseInt(e.target.value) || 0)}
                    placeholder="5" min={1} max={10}
                    className={INPUT_CLASS + " pr-10"} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[11px]">/10</span>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fuma?">
                <div className="flex gap-2">
                  {[{ val: false, label: 'Não' }, { val: true, label: 'Sim' }].map(o => (
                    <button key={String(o.val)} onClick={() => set('fuma', o.val)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all active:scale-95 ${form.fuma === o.val ? 'bg-white border-white text-black' : 'bg-white/[0.03] border-white/[0.08] text-zinc-400'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Álcool" optional>
                <select value={form.alcool} onChange={e => set('alcool', e.target.value)}
                  className={INPUT_CLASS + " appearance-none"} style={{ colorScheme: 'dark' }}>
                  <option value="">Selecione</option>
                  {ALCOOL.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>

          {/* Histórico esportivo */}
          <SectionCard icon="🏋️" titulo="Histórico esportivo" subtitulo="Experiência, lesões e limitações físicas">
            <Field label="Histórico esportivo" optional>
              <textarea value={form.historico_esportivo} onChange={e => set('historico_esportivo', e.target.value)}
                placeholder="Ex: 3 anos musculação, praticou natação na infância, parou de correr em 2022..."
                rows={3} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Lesões e histórico de dores" optional>
              <textarea value={form.lesoes} onChange={e => set('lesoes', e.target.value)}
                placeholder="Ex: Lesão no manguito rotador direito (2021), dor lombar crônica..."
                rows={2} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Restrições físicas / movimentos limitados" optional>
              <input value={form.restricoes_fisicas} onChange={e => set('restricoes_fisicas', e.target.value)}
                placeholder="Ex: Evitar agachamento profundo, não pode supino..."
                className={INPUT_CLASS} />
            </Field>
          </SectionCard>

          {/* Nutrição */}
          <SectionCard icon="🥗" titulo="Nutrição" subtitulo="Alimentação, restrições e suplementação">
            <Field label="Restrições alimentares" optional>
              <input value={form.restricoes_alimentares} onChange={e => set('restricoes_alimentares', e.target.value)}
                placeholder="Ex: Intolerância a lactose, vegetariano, sem glúten..."
                className={INPUT_CLASS} />
            </Field>
            <Field label="Suplementos em uso" optional>
              <input value={form.suplementos} onChange={e => set('suplementos', e.target.value)}
                placeholder="Ex: Whey 30g pós-treino, creatina 5g, vitamina D..."
                className={INPUT_CLASS} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Refeições por dia" optional>
                <input type="number" value={form.refeicoes_por_dia} onChange={e => set('refeicoes_por_dia', e.target.value)}
                  placeholder="5" min={1} max={10}
                  className={INPUT_CLASS} />
              </Field>
            </div>
            <Field label="Hábitos alimentares" optional>
              <textarea value={form.habitos_alimentares} onChange={e => set('habitos_alimentares', e.target.value)}
                placeholder="Ex: Come muito fora, pula o café da manhã, come rápido, come bem nos finais de semana..."
                rows={2} className={TEXTAREA_CLASS} />
            </Field>
          </SectionCard>

          {/* Objetivos */}
          <SectionCard icon="🎯" titulo="Objetivos" subtitulo="O que o cliente quer alcançar">
            <Field label="Objetivo detalhado">
              <textarea value={form.objetivo_detalhado} onChange={e => set('objetivo_detalhado', e.target.value)}
                placeholder="Ex: Perder 8kg em 4 meses, principalmente abdômen. Quer melhorar disposição para o trabalho..."
                rows={3} className={TEXTAREA_CLASS} />
            </Field>
            <Field label="Motivação principal" optional>
              <input value={form.motivacao} onChange={e => set('motivacao', e.target.value)}
                placeholder="Ex: Casamento em novembro, recomendação médica, autoestima..."
                className={INPUT_CLASS} />
            </Field>
            <Field label="Prazo desejado (semanas)" optional>
              <div className="relative">
                <input type="number" value={form.prazo_semanas} onChange={e => set('prazo_semanas', e.target.value)}
                  placeholder="16" min={1}
                  className={INPUT_CLASS + " pr-20"} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[11px]">semanas</span>
              </div>
            </Field>
            <Field label="Observações adicionais" optional>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                placeholder="Qualquer outra informação relevante..."
                rows={2} className={TEXTAREA_CLASS} />
            </Field>
          </SectionCard>

        </div>

        {erro && <p className="text-red-400 text-sm text-center mt-4">{erro}</p>}

        <button onClick={handleSalvar} disabled={salvando}
          className="w-full mt-6 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase">
          {salvando ? 'Salvando...' : anamneseId ? 'Atualizar anamnese' : 'Salvar anamnese'}
        </button>
      </div>
    </main>
  )
}
