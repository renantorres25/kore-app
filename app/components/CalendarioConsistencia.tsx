'use client'

import { useState } from 'react'
import { C, FONT_MONO } from './v2/tokens'

const labelUpper: React.CSSProperties = {
  fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.t3,
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getLastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
  }
  return days
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export type AtividadeDia = {
  data: string
  tipo: 'musculacao' | 'corrida' | 'bike' | 'natacao' | 'crossfit' | 'outro'
  nome: string
  detalhe: string
  calorias: number | null
  fc_media?: number | null
  fc_max?: number | null
  duracao_min?: number | null
}

// modalidade → cor semântica do design system
export const MOD_CONFIG: Record<string, { label: string; hex: string }> = {
  musculacao: { label: 'Musculação', hex: C.good },
  corrida:    { label: 'Corrida',    hex: C.sleep },
  bike:       { label: 'Bike',       hex: C.energy2 },
  natacao:    { label: 'Natação',    hex: '#22D3EE' },
  crossfit:   { label: 'Crossfit',   hex: C.warn },
  outro:      { label: 'Outro',      hex: C.recovery },
}

/* ─── CALENDÁRIO COM CORES POR MODALIDADE ──────────────────── */
export default function CalendarioConsistencia({ atividades, onSelecionarDia }: {
  atividades: AtividadeDia[]
  onSelecionarDia?: (data: string | null) => void
}) {
  const hoje = getTodayBR()
  const dias = getLastNDays(28)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const atividadesPorDia = atividades.reduce((acc, a) => {
    if (!acc[a.data]) acc[a.data] = []
    acc[a.data].push(a)
    return acc
  }, {} as Record<string, AtividadeDia[]>)

  const primeiroDia = new Date(dias[0] + 'T12:00:00')
  const diaDaSemana = primeiroDia.getDay()
  const diasPadded = [...Array(diaDaSemana).fill(null), ...dias]
  const semanas: (string | null)[][] = []
  for (let i = 0; i < diasPadded.length; i += 7) semanas.push(diasPadded.slice(i, i + 7))

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  function handleClick(dia: string) {
    const novo = dia === diaSelecionado ? null : dia
    setDiaSelecionado(novo)
    onSelecionarDia?.(novo)
  }

  function getCoresDia(dia: string): string[] {
    const ativs = atividadesPorDia[dia] ?? []
    const tipos = [...new Set(ativs.map(a => a.tipo))]
    return tipos.slice(0, 3).map(t => MOD_CONFIG[t]?.hex ?? C.good)
  }

  return (
    <div>
      {/* Legenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 16 }}>
        {Object.entries(MOD_CONFIG).map(([tipo, cfg]) => (
          <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 3, background: cfg.hex }} />
            <span style={{ ...labelUpper }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 5 }}>
        {diasSemana.map(d => (
          <div key={d} style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.t3, opacity: 0.7 }}>{d}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {semanas.map((semana, si) => (
          <div key={si} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {semana.map((dia, di) => {
              if (!dia) return <div key={di} style={{ height: 34 }} />
              const ativsDia = atividadesPorDia[dia] ?? []
              const cores = getCoresDia(dia)
              const isHoje = dia === hoje
              const isSelecionado = dia === diaSelecionado
              const temAtividade = ativsDia.length > 0
              const isHover = hover === dia

              return (
                <button
                  key={dia}
                  onClick={() => handleClick(dia)}
                  onMouseEnter={() => setHover(dia)}
                  onMouseLeave={() => setHover(null)}
                  title={`${formatDate(dia)}${temAtividade ? ` · ${ativsDia.length} atividade(s)` : ' · descanso'}`}
                  style={{
                    height: 34, borderRadius: 9, position: 'relative', overflow: 'hidden', cursor: 'pointer',
                    padding: 0, transition: 'transform .12s ease',
                    transform: isHover ? 'scale(1.08)' : 'scale(1)',
                    background: temAtividade ? 'transparent' : 'rgba(255,255,255,0.05)',
                    border: isSelecionado ? '2px solid rgba(255,255,255,0.7)'
                      : isHoje ? `1px solid ${C.energy}80`
                      : temAtividade ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {temAtividade && cores.length === 1 && (
                    <div style={{ position: 'absolute', inset: 0, background: cores[0], opacity: 0.85 }} />
                  )}
                  {temAtividade && cores.length === 2 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      <div style={{ flex: 1, background: cores[0], opacity: 0.85 }} />
                      <div style={{ flex: 1, background: cores[1], opacity: 0.85 }} />
                    </div>
                  )}
                  {temAtividade && cores.length >= 3 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, background: cores[0], opacity: 0.85 }} />
                      <div style={{ flex: 1, background: cores[1], opacity: 0.85 }} />
                      <div style={{ flex: 1, background: cores[2], opacity: 0.85 }} />
                    </div>
                  )}
                  {ativsDia.length > 3 && (
                    <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.85)' }} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)' }} />
          <span style={{ ...labelUpper }}>Descanso</span>
        </div>
        {diaSelecionado && (
          <span style={{ ...labelUpper, marginLeft: 'auto' }}>Toque para fechar</span>
        )}
      </div>
    </div>
  )
}
