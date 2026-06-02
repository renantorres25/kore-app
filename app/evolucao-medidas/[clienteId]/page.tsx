'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import SidebarProfissional from '../../components/SidebarProfissional'

type Medicao = {
  id: string
  data: string
  peso: number | null
  gordura_pct: number | null
  massa_muscular: number | null
  cintura: number | null
  quadril: number | null
  abdomen: number | null
  peitoral: number | null
  braco_dir: number | null
  braco_esq: number | null
  coxa_dir: number | null
  coxa_esq: number | null
  panturrilha_dir: number | null
  panturrilha_esq: number | null
  observacoes: string | null
}

type FormMedicao = {
  data: string
  peso: string
  gordura_pct: string
  massa_muscular: string
  cintura: string
  quadril: string
  abdomen: string
  peitoral: string
  braco_dir: string
  braco_esq: string
  coxa_dir: string
  coxa_esq: string
  panturrilha_dir: string
  panturrilha_esq: string
  observacoes: string
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

const FORM_VAZIO: FormMedicao = {
  data: getTodayBR(),
  peso: '', gordura_pct: '', massa_muscular: '',
  cintura: '', quadril: '', abdomen: '', peitoral: '',
  braco_dir: '', braco_esq: '', coxa_dir: '', coxa_esq: '',
  panturrilha_dir: '', panturrilha_esq: '',
  observacoes: '',
}

function MiniChart({ dados, campo, cor }: { dados: Medicao[]; campo: keyof Medicao; cor: string }) {
  const pts = dados
    .map(d => ({ data: d.data, val: d[campo] as number | null }))
    .filter(p => p.val != null)
    .reverse()

  if (pts.length < 2) return null

  const vals = pts.map(p => p.val as number)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 200
  const H = 36
  const pad = 4

  const points = pts.map((p, i) => {
    const x = pad + (i / (pts.length - 1)) * (W - pad * 2)
    const y = H - pad - ((p.val as number - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })

  const areaPoints = `${points[0].split(',')[0]},${H} ${points.join(' ')} ${points[points.length - 1].split(',')[0]},${H}`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={`g-${campo}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#g-${campo})`} />
      <polyline points={points.join(' ')} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const [x, y] = points[i].split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={cor} />
      })}
    </svg>
  )
}

function DeltaBadge({ atual, anterior, campo, unidade = '', inverso = false }: { atual: number | null; anterior: number | null; campo?: string; unidade?: string; inverso?: boolean }) {
  if (atual == null || anterior == null) return null
  const diff = atual - anterior
  if (diff === 0) return null
  const positivo = inverso ? diff < 0 : diff > 0
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${positivo ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
      {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unidade}
    </span>
  )
}

const INPUT_CLASS = "w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors text-center"

export default function EvolucaoMedidasPage() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.clienteId as string

  const [medicoes, setMedicoes] = useState<Medicao[]>([])
  const [form, setForm] = useState<FormMedicao>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [backUrl, setBackUrl] = useState('/dashboard')
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [meuperfil, setMeuPerfil] = useState<{ tipo: string } | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'composicao' | 'circunferencias'>('historico')

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: perfil } = await supabase.from('perfis').select('tipo, nome').eq('id', session.user.id).single()
      setMeuPerfil(perfil)

      const { data: clientePerfil } = await supabase.from('perfis').select('nome, email').eq('id', clienteId).single()
      setClienteNome(clientePerfil?.nome ?? clientePerfil?.email ?? null)

      if (perfil?.tipo === 'personal') setBackUrl(`/personal/aluno/${clienteId}`)
      else if (perfil?.tipo === 'nutricionista') setBackUrl(`/nutricionista/paciente/${clienteId}`)
      else setBackUrl('/perfil')

      const { data } = await supabase.from('evolucao_medidas')
        .select('*').eq('cliente_id', clienteId)
        .order('data', { ascending: false })
      setMedicoes(data ?? [])
      setCarregando(false)
    }
    carregar()
  }, [clienteId, router])

  function set(field: keyof FormMedicao, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function abrirNova() {
    setForm({ ...FORM_VAZIO, data: getTodayBR() })
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(m: Medicao) {
    setForm({
      data: m.data,
      peso: m.peso != null ? String(m.peso) : '',
      gordura_pct: m.gordura_pct != null ? String(m.gordura_pct) : '',
      massa_muscular: m.massa_muscular != null ? String(m.massa_muscular) : '',
      cintura: m.cintura != null ? String(m.cintura) : '',
      quadril: m.quadril != null ? String(m.quadril) : '',
      abdomen: m.abdomen != null ? String(m.abdomen) : '',
      peitoral: m.peitoral != null ? String(m.peitoral) : '',
      braco_dir: m.braco_dir != null ? String(m.braco_dir) : '',
      braco_esq: m.braco_esq != null ? String(m.braco_esq) : '',
      coxa_dir: m.coxa_dir != null ? String(m.coxa_dir) : '',
      coxa_esq: m.coxa_esq != null ? String(m.coxa_esq) : '',
      panturrilha_dir: m.panturrilha_dir != null ? String(m.panturrilha_dir) : '',
      panturrilha_esq: m.panturrilha_esq != null ? String(m.panturrilha_esq) : '',
      observacoes: m.observacoes ?? '',
    })
    setEditandoId(m.id)
    setErro('')
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const payload = {
      cliente_id: clienteId,
      registrado_por: session.user.id,
      data: form.data,
      peso: form.peso ? parseFloat(form.peso) : null,
      gordura_pct: form.gordura_pct ? parseFloat(form.gordura_pct) : null,
      massa_muscular: form.massa_muscular ? parseFloat(form.massa_muscular) : null,
      cintura: form.cintura ? parseFloat(form.cintura) : null,
      quadril: form.quadril ? parseFloat(form.quadril) : null,
      abdomen: form.abdomen ? parseFloat(form.abdomen) : null,
      peitoral: form.peitoral ? parseFloat(form.peitoral) : null,
      braco_dir: form.braco_dir ? parseFloat(form.braco_dir) : null,
      braco_esq: form.braco_esq ? parseFloat(form.braco_esq) : null,
      coxa_dir: form.coxa_dir ? parseFloat(form.coxa_dir) : null,
      coxa_esq: form.coxa_esq ? parseFloat(form.coxa_esq) : null,
      panturrilha_dir: form.panturrilha_dir ? parseFloat(form.panturrilha_dir) : null,
      panturrilha_esq: form.panturrilha_esq ? parseFloat(form.panturrilha_esq) : null,
      observacoes: form.observacoes.trim() || null,
    }

    let error
    if (editandoId) {
      const res = await supabase.from('evolucao_medidas').update(payload).eq('id', editandoId)
      error = res.error
    } else {
      const res = await supabase.from('evolucao_medidas').insert(payload)
      error = res.error
    }

    if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }

    const { data } = await supabase.from('evolucao_medidas').select('*').eq('cliente_id', clienteId).order('data', { ascending: false })
    setMedicoes(data ?? [])
    setModalAberto(false)
    setSalvando(false)
  }

  async function deletar(id: string) {
    await supabase.from('evolucao_medidas').delete().eq('id', id)
    setMedicoes(prev => prev.filter(m => m.id !== id))
  }

  if (carregando) return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const isProfissional = meuperfil?.tipo === 'personal' || meuperfil?.tipo === 'nutricionista'
  const mais_recente = medicoes[0] ?? null
  const anterior = medicoes[1] ?? null

  const METRICAS_COMPOSICAO = [
    { campo: 'peso' as keyof Medicao,          label: 'Peso',          unidade: 'kg',  cor: '#60a5fa', inverso: false },
    { campo: 'gordura_pct' as keyof Medicao,   label: 'Gordura',       unidade: '%',   cor: '#f87171', inverso: true  },
    { campo: 'massa_muscular' as keyof Medicao,label: 'Massa muscular', unidade: 'kg',  cor: '#34d399', inverso: false },
  ]

  const METRICAS_CIRC = [
    { campo: 'cintura' as keyof Medicao,         label: 'Cintura',      cor: '#facc15' },
    { campo: 'quadril' as keyof Medicao,          label: 'Quadril',     cor: '#a78bfa' },
    { campo: 'abdomen' as keyof Medicao,          label: 'Abdômen',     cor: '#f97316' },
    { campo: 'peitoral' as keyof Medicao,         label: 'Peitoral',    cor: '#60a5fa' },
    { campo: 'braco_dir' as keyof Medicao,        label: 'Braço dir.',  cor: '#34d399' },
    { campo: 'coxa_dir' as keyof Medicao,         label: 'Coxa dir.',   cor: '#e879f9' },
    { campo: 'panturrilha_dir' as keyof Medicao,  label: 'Panturrilha', cor: '#fb923c' },
  ]

  const tipoSidebar = meuperfil?.tipo === 'personal' ? 'personal' : 'nutricionista'

  return (
    <main className="min-h-[100dvh] text-white md:flex" style={{ background: '#0f172a' }}>
      {isProfissional && <SidebarProfissional tipo={tipoSidebar} />}
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div className="max-w-md mx-auto px-4 pb-12 md:max-w-3xl md:px-8" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(backUrl)} className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/[0.14] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shrink-0">←</button>
            <div>
              <h1 className="text-xl font-black tracking-tight">Evolução</h1>
              <p className="text-zinc-500 text-xs mt-0.5">{clienteNome ?? 'Medidas corporais'}</p>
            </div>
          </div>
          {isProfissional && (
            <button onClick={abrirNova} className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center text-lg font-black active:scale-90 transition-all">+</button>
          )}
        </div>

        {medicoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/[0.11] flex items-center justify-center text-3xl opacity-40">📏</div>
            <div className="text-center">
              <p className="text-white font-bold mb-1">Sem medidas registradas</p>
              <p className="text-zinc-600 text-sm">{isProfissional ? 'Registre a primeira avaliação corporal' : 'Seu profissional ainda não registrou medidas'}</p>
            </div>
            {isProfissional && (
              <button onClick={abrirNova} className="mt-2 bg-white text-black font-bold px-6 py-3 rounded-xl text-sm active:scale-95 transition-all">+ Registrar medidas</button>
            )}
          </div>
        ) : (
          <>
            {/* Snapshot atual */}
            {mais_recente && (
              <div className="rounded-2xl p-5 border border-white/[0.11] mb-5" style={{ background: '#1e293b' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Último registro</p>
                  <span className="text-zinc-600 text-xs">{new Date(mais_recente.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {METRICAS_COMPOSICAO.map(m => {
                    const val = mais_recente[m.campo] as number | null
                    const prev = anterior ? anterior[m.campo] as number | null : null
                    return (
                      <div key={m.campo} className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.14]">
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1">{m.label}</p>
                        {val != null ? (
                          <div>
                            <p className="text-white font-black text-base">{val}<span className="text-zinc-600 text-[10px] font-normal ml-0.5">{m.unidade}</span></p>
                            <DeltaBadge atual={val} anterior={prev} unidade={m.unidade} inverso={m.inverso} />
                          </div>
                        ) : <p className="text-zinc-700 text-sm">—</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Abas */}
            <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {([['historico', '📅 Histórico'], ['composicao', '⚖️ Composição'], ['circunferencias', '📐 Circunf.']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setAbaAtiva(id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${abaAtiva === id ? 'bg-white text-black' : 'text-zinc-500'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* ABA HISTÓRICO */}
            {abaAtiva === 'historico' && (
              <div className="space-y-2">
                {medicoes.map((m, idx) => (
                  <div key={m.id} className="rounded-2xl p-4 border border-white/[0.11]" style={{ background: '#1e293b' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-bold text-sm">{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        {idx === 0 && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider">Mais recente</span>}
                      </div>
                      {isProfissional && (
                        <div className="flex gap-2">
                          <button onClick={() => abrirEditar(m)} className="text-[10px] text-zinc-500 border border-white/[0.14] rounded-lg px-2.5 py-1.5 hover:border-white/20 hover:text-white active:scale-95 transition-all">Editar</button>
                          <button onClick={() => deletar(m.id)} className="text-[10px] text-red-500/60 border border-red-500/20 rounded-lg px-2.5 py-1.5 hover:text-red-400 active:scale-95 transition-all">✕</button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.peso != null && <span className="text-xs text-zinc-300 bg-white/[0.05] border border-white/[0.11] rounded-lg px-2.5 py-1">{m.peso}kg</span>}
                      {m.gordura_pct != null && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1">{m.gordura_pct}% gord.</span>}
                      {m.massa_muscular != null && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">{m.massa_muscular}kg musc.</span>}
                      {m.cintura != null && <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2.5 py-1">{m.cintura}cm cin.</span>}
                      {m.abdomen != null && <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1">{m.abdomen}cm abd.</span>}
                    </div>
                    {m.observacoes && <p className="text-zinc-600 text-xs mt-2 italic">{m.observacoes}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ABA COMPOSIÇÃO */}
            {abaAtiva === 'composicao' && (
              <div className="space-y-3">
                {METRICAS_COMPOSICAO.map(m => {
                  const pontos = medicoes.filter(d => d[m.campo] != null)
                  if (pontos.length === 0) return (
                    <div key={m.campo} className="rounded-2xl p-5 border border-white/[0.11]" style={{ background: '#1e293b' }}>
                      <p className="text-zinc-500 text-sm">{m.label} — sem dados</p>
                    </div>
                  )
                  const atual = mais_recente?.[m.campo] as number | null
                  const prev = anterior?.[m.campo] as number | null
                  const primeiro = [...pontos].reverse()[0][m.campo] as number | null
                  const totalDelta = atual != null && primeiro != null ? atual - primeiro : null
                  return (
                    <div key={m.campo} className="rounded-2xl p-5 border border-white/[0.11]" style={{ background: '#1e293b' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-0.5">{m.label}</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-white font-black text-2xl">{atual ?? '—'}<span className="text-zinc-600 text-sm font-normal ml-0.5">{m.unidade}</span></p>
                            {atual != null && prev != null && <DeltaBadge atual={atual} anterior={prev} unidade={m.unidade} inverso={m.inverso} />}
                          </div>
                          {totalDelta != null && pontos.length > 1 && (
                            <p className={`text-[11px] mt-0.5 ${(m.inverso ? -totalDelta : totalDelta) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(1)}{m.unidade} total
                            </p>
                          )}
                        </div>
                        <p className="text-zinc-700 text-[10px]">{pontos.length} medições</p>
                      </div>
                      <MiniChart dados={medicoes} campo={m.campo} cor={m.cor} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* ABA CIRCUNFERÊNCIAS */}
            {abaAtiva === 'circunferencias' && (
              <div className="space-y-3">
                {METRICAS_CIRC.map(m => {
                  const pontos = medicoes.filter(d => d[m.campo] != null)
                  const atual = mais_recente?.[m.campo] as number | null
                  const prev = anterior?.[m.campo] as number | null
                  return (
                    <div key={m.campo} className="rounded-2xl p-4 border border-white/[0.11] flex items-center gap-4" style={{ background: '#1e293b' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-0.5">{m.label}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-white font-black text-lg">{atual != null ? `${atual}cm` : '—'}</p>
                          {atual != null && prev != null && <DeltaBadge atual={atual} anterior={prev} unidade="cm" inverso={m.campo !== 'peitoral' && m.campo !== 'massa_muscular' && m.campo !== 'braco_dir' && m.campo !== 'braco_esq' && m.campo !== 'coxa_dir' && m.campo !== 'coxa_esq' && m.campo !== 'panturrilha_dir'} />}
                        </div>
                        {pontos.length === 0 && <p className="text-zinc-700 text-[10px]">sem dados</p>}
                      </div>
                      {pontos.length >= 2 && (
                        <div className="shrink-0">
                          <MiniChart dados={medicoes} campo={m.campo} cor={m.cor} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal nova medição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-t-3xl border border-white/[0.14] overflow-hidden" style={{ background: '#1e293b', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

            <div className="flex items-center justify-between p-5 border-b border-white/[0.11] shrink-0">
              <p className="text-white font-black text-lg">{editandoId ? 'Editar medidas' : 'Nova avaliação'}</p>
              <button onClick={() => setModalAberto(false)} className="w-9 h-9 rounded-xl bg-white/[0.09] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Data */}
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Data da avaliação</label>
                <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 transition-colors"
                  style={{ colorScheme: 'dark' }} />
              </div>

              {/* Composição corporal */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-3">⚖️ Composição corporal</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: 'peso' as keyof FormMedicao, label: 'Peso', unit: 'kg' },
                    { field: 'gordura_pct' as keyof FormMedicao, label: 'Gordura', unit: '%' },
                    { field: 'massa_muscular' as keyof FormMedicao, label: 'Musc.', unit: 'kg' },
                  ].map(({ field, label, unit }) => (
                    <div key={field}>
                      <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">{label} ({unit})</label>
                      <input type="number" value={form[field] as string} onChange={e => set(field, e.target.value)}
                        placeholder="—" step="0.1" className={INPUT_CLASS} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Circunferências */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-3">📐 Circunferências (cm)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: 'cintura' as keyof FormMedicao, label: 'Cintura' },
                    { field: 'quadril' as keyof FormMedicao, label: 'Quadril' },
                    { field: 'abdomen' as keyof FormMedicao, label: 'Abdômen' },
                    { field: 'peitoral' as keyof FormMedicao, label: 'Peitoral' },
                    { field: 'braco_dir' as keyof FormMedicao, label: 'Braço D' },
                    { field: 'braco_esq' as keyof FormMedicao, label: 'Braço E' },
                    { field: 'coxa_dir' as keyof FormMedicao, label: 'Coxa D' },
                    { field: 'coxa_esq' as keyof FormMedicao, label: 'Coxa E' },
                    { field: 'panturrilha_dir' as keyof FormMedicao, label: 'Pantur. D' },
                    { field: 'panturrilha_esq' as keyof FormMedicao, label: 'Pantur. E' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="text-zinc-600 text-[9px] uppercase tracking-wider block mb-1.5">{label}</label>
                      <input type="number" value={form[field] as string} onChange={e => set(field, e.target.value)}
                        placeholder="—" step="0.1" className={INPUT_CLASS} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-zinc-500 text-[10px] uppercase tracking-widest block mb-2">Observações <span className="text-zinc-700 normal-case">(opcional)</span></label>
                <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                  placeholder="Contexto desta avaliação, como o cliente está se sentindo..."
                  rows={2} className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors resize-none" />
              </div>
            </div>

            <div className="p-5 border-t border-white/[0.11] shrink-0">
              {erro && <p className="text-red-400 text-xs text-center mb-3 bg-red-500/10 rounded-xl py-2 px-3">{erro}</p>}
              <button onClick={salvar} disabled={salvando || !form.data}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-40 transition-all tracking-wide">
                {salvando ? 'Salvando...' : editandoId ? 'Atualizar medidas' : 'Registrar avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  )
}
