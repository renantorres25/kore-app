'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

type Mensagem = {
  role: 'user' | 'assistant'
  content: string
}

type ContextoAtleta = {
  nome: string | null
  objetivo: string | null
  peso: number | null
  altura: number | null
  nivel: string | null
  scoreHoje: number | null
  bemEstar: { energia: number; humor: number; dor_muscular: number } | null
  treinosRecentes: { nome: string; plano: string; data: string }[]
  macrosHoje: { calorias: number | null; proteina: number | null; carboidrato: number | null; gordura: number | null; copos_agua: number } | null
  streak: number
  mediaScore7d: number | null
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getHourBR(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }), 10)
}

function buildSystemPrompt(ctx: ContextoAtleta): string {
  const hora = getHourBR()
  const hoje = getTodayBR()

  return `Você é o KORE AI, coach pessoal de alta performance do atleta ${ctx.nome ?? 'atleta'}. Você tem acesso a todos os dados reais dele e responde como um coach experiente — direto, honesto, baseado em dados, nunca genérico.

PERFIL DO ATLETA:
- Nome: ${ctx.nome ?? 'não informado'}
- Objetivo: ${ctx.objetivo ?? 'não informado'}
- Peso: ${ctx.peso ? `${ctx.peso}kg` : 'não informado'}
- Altura: ${ctx.altura ? `${ctx.altura}cm` : 'não informado'}
- Nível: ${ctx.nivel ?? 'não informado'}

DADOS DE HOJE (${hoje}, ${hora}h):
- Score de recuperação: ${ctx.scoreHoje ? `${ctx.scoreHoje}/100` : 'não registrado'}
- Energia: ${ctx.bemEstar?.energia ? `${ctx.bemEstar.energia}/5` : 'não registrado'}
- Humor: ${ctx.bemEstar?.humor ? `${ctx.bemEstar.humor}/5` : 'não registrado'}
- Dor muscular: ${ctx.bemEstar?.dor_muscular ? `${ctx.bemEstar.dor_muscular}/5` : 'não registrado'}
- Calorias: ${ctx.macrosHoje?.calorias ?? 'não registrado'}kcal
- Proteína: ${ctx.macrosHoje?.proteina ?? 'não registrado'}g
- Carboidrato: ${ctx.macrosHoje?.carboidrato ?? 'não registrado'}g
- Gordura: ${ctx.macrosHoje?.gordura ?? 'não registrado'}g
- Hidratação: ${ctx.macrosHoje?.copos_agua ? `${ctx.macrosHoje.copos_agua * 250}ml` : 'não registrado'}

HISTÓRICO RECENTE:
- Streak atual: ${ctx.streak} dias consecutivos
- Score médio 7 dias: ${ctx.mediaScore7d ? `${ctx.mediaScore7d}/100` : 'não disponível'}
- Últimos treinos: ${ctx.treinosRecentes.length ? ctx.treinosRecentes.map(t => `${t.nome} (${t.data})`).join(', ') : 'nenhum registrado'}

REGRAS DE RESPOSTA:
- Sempre use os dados reais acima nas respostas
- Seja direto e específico — nunca genérico
- Máximo 3 parágrafos curtos por resposta
- Sem markdown, sem asteriscos, sem listas com bullet points
- Se não tiver dados suficientes para responder, peça para o atleta registrar (sono, bem-estar, etc)
- Fale como um coach experiente, não como um assistente
- Use o nome do atleta quando fizer sentido`
}

export default function KoreAIChat() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [contexto, setContexto] = useState<ContextoAtleta | null>(null)
  const [carregandoCtx, setCarregandoCtx] = useState(false)
  const [tipo, setTipo] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto && !contexto && !carregandoCtx) {
      carregarContexto()
    }
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [aberto])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function carregarContexto() {
    setCarregandoCtx(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCarregandoCtx(false); return }

    const hoje = getTodayBR()
    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [
      { data: perfil },
      { data: sonoHoje },
      { data: be },
      { data: macros },
      { data: treinos },
      { data: scores7d },
      { data: perfilTipo },
    ] = await Promise.all([
      supabase.from('perfis').select('nome, objetivo, peso, altura, nivel').eq('id', session.user.id).single(),
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('bem_estar').select('energia, humor, dor_muscular').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('nutricao').select('calorias, proteina, carboidrato, gordura, copos_agua').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('treinos').select('nome, plano, data').eq('cliente_id', session.user.id).eq('concluido', true).order('data', { ascending: false }).limit(5),
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).gte('data', semanaStr).not('score_recuperacao', 'is', null),
      supabase.from('perfis').select('tipo').eq('id', session.user.id).single(),
    ])

    setTipo(perfilTipo?.tipo ?? null)

    // Calcula streak
    const treinadosDatas = new Set(treinos?.map(t => t.data) ?? [])
    let streak = 0
    const cursor = new Date(hoje + 'T12:00:00-03:00')
    while (true) {
      const d = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      if (treinadosDatas.has(d)) { streak++; cursor.setDate(cursor.getDate() - 1) }
      else break
    }

    const scoress = scores7d?.map(s => s.score_recuperacao).filter(Boolean) as number[]
    const mediaScore7d = scoress?.length ? Math.round(scoress.reduce((a, b) => a + b, 0) / scoress.length) : null

    const ctx: ContextoAtleta = {
      nome: perfil?.nome ?? null,
      objetivo: perfil?.objetivo ?? null,
      peso: perfil?.peso ?? null,
      altura: perfil?.altura ?? null,
      nivel: perfil?.nivel ?? null,
      scoreHoje: sonoHoje?.score_recuperacao ?? null,
      bemEstar: be ?? null,
      treinosRecentes: treinos ?? [],
      macrosHoje: macros ?? null,
      streak,
      mediaScore7d,
    }

    setContexto(ctx)
    setCarregandoCtx(false)

    // Mensagem de boas-vindas contextual
    const hora = getHourBR()
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
    const nome = perfil?.nome?.split(' ')[0] ?? 'atleta'
    let boasVindas = `${saudacao}, ${nome}. `

    if (ctx.scoreHoje) {
      boasVindas += `Seu score de recuperação hoje é ${ctx.scoreHoje}/100 — `
      if (ctx.scoreHoje >= 80) boasVindas += `excelente para treinar forte. Como posso te ajudar?`
      else if (ctx.scoreHoje >= 60) boasVindas += `boa recuperação. O que quero saber?`
      else boasVindas += `recomendo moderação hoje. Em que posso ajudar?`
    } else {
      boasVindas += `Registre seu sono e bem-estar para eu ter dados completos sobre você. No que posso ajudar?`
    }

    setMensagens([{ role: 'assistant', content: boasVindas }])
  }

  async function enviarMensagem() {
    if (!input.trim() || enviando || !contexto) return

    const novaMensagem: Mensagem = { role: 'user', content: input.trim() }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    setInput('')
    setEnviando(true)

    try {
      const response = await fetch('/api/kore-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: novasMensagens,
          systemPrompt: buildSystemPrompt(contexto),
        }),
      })
      const data = await response.json()
      setMensagens(prev => [...prev, { role: 'assistant', content: data.resposta }])
    } catch {
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    }

    setEnviando(false)
  }

  // Só mostra para clientes
  if (tipo && tipo !== 'cliente') return null

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className={`fixed z-40 transition-all duration-300 ${aberto ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          right: '16px',
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all"
          style={{ boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>
          <span className="text-white text-2xl font-black">✦</span>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </button>

      {/* Overlay */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>

          {/* Chat sheet */}
          <div className="mt-auto bg-[#0a0a0a] rounded-t-3xl flex flex-col" style={{ height: '85dvh', maxHeight: '85dvh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 text-lg font-black">✦</span>
                </div>
                <div>
                  <p className="text-white font-black text-base">KORE AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-emerald-400 text-[10px] uppercase tracking-wider">Coach pessoal online</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setAberto(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all">
                ✕
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {carregandoCtx ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-500 text-sm">Carregando seus dados...</p>
                </div>
              ) : (
                mensagens.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                        <span className="text-emerald-400 text-[10px] font-black">✦</span>
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-white text-black rounded-tr-sm'
                        : 'bg-white/[0.06] text-zinc-200 rounded-tl-sm border border-white/[0.06]'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {enviando && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mr-2">
                    <span className="text-emerald-400 text-[10px] font-black">✦</span>
                  </div>
                  <div className="bg-white/[0.06] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões rápidas */}
            {mensagens.length === 1 && !enviando && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
                {[
                  'Posso treinar forte hoje?',
                  'Como está minha recuperação?',
                  'O que comer agora?',
                  'Analisa minha semana',
                ].map((sugestao) => (
                  <button key={sugestao} onClick={() => { setInput(sugestao); setTimeout(() => enviarMensagem(), 0) }}
                    className="shrink-0 text-[11px] border border-white/[0.10] text-zinc-400 rounded-xl px-3 py-2 hover:border-emerald-500/40 hover:text-emerald-400 active:scale-95 transition-all whitespace-nowrap">
                    {sugestao}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder="Pergunte ao seu coach..."
                  disabled={enviando || carregandoCtx}
                  className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-2xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={!input.trim() || enviando || carregandoCtx}
                  className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <span className="text-white text-lg">↑</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}