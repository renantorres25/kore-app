'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

type Aluno = {
  id: string
  nome: string | null
  email: string
}

type Exercicio = {
  id?: string
  nome: string
  series: number
  repeticoes: number
  carga_sugerida: number | null
  observacoes: string
  ordem: number
}

type Treino = {
  id: string
  nome: string
  descricao: string | null
  plano: string
  status: string
  data: string | null
  exercicios: Exercicio[]
}

function getInitials(nome: string | null, email: string): string {
  if (nome) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

const PLANOS = ['A', 'B', 'C']

const PLANO_CORES: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  B: { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  C: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
}

export default function PersonalAluno() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id as string

  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [planoAtivo, setPlanoAtivo] = useState<string>('A')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Modal de novo treino
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoTreino, setEditandoTreino] = useState<Treino | null>(null)

  useEffect(() => {
    carregar()
  }, [clienteId])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const [{ data: perfil }, { data: treinosData }] = await Promise.all([
      supabase.from('perfis').select('id, nome, email').eq('id', clienteId).single(),
      supabase
        .from('treinos')
        .select('id, nome, descricao, plano, status, data')
        .eq('cliente_id', clienteId)
        .eq('personal_id', session.user.id)
        .order('plano'),
    ])

    if (perfil) setAluno(perfil)

    if (treinosData?.length) {
      // Busca exercícios de todos os treinos
      const ids = treinosData.map(t => t.id)
      const { data: exercicios } = await supabase
        .from('exercicios_treino')
        .select('*')
        .in('treino_id', ids)
        .order('ordem')

      const treinosComExercicios: Treino[] = treinosData.map(t => ({
        ...t,
        exercicios: exercicios?.filter(e => e.treino_id === t.id) ?? [],
      }))
      setTreinos(treinosComExercicios)
    }

    setCarregando(false)
  }

  function abrirNovoTreino() {
    setEditandoTreino({
      id: '',
      nome: `Treino ${planoAtivo}`,
      descricao: '',
      plano: planoAtivo,
      status: 'ativo',
      data: null,
      exercicios: [exercicioVazio(1)],
    })
    setModalAberto(true)
  }

  function abrirEditarTreino(treino: Treino) {
    setEditandoTreino({ ...treino, exercicios: [...treino.exercicios] })
    setModalAberto(true)
  }

  function exercicioVazio(ordem: number): Exercicio {
    return { nome: '', series: 3, repeticoes: 12, carga_sugerida: null, observacoes: '', ordem }
  }

  function adicionarExercicio() {
    if (!editandoTreino) return
    setEditandoTreino({
      ...editandoTreino,
      exercicios: [...editandoTreino.exercicios, exercicioVazio(editandoTreino.exercicios.length + 1)],
    })
  }

  function removerExercicio(index: number) {
    if (!editandoTreino) return
    const novos = editandoTreino.exercicios.filter((_, i) => i !== index).map((e, i) => ({ ...e, ordem: i + 1 }))
    setEditandoTreino({ ...editandoTreino, exercicios: novos })
  }

  function atualizarExercicio(index: number, campo: keyof Exercicio, valor: string | number | null) {
    if (!editandoTreino) return
    const novos = [...editandoTreino.exercicios]
    novos[index] = { ...novos[index], [campo]: valor }
    setEditandoTreino({ ...editandoTreino, exercicios: novos })
  }

  async function salvarTreino() {
    if (!editandoTreino) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setSalvando(true)

    try {
      let treinoId = editandoTreino.id

      if (!treinoId) {
        // Criar novo treino
        const { data: novo, error } = await supabase
          .from('treinos')
          .insert({
            personal_id: session.user.id,
            cliente_id: clienteId,
            nome: editandoTreino.nome,
            descricao: editandoTreino.descricao,
            plano: editandoTreino.plano,
            status: 'ativo',
          })
          .select('id')
          .single()

        if (error) throw error
        treinoId = novo.id
      } else {
        // Atualizar treino existente
        await supabase
          .from('treinos')
          .update({
            nome: editandoTreino.nome,
            descricao: editandoTreino.descricao,
            plano: editandoTreino.plano,
          })
          .eq('id', treinoId)

        // Deleta exercícios antigos
        await supabase.from('exercicios_treino').delete().eq('treino_id', treinoId)
      }

      // Insere exercícios
      const exerciciosParaSalvar = editandoTreino.exercicios
        .filter(e => e.nome.trim())
        .map(e => ({
          treino_id: treinoId,
          nome: e.nome.trim(),
          series: e.series,
          repeticoes: e.repeticoes,
          carga_sugerida: e.carga_sugerida,
          observacoes: e.observacoes,
          ordem: e.ordem,
        }))

      if (exerciciosParaSalvar.length) {
        await supabase.from('exercicios_treino').insert(exerciciosParaSalvar)
      }

      setModalAberto(false)
      setEditandoTreino(null)
      await carregar()
    } catch (err) {
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  async function deletarTreino(treinoId: string) {
    await supabase.from('exercicios_treino').delete().eq('treino_id', treinoId)
    await supabase.from('treinos').delete().eq('id', treinoId)
    await carregar()
  }

  const treinoDoPlano = treinos.find(t => t.plano === planoAtivo)
  const cores = PLANO_CORES[planoAtivo]

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
        <div className="mb-8">
          <button
            onClick={() => router.push('/personal')}
            className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors"
          >
            ← Alunos
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 font-black text-base">
                {aluno ? getInitials(aluno.nome, aluno.email) : '?'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {aluno?.nome ?? aluno?.email ?? 'Aluno'}
              </h1>
              <p className="text-zinc-600 text-xs mt-0.5">{aluno?.email}</p>
            </div>
          </div>
        </div>

        {/* Seletor de plano */}
        <div className="flex gap-2 mb-6">
          {PLANOS.map((p) => {
            const c = PLANO_CORES[p]
            const tem = treinos.some(t => t.plano === p)
            return (
              <button
                key={p}
                onClick={() => setPlanoAtivo(p)}
                className={`flex-1 py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 ${
                  planoAtivo === p
                    ? `${c.bg} ${c.border} ${c.text}`
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-600'
                }`}
              >
                Plano {p}
                {tem && (
                  <span className="block text-[9px] font-normal mt-0.5 opacity-70">
                    {treinos.find(t => t.plano === p)?.exercicios.length ?? 0} exerc.
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Conteúdo do plano */}
        {treinoDoPlano ? (
          <div>
            {/* Card do treino */}
            <div className={`rounded-2xl p-5 border ${cores.border} mb-4`} style={{ background: '#0f0f0f' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.2em] mb-1 ${cores.text}`}>Plano {planoAtivo}</p>
                  <p className="text-white font-black text-lg">{treinoDoPlano.nome}</p>
                  {treinoDoPlano.descricao && (
                    <p className="text-zinc-500 text-xs mt-1">{treinoDoPlano.descricao}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEditarTreino(treinoDoPlano)}
                    className="text-[10px] text-zinc-500 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white active:scale-95 transition-all uppercase tracking-wider"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deletarTreino(treinoDoPlano.id)}
                    className="text-[10px] text-red-500/70 border border-red-500/20 rounded-lg px-3 py-1.5 hover:border-red-500/50 hover:text-red-400 active:scale-95 transition-all uppercase tracking-wider"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Lista de exercícios */}
              <div className="space-y-2">
                {treinoDoPlano.exercicios.map((ex, i) => (
                  <div key={i} className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-lg ${cores.bg} ${cores.border} border flex items-center justify-center shrink-0 mt-0.5`}>
                        <span className={`text-[10px] font-black ${cores.text}`}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm mb-1">{ex.nome}</p>
                        <div className="flex gap-3 flex-wrap">
                          <span className="text-zinc-500 text-[11px]">{ex.series} séries</span>
                          <span className="text-zinc-700 text-[11px]">·</span>
                          <span className="text-zinc-500 text-[11px]">{ex.repeticoes} reps</span>
                          {ex.carga_sugerida && (
                            <>
                              <span className="text-zinc-700 text-[11px]">·</span>
                              <span className="text-zinc-500 text-[11px]">{ex.carga_sugerida}kg sugerido</span>
                            </>
                          )}
                        </div>
                        {ex.observacoes && (
                          <p className="text-zinc-600 text-[11px] mt-1 italic">{ex.observacoes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Estado vazio */
          <div className="flex flex-col items-center py-16 gap-4">
            <div className={`w-16 h-16 rounded-3xl ${cores.bg} ${cores.border} border flex items-center justify-center`}>
              <span className={`text-2xl font-black ${cores.text}`}>{planoAtivo}</span>
            </div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Plano {planoAtivo} vazio</p>
              <p className="text-zinc-600 text-sm">Monte o treino para este aluno</p>
            </div>
            <button
              onClick={abrirNovoTreino}
              className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all tracking-wide"
            >
              + Criar Plano {planoAtivo}
            </button>
          </div>
        )}

        {treinoDoPlano && (
          <button
            onClick={abrirNovoTreino}
            className="w-full border border-white/[0.08] text-zinc-400 font-bold py-4 rounded-2xl text-sm active:scale-95 hover:border-white/20 hover:text-white transition-all tracking-wide"
          >
            + Substituir Plano {planoAtivo}
          </button>
        )}
      </div>

      {/* ── MODAL: Criar/Editar Treino ── */}
      {modalAberto && editandoTreino && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-white/[0.08] overflow-hidden"
            style={{ background: '#0f0f0f', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] shrink-0">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.2em] mb-0.5 ${PLANO_CORES[editandoTreino.plano].text}`}>
                  Plano {editandoTreino.plano}
                </p>
                <p className="text-white font-black text-lg">
                  {editandoTreino.id ? 'Editar treino' : 'Novo treino'}
                </p>
              </div>
              <button
                onClick={() => { setModalAberto(false); setEditandoTreino(null) }}
                className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Nome do treino */}
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Nome do treino</label>
                <input
                  value={editandoTreino.nome}
                  onChange={e => setEditandoTreino({ ...editandoTreino, nome: e.target.value })}
                  placeholder="Ex: Treino A — Peito e Tríceps"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Observações gerais</label>
                <textarea
                  value={editandoTreino.descricao ?? ''}
                  onChange={e => setEditandoTreino({ ...editandoTreino, descricao: e.target.value })}
                  placeholder="Foco do treino, intensidade, observações..."
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none"
                />
              </div>

              {/* Exercícios */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-zinc-500 text-[10px] uppercase tracking-widest">Exercícios</label>
                  <span className="text-zinc-600 text-[10px]">{editandoTreino.exercicios.length} adicionado{editandoTreino.exercicios.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-3">
                  {editandoTreino.exercicios.map((ex, i) => (
                    <div key={i} className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.05]">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${PLANO_CORES[editandoTreino.plano].text}`}>
                          Exercício {i + 1}
                        </span>
                        {editandoTreino.exercicios.length > 1 && (
                          <button
                            onClick={() => removerExercicio(i)}
                            className="text-red-500/50 hover:text-red-400 text-xs active:scale-90 transition-all"
                          >
                            remover
                          </button>
                        )}
                      </div>

                      {/* Nome */}
                      <input
                        value={ex.nome}
                        onChange={e => atualizarExercicio(i, 'nome', e.target.value)}
                        placeholder="Nome do exercício"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors mb-3"
                      />

                      {/* Séries / Reps / Carga */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Séries</label>
                          <input
                            type="number"
                            value={ex.series}
                            onChange={e => atualizarExercicio(i, 'series', parseInt(e.target.value) || 0)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors text-center"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Reps</label>
                          <input
                            type="number"
                            value={ex.repeticoes}
                            onChange={e => atualizarExercicio(i, 'repeticoes', parseInt(e.target.value) || 0)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors text-center"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">Carga (kg)</label>
                          <input
                            type="number"
                            value={ex.carga_sugerida ?? ''}
                            onChange={e => atualizarExercicio(i, 'carga_sugerida', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="—"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors text-center placeholder:text-zinc-700"
                          />
                        </div>
                      </div>

                      {/* Observações */}
                      <input
                        value={ex.observacoes}
                        onChange={e => atualizarExercicio(i, 'observacoes', e.target.value)}
                        placeholder="Observações (opcional)"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-zinc-400 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={adicionarExercicio}
                  className="w-full mt-3 border border-dashed border-white/[0.12] text-zinc-500 font-semibold py-3 rounded-xl text-sm hover:border-white/25 hover:text-zinc-300 active:scale-95 transition-all"
                >
                  + Adicionar exercício
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/[0.06] shrink-0">
              <button
                onClick={salvarTreino}
                disabled={salvando || !editandoTreino.nome.trim()}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all tracking-wide"
              >
                {salvando ? 'Salvando...' : `Salvar Plano ${editandoTreino.plano}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}