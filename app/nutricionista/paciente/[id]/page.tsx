'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type Paciente = {
  id: string; nome: string | null; email: string
  peso: number | null; objetivo: string | null
}
type TreinoDia = { data: string; calorias_estimadas: number | null; plano: string | null }
type Sono = { score_recuperacao: number | null; duracao: number | null }
type BemEstar = { humor: number; energia: number; motivacao: number }
type PlanoNutricional = {
  id: string; conteudo: string; calorias_meta: number | null
  proteina_meta: number | null; created_at: string
}
type AlimentoEd = { nome: string; quantidade: string; calorias: string; proteina: string }
type RefeicaoEd = { nome: string; horario: string; dica: string; alimentos: AlimentoEd[] }
type ExtrasEd = {
  hidratacaoLitros: string; hidratacaoOri: string
  oriTreino: string; estrategia: string; dicaFome: string
}

const REFEICAO_VAZIA: RefeicaoEd = {
  nome: '', horario: '', dica: '',
  alimentos: [{ nome: '', quantidade: '', calorias: '', proteina: '' }],
}
const EXTRAS_VAZIO: ExtrasEd = { hidratacaoLitros: '', hidratacaoOri: '', oriTreino: '', estrategia: '', dicaFome: '' }

function getTodayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function getMetaCalorias(peso: number | null, objetivo: string | null) {
  if (!peso) return null
  const tdee = Math.round((10 * peso + 6.25 * 170 - 5 * 25 + 5) * 1.55)
  if (objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}
function getMetaProteina(peso: number | null, objetivo: string | null) {
  if (!peso) return null
  if (objetivo === 'ganhar_massa') return Math.round(peso * 2.2)
  if (objetivo === 'perder_peso') return Math.round(peso * 2.0)
  return Math.round(peso * 1.8)
}
function getInitials(nome: string | null, email: string) {
  if (nome) { const p = nome.trim().split(' '); return (p.length >= 2 ? p[0][0] + p[p.length-1][0] : p[0][0]).toUpperCase() }
  return email[0].toUpperCase()
}
const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}
function getDias7d(hoje: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje + 'T12:00:00-03:00'); d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  })
}
function sumAl(als: AlimentoEd[], field: 'calorias' | 'proteina') {
  return Math.round(als.reduce((s, a) => s + (parseFloat(a[field]) || 0), 0))
}

const NAV = [
  { id: 'home', label: 'Início', path: '/dashboard' },
  { id: 'pacientes', label: 'Pacientes', path: '/nutricionista/pacientes' },
  { id: 'agenda', label: 'Agenda', path: '/agenda' },
  { id: 'perfil', label: 'Perfil', path: '/perfil' },
]
const EMOJIS_REFEICAO = ['☀️','🍎','🍽️','⚡','💪','🌙','🥑','🫐']

export default function NutricionistaPaciente() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [treinos7dDatas, setTreinos7dDatas] = useState<string[]>([])
  const [treinoHoje, setTreinoHoje] = useState<TreinoDia | null>(null)
  const [sonoHoje, setSonoHoje] = useState<Sono | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar | null>(null)
  const [planoAtivo, setPlanoAtivo] = useState<PlanoNutricional | null>(null)
  const [gerandoPlano, setGerandoPlano] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'hoje' | 'plano'>('hoje')
  const [carregando, setCarregando] = useState(true)

  // editor
  const [editandoPlano, setEditandoPlano] = useState(false)
  const [salvandoEd, setSalvandoEd] = useState(false)
  const [refeicoesEd, setRefeicoesEd] = useState<RefeicaoEd[]>([])
  const [notaEd, setNotaEd] = useState('')
  const [extrasEd, setExtrasEd] = useState<ExtrasEd>(EXTRAS_VAZIO)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 6)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const [
        { data: perfil }, { data: treinos7d },
        { data: trHoje }, { data: sono }, { data: bem }, { data: plano },
      ] = await Promise.all([
        supabase.from('perfis').select('id,nome,email,peso,objetivo').eq('id', clienteId).single(),
        supabase.from('treinos').select('data').eq('cliente_id', clienteId).gte('data', semStr).eq('concluido', true),
        supabase.from('treinos').select('data,plano,calorias_estimadas').eq('cliente_id', clienteId).eq('data', hoje).eq('concluido', true).maybeSingle(),
        supabase.from('sono').select('score_recuperacao,duracao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('bem_estar').select('humor,energia,motivacao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('planos_nutricionais').select('id,conteudo,calorias_meta,proteina_meta,created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
      ])
      if (perfil) setPaciente(perfil)
      setTreinos7dDatas((treinos7d ?? []).map((t: { data: string }) => t.data))
      setTreinoHoje(trHoje ?? null)
      setSonoHoje(sono ?? null)
      setBemEstar(bem ?? null)
      if (plano) { setPlanoAtivo(plano); setAbaAtiva('plano') }
      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  // ── editor helpers ──────────────────────────────────────────────────────
  function iniciarEdicao(doZero = false) {
    if (!doZero && planoEstruturado) {
      setRefeicoesEd(planoEstruturado.refeicoes.map((r: any) => ({
        nome: r.nome ?? '', horario: r.horario ?? '', dica: r.dica ?? '',
        alimentos: (r.alimentos && r.alimentos.length > 0)
          ? r.alimentos.map((a: any) => ({
              nome: a.nome ?? '', quantidade: a.quantidade ?? '',
              calorias: String(a.calorias ?? ''), proteina: String(a.proteina ?? ''),
            }))
          : [{ nome: '', quantidade: '', calorias: String(r.calorias ?? ''), proteina: String(r.proteina ?? '') }],
      })))
      setNotaEd(planoEstruturado.nota_nutri ?? '')
      setExtrasEd({
        hidratacaoLitros: String(planoEstruturado.hidratacao?.litros_dia ?? ''),
        hidratacaoOri: planoEstruturado.hidratacao?.orientacao ?? '',
        oriTreino: planoEstruturado.orientacao_treino ?? '',
        estrategia: planoEstruturado.estrategia_desafio ?? '',
        dicaFome: planoEstruturado.dica_fome ?? '',
      })
    } else {
      setRefeicoesEd([{ ...REFEICAO_VAZIA }])
      setNotaEd('')
      setExtrasEd(EXTRAS_VAZIO)
    }
    setEditandoPlano(true)
    setAbaAtiva('plano')
  }

  function addRefeicao() {
    setRefeicoesEd(p => [...p, { nome: '', horario: '', dica: '', alimentos: [{ nome: '', quantidade: '', calorias: '', proteina: '' }] }])
  }
  function removeRefeicao(i: number) {
    setRefeicoesEd(p => p.filter((_, idx) => idx !== i))
  }
  function updateRefeicao(i: number, field: 'nome' | 'horario' | 'dica', val: string) {
    setRefeicoesEd(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function addAlimento(rIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, alimentos: [...r.alimentos, { nome: '', quantidade: '', calorias: '', proteina: '' }] }
      : r))
  }
  function removeAlimento(rIdx: number, aIdx: number) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, alimentos: r.alimentos.filter((_, i) => i !== aIdx) }
      : r))
  }
  function updateAlimento(rIdx: number, aIdx: number, field: keyof AlimentoEd, val: string) {
    setRefeicoesEd(p => p.map((r, idx) => idx === rIdx
      ? { ...r, alimentos: r.alimentos.map((a, i) => i === aIdx ? { ...a, [field]: val } : a) }
      : r))
  }

  async function salvarEdicao() {
    setSalvandoEd(true)
    const planoJSON: any = {
      nota_nutri: notaEd,
      refeicoes: refeicoesEd.map(r => ({
        nome: r.nome, horario: r.horario,
        ...(r.dica ? { dica: r.dica } : {}),
        calorias: sumAl(r.alimentos, 'calorias'),
        proteina: sumAl(r.alimentos, 'proteina'),
        alimentos: r.alimentos.filter(a => a.nome).map(a => ({
          nome: a.nome, quantidade: a.quantidade,
          calorias: parseFloat(a.calorias) || 0,
          proteina: parseFloat(a.proteina) || 0,
        })),
      })),
    }
    if (extrasEd.hidratacaoLitros || extrasEd.hidratacaoOri)
      planoJSON.hidratacao = { litros_dia: parseFloat(extrasEd.hidratacaoLitros) || 0, orientacao: extrasEd.hidratacaoOri }
    if (extrasEd.oriTreino) planoJSON.orientacao_treino = extrasEd.oriTreino
    if (extrasEd.estrategia) planoJSON.estrategia_desafio = extrasEd.estrategia
    if (extrasEd.dicaFome) planoJSON.dica_fome = extrasEd.dicaFome
    const totalCal = planoJSON.refeicoes.reduce((s: number, r: any) => s + r.calorias, 0)
    const totalProt = planoJSON.refeicoes.reduce((s: number, r: any) => s + r.proteina, 0)
    await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', clienteId).eq('ativo', true)
    const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
      usuario_id: clienteId, criado_por: 'nutricionista',
      conteudo: JSON.stringify(planoJSON),
      calorias_meta: totalCal || metaCal,
      proteina_meta: totalProt || metaProt,
      refeicoes_por_dia: refeicoesEd.length, ativo: true,
    }).select('id,conteudo,calorias_meta,proteina_meta,created_at').single()
    if (novoPlano) setPlanoAtivo(novoPlano)
    setEditandoPlano(false)
    setSalvandoEd(false)
  }

  async function gerarPlanoIA() {
    if (!paciente) return
    setGerandoPlano(true); setEditandoPlano(false); setAbaAtiva('plano')
    const metaCalLocal = getMetaCalorias(paciente.peso, paciente.objetivo)
    const metaProtLocal = getMetaProteina(paciente.peso, paciente.objetivo)
    const obj = OBJETIVO_LABEL[paciente.objetivo ?? ''] ?? 'Saúde geral'
    const numRef = paciente.objetivo === 'ganhar_massa' ? 6 : 5
    const prompt = `Você é uma nutricionista esportiva. Crie um plano alimentar completo e personalizado.

PERFIL: Nome: ${paciente.nome ?? 'Paciente'}, Objetivo: ${obj}, Peso: ${paciente.peso ?? '?'}kg
Meta calórica: ${metaCalLocal ?? 2000}kcal/dia, Meta proteína: ${metaProtLocal ?? 120}g/dia

INSTRUÇÕES: Exatamente ${numRef} refeições. Cada alimento com quantidade precisa em gramas e macros individuais.
Total ~${metaCalLocal ?? 2000}kcal e ~${metaProtLocal ?? 120}g proteína.

Responda APENAS JSON válido:
{
  "nota_nutri": "Nota clínica curta.",
  "refeicoes": [
    {
      "nome": "Café da Manhã", "horario": "07:00", "calorias": 480, "proteina": 32,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "3 unidades (150g)", "calorias": 215, "proteina": 19, "carboidrato": 2, "gordura": 15 }
      ],
      "dica": "Dica prática."
    }
  ],
  "hidratacao": { "litros_dia": 3.0, "orientacao": "Orientação." }
}`
    try {
      const res = await fetch('/api/analise-treino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, modo: 'plano' }) })
      const data = await res.json()
      const jsonMatch = (data.analise ?? '').match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const planoJSON = JSON.parse(jsonMatch[0])
      await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', clienteId).eq('ativo', true)
      const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
        usuario_id: clienteId, criado_por: 'nutricionista', conteudo: JSON.stringify(planoJSON),
        calorias_meta: metaCalLocal, proteina_meta: metaProtLocal,
        refeicoes_por_dia: planoJSON.refeicoes?.length ?? numRef, ativo: true,
      }).select('id,conteudo,calorias_meta,proteina_meta,created_at').single()
      if (novoPlano) setPlanoAtivo(novoPlano)
    } catch (e) { console.error(e) } finally { setGerandoPlano(false) }
  }

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const metaCal = getMetaCalorias(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const metaProt = getMetaProteina(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const hoje = getTodayBR()
  const dias7d = getDias7d(hoje)

  let planoEstruturado: any = null
  if (planoAtivo) { try { const p = JSON.parse(planoAtivo.conteudo); if (p.refeicoes) planoEstruturado = p } catch {} }

  const totalEdCal = refeicoesEd.reduce((s, r) => s + sumAl(r.alimentos, 'calorias'), 0)
  const totalEdProt = refeicoesEd.reduce((s, r) => s + sumAl(r.alimentos, 'proteina'), 0)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="mb-5">
          <button onClick={() => router.push('/nutricionista/pacientes')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">
            ← Pacientes
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 font-black text-base">{paciente ? getInitials(paciente.nome, paciente.email) : '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{paciente?.nome ?? paciente?.email ?? 'Paciente'}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {paciente?.peso && <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">{paciente.peso}kg</span>}
                {paciente?.objetivo && <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</span>}
                {metaCal && <span className="text-[10px] text-green-500/70 bg-green-500/5 border border-green-500/15 rounded-full px-2 py-0.5">Meta: {metaCal}kcal</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {([['hoje', '📊 Hoje'], ['plano', '🥗 Plano']] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setAbaAtiva(id); setEditandoPlano(false) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${abaAtiva === id ? 'bg-white text-black' : 'text-zinc-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ABA HOJE ─────────────────────────────────────────────────── */}
        {abaAtiva === 'hoje' && (
          <div className="space-y-4">

            {/* Recuperação */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">😴 Recuperação hoje</p>
              {sonoHoje?.score_recuperacao != null ? (
                <div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className={`text-5xl font-black leading-none ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {sonoHoje.score_recuperacao}
                    </span>
                    <span className="text-zinc-600 text-xl mb-1">/100</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all ${sonoHoje.score_recuperacao >= 70 ? 'bg-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${sonoHoje.score_recuperacao}%` }} />
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {sonoHoje.score_recuperacao >= 85 ? 'Excelente recuperação' : sonoHoje.score_recuperacao >= 70 ? 'Boa recuperação' : sonoHoje.score_recuperacao >= 55 ? 'Recuperação moderada' : 'Recuperação baixa'}
                  </p>
                  {sonoHoje.duracao && <p className="text-zinc-600 text-xs">Dormiu {sonoHoje.duracao}h esta noite</p>}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-2xl mb-2">🌙</p>
                  <p className="text-zinc-500 text-sm">Sem registro de sono hoje</p>
                </div>
              )}
            </div>

            {/* Treino hoje */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">🏋️ Treino hoje</p>
              {treinoHoje ? (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-emerald-400 text-base">✓</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{treinoHoje.plano ?? 'Treino concluído'}</p>
                      <p className="text-emerald-400 text-xs">Completou treino hoje</p>
                    </div>
                  </div>
                  {treinoHoje.calorias_estimadas != null && treinoHoje.calorias_estimadas > 0 && (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] mt-3">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-0.5">Gasto estimado</p>
                      <p className="text-orange-400 font-black text-base">{treinoHoje.calorias_estimadas} <span className="text-xs font-normal text-zinc-500">kcal</span></p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-zinc-600 text-lg">—</span>
                  </div>
                  <p className="text-zinc-500 text-sm">Sem treino registrado hoje</p>
                </div>
              )}
            </div>

            {/* Bem-estar */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">⚡ Bem-estar hoje</p>
              {bemEstar ? (
                <div className="space-y-3">
                  {([
                    { label: 'Humor', val: bemEstar.humor },
                    { label: 'Energia', val: bemEstar.energia },
                    { label: 'Motivação', val: bemEstar.motivacao },
                  ] as { label: string; val: number }[]).map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-3">
                      <p className="text-zinc-500 text-xs w-16 shrink-0">{label}</p>
                      <div className="flex gap-1.5 flex-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`flex-1 h-2.5 rounded-full ${i <= val ? (val >= 4 ? 'bg-green-400' : val >= 3 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/[0.08]'}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-bold w-7 text-right shrink-0 ${val >= 4 ? 'text-green-400' : val >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>{val}/5</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-zinc-600 text-sm">Sem registro de bem-estar hoje</p>
                </div>
              )}
            </div>

            {/* Treinos — 7 dias */}
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Treinos — últimos 7 dias</p>
              <div className="flex gap-1.5">
                {dias7d.map((dia) => {
                  const treinoNoDia = treinos7dDatas.includes(dia)
                  const isHoje = dia === hoje
                  const [,mm,dd] = dia.split('-')
                  return (
                    <div key={dia} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm ${treinoNoDia ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-white/[0.04] border border-white/[0.06] text-zinc-700'}`}>
                        {treinoNoDia ? '✓' : '·'}
                      </div>
                      <p className={`text-[8px] uppercase tracking-wider ${isHoje ? 'text-white' : 'text-zinc-700'}`}>{dd}/{mm}</p>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-md bg-blue-500/30 border border-blue-500/40" />
                  <span className="text-zinc-600 text-[9px]">Treinou</span>
                </div>
                <span className={`text-xs font-bold ml-auto ${treinos7dDatas.length >= 4 ? 'text-blue-400' : treinos7dDatas.length >= 2 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                  {treinos7dDatas.length}/7 dias
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA PLANO ────────────────────────────────────────────────── */}
        {abaAtiva === 'plano' && (
          <div className="space-y-4">

            {/* ── EDITOR MANUAL ───────────────────────────────────────── */}
            {editandoPlano ? (
              <>
                {/* Nota clínica */}
                <div className="rounded-2xl border border-green-500/20 px-4 py-3.5" style={{ background: '#0a0d14' }}>
                  <p className="text-green-400 text-[9px] uppercase tracking-wider mb-2">Nota clínica</p>
                  <textarea value={notaEd} onChange={e => setNotaEd(e.target.value)}
                    placeholder="Orientação geral sobre o plano para o paciente..."
                    rows={2} className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-green-500/30 border border-white/[0.06] resize-none" />
                </div>

                {/* Refeições */}
                {refeicoesEd.map((ref, rIdx) => {
                  const refCal = sumAl(ref.alimentos, 'calorias')
                  const refProt = sumAl(ref.alimentos, 'proteina')
                  return (
                    <div key={rIdx} className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: '#0f0f0f' }}>
                      {/* header refeição */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]" style={{ background: '#111' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{EMOJIS_REFEICAO[rIdx] ?? '🥗'}</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Refeição {rIdx + 1}</span>
                          {refCal > 0 && <span className="text-orange-400 text-[10px] font-bold">{refCal} kcal</span>}
                          {refProt > 0 && <span className="text-blue-400 text-[10px]">{refProt}g</span>}
                        </div>
                        {refeicoesEd.length > 1 && (
                          <button onClick={() => removeRefeicao(rIdx)} className="text-red-400/50 text-[10px] hover:text-red-400 transition-colors">✕ remover</button>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        {/* nome + horário */}
                        <div className="grid grid-cols-3 gap-2">
                          <input value={ref.nome} onChange={e => updateRefeicao(rIdx, 'nome', e.target.value)}
                            placeholder="Ex: Café da Manhã"
                            className="col-span-2 bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]" />
                          <input value={ref.horario} onChange={e => updateRefeicao(rIdx, 'horario', e.target.value)}
                            placeholder="07:00"
                            className="bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06] text-center" />
                        </div>

                        {/* alimentos */}
                        <div className="space-y-2">
                          <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimentos</p>
                          {ref.alimentos.map((al, aIdx) => (
                            <div key={aIdx} className="rounded-xl border border-white/[0.05] p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center gap-2">
                                <input value={al.nome} onChange={e => updateAlimento(rIdx, aIdx, 'nome', e.target.value)}
                                  placeholder="Nome do alimento"
                                  className="flex-1 bg-transparent text-white placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15 border border-white/[0.06]" />
                                {ref.alimentos.length > 1 && (
                                  <button onClick={() => removeAlimento(rIdx, aIdx)} className="text-zinc-700 hover:text-red-400 transition-colors text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-white/[0.04]">✕</button>
                                )}
                              </div>
                              <input value={al.quantidade} onChange={e => updateAlimento(rIdx, aIdx, 'quantidade', e.target.value)}
                                placeholder="Quantidade (ex: 100g, 2 colheres, 1 unidade)"
                                className="w-full bg-transparent text-white placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/15 border border-white/[0.06]" />
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <input type="number" value={al.calorias} onChange={e => updateAlimento(rIdx, aIdx, 'calorias', e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-orange-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500/20 border border-white/[0.06] pr-12" />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">kcal</span>
                                </div>
                                <div className="relative">
                                  <input type="number" value={al.proteina} onChange={e => updateAlimento(rIdx, aIdx, 'proteina', e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-blue-300 placeholder-zinc-700 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/20 border border-white/[0.06] pr-10" />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">g prot</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addAlimento(rIdx)}
                            className="w-full py-2 rounded-xl border border-dashed border-white/[0.08] text-zinc-600 text-xs hover:border-white/20 hover:text-zinc-400 transition-all active:scale-95">
                            + adicionar alimento
                          </button>
                        </div>

                        {/* dica opcional */}
                        <input value={ref.dica} onChange={e => updateRefeicao(rIdx, 'dica', e.target.value)}
                          placeholder="💡 Dica para o paciente (opcional)"
                          className="w-full bg-white/[0.02] text-zinc-400 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/10 border border-white/[0.04]" />

                        {/* total refeição */}
                        {refCal > 0 && (
                          <div className="flex items-center gap-3 pt-1 border-t border-white/[0.04]">
                            <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Total</span>
                            <span className="text-orange-400 text-xs font-bold">{refCal} kcal</span>
                            <span className="text-blue-400 text-xs font-bold">{refProt}g prot</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <button onClick={addRefeicao}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/[0.1] text-zinc-500 text-sm hover:border-white/20 hover:text-zinc-300 transition-all active:scale-95">
                  + Adicionar refeição
                </button>

                {/* total do dia */}
                {totalEdCal > 0 && (
                  <div className="rounded-2xl border border-white/[0.06] px-4 py-3 flex items-center justify-between" style={{ background: '#0a0a0a' }}>
                    <div>
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Total do dia</p>
                      <div className="flex items-center gap-4">
                        <span className="text-orange-400 font-black text-base">{totalEdCal} <span className="text-xs font-normal">kcal</span></span>
                        <span className="text-blue-400 font-black text-base">{totalEdProt}<span className="text-xs font-normal">g prot</span></span>
                      </div>
                    </div>
                    {metaCal && (
                      <div className="text-right">
                        <p className="text-zinc-700 text-[9px]">Meta: {metaCal}kcal</p>
                        <p className={`text-[10px] font-semibold ${Math.abs(totalEdCal - metaCal) <= metaCal*0.1 ? 'text-green-400' : totalEdCal < metaCal ? 'text-yellow-400' : 'text-orange-400'}`}>
                          {totalEdCal < metaCal ? `−${metaCal - totalEdCal}` : `+${totalEdCal - metaCal}`} kcal
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Seções extras opcionais */}
                <div className="rounded-2xl border border-white/[0.06] p-4 space-y-3" style={{ background: '#0f0f0f' }}>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Orientações complementares (opcional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="number" value={extrasEd.hidratacaoLitros} onChange={e => setExtrasEd(p => ({ ...p, hidratacaoLitros: e.target.value }))}
                        placeholder="2.5" className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]">L/dia</span>
                    </div>
                    <input value={extrasEd.hidratacaoOri} onChange={e => setExtrasEd(p => ({ ...p, hidratacaoOri: e.target.value }))}
                      placeholder="💧 Orientação de hidratação"
                      className="bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                  </div>
                  <input value={extrasEd.oriTreino} onChange={e => setExtrasEd(p => ({ ...p, oriTreino: e.target.value }))}
                    placeholder="⚡ Orientação pré/pós-treino"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                  <input value={extrasEd.estrategia} onChange={e => setExtrasEd(p => ({ ...p, estrategia: e.target.value }))}
                    placeholder="🎯 Estratégia para o desafio principal"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                  <input value={extrasEd.dicaFome} onChange={e => setExtrasEd(p => ({ ...p, dicaFome: e.target.value }))}
                    placeholder="💡 Dica de controle de fome"
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/[0.06]" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditandoPlano(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-white/[0.08] text-zinc-400 text-sm font-semibold active:scale-95 transition-all">
                    Cancelar
                  </button>
                  <button onClick={salvarEdicao} disabled={salvandoEd || refeicoesEd.length === 0}
                    className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-40">
                    {salvandoEd ? 'Salvando...' : 'Salvar plano'}
                  </button>
                </div>
              </>

            ) : gerandoPlano ? (
              <div className="rounded-2xl border border-green-500/20 p-6" style={{ background: '#0a0d14' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div>
                    <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-semibold">Gerando plano</p>
                    <p className="text-white font-bold">Montando dieta personalizada...</p>
                  </div>
                </div>
                {['Analisando perfil e objetivos','Calculando distribuição calórica','Selecionando alimentos e quantidades','Montando refeições e macros'].map((msg, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin shrink-0" style={{ animationDelay: `${i * 0.15}s` }} />
                    <p className="text-zinc-500 text-sm">{msg}</p>
                  </div>
                ))}
              </div>

            ) : planoAtivo && planoEstruturado ? (
              <>
                {/* header plano ativo */}
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                  <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-green-400 font-semibold">✦ Plano Alimentar</span>
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Ativo</span>
                      </div>
                      <p className="text-zinc-600 text-[10px]">Criado em {new Date(planoAtivo.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => iniciarEdicao(false)} className="text-[10px] text-zinc-400 border border-white/[0.1] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✏️ Editar</button>
                      <button onClick={gerarPlanoIA} className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✦ IA</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                    {[
                      { label: 'Kcal/dia', val: planoAtivo.calorias_meta ?? '—', cor: 'text-orange-400' },
                      { label: 'Proteína', val: planoAtivo.proteina_meta ? `${planoAtivo.proteina_meta}g` : '—', cor: 'text-blue-400' },
                      { label: 'Refeições', val: planoEstruturado.refeicoes.length, cor: 'text-green-400' },
                    ].map((m, i) => (
                      <div key={i} className="py-3 text-center">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-0.5">{m.label}</p>
                        <p className={`text-sm font-black ${m.cor}`}>{m.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {planoEstruturado.nota_nutri && (
                  <div className="rounded-2xl border border-green-500/15 px-4 py-3.5" style={{ background: 'linear-gradient(135deg,#0a0d14,#080a10)' }}>
                    <p className="text-green-400 text-[9px] uppercase tracking-wider mb-1.5">📋 Nota clínica</p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{planoEstruturado.nota_nutri}</p>
                  </div>
                )}

                {/* refeições com alimentos */}
                <div className="space-y-2">
                  {planoEstruturado.refeicoes.map((ref: any, i: number) => (
                    <RefeicaoCard key={i} ref={ref} idx={i} />
                  ))}
                </div>

                {/* Seções extras do plano */}
                {planoEstruturado.hidratacao && (
                  <PlanoExtra
                    icon="💧" titulo="Hidratação personalizada"
                    subtitulo={`${planoEstruturado.hidratacao.litros_dia}L por dia · baseado no seu peso e treino`}
                    conteudo={planoEstruturado.hidratacao.orientacao}
                    cor="blue"
                  />
                )}
                {planoEstruturado.orientacao_treino && (
                  <PlanoExtra
                    icon="⚡" titulo="Orientação de treino"
                    subtitulo="Pré e pós-treino com alimentos"
                    conteudo={planoEstruturado.orientacao_treino}
                    cor="yellow"
                  />
                )}
                {planoEstruturado.estrategia_desafio && (
                  <PlanoExtra
                    icon="🎯" titulo="Estratégia para o desafio"
                    subtitulo="Como superar o maior obstáculo"
                    conteudo={planoEstruturado.estrategia_desafio}
                    cor="orange"
                  />
                )}
                {planoEstruturado.dica_fome && (
                  <PlanoExtra
                    icon="💡" titulo="Controle de fome"
                    subtitulo="Estratégia para o período crítico"
                    conteudo={planoEstruturado.dica_fome}
                    cor="green"
                  />
                )}
              </>

            ) : (
              <div className="rounded-2xl border border-green-500/20 p-6 text-center" style={{ background: 'linear-gradient(145deg,#0a0d14,#080a10)' }}>
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">🥗</div>
                <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Plano alimentar</p>
                <p className="text-white font-black text-xl mb-2">Criar dieta personalizada</p>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">Monte manualmente com alimentos e gramas, ou deixe a IA gerar um plano completo.</p>
                <div className="flex gap-2">
                  <button onClick={() => iniciarEdicao(true)} className="flex-1 border border-white/[0.12] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all hover:border-white/25">✏️ Manual</button>
                  <button onClick={gerarPlanoIA} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">✦ Gerar IA</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {NAV.map(item => (
            <button key={item.id} onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90">
              <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-600">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}

function PlanoExtra({ icon, titulo, subtitulo, conteudo, cor }: {
  icon: string; titulo: string; subtitulo: string; conteudo: string; cor: 'blue' | 'yellow' | 'orange' | 'green'
}) {
  const [aberto, setAberto] = useState(false)
  const cores: Record<string, { borda: string; titulo: string; bg: string }> = {
    blue:   { borda: 'border-blue-500/20',   titulo: 'text-blue-400',   bg: 'bg-blue-500/5' },
    yellow: { borda: 'border-yellow-500/20', titulo: 'text-yellow-400', bg: 'bg-yellow-500/5' },
    orange: { borda: 'border-orange-500/20', titulo: 'text-orange-400', bg: 'bg-orange-500/5' },
    green:  { borda: 'border-green-500/20',  titulo: 'text-green-400',  bg: 'bg-green-500/5' },
  }
  const c = cores[cor]
  return (
    <div className={`rounded-2xl border ${c.borda} ${c.bg} overflow-hidden`}>
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:opacity-80">
        <span className="text-xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${c.titulo}`}>{titulo}</p>
          <p className="text-zinc-500 text-xs">{subtitulo}</p>
        </div>
        <span className={`text-zinc-600 text-xs transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {aberto && (
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          <p className="text-zinc-300 text-sm leading-relaxed pt-3">{conteudo}</p>
        </div>
      )}
    </div>
  )
}

function RefeicaoCard({ ref, idx }: { ref: any; idx: number }) {
  const [aberta, setAberta] = useState(false)
  const emojis = ['☀️','🍎','🍽️','⚡','💪','🌙','🥑','🫐']
  const alimentos: any[] = ref.alimentos ?? []
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
      <button onClick={() => setAberta(p => !p)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-base shrink-0">
          {emojis[idx] ?? '🥗'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-bold text-sm">{ref.nome}</p>
            {ref.horario && <span className="text-zinc-600 text-[10px] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">{ref.horario}</span>}
          </div>
          <div className="flex gap-3 mt-0.5">
            <span className="text-orange-400 text-[11px] font-semibold">{ref.calorias} kcal</span>
            <span className="text-blue-400 text-[11px]">{ref.proteina}g prot</span>
            {alimentos.length > 0 && <span className="text-zinc-600 text-[11px]">{alimentos.length} alimento{alimentos.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <span className={`text-zinc-600 text-xs transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {aberta && alimentos.length > 0 && (
        <div className="border-t border-white/[0.04]">
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Alimento</p>
              <div className="flex gap-4">
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Qtd.</p>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider w-10 text-right">Kcal</p>
                <p className="text-zinc-600 text-[9px] uppercase tracking-wider w-8 text-right">Prot</p>
              </div>
            </div>
            {alimentos.map((al: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                <p className="text-white text-xs font-medium flex-1 pr-2">{al.nome}</p>
                <div className="flex gap-4 items-center shrink-0">
                  <p className="text-zinc-500 text-[10px]">{al.quantidade}</p>
                  <p className="text-orange-400 text-xs font-semibold w-10 text-right">{al.calorias}</p>
                  <p className="text-blue-400 text-xs w-8 text-right">{al.proteina}g</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5 mt-1 border-t border-white/[0.06]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Total</p>
              <div className="flex gap-4 shrink-0">
                <span className="text-zinc-600 text-[10px]"></span>
                <p className="text-orange-400 text-xs font-black w-10 text-right">{ref.calorias}</p>
                <p className="text-blue-400 text-xs font-black w-8 text-right">{ref.proteina}g</p>
              </div>
            </div>
          </div>
          {ref.dica && (
            <div className="mx-4 mb-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">💡 Dica</p>
              <p className="text-zinc-400 text-xs leading-relaxed">{ref.dica}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
