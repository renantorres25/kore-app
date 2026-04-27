'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import QuizIA, { RespostasQuiz } from '../components/QuizIA'

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function getHourBR(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }), 10)
}

type Perfil = { nome: string | null; peso: number | null; objetivo: string | null }
type Alimento = { nome: string; quantidade: string; calorias: number; proteina: number; carboidrato?: number; gordura?: number }
type Refeicao = { nome: string; horario: string; calorias: number; proteina: number; alimentos: Alimento[]; dica?: string }
type PlanoEstruturado = { refeicoes: Refeicao[]; estrategia_desafio: string; dica_fome: string; orientacao_treino: string }
type PlanoNutricional = { id: string; conteudo: string; calorias_meta: number | null; proteina_meta: number | null; refeicoes_por_dia: number | null; created_at: string }

const QUALIDADE_OPCOES = [
  { valor: 1, label: 'Ruim',    emoji: '😞', cor: 'border-red-500/40 bg-red-500/10 text-red-400' },
  { valor: 2, label: 'Regular', emoji: '😐', cor: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
  { valor: 3, label: 'Boa',     emoji: '🙂', cor: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  { valor: 4, label: 'Ótima',   emoji: '💪', cor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
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
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

const ICONE_REFEICAO: Record<string, string> = {
  'café': '☀️', 'manhã': '☀️', 'almoço': '🍽️', 'lanche': '🍎',
  'pré': '⚡', 'pós': '💪', 'jantar': '🌙', 'ceia': '🌙',
}
function getIconeRefeicao(nome: string): string {
  const lower = nome.toLowerCase()
  const key = Object.keys(ICONE_REFEICAO).find(k => lower.includes(k))
  return key ? ICONE_REFEICAO[key] : '🥗'
}

// ─── NAV ICONS ────────────────────────────────────────────────────────────────

function IconHome({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
}
function IconTreino({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h1M16.5 6.5h1M6.5 17.5h1M16.5 17.5h1" /><path d="M7.5 6.5v11M17.5 6.5v11" /><path d="M7.5 12h9" /><path d="M3 10.5v3M21 10.5v3" /></svg>
}
function IconNutricao({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 6.5 7 8 7 13c0 4 2.5 6.5 5 6.5s5-2.5 5-6.5c0-5-3-6.5-5-6.5z" /><path d="M12 6.5V4M12 4c0 0 1.5-1 3-1.5" /></svg>
}
function IconEvolucao({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
}
function IconPerfil({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
}

const NAV_ITEMS = [
  { id: 'home',     label: 'Início',   Icon: IconHome,     path: '/dashboard' },
  { id: 'treino',   label: 'Treino',   Icon: IconTreino,   path: '/treino'    },
  { id: 'nutri',    label: 'Nutrição', Icon: IconNutricao, path: '/nutricao'  },
  { id: 'evolucao', label: 'Evolução', Icon: IconEvolucao, path: '/evolucao'  },
  { id: 'perfil',   label: 'Perfil',   Icon: IconPerfil,   path: '/perfil'    },
]

// ─── ABA PLANO ────────────────────────────────────────────────────────────────

function AbaPlano({
  plano, gerandoPlano, vinculoNutri, onIniciarConsulta,
}: {
  plano: PlanoNutricional | null
  gerandoPlano: boolean
  vinculoNutri: { nome: string | null } | null
  onIniciarConsulta: () => void
}) {
  const [refeicaoAberta, setRefeicaoAberta] = useState<number | null>(0)
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null)

  let estruturado: PlanoEstruturado | null = null
  if (plano) {
    try {
      const parsed = JSON.parse(plano.conteudo)
      if (parsed.refeicoes) estruturado = parsed
    } catch { /* legado */ }
  }

  // Sem nutricionista e sem plano
  if (!vinculoNutri && !plano && !gerandoPlano) {
    return (
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-blue-500/20 p-6 text-center" style={{ background: 'linear-gradient(145deg, #0a0d14, #080a10)' }}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🥗</span>
          </div>
          <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Nutricionista virtual · IA</p>
          <p className="text-white font-black text-xl mb-2">Crie seu plano alimentar</p>
          <p className="text-zinc-500 text-sm leading-relaxed mb-6">
            Responda uma consulta rápida e a IA monta um plano completo com refeições detalhadas, gramas, calorias e proteínas por alimento — salvo permanentemente aqui.
          </p>
          <button onClick={onIniciarConsulta}
            className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
            ✦ Iniciar consulta nutricional →
          </button>
        </div>
      </div>
    )
  }

  // Gerando plano
  if (gerandoPlano) {
    return (
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-blue-500/20 p-6" style={{ background: '#0a0d14' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-semibold">Montando seu plano</p>
              <p className="text-white font-bold">A IA está trabalhando...</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { msg: 'Calculando distribuição calórica', done: true },
              { msg: 'Selecionando alimentos com quantidades', done: true },
              { msg: 'Calculando macros por refeição', done: false },
              { msg: 'Criando estratégias personalizadas', done: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {s.done
                  ? <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0"><span className="text-blue-400 text-[10px]">✓</span></div>
                  : <div className="w-5 h-5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin shrink-0" />
                }
                <p className={`text-sm ${s.done ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.msg}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Plano existente
  if (plano) {
    const dataCriacao = new Date(plano.created_at).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
      <div className="pb-4">
        {/* Header do plano */}
        <div className="px-4 pt-4 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-semibold">Plano alimentar · IA</p>
              <p className="text-zinc-600 text-[10px]">Criado em {dataCriacao}</p>
            </div>
            <button onClick={onIniciarConsulta}
              className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/20 hover:text-zinc-300 transition-all active:scale-95">
              ↻ Refazer
            </button>
          </div>
        </div>

        {/* Resumo de metas */}
        <div className="mx-4 rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
          <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
            {[
              { label: 'Calorias', val: `${plano.calorias_meta ?? '—'}`, unit: 'kcal/dia', cor: 'text-orange-400' },
              { label: 'Proteína', val: plano.proteina_meta ? `${plano.proteina_meta}g` : '—', unit: 'por dia', cor: 'text-blue-400' },
              { label: 'Refeições', val: `${plano.refeicoes_por_dia ?? '—'}`, unit: 'por dia', cor: 'text-emerald-400' },
            ].map((m, i) => (
              <div key={i} className="p-3 text-center">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-base font-black ${m.cor}`}>{m.val}</p>
                <p className="text-zinc-700 text-[9px]">{m.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Refeições */}
        {estruturado ? (
          <div className="px-4 space-y-3">
            {estruturado.refeicoes.map((ref, i) => {
              const aberta = refeicaoAberta === i
              const totalCal = ref.alimentos.reduce((s, a) => s + a.calorias, 0)
              const totalProt = ref.alimentos.reduce((s, a) => s + a.proteina, 0)

              return (
                <div key={i} className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                  {/* Header da refeição */}
                  <button onClick={() => setRefeicaoAberta(aberta ? null : i)}
                    className="w-full flex items-center gap-3 p-4 active:bg-white/[0.02] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 text-xl">
                      {getIconeRefeicao(ref.nome)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm">{ref.nome}</p>
                        <span className="text-zinc-600 text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded-md">{ref.horario}</span>
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-orange-400 text-[11px] font-semibold">{totalCal} kcal</span>
                        <span className="text-blue-400 text-[11px]">{totalProt}g prot</span>
                      </div>
                    </div>
                    <span className={`text-zinc-600 text-xs transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {/* Alimentos */}
                  {aberta && (
                    <div className="border-t border-white/[0.04]">
                      {/* Cabeçalho da tabela */}
                      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2 bg-white/[0.02]">
                        <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimento · Quantidade</span>
                        <span className="text-zinc-600 text-[9px] uppercase tracking-wider text-right">Kcal · Prot</span>
                      </div>

                      {/* Lista de alimentos */}
                      <div className="divide-y divide-white/[0.04]">
                        {ref.alimentos.map((al, j) => (
                          <div key={j} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 items-center">
                            <div>
                              <p className="text-zinc-200 text-sm font-medium leading-tight">{al.nome}</p>
                              <p className="text-zinc-500 text-[11px] mt-0.5">{al.quantidade}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-orange-400 text-[12px] font-bold">{al.calorias}</p>
                              <p className="text-blue-400 text-[10px]">{al.proteina}g</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total da refeição */}
                      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                        <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Total da refeição</span>
                        <div className="text-right">
                          <span className="text-orange-400 text-[12px] font-black">{totalCal} kcal</span>
                          <span className="text-zinc-600 text-[11px]"> · </span>
                          <span className="text-blue-400 text-[12px] font-bold">{totalProt}g prot</span>
                        </div>
                      </div>

                      {/* Dica */}
                      {ref.dica && (
                        <div className="mx-4 mb-3 mt-1 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2.5">
                          <p className="text-emerald-400 text-[9px] uppercase tracking-wider mb-1">💡 Dica</p>
                          <p className="text-zinc-400 text-[11px] leading-relaxed">{ref.dica}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Resumo total do dia */}
            <div className="rounded-2xl border border-white/[0.06] p-4" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-3">Totais do dia</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Calorias', val: estruturado.refeicoes.reduce((s, r) => s + r.alimentos.reduce((ss, a) => ss + a.calorias, 0), 0), unit: 'kcal', cor: 'text-orange-400', meta: plano.calorias_meta },
                  { label: 'Proteína', val: estruturado.refeicoes.reduce((s, r) => s + r.alimentos.reduce((ss, a) => ss + a.proteina, 0), 0), unit: 'g', cor: 'text-blue-400', meta: plano.proteina_meta },
                  { label: 'Refeições', val: estruturado.refeicoes.length, unit: 'total', cor: 'text-emerald-400', meta: null },
                ].map((t, i) => {
                  const pct = t.meta ? Math.min(100, Math.round((t.val / t.meta) * 100)) : null
                  return (
                    <div key={i} className="text-center">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">{t.label}</p>
                      <p className={`text-lg font-black ${t.cor}`}>{t.val}<span className="text-zinc-600 text-[10px] font-normal"> {t.unit}</span></p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-400' : t.cor.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Estratégias */}
            {[
              { key: 'orientacao_treino', label: '⚡ Pré e Pós-treino', cor: 'border-emerald-500/20 bg-emerald-500/5', textCor: 'text-emerald-400', val: estruturado.orientacao_treino },
              { key: 'estrategia_desafio', label: '🎯 Estratégia para seu desafio', cor: 'border-orange-500/20 bg-orange-500/5', textCor: 'text-orange-400', val: estruturado.estrategia_desafio },
              { key: 'dica_fome', label: '💡 Controle de fome', cor: 'border-blue-500/20 bg-blue-500/5', textCor: 'text-blue-400', val: estruturado.dica_fome },
            ].map((s) => (
              <div key={s.key}>
                <button
                  onClick={() => setSecaoAberta(secaoAberta === s.key ? null : s.key)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${s.cor}`}
                >
                  <span className={`text-sm font-bold ${s.textCor}`}>{s.label}</span>
                  <span className={`text-zinc-500 text-xs transition-transform ${secaoAberta === s.key ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {secaoAberta === s.key && (
                  <div className={`mt-1 px-4 py-3.5 rounded-2xl border ${s.cor}`}>
                    <p className="text-zinc-300 text-sm leading-relaxed">{s.val}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Plano legado em texto
          <div className="mx-4 rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{plano.conteudo}</p>
            <button onClick={onIniciarConsulta} className="mt-4 w-full bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-all">
              ✦ Gerar novo plano detalhado →
            </button>
          </div>
        )}
      </div>
    )
  }

  // Com nutricionista
  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl border border-emerald-500/20 p-5" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xs font-black text-green-400 shrink-0">NU</div>
          <div>
            <p className="text-white font-bold">{vinculoNutri?.nome ?? 'Nutricionista'}</p>
            <p className="text-emerald-400 text-xs">Plano profissional ativo</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ABA HOJE ─────────────────────────────────────────────────────────────────

function AbaHoje({
  perfil, scoreHoje, treinouHoje, planoAtivo, vinculoNutri, userId,
  registroId, setRegistroId, qualidade, setQualidade,
  calorias, setCalorias, proteina, setProteina,
  coposAgua, setCoposAgua, observacoes, setObservacoes,
  jaRegistrou, setJaRegistrou,
}: {
  perfil: Perfil; scoreHoje: number | null; treinouHoje: boolean
  planoAtivo: PlanoNutricional | null; vinculoNutri: { nome: string | null } | null
  userId: string; registroId: string | null; setRegistroId: (v: string | null) => void
  qualidade: number | null; setQualidade: (v: number | null) => void
  calorias: string; setCalorias: (v: string) => void
  proteina: string; setProteina: (v: string) => void
  coposAgua: number; setCoposAgua: (v: number) => void
  observacoes: string; setObservacoes: (v: string) => void
  jaRegistrou: boolean; setJaRegistrou: (v: boolean) => void
}) {
  const [salvando, setSalvando] = useState(false)
  const [analise, setAnalise] = useState({ texto: '', carregando: false, gerado: false })

  const metaCal = getMetaCalorias(perfil.peso, perfil.objetivo)
  const metaProt = getMetaProteina(perfil.peso, perfil.objetivo)
  const pctCal = calorias && metaCal ? Math.min(100, Math.round((parseInt(calorias) / metaCal) * 100)) : 0
  const pctProt = proteina && metaProt ? Math.min(100, Math.round((parseFloat(proteina) / metaProt) * 100)) : 0

  async function salvarRegistro() {
    if (!qualidade) return
    setSalvando(true)
    const payload = {
      usuario_id: userId, data: getTodayBR(),
      qualidade_alimentacao: qualidade,
      calorias: calorias ? parseInt(calorias) : null,
      proteina: proteina ? parseFloat(proteina) : null,
      carboidrato: null, gordura: null, copos_agua: coposAgua,
    }
    if (registroId) {
      await supabase.from('nutricao').update(payload).eq('id', registroId)
    } else {
      const { data } = await supabase.from('nutricao').insert(payload).select('id').single()
      if (data) setRegistroId(data.id)
    }
    setJaRegistrou(true); setSalvando(false); gerarAnalise()
  }

  async function gerarAnalise() {
    setAnalise({ texto: '', carregando: true, gerado: false })
    const hora = getHourBR()
    const qualLabel = QUALIDADE_OPCOES.find(q => q.valor === qualidade)?.label ?? '?'
    const prompt = `Coach de nutrição KORE. Feedback direto e personalizado.

CONTEXTO: ${perfil.nome ?? 'Atleta'} | Objetivo: ${OBJETIVO_LABEL[perfil.objetivo ?? ''] ?? '?'} | Peso: ${perfil.peso ?? '?'}kg | Meta: ${metaCal ?? '?'}kcal / ${metaProt ?? '?'}g prot${planoAtivo ? ' | Tem plano ativo' : ''}

HOJE (${hora}h): Qualidade ${qualLabel} | ${calorias ? `${calorias}kcal` : 'calorias não registradas'} | ${proteina ? `${proteina}g proteína` : 'proteína não registrada'} | Água ${coposAgua}/8 | Treino: ${treinouHoje ? 'sim' : 'não'} | Recuperação: ${scoreHoje ?? '?'}/100${observacoes ? ` | Obs: ${observacoes}` : ''}

Feedback em 3 blocos curtos, máx 80 palavras no total, sem markdown:
Balanço: o que os dados mostram hoje
Atenção: principal ponto a melhorar
Amanhã: ação concreta e específica${planoAtivo ? ' referenciando o plano quando relevante' : ''}`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? '', carregando: false, gerado: true })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar análise.', carregando: false, gerado: true })
    }
  }

  async function atualizarAgua(copos: number) {
    const novos = Math.max(0, Math.min(12, copos))
    setCoposAgua(novos)
    const hoje = getTodayBR()
    if (registroId) {
      await supabase.from('nutricao').update({ copos_agua: novos }).eq('id', registroId)
    } else {
      const { data } = await supabase.from('nutricao').insert({ usuario_id: userId, data: hoje, copos_agua: novos }).select('id').single()
      if (data) setRegistroId(data.id)
    }
  }

  return (
    <div className="px-4 pt-4 space-y-4 pb-4">

      {/* Stats contexto */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Recuperação', val: scoreHoje ?? '—', sub: '/100', cor: scoreHoje ? scoreHoje >= 70 ? 'text-emerald-400' : 'text-yellow-400' : 'text-zinc-600', bg: scoreHoje ? scoreHoje >= 70 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/[0.06]' },
          { label: 'Treino', val: treinouHoje ? '✓' : '—', sub: 'hoje', cor: treinouHoje ? 'text-emerald-400' : 'text-zinc-600', bg: treinouHoje ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.06]' },
          { label: 'Meta', val: metaCal ? `${Math.round(metaCal/100)/10}k` : '—', sub: 'kcal', cor: 'text-white', bg: 'border-white/[0.06]' },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl p-3 border text-center ${s.bg}`}>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.cor}`}>{s.val}</p>
            <p className="text-zinc-700 text-[9px]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Registro */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
        <div className="px-5 pt-4 pb-3 border-b border-white/[0.04]">
          <p className="text-white font-bold text-sm">Como foi hoje?</p>
          <p className="text-zinc-600 text-[11px]">Avalie e registre em 30 segundos</p>
        </div>
        <div className="p-5 space-y-4">

          {/* Qualidade */}
          <div className="grid grid-cols-4 gap-2">
            {QUALIDADE_OPCOES.map(op => (
              <button key={op.valor} onClick={() => setQualidade(op.valor)}
                className={`flex flex-col items-center py-3 rounded-2xl border transition-all active:scale-95 ${qualidade === op.valor ? op.cor : 'border-white/[0.06] bg-white/[0.02] text-zinc-500'}`}>
                <span className="text-2xl mb-1">{op.emoji}</span>
                <span className="text-[10px] font-bold">{op.label}</span>
              </button>
            ))}
          </div>

          {/* Calorias + Proteína */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-zinc-500 text-[10px] uppercase tracking-wider">Calorias</label>
                {metaCal && <span className="text-zinc-700 text-[9px]">meta {metaCal}</span>}
              </div>
              <div className="relative">
                <input type="number" placeholder="0" value={calorias} onChange={e => setCalorias(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-sm text-center font-bold focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">kcal</span>
              </div>
              {calorias && metaCal && (
                <div className="mt-1.5">
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pctCal >= 100 ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{ width: `${pctCal}%` }} />
                  </div>
                  <p className="text-zinc-700 text-[9px] text-center mt-1">{pctCal}%</p>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-zinc-500 text-[10px] uppercase tracking-wider">Proteína</label>
                {metaProt && <span className="text-zinc-700 text-[9px]">meta {metaProt}g</span>}
              </div>
              <div className="relative">
                <input type="number" placeholder="0" value={proteina} onChange={e => setProteina(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-sm text-center font-bold focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">g</span>
              </div>
              {proteina && metaProt && (
                <div className="mt-1.5">
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pctProt >= 100 ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${pctProt}%` }} />
                  </div>
                  <p className="text-zinc-700 text-[9px] text-center mt-1">{pctProt}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <textarea placeholder="Como foi? Algo que dificultou, algo que ajudou... (opcional)" value={observacoes}
            onChange={e => setObservacoes(e.target.value)} rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-zinc-700 resize-none" />

          <button onClick={salvarRegistro} disabled={!qualidade || salvando}
            className={`w-full font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all ${jaRegistrou ? 'bg-white/[0.06] border border-white/[0.10] text-zinc-300' : 'bg-white text-black'}`}>
            {salvando ? 'Salvando...' : jaRegistrou ? '✓ Registrado — atualizar' : 'Registrar →'}
          </button>
        </div>
      </div>

      {/* Hidratação */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-bold text-sm">Hidratação</p>
              <p className="text-zinc-600 text-[11px]">{coposAgua * 250}ml de 2000ml</p>
            </div>
            <p className={`text-2xl font-black ${coposAgua >= 8 ? 'text-emerald-400' : coposAgua >= 4 ? 'text-blue-400' : 'text-zinc-500'}`}>
              {coposAgua}<span className="text-zinc-600 text-sm font-normal">/8</span>
            </p>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${Math.min(100, (coposAgua / 8) * 100)}%` }} />
          </div>
        </div>
        <div className="p-4 flex items-center gap-2">
          <button onClick={() => atualizarAgua(coposAgua - 1)} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white text-lg font-bold active:scale-90 transition-all shrink-0">−</button>
          <div className="flex-1 grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} onClick={() => atualizarAgua(i + 1)}
                className={`h-7 rounded-lg transition-all active:scale-90 ${i < coposAgua ? 'bg-blue-400' : 'bg-white/[0.05] border border-white/[0.08]'}`} />
            ))}
          </div>
          <button onClick={() => atualizarAgua(coposAgua + 1)} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white text-lg font-bold active:scale-90 transition-all shrink-0">+</button>
        </div>
      </div>

      {/* Feedback IA */}
      <div className="rounded-2xl border border-emerald-500/20 overflow-hidden" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black text-emerald-400">✦</span>
          </div>
          <div className="flex-1">
            <p className="text-emerald-400 text-[10px] uppercase tracking-[0.2em] font-semibold">Feedback do dia · IA</p>
            <p className="text-zinc-600 text-[10px]">Cruza treino, sono, recuperação e plano</p>
          </div>
          {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="px-5 py-4">
          {!analise.gerado && !analise.carregando && (
            <div className="space-y-3">
              <p className="text-zinc-500 text-sm">{jaRegistrou ? 'Registro salvo. Gere o feedback personalizado.' : 'Registre sua alimentação acima primeiro.'}</p>
              {jaRegistrou && (
                <button onClick={gerarAnalise} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm active:scale-95 transition-all">
                  ✦ Gerar feedback do dia
                </button>
              )}
            </div>
          )}
          {analise.carregando && <div className="space-y-2">{[1, 0.8, 0.6].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}</div>}
          {analise.gerado && !analise.carregando && (
            <div>
              <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto}</p>
              <button onClick={gerarAnalise} className="mt-3 text-[10px] text-zinc-600 underline underline-offset-4 hover:text-zinc-400 transition-all">Nova análise</button>
            </div>
          )}
        </div>
      </div>

      {/* Nutricionista */}
      <div className="rounded-2xl border border-white/[0.06] p-4" style={{ background: '#0f0f0f' }}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${vinculoNutri ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/[0.04] text-zinc-500 border-white/[0.08]'}`}>NU</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Nutricionista</p>
            <p className="text-zinc-600 text-xs">{vinculoNutri ? vinculoNutri.nome ?? 'Conectada' : 'Conecte para plano profissional'}</p>
          </div>
          {!vinculoNutri && (
            <button className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 uppercase tracking-wider shrink-0">+ Conectar</button>
          )}
          {vinculoNutri && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────

export default function Nutricao() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [userId, setUserId] = useState('')
  const [perfil, setPerfil] = useState<Perfil>({ nome: null, peso: null, objetivo: null })
  const [scoreHoje, setScoreHoje] = useState<number | null>(null)
  const [treinouHoje, setTreinouHoje] = useState(false)
  const [registroId, setRegistroId] = useState<string | null>(null)
  const [vinculoNutri, setVinculoNutri] = useState<{ nome: string | null } | null>(null)
  const [mostrarQuiz, setMostrarQuiz] = useState(false)
  const [gerandoPlano, setGerandoPlano] = useState(false)
  const [planoAtivo, setPlanoAtivo] = useState<PlanoNutricional | null>(null)
  const [aba, setAba] = useState<'plano' | 'hoje'>('hoje')

  const [qualidade, setQualidade] = useState<number | null>(null)
  const [calorias, setCalorias] = useState('')
  const [proteina, setProteina] = useState('')
  const [coposAgua, setCoposAgua] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [jaRegistrou, setJaRegistrou] = useState(false)

  const hora = getHourBR()
  const isManha = hora < 12
  const isTarde = hora >= 12 && hora < 18

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUserId(session.user.id)

    const hoje = getTodayBR()
    const [
      { data: perfilData }, { data: sonoHoje }, { data: treinoHoje },
      { data: atividadeHoje }, { data: registroHoje }, { data: vinculo }, { data: planoData },
    ] = await Promise.all([
      supabase.from('perfis').select('nome, peso, objetivo').eq('id', session.user.id).single(),
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('treinos').select('id').eq('cliente_id', session.user.id).eq('concluido', true).eq('data', hoje).limit(1),
      supabase.from('atividades_livres').select('id').eq('usuario_id', session.user.id).eq('data', hoje).limit(1),
      supabase.from('nutricao').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('vinculos').select('profissional_id').eq('cliente_id', session.user.id).eq('tipo', 'nutricionista').eq('ativo', true).single(),
      supabase.from('planos_nutricionais').select('*').eq('usuario_id', session.user.id).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
    ])

    if (perfilData) setPerfil(perfilData)
    if (sonoHoje?.score_recuperacao) setScoreHoje(sonoHoje.score_recuperacao)
    if ((treinoHoje && treinoHoje.length > 0) || (atividadeHoje && atividadeHoje.length > 0)) setTreinouHoje(true)
    if (planoData) { setPlanoAtivo(planoData); setAba('plano') }

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
      const { data: np } = await supabase.from('perfis').select('nome').eq('id', vinculo.profissional_id).single()
      if (np) setVinculoNutri(np)
    }

    setCarregando(false)
  }

  async function gerarPlanoNutricional(respostas: RespostasQuiz) {
    setMostrarQuiz(false)
    setGerandoPlano(true)
    setAba('plano')

    const metaCal = getMetaCalorias(perfil.peso, perfil.objetivo)
    const metaProt = getMetaProteina(perfil.peso, perfil.objetivo)
    const restricoesArr = Array.isArray(respostas.restricoes) ? respostas.restricoes.join(', ') : respostas.restricoes
    const refeicoesPorDia = respostas.refeicoes_dia === '1-2' ? 2 : respostas.refeicoes_dia === '3' ? 3 : respostas.refeicoes_dia === '4-5' ? 4 : 5

    const HORARIO_LABEL: Record<string, string> = { jejum_manha: 'Manhã em jejum', manha: 'Manhã com café (antes 9h)', almoco: 'Almoço (12h-14h)', tarde: 'Tarde (14h-18h)', noite: 'Noite (após 18h)', nao_treina: 'Não treina regularmente' }
    const ONDE_LABEL: Record<string, string> = { casa: 'Em casa — cozinha própria', casa_pronto: 'Em casa — comida pronta/delivery', trabalho_rua: 'No trabalho ou restaurante', misto: 'Mistura de ambientes' }
    const ROTINA_LABEL: Record<string, string> = { home_office: 'Home office', presencial_fixo: 'Presencial horário fixo', presencial_var: 'Presencial horários variáveis', fisico: 'Trabalho físico', nao_trabalha: 'Estudante / não trabalha' }
    const DESAFIO_LABEL: Record<string, string> = { fome_ansiosa: 'Fome excessiva e compulsão', consistencia: 'Falta de consistência', tempo: 'Falta de tempo', proteina: 'Baixo consumo de proteína', noite: 'Come muito à noite', social: 'Situações sociais' }

    const prompt = `Você é uma nutricionista especialista com anos de experiência clínica. Crie um plano alimentar diário DETALHADO e profissional.

PERFIL:
- Nome: ${perfil.nome ?? 'Atleta'}
- Objetivo: ${OBJETIVO_LABEL[perfil.objetivo ?? ''] ?? 'Saúde geral'}
- Peso: ${perfil.peso ? `${perfil.peso}kg` : 'não informado'}
- Meta calórica: ${metaCal ? `${metaCal}kcal/dia` : 'calcule baseado no perfil'}
- Meta proteína: ${metaProt ? `${metaProt}g/dia` : 'calcule baseado no perfil'}

ROTINA:
- Refeições: ${refeicoesPorDia} por dia
- Come em: ${ONDE_LABEL[respostas.onde_come as string] ?? respostas.onde_come}
- Treina: ${HORARIO_LABEL[respostas.horario_treino_nutri as string] ?? respostas.horario_treino_nutri}
- Desafio: ${DESAFIO_LABEL[respostas.desafio as string] ?? respostas.desafio}
- Restrições: ${restricoesArr}
- Trabalho: ${ROTINA_LABEL[respostas.rotina_trabalho as string] ?? respostas.rotina_trabalho}
- Álcool: ${respostas.alcool}
- Maior fome: ${respostas.fome_horario}

REGRAS OBRIGATÓRIAS:
1. Crie EXATAMENTE ${refeicoesPorDia} refeições
2. Cada alimento DEVE ter quantidade precisa em gramas (ex: "150g") ou unidades (ex: "2 unidades (100g)")
3. Calorias e proteína de CADA alimento individualmente — seja preciso
4. A soma total de calorias deve ser próxima a ${metaCal ?? 2000}kcal
5. A soma total de proteína deve ser próxima a ${metaProt ?? 120}g
6. Adapte os alimentos ao local de refeição informado
7. Respeite TODAS as restrições alimentares

Responda APENAS JSON válido:

{
  "refeicoes": [
    {
      "nome": "Café da Manhã",
      "horario": "07:00",
      "calorias": 480,
      "proteina": 32,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "3 unidades (150g)", "calorias": 215, "proteina": 19, "carboidrato": 1, "gordura": 15 },
        { "nome": "Pão integral", "quantidade": "2 fatias (60g)", "calorias": 156, "proteina": 6, "carboidrato": 28, "gordura": 2 },
        { "nome": "Queijo cottage", "quantidade": "3 colheres sopa (75g)", "calorias": 65, "proteina": 10, "carboidrato": 3, "gordura": 1 },
        { "nome": "Mamão formosa", "quantidade": "1 fatia média (150g)", "calorias": 54, "proteina": 1, "carboidrato": 14, "gordura": 0 }
      ],
      "dica": "Prepare os ovos mexidos com pouco azeite. O cottage substitui a manteiga e adiciona proteína."
    }
  ],
  "orientacao_treino": "Orientação detalhada de pré e pós-treino com alimentos e quantidades específicas",
  "estrategia_desafio": "Estratégia detalhada e prática para o desafio principal, com ações concretas",
  "dica_fome": "Dica específica para o período de maior fome com opções de alimentos"
}`

    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      const texto = data.analise ?? ''
      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const planoJSON = JSON.parse(jsonMatch[0])
      const conteudo = JSON.stringify(planoJSON)

      await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', userId).eq('ativo', true)
      const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
        usuario_id: userId, criado_por: 'ia', conteudo,
        calorias_meta: metaCal, proteina_meta: metaProt, refeicoes_por_dia: refeicoesPorDia, ativo: true,
      }).select('*').single()

      if (novoPlano) setPlanoAtivo(novoPlano)
    } catch (e) {
      console.error('Erro ao gerar plano:', e)
    } finally {
      setGerandoPlano(false)
    }
  }

  if (mostrarQuiz) return <QuizIA tipo="nutricao" onConcluir={gerarPlanoNutricional} onCancelar={() => setMostrarQuiz(false)} />

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">

      {/* Header fixo */}
      <div className="shrink-0 px-4" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))', background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-md mx-auto">

          {/* Título + badge hora */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
              <h1 className="text-[1.85rem] font-black tracking-tight text-white leading-none">Nutrição</h1>
              <p className="text-zinc-600 text-[11px] mt-1 capitalize">
                {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className={`mt-1 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${isManha ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : isTarde ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
              {isManha ? '☀️ Manhã' : isTarde ? '🌤 Tarde' : '🌙 Noite'}
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {[
              { id: 'plano' as const, label: '📋 Meu Plano', hasPlano: !!planoAtivo || !!vinculoNutri },
              { id: 'hoje' as const, label: '📝 Hoje', hasPlano: false },
            ].map((a) => (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 relative ${
                  aba === a.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {a.label}
                {a.id === 'hoje' && jaRegistrou && aba !== 'hoje' && (
                  <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto">
          {aba === 'plano' && (
            <AbaPlano
              plano={planoAtivo}
              gerandoPlano={gerandoPlano}
              vinculoNutri={vinculoNutri}
              onIniciarConsulta={() => setMostrarQuiz(true)}
            />
          )}
          {aba === 'hoje' && (
            <AbaHoje
              perfil={perfil} scoreHoje={scoreHoje} treinouHoje={treinouHoje}
              planoAtivo={planoAtivo} vinculoNutri={vinculoNutri} userId={userId}
              registroId={registroId} setRegistroId={setRegistroId}
              qualidade={qualidade} setQualidade={setQualidade}
              calorias={calorias} setCalorias={setCalorias}
              proteina={proteina} setProteina={setProteina}
              coposAgua={coposAgua} setCoposAgua={setCoposAgua}
              observacoes={observacoes} setObservacoes={setObservacoes}
              jaRegistrou={jaRegistrou} setJaRegistrou={setJaRegistrou}
            />
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-2">
          {NAV_ITEMS.map((item) => {
            const active = item.id === 'nutri'
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-150 active:scale-90">
                <span className={`transition-all duration-200 ${active ? 'text-emerald-400' : 'text-zinc-600'}`}><item.Icon active={active} /></span>
                <span className={`text-[9px] tracking-[0.1em] uppercase font-semibold transition-all ${active ? 'text-emerald-400' : 'text-zinc-700'}`}>{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}