'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type Paciente = {
  id: string
  nome: string | null
  email: string
  peso: number | null
  objetivo: string | null
}

type NutricaoDia = {
  data: string
  calorias: number | null
  proteina: number | null
  carboidrato: number | null
  gordura: number | null
}

type TreinoDia = {
  data: string
  calorias_estimadas: number | null
  plano: string | null
}

type Sono = {
  score_recuperacao: number | null
  duracao: number | null
}

type BemEstar = {
  humor: number
  energia: number
  motivacao: number
}

type PlanoNutricional = {
  id: string
  conteudo: string
  calorias_meta: number | null
  proteina_meta: number | null
  created_at: string
}

type RefeicaoEd = { nome: string; horario: string; calorias: string; proteina: string }

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getMetaCalorias(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  const tmb = 10 * peso + 6.25 * 170 - 5 * 25 + 5
  const tdee = Math.round(tmb * 1.55)
  if (objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}

function getMetaProteina(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  if (objetivo === 'ganhar_massa') return Math.round(peso * 2.2)
  if (objetivo === 'perder_peso') return Math.round(peso * 2.0)
  return Math.round(peso * 1.8)
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const p = nome.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

function BarraProgresso({ valor, meta, cor }: { valor: number; meta: number; cor: string }) {
  const pct = Math.min(Math.round((valor / meta) * 100), 130)
  return (
    <div className="mt-2">
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="text-zinc-700 text-[9px] mt-1">{pct}% da meta</p>
    </div>
  )
}

function getDias7d(hoje: string): string[] {
  const dias: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje + 'T12:00:00-03:00')
    d.setDate(d.getDate() - i)
    dias.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
  }
  return dias
}

const NAV = [
  { id: 'home',      label: 'Início',    path: '/dashboard' },
  { id: 'pacientes', label: 'Pacientes', path: '/nutricionista/pacientes' },
  { id: 'agenda',    label: 'Agenda',    path: '/agenda' },
  { id: 'perfil',    label: 'Perfil',    path: '/perfil' },
]

export default function NutricionistaPaciente() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [nutricaoHoje, setNutricaoHoje] = useState<NutricaoDia | null>(null)
  const [nutricao7d, setNutricao7d] = useState<NutricaoDia[]>([])
  const [treinoHoje, setTreinoHoje] = useState<TreinoDia | null>(null)
  const [sonoHoje, setSonoHoje] = useState<Sono | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar | null>(null)
  const [planoAtivo, setPlanoAtivo] = useState<PlanoNutricional | null>(null)
  const [gerandoPlano, setGerandoPlano] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'hoje' | 'plano'>('hoje')
  const [carregando, setCarregando] = useState(true)

  // editor manual
  const [editandoPlano, setEditandoPlano] = useState(false)
  const [salvandoEd, setSalvandoEd] = useState(false)
  const [refeicoesEd, setRefeicoesEd] = useState<RefeicaoEd[]>([])
  const [notaEd, setNotaEd] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const hoje = getTodayBR()
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 6)
      const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const [
        { data: perfil },
        { data: nutHoje },
        { data: nut7d },
        { data: trHoje },
        { data: sono },
        { data: bem },
        { data: plano },
      ] = await Promise.all([
        supabase.from('perfis').select('id, nome, email, peso, objetivo').eq('id', clienteId).single(),
        supabase.from('nutricao').select('data, calorias, proteina, carboidrato, gordura').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('nutricao').select('data, calorias, proteina, carboidrato, gordura').eq('usuario_id', clienteId).gte('data', semanaStr).order('data'),
        supabase.from('treinos').select('data, plano, calorias_estimadas').eq('cliente_id', clienteId).eq('data', hoje).eq('concluido', true).maybeSingle(),
        supabase.from('sono').select('score_recuperacao, duracao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('bem_estar').select('humor, energia, motivacao').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('planos_nutricionais').select('id, conteudo, calorias_meta, proteina_meta, created_at').eq('usuario_id', clienteId).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
      ])

      if (perfil) setPaciente(perfil)
      setNutricaoHoje(nutHoje ?? null)
      setNutricao7d(nut7d ?? [])
      setTreinoHoje(trHoje ?? null)
      setSonoHoje(sono ?? null)
      setBemEstar(bem ?? null)
      if (plano) { setPlanoAtivo(plano); setAbaAtiva('plano') }
      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  function iniciarEdicao(doZero = false) {
    if (!doZero && planoEstruturado) {
      setRefeicoesEd(planoEstruturado.refeicoes.map((r: any) => ({
        nome: r.nome ?? '',
        horario: r.horario ?? '',
        calorias: String(r.calorias ?? ''),
        proteina: String(r.proteina ?? ''),
      })))
      setNotaEd(planoEstruturado.nota_nutri ?? '')
    } else {
      setRefeicoesEd([{ nome: '', horario: '07:00', calorias: '', proteina: '' }])
      setNotaEd('')
    }
    setEditandoPlano(true)
    setAbaAtiva('plano')
  }

  function updateRefeicao(i: number, field: keyof RefeicaoEd, val: string) {
    setRefeicoesEd(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function addRefeicao() {
    setRefeicoesEd(prev => [...prev, { nome: '', horario: '', calorias: '', proteina: '' }])
  }

  function removeRefeicao(i: number) {
    setRefeicoesEd(prev => prev.filter((_, idx) => idx !== i))
  }

  async function salvarEdicao() {
    setSalvandoEd(true)
    const totalCal = Math.round(refeicoesEd.reduce((s, r) => s + (parseFloat(r.calorias) || 0), 0))
    const totalProt = Math.round(refeicoesEd.reduce((s, r) => s + (parseFloat(r.proteina) || 0), 0))
    const planoJSON = {
      nota_nutri: notaEd,
      refeicoes: refeicoesEd.map(r => ({
        nome: r.nome,
        horario: r.horario,
        calorias: parseFloat(r.calorias) || 0,
        proteina: parseFloat(r.proteina) || 0,
        alimentos: [],
      })),
    }
    await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', clienteId).eq('ativo', true)
    const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
      usuario_id: clienteId,
      criado_por: 'nutricionista',
      conteudo: JSON.stringify(planoJSON),
      calorias_meta: totalCal || metaCal,
      proteina_meta: totalProt || metaProt,
      refeicoes_por_dia: refeicoesEd.length,
      ativo: true,
    }).select('id, conteudo, calorias_meta, proteina_meta, created_at').single()
    if (novoPlano) setPlanoAtivo(novoPlano)
    setEditandoPlano(false)
    setSalvandoEd(false)
  }

  async function gerarPlanoIA() {
    if (!paciente) return
    setGerandoPlano(true)
    setEditandoPlano(false)
    setAbaAtiva('plano')
    const metaCalLocal = getMetaCalorias(paciente.peso, paciente.objetivo)
    const metaProtLocal = getMetaProteina(paciente.peso, paciente.objetivo)
    const obj = OBJETIVO_LABEL[paciente.objetivo ?? ''] ?? 'Saúde geral'
    const numRef = paciente.objetivo === 'ganhar_massa' ? 6 : 5

    const prompt = `Você é uma nutricionista esportiva. Crie um plano alimentar completo e personalizado.

PERFIL DO PACIENTE:
- Nome: ${paciente.nome ?? 'Paciente'}
- Objetivo: ${obj}
- Peso: ${paciente.peso ? `${paciente.peso}kg` : 'não informado'}
- Meta calórica: ${metaCalLocal ? `${metaCalLocal}kcal/dia` : 'calcule pelo perfil'}
- Meta proteína: ${metaProtLocal ? `${metaProtLocal}g/dia` : 'calcule pelo perfil'}

INSTRUÇÕES:
1. Exatamente ${numRef} refeições
2. Quantidade precisa em gramas por alimento
3. Calorias e proteína individuais
4. Total ~${metaCalLocal ?? 2000}kcal e ~${metaProtLocal ?? 120}g proteína

Responda APENAS JSON válido:
{
  "nota_nutri": "Nota clínica curta.",
  "refeicoes": [
    {
      "nome": "Café da Manhã",
      "horario": "07:00",
      "calorias": 480,
      "proteina": 32,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "3 unidades (150g)", "calorias": 215, "proteina": 19, "carboidrato": 2, "gordura": 15 }
      ],
      "dica": "Dica prática."
    }
  ],
  "hidratacao": { "litros_dia": 3.0, "orientacao": "Orientação." },
  "orientacao_treino": "Orientação pré e pós-treino."
}`

    try {
      const res = await fetch('/api/analise-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modo: 'plano' }),
      })
      const data = await res.json()
      const jsonMatch = (data.analise ?? '').match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const planoJSON = JSON.parse(jsonMatch[0])

      await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', clienteId).eq('ativo', true)
      const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
        usuario_id: clienteId,
        criado_por: 'nutricionista',
        conteudo: JSON.stringify(planoJSON),
        calorias_meta: metaCalLocal,
        proteina_meta: metaProtLocal,
        refeicoes_por_dia: planoJSON.refeicoes?.length ?? numRef,
        ativo: true,
      }).select('id, conteudo, calorias_meta, proteina_meta, created_at').single()
      if (novoPlano) setPlanoAtivo(novoPlano)
    } catch (e) {
      console.error('Erro ao gerar plano:', e)
    } finally {
      setGerandoPlano(false)
    }
  }

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const metaCal = getMetaCalorias(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const metaProt = getMetaProteina(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const calHoje = nutricaoHoje?.calorias ?? 0
  const protHoje = nutricaoHoje?.proteina ?? 0
  const gastoTreino = treinoHoje?.calorias_estimadas ?? 0
  const balanco = metaCal ? calHoje - gastoTreino - metaCal : null
  const hoje = getTodayBR()
  const dias7d = getDias7d(hoje)
  const maxCal = Math.max(...nutricao7d.map(n => n.calorias ?? 0), metaCal ?? 1, 1)

  let planoEstruturado: any = null
  if (planoAtivo) {
    try { const p = JSON.parse(planoAtivo.conteudo); if (p.refeicoes) planoEstruturado = p } catch {}
  }

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

        {/* ABA HOJE */}
        {abaAtiva === 'hoje' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Nutrição de hoje</p>
              {nutricaoHoje ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Calorias</p>
                      <p className="text-white text-xl font-black">{calHoje}<span className="text-xs font-normal text-zinc-500"> kcal</span></p>
                      {metaCal && <BarraProgresso valor={calHoje} meta={metaCal} cor={calHoje >= metaCal * 0.9 && calHoje <= metaCal * 1.15 ? 'bg-green-500' : calHoje < metaCal * 0.7 ? 'bg-red-500' : 'bg-yellow-500'} />}
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Proteína</p>
                      <p className="text-white text-xl font-black">{protHoje}<span className="text-xs font-normal text-zinc-500"> g</span></p>
                      {metaProt && <BarraProgresso valor={protHoje} meta={metaProt} cor={protHoje >= metaProt * 0.9 ? 'bg-green-500' : protHoje >= metaProt * 0.6 ? 'bg-yellow-500' : 'bg-red-500'} />}
                    </div>
                  </div>
                  {(nutricaoHoje.carboidrato || nutricaoHoje.gordura) ? (
                    <div className="flex gap-4 pt-3 border-t border-white/[0.04]">
                      {nutricaoHoje.carboidrato != null && <div><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Carb</p><p className="text-zinc-300 text-sm font-bold">{nutricaoHoje.carboidrato}g</p></div>}
                      {nutricaoHoje.gordura != null && <><div className="w-px bg-white/[0.06]" /><div><p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Gordura</p><p className="text-zinc-300 text-sm font-bold">{nutricaoHoje.gordura}g</p></div></>}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-2xl mb-2">🥗</p>
                  <p className="text-zinc-500 text-sm">Nenhum registro alimentar hoje</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Balanço calórico real</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Ingerido</p>
                  <p className="text-white text-base font-black">{calHoje || '—'}</p>
                  <p className="text-zinc-700 text-[9px]">kcal</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Treino</p>
                  <p className={`text-base font-black ${gastoTreino > 0 ? 'text-orange-400' : 'text-zinc-600'}`}>{gastoTreino > 0 ? `-${gastoTreino}` : '—'}</p>
                  <p className="text-zinc-700 text-[9px]">kcal</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">Meta</p>
                  <p className="text-zinc-400 text-base font-black">{metaCal ?? '—'}</p>
                  <p className="text-zinc-700 text-[9px]">kcal</p>
                </div>
              </div>
              {balanco !== null && metaCal && (
                <div className={`rounded-xl p-3.5 border ${Math.abs(balanco) <= metaCal * 0.1 ? 'bg-green-500/5 border-green-500/20' : balanco < 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Balanço líquido</p>
                    <p className={`text-sm font-black ${Math.abs(balanco) <= metaCal * 0.1 ? 'text-green-400' : balanco < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{balanco > 0 ? '+' : ''}{balanco} kcal</p>
                  </div>
                  <p className="text-zinc-600 text-[11px] mt-1">
                    {Math.abs(balanco) <= metaCal * 0.1 ? 'Na meta — bom equilíbrio' : balanco < -metaCal * 0.15 ? 'Déficit além do planejado' : 'Superávit em relação à meta'}
                  </p>
                </div>
              )}
            </div>

            {(sonoHoje || bemEstar) && (
              <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Contexto de hoje</p>
                <div className="grid grid-cols-2 gap-3">
                  {sonoHoje?.score_recuperacao ? (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Recuperação</p>
                      <p className={`text-xl font-black ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {sonoHoje.score_recuperacao}<span className="text-xs font-normal text-zinc-600">/100</span>
                      </p>
                      {sonoHoje.duracao && <p className="text-zinc-700 text-[9px] mt-0.5">{sonoHoje.duracao}h de sono</p>}
                    </div>
                  ) : null}
                  {bemEstar ? (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-2">Bem-estar</p>
                      {[{ label: 'Humor', val: bemEstar.humor }, { label: 'Energia', val: bemEstar.energia }].map(({ label, val }) => (
                        <div key={label} className="flex items-center gap-2 mb-1">
                          <p className="text-zinc-600 text-[9px] w-12">{label}</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-1.5 rounded-full ${i <= val ? (val >= 4 ? 'bg-green-400' : val >= 3 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/[0.06]'}`} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Tendência — 7 dias</p>
              <div className="flex items-end gap-1.5 h-24">
                {dias7d.map((dia) => {
                  const reg = nutricao7d.find(n => n.data === dia)
                  const cal = reg?.calorias ?? 0
                  const h = cal > 0 ? Math.max(Math.round((cal / maxCal) * 80), 6) : 4
                  const isHoje = dia === hoje
                  let barColor = 'bg-white/[0.12]'
                  if (cal > 0 && metaCal) {
                    const pct = cal / metaCal
                    barColor = pct >= 0.9 && pct <= 1.15 ? 'bg-green-500' : pct < 0.7 ? 'bg-red-400/60' : 'bg-yellow-400/60'
                  }
                  const [, mm, dd] = dia.split('-')
                  return (
                    <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                        <div className={`w-full rounded-t-lg ${barColor} ${isHoje ? 'ring-1 ring-white/20' : ''}`} style={{ height: h }} />
                      </div>
                      <p className={`text-[8px] uppercase tracking-wider ${isHoje ? 'text-white' : 'text-zinc-700'}`}>{dd}/{mm}</p>
                    </div>
                  )
                })}
              </div>
              {metaCal && <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]"><div className="w-3 h-0.5 bg-green-500/50 rounded" /><p className="text-zinc-700 text-[9px]">Meta: {metaCal} kcal</p></div>}
            </div>
          </div>
        )}

        {/* ABA PLANO ALIMENTAR */}
        {abaAtiva === 'plano' && (
          <div className="space-y-4">

            {/* MODO EDIÇÃO MANUAL */}
            {editandoPlano ? (
              <>
                <div className="rounded-2xl border border-green-500/20 px-4 py-3.5" style={{ background: '#0a0d14' }}>
                  <p className="text-green-400 text-[9px] uppercase tracking-wider mb-2">Nota clínica</p>
                  <textarea
                    value={notaEd}
                    onChange={e => setNotaEd(e.target.value)}
                    placeholder="Ex: 5 refeições estratégicas para controle de fome e preservação de massa..."
                    rows={3}
                    className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-green-500/30 border border-white/[0.06] resize-none"
                  />
                </div>

                <div className="space-y-3">
                  {refeicoesEd.map((ref, i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] p-4" style={{ background: '#0f0f0f' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Refeição {i + 1}</span>
                        {refeicoesEd.length > 1 && (
                          <button onClick={() => removeRefeicao(i)} className="text-red-400/60 text-[10px] hover:text-red-400 transition-colors">✕ Remover</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          value={ref.nome}
                          onChange={e => updateRefeicao(i, 'nome', e.target.value)}
                          placeholder="Nome (ex: Café da Manhã)"
                          className="col-span-2 bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]"
                        />
                        <input
                          value={ref.horario}
                          onChange={e => updateRefeicao(i, 'horario', e.target.value)}
                          placeholder="Horário (07:00)"
                          className="bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]"
                        />
                        <div className="relative">
                          <input
                            type="number"
                            value={ref.calorias}
                            onChange={e => updateRefeicao(i, 'calorias', e.target.value)}
                            placeholder="kcal"
                            className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-orange-500/30 border border-white/[0.06]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">kcal</span>
                        </div>
                        <div className="relative col-span-2">
                          <input
                            type="number"
                            value={ref.proteina}
                            onChange={e => updateRefeicao(i, 'proteina', e.target.value)}
                            placeholder="Proteína"
                            className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 border border-white/[0.06]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]">g prot</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={addRefeicao}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/[0.1] text-zinc-500 text-sm hover:border-white/20 hover:text-zinc-300 transition-all active:scale-95">
                  + Adicionar refeição
                </button>

                {refeicoesEd.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.04] px-4 py-3 flex items-center justify-between" style={{ background: '#0a0a0a' }}>
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">Total calculado</p>
                      <div className="flex gap-3">
                        <span className="text-orange-400 text-sm font-bold">
                          {Math.round(refeicoesEd.reduce((s, r) => s + (parseFloat(r.calorias) || 0), 0))} kcal
                        </span>
                        <span className="text-blue-400 text-sm font-bold">
                          {Math.round(refeicoesEd.reduce((s, r) => s + (parseFloat(r.proteina) || 0), 0))}g prot
                        </span>
                      </div>
                    </div>
                    {metaCal && <p className="text-zinc-700 text-[10px]">Meta: {metaCal}kcal</p>}
                  </div>
                )}

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
                {['Analisando perfil e objetivos', 'Calculando distribuição calórica', 'Selecionando alimentos', 'Montando refeições e macros'].map((msg, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin shrink-0" style={{ animationDelay: `${i * 0.15}s` }} />
                    <p className="text-zinc-500 text-sm">{msg}</p>
                  </div>
                ))}
              </div>
            ) : planoAtivo && planoEstruturado ? (
              <>
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
                      <button onClick={() => iniciarEdicao(false)} className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">✏️ Editar</button>
                      <button onClick={gerarPlanoIA} className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white transition-all active:scale-95">↻ IA</button>
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
                <div className="space-y-2">
                  {planoEstruturado.refeicoes.map((ref: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-base shrink-0">
                          {['☀️','🍎','🍽️','⚡','💪','🌙'][i] ?? '🥗'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-bold text-sm">{ref.nome}</p>
                            {ref.horario && <span className="text-zinc-600 text-[10px] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">{ref.horario}</span>}
                          </div>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-orange-400 text-[11px] font-semibold">{ref.calorias} kcal</span>
                            <span className="text-blue-400 text-[11px]">{ref.proteina}g prot</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-green-500/20 p-6 text-center" style={{ background: 'linear-gradient(145deg,#0a0d14,#080a10)' }}>
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">🥗</div>
                <p className="text-green-400 text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">Plano alimentar</p>
                <p className="text-white font-black text-xl mb-2">Criar dieta personalizada</p>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">Gere via IA ou monte manualmente com as refeições e macros do seu paciente.</p>
                <div className="flex gap-2">
                  <button onClick={gerarPlanoIA}
                    className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all">
                    ✦ Gerar com IA
                  </button>
                  <button onClick={() => iniciarEdicao(true)}
                    className="flex-1 border border-white/[0.1] text-zinc-300 font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all hover:border-white/20">
                    ✏️ Manual
                  </button>
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
