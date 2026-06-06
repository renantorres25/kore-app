'use client'

import { useState, useEffect, useRef } from 'react'

type Mensagem = { role: 'user' | 'assistant'; content: string }

export type ContextoProfissional = {
  profissionalTipo: 'personal' | 'nutricionista'
  profissionalNome: string | null
  paciente: {
    nome: string | null
    peso: number | null
    altura: number | null
    objetivo: string | null
    nivel: string | null
    metaPeso: number | null
    metaDataLimite: string | null
    fcmax: number | null
    ftp: number | null
  }
  alertasClinicos: {
    lesoes: string | null
    restricoesFisicas: string | null
    medicamentos: string | null
    alergias?: string | null
    restricoesAlimentares?: string | null
  }
  treinamento?: {
    treinosSemana: number
    diasSemTreinar: number | null
    scoreRecuperacaoHoje: number | null
    sonoHorasHoje: number | null
    exerciciosMaxCarga: { nome: string; maxCarga: number; sessoes: number }[]
    planos?: { plano: string; nome: string; exercicios: { nome: string; series: number; repeticoes: number; carga: number | null; observacoes: string }[] }[]
    periodizacaoFase?: string | null
    atividadesSemana?: { data: string; modalidade: string; duracao_min: number | null; distancia_km?: number | null; calorias: number | null }[]
  } | null
  nutricao?: {
    caloriasPrescritas: number | null
    proteinaPrescritas: number | null
    caloriasSemanaisGastas: number | null
    treinosSemana: number
    periodizacao: string | null
    atividadesSemana?: { data: string; modalidade: string; duracao_min: number | null; distancia_km?: number | null; calorias: number | null }[]
  } | null
  composicao?: {
    ultimoPeso: number | null
    gorduraPct: number | null
    massaMuscular: number | null
    data: string | null
  } | null
  ultimaAvaliacao: string | null
}

const TERMOS_IRRELEVANTES = /^(nenhum[ao]?|nada|não|nao|sem|ok|okay|oke?|n\/a|-)$/i
function filtrarAlerta(val: string | null): string | null {
  if (!val) return null
  const partes = val.split(/\s*[·,]\s*/).map(v => v.trim()).filter(v => v && !TERMOS_IRRELEVANTES.test(v))
  return partes.length ? partes.join(' · ') : null
}

function buildSystemPrompt(ctx: ContextoProfissional): string {
  const tipo = ctx.profissionalTipo === 'personal' ? 'Personal Trainer' : 'Nutricionista'
  const pacNome = ctx.paciente.nome ?? 'paciente'
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const lesoesFiltradas = filtrarAlerta(ctx.alertasClinicos.lesoes)
  const rfFiltradas = filtrarAlerta(ctx.alertasClinicos.restricoesFisicas)
  const medsFiltrados = filtrarAlerta(ctx.alertasClinicos.medicamentos)
  const alergiasFiltradas = filtrarAlerta(ctx.alertasClinicos.alergias ?? null)
  const restAlimFiltradas = filtrarAlerta(ctx.alertasClinicos.restricoesAlimentares ?? null)
  const alertas = [
    lesoesFiltradas && `Lesões: ${lesoesFiltradas}`,
    rfFiltradas && `Restrições físicas: ${rfFiltradas}`,
    medsFiltrados && `Medicamentos: ${medsFiltrados}`,
    alergiasFiltradas && `Alergias: ${alergiasFiltradas}`,
    restAlimFiltradas && `Restrições alimentares: ${restAlimFiltradas}`,
  ].filter(Boolean).join('\n') || 'Nenhum alerta clínico registrado'

  const composicao = ctx.composicao?.ultimoPeso
    ? `Última medição (${ctx.composicao.data ?? '?'}): ${ctx.composicao.ultimoPeso}kg | gordura ${ctx.composicao.gorduraPct ?? '?'}% | massa muscular ${ctx.composicao.massaMuscular ?? '?'}kg`
    : 'Sem medições registradas'

  let dadosEspecificos = ''
  if (ctx.profissionalTipo === 'personal' && ctx.treinamento) {
    const ex = ctx.treinamento.exerciciosMaxCarga.slice(0, 6)
      .map(e => `${e.nome}(${e.sessoes}x, ${e.maxCarga}kg)`).join(', ') || 'sem dados'

    let planosTexto = ''
    if (ctx.treinamento.planos?.length) {
      planosTexto = '\n\nPLANOS DE TREINO PRESCRITOS:\n' + ctx.treinamento.planos.map(p =>
        `Plano ${p.plano} — ${p.nome}:\n` +
        p.exercicios.map(e =>
          `  • ${e.nome}: ${e.series}x${e.repeticoes}${e.carga ? ` @ ${e.carga}kg` : ''}${e.observacoes ? ` (${e.observacoes})` : ''}`
        ).join('\n')
      ).join('\n\n')
    }

    let atividadesPersonalTexto = ''
    if (ctx.treinamento.atividadesSemana?.length) {
      atividadesPersonalTexto = '\n\nATIVIDADES DESTA SEMANA:\n' + ctx.treinamento.atividadesSemana.map(a => {
        const dataFmt = new Date(a.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
        const dur = a.duracao_min ? `${a.duracao_min}min` : '?'
        const dist = a.distancia_km ? ` · ${a.distancia_km}km` : ''
        const cal = a.calorias ? ` · ${a.calorias} kcal` : ''
        return `- ${dataFmt}: ${a.modalidade} (${dur}${dist}${cal})`
      }).join('\n')
    }

    dadosEspecificos = `
DADOS DE TREINO:
- Treinos esta semana: ${ctx.treinamento.treinosSemana}
- Dias sem treinar: ${ctx.treinamento.diasSemTreinar ?? '?'}
- Score de recuperação hoje: ${ctx.treinamento.scoreRecuperacaoHoje ? `${ctx.treinamento.scoreRecuperacaoHoje}/100` : 'não registrado'}
- Sono hoje: ${ctx.treinamento.sonoHorasHoje ? `${ctx.treinamento.sonoHorasHoje}h` : 'não registrado'}
- Principais cargas históricas: ${ex}
- Fase de periodização atual: ${ctx.treinamento.periodizacaoFase ?? 'não configurada'}${planosTexto}${atividadesPersonalTexto}`
  }

  if (ctx.profissionalTipo === 'nutricionista' && ctx.nutricao) {
    let atividadesTexto = ''
    if (ctx.nutricao.atividadesSemana?.length) {
      atividadesTexto = '\n\nATIVIDADES DESTA SEMANA (detalhado):\n' + ctx.nutricao.atividadesSemana.map(a => {
        const dataFmt = new Date(a.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
        const dur = a.duracao_min ? `${a.duracao_min}min` : '?min'
        const dist = a.distancia_km ? ` · ${a.distancia_km}km` : ''
        const cal = a.calorias ? ` · ${a.calorias} kcal` : ' · sem calorias'
        return `- ${dataFmt}: ${a.modalidade} (${dur}${dist}${cal})`
      }).join('\n')
    }

    dadosEspecificos = `
DADOS NUTRICIONAIS:
- Plano atual: ${ctx.nutricao.caloriasPrescritas ?? '?'} kcal/dia | proteína ${ctx.nutricao.proteinaPrescritas ?? '?'}g
- Atividades esta semana: ${ctx.nutricao.treinosSemana} sessões
- Calorias gastas nos treinos esta semana: ${ctx.nutricao.caloriasSemanaisGastas ? `${ctx.nutricao.caloriasSemanaisGastas} kcal` : 'sem dados'}
- Fase de periodização: ${ctx.nutricao.periodizacao ?? 'não configurada'}${atividadesTexto}`
  }

  return `Você é o KORE AI — assistente clínico integrado ao perfil de ${pacNome} para uso exclusivo do ${tipo} ${ctx.profissionalNome ?? ''}.

Você não é um chatbot genérico. Você conhece os dados reais deste paciente/aluno e responde como consultor clínico especializado que está ao lado do profissional durante uma consulta ou montagem de plano.

REGRAS:
- Respostas curtas e diretas (máximo 3 parágrafos)
- Sem markdown, sem asteriscos, sem bullet points, sem listas numeradas
- Use o nome ${pacNome} naturalmente
- Sempre considere os alertas clínicos em todas as recomendações
- Foque em insights práticos e acionáveis para o profissional
- Contexto: ${hoje}

PERFIL DO PACIENTE/ALUNO:
- Nome: ${pacNome} | Objetivo: ${ctx.paciente.objetivo ?? '?'}
- Peso: ${ctx.paciente.peso ? `${ctx.paciente.peso}kg` : '?'} | Altura: ${ctx.paciente.altura ? `${ctx.paciente.altura}cm` : '?'}
- Nível: ${ctx.paciente.nivel ?? '?'} | FC máx: ${ctx.paciente.fcmax ? `${ctx.paciente.fcmax}bpm` : '?'} | FTP: ${ctx.paciente.ftp ? `${ctx.paciente.ftp}W` : '?'}
- Meta: ${ctx.paciente.metaPeso ? `${ctx.paciente.metaPeso}kg` : '?'} ${ctx.paciente.metaDataLimite ? `até ${new Date(ctx.paciente.metaDataLimite).toLocaleDateString('pt-BR')}` : ''}
- Última avaliação: ${ctx.ultimaAvaliacao ? new Date(ctx.ultimaAvaliacao).toLocaleDateString('pt-BR') : 'nunca'}

ALERTAS CLÍNICOS (SEMPRE CONSIDERE):
${alertas}

COMPOSIÇÃO CORPORAL:
${composicao}
${dadosEspecificos}`
}

function KoreIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const SUGESTOES: Record<'personal' | 'nutricionista', string[]> = {
  personal: [
    'Pode treinar pesado hoje?',
    'Análise de carga esta semana',
    'Exercício seguro para as lesões',
    'Progresso em relação à meta',
    'Ajuste no plano dessa semana',
  ],
  nutricionista: [
    'Ajuste calórico pelos treinos',
    'Adequação do plano à periodização',
    'Sugestões para as restrições',
    'Resumo clínico para consulta',
    'Meta realista para o prazo',
  ],
}

export default function ProfissionalAIChat({ contexto, pacienteId }: { contexto: ContextoProfissional; pacienteId?: string }) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [profId, setProfId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isPersonal = contexto.profissionalTipo === 'personal'

  // Chave única por profissional + paciente
  const storageKey = profId && pacienteId ? `kore_chat_prof_${profId}_${pacienteId}` : null

  // Carregar profId + histórico ao montar
  useEffect(() => {
    async function init() {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setProfId(session.user.id)
      const key = `kore_chat_prof_${session.user.id}_${pacienteId}`
      try {
        const saved = localStorage.getItem(key)
        if (saved) {
          const hist: Mensagem[] = JSON.parse(saved)
          if (hist.length > 0) setMensagens(hist)
        }
      } catch {}
    }
    if (pacienteId) init()
  }, [pacienteId])
  const corClass = {
    btn: isPersonal ? 'bg-blue-500' : 'bg-emerald-500',
    shadow: isPersonal ? '0 4px 20px rgba(59,130,246,0.45)' : '0 4px 20px rgba(16,185,129,0.45)',
    pulse: isPersonal ? 'bg-blue-400' : 'bg-emerald-400',
    iconBg: isPersonal ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20',
    iconText: isPersonal ? 'text-blue-400' : 'text-emerald-400',
    label: isPersonal ? 'text-blue-400' : 'text-emerald-400',
    focus: isPersonal ? 'focus:border-blue-500/40' : 'focus:border-emerald-500/40',
    sugestao: isPersonal
      ? 'hover:border-blue-500/40 hover:text-blue-400'
      : 'hover:border-emerald-500/40 hover:text-emerald-400',
  }

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      const nome = contexto.paciente.nome?.split(' ')[0] ?? 'paciente'
      const tipoLabel = isPersonal ? 'aluno' : 'paciente'
      let boasVindas = `Pronto para ajudar com ${nome}. `
      if (isPersonal && contexto.treinamento?.scoreRecuperacaoHoje) {
        const score = contexto.treinamento.scoreRecuperacaoHoje
        boasVindas += `Score de recuperação hoje: ${score}/100 — ${score >= 80 ? 'excelente, pode ir com tudo.' : score >= 60 ? 'boa recuperação.' : 'baixo, considere moderar a intensidade.'}`
      } else if (!isPersonal && contexto.nutricao) {
        boasVindas += `Plano atual: ${contexto.nutricao.caloriasPrescritas ?? '?'} kcal, ${contexto.nutricao.treinosSemana} treinos esta semana. O que quer analisar?`
      } else {
        boasVindas += `O que quer analisar sobre este ${tipoLabel}?`
      }
      const inicial: Mensagem[] = [{ role: 'assistant', content: boasVindas }]
      setMensagens(inicial)
      if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(inicial)) } catch {} }
    }
    if (aberto) setTimeout(() => inputRef.current?.focus(), 300)
  }, [aberto])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  function salvarHistorico(msgs: Mensagem[]) {
    const key = storageKey
    if (!key) return
    try {
      // Manter últimas 50 mensagens
      const trimmed = msgs.slice(-50)
      localStorage.setItem(key, JSON.stringify(trimmed))
    } catch {}
  }

  async function enviarMensagem(textoOverride?: string) {
    const texto = (textoOverride ?? input).trim()
    if (!texto || enviando) return
    const novaMensagem: Mensagem = { role: 'user', content: texto }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    salvarHistorico(novasMensagens)
    setInput('')
    setEnviando(true)
    try {
      const res = await fetch('/api/kore-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novasMensagens, systemPrompt: buildSystemPrompt(contexto), usuarioId: profId }),
      })
      const data = await res.json()
      const resposta = data.resposta ?? 'Erro ao processar.'
      const comResposta = [...novasMensagens, { role: 'assistant' as const, content: resposta }]
      setMensagens(comResposta)
      salvarHistorico(comResposta)
    } catch {
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    }
    setEnviando(false)
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        className={`fixed z-40 transition-all duration-300 ${aberto ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)', right: '12px' }}>
        <div className={`w-11 h-11 rounded-2xl ${corClass.btn} flex items-center justify-center active:scale-90 transition-all`}
          style={{ boxShadow: corClass.shadow }}>
          <KoreIcon size={18} className="text-white" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center">
          <div className={`w-1.5 h-1.5 rounded-full ${corClass.pulse} animate-pulse`} />
        </div>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row md:justify-end"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="mt-auto md:mt-0 bg-[#141414] rounded-t-3xl md:rounded-none md:rounded-l-3xl flex flex-col md:w-[440px] md:h-full md:border-l md:border-white/[0.11]" style={{ height: '88dvh' }}>

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.11] shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${corClass.iconBg} border flex items-center justify-center shrink-0`}>
                  <KoreIcon size={18} className={corClass.iconText} />
                </div>
                <div>
                  <p className="text-white font-black text-base md:text-lg">KORE AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${corClass.pulse} animate-pulse`} />
                    <p className={`${corClass.label} text-[11px] md:text-xs uppercase tracking-wider`}>
                      {contexto.paciente.nome ?? 'Paciente'} · Assistente clínico
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mensagens.length > 1 && (
                  <button onClick={() => {
                    setMensagens([])
                    if (storageKey) { try { localStorage.removeItem(storageKey) } catch {} }
                  }} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1">
                    Limpar
                  </button>
                )}
                <button onClick={() => setAberto(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.09] flex items-center justify-center text-zinc-500 hover:text-white active:scale-90 transition-all text-sm">✕</button>
              </div>
            </div>

            {(() => {
              const alertasVisiveis = [
                filtrarAlerta(contexto.alertasClinicos.lesoes),
                filtrarAlerta(contexto.alertasClinicos.restricoesFisicas),
                filtrarAlerta(contexto.alertasClinicos.medicamentos),
              ].filter(Boolean)
              if (!alertasVisiveis.length) return null
              return (
                <div className="mx-4 mt-3 px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 shrink-0">
                  <p className="text-red-300 text-[10px] uppercase tracking-wider font-bold mb-1">⚠ Alertas ativos</p>
                  <p className="text-red-200/70 text-[10px] leading-relaxed line-clamp-2">{alertasVisiveis.join(' · ')}</p>
                </div>
              )
            })()}

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {mensagens.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className={`w-6 h-6 rounded-lg ${corClass.iconBg} border flex items-center justify-center shrink-0 mr-2 mt-1`}>
                      <KoreIcon size={11} className={corClass.iconText} />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-white/[0.09] text-zinc-200 rounded-tl-sm border border-white/[0.11]'}`}>
                    <p className="text-sm md:text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {enviando && (
                <div className="flex justify-start">
                  <div className={`w-6 h-6 rounded-lg ${corClass.iconBg} border flex items-center justify-center shrink-0 mr-2`}>
                    <KoreIcon size={11} className={corClass.iconText} />
                  </div>
                  <div className="bg-white/[0.09] border border-white/[0.11] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {mensagens.length <= 1 && !enviando && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
                {SUGESTOES[contexto.profissionalTipo].map(s => (
                  <button key={s} onClick={() => enviarMensagem(s)}
                    className={`shrink-0 text-[11px] md:text-xs border border-white/[0.10] text-zinc-400 rounded-xl px-3 py-2 md:px-4 md:py-2.5 ${corClass.sugestao} active:scale-95 transition-all whitespace-nowrap`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pt-2 pb-4 border-t border-white/[0.11] shrink-0"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder={`Pergunte sobre ${contexto.paciente.nome?.split(' ')[0] ?? 'este paciente'}...`}
                  disabled={enviando}
                  className={`flex-1 bg-white/[0.09] border border-white/[0.10] rounded-2xl px-4 py-3 text-white text-sm md:text-base placeholder:text-zinc-600 focus:outline-none ${corClass.focus} disabled:opacity-50 transition-colors`} />
                <button onClick={() => enviarMensagem()} disabled={!input.trim() || enviando}
                  className={`w-11 h-11 rounded-2xl ${corClass.btn} flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shrink-0`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
