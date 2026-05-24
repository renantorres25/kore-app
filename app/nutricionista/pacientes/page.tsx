'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

type Paciente = {
  id: string; cliente_id: string; nome: string | null; email: string
  peso: number | null; objetivo: string | null
}
type Stats = {
  sonoScore: number | null; sonoHoras: number | null
  treinos7d: number; ultimoTreino: string | null
  energia: number | null; humor: number | null
  temPlano: boolean
}

function getInitials(nome: string | null, email: string) {
  if (nome) { const p = nome.trim().split(' '); return (p.length >= 2 ? p[0][0] + p[p.length-1][0] : p[0][0]).toUpperCase() }
  return email[0].toUpperCase()
}
function getTodayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

export default function NutricionistaPacientes() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

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

      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      // 4 queries paralelas para todos os pacientes de uma vez
      const [{ data: sonos }, { data: treinos }, { data: bems }, { data: planos }] = await Promise.all([
        supabase.from('sono').select('usuario_id, score_recuperacao, duracao').in('usuario_id', ids).eq('data', hoje),
        supabase.from('treinos').select('cliente_id, data, calorias_estimadas').in('cliente_id', ids).gte('data', semStr).eq('concluido', true).order('data', { ascending: false }),
        supabase.from('bem_estar').select('usuario_id, humor, energia').in('usuario_id', ids).eq('data', hoje),
        supabase.from('planos_nutricionais').select('usuario_id').in('usuario_id', ids).eq('ativo', true),
      ])

      const statsMap: Record<string, Stats> = {}
      for (const p of pacientesData) {
        const sono = sonos?.find(s => s.usuario_id === p.cliente_id)
        const bem = bems?.find(b => b.usuario_id === p.cliente_id)
        const treinosPac = treinos?.filter(t => t.cliente_id === p.cliente_id) ?? []
        const temPlano = !!(planos?.find(pl => pl.usuario_id === p.cliente_id))
        statsMap[p.cliente_id] = {
          sonoScore: sono?.score_recuperacao ?? null,
          sonoHoras: sono?.duracao ?? null,
          treinos7d: treinosPac.length,
          ultimoTreino: treinosPac[0]?.data ?? null,
          energia: bem?.energia ?? null,
          humor: bem?.humor ?? null,
          temPlano,
        }
      }
      setStats(statsMap)
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const comBoaSono = pacientes.filter(p => (stats[p.cliente_id]?.sonoScore ?? 0) >= 60).length
  const treinaram = pacientes.filter(p => (stats[p.cliente_id]?.treinos7d ?? 0) > 0).length

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1 hover:text-zinc-400 transition-colors">← Dashboard</button>
            <h1 className="text-2xl font-black text-white tracking-tight">Meus Pacientes</h1>
            <p className="text-zinc-600 text-xs mt-1">{pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} vinculado{pacientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => router.push('/convite')} className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center text-lg font-black active:scale-90 transition-all">+</button>
        </div>

        {pacientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">🥗</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Nenhum paciente ainda</p>
              <p className="text-zinc-600 text-sm">Convide seu primeiro paciente para começar</p>
            </div>
            <button onClick={() => router.push('/convite')} className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">+ Convidar paciente</button>
          </div>
        ) : (
          <>
            {/* Stats profissionais */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { val: pacientes.length,   label: 'Pacientes',     sub: 'ativos',    icon: '👥' },
                { val: treinaram,           label: 'Treinaram',     sub: 'essa semana', icon: '🏋️' },
                { val: comBoaSono,          label: 'Boa recuperação', sub: 'hoje', icon: '😴' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-4 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
                  <p className="text-lg mb-1">{s.icon}</p>
                  <p className="text-white text-2xl font-black">{s.val}</p>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de pacientes */}
            <div className="space-y-3">
              {pacientes.map((pac) => {
                const s = stats[pac.cliente_id]
                const initials = getInitials(pac.nome, pac.email)
                const sonoOk = s?.sonoScore != null && s.sonoScore >= 60
                const sonoBaixo = s?.sonoScore != null && s.sonoScore < 50
                const treinou = (s?.treinos7d ?? 0) > 0

                return (
                  <button key={pac.id} onClick={() => router.push(`/nutricionista/paciente/${pac.cliente_id}`)}
                    className="w-full text-left rounded-2xl p-5 border border-white/[0.06] active:scale-[0.98] transition-all"
                    style={{ background: '#0f0f0f' }}>

                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${sonoOk ? 'bg-green-500/10 border border-green-500/20' : sonoBaixo ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.06] border border-white/[0.08]'}`}>
                        <span className={`font-black text-sm ${sonoOk ? 'text-green-400' : sonoBaixo ? 'text-red-400' : 'text-zinc-400'}`}>{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-base truncate">{pac.nome ?? pac.email}</p>
                          {!s?.temPlano && (
                            <span className="text-[9px] text-yellow-400 border border-yellow-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider shrink-0">Sem plano</span>
                          )}
                        </div>
                        <p className="text-zinc-600 text-xs truncate">{pac.email}</p>
                        {pac.objetivo && <p className="text-zinc-700 text-[10px] mt-0.5">{OBJETIVO_LABEL[pac.objetivo] ?? pac.objetivo}</p>}
                      </div>
                      <span className="text-zinc-700 text-lg shrink-0">→</span>
                    </div>

                    {/* Métricas profissionais */}
                    <div className="flex gap-0 mt-4 pt-4 border-t border-white/[0.04]">
                      {/* Sono */}
                      <div className="flex-1">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">😴 Sono</p>
                        {s?.sonoScore != null ? (
                          <div>
                            <p className={`text-sm font-bold ${s.sonoScore >= 70 ? 'text-green-400' : s.sonoScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{s.sonoScore}<span className="text-zinc-600 text-[9px]">/100</span></p>
                            {s.sonoHoras && <p className="text-zinc-700 text-[9px]">{s.sonoHoras}h</p>}
                          </div>
                        ) : <p className="text-zinc-700 text-sm">—</p>}
                      </div>
                      <div className="w-px bg-white/[0.05] mx-3" />
                      {/* Treinos */}
                      <div className="flex-1">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">🏋️ Treinos</p>
                        <p className={`text-sm font-bold ${treinou ? 'text-blue-400' : 'text-zinc-600'}`}>{s?.treinos7d ?? 0}<span className="text-zinc-600 text-[9px]"> /7d</span></p>
                        {s?.ultimoTreino && <p className="text-zinc-700 text-[9px]">Último: {s.ultimoTreino.slice(8,10)}/{s.ultimoTreino.slice(5,7)}</p>}
                      </div>
                      <div className="w-px bg-white/[0.05] mx-3" />
                      {/* Energia */}
                      <div className="flex-1">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">⚡ Energia</p>
                        {s?.energia != null ? (
                          <div>
                            <div className="flex gap-0.5 mt-1">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={`w-2.5 h-2 rounded-full ${i <= s.energia! ? (s.energia! >= 4 ? 'bg-green-400' : s.energia! >= 3 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/[0.08]'}`} />
                              ))}
                            </div>
                            <p className="text-zinc-700 text-[9px] mt-0.5">{s.energia}/5</p>
                          </div>
                        ) : <p className="text-zinc-700 text-sm">—</p>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <NavBar tipo="nutricionista" ativa="pacientes" />
    </main>
  )
}
