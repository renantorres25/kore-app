'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type TipoUsuario = 'cliente' | 'personal' | 'nutricionista' | null

export default function ConvitePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>(null)
  const [tipoProfissional, setTipoProfissional] = useState<'personal' | 'nutricionista'>('personal')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [convitesPendentes, setConvitesPendentes] = useState<{ id: string; email_convidado: string; criado_em: string }[]>([])
  const [cancelando, setCancelando] = useState<string | null>(null)

  async function recarregarPendentes(userId: string) {
    const { data } = await supabase.from('convites').select('id, email_convidado, criado_em').eq('profissional_id', userId).eq('status', 'pendente').order('criado_em', { ascending: false }).limit(10)
    setConvitesPendentes(data ?? [])
  }

  useEffect(() => {
    async function detectarTipo() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [{ data: perfil }, { data: pendentes }] = await Promise.all([
        supabase.from('perfis').select('tipo').eq('id', session.user.id).single(),
        supabase.from('convites').select('id, email_convidado, criado_em').eq('profissional_id', session.user.id).eq('status', 'pendente').order('criado_em', { ascending: false }).limit(10),
      ])

      setTipoUsuario(perfil?.tipo ?? null)
      setConvitesPendentes(pendentes ?? [])
    }
    detectarTipo()
  }, [router])

  async function cancelarConvite(id: string) {
    setCancelando(id)
    await supabase.from('convites').update({ status: 'cancelado' }).eq('id', id)
    setConvitesPendentes(prev => prev.filter(c => c.id !== id))
    setCancelando(null)
  }

  // ── Labels dinâmicos por tipo de usuário ──────────────────────────────────

  function getTituloConvite() {
    if (tipoUsuario === 'personal') return 'Convidar Aluno'
    if (tipoUsuario === 'nutricionista') return 'Convidar Paciente'
    return 'Convidar para o KORE'
  }

  function getLabelEmail() {
    if (tipoUsuario === 'personal') return 'Email do aluno'
    if (tipoUsuario === 'nutricionista') return 'Email do paciente'
    return `Email do ${tipoProfissional === 'personal' ? 'personal trainer' : 'nutricionista'}`
  }

  function getTipoParaEnvio(): string {
    // Personal e nutri convidam clientes
    if (tipoUsuario === 'personal' || tipoUsuario === 'nutricionista') return tipoUsuario
    // Cliente convida profissional
    return tipoProfissional
  }

  function getItensAcesso(): string[] {
    if (tipoUsuario === 'personal') return [
      'Receberá treinos montados por você',
      'Você verá o score de recuperação dele',
      'Acompanhe cargas e evolução em tempo real',
      'Alertas automáticos quando precisar de atenção',
    ]
    if (tipoUsuario === 'nutricionista') return [
      'Receberá o plano alimentar de você',
      'Você verá o gasto calórico real por treino',
      'Acompanhe peso e composição corporal',
      'Dados de sono e recuperação integrados',
    ]
    // Cliente
    return tipoProfissional === 'personal' ? [
      'Seu score de recuperação diário',
      'Dados de sono e bem-estar',
      'Histórico de cargas e evolução',
      'Alertas quando precisar de atenção',
    ] : [
      'Seu gasto calórico real por treino',
      'Dados de sono e recuperação',
      'Histórico de bem-estar e sintomas',
      'Evolução de peso e composição',
    ]
  }

  async function handleEnviar() {
    if (!email.trim()) { setErro('Digite o email para continuar.'); return }

    setEnviando(true)
    setErro('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: perfil } = await supabase
      .from('perfis')
      .select('nome, tipo')
      .eq('id', session.user.id)
      .single()

    const response = await fetch('/api/convite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_convidado: email.trim(),
        tipo_profissional: getTipoParaEnvio(),
        profissional_id: session.user.id,
        nome_profissional: perfil?.nome ?? session.user.email,
      }),
    })

    const data = await response.json()

    if (data.erro) {
      setErro('Erro ao enviar convite. Tente novamente.')
      setEnviando(false)
      return
    }

    setEnviado(true)
    setEnviando(false)
  }

  function getVoltar() {
    router.push('/dashboard')
  }

  // ── Estado: enviado ───────────────────────────────────────────────────────

  if (enviado) {
    return (
      <main className="min-h-[100dvh] bg-[#080808] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mx-auto mb-6">
            ✓
          </div>
          <h2 className="text-2xl font-black mb-3">Convite enviado!</h2>
          <p className="text-zinc-500 text-sm mb-8">
            Um email foi enviado para <span className="text-white font-semibold">{email}</span> com o link de acesso ao KORE.
          </p>
          <button
            onClick={() => { setEnviado(false); setEmail('') }}
            className="w-full border border-white/10 text-zinc-400 font-bold py-3 rounded-xl text-sm hover:border-white/30 hover:text-white transition-all active:scale-95 mb-3 uppercase tracking-wider"
          >
            Convidar outro
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-100 transition-all active:scale-95 uppercase tracking-wider"
          >
            Voltar ao dashboard
          </button>
        </div>
      </main>
    )
  }

  // ── Tela principal ────────────────────────────────────────────────────────

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white">
      <div className="max-w-md mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={getVoltar}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">{getTituloConvite()}</h1>
            <p className="text-zinc-500 text-xs">
              {tipoUsuario === 'personal' ? 'Conecte seu aluno ao KORE'
               : tipoUsuario === 'nutricionista' ? 'Conecte seu paciente ao KORE'
               : 'Conecte seu time de performance'}
            </p>
          </div>
        </div>

        {/* Seletor de tipo — só para clientes */}
        {tipoUsuario === 'cliente' && (
          <div className="mb-6">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Quem você quer convidar?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { valor: 'personal', sigla: 'PT', label: 'Personal Trainer', cor: 'bg-blue-500/20 text-blue-400 border-blue-500/20', corAtivo: 'bg-blue-500/30 border-blue-400' },
                { valor: 'nutricionista', sigla: 'NU', label: 'Nutricionista', cor: 'bg-green-500/20 text-green-400 border-green-500/20', corAtivo: 'bg-green-500/30 border-green-400' },
              ].map((p) => (
                <button
                  key={p.valor}
                  onClick={() => setTipoProfissional(p.valor as 'personal' | 'nutricionista')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all active:scale-95 ${
                    tipoProfissional === p.valor ? p.corAtivo : 'bg-zinc-900 border-white/[0.08]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-sm font-black ${p.cor}`}>
                    {p.sigla}
                  </div>
                  <span className="text-white text-sm font-semibold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* O que o convidado vai ter acesso */}
        <div className="rounded-2xl p-5 border border-white/[0.06] mb-6" style={{ background: '#0f0f0f' }}>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-4">
            {tipoUsuario === 'cliente' ? 'O que ele vai ver no KORE' : 'O que você vai acompanhar'}
          </p>
          <div className="space-y-3">
            {getItensAcesso().map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <p className="text-zinc-400 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Campo de email */}
        <div className="mb-6">
          <label className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-2 block">
            {getLabelEmail()}
          </label>
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
            className="w-full bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-white/20 border border-white/[0.08] transition-all"
          />
        </div>

        {erro && <p className="text-red-400 text-sm text-center mb-4">{erro}</p>}

        <button
          onClick={handleEnviar}
          disabled={enviando || !email.trim()}
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-30 text-sm tracking-widest uppercase"
        >
          {enviando ? 'Enviando...' : 'Enviar convite'}
        </button>

        <p className="text-zinc-700 text-xs text-center mt-4">
          O convite expira em 7 dias
        </p>

        {/* Convites pendentes */}
        {convitesPendentes.length > 0 && (
          <div className="mt-8">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-3">Aguardando resposta</p>
            <div className="space-y-2">
              {convitesPendentes.map(c => {
                const diasRestantes = Math.max(0, 7 - Math.floor((Date.now() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24)))
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-3" style={{ background: '#0f0f0f' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.email_convidado}</p>
                      <p className="text-zinc-600 text-[10px]">{diasRestantes > 0 ? `Expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}` : 'Expirado'}</p>
                    </div>
                    <button onClick={() => cancelarConvite(c.id)} disabled={cancelando === c.id}
                      className="text-[10px] text-red-500/60 border border-red-500/20 rounded-lg px-2.5 py-1.5 active:scale-95 transition-all disabled:opacity-40 shrink-0">
                      {cancelando === c.id ? '...' : 'Cancelar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
