'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Exercicio = { id: string; nome: string; series: number; repeticoes: number; carga_sugerida: number | null; observacoes: string; ordem: number }
type Treino = { id: string; nome: string; descricao: string | null; plano: string; personal_id?: string | null; exercicios: Exercicio[] }
type SerieRegistrada = { exercicio_id: string; numero_serie: number; carga: number | null; repeticoes: number; concluida: boolean }

type Modalidade = 'musculacao' | 'corrida' | 'bike' | 'natacao' | 'crossfit' | 'outro'

type AtividadeLivre = {
  modalidade: Modalidade
  // Corrida/Bike
  distancia_km?: number
  ritmo_medio?: string
  fc_media?: number
  // Natação
  distancia_m?: number
  voltas?: number
  estilo?: string
  // Crossfit
  tipo_wod?: string
  movimentos?: string
  resultado?: string
  // Geral
  duracao_min: number
  intensidade: number // 1-5
  observacoes?: string
}

// ─── MODALIDADES CONFIG ───────────────────────────────────────────────────────

const MODALIDADES: { id: Modalidade; icon: string; label: string; cor: string; corText: string; corBorder: string }[] = [
  { id: 'musculacao', icon: '🏋️', label: 'Musculação',  cor: 'bg-emerald-500/10', corText: 'text-emerald-400', corBorder: 'border-emerald-500/20' },
  { id: 'corrida',    icon: '🏃', label: 'Corrida',      cor: 'bg-blue-500/10',    corText: 'text-blue-400',    corBorder: 'border-blue-500/20'    },
  { id: 'bike',       icon: '🚴', label: 'Bike',         cor: 'bg-orange-500/10',  corText: 'text-orange-400',  corBorder: 'border-orange-500/20'  },
  { id: 'natacao',    icon: '🏊', label: 'Natação',      cor: 'bg-cyan-500/10',    corText: 'text-cyan-400',    corBorder: 'border-cyan-500/20'    },
  { id: 'crossfit',   icon: '⚡', label: 'Crossfit',     cor: 'bg-yellow-500/10',  corText: 'text-yellow-400',  corBorder: 'border-yellow-500/20'  },
  { id: 'outro',      icon: '🎯', label: 'Outro',        cor: 'bg-purple-500/10',  corText: 'text-purple-400',  corBorder: 'border-purple-500/20'  },
]

const CORES: Record<string, { text: string; bg: string; border: string; glow: string; hex: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'bg-emerald-400', hex: '#10B981' },
  B: { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'bg-blue-400',    hex: '#3B82F6' },
  C: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glow: 'bg-orange-400',  hex: '#F97316' },
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function fmt(s: number): string {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
}

function calcVolume(series: Record<string, SerieRegistrada[]>): number {
  return Object.values(series).flat().filter(s => s.concluida && s.carga).reduce((a, s) => a + (s.carga! * s.repeticoes), 0)
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function TreinoCliente() {
  const router = useRouter()

  // Planos do personal
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState<string | null>(null)
  const [treinosConcluidosHoje, setTreinosConcluidosHoje] = useState<Set<string>>(new Set())

  // Execução musculação
  const [em, setEm] = useState<Treino | null>(null)
  const [series, setSeries] = useState<Record<string, SerieRegistrada[]>>({})
  const [concluido, setConcluido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [tempoFinal, setTempoFinal] = useState(0)
  const [analise, setAnalise] = useState({ texto: '', carregando: false })
  const timer = useRef<NodeJS.Timeout | null>(null)

  // Atividade livre
  const [telaAtiva, setTelaAtiva] = useState<'selecao' | 'modalidade' | 'executando' | 'concluido_livre'>('selecao')
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState<Modalidade | null>(null)
  const [atividadeLivre, setAtividadeLivre] = useState<Partial<AtividadeLivre>>({})
  const [tempoLivre, setTempoLivre] = useState(0)
  const [timerLivreAtivo, setTimerLivreAtivo] = useState(false)
  const timerLivreRef = useRef<NodeJS.Timeout | null>(null)
  const [analiseLivre, setAnaliseLivre] = useState({ texto: '', carregando: false })
  const [salvandoLivre, setSalvandoLivre] = useState(false)

  // Dados gerais
  const [carregando, setCarregando] = useState(true)
  const [score, setScore] = useState<number | null>(null)

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

  useEffect(() => {
    if (em && !concluido) {
      timer.current = setInterval(() => setTempo(t => t + 1), 1000)
    } else {
      if (timer.current) clearInterval(timer.current)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [em, concluido])

  useEffect(() => {
    if (timerLivreAtivo) {
      timerLivreRef.current = setInterval(() => setTempoLivre(t => t + 1), 1000)
    } else {
      if (timerLivreRef.current) clearInterval(timerLivreRef.current)
    }
    return () => { if (timerLivreRef.current) clearInterval(timerLivreRef.current) }
  }, [timerLivreAtivo])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const hoje = getTodayBR()
    const { data: sono } = await supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single()
    if (sono?.score_recuperacao) setScore(sono.score_recuperacao)

    const { data: td } = await supabase.from('treinos').select('id, nome, descricao, plano, personal_id').eq('cliente_id', session.user.id).eq('status', 'pendente').eq('concluido', false).order('plano')
    if (!td?.length) { setCarregando(false); return }

    const ids = td.map((t: any) => t.id)
    const { data: ex } = await supabase.from('exercicios_treino').select('*').in('treino_id', ids).order('ordem')
    const completos: Treino[] = td.map((t: any) => ({ ...t, exercicios: ex?.filter((e: any) => e.treino_id === t.id) ?? [] }))

    setTreinos(completos)
    if (completos.length) setPlanoAtivo(completos[0].plano)
    setCarregando(false)
  }

  // ── Musculação ────────────────────────────────────────────────────────────────

  function iniciar(treino: Treino) {
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
    setTempo(0)
    setAnalise({ texto: '', carregando: false })
  }

  function toggle(exId: string, idx: number) {
    setSeries(p => { const n = [...(p[exId]??[])]; n[idx] = { ...n[idx], concluida: !n[idx].concluida }; return { ...p, [exId]: n } })
  }

  function setCarga(exId: string, idx: number, v: number | null) {
    setSeries(p => { const n = [...(p[exId]??[])]; n[idx] = { ...n[idx], carga: v }; return { ...p, [exId]: n } })
  }

  function setReps(exId: string, idx: number, v: number) {
    setSeries(p => { const n = [...(p[exId]??[])]; n[idx] = { ...n[idx], repeticoes: v }; return { ...p, [exId]: n } })
  }

  const totalConcluidas = () => Object.values(series).flat().filter(s => s.concluida).length
  const totalSeries = () => Object.values(series).flat().length

  async function gerarIA(treino: Treino, s: Record<string, SerieRegistrada[]>, t: number) {
    setAnalise({ texto: '', carregando: true })
    const vol = calcVolume(s)
    const tc = Object.values(s).flat().filter(x => x.concluida).length
    const tt = Object.values(s).flat().length
    const resumo = treino.exercicios.map(ex => {
      const done = s[ex.id]?.filter(x => x.concluida) ?? []
      if (!done.length) return null
      return `${ex.nome}: ${done.length} séries (${done.map(x => x.carga ? `${x.carga}kg` : 'sem carga').join(', ')})`
    }).filter(Boolean).join('\n')

    const prompt = `Você é o coach de IA do KORE. Analise este treino de forma direta e motivadora.
TREINO: ${treino.plano} — ${treino.nome}
Duração: ${Math.floor(t/60)} min ${t%60} seg | Séries: ${tc}/${tt} | Volume: ${vol > 0 ? `${vol}kg` : 'não registrado'} | Recuperação: ${score ? `${score}/100` : 'não registrado'}
EXERCÍCIOS: ${resumo || 'Dados não disponíveis'}
Gere análise em 3 partes (máx 80 palavras, sem markdown): Desempenho, Destaque, Próximo passo`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? 'Análise não disponível.', carregando: false })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar a análise agora.', carregando: false })
    }
  }

  async function finalizar() {
    if (!em) return
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const t = tempo
    const hoje = getTodayBR()

    const { data: reg } = await supabase.from('treinos').insert({
      personal_id: em.personal_id ?? null,
      cliente_id: session.user.id,
      nome: em.nome,
      descricao: em.descricao,
      plano: em.plano,
      status: 'concluido',
      data: hoje,
      concluido: true,
    }).select('id').single()

    if (reg) {
      const done = Object.values(series).flat().filter(s => s.concluida)
      if (done.length) {
        await supabase.from('series_registradas').insert(
          done.map(s => ({ treino_id: reg.id, exercicio_id: s.exercicio_id, numero_serie: s.numero_serie, carga: s.carga, repeticoes: s.repeticoes }))
        )
      }
    }

    setTempoFinal(t)
    setSalvando(false)
    setConcluido(true)
    gerarIA(em, series, t)
  }

  // ── Atividade Livre ───────────────────────────────────────────────────────────

  function iniciarAtividadeLivre(mod: Modalidade) {
    setModalidadeSelecionada(mod)
    setAtividadeLivre({ modalidade: mod, intensidade: 3, duracao_min: 0 })
    setTempoLivre(0)
    setTimerLivreAtivo(true)
    setTelaAtiva('executando')
    setAnaliseLivre({ texto: '', carregando: false })
  }

  async function finalizarAtividadeLivre() {
    setSalvandoLivre(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const duracaoMin = Math.floor(tempoLivre / 60)
    const dadosFinal = { ...atividadeLivre, duracao_min: duracaoMin }

    await supabase.from('atividades_livres').insert({
      usuario_id: session.user.id,
      data: getTodayBR(),
      modalidade: modalidadeSelecionada,
      duracao_min: duracaoMin,
      intensidade: dadosFinal.intensidade ?? 3,
      distancia_km: dadosFinal.distancia_km ?? null,
      ritmo_medio: dadosFinal.ritmo_medio ?? null,
      fc_media: dadosFinal.fc_media ?? null,
      distancia_m: dadosFinal.distancia_m ?? null,
      voltas: dadosFinal.voltas ?? null,
      estilo_natacao: dadosFinal.estilo ?? null,
      tipo_wod: dadosFinal.tipo_wod ?? null,
      movimentos: dadosFinal.movimentos ?? null,
      resultado_wod: dadosFinal.resultado ?? null,
      observacoes: dadosFinal.observacoes ?? null,
    })

    // Gera análise IA
    setAnaliseLivre({ texto: '', carregando: true })
    const mod = MODALIDADES.find(m => m.id === modalidadeSelecionada)
    const prompt = buildPromptAtividadeLivre(mod?.label ?? '', dadosFinal as AtividadeLivre)

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnaliseLivre({ texto: data.analise ?? '', carregando: false })
    } catch {
      setAnaliseLivre({ texto: 'Não foi possível gerar análise.', carregando: false })
    }

    setTimerLivreAtivo(false)
    setSalvandoLivre(false)
    setTelaAtiva('concluido_livre')
  }

  function buildPromptAtividadeLivre(modalidade: string, atividade: AtividadeLivre): string {
    let dadosEspecificos = ''

    if (modalidade === 'Corrida' || modalidade === 'Bike') {
      dadosEspecificos = `Distância: ${atividade.distancia_km ?? 'não informado'}km | Ritmo médio: ${atividade.ritmo_medio ?? 'não informado'} | FC média: ${atividade.fc_media ?? 'não informado'}bpm`
    } else if (modalidade === 'Natação') {
      dadosEspecificos = `Distância: ${atividade.distancia_m ?? 'não informado'}m | Voltas: ${atividade.voltas ?? 'não informado'} | Estilo: ${atividade.estilo ?? 'não informado'}`
    } else if (modalidade === 'Crossfit') {
      dadosEspecificos = `Tipo WOD: ${atividade.tipo_wod ?? 'não informado'} | Movimentos: ${atividade.movimentos ?? 'não informado'} | Resultado: ${atividade.resultado ?? 'não informado'}`
    }

    return `Você é o coach de IA do KORE. Analise esta atividade de forma direta e motivadora.
ATIVIDADE: ${modalidade}
Duração: ${atividade.duracao_min} minutos | Intensidade: ${atividade.intensidade}/5 | Score de recuperação: ${score ? `${score}/100` : 'não registrado'}
${dadosEspecificos}
${atividade.observacoes ? `Observações: ${atividade.observacoes}` : ''}
Gere análise em 3 partes (máx 80 palavras, sem markdown): Desempenho, Destaque, Próximo passo`
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── TELA CONCLUSÃO MUSCULAÇÃO ─────────────────────────────────────────────────

  if (concluido && em) {
    const c = CORES[em.plano]
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
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">{em.nome}</h1>
              <p className="text-zinc-500 text-sm capitalize">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Duração', val: fmt(tempoFinal), sub: 'min:seg' },
              { label: 'Séries', val: `${tc}`, extra: `/${tt}`, subEl: <div className="mt-2 h-[3px] bg-white/[0.06] rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.glow}`} style={{ width: `${pct}%` }} /></div> },
              { label: 'Volume total', val: vol > 0 ? vol.toLocaleString('pt-BR') : '—', sub: vol > 0 ? 'kg × reps' : 'sem carga' },
              { label: 'Recuperação', val: score ? `${score}` : '—', sub: score ? '/100 hoje' : 'não registrado' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">{s.label}</p>
                <p className={`text-3xl font-black tabular-nums ${c.text}`}>{s.val}{s.extra && <span className="text-zinc-600 text-lg font-light">{s.extra}</span>}</p>
                {(s as any).subEl ?? <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border mb-4 overflow-hidden ${c.border}`} style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className={`w-7 h-7 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}><span className={`text-[11px] font-black ${c.text}`}>✦</span></div>
              <div className="flex-1"><p className={`text-[10px] uppercase tracking-[0.2em] ${c.text}`}>Análise KORE IA</p><p className="text-zinc-600 text-[10px]">Powered by Claude</p></div>
              {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
            <div className="px-5 py-4">
              {analise.carregando ? (
                <div className="space-y-2">{[1,0.8,0.6].map((w,i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w*100}%` }} />)}</div>
              ) : <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto || 'Gerando análise...'}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => router.push('/dashboard')} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 hover:bg-zinc-100 transition-all">Voltar ao dashboard</button>
            <button onClick={() => { setEm(null); setConcluido(false); setTempo(0); setTempoFinal(0); setAnalise({ texto: '', carregando: false }) }} className="w-full border border-white/[0.08] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all">Fazer outro treino</button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA CONCLUSÃO ATIVIDADE LIVRE ────────────────────────────────────────────

  if (telaAtiva === 'concluido_livre' && modalidadeSelecionada) {
    const mod = MODALIDADES.find(m => m.id === modalidadeSelecionada)!
    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pb-12" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
          <div className="text-center pt-4 mb-8">
            <div className={`w-20 h-20 rounded-3xl ${mod.cor} border ${mod.corBorder} flex items-center justify-center mx-auto mb-5`}>
              <span className="text-4xl">{mod.icon}</span>
            </div>
            <p className={`text-[10px] uppercase tracking-[0.3em] mb-2 ${mod.corText}`}>Atividade concluída</p>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">{mod.label}</h1>
            <p className="text-zinc-500 text-sm capitalize">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Duração</p>
              <p className={`text-3xl font-black tabular-nums ${mod.corText}`}>{fmt(tempoLivre)}</p>
              <p className="text-zinc-600 text-xs mt-1">min:seg</p>
            </div>
            {(atividadeLivre.distancia_km || atividadeLivre.distancia_m) && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Distância</p>
                <p className={`text-3xl font-black tabular-nums ${mod.corText}`}>{atividadeLivre.distancia_km ?? `${atividadeLivre.distancia_m}m`}</p>
                <p className="text-zinc-600 text-xs mt-1">{atividadeLivre.distancia_km ? 'km' : 'metros'}</p>
              </div>
            )}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Intensidade</p>
              <p className={`text-3xl font-black tabular-nums ${mod.corText}`}>{atividadeLivre.intensidade}<span className="text-zinc-600 text-lg font-light">/5</span></p>
            </div>
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-2">Recuperação</p>
              <p className={`text-3xl font-black tabular-nums ${score ? mod.corText : 'text-zinc-600'}`}>{score ?? '—'}</p>
              <p className="text-zinc-600 text-xs mt-1">{score ? '/100' : 'não registrado'}</p>
            </div>
          </div>

          <div className={`rounded-2xl border mb-4 overflow-hidden ${mod.corBorder}`} style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className={`w-7 h-7 rounded-xl ${mod.cor} flex items-center justify-center shrink-0`}><span className={`text-[11px] font-black ${mod.corText}`}>✦</span></div>
              <div className="flex-1"><p className={`text-[10px] uppercase tracking-[0.2em] ${mod.corText}`}>Análise KORE IA</p><p className="text-zinc-600 text-[10px]">Powered by Claude</p></div>
              {analiseLivre.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
            <div className="px-5 py-4">
              {analiseLivre.carregando
                ? <div className="space-y-2">{[1,0.8,0.6].map((w,i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w*100}%` }} />)}</div>
                : <p className="text-zinc-300 text-sm leading-relaxed">{analiseLivre.texto || 'Análise não disponível.'}</p>
              }
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => router.push('/dashboard')} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">Voltar ao dashboard</button>
            <button onClick={() => { setTelaAtiva('selecao'); setModalidadeSelecionada(null); setAtividadeLivre({}); setTempoLivre(0) }} className="w-full border border-white/[0.08] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all">Registrar outra atividade</button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA EXECUTANDO ATIVIDADE LIVRE ───────────────────────────────────────────

  if (telaAtiva === 'executando' && modalidadeSelecionada) {
    const mod = MODALIDADES.find(m => m.id === modalidadeSelecionada)!

    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-md mx-auto px-4 pt-12 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{mod.icon}</span>
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.2em] ${mod.corText}`}>{mod.label}</p>
                  <h1 className="text-xl font-black text-white">Em andamento</h1>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white tabular-nums">{fmt(tempoLivre)}</p>
                <button onClick={() => setTimerLivreAtivo(p => !p)} className="text-zinc-600 text-[10px] uppercase tracking-wider">
                  {timerLivreAtivo ? '⏸ Pausar' : '▶ Retomar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
          <div className="max-w-md mx-auto px-4 py-5 space-y-4">

            {/* Campos específicos por modalidade */}
            {(modalidadeSelecionada === 'corrida' || modalidadeSelecionada === 'bike') && (
              <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Dados do percurso</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Distância (km)</label>
                    <input type="number" step="0.1" placeholder="5.0" value={atividadeLivre.distancia_km ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, distancia_km: parseFloat(e.target.value) || undefined }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Ritmo médio (min/km)</label>
                    <input type="text" placeholder="5:30" value={atividadeLivre.ritmo_medio ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, ritmo_medio: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">FC média (bpm) — Garmin/Apple Watch</label>
                    <input type="number" placeholder="145" value={atividadeLivre.fc_media ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, fc_media: parseInt(e.target.value) || undefined }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                </div>
              </div>
            )}

            {modalidadeSelecionada === 'natacao' && (
              <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Dados da natação</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-600 text-[10px] mb-1 block">Distância (m)</label>
                      <input type="number" placeholder="1000" value={atividadeLivre.distancia_m ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, distancia_m: parseInt(e.target.value) || undefined }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                    </div>
                    <div>
                      <label className="text-zinc-600 text-[10px] mb-1 block">Voltas (25m)</label>
                      <input type="number" placeholder="40" value={atividadeLivre.voltas ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, voltas: parseInt(e.target.value) || undefined }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-3 block">Estilo predominante</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Livre', 'Costas', 'Peito', 'Borboleta'].map(e => (
                        <button key={e} onClick={() => setAtividadeLivre(p => ({ ...p, estilo: e }))}
                          className={`py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${atividadeLivre.estilo === e ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.03] border-white/[0.08] text-zinc-500'}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalidadeSelecionada === 'crossfit' && (
              <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">Dados do WOD</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-2 block">Tipo do WOD</label>
                    <div className="flex gap-2 flex-wrap">
                      {['AMRAP', 'For Time', 'EMOM', 'Tabata', 'Chipper'].map(t => (
                        <button key={t} onClick={() => setAtividadeLivre(p => ({ ...p, tipo_wod: t }))}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${atividadeLivre.tipo_wod === t ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-white/[0.03] border-white/[0.08] text-zinc-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Movimentos principais</label>
                    <input type="text" placeholder="Ex: Burpee, Deadlift 60kg, Box Jump" value={atividadeLivre.movimentos ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, movimentos: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] mb-1 block">Resultado / Score</label>
                    <input type="text" placeholder="Ex: 8 rounds + 5 reps" value={atividadeLivre.resultado ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, resultado: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                </div>
              </div>
            )}

            {/* Intensidade — para todos */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Intensidade percebida</p>
              <div className="flex gap-2">
                {[
                  { v: 1, label: 'Leve',       emoji: '😌' },
                  { v: 2, label: 'Moderado',   emoji: '🙂' },
                  { v: 3, label: 'Forte',       emoji: '😤' },
                  { v: 4, label: 'Muito forte', emoji: '😰' },
                  { v: 5, label: 'Máximo',      emoji: '🔥' },
                ].map(i => (
                  <button key={i.v} onClick={() => setAtividadeLivre(p => ({ ...p, intensidade: i.v }))}
                    className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${atividadeLivre.intensidade === i.v ? `${mod.cor} ${mod.corBorder} ${mod.corText}` : 'bg-white/[0.03] border-white/[0.08] text-zinc-500'}`}>
                    <span className="text-xl">{i.emoji}</span>
                    <span className="text-[9px] mt-1 font-semibold leading-tight text-center">{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Observações <span className="text-zinc-700 normal-case">(opcional)</span></p>
              <textarea placeholder="Como foi o treino? Alguma dor ou sensação especial?" value={atividadeLivre.observacoes ?? ''} onChange={e => setAtividadeLivre(p => ({ ...p, observacoes: e.target.value }))} rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700 resize-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04]" style={{ background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto px-4 py-4 flex gap-3">
            <button onClick={() => { setTimerLivreAtivo(false); setTelaAtiva('selecao') }} className="w-12 h-12 rounded-2xl border border-white/[0.08] text-zinc-500 flex items-center justify-center active:scale-90 transition-all text-sm">✕</button>
            <button onClick={finalizarAtividadeLivre} disabled={salvandoLivre}
              className={`flex-1 font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all ${mod.cor} ${mod.corBorder} ${mod.corText} border`}>
              {salvandoLivre ? 'Salvando...' : `🏁 Finalizar ${mod.label}`}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── TELA SELEÇÃO DE MODALIDADE ────────────────────────────────────────────────

  if (telaAtiva === 'modalidade') {
    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white">
        <div className="max-w-md mx-auto px-4 pb-24" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>
          <div className="mb-8">
            <button onClick={() => setTelaAtiva('selecao')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">← Voltar</button>
            <h1 className="text-2xl font-black text-white">Registrar atividade</h1>
            <p className="text-zinc-600 text-xs mt-1">Escolha a modalidade</p>
          </div>

          {score && (
            <div className="rounded-2xl p-4 border border-white/[0.06] mb-6" style={{ background: '#0f0f0f' }}>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <p className="text-zinc-400 text-[11px]">
                  Recuperação hoje: <span className="text-white font-bold">{score}/100</span>
                  {score >= 70 ? ' — ótimo para treinar forte!' : score >= 50 ? ' — intensidade moderada.' : ' — treino leve recomendado.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {MODALIDADES.map(mod => (
              <button key={mod.id} onClick={() => iniciarAtividadeLivre(mod.id)}
                className={`rounded-2xl p-5 border ${mod.corBorder} ${mod.cor} active:scale-95 transition-all text-left`}>
                <span className="text-4xl block mb-3">{mod.icon}</span>
                <p className={`font-black text-base ${mod.corText}`}>{mod.label}</p>
                <p className="text-zinc-600 text-[11px] mt-0.5">Toque para iniciar</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ── TELA PRINCIPAL — SELEÇÃO ──────────────────────────────────────────────────

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
                const co = CORES[t.plano]
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
              const co = CORES[sel.plano]
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
                        <p className="text-zinc-400 text-[11px]">Recuperação: <span className="text-white font-bold">{score}/100</span>{score >= 70 ? ' — ótimo para treinar forte!' : score >= 50 ? ' — moderação.' : ' — leve.'}</p>
                      </div>
                    </div>
                  )}
                  <button onClick={() => iniciar(sel)} className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 hover:bg-zinc-100 transition-all mb-4">
                    Iniciar Plano {sel.plano} →
                  </button>
                </div>
              )
            })()}
          </div>
        )}

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">ou</p>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Registrar atividade livre */}
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Registrar atividade livre</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {MODALIDADES.slice(0, 6).map(mod => (
              <button key={mod.id} onClick={() => { setTelaAtiva('modalidade'); setTimeout(() => iniciarAtividadeLivre(mod.id), 0) }}
                className={`rounded-2xl p-4 border ${mod.corBorder} ${mod.cor} active:scale-95 transition-all text-center`}>
                <span className="text-3xl block mb-1.5">{mod.icon}</span>
                <p className={`text-[11px] font-bold ${mod.corText}`}>{mod.label}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setTelaAtiva('modalidade')}
            className="w-full border border-white/[0.08] text-zinc-400 font-bold py-3.5 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all">
            Ver todas as modalidades →
          </button>
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