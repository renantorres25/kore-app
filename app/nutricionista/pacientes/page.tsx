'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'
import SidebarProfissional from '../../components/SidebarProfissional'
import { ChevronRight } from 'lucide-react'

type Paciente = {
  id: string; cliente_id: string; nome: string | null; email: string
  peso: number | null; objetivo: string | null
}
type AlertaNivel = 'vermelho' | 'amarelo' | 'verde' | 'cinza'
type AlertaInfo = { nivel: AlertaNivel; causas: string[] }
type Stats = {
  sonoScore: number | null; sonoHoras: number | null
  treinos7d: number; ultimoTreino: string | null
  kcal7d: number; temPlano: boolean
  alerta: AlertaInfo
}

function getInitials(nome: string | null, email: string) {
  if (nome) { const p = nome.trim().split(' '); return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0][0]).toUpperCase() }
  return email[0].toUpperCase()
}
function getTodayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function getDateOffset(days: number) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T12:00:00-03:00').getTime() - new Date(a + 'T12:00:00-03:00').getTime()) / 86400000)
}
function avg(arr: number[]) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null }

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}
const NIVEL_ORDER: Record<AlertaNivel, number> = { vermelho: 0, amarelo: 1, verde: 2, cinza: 3 }
const ALERTA_CFG: Record<AlertaNivel, { dot: string; border: string; bg: string; causaColor: string }> = {
  vermelho: { dot: 'bg-red-400',     border: 'border-red-500/20',   bg: 'bg-red-500/[0.04]',   causaColor: 'text-red-300' },
  amarelo:  { dot: 'bg-amber-400',   border: 'border-amber-500/20', bg: 'bg-amber-500/[0.04]', causaColor: 'text-amber-300' },
  verde:    { dot: 'bg-emerald-400', border: 'border-white/[0.07]', bg: '',                    causaColor: 'text-emerald-600' },
  cinza:    { dot: 'bg-zinc-600',    border: 'border-white/[0.07]', bg: '',                    causaColor: 'text-zinc-600' },
}

function computeAlerta(
  sonoArr: { data: string; score_recuperacao: number | null }[],
  treinosArr: { data: string }[],
  ativsArr: { data: string; duracao_min: number | null }[],
  medidasArr: { data: string; peso: number | null }[],
  objetivo: string | null
): AlertaInfo {
  const hoje = getTodayBR()
  const q7  = getDateOffset(7)
  const q14 = getDateOffset(14)

  const causas: string[] = []
  let nivelMax: AlertaNivel = 'verde'
  const promover = (n: AlertaNivel) => {
    if (n === 'vermelho') nivelMax = 'vermelho'
    else if (n === 'amarelo' && nivelMax !== 'vermelho') nivelMax = 'amarelo'
  }

  // 1. Sono: queda > 20% vs semana anterior → vermelho; > 10% → amarelo
  const sono7curr = sonoArr.filter(s => s.data >= q7  && s.score_recuperacao != null).map(s => s.score_recuperacao!)
  const sono7prev = sonoArr.filter(s => s.data >= q14 && s.data < q7 && s.score_recuperacao != null).map(s => s.score_recuperacao!)
  if (sono7curr.length >= 2 && sono7prev.length >= 2) {
    const avgC = avg(sono7curr)!
    const avgP = avg(sono7prev)!
    if (avgP > 0) {
      const queda = (avgP - avgC) / avgP
      if (queda >= 0.20) { causas.push(`Sono caiu ${Math.round(queda * 100)}%`); promover('vermelho') }
      else if (queda >= 0.10) { causas.push(`Sono caiu ${Math.round(queda * 100)}%`); promover('amarelo') }
    }
  }

  // 2. Peso estagnado > 10 dias (só para objetivos de composição)
  if (objetivo === 'perder_peso' || objetivo === 'ganhar_massa') {
    const medOrdenadas = [...medidasArr].sort((a, b) => b.data.localeCompare(a.data))
    if (medOrdenadas.length >= 1) {
      const diasSemPesar = daysBetween(medOrdenadas[0].data, hoje)
      if (diasSemPesar >= 14) {
        causas.push(`Sem pesagem há ${diasSemPesar} dias`)
        promover(diasSemPesar >= 21 ? 'vermelho' : 'amarelo')
      } else if (medOrdenadas.length >= 2) {
        const [ult, ant] = medOrdenadas
        if (ult.peso != null && ant.peso != null) {
          const diasEnt = daysBetween(ant.data, ult.data)
          if (diasEnt >= 10 && Math.abs(ult.peso - ant.peso) < 0.5) {
            causas.push(`Peso estagnado ${diasEnt} dias`)
            promover('vermelho')
          }
        }
      }
    }
  }

  // 3. Volume +30% sem melhora de recuperação → vermelho; +15% → amarelo
  const vol7  = ativsArr.filter(a => a.data >= q7).reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosArr.filter(t => t.data >= q7).length * 60
  const vol14 = ativsArr.filter(a => a.data >= q14 && a.data < q7).reduce((s, a) => s + (a.duracao_min ?? 0), 0) + treinosArr.filter(t => t.data >= q14 && t.data < q7).length * 60
  if (vol14 > 60 && vol7 > 0) {
    const aumento = (vol7 - vol14) / vol14
    const sonoNaoMelhorou = !(sono7curr.length >= 2 && sono7prev.length >= 2 && avg(sono7curr)! > avg(sono7prev)!)
    if (aumento >= 0.30 && sonoNaoMelhorou) {
      causas.push(`Volume de treino +${Math.round(aumento * 100)}%`)
      promover('vermelho')
    } else if (aumento >= 0.15) {
      causas.push(`Volume +${Math.round(aumento * 100)}%`)
      promover('amarelo')
    }
  }

  // Sem nenhum dado → cinza
  const temDados = sonoArr.length > 0 || medidasArr.length > 0 || treinosArr.length > 0 || ativsArr.length > 0
  if (!temDados) return { nivel: 'cinza', causas: [] }

  return { nivel: nivelMax, causas: causas.slice(0, 3) }
}

export default function NutricionistaPacientes() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: vinculos } = await supabase
        .from('vinculos').select('id, cliente_id, ativo')
        .eq('profissional_id', session.user.id).eq('tipo', 'nutricionista')

      if (!vinculos?.length) { setCarregando(false); return }
      const ids = vinculos.map(v => v.cliente_id)

      const { data: perfis } = await supabase
        .from('perfis').select('id, nome, email, peso, objetivo').in('id', ids)

      const pacientesData: Paciente[] = vinculos.map(v => {
        const p = perfis?.find(x => x.id === v.cliente_id)
        return { id: v.id, cliente_id: v.cliente_id, nome: p?.nome ?? null, email: p?.email ?? '', peso: p?.peso ?? null, objetivo: p?.objetivo ?? null }
      })
      setPacientes(pacientesData)

      const hoje    = getTodayBR()
      const q7str   = getDateOffset(7)
      const q14str  = getDateOffset(14)
      const q60str  = getDateOffset(60)

      const [{ data: sonos14d }, { data: treinos14d }, { data: ativs14d }, { data: planos }, { data: medidas60d }] = await Promise.all([
        supabase.from('sono').select('usuario_id, data, score_recuperacao, duracao_minutos').in('usuario_id', ids).gte('data', q14str),
        supabase.from('treinos').select('cliente_id, data, calorias_estimadas').in('cliente_id', ids).gte('data', q14str).eq('concluido', true).order('data', { ascending: false }),
        supabase.from('atividades_livres').select('usuario_id, data, duracao_min, calorias_estimadas, calorias_wearable').in('usuario_id', ids).gte('data', q14str),
        supabase.from('planos_nutricionais').select('usuario_id').in('usuario_id', ids).eq('ativo', true),
        supabase.from('evolucao_medidas').select('cliente_id, data, peso').in('cliente_id', ids).gte('data', q60str).order('data'),
      ])

      const statsMap: Record<string, Stats> = {}
      for (const pac of pacientesData) {
        const cid       = pac.cliente_id
        const pacSono   = sonos14d?.filter(s => s.usuario_id === cid) ?? []
        const pacTreinos = treinos14d?.filter(t => t.cliente_id === cid) ?? []
        const pacAtivs  = ativs14d?.filter(a => a.usuario_id === cid) ?? []
        const pacMedidas = medidas60d?.filter(m => m.cliente_id === cid) ?? []

        const sonoHoje  = pacSono.find(s => s.data === hoje)
        const treinos7d = pacTreinos.filter(t => t.data >= q7str)
        const ativs7d   = pacAtivs.filter(a => a.data >= q7str)
        const kcal7d    = [
          ...treinos7d.map(t => t.calorias_estimadas ?? 0),
          ...ativs7d.map(a => a.calorias_wearable ?? a.calorias_estimadas ?? 0),
        ].reduce((s, v) => s + v, 0)

        statsMap[cid] = {
          sonoScore: sonoHoje?.score_recuperacao ?? null,
          sonoHoras: sonoHoje?.duracao_minutos ? Math.round((sonoHoje.duracao_minutos / 60) * 10) / 10 : null,
          treinos7d: treinos7d.length,
          ultimoTreino: treinos7d[0]?.data ?? null,
          kcal7d,
          temPlano: !!(planos?.find(pl => pl.usuario_id === cid)),
          alerta: computeAlerta(pacSono, pacTreinos, pacAtivs, pacMedidas, pac.objetivo),
        }
      }
      setStats(statsMap)
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const pacientesFiltrados = pacientes
    .filter(p => busca === '' || (p.nome ?? p.email).toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => NIVEL_ORDER[stats[a.cliente_id]?.alerta?.nivel ?? 'cinza'] - NIVEL_ORDER[stats[b.cliente_id]?.alerta?.nivel ?? 'cinza'])

  const counts = {
    vermelho: pacientes.filter(p => stats[p.cliente_id]?.alerta?.nivel === 'vermelho').length,
    amarelo:  pacientes.filter(p => stats[p.cliente_id]?.alerta?.nivel === 'amarelo').length,
    verde:    pacientes.filter(p => stats[p.cliente_id]?.alerta?.nivel === 'verde').length,
    cinza:    pacientes.filter(p => stats[p.cliente_id]?.alerta?.nivel === 'cinza').length,
  }
  const temAlerta = counts.vermelho > 0 || counts.amarelo > 0

  return (
    <main className="min-h-[100dvh] text-white md:flex">
      <SidebarProfissional tipo="nutricionista" />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
        <div className="max-w-md mx-auto px-4 pb-28 md:max-w-3xl md:px-8"
          style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <button onClick={() => router.push('/dashboard')}
                className="text-zinc-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-1 hover:text-zinc-300 transition-colors">
                ← Dashboard
              </button>
              <h1 className="text-3xl font-black text-white tracking-tight">Pacientes</h1>
              <p className="text-zinc-500 text-sm mt-1">{pacientes.length} vinculado{pacientes.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => router.push('/convite')}
              className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2.5 rounded-xl text-sm active:scale-95 transition-all">
              + Convidar
            </button>
          </div>

          {pacientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.05] flex items-center justify-center text-3xl opacity-40">🥗</div>
              <div className="text-center">
                <p className="text-white font-bold mb-1">Nenhum paciente ainda</p>
                <p className="text-zinc-600 text-sm">Convide seu primeiro paciente para começar</p>
              </div>
              <button onClick={() => router.push('/convite')}
                className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">
                + Convidar paciente
              </button>
            </div>
          ) : (
            <>
              {/* Painel de alertas — resumo */}
              <div className="mb-5 rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20 }}>
                <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Painel de alertas — últimos 14 dias</p>
                </div>
                <div className="px-5 py-4 flex items-center gap-6 flex-wrap">
                  {[
                    { nivel: 'vermelho' as AlertaNivel, label: 'Risco alto',  dot: 'bg-red-400',     count: counts.vermelho },
                    { nivel: 'amarelo'  as AlertaNivel, label: 'Atenção',     dot: 'bg-amber-400',   count: counts.amarelo  },
                    { nivel: 'verde'    as AlertaNivel, label: 'No caminho',  dot: 'bg-emerald-400', count: counts.verde    },
                    { nivel: 'cinza'    as AlertaNivel, label: 'Insuficiente',dot: 'bg-zinc-600',    count: counts.cinza    },
                  ].map(({ label, dot, count }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                      <span className="text-white font-black text-xl leading-none">{count}</span>
                      <span className="text-zinc-500 text-xs">{label}</span>
                    </div>
                  ))}
                </div>
                {!temAlerta && (
                  <div className="px-5 pb-4">
                    <p className="text-emerald-500 text-xs">Todos os pacientes estão estáveis neste momento.</p>
                  </div>
                )}
              </div>

              {/* Busca */}
              <div className="mb-4">
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou email..."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-white/20"
                  style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20 }} />
              </div>

              {/* Lista de pacientes */}
              <div className="space-y-2">
                {pacientesFiltrados.map((pac) => {
                  const s = stats[pac.cliente_id]
                  const alerta = s?.alerta ?? { nivel: 'cinza' as AlertaNivel, causas: [] }
                  const cfg = ALERTA_CFG[alerta.nivel]

                  return (
                    <button key={pac.id}
                      onClick={() => router.push(`/nutricionista/paciente/${pac.cliente_id}`)}
                      className={`w-full text-left rounded-xl px-5 py-4 active:scale-[0.99] transition-all border ${cfg.border} ${cfg.bg}`}>
                      <div className="flex items-start gap-4">
                        {/* Avatar + dot de alerta */}
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center">
                            <span className="font-bold text-sm text-zinc-300">{getInitials(pac.nome, pac.email)}</span>
                          </div>
                          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-base,#0d1117)] ${cfg.dot}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Nome + badges */}
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-white font-semibold text-base truncate">{pac.nome ?? pac.email}</p>
                            {!s?.temPlano && (
                              <span className="text-[10px] text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
                                Sem plano
                              </span>
                            )}
                          </div>

                          {/* Objetivo + métricas rápidas */}
                          <div className="flex items-center gap-3 text-zinc-500 text-xs mb-2 flex-wrap">
                            {pac.objetivo && <span>{OBJETIVO_LABEL[pac.objetivo] ?? pac.objetivo}</span>}
                            {s?.sonoScore != null && <span>Rec: {s.sonoScore}/100</span>}
                            {(s?.treinos7d ?? 0) > 0 && <span>{s!.treinos7d} treino{s!.treinos7d !== 1 ? 's' : ''}/sem.</span>}
                            {(s?.kcal7d ?? 0) > 0 && <span>~{s!.kcal7d.toLocaleString('pt-BR')} kcal</span>}
                          </div>

                          {/* Causas do alerta */}
                          {alerta.causas.length > 0 ? (
                            <p className={`text-xs leading-relaxed font-medium ${cfg.causaColor}`}>
                              {alerta.causas.join(' · ')}
                            </p>
                          ) : alerta.nivel === 'verde' ? (
                            <p className="text-xs text-emerald-700">Métricas estáveis</p>
                          ) : alerta.nivel === 'cinza' ? (
                            <p className="text-xs text-zinc-600">Dados insuficientes para análise</p>
                          ) : null}
                        </div>

                        <ChevronRight size={16} className="text-zinc-600 shrink-0 mt-1.5" />
                      </div>
                    </button>
                  )
                })}

                {busca && pacientesFiltrados.length === 0 && (
                  <p className="text-center text-zinc-500 text-sm py-8">
                    Nenhum paciente encontrado para &quot;{busca}&quot;
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="md:hidden"><NavBar tipo="nutricionista" ativa="pacientes" /></div>
      </div>
    </main>
  )
}
