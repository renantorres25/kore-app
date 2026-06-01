'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

type Agendamento = {
  id: string; cliente_id: string; data: string; hora: string
  tipo: string; notas: string | null; status: string
  clienteNome: string | null; clienteEmail: string
}
type Cliente = { id: string; nome: string | null; email: string }

const TIPOS_NUTRI    = ['Consulta', 'Retorno', 'Avaliação nutricional', 'Outro']
const TIPOS_PERSONAL = ['Treino', 'Avaliação física', 'Retorno', 'Outro']

function getTodayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function formatDataBR(data: string) {
  const [y, m, d] = data.split('-')
  const hoje = getTodayBR()
  const dt = new Date(hoje + 'T12:00:00-03:00'); dt.setDate(dt.getDate() + 1)
  const amanhaStr = dt.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  if (data === hoje) return 'Hoje'
  if (data === amanhaStr) return 'Amanhã'
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const d2 = new Date(data + 'T12:00:00')
  return `${dias[d2.getDay()]}, ${d}/${m}`
}
function formatHora(hora: string) { return hora.substring(0, 5) }

export default function Agenda() {
  const router = useRouter()
  const [tipo, setTipo] = useState('')
  const [profId, setProfId] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  const [novoClienteId, setNovoClienteId] = useState('')
  const [novaData, setNovaData] = useState(getTodayBR())
  const [novaHora, setNovaHora] = useState('08:00')
  const [novoTipo, setNovoTipo] = useState('Consulta')
  const [novasNotas, setNovasNotas] = useState('')
  const [recorrencia, setRecorrencia] = useState<'nenhuma' | 'semanal' | 'quinzenal'>('nenhuma')
  const [recorrenciaSemanas, setRecorrenciaSemanas] = useState(8)

  const tiposOpcoes = tipo === 'nutricionista' ? TIPOS_NUTRI : TIPOS_PERSONAL

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      setProfId(uid)

      const { data: perfil } = await supabase.from('perfis').select('tipo').eq('id', uid).single()
      const tipoUser = perfil?.tipo ?? ''
      setTipo(tipoUser)
      setNovoTipo(tipoUser === 'nutricionista' ? 'Consulta' : 'Treino')

      const { data: vinculos } = await supabase.from('vinculos').select('cliente_id').eq('profissional_id', uid)
      const ids = (vinculos ?? []).map((v: any) => v.cliente_id)
      if (ids.length === 0) { setCarregando(false); return }

      const { data: perfis } = await supabase.from('perfis').select('id,nome,email').in('id', ids)
      setClientes(perfis ?? [])

      const hoje = getTodayBR()
      const fim = new Date(hoje + 'T12:00:00-03:00'); fim.setDate(fim.getDate() + 60)
      const fimStr = fim.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

      const { data: ags } = await supabase
        .from('agendamentos')
        .select('id,cliente_id,data,hora,tipo,notas,status')
        .eq('profissional_id', uid)
        .gte('data', hoje).lte('data', fimStr)
        .order('data').order('hora')

      const mapa = Object.fromEntries((perfis ?? []).map((p: any) => [p.id, p]))
      setAgendamentos((ags ?? []).map((a: any) => ({
        ...a,
        clienteNome: mapa[a.cliente_id]?.nome ?? null,
        clienteEmail: mapa[a.cliente_id]?.email ?? '',
      })))
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function criarAgendamento() {
    if (!novoClienteId || !novaData || !novaHora) return
    setSalvando(true)
    const c = clientes.find(x => x.id === novoClienteId)
    const intervaloDias = recorrencia === 'semanal' ? 7 : recorrencia === 'quinzenal' ? 14 : 0
    const total = intervaloDias > 0 ? recorrenciaSemanas : 1
    const novosAgs: Agendamento[] = []
    for (let i = 0; i < total; i++) {
      const d = new Date(novaData + 'T12:00:00-03:00')
      d.setDate(d.getDate() + i * intervaloDias)
      const dataStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const { data: ag } = await supabase.from('agendamentos').insert({
        profissional_id: profId, cliente_id: novoClienteId,
        data: dataStr, hora: novaHora, tipo: novoTipo,
        notas: novasNotas || null, status: 'agendado',
      }).select('id,cliente_id,data,hora,tipo,notas,status').single()
      if (ag) novosAgs.push({ ...(ag as any), clienteNome: c?.nome ?? null, clienteEmail: c?.email ?? '' })
    }
    if (novosAgs.length) {
      setAgendamentos(prev => [...prev, ...novosAgs].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)))
    }
    setNovoClienteId(''); setNovasNotas(''); setNovaData(getTodayBR()); setNovaHora('08:00')
    setRecorrencia('nenhuma'); setRecorrenciaSemanas(8)
    setShowModal(false); setSalvando(false)
  }

  async function marcarRealizado(id: string) {
    await supabase.from('agendamentos').update({ status: 'realizado' }).eq('id', id)
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'realizado' } : a))
  }
  async function cancelar(id: string) {
    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
    setAgendamentos(prev => prev.filter(a => a.id !== id))
  }

  const [vistaCalendario, setVistaCalendario] = useState<'semana' | 'mes'>('semana')
  const [mesAtual, setMesAtual] = useState(() => {
    const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
  })

  const hoje = getTodayBR()
  // Semana atual: dom→sáb
  const semana7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje + 'T12:00:00-03:00')
    const dow = d.getDay()
    d.setDate(d.getDate() - dow + i)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  })
  const DIAS_LABEL = ['D','S','T','Q','Q','S','S']

  const grupos = agendamentos.reduce<Record<string, Agendamento[]>>((acc, a) => {
    if (!acc[a.data]) acc[a.data] = []; acc[a.data].push(a); return acc
  }, {})

  const STATUS_COR: Record<string, string> = {
    agendado: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    realizado: 'text-green-400 bg-green-500/10 border-green-500/20',
    cancelado: 'text-zinc-600 bg-white/[0.03] border-white/[0.06]',
  }
  const STATUS_LABEL: Record<string, string> = { agendado: 'Agendado', realizado: 'Realizado', cancelado: 'Cancelado' }

  if (carregando) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-0.5">KORE</p>
            <h1 className="text-[1.85rem] font-black tracking-tight">Agenda</h1>
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center text-xl font-black active:scale-95 transition-all">
            +
          </button>
        </div>

        {/* Toggle semana / mês */}
        <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['semana', 'mes'] as const).map(v => (
            <button key={v} onClick={() => setVistaCalendario(v)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${vistaCalendario === v ? 'bg-white text-black' : 'text-zinc-500'}`}>
              {v === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Calendário semanal */}
        {vistaCalendario === 'semana' && (
        <div className="rounded-2xl border border-white/[0.06] p-4 mb-5" style={{ background: '#0f0f0f' }}>
          <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 mb-3">Esta semana</p>
          <div className="grid grid-cols-7 gap-1">
            {semana7.map((dia, i) => {
              const temAg = grupos[dia]?.length > 0
              const isHoje = dia === hoje
              const [,,dd] = dia.split('-')
              return (
                <div key={dia} className="flex flex-col items-center gap-1">
                  <p className={`text-[9px] uppercase font-semibold ${isHoje ? 'text-white' : 'text-zinc-600'}`}>{DIAS_LABEL[i]}</p>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold relative
                    ${isHoje ? 'bg-white text-black' : temAg ? 'bg-white/[0.08] text-white border border-white/[0.12]' : 'text-zinc-700'}`}>
                    {dd}
                    {temAg && !isHoje && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
                    )}
                  </div>
                  {grupos[dia] && (
                    <p className="text-[8px] text-green-400 font-bold">{grupos[dia].length}x</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        )}

        {/* Calendário mensal */}
        {vistaCalendario === 'mes' && (() => {
          const [mesY, mesM] = mesAtual.split('-').map(Number)
          const primeiroDia = new Date(mesY, mesM - 1, 1)
          const ultimoDia = new Date(mesY, mesM, 0)
          const inicioGrid = primeiroDia.getDay()
          const totalDias = ultimoDia.getDate()
          const cells = Array.from({ length: inicioGrid + totalDias }, (_, i) => {
            if (i < inicioGrid) return null
            const d = i - inicioGrid + 1
            return `${mesY}-${String(mesM).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          })
          const mesLabel = new Date(mesY, mesM - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          return (
            <div className="rounded-2xl border border-white/[0.06] p-4 mb-5" style={{ background: '#0f0f0f' }}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => { const d = new Date(mesY, mesM - 2, 1); setMesAtual(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] text-zinc-400 flex items-center justify-center active:scale-90 transition-all">‹</button>
                <p className="text-white font-bold text-sm capitalize">{mesLabel}</p>
                <button onClick={() => { const d = new Date(mesY, mesM, 1); setMesAtual(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] text-zinc-400 flex items-center justify-center active:scale-90 transition-all">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['D','S','T','Q','Q','S','S'].map((l, i) => <p key={i} className="text-[9px] text-zinc-600 text-center font-semibold uppercase">{l}</p>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((dia, i) => {
                  if (!dia) return <div key={`e${i}`} />
                  const temAg = (grupos[dia]?.length ?? 0) > 0
                  const isHoje = dia === hoje
                  const d = dia.split('-')[2]
                  return (
                    <div key={dia} className="flex flex-col items-center gap-0.5 py-0.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold relative
                        ${isHoje ? 'bg-white text-black' : temAg ? 'bg-white/[0.08] text-white border border-white/[0.12]' : 'text-zinc-600'}`}>
                        {d}
                        {temAg && !isHoje && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />}
                      </div>
                      {temAg && <p className="text-[7px] text-green-400 font-bold leading-none">{grupos[dia].length}x</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {Object.keys(grupos).length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] p-10 text-center" style={{ background: '#0f0f0f' }}>
            <p className="text-3xl mb-3">📅</p>
            <p className="text-white font-bold mb-1">Agenda vazia</p>
            <p className="text-zinc-500 text-sm">Toque em + para agendar uma consulta ou treino.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grupos).map(([data, ags]) => (
              <div key={data}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-white text-sm font-black">{formatDataBR(data)}</p>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <p className="text-zinc-600 text-[10px]">{ags.length} compromisso{ags.length > 1 ? 's' : ''}</p>
                </div>
                <div className="space-y-2">
                  {ags.map(ag => (
                    <div key={ag.id} className={`rounded-2xl border overflow-hidden ${ag.status === 'realizado' ? 'border-white/[0.04] opacity-60' : 'border-white/[0.08]'}`} style={{ background: '#0f0f0f' }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-white font-black text-base leading-none">{formatHora(ag.hora)}</p>
                          <p className="text-zinc-600 text-[9px] mt-0.5 leading-tight">{ag.tipo}</p>
                        </div>
                        <div className="w-px h-8 bg-white/[0.06] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{ag.clienteNome ?? ag.clienteEmail}</p>
                          {ag.notas && <p className="text-zinc-500 text-xs truncate mt-0.5">{ag.notas}</p>}
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider font-semibold border rounded-full px-2 py-0.5 shrink-0 ${STATUS_COR[ag.status] ?? ''}`}>
                          {STATUS_LABEL[ag.status] ?? ag.status}
                        </span>
                      </div>
                      {ag.status === 'agendado' && (
                        <div className="flex border-t border-white/[0.04]">
                          {cancelandoId === ag.id ? (
                            <>
                              <span className="flex-1 py-2.5 text-center text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Confirmar cancelamento?</span>
                              <div className="w-px bg-white/[0.04]" />
                              <button onClick={() => { cancelar(ag.id); setCancelandoId(null) }}
                                className="px-4 py-2.5 text-red-400 text-[10px] uppercase tracking-wider font-semibold hover:bg-red-500/5 transition-colors active:scale-95">
                                Sim
                              </button>
                              <div className="w-px bg-white/[0.04]" />
                              <button onClick={() => setCancelandoId(null)}
                                className="px-4 py-2.5 text-zinc-400 text-[10px] uppercase tracking-wider font-semibold hover:bg-white/[0.02] transition-colors active:scale-95">
                                Não
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => marcarRealizado(ag.id)}
                                className="flex-1 py-2.5 text-green-400 text-[10px] uppercase tracking-wider font-semibold hover:bg-green-500/5 transition-colors active:scale-95">
                                ✓ Realizado
                              </button>
                              <div className="w-px bg-white/[0.04]" />
                              <button onClick={() => setCancelandoId(ag.id)}
                                className="flex-1 py-2.5 text-zinc-600 text-[10px] uppercase tracking-wider font-semibold hover:bg-white/[0.02] transition-colors active:scale-95">
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NavBar tipo={tipo || 'nutricionista'} ativa="agenda" />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl border border-white/[0.08] px-5 pt-5 pb-8 space-y-4" style={{ background: '#111' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-black text-lg">Novo agendamento</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">{tipo === 'nutricionista' ? 'Paciente' : 'Aluno'}</p>
              <select value={novoClienteId} onChange={e => setNovoClienteId(e.target.value)}
                className="w-full text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]"
                style={{ colorScheme: 'dark', background: '#141414' }}>
                <option value="">Selecionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome ?? c.email}</option>)}
              </select>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {tiposOpcoes.map(t => (
                  <button key={t} onClick={() => setNovoTipo(t)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${novoTipo === t ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-zinc-400 border-white/[0.08]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Data</p>
                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                  className="w-full bg-white/[0.05] text-white rounded-xl px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Hora</p>
                <input type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)}
                  className="w-full bg-white/[0.05] text-white rounded-xl px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Observações (opcional)</p>
              <input value={novasNotas} onChange={e => setNovasNotas(e.target.value)}
                placeholder="Ex: Trazer exames, primeira consulta..."
                className="w-full bg-white/[0.05] text-white placeholder-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/[0.08]" />
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Recorrência</p>
              <div className="grid grid-cols-3 gap-2">
                {(['nenhuma', 'semanal', 'quinzenal'] as const).map(r => (
                  <button key={r} onClick={() => setRecorrencia(r)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 capitalize ${recorrencia === r ? 'bg-white/[0.1] border-white/30 text-white' : 'bg-white/[0.03] border-white/[0.06] text-zinc-500'}`}>
                    {r === 'nenhuma' ? 'Não repetir' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              {recorrencia !== 'nenhuma' && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-zinc-500 text-xs flex-1">Repetir por quantas semanas?</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRecorrenciaSemanas(s => Math.max(2, s - 1))} className="w-8 h-8 rounded-lg bg-white/[0.06] text-white text-sm font-bold active:scale-90 transition-all">−</button>
                    <span className="text-white font-bold text-sm w-6 text-center">{recorrenciaSemanas}</span>
                    <button onClick={() => setRecorrenciaSemanas(s => Math.min(26, s + 1))} className="w-8 h-8 rounded-lg bg-white/[0.06] text-white text-sm font-bold active:scale-90 transition-all">+</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={criarAgendamento} disabled={!novoClienteId || !novaData || !novaHora || salvando}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm tracking-widest uppercase active:scale-95 transition-all disabled:opacity-30">
              {salvando ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

