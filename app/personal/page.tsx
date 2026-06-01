'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

type Aluno = {
  id: string
  cliente_id: string
  nome: string | null
  email: string
  ativo: boolean
}

type Stats = {
  totalTreinos: number
  treinosSemana: number
  ultimoTreino: string | null
  scoreHoje: number | null
  treinouHoje: boolean
}

type FaseCiclo = {
  nomeCiclo: string
  nomeBloco: string
  tipoBloco: string
  semanaBloco: number
  totalSemanas: number
}

const TIPO_COR_LISTA: Record<string, string> = {
  hipertrofia: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  forca: 'text-orange-400 border-orange-500/20 bg-orange-500/10',
  resistencia: 'text-green-400 border-green-500/20 bg-green-500/10',
  deload: 'text-zinc-400 border-zinc-500/20 bg-zinc-500/10',
  adaptacao: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
  potencia: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10',
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function diasSemTreinar(ultimoTreino: string | null): number {
  if (!ultimoTreino) return 999
  const d = new Date(ultimoTreino + 'T12:00:00-03:00')
  const hoje = new Date()
  return Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export default function PersonalAlunos() {
  const router = useRouter()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [fases, setFases] = useState<Record<string, FaseCiclo | null>>({})
  const [carregando, setCarregando] = useState(true)
  const [totalTreinouHoje, setTotalTreinouHoje] = useState(0)
  const [mediaScore, setMediaScore] = useState<number | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: vinculos } = await supabase
        .from('vinculos')
        .select('id, cliente_id, ativo')
        .eq('profissional_id', session.user.id)
        .eq('tipo', 'personal')

      if (!vinculos?.length) { setCarregando(false); return }

      const ids = vinculos.map(v => v.cliente_id)
      const { data: perfis } = await supabase.from('perfis').select('id, nome, email').in('id', ids)

      const alunosData: Aluno[] = vinculos.map(v => {
        const perfil = perfis?.find(p => p.id === v.cliente_id)
        return { id: v.id, cliente_id: v.cliente_id, nome: perfil?.nome ?? null, email: perfil?.email ?? '', ativo: v.ativo }
      })
      setAlunos(alunosData)

      const hoje = getTodayBR()
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const statsMap: Record<string, Stats> = {}
      let countTreinouHoje = 0
      let totalScores: number[] = []

      const fasesMap: Record<string, FaseCiclo | null> = {}

      await Promise.all(alunosData.map(async (aluno) => {
        const [{ data: treinos }, { data: sonoHoje }, { data: periData }] = await Promise.all([
          supabase.from('treinos').select('data, concluido').eq('cliente_id', aluno.cliente_id).eq('concluido', true).order('data', { ascending: false }),
          supabase.from('sono').select('score_recuperacao').eq('usuario_id', aluno.cliente_id).eq('data', hoje).single(),
          supabase.from('periodizacoes').select('id, nome, data_inicio').eq('cliente_id', aluno.cliente_id).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])

        const treinouHoje = treinos?.some(t => t.data === hoje) ?? false
        if (treinouHoje) countTreinouHoje++
        if (sonoHoje?.score_recuperacao) totalScores.push(sonoHoje.score_recuperacao)

        statsMap[aluno.cliente_id] = {
          totalTreinos: treinos?.length ?? 0,
          treinosSemana: treinos?.filter(t => t.data >= semanaStr).length ?? 0,
          ultimoTreino: treinos?.[0]?.data ?? null,
          scoreHoje: sonoHoje?.score_recuperacao ?? null,
          treinouHoje,
        }

        if (periData) {
          const { data: blocos } = await supabase.from('blocos_periodizacao').select('*').eq('periodizacao_id', periData.id).order('ordem')
          if (blocos?.length) {
            const inicio = new Date(periData.data_inicio + 'T12:00:00-03:00')
            const diasTotais = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24))
            const semanaTotal = Math.max(1, Math.floor(diasTotais / 7) + 1)
            const totalSemanas = blocos.reduce((s: number, b: any) => s + b.semanas, 0)
            let acum = 0, blocoIdx = blocos.length - 1
            for (let i = 0; i < blocos.length; i++) {
              if (semanaTotal <= acum + blocos[i].semanas) { blocoIdx = i; break }
              acum += blocos[i].semanas
            }
            const b = blocos[blocoIdx]
            const semanaNoBloco = Math.min(semanaTotal - acum, b.semanas)
            fasesMap[aluno.cliente_id] = { nomeCiclo: periData.nome, nomeBloco: b.nome, tipoBloco: b.tipo, semanaBloco: semanaNoBloco, totalSemanas }
          } else {
            fasesMap[aluno.cliente_id] = null
          }
        } else {
          fasesMap[aluno.cliente_id] = null
        }
      }))

      setStats(statsMap)
      setFases(fasesMap)
      setTotalTreinouHoje(countTreinouHoje)
      if (totalScores.length) setMediaScore(Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length))
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const alertas = alunos.filter(a => {
    const s = stats[a.cliente_id]
    return s && diasSemTreinar(s.ultimoTreino) >= 3
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
            <h1 className="text-2xl font-black text-white tracking-tight">Meus Alunos</h1>
            <p className="text-zinc-600 text-xs mt-1">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} vinculado{alunos.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => router.push('/convite')} className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center text-lg font-black active:scale-90 transition-all">+</button>
        </div>

        {alunos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">👥</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Nenhum aluno ainda</p>
              <p className="text-zinc-600 text-sm">Convide seu primeiro aluno para começar</p>
            </div>
            <button onClick={() => router.push('/convite')} className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">+ Convidar aluno</button>
          </div>
        ) : (
          <>
            {/* Stats gerais */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { val: alunos.length, label: 'Alunos', sub: 'ativos', icon: '👥' },
                { val: totalTreinouHoje, label: 'Treinaram', sub: 'hoje', icon: '💪' },
                { val: mediaScore ? `${mediaScore}` : '—', label: 'Recup. média', sub: '/100', icon: '⚡' },
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
                <p className="text-orange-400 text-[10px] uppercase tracking-[0.15em] mb-3">⚠ Atenção necessária</p>
                <div className="space-y-2">
                  {alertas.map(a => {
                    const dias = diasSemTreinar(stats[a.cliente_id]?.ultimoTreino)
                    return (
                      <button key={a.id} onClick={() => router.push(`/personal/aluno/${a.cliente_id}`)}
                        className="w-full flex items-center gap-3 text-left active:scale-95 transition-all">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                          <span className="text-orange-400 text-xs font-black">{getInitials(a.nome, a.email)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{a.nome ?? a.email}</p>
                          <p className="text-orange-400/70 text-[11px]">
                            {dias === 999 ? 'Nunca treinou' : `${dias} dias sem treinar`}
                          </p>
                        </div>
                        <span className="text-zinc-700 text-sm">→</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lista de alunos */}
            <div className="space-y-3">
              {alunos.map((aluno) => {
                const s = stats[aluno.cliente_id]
                const initials = getInitials(aluno.nome, aluno.email)
                const dias = diasSemTreinar(s?.ultimoTreino)
                const emRisco = dias >= 3
                const treinouHoje = s?.treinouHoje ?? false

                const fase = fases[aluno.cliente_id]
                const faseCor = fase ? (TIPO_COR_LISTA[fase.tipoBloco] ?? TIPO_COR_LISTA.adaptacao) : ''

                return (
                  <button key={aluno.id} onClick={() => router.push(`/personal/aluno/${aluno.cliente_id}`)}
                    className="w-full text-left rounded-2xl p-5 border border-white/[0.06] active:scale-[0.98] transition-all"
                    style={{ background: '#0f0f0f' }}>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${treinouHoje ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.06] border border-white/[0.08]'}`}>
                          <span className={`font-black text-sm ${treinouHoje ? 'text-emerald-400' : 'text-zinc-400'}`}>{initials}</span>
                        </div>
                        {treinouHoje && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0f0f0f]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-base truncate">{aluno.nome ?? aluno.email}</p>
                          {treinouHoje && <span className="text-[9px] text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider shrink-0">Treinou hoje</span>}
                          {emRisco && !treinouHoje && <span className="text-[9px] text-orange-400 border border-orange-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider shrink-0">Atenção</span>}
                        </div>
                        {fase ? (
                          <p className={`text-[10px] font-semibold mt-0.5 ${faseCor.split(' ')[0]}`}>
                            {fase.nomeBloco} · Sem. {fase.semanaBloco}
                          </p>
                        ) : (
                          <p className="text-zinc-600 text-xs truncate mt-0.5">{aluno.email}</p>
                        )}
                      </div>
                      <span className="text-zinc-700 text-lg shrink-0">→</span>
                    </div>

                    {s && (
                      <div className="flex gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Total</p>
                          <p className="text-white text-sm font-bold">{s.totalTreinos}x</p>
                        </div>
                        <div className="w-px bg-white/[0.06]" />
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Semana</p>
                          <p className="text-white text-sm font-bold">{s.treinosSemana}x</p>
                        </div>
                        <div className="w-px bg-white/[0.06]" />
                        <div>
                          <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Recuperação</p>
                          <p className={`text-sm font-bold ${s.scoreHoje ? (s.scoreHoje >= 70 ? 'text-emerald-400' : s.scoreHoje >= 50 ? 'text-yellow-400' : 'text-red-400') : 'text-zinc-600'}`}>
                            {s.scoreHoje ? `${s.scoreHoje}/100` : '—'}
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
      <NavBar tipo="personal" ativa="alunos" />
    </main>
  )
}
