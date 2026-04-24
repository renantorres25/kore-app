'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

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
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

function getFirstName(nome: string | null, email: string): string {
  if (nome) return nome.split(' ')[0]
  return email.split('@')[0]
}

export default function PersonalAlunos() {
  const router = useRouter()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [carregando, setCarregando] = useState(true)
  const [sessaoId, setSessaoId] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setSessaoId(session.user.id)

      // Busca alunos vinculados
      const { data: vinculos } = await supabase
        .from('vinculos')
        .select('id, cliente_id, ativo')
        .eq('profissional_id', session.user.id)
        .eq('tipo', 'personal')

      if (!vinculos?.length) { setCarregando(false); return }

      // Busca perfis dos alunos
      const ids = vinculos.map(v => v.cliente_id)
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome, email')
        .in('id', ids)

      const alunosData: Aluno[] = vinculos.map(v => {
        const perfil = perfis?.find(p => p.id === v.cliente_id)
        return {
          id: v.id,
          cliente_id: v.cliente_id,
          nome: perfil?.nome ?? null,
          email: perfil?.email ?? '',
          ativo: v.ativo,
        }
      })
      setAlunos(alunosData)

      // Busca stats de treinos para cada aluno
      const statsMap: Record<string, Stats> = {}
      await Promise.all(alunosData.map(async (aluno) => {
        const { data: treinos } = await supabase
          .from('treinos')
          .select('data, concluido')
          .eq('cliente_id', aluno.cliente_id)
          .eq('personal_id', session.user.id)
          .eq('concluido', true)
          .order('data', { ascending: false })

        const semanaAtras = new Date()
        semanaAtras.setDate(semanaAtras.getDate() - 7)

        statsMap[aluno.cliente_id] = {
          totalTreinos: treinos?.length ?? 0,
          treinosSemana: treinos?.filter(t => new Date(t.data) >= semanaAtras).length ?? 0,
          ultimoTreino: treinos?.[0]?.data ?? null,
        }
      }))

      setStats(statsMap)
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div
        className="max-w-md mx-auto px-4 pb-12"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-600 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1 hover:text-zinc-400 transition-colors"
            >
              ← Dashboard
            </button>
            <h1 className="text-2xl font-black text-white tracking-tight">Meus Alunos</h1>
            <p className="text-zinc-600 text-xs mt-1">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} vinculado{alunos.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => router.push('/convite')}
            className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center text-lg font-black active:scale-90 transition-all"
          >
            +
          </button>
        </div>

        {/* Lista de alunos */}
        {alunos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl opacity-40">
              👥
            </div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Nenhum aluno ainda</p>
              <p className="text-zinc-600 text-sm">Convide seu primeiro aluno para começar</p>
            </div>
            <button
              onClick={() => router.push('/convite')}
              className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all tracking-wide"
            >
              + Convidar aluno
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {alunos.map((aluno) => {
              const s = stats[aluno.cliente_id]
              const initials = getInitials(aluno.nome, aluno.email)
              const firstName = getFirstName(aluno.nome, aluno.email)

              return (
                <button
                  key={aluno.id}
                  onClick={() => router.push(`/personal/aluno/${aluno.cliente_id}`)}
                  className="w-full text-left rounded-2xl p-5 border border-white/[0.06] active:scale-[0.98] transition-all"
                  style={{ background: '#0f0f0f' }}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-emerald-400 font-black text-sm">{initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-bold text-base truncate">{aluno.nome ?? aluno.email}</p>
                        {!aluno.ativo && (
                          <span className="text-[9px] text-zinc-600 border border-white/[0.06] rounded-full px-2 py-0.5 uppercase tracking-wider shrink-0">
                            inativo
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-600 text-xs truncate">{aluno.email}</p>
                    </div>

                    <span className="text-zinc-700 text-lg shrink-0">→</span>
                  </div>

                  {/* Stats */}
                  {s && (
                    <div className="flex gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Total</p>
                        <p className="text-white text-sm font-bold">{s.totalTreinos} treinos</p>
                      </div>
                      <div className="w-px bg-white/[0.06]" />
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Semana</p>
                        <p className="text-white text-sm font-bold">{s.treinosSemana}x</p>
                      </div>
                      <div className="w-px bg-white/[0.06]" />
                      <div>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">Último</p>
                        <p className="text-white text-sm font-bold">
                          {s.ultimoTreino
                            ? new Date(s.ultimoTreino + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}