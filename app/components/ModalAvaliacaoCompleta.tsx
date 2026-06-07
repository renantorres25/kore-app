'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown, Calculator, Activity, Ruler, Scale, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react'

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

type AvaliacaoAnterior = {
  data: string
  peso: number | null; gordura_pct: number | null; massa_muscular: number | null
  cintura: number | null; abdomen_circ: number | null
  braco_dir: number | null; coxa_dir: number | null
}

type LinhaComparativo = { label: string; unidade: string; anterior: number; atual: number; menorMelhor: boolean | null }

type Comparativo = { dataAnterior: string; dataAtual: string; linhas: LinhaComparativo[] }

// Para peso e circunferências de membros, "melhora" depende do objetivo do paciente —
// emagrecimento favorece reduções, hipertrofia favorece ganhos. Sem objetivo claro, não julgamos.
function direcaoPesoMelhor(objetivo: string | null): boolean | null {
  if (!objetivo) return null
  const o = objetivo.toLowerCase()
  if (/emagrec|perda de peso|perder peso|defini[cç][ãa]o|secar|redu[cç][ãa]o de gordura|cutting/.test(o)) return true
  if (/hipertrofia|ganho de (peso|massa)|massa muscular|bulking/.test(o)) return false
  return null
}

function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
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

// Pollock 7 dobras (Jackson & Pollock, 1978/1980) — densidade corporal a partir da soma das 7 dobras + idade,
// convertida em % de gordura pela equação de Siri. Sítios: tríceps, subescapular, axilar média, supra-ilíaca,
// abdominal, coxa e peitoral.
function calcGorduraPollock7(somaDobras: number, idade: number, sexo: string | null): number | null {
  if (sexo !== 'masculino' && sexo !== 'feminino') return null
  const densidade = sexo === 'masculino'
    ? 1.112 - 0.00043499 * somaDobras + 0.00000055 * somaDobras ** 2 - 0.00028826 * idade
    : 1.097 - 0.00046971 * somaDobras + 0.00000056 * somaDobras ** 2 - 0.00012828 * idade
  const pct = (495 / densidade) - 450
  return Math.round(pct * 10) / 10
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
  massa_muscular: string
  pescoco: string; ombro: string; torax: string
  cintura: string; abdomen_circ: string; quadril: string
  braco_dir: string; braco_dir_contraido: string; braco_esq: string
  antebraco_dir: string; antebraco_esq: string
  coxa_dir: string; coxa_esq: string
  panturrilha_dir: string; panturrilha_esq: string
  dobra_triceps: string; dobra_subescapular: string
  dobra_suprailiaca: string; dobra_abdominal: string
  dobra_coxa: string; dobra_peitoral: string; dobra_axilar_media: string
  pa_sistolica: string; pa_diastolica: string; fc_repouso: string
  observacoes: string
}

const FORM_VAZIO: FormEv = {
  data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
  peso: '', altura: '', massa_muscular: '',
  pescoco: '', ombro: '', torax: '', cintura: '', abdomen_circ: '', quadril: '',
  braco_dir: '', braco_dir_contraido: '', braco_esq: '',
  antebraco_dir: '', antebraco_esq: '',
  coxa_dir: '', coxa_esq: '', panturrilha_dir: '', panturrilha_esq: '',
  dobra_triceps: '', dobra_subescapular: '', dobra_suprailiaca: '',
  dobra_abdominal: '', dobra_coxa: '', dobra_peitoral: '', dobra_axilar_media: '',
  pa_sistolica: '', pa_diastolica: '', fc_repouso: '',
  observacoes: '',
}

function N(s: string): number | null { const v = parseFloat(s); return isNaN(v) ? null : v }

const INPUT_CLASS = "w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none mono focus:ring-1 focus:ring-[var(--accent)]/40"
const SURFACE_2_STYLE = { background: 'var(--surface-2)' } as React.CSSProperties

// Definidos fora do componente para manter identidade estável entre renders —
// caso contrário o React remonta os <input> a cada tecla digitada e o foco se perde.
function Campo({ label, unit, placeholder, value, onChange }: { label: string; unit?: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-zinc-400 text-[11px] font-medium block mb-1">{label}</label>
      <div className="relative">
        <input type="number" step="0.1" placeholder={placeholder ?? '—'}
          value={value} onChange={e => onChange(e.target.value)}
          className={INPUT_CLASS} style={SURFACE_2_STYLE} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">{unit}</span>}
      </div>
    </div>
  )
}

function Secao({ titulo, icon, aberta, onToggle, children }: { titulo: string; icon: React.ReactNode; aberta: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)' }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors">
        <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center text-zinc-400 shrink-0">{icon}</div>
        <p className="text-white font-semibold text-sm flex-1">{titulo}</p>
        <ChevronDown size={15} className={`text-zinc-500 transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>
      {aberta && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/[0.07]">{children}</div>}
    </div>
  )
}

export default function ModalAvaliacaoCompleta({ clienteId, paciente, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormEv>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [secaoAberta, setSecaoAberta] = useState<string>('composicao')
  const [anteriorEval, setAnteriorEval] = useState<AvaliacaoAnterior | null>(null)
  const [comparativo, setComparativo] = useState<Comparativo | null>(null)

  // Carrega a avaliação anterior do cliente assim que o modal abre, para poder
  // montar o comparativo logo após salvar a nova avaliação.
  useEffect(() => {
    let ativo = true
    supabase.from('evolucao_medidas')
      .select('data,peso,gordura_pct,massa_muscular,cintura,abdomen_circ,braco_dir,coxa_dir')
      .eq('cliente_id', clienteId)
      .order('data', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (ativo) setAnteriorEval((data?.[0] as AvaliacaoAnterior) ?? null) })
    return () => { ativo = false }
  }, [clienteId])

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

  // Pollock 7 dobras — calcula automaticamente assim que as 7 medidas estiverem preenchidas
  const dobras7 = [
    N(form.dobra_triceps), N(form.dobra_subescapular), N(form.dobra_axilar_media),
    N(form.dobra_suprailiaca), N(form.dobra_abdominal), N(form.dobra_coxa), N(form.dobra_peitoral),
  ]
  const dobras7Completas = dobras7.every(d => d != null)
  const somaDobras7 = dobras7Completas ? dobras7.reduce((acc, d) => acc + (d ?? 0), 0) : null
  const gordPctPollock = somaDobras7 != null && idade != null ? calcGorduraPollock7(somaDobras7, idade, sexo) : null

  // % de gordura: prioriza Pollock 7 dobras (mais preciso); cai para estimativa por circunferências
  const gordPct = gordPctPollock ?? gordPorCirc
  const gordPctFonte: 'pollock' | 'circunferencias' | null = gordPctPollock != null ? 'pollock' : (gordPorCirc != null ? 'circunferencias' : null)
  const massaGorda = peso && gordPct ? Math.round(peso * gordPct / 100 * 10) / 10 : null
  const massaMagra = peso && massaGorda != null ? Math.round((peso - massaGorda) * 10) / 10 : null
  const massaMagraPct = gordPct != null ? Math.round((100 - gordPct) * 10) / 10 : null

  const riscoRCQ = rcq ? (sexo === 'masculino' ? rcq > 0.9 : rcq > 0.85) : null

  async function salvar() {
    if (!peso) return
    setSalvando(true)
    const { error } = await supabase.from('evolucao_medidas').insert({
      cliente_id: clienteId,
      data: form.data,
      peso: N(form.peso), altura: N(form.altura),
      gordura_pct: gordPct,
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
      dobra_axilar_media: N(form.dobra_axilar_media),
      pa_sistolica: N(form.pa_sistolica), pa_diastolica: N(form.pa_diastolica),
      fc_repouso: N(form.fc_repouso),
      imc_calculado: imc, tmb_calculada: tmb,
      gordura_pct_calculada: gordPct, peso_ideal_calculado: pesoIdeal,
      observacoes: form.observacoes || null,
    })

    if (!error) {
      const a = anteriorEval
      if (a) {
        const massaMagraAnterior = a.peso != null && a.gordura_pct != null
          ? Math.round((a.peso - a.peso * a.gordura_pct / 100) * 10) / 10
          : null
        const pesoMenorMelhor = direcaoPesoMelhor(paciente?.objetivo ?? null)
        const linhasBrutas: { label: string; unidade: string; anterior: number | null; atual: number | null; menorMelhor: boolean | null }[] = [
          { label: 'Peso', unidade: 'kg', anterior: a.peso, atual: peso, menorMelhor: pesoMenorMelhor },
          { label: '% Gordura', unidade: '%', anterior: a.gordura_pct, atual: gordPct, menorMelhor: true },
          { label: 'Massa magra', unidade: 'kg', anterior: massaMagraAnterior, atual: massaMagra, menorMelhor: false },
          { label: 'Cintura', unidade: 'cm', anterior: a.cintura, atual: N(form.cintura), menorMelhor: true },
          { label: 'Abdômen', unidade: 'cm', anterior: a.abdomen_circ, atual: N(form.abdomen_circ), menorMelhor: true },
          { label: 'Braço direito', unidade: 'cm', anterior: a.braco_dir, atual: N(form.braco_dir), menorMelhor: false },
          { label: 'Coxa direita', unidade: 'cm', anterior: a.coxa_dir, atual: N(form.coxa_dir), menorMelhor: false },
        ]
        const linhas = linhasBrutas.filter((l): l is LinhaComparativo => l.anterior != null && l.atual != null)
        if (linhas.length > 0) {
          setComparativo({ dataAnterior: a.data, dataAtual: form.data, linhas })
        } else {
          onSaved()
        }
      } else {
        onSaved()
      }
    }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center px-0 md:px-4"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) (comparativo ? onSaved() : onClose()) }}>
      <div className="w-full md:max-w-3xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-base)', maxHeight: '95dvh' }}>

        {/* Header fixo */}
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/[0.08]"
          style={{ background: 'var(--surface-1)' }}>
          <div>
            <p className="text-white font-black text-lg">{comparativo ? 'Avaliação salva ✓' : 'Avaliação Completa'}</p>
            <p className="text-zinc-500 text-sm mt-0.5">{paciente ? `${paciente.sexo ? (paciente.sexo.charAt(0).toUpperCase() + paciente.sexo.slice(1)) : ''}${idade ? ` · ${idade} anos` : ''}${paciente.peso ? ` · ${paciente.peso}kg` : ''}` : 'Novo registro'}</p>
          </div>
          <button onClick={() => (comparativo ? onSaved() : onClose())} className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90 text-sm">✕</button>
        </div>

        {/* Resultados calculados — sempre visíveis (exceto na tela de comparativo) */}
        {!comparativo && (imc || tmb || pesoIdeal || rcq || gordPct != null) && (
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
              {gordPct != null && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">% Gordura</p>
                  <p className="text-lg font-black mono text-orange-300">{gordPct}</p>
                  <p className="text-[10px] text-zinc-500">{gordPctFonte === 'pollock' ? 'Pollock 7 dobras' : 'estimada (circunf.)'}</p>
                </div>
              )}
              {massaGorda != null && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Massa gorda</p>
                  <p className="text-lg font-black mono text-orange-300">{massaGorda}</p>
                  <p className="text-[10px] text-zinc-500">kg · calculado</p>
                </div>
              )}
              {massaMagra != null && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Massa magra</p>
                  <p className="text-lg font-black mono text-emerald-300">{massaMagra}</p>
                  <p className="text-[10px] text-zinc-500">kg · calculado</p>
                </div>
              )}
              {massaMagraPct != null && (
                <div className="text-center">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">% Massa magra</p>
                  <p className="text-lg font-black mono text-emerald-300">{massaMagraPct}</p>
                  <p className="text-[10px] text-zinc-500">% · calculado</p>
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

        {/* Formulário scrollável (ou comparativo, após salvar) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {comparativo ? (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface-1)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0"><TrendingUp size={18} /></div>
              <div>
                <p className="text-white font-bold text-sm">Comparativo com a avaliação anterior</p>
                <p className="text-zinc-500 text-xs mt-0.5">{formatarDataBR(comparativo.dataAnterior)} → {formatarDataBR(comparativo.dataAtual)}</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {comparativo.linhas.map(l => {
                const delta = Math.round((l.atual - l.anterior) * 10) / 10
                const melhora = l.menorMelhor == null || delta === 0 ? null : (l.menorMelhor ? delta < 0 : delta > 0)
                const cor = melhora == null ? 'text-zinc-400' : melhora ? 'text-emerald-400' : 'text-red-400'
                const Icone = delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown
                return (
                  <div key={l.label} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                    <div>
                      <p className="text-zinc-500 text-[11px]">{l.label}</p>
                      <p className="text-white text-sm mono mt-0.5">
                        {l.anterior}{l.unidade} <span className="text-zinc-600">→</span> <span className="font-bold">{l.atual}{l.unidade}</span>
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 font-bold mono text-sm shrink-0 ${cor}`}>
                      <Icone size={14} />
                      {Math.abs(delta)}{l.unidade}
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={() => onSaved()}
              className="w-full text-black font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-all mt-1"
              style={{ background: 'var(--accent)' }}>
              Concluir
            </button>
          </div>
        ) : (
        <>

          {/* Data */}
          <div>
            <label className="text-zinc-400 text-[12px] font-medium block mb-1.5">Data da avaliação</label>
            <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
              style={{ ...SURFACE_2_STYLE, colorScheme: 'dark' }} />
          </div>

          <Secao titulo="Composição corporal" icon={<Scale size={14} />}
            aberta={secaoAberta === 'composicao'} onToggle={() => setSecaoAberta(s => s === 'composicao' ? '' : 'composicao')}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              <Campo label="Peso (kg)" unit="kg" placeholder={paciente?.peso?.toString()} value={form.peso} onChange={v => set('peso', v)} />
              <Campo label="Altura (cm)" unit="cm" placeholder={paciente?.altura?.toString()} value={form.altura} onChange={v => set('altura', v)} />
              <Campo label="Massa muscular (kg)" unit="kg" placeholder="70.0" value={form.massa_muscular} onChange={v => set('massa_muscular', v)} />
              <Campo label="FC Repouso" unit="bpm" placeholder="65" value={form.fc_repouso} onChange={v => set('fc_repouso', v)} />
              <div className="flex gap-2">
                <div className="flex-1"><Campo label="PA Sistólica" unit="mmHg" placeholder="120" value={form.pa_sistolica} onChange={v => set('pa_sistolica', v)} /></div>
                <div className="flex-1"><Campo label="PA Diastólica" unit="mmHg" placeholder="80" value={form.pa_diastolica} onChange={v => set('pa_diastolica', v)} /></div>
              </div>
            </div>
          </Secao>

          <Secao titulo="Circunferências" icon={<Ruler size={14} />}
            aberta={secaoAberta === 'circunferencias'} onToggle={() => setSecaoAberta(s => s === 'circunferencias' ? '' : 'circunferencias')}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              <Campo label="Pescoço" unit="cm" value={form.pescoco} onChange={v => set('pescoco', v)} />
              <Campo label="Ombro" unit="cm" value={form.ombro} onChange={v => set('ombro', v)} />
              <Campo label="Tórax" unit="cm" value={form.torax} onChange={v => set('torax', v)} />
              <Campo label="Cintura" unit="cm" value={form.cintura} onChange={v => set('cintura', v)} />
              <Campo label="Abdômen" unit="cm" value={form.abdomen_circ} onChange={v => set('abdomen_circ', v)} />
              <Campo label="Quadril" unit="cm" value={form.quadril} onChange={v => set('quadril', v)} />
              <Campo label="Braço Dir. (relaxado)" unit="cm" value={form.braco_dir} onChange={v => set('braco_dir', v)} />
              <Campo label="Braço Dir. (contraído)" unit="cm" value={form.braco_dir_contraido} onChange={v => set('braco_dir_contraido', v)} />
              <Campo label="Braço Esq." unit="cm" value={form.braco_esq} onChange={v => set('braco_esq', v)} />
              <Campo label="Antebraço Dir." unit="cm" value={form.antebraco_dir} onChange={v => set('antebraco_dir', v)} />
              <Campo label="Antebraço Esq." unit="cm" value={form.antebraco_esq} onChange={v => set('antebraco_esq', v)} />
              <Campo label="Coxa Dir." unit="cm" value={form.coxa_dir} onChange={v => set('coxa_dir', v)} />
              <Campo label="Coxa Esq." unit="cm" value={form.coxa_esq} onChange={v => set('coxa_esq', v)} />
              <Campo label="Panturrilha Dir." unit="cm" value={form.panturrilha_dir} onChange={v => set('panturrilha_dir', v)} />
              <Campo label="Panturrilha Esq." unit="cm" value={form.panturrilha_esq} onChange={v => set('panturrilha_esq', v)} />
            </div>
          </Secao>

          <Secao titulo="Dobras cutâneas (Pollock 7 dobras)" icon={<Activity size={14} />}
            aberta={secaoAberta === 'dobras'} onToggle={() => setSecaoAberta(s => s === 'dobras' ? '' : 'dobras')}>
            {gordPctPollock != null ? (
              <p className="text-emerald-400 text-xs pt-3">✓ 7 dobras preenchidas — % de gordura, massa gorda e massa magra calculados automaticamente abaixo</p>
            ) : (
              <p className="text-zinc-500 text-xs pt-3">
                Preencha as 7 dobras ({dobras7.filter(d => d != null).length}/7) — ao concluir, o sistema calcula automaticamente o % de gordura (fórmula de Pollock, considerando sexo e idade do paciente), massa gorda, massa magra e % de massa magra
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Campo label="Tríceps" unit="mm" value={form.dobra_triceps} onChange={v => set('dobra_triceps', v)} />
              <Campo label="Subescapular" unit="mm" value={form.dobra_subescapular} onChange={v => set('dobra_subescapular', v)} />
              <Campo label="Axilar média" unit="mm" value={form.dobra_axilar_media} onChange={v => set('dobra_axilar_media', v)} />
              <Campo label="Supra-ilíaca" unit="mm" value={form.dobra_suprailiaca} onChange={v => set('dobra_suprailiaca', v)} />
              <Campo label="Abdominal" unit="mm" value={form.dobra_abdominal} onChange={v => set('dobra_abdominal', v)} />
              <Campo label="Coxa" unit="mm" value={form.dobra_coxa} onChange={v => set('dobra_coxa', v)} />
              <Campo label="Peitoral" unit="mm" value={form.dobra_peitoral} onChange={v => set('dobra_peitoral', v)} />
            </div>
            {dobras7Completas && idade == null && (
              <p className="text-orange-400 text-xs">⚠ Não foi possível calcular: idade do paciente desconhecida (preencha a data de nascimento no perfil)</p>
            )}
            {dobras7Completas && sexo !== 'masculino' && sexo !== 'feminino' && (
              <p className="text-orange-400 text-xs">⚠ Não foi possível calcular: sexo do paciente não definido no perfil</p>
            )}
          </Secao>

          <Secao titulo="Métricas calculadas" icon={<Calculator size={14} />}
            aberta={secaoAberta === 'calculado'} onToggle={() => setSecaoAberta(s => s === 'calculado' ? '' : 'calculado')}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              {[
                { label: 'IMC', val: imc, unit: 'kg/m²', sub: imcClass?.label, cor: imcClass?.cor },
                { label: 'Peso ideal', val: pesoIdeal, unit: 'kg', sub: 'Hamwi', cor: 'text-blue-300' },
                { label: 'TMB', val: tmb, unit: 'kcal/dia', sub: 'Mifflin-St Jeor', cor: 'text-[var(--accent)]' },
                { label: 'GET Sedentário', val: tmb ? Math.round(tmb * 1.2) : null, unit: 'kcal', sub: '×1.2', cor: 'text-zinc-300' },
                { label: 'GET Moderado', val: tmb ? Math.round(tmb * 1.55) : null, unit: 'kcal', sub: '×1.55', cor: 'text-zinc-300' },
                { label: 'GET Muito Ativo', val: tmb ? Math.round(tmb * 1.725) : null, unit: 'kcal', sub: '×1.725', cor: 'text-zinc-300' },
                { label: '% Gordura', val: gordPct, unit: '%', sub: gordPctFonte === 'pollock' ? 'Pollock 7 dobras' : (gordPctFonte === 'circunferencias' ? 'estimada · Marinha EUA' : ''), cor: 'text-orange-300' },
                { label: 'Massa gorda', val: massaGorda, unit: 'kg', sub: 'calculado automaticamente', cor: 'text-orange-300' },
                { label: 'Massa magra', val: massaMagra, unit: 'kg', sub: 'calculado automaticamente', cor: 'text-emerald-300' },
                { label: '% Massa magra', val: massaMagraPct, unit: '%', sub: 'calculado automaticamente', cor: 'text-emerald-300' },
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
              style={SURFACE_2_STYLE} />
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
        </>
        )}
        </div>

      </div>
    </div>
  )
}
