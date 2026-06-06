'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import SidebarProfissional from '../components/SidebarProfissional'

/* Design System: Energetic Precision */
const C = {
  energy: '#FF5A36', energy2: '#FF8A3D',
  good: '#2DD4A7', sleep: '#60A5FA', recovery: '#A78BFA',
  warn: '#F5B544', danger: '#FB7185',
  t1: '#F5F6F8', t2: '#9AA0AD', t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_DATA = "ui-monospace, 'SF Mono', 'Roboto Mono', monospace"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  color: C.t1,
  colorScheme: 'dark',
  fontFamily: FONT_BODY,
  fontSize: 14,
  padding: '12px 14px',
  width: '100%',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
}

function applyFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'rgba(255,90,54,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(255,90,54,0.12)'
}
function removeFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.10)'
  e.target.style.boxShadow = 'none'
}

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c()
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

const objetivos = [
  { valor: 'perder_peso',              label: 'Perder peso',     cor: C.energy },
  { valor: 'ganhar_massa',             label: 'Ganhar massa',    cor: C.energy2 },
  { valor: 'melhorar_condicionamento', label: 'Condicionamento', cor: C.good },
  { valor: 'saude_geral',              label: 'Saúde geral',     cor: C.danger },
]

const niveis = [
  { valor: 'iniciante',     label: 'Iniciante',     desc: 'Menos de 1 ano treinando' },
  { valor: 'intermediario', label: 'Intermediário', desc: '1 a 3 anos treinando' },
  { valor: 'avancado',      label: 'Avançado',      desc: 'Mais de 3 anos treinando' },
]

const modalidadesOpcoes = [
  { valor: 'musculacao', label: 'Musculação' },
  { valor: 'corrida',    label: 'Corrida' },
  { valor: 'bike',       label: 'Bike' },
  { valor: 'natacao',    label: 'Natação' },
  { valor: 'crossfit',   label: 'Crossfit' },
  { valor: 'triatlon',   label: 'Triathlon' },
  { valor: 'futebol',    label: 'Futebol' },
  { valor: 'outro',      label: 'Outro' },
]

function PerfilConteudo() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNovo = searchParams.get('novo') === 'true'
  const isDesktop = useIsDesktop()

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [userId, setUserId] = useState('')
  const [stravaConectado, setStravaConectado] = useState(false)
  const [stravaAthleta, setStravaAthleta] = useState<string | null>(null)
  const [stravaUltimaSync, setStravaUltimaSync] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState('')

  // Dados básicos (clientes)
  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [nivel, setNivel] = useState('')

  // Dados atléticos (clientes)
  const [fcmax, setFcmax] = useState('')
  const [ftp, setFtp] = useState('')
  const [modalidades, setModalidades] = useState<string[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'basico' | 'atletico'>('basico')

  // Wearable Terra
  const [wearableConectado, setWearableConectado] = useState<{ provider: string; last_sync: string | null; athlete_name?: string; athlete_photo?: string } | null>(null)
  const [conectandoWearable, setConectandoWearable] = useState(false)

  // Dados profissionais
  const [especialidade, setEspecialidade] = useState('')
  const [registroProfissional, setRegistroProfissional] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [valorConsulta, setValorConsulta] = useState('')
  const [formacao, setFormacao] = useState('')

  // Mostra toast quando Strava conecta/desconecta
  useEffect(() => {
    const stravaParam = searchParams.get('strava')
    if (stravaParam === 'conectado') setSucesso('Strava conectado! Suas atividades serão sincronizadas automaticamente.')
    if (stravaParam === 'erro') setErro('Erro ao conectar com Strava. Tente novamente.')
  }, [])

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      setEmail(session.user.email ?? '')
      verificarWearable(session.user.id)

      const { data } = await supabase.from('perfis').select('*').eq('id', session.user.id).single()
      if (data) {
        setNome(data.nome ?? '')
        setTipo(data.tipo ?? '')
        if (data.data_nascimento) setDataNascimento(data.data_nascimento)
        if (data.sexo) setSexo(data.sexo)
        if (data.peso) setPeso(String(data.peso))
        if (data.altura) setAltura(String(data.altura))
        if (data.objetivo) setObjetivo(data.objetivo)
        if (data.nivel) setNivel(data.nivel)
        if (data.fcmax) setFcmax(String(data.fcmax))
        if (data.ftp) setFtp(String(data.ftp))
        if (data.modalidades) setModalidades(data.modalidades)
        if (data.especialidade) setEspecialidade(data.especialidade)
        if (data.registro_profissional) setRegistroProfissional(data.registro_profissional)
        if (data.whatsapp) setWhatsapp(data.whatsapp)
        if (data.instagram) setInstagram(data.instagram)
        if (data.valor_consulta) setValorConsulta(data.valor_consulta)
        if (data.formacao) setFormacao(data.formacao)
      }
      setCarregando(false)
    }
    carregar()
  }, [router])

  function calcularIdade() {
    if (!dataNascimento) return null
    const hoje = new Date()
    const nasc = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  // FCmax estimada pela fórmula 220-idade se não informado
  function getFCmaxEstimada(): number | null {
    if (fcmax) return parseInt(fcmax)
    const idade = calcularIdade()
    if (!idade) return null
    return 220 - idade
  }

  function calcularZonas() {
    const fcmaxVal = getFCmaxEstimada()
    if (!fcmaxVal) return null
    return {
      Z1: { min: Math.round(fcmaxVal * 0.50), max: Math.round(fcmaxVal * 0.60) },
      Z2: { min: Math.round(fcmaxVal * 0.60), max: Math.round(fcmaxVal * 0.70) },
      Z3: { min: Math.round(fcmaxVal * 0.70), max: Math.round(fcmaxVal * 0.80) },
      Z4: { min: Math.round(fcmaxVal * 0.80), max: Math.round(fcmaxVal * 0.90) },
      Z5: { min: Math.round(fcmaxVal * 0.90), max: fcmaxVal },
    }
  }

  function calcularIMC() {
    if (!peso || !altura) return null
    const p = parseFloat(peso)
    const a = parseFloat(altura) / 100
    return (p / (a * a)).toFixed(1)
  }

  function getStatusIMC(imc: number) {
    if (imc < 18.5) return { label: 'Abaixo do peso', cor: C.sleep }
    if (imc < 25)   return { label: 'Peso normal',    cor: C.good }
    if (imc < 30)   return { label: 'Sobrepeso',      cor: C.warn }
    return                  { label: 'Obesidade',      cor: C.danger }
  }

  function toggleModalidade(val: string) {
    setModalidades(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  async function verificarWearable(uid: string) {
    const res = await fetch(`/api/strava/status?usuarioId=${uid}`)
    const data = await res.json()
    if (data.conectado) setWearableConectado({
      provider: 'Strava',
      last_sync: data.last_sync,
      athlete_name: data.athlete_name,
      athlete_photo: data.athlete_photo,
    })
  }

  async function conectarWearable() {
    if (!userId) return
    window.location.href = `/api/strava/auth?usuarioId=${userId}`
  }

  async function desconectarWearable() {
    if (!userId) return
    await fetch(`/api/strava/status?usuarioId=${userId}`, { method: 'DELETE' })
    setWearableConectado(null)
  }

  async function handleSync() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const btn = document.getElementById('sync-btn')
    if (btn) btn.textContent = 'Sincronizando...'
    const res = await fetch('/api/strava/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: session.user.id }),
    })
    const data = await res.json()
    if (btn) btn.textContent = data.inseridos > 0 ? `${data.inseridos} atividades` : 'Sincronizar'
    setTimeout(() => { if (btn) btn.textContent = 'Sincronizar' }, 3000)
  }

  async function handleSalvar() {
    if (!(tipo === 'personal' || tipo === 'nutricionista') && (!dataNascimento || !sexo || !peso || !altura || !objetivo || !nivel)) {
      setErro('Preencha todos os campos básicos para continuar.')
      return
    }
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('perfis').update({
      data_nascimento: dataNascimento || null,
      sexo: sexo || null,
      peso: peso ? parseFloat(peso) : null,
      altura: altura ? parseInt(altura) : null,
      objetivo: objetivo || null,
      nivel: nivel || null,
      perfil_completo: true,
      fcmax: fcmax ? parseInt(fcmax) : null,
      ftp: ftp ? parseInt(ftp) : null,
      modalidades: modalidades.length > 0 ? modalidades : null,
      especialidade: especialidade.trim() || null,
      registro_profissional: registroProfissional.trim() || null,
      whatsapp: whatsapp.trim() || null,
      instagram: instagram.trim() || null,
      valor_consulta: valorConsulta.trim() || null,
      formacao: formacao.trim() || null,
    }).eq('id', userId)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
    setSalvando(false)
    if (isNovo) { router.push('/dashboard') }
    else { setSucesso(true); setTimeout(() => setSucesso(false), 2000) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const imc = calcularIMC()
  const statusIMC = imc ? getStatusIMC(parseFloat(imc)) : null
  const idade = calcularIdade()
  const zonas = calcularZonas()
  const fcmaxEstimada = getFCmaxEstimada()
  const tipoLabel = tipo === 'personal' ? 'Personal Trainer' : tipo === 'nutricionista' ? 'Nutricionista' : 'Atleta'
  const tipoColor = tipo === 'personal' ? C.sleep : tipo === 'nutricionista' ? C.good : C.energy
  const isProf = tipo === 'personal' || tipo === 'nutricionista'
  const camposPreenchidos = isProf ? true : !!(dataNascimento && sexo && peso && altura && objetivo && nivel)
  const progresso = [dataNascimento, sexo, peso, altura, objetivo, nivel].filter(Boolean).length

  const iniciais = (nome || email || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()

  const labelStyle: React.CSSProperties = {
    color: C.t2, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
    display: 'block', marginBottom: 6,
  }
  const sectionTitle: React.CSSProperties = {
    color: C.t3, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14,
  }

  function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const { style, ...rest } = props
    return <input {...rest} style={{ ...inputBase, ...(style || {}) }} onFocus={applyFocus} onBlur={removeFocus} />
  }

  if (carregando) return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: C.energy,
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )

  return (
    <main style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY, paddingLeft: isDesktop ? 220 : 0, display: isProf ? 'flex' : 'block' }}>
      {isProf && <SidebarProfissional tipo={tipo as 'nutricionista' | 'personal'} />}
      <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{
        maxWidth: isDesktop ? 800 : 520, margin: '0 auto',
        padding: isDesktop ? '48px 32px 120px' : '0 16px 120px',
        paddingTop: isDesktop ? 48 : 'max(48px, calc(env(safe-area-inset-top) + 24px))',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ color: C.t3, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>KORE</p>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.t1, lineHeight: 1.05 }}>
              {isNovo ? 'Bem-vindo' : 'Perfil'}
            </h1>
            {isNovo && <p style={{ color: C.t3, fontSize: 13, marginTop: 6 }}>Complete seu perfil para a IA te ajudar melhor</p>}
          </div>
          {!isNovo && (
            <button onClick={handleLogout}
              style={{
                fontSize: 10, color: C.t2, border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 10, padding: '8px 14px', background: 'transparent',
                textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                fontFamily: FONT_BODY, fontWeight: 600,
              }}>
              Sair
            </button>
          )}
        </div>

        {/* Progresso novo usuário */}
        {isNovo && (
          <div style={{ ...glass, padding: 18, marginBottom: 18, borderColor: 'rgba(45,212,167,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ color: C.good, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Configuração do perfil</p>
              <p style={{ color: C.good, fontSize: 11, fontWeight: 700, fontFamily: FONT_DATA }}>{progresso}/6</p>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.09)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.energy}, ${C.energy2})`, borderRadius: 999, transition: 'width .5s', width: `${(progresso / 6) * 100}%` }} />
            </div>
            <p style={{ color: C.t3, fontSize: 11, marginTop: 8 }}>
              {progresso === 6 ? 'Tudo preenchido. Salve para entrar.' : 'Dados básicos obrigatórios. Dados atléticos opcionais mas melhoram muito a IA.'}
            </p>
          </div>
        )}

        {/* Card identidade */}
        <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(255,90,54,0.35)',
            }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: '#fff' }}>{iniciais}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: FONT_DISPLAY, color: C.t1, fontWeight: 700, fontSize: 18, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome || 'Sem nome'}</p>
              <p style={{ color: C.t3, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', marginTop: 8,
                borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 600,
                color: tipoColor, border: `1px solid ${tipoColor}33`, background: `${tipoColor}1A`,
              }}>
                {tipoLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {imc && (
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center' }}>
              {[
                { label: 'Idade', val: idade, sub: 'anos', cor: C.t1, subCor: C.t3 },
                { label: 'IMC', val: imc, sub: statusIMC?.label, cor: C.t1, subCor: statusIMC?.cor ?? C.t3 },
                { label: 'FCmax', val: fcmaxEstimada ?? '—', sub: fcmax ? 'real' : 'estimada', cor: fcmax ? C.t1 : C.t3, subCor: C.t3 },
                { label: 'FTP', val: ftp || '—', sub: 'watts', cor: ftp ? C.energy : C.t3, subCor: C.t3 },
              ].map((s, i) => (
                <div key={i}>
                  <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontFamily: FONT_DATA, fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 700, color: s.cor }}>{s.val}</p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: s.subCor }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abas — só mostra aba atlética para clientes */}
        {!isProf && (
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, marginBottom: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {([['basico', 'Dados básicos'], ['atletico', 'Dados atléticos']] as const).map(([id, label]) => {
              const active = abaAtiva === id
              return (
                <button key={id} onClick={() => setAbaAtiva(id)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all .15s',
                    background: active ? `linear-gradient(135deg, ${C.energy}, ${C.energy2})` : 'transparent',
                    color: active ? '#fff' : C.t2,
                    boxShadow: active ? '0 6px 18px rgba(255,90,54,0.3)' : 'none',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* PERFIL PROFISSIONAL */}
        {isProf && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...glass, padding: 20 }}>
              <p style={sectionTitle}>Informações profissionais</p>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 16 }}>
                <div style={{ gridColumn: isDesktop ? '1 / -1' : 'auto' }}>
                  <label style={labelStyle}>{tipo === 'nutricionista' ? 'CRN' : 'CREF'} — Registro profissional</label>
                  <GlassInput type="text"
                    placeholder={tipo === 'nutricionista' ? 'Ex: CRN 12345' : 'Ex: CREF 123456-G/SP'}
                    value={registroProfissional} onChange={e => setRegistroProfissional(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Especialidade</label>
                  <GlassInput type="text"
                    placeholder={tipo === 'nutricionista' ? 'Ex: Nutrição esportiva' : 'Ex: Musculação, Funcional'}
                    value={especialidade} onChange={e => setEspecialidade(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Formação</label>
                  <GlassInput type="text"
                    placeholder="Ex: Nutrição — USP 2018"
                    value={formacao} onChange={e => setFormacao(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp</label>
                  <GlassInput type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Instagram</label>
                  <GlassInput type="text"
                    placeholder="@seu_perfil"
                    value={instagram} onChange={e => setInstagram(e.target.value)} />
                </div>
                <div style={{ gridColumn: isDesktop ? '1 / -1' : 'auto' }}>
                  <label style={labelStyle}>Valor da consulta</label>
                  <GlassInput type="text"
                    placeholder="Ex: R$ 150 / consulta"
                    value={valorConsulta} onChange={e => setValorConsulta(e.target.value)} />
                </div>
              </div>
            </div>
            <p style={{ color: C.t3, fontSize: 12, padding: '12px 4px 0' }}>Estes dados aparecem para seus pacientes/alunos quando eles visualizam o time deles.</p>
          </div>
        )}

        {/* ABA BÁSICO */}
        {abaAtiva === 'basico' && !isProf && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 16 }}>
              <div style={{ ...glass, padding: 20 }}>
                <p style={sectionTitle}>Data de nascimento</p>
                <GlassInput type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
              </div>

              <div style={{ ...glass, padding: 20 }}>
                <p style={sectionTitle}>Sexo</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[{ valor: 'masculino', label: 'Masc' }, { valor: 'feminino', label: 'Fem' }, { valor: 'outro', label: 'Outro' }].map(s => {
                    const sel = sexo === s.valor
                    return (
                      <button key={s.valor} onClick={() => setSexo(s.valor)}
                        style={{
                          padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: FONT_BODY, transition: 'all .15s',
                          background: sel ? `linear-gradient(135deg, ${C.energy}, ${C.energy2})` : 'rgba(255,255,255,0.05)',
                          color: sel ? '#fff' : C.t2,
                          border: sel ? 'none' : '1px solid rgba(255,255,255,0.10)',
                          boxShadow: sel ? '0 6px 18px rgba(255,90,54,0.3)' : 'none',
                        }}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ ...glass, padding: 20 }}>
              <p style={sectionTitle}>Medidas</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Peso (kg)</label>
                  <GlassInput type="number" placeholder="75" value={peso} onChange={e => setPeso(e.target.value)} style={{ fontFamily: FONT_DATA }} />
                </div>
                <div>
                  <label style={labelStyle}>Altura (cm)</label>
                  <GlassInput type="number" placeholder="175" value={altura} onChange={e => setAltura(e.target.value)} style={{ fontFamily: FONT_DATA }} />
                </div>
              </div>
            </div>

            <div style={{ ...glass, padding: 20 }}>
              <p style={sectionTitle}>Objetivo principal</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {objetivos.map(o => {
                  const sel = objetivo === o.valor
                  return (
                    <button key={o.valor} onClick={() => setObjetivo(o.valor)}
                      style={{
                        padding: '16px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                        fontFamily: FONT_BODY, transition: 'all .15s',
                        background: sel ? `${o.cor}1F` : 'rgba(255,255,255,0.05)',
                        color: sel ? o.cor : C.t1,
                        border: sel ? `1px solid ${o.cor}66` : '1px solid rgba(255,255,255,0.10)',
                        boxShadow: sel ? `0 0 0 3px ${o.cor}18` : 'none',
                      }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: o.cor, marginBottom: 8 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{o.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ ...glass, padding: 20 }}>
              <p style={sectionTitle}>Nível de experiência</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {niveis.map(n => {
                  const sel = nivel === n.valor
                  return (
                    <button key={n.valor} onClick={() => setNivel(n.valor)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                        fontFamily: FONT_BODY, transition: 'all .15s',
                        background: sel ? 'linear-gradient(135deg, rgba(255,90,54,0.18), rgba(255,138,61,0.12))' : 'rgba(255,255,255,0.05)',
                        border: sel ? `1px solid ${C.energy}66` : '1px solid rgba(255,255,255,0.10)',
                        boxShadow: sel ? '0 0 0 3px rgba(255,90,54,0.12)' : 'none',
                      }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: sel ? C.energy : C.t3, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{n.label}</p>
                        <p style={{ fontSize: 12, color: C.t3 }}>{n.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA ATLÉTICO */}
        {abaAtiva === 'atletico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,138,61,0.08)', border: '1px solid rgba(255,138,61,0.18)', borderRadius: 16, padding: '14px 16px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: C.energy2, marginTop: 6, flexShrink: 0 }} />
              <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.55 }}>Dados opcionais — mas quanto mais você preencher, mais precisa e personalizada será a análise da IA. A FCmax real é o dado mais importante.</p>
            </div>

            {/* Modalidades */}
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ ...sectionTitle, marginBottom: 4 }}>Modalidades que pratica</p>
              <p style={{ color: C.t3, fontSize: 12, marginBottom: 14 }}>Selecione todas que fazem parte da sua rotina</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {modalidadesOpcoes.map(m => {
                  const sel = modalidades.includes(m.valor)
                  return (
                    <button key={m.valor} onClick={() => toggleModalidade(m.valor)}
                      style={{
                        padding: '12px 4px', borderRadius: 12, cursor: 'pointer', fontFamily: FONT_BODY,
                        fontSize: 11, fontWeight: 700, transition: 'all .15s', textAlign: 'center', lineHeight: 1.2,
                        background: sel ? 'rgba(45,212,167,0.15)' : 'rgba(255,255,255,0.03)',
                        color: sel ? C.good : C.t3,
                        border: sel ? `1px solid ${C.good}66` : '1px solid rgba(255,255,255,0.10)',
                      }}>
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* FCmax */}
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ ...sectionTitle, marginBottom: 4, color: C.danger }}>Frequência cardíaca máxima (FCmax)</p>
              <p style={{ color: C.t3, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>O dado mais importante para análise de zonas. Faça um teste de FCmax ou use o valor do seu Garmin/Apple Watch. Sem isso, estimamos pela fórmula 220-idade.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <GlassInput type="number" placeholder={fcmaxEstimada ? `Estimada: ${fcmaxEstimada}` : 'Ex: 185'} value={fcmax}
                  onChange={e => setFcmax(e.target.value)} style={{ flex: 1, fontFamily: FONT_DATA }} />
                <span style={{ color: C.t3, fontSize: 14, flexShrink: 0 }}>bpm</span>
              </div>
              {fcmax && zonas && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Suas zonas calculadas</p>
                  {Object.entries(zonas).map(([zona, { min, max }]) => {
                    const cores: Record<string, string> = { Z1: C.sleep, Z2: C.good, Z3: C.warn, Z4: C.energy2, Z5: C.danger }
                    const labels: Record<string, string> = { Z1: 'Recuperação', Z2: 'Base aeróbica', Z3: 'Tempo', Z4: 'Limiar', Z5: 'VO2max' }
                    return (
                      <div key={zona} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: cores[zona], fontFamily: FONT_DATA }}>{zona}</span>
                          <span style={{ color: C.t3, fontSize: 11 }}>{labels[zona]}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: cores[zona], fontFamily: FONT_DATA, fontVariantNumeric: 'tabular-nums' }}>{min}–{max} bpm</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {!fcmax && idade && (
                <p style={{ color: C.t3, fontSize: 10, marginTop: 8 }}>Sem FCmax real, usaremos estimativa de {220 - idade}bpm (220 - {idade} anos)</p>
              )}
            </div>

            {/* FTP bike */}
            <div style={{ ...glass, padding: 20 }}>
              <p style={{ ...sectionTitle, marginBottom: 4, color: C.energy }}>FTP — Limiar de Potência Funcional</p>
              <p style={{ color: C.t3, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>Para ciclistas com medidor de potência. É a maior potência que você sustenta por 1 hora. Usado para calcular zonas de potência no bike.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <GlassInput type="number" placeholder="Ex: 220" value={ftp}
                  onChange={e => setFtp(e.target.value)} style={{ flex: 1, fontFamily: FONT_DATA }} />
                <span style={{ color: C.t3, fontSize: 14, flexShrink: 0 }}>watts</span>
              </div>
              {ftp && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Zonas de potência</p>
                  {[
                    { zona: 'Z1', label: 'Recuperação ativa', min: 0,    max: Math.round(parseInt(ftp) * 0.55), cor: C.sleep },
                    { zona: 'Z2', label: 'Endurance',          min: Math.round(parseInt(ftp) * 0.56), max: Math.round(parseInt(ftp) * 0.75), cor: C.good },
                    { zona: 'Z3', label: 'Tempo',              min: Math.round(parseInt(ftp) * 0.76), max: Math.round(parseInt(ftp) * 0.90), cor: C.warn },
                    { zona: 'Z4', label: 'Limiar (FTP)',       min: Math.round(parseInt(ftp) * 0.91), max: Math.round(parseInt(ftp) * 1.05), cor: C.energy2 },
                    { zona: 'Z5', label: 'VO2max',             min: Math.round(parseInt(ftp) * 1.06), max: Math.round(parseInt(ftp) * 1.20), cor: C.danger },
                  ].map(z => (
                    <div key={z.zona} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: z.cor, fontFamily: FONT_DATA }}>{z.zona}</span>
                        <span style={{ color: C.t3, fontSize: 11 }}>{z.label}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: z.cor, fontFamily: FONT_DATA, fontVariantNumeric: 'tabular-nums' }}>{z.min}–{z.max}W</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {erro && <p style={{ color: C.danger, fontSize: 14, textAlign: 'center', marginTop: 16 }}>{erro}</p>}
        {sucesso && <p style={{ color: C.good, fontSize: 14, textAlign: 'center', marginTop: 16 }}>Perfil salvo</p>}

        <button onClick={handleSalvar} disabled={salvando || !camposPreenchidos}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 16, marginTop: 24, border: 'none',
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: salvando || !camposPreenchidos ? 'default' : 'pointer',
            color: '#fff', background: `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
            boxShadow: salvando || !camposPreenchidos ? 'none' : '0 10px 30px rgba(255,90,54,0.4), 0 0 0 1px rgba(255,90,54,0.2)',
            opacity: salvando || !camposPreenchidos ? 0.35 : 1, transition: 'opacity .15s',
          }}>
          {salvando ? 'Salvando...' : isNovo ? 'Entrar no KORE' : 'Salvar perfil'}
        </button>

        {isNovo && !camposPreenchidos && (
          <p style={{ color: C.t3, fontSize: 11, textAlign: 'center', marginTop: 12 }}>Preencha todos os campos básicos para continuar</p>
        )}
        {isNovo && (
          <button onClick={() => router.push('/dashboard')} style={{ width: '100%', color: C.t3, fontSize: 12, padding: '12px 0', marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT_BODY }}>
            Pular por enquanto — completar depois
          </button>
        )}

        {/* WEARABLE (só para clientes) */}
        {!isNovo && !isProf && (
          <div style={{ ...glass, marginTop: 24, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2, fontWeight: 700 }}>Integração Strava</p>
              <p style={{ color: C.t2, fontSize: 12 }}>Atividades sincronizadas automaticamente no KORE</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {wearableConectado ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {wearableConectado.athlete_photo ? (
                    <img src={wearableConectado.athlete_photo} alt="Strava" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(252,76,2,0.10)', border: '1px solid rgba(252,76,2,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fc4c02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.t1, fontWeight: 600, fontSize: 14 }}>{wearableConectado.athlete_name ?? 'Strava'}</p>
                    <p style={{ color: C.t3, fontSize: 12 }}>
                      {wearableConectado.last_sync
                        ? `Sincronizado em ${new Date(wearableConectado.last_sync).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                        : 'Aguardando primeira sincronização'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={handleSync} id="sync-btn"
                      style={{ fontSize: 12, color: C.energy, border: '1px solid rgba(255,90,54,0.35)', background: 'rgba(255,90,54,0.12)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 600 }}>
                      Sincronizar
                    </button>
                    <button onClick={desconectarWearable}
                      style={{ fontSize: 12, color: C.danger, border: '1px solid rgba(251,113,133,0.30)', background: 'transparent', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 600 }}>
                      Desconectar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(252,76,2,0.08)', border: '1px solid rgba(252,76,2,0.2)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fc4c02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                    <div>
                      <p style={{ color: C.t1, fontSize: 14, fontWeight: 600 }}>Strava</p>
                      <p style={{ color: C.t3, fontSize: 12 }}>Corridas, pedaladas, natação e mais — sincronizados automaticamente</p>
                    </div>
                  </div>
                  <button onClick={conectarWearable}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', background: '#fc4c02', border: 'none', fontFamily: FONT_BODY }}>
                    Conectar com Strava
                  </button>
                  <p style={{ color: C.t3, fontSize: 10, textAlign: 'center', marginTop: 8 }}>Suas atividades aparecem automaticamente no KORE</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acesso rápido */}
        {!isNovo && !isProf && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ color: C.t3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Ficha de saúde</p>
            {[
              { rota: `/anamnese/${userId}`, titulo: 'Anamnese', desc: 'Histórico de saúde, hábitos e objetivos' },
              { rota: `/evolucao-medidas/${userId}`, titulo: 'Evolução de medidas', desc: 'Peso, composição e circunferências ao longo do tempo' },
            ].map(item => (
              <button key={item.rota} onClick={() => router.push(item.rota)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)',
                  fontFamily: FONT_BODY, transition: 'all .15s',
                }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.t1, fontWeight: 700, fontSize: 14 }}>{item.titulo}</p>
                  <p style={{ color: C.t3, fontSize: 12 }}>{item.desc}</p>
                </div>
                <span style={{ color: C.t3, fontSize: 16, flexShrink: 0 }}>{'→'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isNovo && <NavBar tipo={tipo || 'cliente'} ativa="perfil" />}
      </div>
    </main>
  )
}

export default function Perfil() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: '#FF5A36',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    }>
      <PerfilConteudo />
    </Suspense>
  )
}
