'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown, Calculator, Activity, Ruler, Scale } from 'lucide-react'

type PacienteBase = {
  peso: number | null; altura: number | null
  sexo: string | null; data_nascimento: string | null
  objetivo: string | null
}

type Props = {
  clienteId: string
  paciente: PacienteBase | null
  onClose: () => void
  onSaved: () => void
}

function getAge(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const h = new Date(), n = new Date(dataNasc)
  let a = h.getFullYear() - n.getFullYear()
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--
  return a
}

function calcIMC(peso: number, alt: number) {
  const h = alt / 100
  return Math.round((peso / (h * h)) * 10) / 10
}

function classIMC(imc: number, sexo: string | null) {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-blue-400' }
  if (imc < 25)   return { label: 'Peso normal',    cor: 'text-[var(--accent)]' }
  if (imc < 30)   return { label: 'Sobrepeso',      cor: 'text-yellow-400' }
  if (imc < 35)   return { label: 'Obesidade I',    cor: 'text-orange-400' }
  return               { label: 'Obesidade II+',    cor: 'text-red-400' }
}

// Mifflin-St Jeor
function calcTMB(peso: number, alt: number, idade: number, sexo: string | null) {
  const base = 10 * peso + 6.25 * alt - 5 * idade
  return Math.round(sexo === 'masculino' ? base + 5 : base - 161)
}

function calcPesoIdeal(alt: number, sexo: string | null) {
  // Fórmula de Hamwi
  const base = sexo === 'masculino' ? 48 : 45.5
  const extra = ((alt - 150) / 2.5) * (sexo === 'masculino' ? 2.7 : 2.2)
  return Math.round((base + extra) * 10) / 10
}

function calcGorduraPorCirc(pescoco: number, cintura: number, quadril: number | null, alt: number, sexo: string | null) {
  // Fórmula de Marinha dos EUA
  if (sexo === 'masculino') {
    const v = 86.010 * Math.log10(cintura - pescoco) - 70.041 * Math.log10(alt) + 36.76
    return Math.round(v * 10) / 10
  } else {
    if (!quadril) return null
    const v = 163.205 * Math.log10(cintura + quadril - pescoco) - 97.684 * Math.log10(alt) - 78.387
    return Math.round(v * 10) / 10
  }
}

type FormEv = {
  data: string
  peso: string; altura: string
  gordura_pct: string; massa_muscular: string
  pescoco: string; ombro: string; torax: string
  cintura: string; abdomen_circ: string; quadril: string
  braco_dir: string; braco_dir_contraido: string; braco_esq: string
  antebraco_dir: string; antebraco_esq: string
  coxa_dir: string; coxa_esq: string
  panturrilha_dir: string; panturrilha_esq: string
  dobra_triceps: string; dobra_subescapular: string
  dobra_suprailiaca: string; dobra_abdominal: string
  dobra_coxa: string; dobra_peitoral: string
  pa_sistolica: string; pa_diastolica: string; fc_repouso: string
  observacoes: string
}

const FORM_VAZIO: FormEv = {
  data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
  peso: '', altura: '', gordura_pct: '', massa_muscular: '',
  pescoco: '', ombro: '', torax: '', cintura: '', abdomen_circ: '', quadril: '',
  braco_dir: '', braco_dir_contraido: '', braco_esq: '',
  antebraco_dir: '', antebraco_esq: '',
  coxa_dir: '', coxa_esq: '', panturrilha_dir: '', panturrilha_esq: '',
  dobra_triceps: '', dobra_subescapular: '', dobra_suprailiaca: '',
  dobra_abdominal: '', dobra_coxa: '', dobra_peitoral: '',
  pa_sistolica: '', pa_diastolica: '', fc_repouso: '',
  observacoes: '',
}

function N(s: string): number | null { const v = parseFloat(s); return isNaN(v) ? null : v }

export default function ModalAvaliacaoCompleta({ clienteId, paciente, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormEv>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [secaoAberta, setSecaoAberta] = useState<string>('composicao')

  const set = (k: keyof FormEv, v: string) => setForm(p => ({ ...p, [k]: v }))

  const peso = N(form.peso) ?? paciente?.peso ?? null
  const alt = N(form.altura) ?? paciente?.altura ?? null
  const sexo = paciente?.sexo ?? null
  const idade = getAge(paciente?.data_nascimento ?? null)

  // Auto calculations
  const imc = peso && alt ? calcIMC(peso, alt) : null
  const imcClass = imc ? classIMC(imc, sexo) : null
  const tmb = peso && alt && idade ? calcTMB(peso, alt, idade, sexo) : null
  const pesoIdeal = alt ? calcPesoIdeal(alt, sexo) : null
  const rcq = N(form.cintura) && N(form.quadril) ? Math.round((N(form.cintura)! / N(form.quadril)!) * 100) / 100 : null
  const rca = N(form.cintura) && alt ? Math.round((N(form.cintura)! / alt) * 100) / 100 : null
  const gordPorCirc = N(form.pescoco) && N(form.cintura) && alt ?
    calcGorduraPorCirc(N(form.pescoco)!, N(form.cintura)!, N(form.quadril), alt, sexo) : null
  const gordPct = N(form.gordura_pct) ?? gordPorCirc
  const massaGorda = peso && gordPct ? Math.round(peso * gordPct / 100 * 10) / 10 : null
  const massaMagra = peso && massaGorda ? Math.round((peso - massaGorda) * 10) / 10 : null

  const riscoRCQ = rcq ? (sexo === 'masculino' ? rcq > 0.9 : rcq > 0.85) : null

  async function salvar() {
    if (!peso) return
    setSalvando(true)
    const { error } = await supabase.from('evolucao_medidas').insert({
      cliente_id: clienteId,
      data: form.data,
      peso: N(form.peso), altura: N(form.altura),
      gordura_pct: N(form.gordura_pct) ?? gordPorCirc,
      massa_muscular: N(form.massa_muscular) ?? (massaMagra ? Math.round(massaMagra * 0.85 * 10) / 10 : null),
      cintura: N(form.cintura), quadril: N(form.quadril),
      abdomen: N(form.abdomen_circ),
      braco_dir: N(form.braco_dir), braco_esq: N(form.braco_esq),
      coxa_dir: N(form.coxa_dir), coxa_esq: N(form.coxa_esq),
      panturrilha_dir: N(form.panturrilha_dir), panturrilha_esq: N(form.panturrilha_esq),
      peitoral: N(form.torax),
      // novos campos
      pescoco: N(form.pescoco), ombro: N(form.ombro), torax: N(form.torax),
      abdomen_circ: N(form.abdomen_circ),
      braco_dir_contraido: N(form.braco_dir_contraido),
      antebraco_dir: N(form.antebraco_dir), antebraco_esq: N(form.antebraco_esq),
      dobra_triceps: N(form.dobra_triceps), dobra_subescapular: N(form.dobra_subescapular),
      dobra_suprailiaca: N(form.dobra_suprailiaca), dobra_abdominal: N(form.dobra_abdominal),
      dobra_coxa: N(form.dobra_coxa), dobra_peitoral: N(form.dobra_peitoral),
      pa_sistolica: N(form.pa_sistolica), pa_diastolica: N(form.pa_diastolica),
      fc_repouso: N(form.fc_repouso),
      imc_calculado: imc, tmb_calculada: tmb,
      gordura_pct_calculada: gordPorCirc, peso_ideal_calculado: pesoIdeal,
      observacoes: form.observacoes || null,
    })
    if (!error) onSaved()
    setSalvando(false)
  }

  const INPUT = "w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none mono focus:ring-1 focus:ring-[var(--accent)]/40"
  const STYLE = { background: 'var(--surface-2)' } as React.CSSProperties

  function Secao({ id, titulo, icon, children }: { id: string; titulo: string; icon: React.ReactNode; children: React.ReactNode }) {
    const aberta = secaoAberta === id
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
        <button onClick={() => setSecaoAberta(aberta ? '' : id)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors">
          <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center text-zinc-400 shrink-0">{icon}</div>
          <p className="text-white font-semibold text-sm flex-1">{titulo}</p>
          <ChevronDown size={15} className={`text-zinc-500 transition-transform ${aberta ? 'rotate-180' : ''}`} />
        </button>
        {aberta && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/[0.07]">{children}</div>}
      </div>
    )
  }

  function Campo({ label, k, unit, placeholder }: { label: string; k: keyof FormEv; unit?: string; placeholder?: string }) {
    return (
      <div>
        <label className="text-zinc-400 text-[11px] font-medium block mb-1">{label}</label>
        <div className="relative">
          <input type="number" step="0.1" placeholder={placeholder ?? '—'}
            value={form[k]} onChange={e => set(k, e.target.value)}
            className={INPUT} style={STYLE} />
          {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">{unit}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center px-0 md:px-4"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-3xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-base)', maxHeight: '95dvh' }}>

        {/* Header fixo */}
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/[0.08]"
          style={{ background: 'var(--surface-1)' }}>
          <div>
            <p className="text-white font-black text-lg">Avaliação Completa</p>
            <p className="text-zinc-500 text-sm mt-0.5">{paciente ? `${paciente.sexo ? (paciente.sexo.charAt(0).toUpperCase() + paciente.sexo.slice(1)) : ''}${idade ? ` · ${idade} anos` : ''}${paciente.peso ? ` · ${paciente.peso}kg` : ''}` : 'Novo registro'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90 text-sm">✕</button>
        </div>

        {/* Resultados calculados — sempre visíveis */}
        {(imc || tmb || pesoIdeal || rcq) && (
          <div className="shrink-0 px-6 py-3 border-b border-white/[0.06]" style={{ background: 'var(--surface-2)' }}>
            <div className="flex gap-4 flex-wrap">
              {imc && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">IMC</p>
                  <p className={`text-lg font-black mono ${imcClass?.cor}`}>{imc}</p>
                  <p className={`text-[10px] ${imcClass?.cor}`}>{imcClass?.label}</p>
                </div>
              )}
              {tmb && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">TMB</p>
                  <p className="text-lg font-black mono text-[var(--accent)]">{tmb}</p>
                  <p className="text-[10px] text-zinc-500">kcal/dia</p>
                </div>
              )}
              {pesoIdeal && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Peso ideal</p>
                  <p className="text-lg font-black mono text-blue-300">{pesoIdeal}</p>
                  <p className="text-[10px] text-zinc-500">kg (Hamwi)</p>
                </div>
              )}
              {gordPct && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">% Gordura</p>
                  <p className="text-lg font-black mono text-orange-300">{gordPct}</p>
                  <p className="text-[10px] text-zinc-500">{N(form.gordura_pct) ? 'medida' : 'estimada'}</p>
                </div>
              )}
              {massaGorda && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Massa gorda</p>
                  <p className="text-lg font-black mono text-orange-300">{massaGorda}</p>
                  <p className="text-[10px] text-zinc-500">kg</p>
                </div>
              )}
              {massaMagra && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Massa magra</p>
                  <p className="text-lg font-black mono text-emerald-300">{massaMagra}</p>
                  <p className="text-[10px] text-zinc-500">kg</p>
                </div>
              )}
              {rcq && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">RCQ</p>
                  <p className={`text-lg font-black mono ${riscoRCQ ? 'text-red-400' : 'text-[var(--accent)]'}`}>{rcq}</p>
                  <p className={`text-[10px] ${riscoRCQ ? 'text-red-400' : 'text-zinc-500'}`}>{riscoRCQ ? 'risco elevado' : 'normal'}</p>
                </div>
              )}
              {tmb && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">GET (mod.)</p>
                  <p className="text-lg font-black mono text-violet-300">{Math.round(tmb * 1.55)}</p>
                  <p className="text-[10px] text-zinc-500">kcal/dia</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formulário scrollável */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

          {/* Data */}
          <div>
            <label className="text-zinc-400 text-[12px] font-medium block mb-1.5">Data da avaliação</label>
            <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
              style={{ ...STYLE, colorScheme: 'dark' }} />
          </div>

          <Secao id="composicao" titulo="Composição corporal" icon={<Scale size={14} />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              <Campo label="Peso (kg)" k="peso" unit="kg" placeholder={paciente?.peso?.toString()} />
              <Campo label="Altura (cm)" k="altura" unit="cm" placeholder={paciente?.altura?.toString()} />
              <Campo label="% Gordura (medida)" k="gordura_pct" unit="%" placeholder="19.0" />
              <Campo label="Massa muscular (kg)" k="massa_muscular" unit="kg" placeholder="70.0" />
              <Campo label="FC Repouso" k="fc_repouso" unit="bpm" placeholder="65" />
              <div className="flex gap-2">
                <div className="flex-1"><Campo label="PA Sistólica" k="pa_sistolica" unit="mmHg" placeholder="120" /></div>
                <div className="flex-1"><Campo label="PA Diastólica" k="pa_diastolica" unit="mmHg" placeholder="80" /></div>
              </div>
            </div>
          </Secao>

          <Secao id="circunferencias" titulo="Circunferências" icon={<Ruler size={14} />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              <Campo label="Pescoço" k="pescoco" unit="cm" />
              <Campo label="Ombro" k="ombro" unit="cm" />
              <Campo label="Tórax" k="torax" unit="cm" />
              <Campo label="Cintura" k="cintura" unit="cm" />
              <Campo label="Abdômen" k="abdomen_circ" unit="cm" />
              <Campo label="Quadril" k="quadril" unit="cm" />
              <Campo label="Braço Dir. (relaxado)" k="braco_dir" unit="cm" />
              <Campo label="Braço Dir. (contraído)" k="braco_dir_contraido" unit="cm" />
              <Campo label="Braço Esq." k="braco_esq" unit="cm" />
              <Campo label="Antebraço Dir." k="antebraco_dir" unit="cm" />
              <Campo label="Antebraço Esq." k="antebraco_esq" unit="cm" />
              <Campo label="Coxa Dir." k="coxa_dir" unit="cm" />
              <Campo label="Coxa Esq." k="coxa_esq" unit="cm" />
              <Campo label="Panturrilha Dir." k="panturrilha_dir" unit="cm" />
              <Campo label="Panturrilha Esq." k="panturrilha_esq" unit="cm" />
            </div>
          </Secao>

          <Secao id="dobras" titulo="Dobras cutâneas (Pollock)" icon={<Activity size={14} />}>
            <p className="text-zinc-500 text-xs pt-3">Preencha as dobras para calcular % de gordura automaticamente</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Campo label="Tríceps" k="dobra_triceps" unit="mm" />
              <Campo label="Subescapular" k="dobra_subescapular" unit="mm" />
              <Campo label="Supra-ilíaca" k="dobra_suprailiaca" unit="mm" />
              <Campo label="Abdominal" k="dobra_abdominal" unit="mm" />
              <Campo label="Coxa" k="dobra_coxa" unit="mm" />
              <Campo label="Peitoral" k="dobra_peitoral" unit="mm" />
            </div>
          </Secao>

          <Secao id="calculado" titulo="Métricas calculadas" icon={<Calculator size={14} />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              {[
                { label: 'IMC', val: imc, unit: 'kg/m²', sub: imcClass?.label, cor: imcClass?.cor },
                { label: 'Peso ideal', val: pesoIdeal, unit: 'kg', sub: 'Hamwi', cor: 'text-blue-300' },
                { label: 'TMB', val: tmb, unit: 'kcal/dia', sub: 'Mifflin-St Jeor', cor: 'text-[var(--accent)]' },
                { label: 'GET Sedentário', val: tmb ? Math.round(tmb * 1.2) : null, unit: 'kcal', sub: '×1.2', cor: 'text-zinc-300' },
                { label: 'GET Moderado', val: tmb ? Math.round(tmb * 1.55) : null, unit: 'kcal', sub: '×1.55', cor: 'text-zinc-300' },
                { label: 'GET Muito Ativo', val: tmb ? Math.round(tmb * 1.725) : null, unit: 'kcal', sub: '×1.725', cor: 'text-zinc-300' },
                { label: '% Gordura estimada', val: gordPorCirc, unit: '%', sub: 'Marinha EUA', cor: 'text-orange-300' },
                { label: 'Massa gorda', val: massaGorda, unit: 'kg', sub: '', cor: 'text-orange-300' },
                { label: 'Massa magra', val: massaMagra, unit: 'kg', sub: '', cor: 'text-emerald-300' },
                { label: 'RCQ', val: rcq, unit: '', sub: riscoRCQ ? '⚠ risco elevado' : 'normal', cor: riscoRCQ ? 'text-red-400' : 'text-[var(--accent)]' },
                { label: 'RCA', val: rca, unit: '', sub: rca && rca > 0.5 ? '⚠ atenção' : 'normal', cor: rca && rca > 0.5 ? 'text-orange-400' : 'text-[var(--accent)]' },
              ].filter(m => m.val != null).map(m => (
                <div key={m.label} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">{m.label}</p>
                  <p className={`text-xl font-black mono ${m.cor}`}>{m.val} <span className="text-zinc-600 text-xs font-normal">{m.unit}</span></p>
                  {m.sub && <p className="text-[10px] text-zinc-500 mt-0.5">{m.sub}</p>}
                </div>
              ))}
              {!imc && !tmb && (
                <div className="col-span-3 text-zinc-600 text-sm text-center py-4">
                  Preencha peso e altura para ver as métricas calculadas
                </div>
              )}
            </div>
          </Secao>

          {/* Observações */}
          <div>
            <label className="text-zinc-400 text-[12px] font-medium block mb-1.5">Observações clínicas</label>
            <textarea value={form.observacoes} rows={3} onChange={e => set('observacoes', e.target.value)}
              placeholder="Notas sobre a avaliação, intercorrências, comparativo com consulta anterior..."
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none focus:ring-1 focus:ring-[var(--accent)]/40"
              style={STYLE} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-2">
            <button onClick={onClose}
              className="flex-1 border border-white/[0.12] text-zinc-300 font-semibold py-3.5 rounded-2xl text-sm active:scale-95 transition-all">
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando || !peso}
              className="flex-1 text-black font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'var(--accent)' }}>
              {salvando ? 'Salvando...' : 'Salvar avaliação'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
