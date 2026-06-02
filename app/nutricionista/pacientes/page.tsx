'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'
import SidebarProfissional from '../../components/SidebarProfissional'

type Paciente = {
  id: string; cliente_id: string; nome: string | null; email: string
  peso: number | null; objetivo: string | null
}
type Stats = {
  sonoScore: number | null; sonoHoras: number | null
  treinos7d: number; ultimoTreino: string | null
  kcal7d: number
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

      const hoje = getTodayBR()
      const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      // 4 queries paralelas para todos os pacientes de uma vez
      const [{ data: sonos }, { data: treinos }, { data: atividades }, { data: planos }] = await Promise.all([
        supabase.from('sono').select('usuario_id, score_recuperacao, duracao').in('usuario_id', ids).eq('data', hoje),
        supabase.from('treinos').select('cliente_id, data, calorias_estimadas').in('cliente_id', ids).gte('data', semStr).eq('concluido', true).order('data', { ascending: false }),
        supabase.from('atividades_livres').select('usuario_id, calorias_estimadas, calorias_wearable').in('usuario_id', ids).gte('data', semStr),
        supabase.from('planos_nutricionais').select('usuario_id').in('usuario_id', ids).eq('ativo', true),
      ])

      const kcalMap = new Map<string, number>()
      treinos?.forEach(t => {
        if (t.calorias_estimadas) kcalMap.set(t.cliente_id, (kcalMap.get(t.cliente_id) ?? 0) + t.calorias_estimadas)
      })
      atividades?.forEach(a => {
        const kcal = a.calorias_wearable ?? a.calorias_estimadas ?? 0
        if (kcal) kcalMap.set(a.usuario_id, (kcalMap.get(a.usuario_id) ?? 0) + kcal)
      })

      const statsMap: Record<string, Stats> = {}
      for (const p of pacientesData) {
        const sono = sonos?.find(s => s.usuario_id === p.cliente_id)
        const treinosPac = treinos?.filter(t => t.cliente_id === p.cliente_id) ?? []
        const temPlano = !!(planos?.find(pl => pl.usuario_id === p.cliente_id))
        statsMap[p.cliente_id] = {
          sonoScore: sono?.score_recuperacao ?? null,
          sonoHoras: sono?.duracao ?? null,
          treinos7d: treinosPac.length,
          ultimoTreino: treinosPac[0]?.data ?? null,
          kcal7d: kcalMap.get(p.cliente_id) ?? 0,
          temPlano,
        }
      }
      setStats(statsMap)
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const comBoaSono = pacientes.filter(p => (stats[p.cliente_id]?.sonoScore ?? 0) >= 60).length
  const treinaram = pacientes.filter(p => (stats[p.cliente_id]?.treinos7d ?? 0) > 0).length

  return (
    <main className="min-h-[100dvh] text-white md:flex" style={{ background: '#0d1117' }}>
      <SidebarProfissional tipo="nutricionista" />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div className="max-w-md mx-auto px-4 pb-28 md:max-w-4xl md:px-8 md:max-w-3xl md:px-8" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-zinc-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-1 hover:text-zinc-300 transition-colors">← Dashboard</button>
            <h1 className="text-3xl font-black text-white tracking-tight">Pacientes</h1>
            <p className="text-zinc-500 text-sm mt-1">{pacientes.length} vinculado{pacientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => router.push('/convite')} className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2.5 rounded-xl text-sm active:scale-95 transition-all">+ Convidar</button>
        </div>

        {/* Busca */}
        {pacientes.length > 0 && (
          <div className="mb-5">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.09]"
              style={{ background: '#131b2e' }}
            />
          </div>
        )}

        {pacientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/[0.11] flex items-center justify-center text-3xl opacity-40">🥗</div>
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
                <div key={i} className="rounded-2xl p-4 border border-white/[0.11] text-center" style={{ background: '#131b2e' }}>
                  <p className="text-lg mb-1">{s.icon}</p>
                  <p className="text-white text-2xl font-black">{s.val}</p>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de pacientes */}
            <div className="space-y-2">
              {pacientes
                .filter(pac => busca === '' || (pac.nome ?? pac.email).toLowerCase().includes(busca.toLowerCase()))
                .map((pac) => {
                const s = stats[pac.cliente_id]
                const initials = getInitials(pac.nome, pac.email)

                return (
                  <button key={pac.id} onClick={() => router.push(`/nutricionista/paciente/${pac.cliente_id}`)}
                    className="w-full text-left rounded-xl px-5 py-4 border border-white/[0.08] active:scale-[0.99] transition-all hover:border-white/[0.14]"
                    style={{ background: '#131b2e' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.07] border border-white/[0.09] flex items-center justify-center shrink-0">
                        <span className="font-bold text-sm text-zinc-300">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-white font-semibold text-base truncate">{pac.nome ?? pac.email}</p>
                          {!s?.temPlano && <span className="text-xs text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">Sem plano</span>}
                        </div>
                        <div className="flex items-center gap-4 text-zinc-500 text-xs">
                          {pac.objetivo && <span>{OBJETIVO_LABEL[pac.objetivo] ?? pac.objetivo}</span>}
                          {s?.sonoScore != null && <span>Recuperação: {s.sonoScore}/100</span>}
                          {(s?.treinos7d ?? 0) > 0 && <span>{s!.treinos7d}x treinos</span>}
                          {(s?.kcal7d ?? 0) > 0 && <span>~{s!.kcal7d} kcal/sem.</span>}
                        </div>
                      </div>
                      <span className="text-zinc-600 shrink-0">→</span>
                    </div>
                  </button>
                )
              })}
              {busca && pacientes.filter(pac => (pac.nome ?? pac.email).toLowerCase().includes(busca.toLowerCase())).length === 0 && (
                <p className="text-center text-zinc-500 text-sm py-8">Nenhum paciente encontrado para "{busca}"</p>
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

