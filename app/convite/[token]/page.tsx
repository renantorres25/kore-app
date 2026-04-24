'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AceitarConvite() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [estado, setEstado] = useState<'carregando' | 'valido' | 'invalido' | 'aceito' | 'erro'>('carregando')
  const [convite, setConvite] = useState<any>(null)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    async function verificarConvite() {
      if (!token) { setEstado('invalido'); return }

      const { data } = await supabase
        .from('convites')
        .select('*, perfis!convites_profissional_id_fkey(nome, email)')
        .eq('token', token)
        .eq('status', 'pendente')
        .gt('expira_em', new Date().toISOString())
        .single()

      if (!data) { setEstado('invalido'); return }

      setConvite(data)
      setEstado('valido')
    }
    verificarConvite()
  }, [token])

  async function handleAceitar() {
    setProcessando(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // Salva o token e redireciona para login/cadastro
      localStorage.setItem('kore_convite_token', token)
      router.push('/?convite=' + token)
      return
    }

    // Verifica se já tem perfil
    const { data: perfil } = await supabase
      .from('perfis')
      .select('tipo')
      .eq('id', session.user.id)
      .single()

    if (!perfil) {
      localStorage.setItem('kore_convite_token', token)
      router.push('/onboarding?convite=' + token)
      return
    }

    // Cria o vínculo
    const { error: erroVinculo } = await supabase
      .from('vinculos')
      .insert({
        profissional_id: convite.profissional_id,
        cliente_id: session.user.id,
        tipo: convite.tipo_profissional,
      })

    if (erroVinculo && !erroVinculo.message.includes('duplicate')) {
      setEstado('erro')
      setProcessando(false)
      return
    }

    // Marca convite como aceito
    await supabase
      .from('convites')
      .update({ status: 'aceito' })
      .eq('token', token)

    setEstado('aceito')
    setProcessando(false)

    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const nomeProfissional = convite?.perfis?.nome ?? convite?.email_convidado ?? 'seu profissional'
  const tipoProfissionalLabel = convite?.tipo_profissional === 'personal' ? 'Personal Trainer' : 'Nutricionista'

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-[0.2em] text-white">KORE</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] mt-2">Performance. Integrada.</p>
        </div>

        {/* Carregando */}
        {estado === 'carregando' && (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Verificando convite...</p>
          </div>
        )}

        {/* Inválido */}
        {estado === 'invalido' && (
          <div className="rounded-2xl p-8 border border-white/6 text-center" style={{ background: '#0f0f0f' }}>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-black mb-3">Convite inválido</h2>
            <p className="text-zinc-500 text-sm mb-6">Este link de convite expirou ou não é válido.</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-all uppercase tracking-wider"
            >
              Ir para o KORE
            </button>
          </div>
        )}

        {/* Válido */}
        {estado === 'valido' && (
          <div className="rounded-2xl p-8 border border-white/6" style={{ background: '#0f0f0f' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-lg font-black shrink-0 ${
                convite?.tipo_profissional === 'personal'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                  : 'bg-green-500/20 text-green-400 border-green-500/20'
              }`}>
                {convite?.tipo_profissional === 'personal' ? 'PT' : 'NU'}
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] mb-0.5">{tipoProfissionalLabel}</p>
                <p className="text-white font-black text-lg leading-tight">{nomeProfissional}</p>
                <p className="text-zinc-500 text-xs">te convidou para o KORE</p>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              {[
                'Score de recuperação diário com IA',
                'Treinos e planos integrados',
                'Evolução com dados reais',
                'Análise cruzada de todos os dados',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 py-2 border-b border-white/5">
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
              Ao aceitar, {nomeProfissional} poderá ver seus dados de performance
            </p>
          </div>
        )}

        {/* Aceito */}
        {estado === 'aceito' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-black mb-3">Conectado!</h2>
            <p className="text-zinc-500 text-sm">
              Você e {nomeProfissional} agora estão conectados no KORE.
            </p>
            <p className="text-zinc-600 text-xs mt-2">Redirecionando...</p>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="rounded-2xl p-8 border border-red-500/20 text-center" style={{ background: '#0f0f0f' }}>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-black mb-3">Erro ao conectar</h2>
            <p className="text-zinc-500 text-sm mb-6">Tente novamente ou entre em contato.</p>
            <button
              onClick={handleAceitar}
              className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-all uppercase tracking-wider"
            >
              Tentar novamente
            </button>
          </div>
        )}

      </div>
    </main>
  )
}