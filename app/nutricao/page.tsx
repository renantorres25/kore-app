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

type MacrosDia = {
  id?: string
  calorias: number | null
  proteina: number | null
  carboidrato: number | null
  gordura: number | null
  copos_agua: number
}

type Perfil = {
  nome: string | null
  peso: number | null
  altura: number | null
  objetivo: string | null
  nivel: string | null
}

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso',
  ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Melhorar condicionamento',
  saude_geral: 'Saúde geral',
}

function getMetaCalorias(perfil: Perfil): number | null {
  if (!perfil.peso || !perfil.altura) return null
  // TMB Mifflin-St Jeor simplificado
  const tmb = 10 * perfil.peso + 6.25 * perfil.altura - 5 * 25 + 5
  const fator = 1.55 // moderadamente ativo
  const tdee = Math.round(tmb * fator)
  if (perfil.objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (perfil.objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}

function getMetaProteina(perfil: Perfil): number | null {
  if (!perfil.peso) return null
  if (perfil.objetivo === 'ganhar_massa') return Math.round(perfil.peso * 2.2)
  if (perfil.objetivo === 'perder_peso') return Math.round(perfil.peso * 2.0)
  return Math.round(perfil.peso * 1.8)
}

function BarraMacro({ label, valor, meta, cor }: { label: string; valor: number | null; meta: number | null; cor: string }) {
  const pct = valor && meta ? Math.min(100, Math.round((valor / meta) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</p>
        <p className="text-zinc-400 text-[11px]">
          <span className="text-white font-bold">{valor ?? 0}</span>
          {meta && <span className="text-zinc-600">/{meta}g</span>}
        </p>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-zinc-700 text-[9px] mt-1">{pct}% da meta</p>
    </div>
  )
}

export default function Nutricao() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [userId, setUserId] = useState('')
  const [perfil, setPerfil] = useState<Perfil>({ nome: null, peso: null, altura: null, objetivo: null, nivel: null })
  const [macros, setMacros] = useState<MacrosDia>({ calorias: null, proteina: null, carboidrato: null, gordura: null, copos_agua: 0 })
  const [scoreHoje, setScoreHoje] = useState<number | null>(null)
  const [treinouHoje, setTreinouHoje] = useState(false)
  const [vinculoNutri, setVinculoNutri] = useState<{ nome: string | null; email: string } | null>(null)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [analise, setAnalise] = useState({ texto: '', carregando: false, gerado: false })

  // Form
  const [fCalorias, setFCalorias] = useState('')
  const [fProteina, setFProteina] = useState('')
  const [fCarbo, setFCarbo] = useState('')
  const [fGordura, setFGordura] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)

      const hoje = getTodayBR()

      const [{ data: perfilData }, { data: macrosHoje }, { data: sonoHoje }, { data: treinoHoje }, { data: vinculoData }] = await Promise.all([
        supabase.from('perfis').select('nome, peso, altura, objetivo, nivel').eq('id', session.user.id).single(),
        supabase.from('nutricao').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single(),
        supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
        supabase.from('treinos').select('id').eq('cliente_id', session.user.id).eq('concluido', true).eq('data', hoje).limit(1),
        supabase.from('vinculos').select('profissional_id').eq('cliente_id', session.user.id).eq('tipo', 'nutricionista').eq('ativo', true).single(),
      ])

      if (perfilData) setPerfil(perfilData)
      if (sonoHoje?.score_recuperacao) setScoreHoje(sonoHoje.score_recuperacao)
      if (treinoHoje?.length) setTreinouHoje(true)

      if (macrosHoje) {
        setMacros(macrosHoje)
        if (macrosHoje.calorias) setFCalorias(String(macrosHoje.calorias))
        if (macrosHoje.proteina) setFProteina(String(macrosHoje.proteina))
        if (macrosHoje.carboidrato) setFCarbo(String(macrosHoje.carboidrato))
        if (macrosHoje.gordura) setFGordura(String(macrosHoje.gordura))
      } else {
        setEditando(true)
      }

      if (vinculoData) {
        const { data: nutriPerfil } = await supabase.from('perfis').select('nome, email').eq('id', vinculoData.profissional_id).single()
        if (nutriPerfil) setVinculoNutri(nutriPerfil)
      }

      setCarregando(false)
    }
    carregar()
  }, [router])

  async function salvarMacros() {
    setSalvando(true)
    const payload = {
      usuario_id: userId,
      data: getTodayBR(),
      calorias: fCalorias ? parseInt(fCalorias) : null,
      proteina: fProteina ? parseFloat(fProteina) : null,
      carboidrato: fCarbo ? parseFloat(fCarbo) : null,
      gordura: fGordura ? parseFloat(fGordura) : null,
      copos_agua: macros.copos_agua,
    }

    if (macros.id) {
      await supabase.from('nutricao').update(payload).eq('id', macros.id)
    } else {
      const { data } = await supabase.from('nutricao').insert(payload).select('id').single()
      if (data) setMacros(prev => ({ ...prev, id: data.id }))
    }

    setMacros(prev => ({ ...prev, ...payload }))
    setEditando(false)
    setSalvando(false)
  }

  async function atualizarAgua(copos: number) {
    const novosCopos = Math.max(0, Math.min(12, copos))
    setMacros(prev => ({ ...prev, copos_agua: novosCopos }))

    const hoje = getTodayBR()
    if (macros.id) {
      await supabase.from('nutricao').update({ copos_agua: novosCopos }).eq('id', macros.id)
    } else {
      const { data } = await supabase.from('nutricao').insert({
        usuario_id: userId, data: hoje,
        calorias: null, proteina: null, carboidrato: null, gordura: null,
        copos_agua: novosCopos,
      }).select('id').single()
      if (data) setMacros(prev => ({ ...prev, id: data.id, copos_agua: novosCopos }))
    }
  }

  async function gerarAnaliseIA() {
    setAnalise({ texto: '', carregando: true, gerado: false })

    const hora = getHourBR()
    const metaCal = getMetaCalorias(perfil)
    const metaProt = getMetaProteina(perfil)
    const calAtual = macros.calorias ?? 0
    const pctCalorias = metaCal ? Math.round((calAtual / metaCal) * 100) : null

    const prompt = `Você é o nutricionista de IA do KORE, plataforma de performance esportiva. Analise os dados abaixo e gere uma recomendação nutricional personalizada, prática e direta.

PERFIL DO ATLETA:
- Objetivo: ${OBJETIVO_LABEL[perfil.objetivo ?? ''] ?? 'não informado'}
- Peso: ${perfil.peso ? `${perfil.peso}kg` : 'não informado'}
- Altura: ${perfil.altura ? `${perfil.altura}cm` : 'não informado'}
- Nível: ${perfil.nivel ?? 'não informado'}

DADOS DE HOJE:
- Hora atual: ${hora}h
- Score de recuperação: ${scoreHoje ? `${scoreHoje}/100` : 'não registrado'}
- Treinou hoje: ${treinouHoje ? 'Sim' : 'Não'}
- Calorias registradas: ${calAtual}${metaCal ? `/${metaCal} kcal (${pctCalorias}%)` : ' kcal'}
- Proteína: ${macros.proteina ?? 0}g${metaProt ? `/${metaProt}g` : ''}
- Carboidrato: ${macros.carboidrato ?? 0}g
- Gordura: ${macros.gordura ?? 0}g
- Hidratação: ${macros.copos_agua} copos (${macros.copos_agua * 250}ml)

Gere uma análise em 3 partes CURTAS (máx 90 palavras total, sem markdown, sem asteriscos, sem emojis):
1. Balanço do dia: como está a ingestão vs meta considerando treino e recuperação
2. Ponto de atenção: o nutriente ou hábito que mais precisa de ajuste hoje
3. Ação imediata: o que comer ou beber agora (algo concreto e específico)`

    try {
      const res = await fetch('/api/analise-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setAnalise({ texto: data.analise ?? 'Análise não disponível.', carregando: false, gerado: true })
    } catch {
      setAnalise({ texto: 'Não foi possível gerar a análise agora.', carregando: false, gerado: true })
    }
  }

  const metaCal = getMetaCalorias(perfil)
  const metaProt = getMetaProteina(perfil)
  const metaCarbo = perfil.objetivo === 'ganhar_massa' ? 350 : perfil.objetivo === 'perder_peso' ? 150 : 250
  const metaGordura = perfil.objetivo === 'ganhar_massa' ? 80 : 60
  const pctCalorias = macros.calorias && metaCal ? Math.round((macros.calorias / metaCal) * 100) : 0
  const temMacros = macros.calorias || macros.proteina || macros.carboidrato || macros.gordura

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
            <h1 className="text-[1.85rem] font-black tracking-tight text-white">Nutrição</h1>
            <p className="text-zinc-600 text-[11px] mt-1 capitalize">
              {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {temMacros && (
            <button onClick={() => setEditando(!editando)}
              className="text-[10px] text-zinc-400 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider">
              {editando ? 'Cancelar' : 'Editar'}
            </button>
          )}
        </div>

        {/* Contexto do dia */}
        {(scoreHoje || treinouHoje) && (
          <div className="flex gap-2 mb-4">
            {scoreHoje && (
              <div className={`flex-1 rounded-2xl p-3 border text-center ${scoreHoje >= 70 ? 'border-emerald-500/20 bg-emerald-500/5' : scoreHoje >= 50 ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Recuperação</p>
                <p className={`text-xl font-black ${scoreHoje >= 70 ? 'text-emerald-400' : scoreHoje >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{scoreHoje}</p>
                <p className="text-zinc-600 text-[9px]">/100</p>
              </div>
            )}
            {treinouHoje && (
              <div className="flex-1 rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/5 text-center">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Treino</p>
                <p className="text-emerald-400 text-xl font-black">✓</p>
                <p className="text-zinc-600 text-[9px]">Hoje</p>
              </div>
            )}
            {metaCal && (
              <div className="flex-1 rounded-2xl p-3 border border-white/[0.06] bg-white/[0.02] text-center">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Meta</p>
                <p className="text-white text-xl font-black">{metaCal}</p>
                <p className="text-zinc-600 text-[9px]">kcal</p>
              </div>
            )}
          </div>
        )}

        {/* ── Formulário de registro ── */}
        {editando && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Registrar macros de hoje</p>
              {metaCal && <p className="text-zinc-600 text-[11px] mt-0.5">Meta estimada: {metaCal} kcal · {metaProt}g proteína</p>}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Calorias (kcal)', val: fCalorias, set: setFCalorias, placeholder: metaCal ? String(metaCal) : '2000' },
                  { label: 'Proteína (g)', val: fProteina, set: setFProteina, placeholder: metaProt ? String(metaProt) : '150' },
                  { label: 'Carboidrato (g)', val: fCarbo, set: setFCarbo, placeholder: String(metaCarbo) },
                  { label: 'Gordura (g)', val: fGordura, set: setFGordura, placeholder: String(metaGordura) },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-zinc-600 text-[10px] mb-1 block">{f.label}</label>
                    <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:border-white/20 placeholder:text-zinc-700" />
                  </div>
                ))}
              </div>
              <button onClick={salvarMacros} disabled={salvando}
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-40 tracking-wide">
                {salvando ? 'Salvando...' : 'Salvar macros'}
              </button>
            </div>
          </div>
        )}

        {/* ── Calorias hero ── */}
        {temMacros && !editando && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-1">Calorias hoje</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-5xl font-black tabular-nums ${pctCalorias >= 90 ? 'text-emerald-400' : pctCalorias >= 60 ? 'text-yellow-400' : 'text-white'}`}>
                      {(macros.calorias ?? 0).toLocaleString('pt-BR')}
                    </p>
                    {metaCal && <p className="text-zinc-600 text-lg">/{metaCal}</p>}
                  </div>
                  <p className="text-zinc-600 text-xs mt-1">
                    {pctCalorias >= 100 ? 'Meta atingida! 🎯' : pctCalorias >= 80 ? 'Quase lá!' : `${metaCal ? metaCal - (macros.calorias ?? 0) : '—'} kcal restantes`}
                  </p>
                </div>
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={pctCalorias >= 90 ? '#10B981' : pctCalorias >= 60 ? '#FBBF24' : '#6366F1'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${Math.min(100, pctCalorias)} 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-sm font-black">{pctCalorias}%</p>
                  </div>
                </div>
              </div>

              {/* Barras de macro */}
              <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                <BarraMacro label="Proteína" valor={macros.proteina} meta={metaProt} cor="bg-blue-400" />
                <BarraMacro label="Carboidrato" valor={macros.carboidrato} meta={metaCarbo} cor="bg-yellow-400" />
                <BarraMacro label="Gordura" valor={macros.gordura} meta={metaGordura} cor="bg-orange-400" />
              </div>
            </div>
          </div>
        )}

        {/* ── Sem macros registrados ── */}
        {!temMacros && !editando && (
          <div className="rounded-2xl border border-white/[0.06] mb-4 p-8 text-center" style={{ background: '#0f0f0f' }}>
            <p className="text-4xl mb-3">🥗</p>
            <p className="text-white font-bold mb-1">Registre seus macros de hoje</p>
            <p className="text-zinc-600 text-sm mb-4">Calorias, proteína, carbo e gordura — tudo em 30 segundos</p>
            <button onClick={() => setEditando(true)}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-all">
              Registrar agora →
            </button>
          </div>
        )}

        {/* ── Hidratação ── */}
        <div className="rounded-2xl border border-white/[0.06] mb-4 overflow-hidden" style={{ background: '#0f0f0f' }}>
          <div className="px-5 py-4 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Hidratação</p>
                <p className="text-white font-black text-2xl mt-0.5">{macros.copos_agua * 250}ml
                  <span className="text-zinc-600 text-sm font-normal"> / 2000ml</span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-black ${macros.copos_agua >= 8 ? 'text-emerald-400' : macros.copos_agua >= 4 ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {macros.copos_agua}/8
                </p>
                <p className="text-zinc-600 text-[10px]">copos</p>
              </div>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mt-3">
              <div className="h-full rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${Math.min(100, (macros.copos_agua / 8) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => atualizarAgua(macros.copos_agua - 1)}
                className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white text-xl font-bold active:scale-90 transition-all">
                −
              </button>
              <div className="flex-1 grid grid-cols-8 gap-1.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <button key={i} onClick={() => atualizarAgua(i + 1)}
                    className={`h-7 rounded-lg transition-all active:scale-90 ${i < macros.copos_agua ? 'bg-blue-400' : 'bg-white/[0.05] border border-white/[0.08]'}`} />
                ))}
              </div>
              <button onClick={() => atualizarAgua(macros.copos_agua + 1)}
                className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white text-xl font-bold active:scale-90 transition-all">
                +
              </button>
            </div>
            <p className="text-zinc-700 text-[10px] text-center mt-3 uppercase tracking-wider">
              {macros.copos_agua >= 8 ? '✓ Hidratação ideal!' : `Faltam ${8 - macros.copos_agua} copo${8 - macros.copos_agua !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* ── Análise IA ── */}
        <div className="rounded-2xl border border-emerald-500/20 mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #0f0f0f 0%, #0a0a0a 100%)' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-emerald-400">✦</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Recomendação nutricional IA</p>
              <p className="text-zinc-600 text-[10px]">Cruzando recuperação, treino e objetivo</p>
            </div>
            {analise.carregando && <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />}
          </div>
          <div className="px-5 py-4">
            {!analise.gerado && !analise.carregando && (
              <div className="space-y-3">
                <p className="text-zinc-500 text-sm">A IA cruza seu score de recuperação, treino de hoje e objetivo para dar uma recomendação real e personalizada.</p>
                <button onClick={gerarAnaliseIA}
                  className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl text-sm active:scale-95 hover:bg-emerald-500/20 transition-all">
                  ✦ Analisar minha nutrição
                </button>
              </div>
            )}
            {analise.carregando && (
              <div className="space-y-2">
                {[1, 0.85, 0.65].map((w, i) => <div key={i} className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />)}
              </div>
            )}
            {analise.gerado && !analise.carregando && (
              <div>
                <p className="text-zinc-300 text-sm leading-relaxed">{analise.texto}</p>
                <button onClick={gerarAnaliseIA} className="mt-4 text-[10px] text-zinc-600 underline underline-offset-4 hover:text-zinc-400 transition-all">
                  Nova análise
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Nutricionista ── */}
        <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: '#0f0f0f' }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 ${vinculoNutri ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/[0.04] text-zinc-500 border-white/[0.08]'}`}>
              NU
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Nutricionista</p>
              {vinculoNutri ? (
                <p className="text-emerald-400 text-xs">{vinculoNutri.nome ?? vinculoNutri.email}</p>
              ) : (
                <p className="text-zinc-600 text-xs">Não conectada — macros são estimativas</p>
              )}
            </div>
            {!vinculoNutri && (
              <button onClick={() => router.push('/convite')}
                className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider shrink-0">
                + Conectar
              </button>
            )}
            {vinculoNutri && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
          </div>
        </div>

      </div>

      {/* ── Bottom Nav ── */}
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
            <button key={item.id} onClick={() => item.path && router.push(item.path)}
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