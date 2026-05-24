'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Paciente = {
  id: string
  cliente_id: string
  nome: string | null
  email: string
  peso: number | null
  objetivo: string | null
}

type Stats = {
  caloriasHoje: number | null
  metaCalorias: number | null
  proteínaHoje: number | null
  metaProteina: number | null
  diasRegistro7d: number
  ultimoRegistro: string | null
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const p = nome.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function diasSemRegistrar(ultimoRegistro: string | null): number {
  if (!ultimoRegistro) return 999
  const d = new Date(ultimoRegistro + 'T12:00:00-03:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
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

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

export default function NutricionistaPacientes() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [carregando, setCarregando] = useState(true)
  const [totalAderiuHoje, setTotalAderiuHoje] = useState(0)
  const [mediaAdesao, setMediaAdesao] = useState<number | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const { data: vinculos } = await supabase
        .from('vinculos')
        .select('id, cliente_id, ativo')
        .eq('profissional_id', session.user.id)
        .eq('tipo', 'nutricionista')

      if (!vinculos?.length) { setCarregando(false); return }

      const ids = vinculos.map(v => v.cliente_id)
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome, email, peso, objetivo')
        .in('id', ids)

      const pacientesData: Paciente[] = vinculos.map(v => {
        const p = perfis?.find(x => x.id === v.cliente_id)
        return { id: v.id, cliente_id: v.cliente_id, nome: p?.nome ?? null, email: p?.email ?? '', peso: p?.peso ?? null, objetivo: p?.objetivo ?? null, ativo: v.ativo }
      })
      setPacientes(pacientesData)

      const hoje = getTodayBR()
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const statsMap: Record<string, Stats> = {}
      let countAderiuHoje = 0
      const adesoes: number[] = []

      await Promise.all(pacientesData.map(async (pac) => {
        const meta = getMetaCalorias(pac.peso, pac.objetivo)
        const metaProt = getMetaProteina(pac.peso, pac.objetivo)

        const [{ data: nutricaoHoje }, { data: nutricao7d }] = await Promise.all([
          supabase.from('nutricao').select('calorias, proteina').eq('usuario_id', pac.cliente_id).eq('data', hoje).single(),
          supabase.from('nutricao').select('data, calorias').eq('usuario_id', pac.cliente_id).gte('data', semanaStr).order('data', { ascending: false }),
        ])

        const diasRegistro = nutricao7d?.length ?? 0
        const adesao7d = Math.round((diasRegistro / 7) * 100)
        adesoes.push(adesao7d)

        if (nutricaoHoje?.calorias) countAderiuHoje++

        statsMap[pac.cliente_id] = {
          caloriasHoje: nutricaoHoje?.calorias ?? null,
          metaCalorias: meta,
          proteínaHoje: nutricaoHoje?.proteina ?? null,
          metaProteina: metaProt,
          diasRegistro7d: diasRegistro,
          ultimoRegistro: nutricao7d?.[0]?.data ?? null,
        }
      }))

      setStats(statsMap)
      setTotalAderiuHoje(countAderiuHoje)
      if (adesoes.length) setMediaAdesao(Math.round(adesoes.reduce((a, b) => a + b, 0) / adesoes.length))
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const alertas = pacientes.filter(p => {
    const s = stats[p.cliente_id]
    return s && diasSemRegistrar(s.ultimoRegistro) >= 2
  })

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1 hover:text-zinc-400 transition-colors">
              ← Dashboard
            </button>
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
            {/* Stats gerais */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { val: pacientes.length, label: 'Pacientes', sub: 'ativos', icon: '👥' },
                { val: totalAderiuHoje, label: 'Registraram', sub: 'hoje', icon: '🥗' },
                { val: mediaAdesao != null ? `${mediaAdesao}%` : '—', label: 'Adesão', sub: '7 dias', icon: '📊' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-4 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
                  <p className="text-lg mb-1">{s.icon}</p>
                  <p className="text-white text-2xl font-black">{s.val}</p>
                  <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Alertas */}
            {alertas.length > 0 && (
              <div className="rounded-2xl p-4 border border-orange-500/20 bg-orange-500/5 mb-4">
                <p className="text-orange-400 text-[10px] uppercase tracking-[0.15em] mb-3">⚠ Sem registro alimentar</p>
                <div className="space-y-2">
                  {alertas.map(p => {
                    const dias = diasSemRegistrar(stats[p.cliente_id]?.ultimoRegistro)
                    return (
                      <button key={p.id} onClick={() => router.push(`/nutricionista/paciente/${p.cliente_id}`)}
                        className="w-full flex items-center gap-3 text-left active:scale-95 transition-all">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                          <span className="text-orange-400 text-xs font-black">{getInitials(p.nome, p.email)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{p.nome ?? p.email}</p>
                          <p className="text-orange-400/70 text-[11px]">
                            {dias === 999 ? 'Nunca registrou' : `${dias} dia${dias !== 1 ? 's' : ''} sem registrar`}
                          </p>
                        </div>
                        <span className="text-zinc-700 text-sm">→</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lista de pacientes */}
            <div className="space-y-3">
              {pacientes.map((pac) => {
                const s = stats[pac.cliente_id]
                const initials = getInitials(pac.nome, pac.email)
                const diasSem = diasSemRegistrar(s?.ultimoRegistro)
                const registrouHoje = !!s?.caloriasHoje
                const emRisco = diasSem >= 2
                const adesao = s ? Math.round((s.diasRegistro7d / 7) * 100) : null

                let calPct: number | null = null
                if (s?.caloriasHoje && s?.metaCalorias) {
                  calPct = Math.round((s.caloriasHoje / s.metaCalorias) * 100)
                }

                return (
                  <button key={pac.id} onClick={() => router.push(`/nutricionista/paciente/${pac.cliente_id}`)}
                    className="w-full text-left rounded-2xl p-5 border border-white/[0.06] active:scale-[0.98] transition-all"
                    style={{ background: '#0f0f0f' }}>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${registrouHoje ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/[0.06] border border-white/[0.08]'}`}>
                          <span className={`font-black text-sm ${registrouHoje ? 'text-green-400' : 'text-zinc-400'}`}>{initials}</span>
                        </div>
                        {registrouHoje && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0f0f0f]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-base truncate">{pac.nome ?? pac.email}</p>
                          {registrouHoje && <span className="text-[9px] text-green-400 border border-green-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider shrink-0">Registrou hoje</span>}
                          {emRisco && !registrouHoje && <span className="text-[9px] text-orange-400 border border-orange-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider shrink-0">Atenção</span>}
                        </div>
                        <p className="text-zinc-600 text-xs truncate">{pac.email}</p>
                        {pac.objetivo && <p className="text-zinc-700 text-[10px] mt-0.5">{OBJETIVO_LABEL[pac.objetivo] ?? pac.objetivo}</p>}
                      </div>
                      <span className="text-zinc-700 text-lg shrink-0">→</span>
                    </div>

                    {s && (
                      <div className="flex gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Calorias hoje</p>
                          {s.caloriasHoje ? (
                            <p className={`text-sm font-bold ${calPct != null && calPct >= 90 && calPct <= 115 ? 'text-green-400' : calPct != null && calPct < 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                              {s.caloriasHoje}kcal
                            </p>
                          ) : <p className="text-zinc-600 text-sm font-bold">—</p>}
                        </div>
                        <div className="w-px bg-white/[0.06]" />
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Meta</p>
                          <p className="text-zinc-400 text-sm font-bold">{s.metaCalorias ? `${s.metaCalorias}kcal` : '—'}</p>
                        </div>
                        <div className="w-px bg-white/[0.06]" />
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Adesão 7d</p>
                          <p className={`text-sm font-bold ${adesao != null && adesao >= 70 ? 'text-green-400' : adesao != null && adesao >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {adesao != null ? `${adesao}%` : '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {[
            { id: 'home',      label: 'Início',    path: '/dashboard',                  active: false },
            { id: 'pacientes', label: 'Pacientes', path: '/nutricionista/pacientes',     active: true  },
            { id: 'perfil',    label: 'Perfil',    path: '/perfil',                      active: false },
          ].map(item => (
            <button key={item.id} onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-all active:scale-90">
              <span className={`text-[10px] uppercase tracking-[0.12em] font-semibold transition-all ${item.active ? 'text-white' : 'text-zinc-600'}`}>{item.label}</span>
              {item.active && <div className="w-1 h-1 rounded-full bg-green-400" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}
