'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AceitarConvite() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [estado, setEstado] = useState<'carregando' | 'valido' | 'expirado' | 'invalido' | 'aceito' | 'erro'>('carregando')
  const [convite, setConvite] = useState<any>(null)
  const [processando, setProcessando] = useState(false)
  const [erroMsg, setErroMsg] = useState('')

  useEffect(() => {
    async function verificarConvite() {
      if (!token) { setEstado('invalido'); return }

      // Tenta encontrar convite válido (pendente e não expirado)
      const { data: conviteValido } = await supabase
        .from('convites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pendente')
        .gt('expira_em', new Date().toISOString())
        .single()

      if (conviteValido) {
        const { data: remetente } = await supabase
          .from('perfis').select('nome, email, tipo').eq('id', conviteValido.profissional_id).single()
        setConvite({ ...conviteValido, remetente })
        setEstado('valido')
        return
      }

      // Verifica se existe mas está expirado
      const { data: conviteExpirado } = await supabase
        .from('convites')
        .select('*')
        .eq('token', token)
        .single()

      if (conviteExpirado) {
        const { data: remetente } = await supabase
          .from('perfis').select('nome, email, tipo').eq('id', conviteExpirado.profissional_id).single()
        setConvite({ ...conviteExpirado, remetente })
        setEstado('expirado')
        return
      }

      setEstado('invalido')
    }
    verificarConvite()
  }, [token])

  async function handleAceitar() {
    setProcessando(true)
    setErroMsg('')

    const { data: { session } } = await supabase.auth.getSession()

    // Não logado — salva token e manda para login/cadastro
    if (!session) {
      localStorage.setItem('kore_convite_token', token)
      router.push('/?convite=' + token)
      return
    }

    // Verifica se já tem perfil
    const { data: perfilLogado } = await supabase
      .from('perfis')
      .select('tipo, id')
      .eq('id', session.user.id)
      .single()

    if (!perfilLogado) {
      localStorage.setItem('kore_convite_token', token)
      router.push('/onboarding?convite=' + token)
      return
    }

    // ─── LÓGICA BIDIRECIONAL DE VÍNCULO ───────────────────────────────────────
    // O convite tem: profissional_id (quem enviou) e tipo_profissional (papel de quem enviou)
    // Quem ACEITA pode ser qualquer tipo — precisamos montar o vínculo corretamente.
    //
    // Caso A: Personal enviou convite para aluno
    //   → profissional_id = ID do personal, tipo = 'personal'
    //   → quem aceita é o CLIENTE
    //   → vínculo: profissional_id = convite.profissional_id, cliente_id = session.user.id
    //
    // Caso B: Cliente enviou convite para personal
    //   → profissional_id = ID do cliente (quem enviou), tipo = 'personal'
    //   → quem aceita é o PERSONAL
    //   → vínculo: profissional_id = session.user.id, cliente_id = convite.profissional_id
    // ─────────────────────────────────────────────────────────────────────────

    const tipoConvite = convite.tipo_profissional // 'personal' ou 'nutricionista'
    const tipoLogado = perfilLogado.tipo // tipo de quem está aceitando

    let vinculo: { profissional_id: string; cliente_id: string; tipo: string }

    if (tipoLogado === 'cliente') {
      // Quem aceita é cliente → quem enviou é o profissional
      vinculo = {
        profissional_id: convite.profissional_id,
        cliente_id: session.user.id,
        tipo: tipoConvite,
      }
    } else if (tipoLogado === 'personal' || tipoLogado === 'nutricionista') {
      // Quem aceita é o profissional → quem enviou é o cliente
      vinculo = {
        profissional_id: session.user.id,
        cliente_id: convite.profissional_id,
        tipo: tipoLogado,
      }
    } else {
      setErroMsg('Tipo de conta inválido para aceitar este convite.')
      setEstado('erro')
      setProcessando(false)
      return
    }


    // Insere vínculo — ignora se já existe (código 23505 = unique violation)
    const { error: erroVinculo } = await supabase
      .from('vinculos')
      .insert({ ...vinculo, ativo: true })

    if (erroVinculo && erroVinculo.code !== '23505') {
      setErroMsg('Erro ao criar vínculo: ' + erroVinculo.message)
      setEstado('erro')
      setProcessando(false)
      return
    }

    // Marca convite como aceito
    await supabase.from('convites').update({ status: 'aceito' }).eq('token', token)

    setEstado('aceito')
    setProcessando(false)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  // ── Labels dinâmicos ──────────────────────────────────────────────────────
  const nomeRemetente = convite?.remetente?.nome ?? convite?.email_convidado ?? 'alguém'
  const tipoRemetente = convite?.remetente?.tipo
  const labelTipo = tipoRemetente === 'personal' ? 'Personal Trainer'
    : tipoRemetente === 'nutricionista' ? 'Nutricionista'
    : 'Atleta'
  const siglaRemetente = tipoRemetente === 'personal' ? 'PT'
    : tipoRemetente === 'nutricionista' ? 'NU'
    : 'AT'
  const corRemetente = tipoRemetente === 'personal'
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
    : tipoRemetente === 'nutricionista'
    ? 'bg-green-500/20 text-green-400 border-green-500/20'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'

  const itensAcesso = tipoRemetente === 'personal' ? [
    'Treinos prescritos especialmente para você',
    'Seu personal acompanha recuperação e evolução',
    'Análise IA cruzando treino e sono',
    'Histórico de cargas e progressão',
  ] : tipoRemetente === 'nutricionista' ? [
    'Plano alimentar personalizado',
    'Acompanhamento de composição corporal',
    'Dados de gasto calórico por treino',
    'Integração com dados de sono e recuperação',
  ] : [
    'Montar treinos personalizados para este atleta',
    'Ver score de recuperação em tempo real',
    'Análise IA de performance pós-treino',
    'Alertas automáticos de performance',
  ]

  return (
    <main className="min-h-[100dvh] bg-[#0d1117] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-[0.2em] text-white">KORE</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] mt-2">Performance. Integrada.</p>
        </div>

        {/* Carregando */}
        {estado === 'carregando' && (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Verificando convite...</p>
          </div>
        )}

        {/* Expirado */}
        {estado === 'expirado' && (
          <div className="rounded-2xl p-8 border border-yellow-500/20 text-center" style={{ background: '#131b2e' }}>
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-black mb-2">Convite expirado</h2>
            {convite?.remetente?.nome && (
              <p className="text-zinc-400 text-sm mb-1">
                Este convite de <strong className="text-white">{convite.remetente.nome}</strong> expirou após 7 dias.
              </p>
            )}
            <p className="text-zinc-500 text-sm mb-6">
              Peça para {convite?.remetente?.nome ?? 'o profissional'} enviar um novo link de convite.
            </p>
            <button onClick={() => router.push('/login')} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-all uppercase tracking-wider">
              Ir para o KORE
            </button>
          </div>
        )}

        {/* Inválido */}
        {estado === 'invalido' && (
          <div className="rounded-2xl p-8 border border-white/[0.11] text-center" style={{ background: '#131b2e' }}>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-black mb-3">Convite inválido</h2>
            <p className="text-zinc-500 text-sm mb-6">Este link de convite não é válido ou já foi utilizado.</p>
            <button onClick={() => router.push('/login')} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-all uppercase tracking-wider">
              Ir para o KORE
            </button>
          </div>
        )}

        {/* Válido */}
        {estado === 'valido' && (
          <div className="rounded-2xl p-8 border border-white/[0.11]" style={{ background: '#131b2e' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-lg font-black shrink-0 ${corRemetente}`}>
                {siglaRemetente}
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-0.5">{labelTipo}</p>
                <p className="text-white font-black text-lg leading-tight">{nomeRemetente}</p>
                <p className="text-zinc-500 text-xs">te convidou para o KORE</p>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              {itensAcesso.map((item) => (
                <div key={item} className="flex items-center gap-3 py-2 border-b border-white/[0.09]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <p className="text-zinc-400 text-sm">{item}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleAceitar}
              disabled={processando}
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-40 text-sm tracking-widest uppercase"
            >
              {processando ? 'Conectando...' : 'Aceitar convite'}
            </button>

            <p className="text-zinc-700 text-xs text-center mt-4">
              Ao aceitar, vocês dois ficam conectados no KORE
            </p>
          </div>
        )}

        {/* Aceito */}
        {estado === 'aceito' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
            <h2 className="text-2xl font-black mb-3">Conectado!</h2>
            <p className="text-zinc-500 text-sm">Você e {nomeRemetente} agora estão conectados no KORE.</p>
            <p className="text-zinc-600 text-xs mt-2">Redirecionando...</p>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="rounded-2xl p-8 border border-red-500/20 text-center" style={{ background: '#131b2e' }}>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-black mb-3">Erro ao conectar</h2>
            <p className="text-zinc-500 text-sm mb-6">{erroMsg || 'Tente novamente ou entre em contato.'}</p>
            <button onClick={handleAceitar} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-all uppercase tracking-wider">
              Tentar novamente
            </button>
          </div>
        )}

      </div>
    </main>
  )
}