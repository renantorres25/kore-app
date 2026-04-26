'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Exercicio = { id: string; nome: string; series: number; repeticoes: number; carga_sugerida: number | null; observacoes: string; ordem: number }
type Treino = { id: string; nome: string; descricao: string | null; plano: string; personal_id?: string | null; exercicios: Exercicio[] }
type SerieRegistrada = { exercicio_id: string; numero_serie: number; carga: number | null; repeticoes: number; concluida: boolean }
type Modalidade = 'musculacao' | 'corrida' | 'bike' | 'natacao' | 'crossfit' | 'outro'

// ─── MET VALUES ──────────────────────────────────────────────────────────────
// Referência: Compendium of Physical Activities
const MET: Record<Modalidade, number> = {
  musculacao: 4.5,
  corrida:    8.0,
  bike:       6.0,
  natacao:    7.0,
  crossfit:   8.5,
  outro:      5.0,
}

function estimarCalorias(modalidade: Modalidade, duracaoMin: number, pesoKg: number): number {
  return Math.round(MET[modalidade] * pesoKg * (duracaoMin / 60))
}

// ─── MODALIDADES ─────────────────────────────────────────────────────────────

const MODALIDADES: { id: Modalidade; icon: string; label: string; cor: string; corText: string; corBorder: string; hex: string }[] = [
  { id: 'musculacao', icon: '🏋️', label: 'Musculação', cor: 'bg-emerald-500/10', corText: 'text-emerald-400', corBorder: 'border-emerald-500/20', hex: '#10B981' },
  { id: 'corrida',    icon: '🏃', label: 'Corrida',    cor: 'bg-blue-500/10',    corText: 'text-blue-400',    corBorder: 'border-blue-500/20',    hex: '#3B82F6' },
  { id: 'bike',       icon: '🚴', label: 'Bike',       cor: 'bg-orange-500/10',  corText: 'text-orange-400',  corBorder: 'border-orange-500/20',  hex: '#F97316' },
  { id: 'natacao',    icon: '🏊', label: 'Natação',    cor: 'bg-cyan-500/10',    corText: 'text-cyan-400',    corBorder: 'border-cyan-500/20',    hex: '#06B6D4' },
  { id: 'crossfit',   icon: '⚡', label: 'Crossfit',   cor: 'bg-yellow-500/10',  corText: 'text-yellow-400',  corBorder: 'border-yellow-500/20',  hex: '#EAB308' },
  { id: 'outro',      icon: '🎯', label: 'Outro',      cor: 'bg-purple-500/10',  corText: 'text-purple-400',  corBorder: 'border-purple-500/20',  hex: '#A855F7' },
]

const CORES_PLANO: Record<string, { text: string; bg: string; border: string; glow: string; hex: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'bg-emerald-400', hex: '#10B981' },
  B: { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'bg-blue-400',    hex: '#3B82F6' },
  C: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glow: 'bg-orange-400',  hex: '#F97316' },
}

function calcularPace(duracaoMin: number, distanciaKm: number): string {
  if (!duracaoMin || !distanciaKm || distanciaKm === 0) return ''
  const paceTotal = duracaoMin / distanciaKm
  const min = Math.floor(paceTotal)
  const seg = Math.round((paceTotal - min) * 60)
  return `${min}:${seg.toString().padStart(2, '0')}`
}

function calcVolume(series: Record<string, SerieRegistrada[]>): number {
  return Object.values(series).flat().filter(s => s.concluida && s.carga).reduce((a, s) => a + (s.carga! * s.repeticoes), 0)
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function TreinoCliente() {
  const router = useRouter()

  // Planos
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState<string | null>(null)
  const [treinosConcluidosHoje, setTreinosConcluidosHoje] = useState<Set<string>>(new Set())

  // Musculação
  const [em, setEm] = useState<Treino | null>(null)
  const [series, setSeries] = useState<Record<string, SerieRegistrada[]>>({})
  const [concluido, setConcluido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [analise, setAnalise] = useState({ texto: '', carregando: false })

  // Atividade livre
  const [tela, setTela] = useState<'principal' | 'formulario' | 'conclusao_livre' | 'executando_musculacao' | 'conclusao_musculacao'>('principal')
  const [modalidade, setModalidade] = useState<Modalidade | null>(null)
  const [form, setForm] = useState<Record<string, any>>({ intensidade: 3 })
  const [analiseLivre, setAnaliseLivre] = useState({ texto: '', carregando: false })
  const [salvandoLivre, setSalvandoLivre] = useState(false)
  const [caloriasEstimadas, setCaloriasEstimadas] = useState<number | null>(null)

  // Dados gerais
  const [carregando, setCarregando] = useState(true)
  const [score, setScore] = useState<number | null>(null)
  const [pesoKg, setPesoKg] = useState<number>(70)

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    async function verificarHoje() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('treinos').select('plano').eq('cliente_id', session.user.id).eq('concluido', true).eq('data', getTodayBR())
      if (data) setTreinosConcluidosHoje(new Set(data.map((t: any) => t.plano)))
    }
    verificarHoje()
  }, [concluido])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const hoje = getTodayBR()
    const [{ data: sono }, { data: perfil }, { data: td }] = await Promise.all([
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('perfis').select('peso').eq('id', session.user.id).single(),
      supabase.from('treinos').select('id, nome, descricao, plano, personal_id').eq('cliente_id', session.user.id).eq('status', 'pendente').eq('concluido', false).order('plano'),
    ])

    if (sono?.score_recuperacao) setScore(sono.score_recuperacao)
    if (perfil?.peso) setPesoKg(perfil.peso)

    if (!td?.length) { setCarregando(false); return }

    const ids = td.map((t: any) => t.id)
    const { data: ex } = await supabase.from('exercicios_treino').select('*').in('treino_id', ids).order('ordem')
    const completos: Treino[] = td.map((t: any) => ({ ...t, exercicios: ex?.filter((e: any) => e.treino_id === t.id) ?? [] }))

    setTreinos(completos)
    if (completos.length) setPlanoAtivo(completos[0].plano)
    setCarregando(false)
  }

  // ── Musculação ────────────────────────────────────────────────────────────────

  function iniciarMusculacao(treino: Treino) {
    const init: Record<string, SerieRegistrada[]> = {}
    treino.exercicios.forEach(ex => {
      init[ex.id] = Array.from({ length: ex.series }, (_, i) => ({
        exercicio_id: ex.id, numero_serie: i + 1,
        carga: ex.carga_sugerida, repeticoes: ex.repeticoes, concluida: false,
      }))
    })
    setSeries(init)
    setEm(treino)
    setConcluido(false)
    setAnalise({ texto: '', carregando: false })
    setTela('executando_musculacao')
  }

  function toggle(exId: string, idx: number) {
    setSeries(p => { const n = [...(p[exId] ?? [])]; n[idx] = { ...n[idx], concluida: !n[idx].concluida }; return { ...p, [exId]: n } })
  }
  function setCarga(exId: string, idx: number, v: number | null) {
    setSeries(p => { const n = [...(p[exId] ?? [])]; n[idx] = { ...n[idx], carga: v }; return { ...p, [exId]: n } })
  }
  function setReps(exId: string, idx: number, v: number) {
    setSeries(p => { const n = [...(p[exId] ?? [])]; n[idx] = { ...n[idx], repeticoes: v }; return { ...p, [exId]: n } })
  }
  const totalConcluidas = () => Object.values(series).flat().filter(s => s.concluida).length
  const totalSeries = () => Object.values(series).flat().length

  async function finalizarMusculacao() {
    if (!em) return
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const hoje = getTodayBR()
    const duracaoMin = form.duracao_musculacao ? parseInt(form.duracao_musculacao) : 60
    const cals = estimarCalorias('musculacao', duracaoMin, pesoKg)
    setCaloriasEstimadas(cals)

    const { data: reg } = await supabase.from('treinos').insert({
      personal_id: em.personal_id ?? null,
      cliente_id: session.user.id,
      nome: em.nome, descricao: em.descricao, plano: em.plano,
      status: 'concluido', data: hoje, concluido: true,
      calorias_estimadas: cals,
    }).select('id').single()

    if (reg) {
      const done = Object.values(series).flat().filter(s => s.concluida)
      if (done.length) {
        await supabase.from('series_registradas').insert(
          done.map(s => ({ treino_id: reg.id, exercicio_id: s.exercicio_id, numero_serie: s.numero_serie, carga: s.carga, repeticoes: s.repeticoes }))
        )
      }
    }

    setSalvando(false)
    setConcluido(true)
    setTela('conclusao_musculacao')
    gerarIAMusculacao(em, series, duracaoMin, cals)
  }

  async function gerarIAMusculacao(treino: Treino, s: Record<string, SerieRegistrada[]>, duracaoMin: number, cals: number) {
    setAnalise({ texto: '', carregando: true })
    const vol = calcVolume(s)
    const tc = Object.values(s).flat().filter(x => x.concluida).length
    const tt = Object.values(s).flat().length
    const resumo = treino.exercicios.map(ex => {
      const done = s[ex.id]?.filter(x => x.concluida) ?? []
      if (!done.length) return null
      return `${ex.nome}: ${done.length} séries (${done.map(x => x.carga ? `${x.carga}kg` : 'sem carga').join(', ')})`
    }).filter(Boolean).join(', ')

    const prompt = `Coach de IA do KORE. Analise este treino de musculação de forma direta.
Treino: ${treino.nome} | Séries: ${tc}/${tt} | Volume: ${vol > 0 ? `${vol}kg` : 'não registrado'} | Duração estimada: ${duracaoMin}min | Calorias estimadas: ~${cals}kcal | Score de recuperação: ${score ? `${score}/100` : 'não registrado'}
Exercícios: ${resumo || 'não informado'}
Análise em 3 partes curtas (máx 80 palavras, sem markdown): Desempenho, Destaque, Próximo passo`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? '', carregando: false })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar análise.', carregando: false })
    }
  }

  // ── Atividade Livre ───────────────────────────────────────────────────────────

  function abrirFormulario(mod: Modalidade) {
    setModalidade(mod)
    setForm({ intensidade: 3 })
    setAnaliseLivre({ texto: '', carregando: false })
    setCaloriasEstimadas(null)
    setTela('formulario')
  }

  async function salvarAtividadeLivre() {
    setSalvandoLivre(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const duracaoMin = parseInt(form.duracao_min ?? '30') || 30
    const cals = form.calorias_wearable ? parseInt(form.calorias_wearable) : estimarCalorias(modalidade!, duracaoMin, pesoKg)
    const paceCalculado = calcularPace(duracaoMin, parseFloat(form.distancia_km ?? '0'))
    setCaloriasEstimadas(cals)

    await supabase.from('atividades_livres').insert({
      usuario_id: session.user.id,
      data: getTodayBR(),
      modalidade,
      duracao_min: duracaoMin,
      intensidade: form.intensidade ?? 3,
      distancia_km: form.distancia_km ?? null,
      ritmo_medio: paceCalculado || form.ritmo_medio || null,
      fc_media: form.fc_media ?? null,
      distancia_m: form.distancia_m ?? null,
      voltas: form.voltas ?? null,
      estilo_natacao: form.estilo ?? null,
      tipo_wod: form.tipo_wod ?? null,
      movimentos: form.movimentos ?? null,
      resultado_wod: form.resultado ?? null,
      observacoes: form.observacoes ?? null,
      calorias_estimadas: form.calorias_wearable ? null : cals,
      calorias_wearable: form.calorias_wearable ? parseInt(form.calorias_wearable) : null,
    })

    setSalvandoLivre(false)
    setTela('conclusao_livre')
    gerarIAAtividadeLivre(duracaoMin, cals)
  }

  async function gerarIAAtividadeLivre(duracaoMin: number, cals: number) {
    setAnaliseLivre({ texto: '', carregando: true })
    const mod = MODALIDADES.find(m => m.id === modalidade)!

    let dadosEspecificos = ''
    if (modalidade === 'corrida' || modalidade === 'bike') {
      const pace = calcularPace(duracaoMin, parseFloat(form.distancia_km ?? '0'))
      dadosEspecificos = `Distância: ${form.distancia_km ?? 'não informado'}km | Pace: ${pace || 'não calculado'} min/km | FC média: ${form.fc_media ?? 'não informado'}bpm`
    } else if (modalidade === 'natacao') {
      dadosEspecificos = `Distância: ${form.distancia_m ?? 'não informado'}m | Voltas: ${form.voltas ?? 'não informado'} | Estilo: ${form.estilo ?? 'não informado'}`
    } else if (modalidade === 'crossfit') {
      dadosEspecificos = `WOD: ${form.tipo_wod ?? 'não informado'} | Movimentos: ${form.movimentos ?? 'não informado'} | Resultado: ${form.resultado ?? 'não informado'}`
    }

    const prompt = `Coach de IA do KORE. Analise esta atividade de forma direta e motivadora.
Atividade: ${mod.label} | Duração: ${duracaoMin}min | Intensidade: ${form.intensidade}/5 | Calorias estimadas: ~${cals}kcal | Score de recuperação: ${score ? `${score}/100` : 'não registrado'}
${dadosEspecificos}
${form.observacoes ? `Observações: ${form.observacoes}` : ''}
Análise em 3 partes curtas (máx 80 palavras, sem markdown): Desempenho, Destaque, Próximo passo — mencione as calorias gastas e impacto na nutrição de hoje`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnaliseLivre({ texto: data.analise ?? '', carregando: false })
    } catch {
      setAnaliseLivre({ texto: 'Não foi possível gerar análise.', carregando: false })
    }
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── TELA CONCLUSÃO MUSCULAÇÃO ─────────────────────────────────────────────────

  if (tela === 'conclusao_musculacao' && em) {
    const c = CORES_PLANO[em.plano]
    const tc = totalConcluidas()
    const tt = totalSeries()
    const vol = calcVolume(series)
    const pct = tt > 0 ? Math.round((tc / tt) * 100) : 0

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pb-12" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
          <div className="relative mb-8 text-center pt-4">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: c.hex }} />
            <div className="relative">
              <div className={`w-20 h-20 rounded-3xl ${c.bg} border ${c.border} flex items-center justify-center mx-auto mb-5`} style={{ boxShadow: `0 0 60px ${c.hex}25` }}>
                <span className={`text-4xl font-black ${c.text}`}>✓</span>
              </div>
              <p className={`text-[10px] uppercase tracking-[0.3em] mb-2 ${c.text}`}>Treino concluído · Plano {em.plano}</p>
              <h1 className="text-3xl font-black text-white mb-1">{em.nome}</h1>
              <p className="text-zinc-500 text-sm capitalize">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Séries', val: `${tc}`, extra: `/${tt}`, subEl: <div className="mt-2 h-[3px] bg-white/[0.06] rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.glow}`} style={{ width: `${pct}%` }} /></div> },
              { label: 'Volume', val: vol > 0 ? vol.toLocaleString('pt-BR') : '—', sub: 'kg × reps' },
              { label: 'Calorias est.', val: caloriasEstimadas ? `~${caloriasEstimadas}` : '—', sub: 'kcal gastas' },
              { label: 'Recuperação', val: score ? `${score}` : '—', sub: score ? '/100' : 'não registrado' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">{s.label}</p>
                <p className={`text-3xl font-black tabular-nums ${c.text}`}>{s.val}{(s as any).extra && <span className="text-zinc-600 text-lg font-light">{(s as any).extra}</span>}</p>
                {(s as any).subEl ?? <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Aviso calorias */}
          {caloriasEstimadas && (
            <div className="rounded-2xl p-4 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                <p className="text-zinc-400 text-[11px]">Estimativa baseada no seu peso ({pesoKg}kg) e duração. Com wearable conectado os dados serão exatos.</p>
              </div>
            </div>
          )}

          {/* Análise IA */}
          <div className={`rounded-2xl border mb-4 overflow-hidden ${c.border}`} style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className={`w-7 h-7 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}><span className={`text-[11px] font-black ${c.text}`}>✦</span></div>
              <div className="flex-1"><p className={`text-[10px] uppercase tracking-[0.2em] ${c.text}`}>Análise KORE IA</p><p className="text-zinc-600 text-[10px]">Powered by Claude</p></div>
              {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
            <div className="px-5 py-4">
              {analise.carregando
                ? <div className="space-y-2">{[1, 0.8, 0.6].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}</div>
                : <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto || 'Gerando análise...'}</p>
              }
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => router.push('/dashboard')} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">Voltar ao dashboard</button>
            <button onClick={() => { setEm(null); setConcluido(false); setTela('principal') }} className="w-full border border-white/[0.08] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all">Registrar outra atividade</button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA CONCLUSÃO ATIVIDADE LIVRE ────────────────────────────────────────────

  if (tela === 'conclusao_livre' && modalidade) {
    const mod = MODALIDADES.find(m => m.id === modalidade)!
    const duracaoMin = parseInt(form.duracao_min ?? '30') || 30

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pb-12" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
          <div className="text-center pt-4 mb-8">
            <div className="absolute left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: mod.hex }} />
            <div className={`w-20 h-20 rounded-3xl ${mod.cor} border ${mod.corBorder} flex items-center justify-center mx-auto mb-5`} style={{ boxShadow: `0 0 60px ${mod.hex}25` }}>
              <span className="text-4xl">{mod.icon}</span>
            </div>
            <p className={`text-[10px] uppercase tracking-[0.3em] mb-2 ${mod.corText}`}>Atividade registrada</p>
            <h1 className="text-3xl font-black text-white mb-1">{mod.label}</h1>
            <p className="text-zinc-500 text-sm capitalize">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Duração</p>
              <p className={`text-3xl font-black ${mod.corText}`}>{duracaoMin}<span className="text-zinc-600 text-lg font-light">min</span></p>
            </div>
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Calorias est.</p>
              <p className={`text-3xl font-black ${mod.corText}`}>~{caloriasEstimadas ?? '—'}<span className="text-zinc-600 text-lg font-light">kcal</span></p>
            </div>
            {form.distancia_km && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Distância</p>
                <p className={`text-3xl font-black ${mod.corText}`}>{form.distancia_km}<span className="text-zinc-600 text-lg font-light">km</span></p>
              </div>
            )}
            {form.distancia_km && form.duracao_min && (modalidade === 'corrida' || modalidade === 'bike') && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Pace médio</p>
                <p className={`text-3xl font-black ${mod.corText}`}>{calcularPace(parseInt(form.duracao_min), parseFloat(form.distancia_km))}<span className="text-zinc-600 text-sm font-light"> min/km</span></p>
              </div>
            )}
            {form.distancia_m && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Distância</p>
                <p className={`text-3xl font-black ${mod.corText}`}>{form.distancia_m}<span className="text-zinc-600 text-lg font-light">m</span></p>
              </div>
            )}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Intensidade</p>
              <p className={`text-3xl font-black ${mod.corText}`}>{form.intensidade}<span className="text-zinc-600 text-lg font-light">/5</span></p>
            </div>
          </div>

          {/* Aviso calorias */}
          <div className="rounded-2xl p-4 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <p className="text-zinc-400 text-[11px]">Estimativa baseada no seu peso ({pesoKg}kg) e duração. Com wearable conectado os dados serão exatos.</p>
            </div>
          </div>

          {/* Análise IA */}
          <div className={`rounded-2xl border mb-4 overflow-hidden ${mod.corBorder}`} style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className={`w-7 h-7 rounded-xl ${mod.cor} flex items-center justify-center shrink-0`}><span className={`text-[11px] font-black ${mod.corText}`}>✦</span></div>
              <div className="flex-1"><p className={`text-[10px] uppercase tracking-[0.2em] ${mod.corText}`}>Análise KORE IA</p><p className="text-zinc-600 text-[10px]">Powered by Claude</p></div>
              {analiseLivre.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
            <div className="px-5 py-4">
              {analiseLivre.carregando
                ? <div className="space-y-2">{[1, 0.8, 0.6].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}</div>
                : <p className="text-zinc-300 text-sm leading-relaxed">{analiseLivre.texto || 'Gerando análise...'}</p>
              }
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => router.push('/dashboard')} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">Voltar ao dashboard</button>
            <button onClick={() => { setTela('principal'); setModalidade(null); setForm({ intensidade: 3 }) }} className="w-full border border-white/[0.08] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all">Registrar outra atividade</button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA EXECUTANDO MUSCULAÇÃO ────────────────────────────────────────────────

  if (tela === 'executando_musculacao' && em) {
    const c = CORES_PLANO[em.plano]
    const tc = totalConcluidas()
    const tt = totalSeries()
    const prog = tt > 0 ? (tc / tt) * 100 : 0

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
        <div className="shrink-0 border-b border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)' }}>
          <div className="max-w-md mx-auto px-4 pt-12 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${c.text}`}>Plano {em.plano}</p>
                <h1 className="text-xl font-black text-white mt-0.5">{em.nome}</h1>
              </div>
              <p className="text-zinc-500 text-sm">{tc}/{tt} séries</p>
            </div>
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${c.glow} transition-all duration-500`} style={{ width: `${prog}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-40">
          <div className="max-w-md mx-auto px-4 py-4 space-y-4">
            {em.exercicios.map((ex, ei) => {
              const exs = series[ex.id] ?? []
              const ok = exs.length > 0 && exs.every(s => s.concluida)
              return (
                <div key={ex.id} className={`rounded-2xl border transition-all overflow-hidden ${ok ? 'border-emerald-500/30' : 'border-white/[0.06]'}`} style={{ background: ok ? 'rgba(16,185,129,0.04)' : '#0f0f0f' }}>
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${ok ? 'bg-emerald-500/20 text-emerald-400' : `${c.bg} ${c.text}`}`}>{ok ? '✓' : ei + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${ok ? 'text-emerald-400' : 'text-white'}`}>{ex.nome}</p>
                      <p className="text-zinc-600 text-[11px]">{ex.series} séries · {ex.repeticoes} reps{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg sugerido` : ''}</p>
                    </div>
                  </div>
                  {ex.observacoes && <div className="mx-4 mb-3 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04]"><p className="text-zinc-500 text-[11px] italic">{ex.observacoes}</p></div>}
                  <div className="px-4 pb-4 space-y-2">
                    {exs.map((s, si) => (
                      <div key={si} className={`flex items-center gap-2 rounded-xl p-2 ${s.concluida ? 'bg-emerald-500/5' : 'bg-white/[0.02]'}`}>
                        <p className={`text-sm font-bold w-6 text-center shrink-0 ${s.concluida ? 'text-emerald-400' : 'text-zinc-500'}`}>{si + 1}</p>
                        <div className="flex-1">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Carga (kg)</p>
                          <input type="number" value={s.carga ?? ''} onChange={e => setCarga(ex.id, si, e.target.value ? parseFloat(e.target.value) : null)} placeholder="—" disabled={s.concluida} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-white/20 placeholder:text-zinc-700 disabled:opacity-50" />
                        </div>
                        <div className="flex-1">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Reps</p>
                          <input type="number" value={s.repeticoes} onChange={e => setReps(ex.id, si, parseInt(e.target.value) || 0)} disabled={s.concluida} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-white/20 disabled:opacity-50" />
                        </div>
                        <button onClick={() => toggle(ex.id, si)} className={`w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-bold transition-all active:scale-90 shrink-0 ${s.concluida ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/[0.06] border-white/[0.12] text-zinc-400'}`}>
                          {s.concluida ? '✓' : '○'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Duração estimada */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Duração do treino (para estimar calorias)</p>
              <div className="flex items-center gap-3">
                <input type="number" placeholder="60" value={form.duracao_musculacao ?? ''} onChange={e => setForm((p: any) => ({ ...p, duracao_musculacao: e.target.value }))}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                <p className="text-zinc-500 text-sm">minutos</p>
              </div>
              {form.duracao_musculacao && <p className="text-zinc-600 text-[11px] mt-2">≈ {estimarCalorias('musculacao', parseInt(form.duracao_musculacao), pesoKg)} kcal estimadas</p>}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto px-4 py-4">
            <button onClick={finalizarMusculacao} disabled={salvando || tc === 0}
              className={`w-full font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all ${tc === tt && tt > 0 ? 'bg-white text-black' : 'bg-white/10 text-white border border-white/20'}`}>
              {salvando ? 'Salvando...' : tc === tt && tt > 0 ? '🏁 Finalizar treino' : `Finalizar (${tc}/${tt} séries)`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── FORMULÁRIO ATIVIDADE LIVRE ────────────────────────────────────────────────

  if (tela === 'formulario' && modalidade) {
    const mod = MODALIDADES.find(m => m.id === modalidade)!
    const duracaoAtual = parseInt(form.duracao_min ?? '0') || 0
    const calsPreview = duracaoAtual > 0 ? estimarCalorias(modalidade, duracaoAtual, pesoKg) : null

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
        <div className="shrink-0 border-b border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)' }}>
          <div className="max-w-md mx-auto px-4 pt-12 pb-4 flex items-center gap-3">
            <span className="text-3xl">{mod.icon}</span>
            <div>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${mod.corText}`}>{mod.label}</p>
              <h1 className="text-xl font-black text-white">Registrar atividade</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
          <div className="max-w-md mx-auto px-4 py-5 space-y-4">

            {/* Duração — sempre primeiro */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Duração</p>
              <div className="flex items-center gap-3">
                <input type="number" placeholder="45" value={form.duracao_min ?? ''} onChange={e => setForm((p: any) => ({ ...p, duracao_min: e.target.value }))}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-lg text-center font-bold focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                <p className="text-zinc-500 text-sm">minutos</p>
              </div>
              {calsPreview && (
                <div className="mt-3 flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04]">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  <p className="text-zinc-400 text-[11px]">Estimativa: <span className="text-white font-bold">~{calsPreview} kcal</span> gastas</p>
                </div>
              )}
            </div>

            {/* Campos específicos */}
            {(modalidade === 'corrida' || modalidade === 'bike') && (
              <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Dados do percurso</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Distância (km)</label>
                    <input type="number" step="0.1" placeholder="5.0" value={form.distancia_km ?? ''} onChange={e => setForm((p: any) => ({ ...p, distancia_km: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Ritmo médio (min/km)</label>
                    {(() => {
                      const pace = calcularPace(parseInt(form.duracao_min ?? '0'), parseFloat(form.distancia_km ?? '0'))
                      return pace ? (
                        <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                          <span className="text-white font-bold text-sm">{pace} min/km</span>
                          <span className="text-zinc-600 text-[10px] uppercase tracking-wider">Calculado ✓</span>
                        </div>
                      ) : (
                        <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                          <span className="text-zinc-600 text-sm">Preencha duração e distância</span>
                        </div>
                      )
                    })()}
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">FC média (bpm) <span className="text-zinc-700">— Wearable (opcional)</span></label>
                    <input type="number" placeholder="145" value={form.fc_media ?? ''} onChange={e => setForm((p: any) => ({ ...p, fc_media: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                </div>
              </div>
            )}

            {modalidade === 'natacao' && (
              <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Dados da natação</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-600 text-[10px] mb-1 block">Distância (m)</label>
                      <input type="number" placeholder="1000" value={form.distancia_m ?? ''} onChange={e => setForm((p: any) => ({ ...p, distancia_m: e.target.value }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                    </div>
                    <div>
                      <label className="text-zinc-600 text-[10px] mb-1 block">Voltas (25m)</label>
                      <input type="number" placeholder="40" value={form.voltas ?? ''} onChange={e => setForm((p: any) => ({ ...p, voltas: e.target.value }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-3 block">Estilo predominante</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Livre', 'Costas', 'Peito', 'Borboleta'].map(e => (
                        <button key={e} onClick={() => setForm((p: any) => ({ ...p, estilo: e }))}
                          className={`py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${form.estilo === e ? `${mod.cor} ${mod.corBorder} ${mod.corText}` : 'bg-white/[0.03] border-white/[0.08] text-zinc-500'}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalidade === 'crossfit' && (
              <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Dados do WOD</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-2 block">Tipo do WOD</label>
                    <div className="flex gap-2 flex-wrap">
                      {['AMRAP', 'For Time', 'EMOM', 'Tabata', 'Chipper'].map(t => (
                        <button key={t} onClick={() => setForm((p: any) => ({ ...p, tipo_wod: t }))}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${form.tipo_wod === t ? `${mod.cor} ${mod.corBorder} ${mod.corText}` : 'bg-white/[0.03] border-white/[0.08] text-zinc-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Movimentos principais</label>
                    <input type="text" placeholder="Ex: Burpee, Deadlift 60kg, Box Jump" value={form.movimentos ?? ''} onChange={e => setForm((p: any) => ({ ...p, movimentos: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Resultado / Score</label>
                    <input type="text" placeholder="Ex: 8 rounds + 5 reps" value={form.resultado ?? ''} onChange={e => setForm((p: any) => ({ ...p, resultado: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                </div>
              </div>
            )}

            {/* Intensidade */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Intensidade percebida</p>
              <div className="flex gap-2">
                {[{ v: 1, l: 'Leve', e: '😌' }, { v: 2, l: 'Moderado', e: '🙂' }, { v: 3, l: 'Forte', e: '😤' }, { v: 4, l: 'Muito forte', e: '😰' }, { v: 5, l: 'Máximo', e: '🔥' }].map(i => (
                  <button key={i.v} onClick={() => setForm((p: any) => ({ ...p, intensidade: i.v }))}
                    className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${form.intensidade === i.v ? `${mod.cor} ${mod.corBorder} ${mod.corText}` : 'bg-white/[0.03] border-white/[0.08] text-zinc-500'}`}>
                    <span className="text-xl">{i.e}</span>
                    <span className="text-[9px] mt-1 font-semibold leading-tight text-center">{i.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Wearable */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">⌚</span>
                <p className="text-zinc-400 text-sm font-semibold">Dados do wearable <span className="text-zinc-600 font-normal">(opcional)</span></p>
              </div>
              <p className="text-zinc-600 text-[11px] mb-3">Garmin, Apple Watch, Whoop, Polar, Suunto e outros</p>
              <div className="space-y-3">
                {modalidade !== 'natacao' && modalidade !== 'crossfit' && (
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">FC média (bpm)</label>
                    <input type="number" placeholder="145" value={form.fc_media ?? ''} onChange={e => setForm((p: any) => ({ ...p, fc_media: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                )}
                <div>
                  <label className="text-zinc-600 text-[10px] mb-1 block">Calorias (do wearable)</label>
                  <input type="number" placeholder="Ex: 420" value={form.calorias_wearable ?? ''} onChange={e => setForm((p: any) => ({ ...p, calorias_wearable: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Observações <span className="text-zinc-700 normal-case">(opcional)</span></p>
              <textarea placeholder="Como foi? Alguma dor ou sensação especial?" value={form.observacoes ?? ''} onChange={e => setForm((p: any) => ({ ...p, observacoes: e.target.value }))} rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700 resize-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto px-4 py-4 flex gap-3">
            <button onClick={() => setTela('principal')} className="w-12 h-12 rounded-2xl border border-white/[0.08] text-zinc-500 flex items-center justify-center active:scale-90 transition-all">✕</button>
            <button onClick={salvarAtividadeLivre} disabled={salvandoLivre || !form.duracao_min}
              className={`flex-1 font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all tracking-wide ${mod.cor} ${mod.corBorder} ${mod.corText} border`}>
              {salvandoLivre ? 'Salvando...' : `Salvar ${mod.label}`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA PRINCIPAL ────────────────────────────────────────────────────────────

  const sel = treinos.find(t => t.plano === planoAtivo)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-24" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        <div className="mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">← Dashboard</button>
          <h1 className="text-2xl font-black text-white tracking-tight">Treinos</h1>
          <p className="text-zinc-600 text-xs mt-1">Planos do personal ou registre qualquer atividade</p>
        </div>

        {/* Meus Planos */}
        {treinos.length > 0 && (
          <div className="mb-6">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Meus planos</p>
            <div className="flex gap-2 mb-4">
              {treinos.map(t => {
                const co = CORES_PLANO[t.plano]
                return (
                  <button key={t.plano} onClick={() => setPlanoAtivo(t.plano)}
                    className={`flex-1 py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 ${planoAtivo === t.plano ? `${co.bg} ${co.border} ${co.text}` : 'bg-white/[0.03] border-white/[0.06] text-zinc-600'}`}>
                    Plano {t.plano}
                    <span className="block text-[9px] font-normal mt-0.5 opacity-70">
                      {treinosConcluidosHoje.has(t.plano) ? '✓ Feito hoje' : `${t.exercicios.length} exerc.`}
                    </span>
                  </button>
                )
              })}
            </div>

            {sel && (() => {
              const co = CORES_PLANO[sel.plano]
              return (
                <div>
                  <div className={`rounded-2xl p-5 border ${co.border} mb-4`} style={{ background: '#0f0f0f' }}>
                    <p className={`text-[10px] uppercase tracking-[0.2em] mb-1 ${co.text}`}>Plano {sel.plano}</p>
                    <p className="text-white font-black text-xl mb-1">{sel.nome}</p>
                    {sel.descricao && <p className="text-zinc-500 text-xs mb-4">{sel.descricao}</p>}
                    <div className="space-y-2 mt-4">
                      {sel.exercicios.map((ex, i) => (
                        <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                          <div className={`w-6 h-6 rounded-lg ${co.bg} flex items-center justify-center shrink-0`}>
                            <span className={`text-[10px] font-black ${co.text}`}>{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{ex.nome}</p>
                            <p className="text-zinc-600 text-[11px]">{ex.series}×{ex.repeticoes}{ex.carga_sugerida ? ` · ${ex.carga_sugerida}kg` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {score && (
                    <div className="rounded-2xl p-4 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-zinc-400 text-[11px]">Recuperação: <span className="text-white font-bold">{score}/100</span> {score >= 70 ? '— ótimo para treinar forte!' : score >= 50 ? '— moderação.' : '— leve.'}</p>
                      </div>
                    </div>
                  )}
                  <button onClick={() => iniciarMusculacao(sel)} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 hover:bg-zinc-100 transition-all mb-4">
                    Iniciar Plano {sel.plano} →
                  </button>
                </div>
              )
            })()}
          </div>
        )}

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">ou</p>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Atividades Livres */}
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Registrar atividade</p>
          <div className="grid grid-cols-3 gap-2">
            {MODALIDADES.map(mod => (
              <button key={mod.id} onClick={() => abrirFormulario(mod.id)}
                className={`rounded-2xl p-4 border ${mod.corBorder} ${mod.cor} active:scale-95 transition-all text-center`}>
                <span className="text-3xl block mb-1.5">{mod.icon}</span>
                <p className={`text-[11px] font-bold ${mod.corText}`}>{mod.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {[
            { id: 'home',     icon: '⬜', label: 'Início',   path: '/dashboard' },
            { id: 'treino',   icon: '◈',  label: 'Treino',   path: '/treino'    },
            { id: 'nutri',    icon: '◇',  label: 'Nutrição', path: '/nutricao'  },
            { id: 'evolucao', icon: '△',  label: 'Evolução', path: '/evolucao'  },
            { id: 'perfil',   icon: '◉',  label: 'Perfil',   path: '/perfil'    },
          ].map((item) => (
            <button key={item.id} onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 active:scale-90">
              <span className={`text-lg transition-all duration-200 ${item.id === 'treino' ? 'opacity-100' : 'opacity-20'}`}>{item.icon}</span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${item.id === 'treino' ? 'text-white' : 'text-zinc-700'}`}>{item.label}</span>
              {item.id === 'treino' && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}