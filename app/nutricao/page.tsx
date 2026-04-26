'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getHourBR(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }), 10)
}

type Perfil = { nome: string | null; peso: number | null; objetivo: string | null }

const QUALIDADE_OPCOES = [
  { valor: 1, label: 'Ruim',     emoji: '😞', desc: 'Comi mal hoje',         cor: 'border-red-500/40 bg-red-500/10 text-red-400' },
  { valor: 2, label: 'Regular',  emoji: '😐', desc: 'Poderia ser melhor',    cor: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
  { valor: 3, label: 'Boa',      emoji: '🙂', desc: 'Me alimentei bem',      cor: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  { valor: 4, label: 'Ótima',    emoji: '💪', desc: 'Dieta perfeita hoje',   cor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
]

function getMetaProteina(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  if (objetivo === 'ganhar_massa') return Math.round(peso * 2.2)
  if (objetivo === 'perder_peso') return Math.round(peso * 2.0)
  return Math.round(peso * 1.8)
}

function getMetaCalorias(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  const tmb = 10 * peso + 6.25 * 170 - 5 * 25 + 5
  const tdee = Math.round(tmb * 1.55)
  if (objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso',
  ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento',
  saude_geral: 'Saúde geral',
}

export default function Nutricao() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [userId, setUserId] = useState('')
  const [perfil, setPerfil] = useState<Perfil>({ nome: null, peso: null, objetivo: null })
  const [scoreHoje, setScoreHoje] = useState<number | null>(null)
  const [treinouHoje, setTreinouHoje] = useState(false)
  const [registroId, setRegistroId] = useState<string | null>(null)
  const [vinculoNutri, setVinculoNutri] = useState<{ nome: string | null } | null>(null)

  // Campos do registro
  const [qualidade, setQualidade] = useState<number | null>(null)
  const [calorias, setCalorias] = useState('')
  const [proteina, setProteina] = useState('')
  const [coposAgua, setCoposAgua] = useState(0)
  const [observacoes, setObservacoes] = useState('')

  // Análise IA
  const [analise, setAnalise] = useState({ texto: '', carregando: false, gerado: false })
  const [jaRegistrou, setJaRegistrou] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUserId(session.user.id)

    const hoje = getTodayBR()
    const [{ data: perfilData }, { data: sonoHoje }, { data: treinoHoje }, { data: atividadeHoje }, { data: registroHoje }, { data: vinculo }] = await Promise.all([
      supabase.from('perfis').select('nome, peso, objetivo').eq('id', session.user.id).single(),
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('treinos').select('id').eq('cliente_id', session.user.id).eq('concluido', true).eq('data', hoje).limit(1),
      supabase.from('atividades_livres').select('id').eq('usuario_id', session.user.id).eq('data', hoje).limit(1),
      supabase.from('nutricao').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('vinculos').select('profissional_id').eq('cliente_id', session.user.id).eq('tipo', 'nutricionista').eq('ativo', true).single(),
    ])

    if (perfilData) setPerfil(perfilData)
    if (sonoHoje?.score_recuperacao) setScoreHoje(sonoHoje.score_recuperacao)
    if ((treinoHoje && treinoHoje.length > 0) || (atividadeHoje && atividadeHoje.length > 0)) setTreinouHoje(true)

    if (registroHoje) {
      setRegistroId(registroHoje.id)
      setQualidade(registroHoje.qualidade_alimentacao ?? null)
      setCalorias(registroHoje.calorias ? String(registroHoje.calorias) : '')
      setProteina(registroHoje.proteina ? String(registroHoje.proteina) : '')
      setCoposAgua(registroHoje.copos_agua ?? 0)
      setObservacoes(registroHoje.observacoes ?? '')
      if (registroHoje.qualidade_alimentacao) setJaRegistrou(true)
    }

    if (vinculo) {
      const { data: nutriPerfil } = await supabase.from('perfis').select('nome').eq('id', vinculo.profissional_id).single()
      if (nutriPerfil) setVinculoNutri(nutriPerfil)
    }

    setCarregando(false)
  }

  async function salvarRegistro() {
    if (!qualidade) return
    setSalvando(true)

    const payload = {
      usuario_id: userId,
      data: getTodayBR(),
      qualidade_alimentacao: qualidade,
      calorias: calorias ? parseInt(calorias) : null,
      proteina: proteina ? parseFloat(proteina) : null,
      carboidrato: null,
      gordura: null,
      copos_agua: coposAgua,
    }

    if (registroId) {
      await supabase.from('nutricao').update(payload).eq('id', registroId)
    } else {
      const { data } = await supabase.from('nutricao').insert(payload).select('id').single()
      if (data) setRegistroId(data.id)
    }

    setJaRegistrou(true)
    setSalvando(false)
    gerarAnaliseIA()
  }

  async function gerarAnaliseIA() {
    setAnalise({ texto: '', carregando: true, gerado: false })

    const metaCal = getMetaCalorias(perfil.peso, perfil.objetivo)
    const metaProt = getMetaProteina(perfil.peso, perfil.objetivo)
    const qualLabel = QUALIDADE_OPCOES.find(q => q.valor === qualidade)?.label ?? '?'
    const hora = getHourBR()

    const prompt = `Você é o coach de nutrição do KORE. Analise o dia alimentar deste atleta e dê um feedback direto e personalizado.

PERFIL:
- Objetivo: ${OBJETIVO_LABEL[perfil.objetivo ?? ''] ?? 'não informado'}
- Peso: ${perfil.peso ? `${perfil.peso}kg` : 'não informado'}
- Meta calórica estimada: ${metaCal ? `${metaCal}kcal` : 'não calculada'}
- Meta proteína estimada: ${metaProt ? `${metaProt}g` : 'não calculada'}

REGISTRO DE HOJE (${hora}h):
- Avaliação do atleta: ${qualLabel}
- Calorias registradas: ${calorias ? `${calorias}kcal` : 'não informado'}
- Proteína registrada: ${proteina ? `${proteina}g` : 'não informado'}
- Hidratação: ${coposAgua * 250}ml (${coposAgua}/8 copos)
- Treinou hoje: ${treinouHoje ? 'Sim' : 'Não'}
- Score de recuperação: ${scoreHoje ? `${scoreHoje}/100` : 'não registrado'}

Gere feedback em 3 partes curtas (máx 80 palavras, sem markdown, sem asteriscos):
1. Balanço do dia — o que os dados dizem
2. Ponto de atenção — o que mais precisa melhorar
3. Ação concreta para amanhã — algo específico e prático`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? '', carregando: false, gerado: true })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar análise agora.', carregando: false, gerado: true })
    }
  }

  async function atualizarAgua(copos: number) {
    const novosCopos = Math.max(0, Math.min(12, copos))
    setCoposAgua(novosCopos)
    const hoje = getTodayBR()
    if (registroId) {
      await supabase.from('nutricao').update({ copos_agua: novosCopos }).eq('id', registroId)
    } else {
      const { data } = await supabase.from('nutricao').insert({ usuario_id: userId, data: hoje, copos_agua: novosCopos }).select('id').single()
      if (data) setRegistroId(data.id)
    }
  }

  const metaCal = getMetaCalorias(perfil.peso, perfil.objetivo)
  const metaProt = getMetaProteina(perfil.peso, perfil.objetivo)
  const pctCal = calorias && metaCal ? Math.min(100, Math.round((parseInt(calorias) / metaCal) * 100)) : 0
  const pctProt = proteina && metaProt ? Math.min(100, Math.round((parseFloat(proteina) / metaProt) * 100)) : 0
  const hora = getHourBR()
  const isManha = hora < 12
  const isTarde = hora >= 12 && hora < 18
  const isNoite = hora >= 18

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
            <h1 className="text-[1.85rem] font-black tracking-tight text-white">Nutrição</h1>
            <p className="text-zinc-600 text-[11px] mt-1 capitalize">
              {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {/* Badge hora do dia */}
          <div className={`mt-1 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${
            isManha ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
            isTarde ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
            'bg-purple-500/10 border-purple-500/20 text-purple-400'
          }`}>
            {isManha ? '☀️ Manhã' : isTarde ? '🌤 Tarde' : '🌙 Noite'}
          </div>
        </div>

        {/* Contexto do dia */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className={`rounded-2xl p-3 border text-center ${scoreHoje ? scoreHoje >= 70 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Recuperação</p>
            <p className={`text-2xl font-black ${scoreHoje ? scoreHoje >= 70 ? 'text-emerald-400' : 'text-yellow-400' : 'text-zinc-600'}`}>{scoreHoje ?? '—'}</p>
            <p className="text-zinc-700 text-[9px]">/100</p>
          </div>
          <div className={`rounded-2xl p-3 border text-center ${treinouHoje ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Treino</p>
            <p className={`text-2xl font-black ${treinouHoje ? 'text-emerald-400' : 'text-zinc-600'}`}>{treinouHoje ? '✓' : '—'}</p>
            <p className="text-zinc-700 text-[9px]">hoje</p>
          </div>
          <div className="rounded-2xl p-3 border border-white/[0.06] bg-white/[0.02] text-center">
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Meta</p>
            <p className="text-2xl font-black text-white">{metaCal ? `${Math.round(metaCal/100)/10}k` : '—'}</p>
            <p className="text-zinc-700 text-[9px]">kcal</p>
          </div>
        </div>

        {/* ── REGISTRO DO DIA ── */}
        <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-0.5">Como foi sua alimentação hoje?</p>
            <p className="text-zinc-600 text-[11px]">Avalie e registre o essencial — leva 30 segundos</p>
          </div>

          <div className="p-5 space-y-5">
            {/* Qualidade — 4 botões */}
            <div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-3">Avaliação geral</p>
              <div className="grid grid-cols-4 gap-2">
                {QUALIDADE_OPCOES.map(op => (
                  <button key={op.valor} onClick={() => setQualidade(op.valor)}
                    className={`flex flex-col items-center py-3 px-1 rounded-2xl border transition-all active:scale-90 ${qualidade === op.valor ? op.cor : 'border-white/[0.06] bg-white/[0.02] text-zinc-500'}`}>
                    <span className="text-2xl mb-1.5">{op.emoji}</span>
                    <span className="text-[10px] font-bold leading-tight text-center">{op.label}</span>
                  </button>
                ))}
              </div>
              {qualidade && (
                <p className="text-zinc-500 text-[11px] text-center mt-2 italic">
                  "{QUALIDADE_OPCOES.find(q => q.valor === qualidade)?.desc}"
                </p>
              )}
            </div>

            {/* Calorias + Proteína */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-600 text-[10px] uppercase tracking-wider">Calorias</label>
                  {metaCal && <span className="text-zinc-700 text-[9px]">meta {metaCal}</span>}
                </div>
                <div className="relative">
                  <input type="number" placeholder="ex: 2000" value={calorias}
                    onChange={e => setCalorias(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-sm text-center font-bold focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">kcal</span>
                </div>
                {calorias && metaCal && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pctCal >= 100 ? 'bg-emerald-400' : pctCal >= 70 ? 'bg-blue-400' : 'bg-zinc-600'}`} style={{ width: `${pctCal}%` }} />
                    </div>
                    <p className="text-zinc-700 text-[9px] mt-1 text-center">{pctCal}% da meta</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-600 text-[10px] uppercase tracking-wider">Proteína</label>
                  {metaProt && <span className="text-zinc-700 text-[9px]">meta {metaProt}g</span>}
                </div>
                <div className="relative">
                  <input type="number" placeholder="ex: 150" value={proteina}
                    onChange={e => setProteina(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-sm text-center font-bold focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">g</span>
                </div>
                {proteina && metaProt && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pctProt >= 100 ? 'bg-emerald-400' : pctProt >= 70 ? 'bg-blue-400' : 'bg-zinc-600'}`} style={{ width: `${pctProt}%` }} />
                    </div>
                    <p className="text-zinc-700 text-[9px] mt-1 text-center">{pctProt}% da meta</p>
                  </div>
                )}
              </div>
            </div>

            {/* Observações livres */}
            <div>
              <label className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2 block">
                Observações <span className="text-zinc-700 normal-case">— opcional mas ajuda a IA</span>
              </label>
              <textarea
                placeholder="Ex: comi fora hoje, tive muita fome à tarde, pulei o almoço, me senti com energia..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700 resize-none leading-relaxed"
              />
              <p className="text-zinc-700 text-[10px] mt-1.5">Quanto mais detalhes, melhor o feedback da IA</p>
            </div>

            {/* Botão salvar */}
            <button onClick={salvarRegistro} disabled={!qualidade || salvando}
              className={`w-full font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all tracking-wide ${jaRegistrou ? 'bg-white/[0.06] border border-white/[0.10] text-zinc-300' : 'bg-white text-black hover:bg-zinc-100'}`}>
              {salvando ? 'Salvando...' : jaRegistrou ? '✓ Registrado — atualizar' : 'Registrar meu dia →'}
            </button>
          </div>
        </div>

        {/* ── HIDRATAÇÃO ── */}
        <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
          <div className="px-5 pt-4 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Hidratação</p>
                <p className="text-white font-black text-2xl mt-0.5">{coposAgua * 250}<span className="text-zinc-600 text-sm font-normal">ml / 2000ml</span></p>
              </div>
              <p className={`text-3xl font-black tabular-nums ${coposAgua >= 8 ? 'text-emerald-400' : coposAgua >= 4 ? 'text-blue-400' : 'text-zinc-500'}`}>
                {coposAgua}<span className="text-zinc-600 text-base font-normal">/8</span>
              </p>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-3">
              <div className="h-full rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${Math.min(100, (coposAgua / 8) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => atualizarAgua(coposAgua - 1)}
                className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white text-xl font-bold active:scale-90 transition-all">−</button>
              <div className="flex-1 grid grid-cols-8 gap-1.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <button key={i} onClick={() => atualizarAgua(i + 1)}
                    className={`h-7 rounded-lg transition-all active:scale-90 ${i < coposAgua ? 'bg-blue-400' : 'bg-white/[0.05] border border-white/[0.08]'}`} />
                ))}
              </div>
              <button onClick={() => atualizarAgua(coposAgua + 1)}
                className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white text-xl font-bold active:scale-90 transition-all">+</button>
            </div>
            <p className="text-zinc-700 text-[10px] text-center mt-3 uppercase tracking-wider">
              {coposAgua >= 8 ? '✓ Hidratação ideal!' : `Faltam ${8 - coposAgua} copo${8 - coposAgua !== 1 ? 's' : ''} para 2L`}
            </p>
          </div>
        </div>

        {/* ── ANÁLISE IA ── */}
        <div className="rounded-2xl border border-emerald-500/20 mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-emerald-400">✦</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Feedback nutricional IA</p>
              <p className="text-zinc-600 text-[10px]">Cruzando com treino, recuperação e objetivo</p>
            </div>
            {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
          </div>
          <div className="px-5 py-4">
            {!analise.gerado && !analise.carregando && (
              <div className="space-y-3">
                <p className="text-zinc-500 text-sm">
                  {jaRegistrou
                    ? 'Seu registro foi salvo. Gere o feedback da IA para análise personalizada.'
                    : 'Registre sua alimentação acima para receber análise personalizada da IA.'}
                </p>
                {jaRegistrou && (
                  <button onClick={gerarAnaliseIA}
                    className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-emerald-500/20 transition-all">
                    ✦ Gerar feedback do dia
                  </button>
                )}
              </div>
            )}
            {analise.carregando && (
              <div className="space-y-2">{[1, 0.85, 0.65].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}</div>
            )}
            {analise.gerado && !analise.carregando && (
              <div>
                <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto}</p>
                <button onClick={gerarAnaliseIA} className="mt-4 text-[10px] text-zinc-600 underline underline-offset-4 hover:text-zinc-400 transition-all">Nova análise</button>
              </div>
            )}
          </div>
        </div>

        {/* ── NUTRICIONISTA ── */}
        <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${vinculoNutri ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/[0.04] text-zinc-500 border-white/[0.08]'}`}>
              NU
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Nutricionista</p>
              {vinculoNutri ? (
                <p className="text-emerald-400 text-xs">{vinculoNutri.nome ?? 'Conectada'}</p>
              ) : (
                <p className="text-zinc-600 text-xs">Sem plano alimentar — registre o essencial acima</p>
              )}
            </div>
            {!vinculoNutri ? (
              <button onClick={() => router.push('/convite')}
                className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0">
                + Conectar
              </button>
            ) : <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
          </div>
          {!vinculoNutri && (
            <p className="text-zinc-700 text-[10px] mt-3 leading-relaxed">
              Com uma nutricionista conectada, você terá acesso ao plano alimentar completo com macros detalhados e acompanhamento personalizado.
            </p>
          )}
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
              <span className={`text-lg transition-all duration-200 ${item.id === 'nutri' ? 'opacity-100' : 'opacity-20'}`}>{item.icon}</span>
              <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-all ${item.id === 'nutri' ? 'text-white' : 'text-zinc-700'}`}>{item.label}</span>
              {item.id === 'nutri' && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}