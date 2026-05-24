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
  altura: number | null
  idade: number | null
}

type NutricaoDia = {
  data: string
  calorias_total: number | null
  proteina_total: number | null
  carboidrato_total: number | null
  gordura_total: number | null
}

type TreinoDia = {
  data: string
  calorias_estimadas: number | null
  plano: string | null
}

type Sono = {
  score_recuperacao: number | null
  duracao: number | null
  hrv: number | null
}

type BemEstar = {
  humor: number
  energia: number
  motivacao: number
  dor_muscular: number
}

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
  const barPct = Math.min(pct, 100)
  return (
    <div className="mt-2">
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${barPct}%` }} />
      </div>
      <p className="text-zinc-700 text-[9px] mt-1">{pct}% da meta</p>
    </div>
  )
}

function getDiasSemana(baseDate: string, n = 7): string[] {
  const dias: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(baseDate + 'T12:00:00-03:00')
    d.setDate(d.getDate() - i)
    dias.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
  }
  return dias
}

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
  const [carregando, setCarregando] = useState(true)

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
      ] = await Promise.all([
        supabase.from('perfis').select('id, nome, email, peso, objetivo, altura, idade').eq('id', clienteId).single(),
        supabase.from('nutricao').select('data, calorias_total, proteina_total, carboidrato_total, gordura_total').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('nutricao').select('data, calorias_total, proteina_total, carboidrato_total, gordura_total').eq('usuario_id', clienteId).gte('data', semanaStr).order('data'),
        supabase.from('treinos').select('data, plano, calorias_estimadas').eq('cliente_id', clienteId).eq('data', hoje).eq('concluido', true).maybeSingle(),
        supabase.from('sono').select('score_recuperacao, duracao, hrv').eq('usuario_id', clienteId).eq('data', hoje).single(),
        supabase.from('bem_estar').select('humor, energia, motivacao, dor_muscular').eq('usuario_id', clienteId).eq('data', hoje).single(),
      ])

      if (perfil) setPaciente(perfil)
      setNutricaoHoje(nutHoje ?? null)
      setNutricao7d(nut7d ?? [])
      setTreinoHoje(trHoje ?? null)
      setSonoHoje(sono ?? null)
      setBemEstar(bem ?? null)
      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const metaCal = getMetaCalorias(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const metaProt = getMetaProteina(paciente?.peso ?? null, paciente?.objetivo ?? null)
  const calHoje = nutricaoHoje?.calorias_total ?? 0
  const protHoje = nutricaoHoje?.proteina_total ?? 0
  const gastoTreino = treinoHoje?.calorias_estimadas ?? 0
  const balanco = metaCal ? calHoje - gastoTreino - metaCal : null
  const hoje = getTodayBR()
  const dias7d = getDiasSemana(hoje, 7)
  const maxCal = Math.max(...nutricao7d.map(n => n.calorias_total ?? 0), metaCal ?? 1, 1)

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-16" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/nutricionista/pacientes')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">
            ← Pacientes
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 font-black text-base">{paciente ? getInitials(paciente.nome, paciente.email) : '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white tracking-tight truncate">{paciente?.nome ?? paciente?.email ?? 'Paciente'}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {paciente?.peso && <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">{paciente.peso}kg</span>}
                {paciente?.objetivo && <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">{OBJETIVO_LABEL[paciente.objetivo] ?? paciente.objetivo}</span>}
                {metaCal && <span className="text-[10px] text-green-500/70 bg-green-500/5 border border-green-500/15 rounded-full px-2 py-0.5">Meta: {metaCal}kcal</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nutrição hoje */}
        <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Nutrição de hoje</p>

          {nutricaoHoje ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Calorias */}
                <div className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Calorias</p>
                  <p className="text-white text-xl font-black">{calHoje}<span className="text-xs font-normal text-zinc-500"> kcal</span></p>
                  {metaCal && <BarraProgresso valor={calHoje} meta={metaCal} cor={calHoje >= metaCal * 0.9 && calHoje <= metaCal * 1.15 ? 'bg-green-500' : calHoje < metaCal * 0.7 ? 'bg-red-500' : 'bg-yellow-500'} />}
                </div>
                {/* Proteína */}
                <div className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Proteína</p>
                  <p className="text-white text-xl font-black">{protHoje}<span className="text-xs font-normal text-zinc-500"> g</span></p>
                  {metaProt && <BarraProgresso valor={protHoje} meta={metaProt} cor={protHoje >= metaProt * 0.9 ? 'bg-green-500' : protHoje >= metaProt * 0.6 ? 'bg-yellow-500' : 'bg-red-500'} />}
                </div>
              </div>

              {/* Macros secundários */}
              {(nutricaoHoje.carboidrato_total || nutricaoHoje.gordura_total) ? (
                <div className="flex gap-4 pt-3 border-t border-white/[0.04]">
                  {nutricaoHoje.carboidrato_total != null && (
                    <div>
                      <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Carb</p>
                      <p className="text-zinc-300 text-sm font-bold">{nutricaoHoje.carboidrato_total}g</p>
                    </div>
                  )}
                  {nutricaoHoje.gordura_total != null && (
                    <>
                      <div className="w-px bg-white/[0.06]" />
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Gordura</p>
                        <p className="text-zinc-300 text-sm font-bold">{nutricaoHoje.gordura_total}g</p>
                      </div>
                    </>
                  )}
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

        {/* Gasto no treino + balanço — DIFERENCIAL */}
        <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
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
                <p className={`text-sm font-black ${Math.abs(balanco) <= metaCal * 0.1 ? 'text-green-400' : balanco < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {balanco > 0 ? '+' : ''}{balanco} kcal
                </p>
              </div>
              <p className="text-zinc-600 text-[11px] mt-1">
                {Math.abs(balanco) <= metaCal * 0.1
                  ? 'Na meta — ótimo equilíbrio hoje'
                  : balanco < -metaCal * 0.15
                  ? 'Déficit além do planejado — verifique ingestão'
                  : 'Superávit em relação à meta'}
              </p>
            </div>
          )}

          {treinoHoje && (
            <p className="text-zinc-700 text-[10px] mt-3 text-center">
              Treino realizado: Plano {treinoHoje.plano ?? '?'} · {gastoTreino > 0 ? `~${gastoTreino} kcal estimadas` : 'sem estimativa de calorias'}
            </p>
          )}
        </div>

        {/* Contexto de recuperação */}
        {(sonoHoje || bemEstar) && (
          <div className="rounded-2xl p-5 border border-white/[0.06] mb-4" style={{ background: '#0f0f0f' }}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Contexto de hoje</p>
            <div className="grid grid-cols-2 gap-3">
              {sonoHoje?.score_recuperacao && (
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Recuperação</p>
                  <p className={`text-xl font-black ${sonoHoje.score_recuperacao >= 70 ? 'text-emerald-400' : sonoHoje.score_recuperacao >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {sonoHoje.score_recuperacao}<span className="text-xs font-normal text-zinc-600">/100</span>
                  </p>
                  {sonoHoje.duracao && <p className="text-zinc-700 text-[9px] mt-0.5">{sonoHoje.duracao}h de sono</p>}
                </div>
              )}
              {bemEstar && (
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">Bem-estar</p>
                  <div className="space-y-1.5 mt-1">
                    {[
                      { label: 'Humor', val: bemEstar.humor },
                      { label: 'Energia', val: bemEstar.energia },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center gap-2">
                        <p className="text-zinc-600 text-[9px] w-12">{label}</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`w-3 h-1.5 rounded-full ${i <= val ? (val >= 4 ? 'bg-green-400' : val >= 3 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/[0.06]'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tendência 7 dias */}
        <div className="rounded-2xl p-5 border border-white/[0.06]" style={{ background: '#0f0f0f' }}>
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-4">Tendência — 7 dias</p>
          <div className="flex items-end gap-1.5 h-24">
            {dias7d.map((dia) => {
              const reg = nutricao7d.find(n => n.data === dia)
              const cal = reg?.calorias_total ?? 0
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
                    <div
                      className={`w-full rounded-t-lg transition-all ${barColor} ${isHoje ? 'ring-1 ring-white/20' : ''}`}
                      style={{ height: h }}
                    />
                  </div>
                  <p className={`text-[8px] uppercase tracking-wider ${isHoje ? 'text-white' : 'text-zinc-700'}`}>{dd}/{mm}</p>
                  {cal > 0 && <p className="text-[7px] text-zinc-600">{cal}</p>}
                </div>
              )
            })}
          </div>
          {metaCal && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
              <div className="w-3 h-0.5 bg-green-500/50 rounded" />
              <p className="text-zinc-700 text-[9px]">Meta: {metaCal} kcal</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
