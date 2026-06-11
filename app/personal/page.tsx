'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import SidebarProfissional from '../components/SidebarProfissional'
import { ChevronRight } from 'lucide-react'
import { AtividadeCompleta, AlertaCientifico, AlertaNivel, computeAlertaCientifico } from '../lib/alertas-cientificos'

type Aluno = {
  id: string
  cliente_id: string
  nome: string | null
  email: string
  ativo: boolean
  fcmax: number | null
  dataNascimento: string | null
  tsb_atual: number | null
}

type Stats = {
  totalTreinos: number
  treinosSemana: number
  ultimoTreino: string | null
  scoreHoje: number | null
  treinouHoje: boolean
  alerta: AlertaCientifico
  atividades30d: AtividadeCompleta[]
}

type FaseCiclo = {
  nomeCiclo: string
  nomeBloco: string
  tipoBloco: string
  semanaBloco: number
  semanasBloco: number
  totalSemanas: number
  diasAteProximoBloco: number | null
}

const TIPO_COR_LISTA: Record<string, string> = {
  adaptacao:   'text-teal-400 border-teal-500/20 bg-teal-500/10',
  hipertrofia: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  forca:       'text-blue-400 border-blue-500/20 bg-blue-500/10',
  resistencia: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
  deload:      'text-zinc-400 border-zinc-500/20 bg-zinc-500/10',
  potencia:    'text-orange-400 border-orange-500/20 bg-orange-500/10',
}

const NIVEL_ORDER: Record<AlertaNivel, number> = { vermelho: 0, amarelo: 1, verde: 2, cinza: 3 }
const ALERTA_CFG: Record<AlertaNivel, { dot: string; border: string; bg: string; causaColor: string }> = {
  vermelho: { dot: 'bg-red-400',     border: 'border-red-500/20',   bg: 'bg-red-500/[0.04]',   causaColor: 'text-red-300' },
  amarelo:  { dot: 'bg-amber-400',   border: 'border-amber-500/20', bg: 'bg-amber-500/[0.04]', causaColor: 'text-amber-300' },
  verde:    { dot: 'bg-emerald-400', border: 'border-white/[0.07]', bg: '',                    causaColor: 'text-emerald-600' },
  cinza:    { dot: 'bg-zinc-600',    border: 'border-white/[0.07]', bg: '',                    causaColor: 'text-zinc-600' },
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

function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const nasc = new Date(dataNascimento + 'T12:00:00-03:00')
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function PersonalAlunos() {
  const router = useRouter()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [fases, setFases] = useState<Record<string, FaseCiclo | null>>({})
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})

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
      const { data: perfis } = await supabase.from('perfis').select('id, nome, email, fcmax, data_nascimento, tsb_atual, ctl_atual, atl_atual').in('id', ids)

      const alunosData: Aluno[] = vinculos.map(v => {
        const perfil = perfis?.find(p => p.id === v.cliente_id)
        return {
          id: v.id, cliente_id: v.cliente_id, nome: perfil?.nome ?? null, email: perfil?.email ?? '', ativo: v.ativo,
          fcmax: perfil?.fcmax ?? null, dataNascimento: perfil?.data_nascimento ?? null, tsb_atual: perfil?.tsb_atual ?? null,
        }
      })
      setAlunos(alunosData)

      const hoje = getTodayBR()
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 7)
      const semanaStr = semanaAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const trintaCincoAtras = new Date()
      trintaCincoAtras.setDate(trintaCincoAtras.getDate() - 35)
      const trintaCincoStr = trintaCincoAtras.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const statsMap: Record<string, Stats> = {}
      const fasesMap: Record<string, FaseCiclo | null> = {}

      await Promise.all(alunosData.map(async (aluno) => {
        const [{ data: treinos }, { data: sono7d }, { data: periData }, { data: atividades35d }] = await Promise.all([
          supabase.from('treinos').select('data, concluido').eq('cliente_id', aluno.cliente_id).eq('concluido', true).order('data', { ascending: false }),
          supabase.from('sono').select('data, score_recuperacao').eq('usuario_id', aluno.cliente_id).gte('data', semanaStr).order('data', { ascending: false }),
          supabase.from('periodizacoes').select('id, nome, data_inicio').eq('cliente_id', aluno.cliente_id).eq('status', 'ativo').order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('atividades_livres').select('data, duracao_min, fc_media, fc_max, calorias_wearable, calorias_estimadas').eq('usuario_id', aluno.cliente_id).gte('data', trintaCincoStr).order('data', { ascending: false }),
        ])

        const treinouHoje = treinos?.some(t => t.data === hoje) ?? false
        const sonoHoje = sono7d?.find(s => s.data === hoje)
        const totalAtividades = atividades35d?.length ?? 0
        const ultimaAtividade = atividades35d?.[0]?.data ?? null
        const ultimoTreino = [treinos?.[0]?.data ?? null, ultimaAtividade]
          .filter(Boolean).sort().reverse()[0] ?? null
        const totalTreinos = (treinos?.length ?? 0) + totalAtividades
        const scoreHoje = sonoHoje?.score_recuperacao ?? null
        const perfil = perfis?.find(p => p.id === aluno.cliente_id)

        statsMap[aluno.cliente_id] = {
          totalTreinos,
          treinosSemana: treinos?.filter(t => t.data >= semanaStr).length ?? 0,
          ultimoTreino,
          scoreHoje,
          treinouHoje,
          alerta: computeAlertaCientifico({
            atividades30d: atividades35d ?? [],
            fcmaxPerfil: aluno.fcmax,
            idade: calcularIdade(aluno.dataNascimento),
            totalTreinos,
            ultimoTreino,
            tsb_atual: aluno.tsb_atual ?? null,
            ctl_atual: perfil?.ctl_atual ?? null,
            atl_atual: perfil?.atl_atual ?? null,
          }),
          atividades30d: atividades35d ?? [],
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
            const semanasRestantesBloco = b.semanas - semanaNoBloco
            const diasAteProximo = blocoIdx < blocos.length - 1 ? semanasRestantesBloco * 7 : null
            fasesMap[aluno.cliente_id] = { nomeCiclo: periData.nome, nomeBloco: b.nome, tipoBloco: b.tipo, semanaBloco: semanaNoBloco, semanasBloco: b.semanas, totalSemanas, diasAteProximoBloco: diasAteProximo }
          } else {
            fasesMap[aluno.cliente_id] = null
          }
        } else {
          fasesMap[aluno.cliente_id] = null
        }
      }))

      setStats(statsMap)
      setFases(fasesMap)
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const alunosFiltrados = alunos
    .filter(a => busca === '' || (a.nome ?? a.email).toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => NIVEL_ORDER[stats[a.cliente_id]?.alerta?.nivel ?? 'cinza'] - NIVEL_ORDER[stats[b.cliente_id]?.alerta?.nivel ?? 'cinza'])

  const counts = {
    vermelho: alunos.filter(a => stats[a.cliente_id]?.alerta?.nivel === 'vermelho').length,
    amarelo:  alunos.filter(a => stats[a.cliente_id]?.alerta?.nivel === 'amarelo').length,
    verde:    alunos.filter(a => stats[a.cliente_id]?.alerta?.nivel === 'verde').length,
    cinza:    alunos.filter(a => stats[a.cliente_id]?.alerta?.nivel === 'cinza').length,
  }
  const temAlerta = counts.vermelho > 0 || counts.amarelo > 0

  return (
    <main className="min-h-[100dvh] text-white md:flex">
      <SidebarProfissional tipo="personal" />
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
              <h1 className="text-3xl font-black text-white tracking-tight">Meus Alunos</h1>
              <p className="text-zinc-500 text-sm mt-1">{alunos.length} vinculado{alunos.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => router.push('/convite')}
              className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2.5 rounded-xl text-sm active:scale-95 transition-all">
              + Convidar
            </button>
          </div>

          {alunos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.05] flex items-center justify-center text-3xl opacity-40">👥</div>
              <div className="text-center">
                <p className="text-white font-bold mb-1">Nenhum aluno ainda</p>
                <p className="text-zinc-600 text-sm">Convide seu primeiro aluno para começar</p>
              </div>
              <button onClick={() => router.push('/convite')}
                className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">
                + Convidar aluno
              </button>
            </div>
          ) : (
            <>
              {/* Painel de alertas — resumo */}
              <div className="mb-5 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px) saturate(130%)', WebkitBackdropFilter: 'blur(16px) saturate(130%)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20 }}>
                <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em]">Painel de alertas — treino e recuperação</p>
                </div>
                <div className="px-5 py-4 flex items-center gap-6 flex-wrap">
                  {[
                    { label: 'Risco alto',   dot: 'bg-red-400',     count: counts.vermelho },
                    { label: 'Atenção',      dot: 'bg-amber-400',   count: counts.amarelo  },
                    { label: 'No caminho',   dot: 'bg-emerald-400', count: counts.verde    },
                    { label: 'Insuficiente', dot: 'bg-zinc-600',    count: counts.cinza    },
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
                    <p className="text-emerald-500 text-xs">Todos os alunos estão em dia neste momento.</p>
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

              {/* Lista de alunos */}
              <div className="space-y-2">
                {alunosFiltrados.map((aluno) => {
                  const s = stats[aluno.cliente_id]
                  const alerta = s?.alerta ?? { nivel: 'cinza' as AlertaNivel, alertas: [] }
                  const cfg = ALERTA_CFG[alerta.nivel]
                  const expandido_ = expandido[aluno.cliente_id] ?? false
                  const dias = diasSemTreinar(s?.ultimoTreino ?? null)

                  const fase = fases[aluno.cliente_id]
                  const faseCor = fase ? (TIPO_COR_LISTA[fase.tipoBloco] ?? TIPO_COR_LISTA.adaptacao) : ''

                  return (
                    <button key={aluno.id}
                      onClick={() => router.push(`/personal/aluno/${aluno.cliente_id}`)}
                      className={`w-full text-left rounded-xl px-5 py-4 active:scale-[0.99] transition-all border ${cfg.border} ${cfg.bg}`}>
                      <div className="flex items-start gap-4">
                        {/* Avatar + dot de alerta */}
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center">
                            <span className="font-bold text-sm text-zinc-300">{getInitials(aluno.nome, aluno.email)}</span>
                          </div>
                          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-base,#0A0B0F)] ${cfg.dot}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Nome + badges */}
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-white font-semibold text-base truncate">{aluno.nome ?? aluno.email}</p>
                            {s?.totalTreinos === 0 && (
                              <span className="text-[10px] text-zinc-500 border border-white/[0.10] rounded-full px-2 py-0.5 shrink-0">
                                Nunca treinou
                              </span>
                            )}
                            {s?.treinouHoje && (
                              <span className="text-[10px] text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 shrink-0">
                                Treinou hoje
                              </span>
                            )}
                          </div>

                          {/* Fase de periodização ativa */}
                          {fase && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-[10px] font-semibold ${faseCor.split(' ')[0]}`}>
                                  {fase.nomeBloco}
                                </p>
                                <p className="text-zinc-600 text-[9px]">Sem. {fase.semanaBloco}/{fase.semanasBloco}</p>
                              </div>
                              <div className="h-1.5 bg-white/[0.09] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${faseCor.split(' ')[0].replace('text-', 'bg-')}`}
                                  style={{ width: `${Math.min(100, (fase.semanaBloco / fase.semanasBloco) * 100)}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Métricas rápidas */}
                          <div className="flex items-center gap-3 text-zinc-500 text-xs mb-2 flex-wrap">
                            {(s?.totalTreinos ?? 0) > 0 && <span>{dias}d sem treinar</span>}
                            {(s?.treinosSemana ?? 0) > 0 && <span>{s!.treinosSemana} treino{s!.treinosSemana !== 1 ? 's' : ''}/sem.</span>}
                            {s?.scoreHoje != null && <span>Rec: {s.scoreHoje}/100</span>}
                          </div>

                          {/* Alertas científicos */}
                          {alerta.alertas.length > 0 ? (
                            <div className="space-y-1.5">
                              <div>
                                <p className={`text-xs leading-relaxed font-medium ${cfg.causaColor}`}>
                                  {alerta.alertas[0].mensagem}
                                </p>
                                <p className="text-[10px] text-zinc-600 mt-0.5">{alerta.alertas[0].dadoTecnico}</p>
                              </div>
                              {alerta.alertas.length > 1 && (
                                <>
                                  {expandido_ && alerta.alertas.slice(1).map(a => (
                                    <div key={a.codigo}>
                                      <p className={`text-xs leading-relaxed font-medium ${ALERTA_CFG[a.nivel].causaColor}`}>
                                        {a.mensagem}
                                      </p>
                                      <p className="text-[10px] text-zinc-600 mt-0.5">{a.dadoTecnico}</p>
                                    </div>
                                  ))}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandido(prev => ({ ...prev, [aluno.cliente_id]: !prev[aluno.cliente_id] }))
                                    }}
                                    className="inline-block text-[10px] text-zinc-500 underline underline-offset-2"
                                  >
                                    {expandido_ ? 'Ver menos' : `+${alerta.alertas.length - 1} alerta${alerta.alertas.length - 1 !== 1 ? 's' : ''}`}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : alerta.nivel === 'verde' ? (
                            <p className="text-xs text-emerald-700">Treinos em dia</p>
                          ) : alerta.nivel === 'cinza' ? (
                            <p className="text-xs text-zinc-600">Nenhum treino registrado ainda</p>
                          ) : null}
                        </div>

                        <ChevronRight size={16} className="text-zinc-600 shrink-0 mt-1.5" />
                      </div>
                    </button>
                  )
                })}

                {busca && alunosFiltrados.length === 0 && (
                  <p className="text-center text-zinc-500 text-sm py-8">
                    Nenhum aluno encontrado para &quot;{busca}&quot;
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
