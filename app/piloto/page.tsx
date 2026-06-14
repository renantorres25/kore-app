'use client'

import { useState } from 'react'

/* ─── design tokens (consistentes com a landing) ─────────────────────────── */

const C = {
  energy: '#FF5A36',
  energy2: '#FF8A3D',
  good: '#2DD4A7',
  sleep: '#60A5FA',
  recovery: '#A78BFA',
  t1: '#F5F6F8',
  t2: '#9AA0AD',
  t3: '#7A8290',
}

const SORA = "'Sora', system-ui, sans-serif"
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif"

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
}

/* ─── opções ──────────────────────────────────────────────────────────────── */

const PROFISSAO_OPTS = ['Nutricionista Esportivo', 'Personal Trainer', 'Coach de Assessoria', 'Outro']
const ALUNOS_OPTS = ['1-10', '11-30', '31-50', '50+']
const FERRAMENTA_OPTS_NUTRI = ['Dietbox', 'MFIT', 'Nutrium', 'Planilha', 'Nenhuma', 'Outra']
const FERRAMENTA_OPTS_TREINO = ['TrainingPeaks', 'MFIT', 'Planilha', 'Nenhuma', 'Outra']
const FERRAMENTA_OPTS_OUTRO = ['Planilha', 'Nenhuma', 'Outra']
const ESPORTE_OPTS = ['Corrida', 'Bike', 'Natação', 'Triathlon', 'Musculação', 'Outro']
const NIVEL_OPTS = ['Iniciante', 'Intermediário', 'Avançado', 'Competidor']

type Tipo = 'profissional' | 'atleta'
type Respostas = Record<string, string>

type StepChoice = { key: string; tipo: 'choice'; titulo: string; opcoes: string[] }
type StepText = { key: string; tipo: 'text'; titulo: string; placeholder: string; obrigatorio: boolean; maxLength?: number }
type StepContato = { key: 'contato'; tipo: 'contato'; titulo: string }
type Step = StepChoice | StepText | StepContato

// Opções que abrem um campo de texto livre para detalhar a escolha
const OPCOES_OUTRA = new Set(['Outra', 'Outro'])

function getFerramentaOpts(profissao: string | undefined): string[] {
  if (profissao === 'Nutricionista Esportivo') return FERRAMENTA_OPTS_NUTRI
  if (profissao === 'Personal Trainer' || profissao === 'Coach de Assessoria') return FERRAMENTA_OPTS_TREINO
  return FERRAMENTA_OPTS_OUTRO
}

function getStepsProfissional(respostas: Respostas): Step[] {
  return [
    { key: 'profissao', tipo: 'choice', titulo: 'Qual sua profissão?', opcoes: PROFISSAO_OPTS },
    { key: 'alunos', tipo: 'choice', titulo: 'Quantos alunos/pacientes você atende hoje?', opcoes: ALUNOS_OPTS },
    { key: 'ferramenta', tipo: 'choice', titulo: 'Qual ferramenta você usa atualmente?', opcoes: getFerramentaOpts(respostas.profissao) },
    { key: 'interesse', tipo: 'text', titulo: 'O que te fez se interessar pelo KORE?', placeholder: 'Conte rapidamente...', obrigatorio: false, maxLength: 200 },
    { key: 'contato', tipo: 'contato', titulo: 'Seu email e WhatsApp para contato' },
  ]
}

function getStepsAtleta(): Step[] {
  return [
    { key: 'esporte', tipo: 'choice', titulo: 'Qual seu esporte principal?', opcoes: ESPORTE_OPTS },
    { key: 'nivel', tipo: 'choice', titulo: 'Qual seu nível?', opcoes: NIVEL_OPTS },
    { key: 'contato', tipo: 'contato', titulo: 'Seu email e WhatsApp para contato' },
  ]
}

/* ─── componentes ─────────────────────────────────────────────────────────── */

function ProgressBar({ atual, total }: { atual: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 999,
          background: i <= atual ? C.energy : 'rgba(255,255,255,0.12)',
          transition: 'background .3s',
        }} />
      ))}
    </div>
  )
}

function OptionButton({ children, onClick, selecionado }: { children: React.ReactNode; onClick: () => void; selecionado?: boolean }) {
  return (
    <button onClick={onClick} className="kore-opt"
      style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '16px 20px', borderRadius: 14,
        background: selecionado ? `${C.energy}1a` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selecionado ? `${C.energy}80` : 'rgba(255,255,255,0.12)'}`,
        color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: JAKARTA,
        transition: 'all .15s',
      }}>
      {children}
    </button>
  )
}

function NextButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="kore-btn"
      style={{
        width: '100%', padding: '16px 24px', borderRadius: 14, marginTop: 24,
        background: disabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${C.energy}, ${C.energy2})`,
        color: disabled ? C.t3 : '#fff', fontWeight: 800, fontSize: 14, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: JAKARTA,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        boxShadow: disabled ? 'none' : '0 8px 28px rgba(255,90,54,0.4)',
      }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '16px 20px', borderRadius: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 15, fontFamily: JAKARTA, outline: 'none', boxSizing: 'border-box',
}

/* ─── página principal ────────────────────────────────────────────────────── */

export default function PilotoPage() {
  const [tipo, setTipo] = useState<Tipo | null>(null)
  const [stepIndex, setStepIndex] = useState(-1) // -1 = bifurcação
  const [respostas, setRespostas] = useState<Respostas>({})
  const [textoAtual, setTextoAtual] = useState('')
  const [escolhaOutra, setEscolhaOutra] = useState<string | null>(null)
  const [outroTexto, setOutroTexto] = useState('')
  const [emailAtual, setEmailAtual] = useState('')
  const [whatsappAtual, setWhatsappAtual] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const steps: Step[] = tipo === 'profissional' ? getStepsProfissional(respostas) : tipo === 'atleta' ? getStepsAtleta() : []
  const step = stepIndex >= 0 ? steps[stepIndex] : null

  function escolherTipo(t: Tipo) {
    setTipo(t)
    setStepIndex(0)
  }

  function resetCamposStep() {
    setTextoAtual('')
    setEscolhaOutra(null)
    setOutroTexto('')
    setEmailAtual('')
    setWhatsappAtual('')
  }

  function irParaProximo(novasRespostas: Respostas) {
    setRespostas(novasRespostas)
    resetCamposStep()
    const novosSteps = tipo === 'atleta' ? getStepsAtleta() : tipo === 'profissional' ? getStepsProfissional(novasRespostas) : steps
    if (stepIndex + 1 < novosSteps.length) {
      setStepIndex(stepIndex + 1)
    } else {
      enviar(novasRespostas)
    }
  }

  function escolher(key: string, valor: string, detalhe?: string) {
    const nova = { ...respostas, [key]: valor }
    const detalheKey = `${key}Detalhe`
    if (detalhe) nova[detalheKey] = detalhe
    else delete nova[detalheKey]
    irParaProximo(nova)
  }

  function voltar() {
    resetCamposStep()
    if (stepIndex <= 0) {
      setTipo(null)
      setStepIndex(-1)
      setRespostas({})
    } else {
      setStepIndex(stepIndex - 1)
    }
  }

  async function enviar(dadosFinais: Respostas) {
    if (!tipo) return
    setEnviando(true)
    setErro(null)
    try {
      const res = await fetch('/api/piloto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, dados: dadosFinais }),
      })
      const data = await res.json()
      if (data.sucesso) setEnviado(true)
      else setErro('Não conseguimos enviar agora. Tente novamente em alguns instantes.')
    } catch {
      setErro('Não conseguimos enviar agora. Tente novamente em alguns instantes.')
    }
    setEnviando(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0c0d14', color: C.t1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: JAKARTA }}>
      <style>{`
        .kore-btn{transition:transform .15s, box-shadow .2s, filter .2s}
        .kore-btn:hover{filter:brightness(1.08)}
        .kore-btn:active{transform:scale(0.97)}
        .kore-opt:hover{border-color:rgba(255,255,255,0.3) !important}
        .kore-opt:active{transform:scale(0.99)}
      `}</style>

      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', background: `linear-gradient(135deg, #fff, ${C.energy})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KORE</span>
        </div>

        <div style={{ ...glass, padding: 'clamp(28px, 6vw, 40px)' }}>
          {enviado ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${C.good}1a`, border: `1px solid ${C.good}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.good} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Recebemos seu interesse!</h2>
              <p style={{ color: C.t2, fontSize: 15, lineHeight: 1.6 }}>Entraremos em contato em breve.</p>
            </div>
          ) : stepIndex === -1 ? (
            <>
              <h1 style={{ fontFamily: SORA, fontSize: 'clamp(22px, 4.5vw, 28px)', fontWeight: 800, marginBottom: 24, lineHeight: 1.25 }}>Você é:</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <OptionButton onClick={() => escolherTipo('profissional')}>
                  Profissional <span style={{ color: C.t3, fontWeight: 500 }}>— nutricionista, personal trainer, coach</span>
                </OptionButton>
                <OptionButton onClick={() => escolherTipo('atleta')}>
                  Atleta <span style={{ color: C.t3, fontWeight: 500 }}>— buscando acompanhamento</span>
                </OptionButton>
              </div>
            </>
          ) : step ? (
            <>
              <ProgressBar atual={stepIndex} total={steps.length} />
              <h1 style={{ fontFamily: SORA, fontSize: 'clamp(20px, 4.5vw, 26px)', fontWeight: 800, marginBottom: 24, lineHeight: 1.25 }}>{step.titulo}</h1>

              {step.tipo === 'choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {step.opcoes.map(op => {
                    const isOutra = OPCOES_OUTRA.has(op)
                    return (
                      <div key={op}>
                        <OptionButton selecionado={escolhaOutra === op} onClick={() => {
                          if (isOutra) { setEscolhaOutra(op); setOutroTexto('') }
                          else escolher(step.key, op)
                        }}>
                          {op}
                        </OptionButton>
                        {isOutra && escolhaOutra === op && (
                          <input type="text" value={outroTexto} onChange={e => setOutroTexto(e.target.value)} placeholder="Qual?"
                            autoFocus style={{ ...inputStyle, marginTop: 8 }} />
                        )}
                      </div>
                    )
                  })}
                  {escolhaOutra && (
                    <NextButton disabled={!outroTexto.trim()} onClick={() => escolher(step.key, escolhaOutra, outroTexto.trim())}>
                      Próximo
                    </NextButton>
                  )}
                </div>
              )}

              {step.tipo === 'text' && (
                <>
                  {step.maxLength ? (
                    <textarea value={textoAtual} onChange={e => setTextoAtual(e.target.value)} placeholder={step.placeholder}
                      maxLength={step.maxLength} rows={4}
                      style={{ ...inputStyle, resize: 'none' }} />
                  ) : (
                    <input type="text" value={textoAtual} onChange={e => setTextoAtual(e.target.value)} placeholder={step.placeholder}
                      style={inputStyle} />
                  )}
                  {step.maxLength && (
                    <p style={{ color: C.t3, fontSize: 11, marginTop: 8, textAlign: 'right' }}>{textoAtual.length}/{step.maxLength}</p>
                  )}
                  <NextButton
                    disabled={enviando || (step.obrigatorio && !textoAtual.trim())}
                    onClick={() => irParaProximo({ ...respostas, [step.key]: textoAtual.trim() })}>
                    {enviando ? 'Enviando...' : stepIndex + 1 < steps.length ? 'Próximo' : 'Enviar'}
                  </NextButton>
                </>
              )}

              {step.tipo === 'contato' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input type="email" value={emailAtual} onChange={e => setEmailAtual(e.target.value)} placeholder="seuemail@exemplo.com" style={inputStyle} />
                    <input type="text" value={whatsappAtual} onChange={e => setWhatsappAtual(e.target.value)} placeholder="WhatsApp — (00) 00000-0000" style={inputStyle} />
                  </div>
                  <NextButton
                    disabled={enviando || !emailAtual.trim() || !whatsappAtual.trim()}
                    onClick={() => irParaProximo({ ...respostas, email: emailAtual.trim(), whatsapp: whatsappAtual.trim() })}>
                    {enviando ? 'Enviando...' : 'Enviar'}
                  </NextButton>
                </>
              )}

              {erro && <p style={{ color: '#F87171', fontSize: 13, marginTop: 16, textAlign: 'center' }}>{erro}</p>}

              <button onClick={voltar} style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: C.t3, fontSize: 13, cursor: 'pointer', fontFamily: JAKARTA }}>
                ← Voltar
              </button>
            </>
          ) : null}
        </div>
      </div>
    </main>
  )
}
