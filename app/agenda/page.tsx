'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type AgendamentoDB = {
  id: string
  cliente_id: string
  data: string
  hora: string
  tipo: string
  notas: string | null
  status: string
}

type Agendamento = AgendamentoDB & {
  cliente_nome: string | null
  cliente_email: string
}

type Cliente = {
  id: string
  nome: string | null
  email: string
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getNext7Days(hoje: string): string[] {
  const days: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoje + 'T12:00:00-03:00')
    d.setDate(d.getDate() + i)
    days.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
  }
  return days
}

function formatDiaLabel(data: string, hoje: string): string {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  if (data === hoje) return 'Hoje'
  const d = new Date(data + 'T12:00:00-03:00')
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]}`
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  agendado:  { label: 'Agendado',  cor: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  confirmado:{ label: 'Confirmado',cor: 'text-green-400 bg-green-500/10 border-green-500/20' },
  realizado: { label: 'Realizado', cor: 'text-zinc-400 bg-white/[0.04] border-white/[0.08]' },
  cancelado: { label: 'Cancelado', cor: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

const TIPO_NUTRI = ['Consulta', 'Retorno', 'Avaliação', 'Teleconsulta']
const TIPO_PERSONAL = ['Treino', 'Avaliação', 'Retorno', 'Aula experimental']

export default function AgendaPage() {
  const router = useRouter()

  const [profId, setProfId] = useState('')
  const [profTipo, setProfTipo] = useState('')
  const [agendamentos, setAgendamentos] = useState<AgendamentoDB[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [novoClienteId, setNovoClienteId] = useState('')
  const [novaData, setNovaData] = useState(getTodayBR())
  const [novaHora, setNovaHora] = useState('09:00')
  const [novoTipo, setNovoTipo] = useState('Consulta')
  const [novasNotas, setNovasNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const hoje = getTodayBR()

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const pid = session.user.id
      setProfId(pid)

      const { data: perfil } = await supabase.from('perfis').select('tipo').eq('id', pid).single()
      const tipo = perfil?.tipo ?? ''
      setProfTipo(tipo)
      if (tipo === 'personal') setNovoTipo('Treino')

      const { data: vinculos } = await supabase.from('vinculos').select('cliente_id').eq('profissional_id', pid)
      const clienteIds = (vinculos ?? []).map((v: any) => v.cliente_id)

      if (clienteIds.length > 0) {
        const { data: perfisClientes } = await supabase
          .from('perfis')
          .select('id, nome, email')
          .in('id', clienteIds)
        setClientes(perfisClientes ?? [])
        if (!novoClienteId && perfisClientes && perfisClientes.length > 0) {
          setNovoClienteId(perfisClientes[0].id)
        }
      }

      const futuro = new Date(hoje + 'T12:00:00-03:00')
      futuro.setDate(futuro.getDate() + 30)
      const futuroStr = futuro.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const { data: ags } = await supabase
        .from('agendamentos')
        .select('id, cliente_id, data, hora, tipo, notas, status')
        .eq('profissional_id', pid)
        .gte('data', hoje)
        .lte('data', futuroStr)
        .order('data')
        .order('hora')

      setAgendamentos(ags ?? [])
      setCarregando(false)
    }
    carregar()
  }, [router, hoje])

  // enrich agendamentos with client names
  const agendamentosRicos: Agendamento[] = agendamentos.map(ag => {
    const c = clientes.find(cl => cl.id === ag.cliente_id)
    return { ...ag, cliente_nome: c?.nome ?? null, cliente_email: c?.email ?? '' }
  })

  async function criarAgendamento() {
    if (!novoClienteId || !novaData || !novaHora) return
    setSalvando(true)
    const { data } = await supabase.from('agendamentos').insert({
      profissional_id: profId,
      cliente_id: novoClienteId,
      data: novaData,
      hora: novaHora,
      tipo: novoTipo,
      notas: novasNotas || null,
      status: 'agendado',
    }).select('id, cliente_id, data, hora, tipo, notas, status').single()

    if (data) {
      setAgendamentos(prev => [...prev, data].sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : a.hora < b.hora ? -1 : 1))
    }
    setShowModal(false)
    setNovasNotas('')
    setSalvando(false)
  }

  async function marcarRealizado(id: string) {
    await supabase.from('agendamentos').update({ status: 'realizado' }).eq('id', id)
    setAgendamentos(prev => prev.map(ag => ag.id === id ? { ...ag, status: 'realizado' } : ag))
  }

  async function cancelarAgendamento(id: string) {
    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
    setAgendamentos(prev => prev.map(ag => ag.id === id ? { ...ag, status: 'cancelado' } : ag))
  }

  const tiposDisponiveis = profTipo === 'personal' ? TIPO_PERSONAL : TIPO_NUTRI

  const navItems = profTipo === 'personal'
    ? [
        { id: 'home',   label: 'Início',  path: '/dashboard' },
        { id: 'alunos', label: 'Alunos',  path: '/personal' },
        { id: 'agenda', label: 'Agenda',  path: '/agenda' },
        { id: 'perfil', label: 'Perfil',  path: '/perfil' },
      ]
    : [
        { id: 'home',      label: 'Início',    path: '/dashboard' },
        { id: 'pacientes', label: 'Pacientes', path: '/nutricionista/pacientes' },
        { id: 'agenda',    label: 'Agenda',    path: '/agenda' },
        { id: 'perfil',    label: 'Perfil',    path: '/perfil' },
      ]

  // group by date
  const dias = getNext7Days(hoje)
  const agsAtivas = agendamentosRicos.filter(ag => ag.status !== 'cancelado')

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
            <h1 className="text-[1.85rem] font-black tracking-tight text-white">Agenda</h1>
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-11 h-11 rounded-2xl bg-white text-black flex items-center justify-center text-xl font-black active:scale-90 transition-all">
            +
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Hoje', val: agsAtivas.filter(ag => ag.data === hoje).length, cor: 'text-white' },
            { label: 'Esta semana', val: agsAtivas.filter(ag => ag.data >= hoje && ag.data <= dias[6]).length, cor: 'text-blue-400' },
            { label: 'Total', val: agsAtivas.length, cor: 'text-zinc-400' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3.5 border border-white/[0.06] text-center" style={{ background: '#0f0f0f' }}>
              <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.cor}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Agenda por dia */}
        {dias.map(dia => {
          const agsNoDia = agsAtivas.filter(ag => ag.data === dia)
          if (agsNoDia.length === 0 && dia !== hoje) return null
          return (
            <div key={dia} className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${dia === hoje ? 'text-white' : 'text-zinc-500'}`}>
                  {formatDiaLabel(dia, hoje)}
                </p>
                {dia === hoje && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                <div className="flex-1 h-px bg-white/[0.04]" />
                {agsNoDia.length > 0 && <p className="text-zinc-700 text-[10px]">{agsNoDia.length} compromisso{agsNoDia.length > 1 ? 's' : ''}</p>}
              </div>

              {agsNoDia.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.04] py-4 text-center">
                  <p className="text-zinc-700 text-sm">Nenhum compromisso hoje</p>
                  <button onClick={() => { setNovaData(hoje); setShowModal(true) }} className="text-zinc-600 text-xs mt-1 hover:text-zinc-400 transition-colors">+ Agendar</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {agsNoDia.map(ag => {
                    const st = STATUS_LABEL[ag.status] ?? STATUS_LABEL.agendado
                    return (
                      <div key={ag.id} className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: '#0f0f0f' }}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <div className="text-center shrink-0 w-10">
                            <p className="text-white font-black text-sm leading-none">{ag.hora.slice(0, 5)}</p>
                          </div>
                          <div className="w-px h-8 bg-white/[0.06]" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white font-bold text-sm truncate">{ag.cliente_nome ?? ag.cliente_email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 text-[10px]">{ag.tipo}</span>
                              {ag.notas && <span className="text-zinc-700 text-[10px] truncate">· {ag.notas}</span>}
                            </div>
                          </div>
                          <span className={`text-[9px] uppercase tracking-wider font-semibold border rounded-full px-2 py-0.5 shrink-0 ${st.cor}`}>{st.label}</span>
                        </div>
                        {ag.status === 'agendado' && (
                          <div className="flex border-t border-white/[0.04]">
                            <button onClick={() => marcarRealizado(ag.id)}
                              className="flex-1 py-2.5 text-[10px] text-green-400 font-semibold uppercase tracking-wider hover:bg-green-500/5 transition-colors active:scale-95">
                              ✓ Realizado
                            </button>
                            <div className="w-px bg-white/[0.04]" />
                            <button onClick={() => cancelarAgendamento(ag.id)}
                              className="flex-1 py-2.5 text-[10px] text-red-400/60 font-semibold uppercase tracking-wider hover:bg-red-500/5 transition-colors active:scale-95">
                              ✕ Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {agsAtivas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">📅</p>
            <p className="text-white font-black text-xl mb-2">Agenda vazia</p>
            <p className="text-zinc-500 text-sm mb-6">Nenhum compromisso agendado. Comece agora.</p>
            <button onClick={() => setShowModal(true)}
              className="bg-white text-black font-bold py-3 px-8 rounded-2xl text-sm active:scale-95 transition-all">
              + Novo agendamento
            </button>
          </div>
        )}
      </div>

      {/* Modal novo agendamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl border-t border-white/[0.08] px-5 pt-5 pb-8"
            style={{ background: '#0f0f0f', paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-xl">Novo agendamento</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-600 text-xl hover:text-white transition-colors active:scale-90">✕</button>
            </div>

            <div className="space-y-3">
              {/* Paciente/Aluno */}
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">{profTipo === 'personal' ? 'Aluno' : 'Paciente'}</p>
                {clientes.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] px-4 py-3 text-zinc-600 text-sm">
                    Nenhum {profTipo === 'personal' ? 'aluno' : 'paciente'} vinculado ainda
                  </div>
                ) : (
                  <select
                    value={novoClienteId}
                    onChange={e => setNovoClienteId(e.target.value)}
                    className="w-full bg-white/[0.04] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]"
                    style={{ colorScheme: 'dark' }}>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>
                        {c.nome ?? c.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tipo */}
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">Tipo</p>
                <div className="grid grid-cols-2 gap-2">
                  {tiposDisponiveis.map(t => (
                    <button key={t} onClick={() => setNovoTipo(t)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${novoTipo === t ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-zinc-400 border-white/[0.06]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data e hora */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">Data</p>
                  <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                    className="w-full bg-white/[0.04] text-white rounded-xl px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]"
                    style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">Hora</p>
                  <input type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)}
                    className="w-full bg-white/[0.04] text-white rounded-xl px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]"
                    style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">Observações <span className="normal-case text-zinc-700">(opcional)</span></p>
                <input value={novasNotas} onChange={e => setNovasNotas(e.target.value)}
                  placeholder="Ex: Primeira consulta, trazer exames..."
                  className="w-full bg-white/[0.04] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.06]"
                />
              </div>

              <button onClick={criarAgendamento}
                disabled={salvando || !novoClienteId || !novaData || !novaHora}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-30 mt-1">
                {salvando ? 'Salvando...' : 'Confirmar agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.04]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-3 pb-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90">
              <span className={`text-[10px] uppercase tracking-[0.12em] font-semibold transition-all ${item.id === 'agenda' ? 'text-white' : 'text-zinc-600'}`}>
                {item.label}
              </span>
              {item.id === 'agenda' && <div className="w-1 h-1 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}
