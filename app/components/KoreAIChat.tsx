'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Mensagem = { role: 'user' | 'assistant'; content: string }

type ContextoAtleta = {
  nome: string | null; objetivo: string | null; peso: number | null; altura: number | null; nivel: string | null
  scoreHoje: number | null
  sonoHoje: { duracao_minutos: number | null; qualidade: number | null; hrv: number | null; fc_repouso: number | null } | null
  bemEstar: { energia: number; humor: number; dor_muscular: number; notas: string | null } | null
  macrosHoje: { calorias: number | null; proteina: number | null; carboidrato: number | null; gordura: number | null; copos_agua: number } | null
  streak: number
  scores30d: { data: string; score: number }[]
  nutricao7d: { data: string; calorias: number | null; proteina: number | null }[]
  treinosRecentes: { nome: string; plano: string; data: string; calorias_estimadas: number | null }[]
  atividadesRecentes: { modalidade: string; duracao_min: number; distancia_km: number | null; calorias_estimadas: number | null; intensidade: number | null; data: string }[]
  evolucaoExercicios: { nome: string; maxCarga: number; sessoes: number }[]
  personal: { nome: string | null; email: string } | null
  nutricionista: { nome: string | null; email: string } | null
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
  const mediaScore = ctx.scores30d.length ? Math.round(ctx.scores30d.reduce((a, s) => a + s.score, 0) / ctx.scores30d.length) : null
  const melhorScore = ctx.scores30d.length ? Math.max(...ctx.scores30d.map(s => s.score)) : null

  return `Você é o KORE AI — membro do time de alta performance do atleta ${ctx.nome ?? 'atleta'}. Você não é um chatbot nem assistente genérico. É o coach de IA que conhece TODOS os dados reais deste atleta e age como parte do time, junto com o personal trainer e a nutricionista.

QUEM VOCÊ É:
- Tem acesso completo a todos os dados do atleta — use-os sempre
- Responde como coach de elite que acompanha o atleta há meses
- Direto, honesto, específico — nunca genérico
- Máximo 3 parágrafos curtos. Sem markdown, sem asteriscos, sem bullet points
- Use o nome do atleta naturalmente

PERFIL:
- Nome: ${ctx.nome ?? 'não informado'} | Objetivo: ${ctx.objetivo ?? 'não informado'}
- Peso: ${ctx.peso ? `${ctx.peso}kg` : '?'} | Altura: ${ctx.altura ? `${ctx.altura}cm` : '?'} | Nível: ${ctx.nivel ?? '?'}
- Personal Trainer: ${ctx.personal ? (ctx.personal.nome ?? ctx.personal.email) : 'não vinculado'}
- Nutricionista: ${ctx.nutricionista ? (ctx.nutricionista.nome ?? ctx.nutricionista.email) : 'não vinculada'}

HOJE (${hoje}, ${hora}h):
Score de recuperação: ${ctx.scoreHoje ? `${ctx.scoreHoje}/100` : 'não registrado'}
Sono: ${ctx.sonoHoje?.duracao_minutos ? `${Math.floor(ctx.sonoHoje.duracao_minutos/60)}h${ctx.sonoHoje.duracao_minutos%60}min` : '?'} | qualidade ${ctx.sonoHoje?.qualidade ? `${ctx.sonoHoje.qualidade}/5` : '?'} | HRV ${ctx.sonoHoje?.hrv ? `${ctx.sonoHoje.hrv}ms` : '?'} | FC repouso ${ctx.sonoHoje?.fc_repouso ? `${ctx.sonoHoje.fc_repouso}bpm` : '?'}
Bem-estar: energia ${ctx.bemEstar?.energia ?? '?'}/5 | humor ${ctx.bemEstar?.humor ?? '?'}/5 | dor muscular ${ctx.bemEstar?.dor_muscular ?? '?'}/5${ctx.bemEstar?.notas ? ` | nota: "${ctx.bemEstar.notas}"` : ''}
Nutrição: ${ctx.macrosHoje?.calorias ?? '?'}kcal | proteína ${ctx.macrosHoje?.proteina ?? '?'}g | carbo ${ctx.macrosHoje?.carboidrato ?? '?'}g | gordura ${ctx.macrosHoje?.gordura ?? '?'}g | água ${ctx.macrosHoje?.copos_agua ? `${ctx.macrosHoje.copos_agua * 250}ml` : '?'}

HISTÓRICO 30 DIAS:
Streak: ${ctx.streak} dias | Score médio: ${mediaScore ?? '?'}/100 | Melhor: ${melhorScore ?? '?'}/100
Scores recentes: ${ctx.scores30d.slice(-10).map(s => `${s.data}:${s.score}`).join(', ') || 'sem dados'}
Treinos musculação: ${ctx.treinosRecentes.length ? ctx.treinosRecentes.map(t => `${t.nome}(${t.data})${t.calorias_estimadas ? `~${t.calorias_estimadas}kcal` : ''}`).join(', ') : 'nenhum'}
Atividades livres: ${ctx.atividadesRecentes.length ? ctx.atividadesRecentes.map(a => `${a.modalidade} ${a.duracao_min}min${a.distancia_km ? ` ${a.distancia_km}km` : ''} intensidade${a.intensidade}/5${a.calorias_estimadas ? ` ~${a.calorias_estimadas}kcal` : ''} (${a.data})`).join(' | ') : 'nenhuma'}

MUSCULAÇÃO — EVOLUÇÃO DE CARGA:
${ctx.evolucaoExercicios.length ? ctx.evolucaoExercicios.map(e => `${e.nome}: ${e.sessoes}x, máx ${e.maxCarga}kg`).join(' | ') : 'sem dados'}

NUTRIÇÃO ÚLTIMOS 7 DIAS:
${ctx.nutricao7d.length ? ctx.nutricao7d.map(n => `${n.data}: ${n.calorias ?? '?'}kcal proteína ${n.proteina ?? '?'}g`).join(' | ') : 'sem dados'}`
}

function KoreIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function KoreAIChat() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [contexto, setContexto] = useState<ContextoAtleta | null>(null)
  const [carregandoCtx, setCarregandoCtx] = useState(false)
  const [tipo, setTipo] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto && !contexto && !carregandoCtx) carregarContexto()
    if (aberto) setTimeout(() => inputRef.current?.focus(), 300)
  }, [aberto])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function carregarContexto() {
    setCarregandoCtx(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCarregandoCtx(false); return }

    setUserId(session.user.id)
    const hoje = getTodayBR()
    const dias30 = new Date(); dias30.setDate(dias30.getDate() - 30)
    const dias7 = new Date(); dias7.setDate(dias7.getDate() - 7)
    const str30 = dias30.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const str7 = dias7.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [
      { data: perfil }, { data: sonoHoje }, { data: be }, { data: macros },
      { data: treinos }, { data: atividadesLivres }, { data: scores30d },
      { data: nutricao7d }, { data: vinculos }, { data: perfilTipo },
      { data: historico }, { data: seriesData }, { data: treinosIds },
    ] = await Promise.all([
      supabase.from('perfis').select('nome, objetivo, peso, altura, nivel').eq('id', session.user.id).single(),
      supabase.from('sono').select('score_recuperacao, duracao_minutos, qualidade, hrv, fc_repouso').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('bem_estar').select('energia, humor, dor_muscular, notas').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('nutricao').select('calorias, proteina, carboidrato, gordura, copos_agua').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('treinos').select('nome, plano, data, calorias_estimadas').eq('cliente_id', session.user.id).eq('concluido', true).gte('data', str30).order('data', { ascending: false }).limit(10),
      supabase.from('atividades_livres').select('modalidade, duracao_min, distancia_km, calorias_estimadas, intensidade, data').eq('usuario_id', session.user.id).gte('data', str30).order('data', { ascending: false }).limit(10),
      supabase.from('sono').select('data, score_recuperacao').eq('usuario_id', session.user.id).gte('data', str30).not('score_recuperacao', 'is', null).order('data'),
      supabase.from('nutricao').select('data, calorias, proteina').eq('usuario_id', session.user.id).gte('data', str7).order('data'),
      supabase.from('vinculos').select('tipo, profissional_id').eq('cliente_id', session.user.id).eq('ativo', true),
      supabase.from('perfis').select('tipo').eq('id', session.user.id).single(),
      supabase.from('chat_historico').select('role, content').eq('usuario_id', session.user.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: true }).limit(50),
      supabase.from('series_registradas').select('carga, exercicios_treino(nome), treino_id').in('treino_id', []),
      supabase.from('treinos').select('id').eq('cliente_id', session.user.id).eq('concluido', true),
    ])

    setTipo(perfilTipo?.tipo ?? null)

    // Busca profissionais vinculados
    let personal = null, nutricionista = null
    if (vinculos?.length) {
      const pIds = vinculos.map((v: any) => v.profissional_id)
      const { data: profis } = await supabase.from('perfis').select('id, nome, email, tipo').in('id', pIds)
      const vinculoPersonal = vinculos.find((v: any) => v.tipo === 'personal')
      const vinculoNutri = vinculos.find((v: any) => v.tipo === 'nutricionista')
      if (vinculoPersonal) { const p = profis?.find((x: any) => x.id === vinculoPersonal.profissional_id); if (p) personal = { nome: p.nome, email: p.email } }
      if (vinculoNutri) { const p = profis?.find((x: any) => x.id === vinculoNutri.profissional_id); if (p) nutricionista = { nome: p.nome, email: p.email } }
    }

    // Evolução de exercícios
    let evolucaoExercicios: { nome: string; maxCarga: number; sessoes: number }[] = []
    if (treinosIds?.length) {
      const ids = treinosIds.map((t: any) => t.id)
      const { data: series } = await supabase.from('series_registradas').select('carga, exercicios_treino(nome), treino_id').in('treino_id', ids)
      if (series) {
        const exMap = new Map<string, { max: number; sessoes: Set<string> }>()
        series.forEach((s: any) => {
          const nome = s.exercicios_treino?.nome ?? '?'
          if (!exMap.has(nome)) exMap.set(nome, { max: 0, sessoes: new Set() })
          const ex = exMap.get(nome)!
          if (s.carga) ex.max = Math.max(ex.max, s.carga)
          ex.sessoes.add(s.treino_id)
        })
        evolucaoExercicios = Array.from(exMap.entries()).map(([nome, v]) => ({ nome, maxCarga: v.max, sessoes: v.sessoes.size })).sort((a, b) => b.sessoes - a.sessoes).slice(0, 8)
      }
    }

    // Streak
    const treinadosDatas = new Set([...(treinos?.map((t: any) => t.data) ?? []), ...(atividadesLivres?.map((a: any) => a.data) ?? [])])
    let streak = 0
    const cursor = new Date(hoje + 'T12:00:00-03:00')
    while (true) {
      const d = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      if (treinadosDatas.has(d)) { streak++; cursor.setDate(cursor.getDate() - 1) } else break
    }

    const ctx: ContextoAtleta = {
      nome: perfil?.nome ?? null, objetivo: perfil?.objetivo ?? null,
      peso: perfil?.peso ?? null, altura: perfil?.altura ?? null, nivel: perfil?.nivel ?? null,
      scoreHoje: sonoHoje?.score_recuperacao ?? null,
      sonoHoje: sonoHoje ? { duracao_minutos: sonoHoje.duracao_minutos, qualidade: sonoHoje.qualidade, hrv: sonoHoje.hrv, fc_repouso: sonoHoje.fc_repouso } : null,
      bemEstar: be ?? null,
      macrosHoje: macros ?? null,
      streak,
      scores30d: scores30d?.map((s: any) => ({ data: s.data, score: s.score_recuperacao })) ?? [],
      nutricao7d: nutricao7d?.map((n: any) => ({ data: n.data, calorias: n.calorias, proteina: n.proteina })) ?? [],
      treinosRecentes: treinos?.map((t: any) => ({ nome: t.nome, plano: t.plano, data: t.data, calorias_estimadas: t.calorias_estimadas })) ?? [],
      atividadesRecentes: atividadesLivres?.map((a: any) => ({ modalidade: a.modalidade, duracao_min: a.duracao_min, distancia_km: a.distancia_km, calorias_estimadas: a.calorias_estimadas, intensidade: a.intensidade, data: a.data })) ?? [],
      evolucaoExercicios,
      personal,
      nutricionista,
    }

    setContexto(ctx)
    setCarregandoCtx(false)

    if (historico && historico.length > 0) {
      setMensagens(historico.map((m: any) => ({ role: m.role, content: m.content })))
    } else {
      const hora = getHourBR()
      const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
      const nome = perfil?.nome?.split(' ')[0] ?? 'atleta'
      let boasVindas = `${saudacao}, ${nome}. `
      if (ctx.scoreHoje) {
        boasVindas += `Score de recuperação hoje: ${ctx.scoreHoje}/100 — `
        if (ctx.scoreHoje >= 80) boasVindas += `excelente. Pode ir com tudo hoje.`
        else if (ctx.scoreHoje >= 60) boasVindas += `boa recuperação. O que quer saber?`
        else boasVindas += `recomendo moderação hoje. Em que posso ajudar?`
      } else {
        boasVindas += `Registre seu sono e bem-estar para eu ter dados completos. No que posso ajudar?`
      }
      setMensagens([{ role: 'assistant', content: boasVindas }])
      await supabase.from('chat_historico').insert({ usuario_id: session.user.id, role: 'assistant', content: boasVindas })
    }
  }

  async function enviarMensagem() {
    if (!input.trim() || enviando || !contexto || !userId) return
    const novaMensagem: Mensagem = { role: 'user', content: input.trim() }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    setInput('')
    setEnviando(true)
    await supabase.from('chat_historico').insert({ usuario_id: userId, role: 'user', content: novaMensagem.content })
    try {
      const res = await fetch('/api/kore-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagens: novasMensagens, systemPrompt: buildSystemPrompt(contexto) }) })
      const data = await res.json()
      const resposta = data.resposta ?? 'Erro ao processar.'
      setMensagens(prev => [...prev, { role: 'assistant', content: resposta }])
      await supabase.from('chat_historico').insert({ usuario_id: userId, role: 'assistant', content: resposta })
    } catch {
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    }
    setEnviando(false)
  }

  if (tipo && tipo !== 'cliente') return null

  const ROTAS_OCULTAS = ['/', '/login', '/cadastro', '/onboarding', '/nova-senha']
  if (ROTAS_OCULTAS.includes(pathname)) return null

  return (
    <>
      <button onClick={() => setAberto(true)}
        className={`fixed z-40 transition-all duration-300 ${aberto ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)', right: '12px' }}>
        <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center active:scale-90 transition-all"
          style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.45)' }}>
          <KoreIcon size={18} className="text-white" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="mt-auto bg-[#0a0a0a] rounded-t-3xl flex flex-col" style={{ height: '88dvh' }}>

            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <KoreIcon size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-black text-sm">KORE AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-emerald-400 text-[10px] uppercase tracking-wider">Membro do seu time</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setAberto(false)} className="w-7 h-7 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white active:scale-90 transition-all text-xs">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {carregandoCtx ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-500 text-sm">Carregando todos os seus dados...</p>
                </div>
              ) : mensagens.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mr-2 mt-1">
                      <KoreIcon size={11} className="text-emerald-400" />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-white/[0.06] text-zinc-200 rounded-tl-sm border border-white/[0.06]'}`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {enviando && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mr-2">
                    <KoreIcon size={11} className="text-emerald-400" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {mensagens.length <= 1 && !enviando && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
                {['Posso treinar forte hoje?', 'Como está minha recuperação?', 'O que comer agora?', 'Analisa minha semana', 'Como foi minha corrida?'].map((s) => (
                  <button key={s} onClick={() => { setInput(s); setTimeout(enviarMensagem, 50) }}
                    className="shrink-0 text-[11px] border border-white/[0.10] text-zinc-400 rounded-xl px-3 py-2 hover:border-emerald-500/40 hover:text-emerald-400 active:scale-95 transition-all whitespace-nowrap">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pt-2 pb-4 border-t border-white/[0.06] shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder="Pergunte ao seu coach..." disabled={enviando || carregandoCtx}
                  className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-2xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50 transition-colors" />
                <button onClick={enviarMensagem} disabled={!input.trim() || enviando || carregandoCtx}
                  className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shrink-0">
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