'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import QuizIA, { RespostasQuiz } from '../components/QuizIA'
import SidebarProfissional from '../components/SidebarProfissional'

/* ═════════════════════════════════════════════════════════════
   KORE · Nutrição — "Energetic Precision"
   Nutrição é VERDE (good). Laranja = energia/calorias.
   Azul = carbo. Roxo = gordura.
   ═════════════════════════════════════════════════════════════ */

const C = {
  energy: '#FF5A36',
  energy2: '#FF8A3D',
  good: '#2DD4A7',
  sleep: '#60A5FA',
  recovery: '#A78BFA',
  warn: '#F5B544',
  danger: '#FB7185',
  t1: '#F5F6F8',
  t2: '#9AA0AD',
  t3: '#7A8290',
}
const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"

function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.065)',
  backdropFilter: 'blur(16px) saturate(130%)',
  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
}

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const c = () => setV(window.innerWidth >= 1024)
    c(); window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return v
}

/* ─────────────────────────────────────────────
   LÓGICA / HELPERS (preservado)
───────────────────────────────────────────── */
function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function getHourBR(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }), 10)
}

type Perfil = { nome: string | null; peso: number | null; objetivo: string | null }
type Substituto = { nome: string; quantidade: string }
type Alimento = { nome: string; quantidade: string; calorias: number; proteina: number; carboidrato?: number; gordura?: number; substituicoes?: Substituto[] }
type Suplemento = { nome: string; dose: string; horario: string; motivo: string }
type VariacaoPlano = { nome: string; dica?: string; alimentos: Alimento[] }
type Refeicao = { nome: string; horario: string; calorias: number; proteina: number; alimentos: Alimento[]; dica?: string; variacoes?: VariacaoPlano[] }
type PlanoEstruturado = {
  nota_nutri?: string
  refeicoes: Refeicao[]
  suplementos?: Suplemento[]
  hidratacao: { litros_dia: number; orientacao: string }
  estrategia_desafio: string
  dica_fome: string
  orientacao_treino: string
}
type PlanoNutricional = { id: string; conteudo: string; calorias_meta: number | null; proteina_meta: number | null; refeicoes_por_dia: number | null; created_at: string; criado_por: string | null }

const QUALIDADE_OPCOES = [
  { valor: 1, label: 'Ruim',    cor: C.danger },
  { valor: 2, label: 'Regular', cor: C.warn },
  { valor: 3, label: 'Boa',     cor: C.sleep },
  { valor: 4, label: 'Ótima',   cor: C.good },
]

function getMetaProteina(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  if (objetivo === 'ganhar_massa') return Math.round(peso * 2.2)
  if (objetivo === 'perder_peso') return Math.round(peso * 2.0)
  return Math.round(peso * 1.8)
}
function getMetaCalorias(peso: number | null, objetivo: string | null): number | null {
  if (!peso) return null
  const tmb = 10 * peso + 6.25 * 170 - 5 * 25 + 5
  const tdee = Math.round(tmb * 1.55)
  if (objetivo === 'perder_peso') return Math.round(tdee * 0.85)
  if (objetivo === 'ganhar_massa') return Math.round(tdee * 1.1)
  return tdee
}

const OBJETIVO_LABEL: Record<string, string> = {
  perder_peso: 'Perder peso', ganhar_massa: 'Ganhar massa',
  melhorar_condicionamento: 'Condicionamento', saude_geral: 'Saúde geral',
}

/* Ícone de refeição como inicial textual (sem emoji na UI) */
const ICONE_REFEICAO: Record<string, string> = {
  'café': 'CM', 'manhã': 'CM', 'almoço': 'AL', 'lanche': 'LN',
  'pré': 'PR', 'pós': 'PO', 'jantar': 'JT', 'ceia': 'CE',
}
function getIconeRefeicao(nome: string): string {
  const lower = nome.toLowerCase()
  const key = Object.keys(ICONE_REFEICAO).find(k => lower.includes(k))
  return key ? ICONE_REFEICAO[key] : 'RF'
}

/* ─────────────────────────────────────────────
   ÁTOMOS VISUAIS
───────────────────────────────────────────── */
function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null
  const w = 70, h = 24
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const xy = (v: number, i: number) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 5) - 2.5
    return [x, y] as const
  }
  const pts = data.map((v, i) => xy(v, i).join(',')).join(' ')
  const [lx, ly] = xy(data[data.length - 1], data.length - 1)
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <circle cx={lx} cy={ly} r={3.6} fill={color} opacity={0.25} />
      <circle cx={lx} cy={ly} r={2.4} fill={color} />
    </svg>
  )
}

/** Stat tile: número grande Sora + barra colorida + sparkline opcional */
function StatTile({ label, value, unit, meta, color, sparkData }: {
  label: string; value: number | string; unit?: string; meta?: number | null; color: string; sparkData?: number[]
}) {
  const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  const pct = meta ? Math.min(100, Math.round((num / meta) * 100)) : null
  const pctColor = pct == null ? C.t3 : pct >= 90 ? C.good : pct >= 60 ? C.warn : C.danger
  return (
    <div style={{ ...glassCard, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: C.t2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT_BODY }}>{label}</span>
        {pct != null && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: pctColor, background: alpha(pctColor, 0.11), border: `1px solid ${alpha(pctColor, 0.25)}`, padding: '2px 8px', borderRadius: 999, fontFamily: FONT_MONO }}>{pct}%</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </span>
        {unit && <span style={{ fontSize: 12, color: C.t2, fontWeight: 500, fontFamily: FONT_BODY }}>{unit}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
        {meta != null ? (
          <span style={{ fontSize: 10.5, color: C.t3, fontFamily: FONT_MONO }}>meta {meta.toLocaleString('pt-BR')}{unit ?? ''}</span>
        ) : <span />}
        {sparkData && <SparkLine data={sparkData} color={color} />}
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 12px ${alpha(color, 0.4)}`, width: pct != null ? `${pct}%` : '0%', transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  )
}

function MacroBadge({ value, unit, color, label }: { value: number | string; unit: string; color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', fontSize: 12.5, fontWeight: 700, color }}>
      {value}{unit}<span style={{ fontSize: 9.5, fontWeight: 500, color: C.t3 }}>{label}</span>
    </span>
  )
}

function Chevron({ open, color }: { open: boolean; color: string }) {
  return (
    <span style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1)', color, fontSize: 10, flexShrink: 0 }}>▾</span>
  )
}

/* ─────────────────────────────────────────────
   ABA PLANO
───────────────────────────────────────────── */
function AbaPlano({ plano, gerandoPlano, vinculoNutri, onIniciarConsulta, isDesktop }: {
  plano: PlanoNutricional | null; gerandoPlano: boolean
  vinculoNutri: { nome: string | null; id: string } | null; onIniciarConsulta: () => void; isDesktop: boolean
}) {
  const [refeicaoAberta, setRefeicaoAberta] = useState<number | null>(0)
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null)
  const [variacaoAtiva, setVariacaoAtiva] = useState<Record<number, number>>({})

  let e: PlanoEstruturado | null = null
  if (plano) {
    try { const p = JSON.parse(plano.conteudo); if (p.refeicoes) e = p } catch {}
  }

  if (!vinculoNutri && !plano && !gerandoPlano) {
    return (
      <div style={{ padding: '4px 0' }}>
        <div style={{ ...glassCard, padding: 28, textAlign: 'center', borderColor: alpha(C.good, 0.22), boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${alpha(C.good, 0.1)}, inset 0 1px 0 rgba(255,255,255,0.10)` }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: alpha(C.good, 0.12), border: `1px solid ${alpha(C.good, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: C.good }}>NU</div>
          <p style={{ color: C.good, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, marginBottom: 8, fontFamily: FONT_BODY }}>Nutricionista virtual · IA</p>
          <p style={{ color: C.t1, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Crie seu plano alimentar</p>
          <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 24, fontFamily: FONT_BODY }}>Responda uma consulta rápida e a IA monta um plano completo — refeições, gramas, macros, suplementos e hidratação personalizados.</p>
          <button onClick={onIniciarConsulta} style={{ width: '100%', background: `linear-gradient(135deg, ${C.energy2}, ${C.energy})`, color: '#fff', fontWeight: 700, padding: '15px 0', borderRadius: 16, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 10px 30px ${alpha(C.energy, 0.3)}` }}>Iniciar consulta nutricional →</button>
        </div>
      </div>
    )
  }

  if (gerandoPlano) {
    return (
      <div style={{ padding: '4px 0' }}>
        <div style={{ ...glassCard, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: alpha(C.good, 0.12), border: `1px solid ${alpha(C.good, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${C.good}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
            <div>
              <p style={{ color: C.good, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, fontFamily: FONT_BODY }}>Montando seu plano</p>
              <p style={{ color: C.t1, fontWeight: 700, fontFamily: FONT_DISPLAY }}>A nutricionista IA está trabalhando...</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Analisando perfil e objetivos', 'Calculando distribuição calórica ideal', 'Selecionando alimentos com quantidades', 'Definindo suplementação e hidratação', 'Criando estratégias personalizadas'].map((msg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${alpha(C.good, 0.3)}`, borderTopColor: C.good, animation: 'spin 0.8s linear infinite', animationDelay: `${i * 0.15}s`, flexShrink: 0 }} />
                <p style={{ color: C.t2, fontSize: 14, fontFamily: FONT_BODY }}>{msg}</p>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (plano) {
    const dataCriacao = new Date(plano.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' })
    const getAlimentos = (ref: Refeicao, vIdx = 0) => ref.variacoes ? (ref.variacoes[vIdx]?.alimentos ?? ref.variacoes[0]?.alimentos ?? ref.alimentos) : ref.alimentos
    const totalCalDia = e ? e.refeicoes.reduce((s, r) => s + getAlimentos(r, 0).reduce((ss, a) => ss + a.calorias, 0), 0) : 0
    const totalProtDia = e ? e.refeicoes.reduce((s, r) => s + getAlimentos(r, 0).reduce((ss, a) => ss + a.proteina, 0), 0) : 0
    const isPlanoProfissional = plano.criado_por === 'nutricionista'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Cabeçalho do plano */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.good, fontWeight: 700, fontFamily: FONT_BODY }}>
                Plano Alimentar{isPlanoProfissional ? '' : ' · IA'}
              </span>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.good, background: alpha(C.good, 0.1), border: `1px solid ${alpha(C.good, 0.22)}`, borderRadius: 999, padding: '2px 8px', fontFamily: FONT_BODY, fontWeight: 600 }}>Ativo</span>
            </div>
            {isPlanoProfissional && <p style={{ color: C.t3, fontSize: 10.5, fontFamily: FONT_BODY }}>Por {vinculoNutri?.nome ?? 'Nutricionista'}</p>}
            <p style={{ color: C.t3, fontSize: 10.5, fontFamily: FONT_BODY }}>Criado em {dataCriacao}</p>
          </div>
          {!isPlanoProfissional && (
            <button onClick={onIniciarConsulta} style={{ fontSize: 10.5, color: C.t2, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', flexShrink: 0, fontFamily: FONT_BODY }}>↻ Refazer</button>
          )}
        </div>

        {/* Nota da nutricionista — borda esquerda verde */}
        {e?.nota_nutri && (
          <div style={{ ...glassCard, borderLeft: `3px solid ${C.good}`, padding: '16px 20px' }}>
            <p style={{ color: C.good, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 8, fontFamily: FONT_BODY }}>Nota da nutricionista</p>
            <p style={{ color: C.t2, fontSize: 13.5, lineHeight: 1.7, fontFamily: FONT_BODY }}>{e.nota_nutri}</p>
          </div>
        )}

        {/* Resumo diário */}
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontFamily: FONT_BODY }}>Resumo diário</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { label: 'Kcal', val: totalCalDia || plano.calorias_meta || '—', cor: C.energy },
              { label: 'Prot.', val: totalProtDia ? `${totalProtDia}g` : plano.proteina_meta ? `${plano.proteina_meta}g` : '—', cor: C.good },
              { label: 'Refs.', val: e ? e.refeicoes.length : plano.refeicoes_por_dia ?? '—', cor: C.recovery },
              { label: 'Água', val: e?.hidratacao ? `${e.hidratacao.litros_dia}L` : '—', cor: C.sleep },
            ].map((m, i) => (
              <div key={i} style={{ padding: '14px 4px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: FONT_BODY }}>{m.label}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: m.cor, fontFamily: FONT_DISPLAY, fontVariantNumeric: 'tabular-nums' }}>{m.val}</p>
              </div>
            ))}
          </div>
          {totalCalDia > 0 && plano.calorias_meta && (
            <div style={{ padding: '0 18px 14px' }}>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.energy2}, ${C.energy})`, borderRadius: 999, boxShadow: `0 0 12px ${alpha(C.energy, 0.4)}`, width: `${Math.min(100, Math.round((totalCalDia / plano.calorias_meta) * 100))}%`, transition: 'width 1s ease' }} />
              </div>
              <p style={{ color: C.t3, fontSize: 9.5, marginTop: 6, fontFamily: FONT_MONO }}>{Math.round((totalCalDia / plano.calorias_meta) * 100)}% da meta calórica</p>
            </div>
          )}
        </div>

        {e ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Refeições — accordion glass */}
            {e.refeicoes.map((ref, i) => {
              const aberta = refeicaoAberta === i
              const vIdx = variacaoAtiva[i] ?? 0
              const alimentos = getAlimentos(ref, vIdx)
              const dica = ref.variacoes ? ref.variacoes[vIdx]?.dica : ref.dica
              const totalCal = Math.round(alimentos.reduce((s, a) => s + a.calorias, 0))
              const totalProt = Math.round(alimentos.reduce((s, a) => s + a.proteina, 0))
              const pctDia = totalCalDia > 0 ? Math.round((totalCal / totalCalDia) * 100) : 0
              const temVariacoes = ref.variacoes && ref.variacoes.length > 1

              return (
                <div key={i} style={{ ...glassCard, overflow: 'hidden', border: `1px solid ${aberta ? alpha(C.good, 0.3) : 'rgba(255,255,255,0.12)'}`, transition: 'border-color 240ms ease' }}>
                  <button onClick={() => setRefeicaoAberta(aberta ? null : i)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${alpha(C.good, 0.2)}, ${alpha(C.good, 0.1)})`, border: `1px solid ${alpha(C.good, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12, color: C.good }}>
                        {getIconeRefeicao(ref.nome)}
                      </div>
                      <div style={{ position: 'absolute', top: -5, left: -5, width: 16, height: 16, borderRadius: '50%', background: '#1a1d28', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: C.t2, fontSize: 8, fontWeight: 800, fontFamily: FONT_MONO }}>{i + 1}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <p style={{ color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>{ref.nome}</p>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.t2, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', padding: '3px 9px', borderRadius: 999, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{ref.horario}</span>
                        {temVariacoes && <span style={{ fontSize: 9, color: C.good, background: alpha(C.good, 0.1), border: `1px solid ${alpha(C.good, 0.22)}`, borderRadius: 999, padding: '2px 8px', fontFamily: FONT_BODY, fontWeight: 600 }}>{ref.variacoes!.length} opções</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <MacroBadge value={totalCal} unit="" color={C.energy} label="kcal" />
                        <MacroBadge value={totalProt} unit="g" color={C.good} label="prot" />
                        <span style={{ color: C.t3, fontSize: 10.5, fontFamily: FONT_MONO }}>{pctDia}% do dia</span>
                      </div>
                    </div>
                    <Chevron open={aberta} color={aberta ? C.good : C.t3} />
                  </button>

                  <div style={{ display: 'grid', gridTemplateRows: aberta ? '1fr' : '0fr', transition: 'grid-template-rows 320ms cubic-bezier(0.22,1,0.36,1)' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        {temVariacoes && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px 4px', overflowX: 'auto' }}>
                            {ref.variacoes!.map((v, vi) => (
                              <button key={vi} onClick={() => setVariacaoAtiva(prev => ({ ...prev, [i]: vi }))}
                                style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all .15s',
                                  border: `1px solid ${vIdx === vi ? alpha(C.good, 0.4) : 'rgba(255,255,255,0.1)'}`,
                                  background: vIdx === vi ? alpha(C.good, 0.12) : 'transparent',
                                  color: vIdx === vi ? C.good : C.t2 }}>
                                {v.nome || `Opção ${String.fromCharCode(65 + vi)}`}
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_BODY }}>Alimento</span>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_BODY }}>Qtd.</span>
                            <span style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', width: 50, textAlign: 'right', fontFamily: FONT_BODY }}>Kcal</span>
                            <span style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', width: 40, textAlign: 'right', fontFamily: FONT_BODY }}>Prot</span>
                          </div>
                        </div>
                        {alimentos.map((al, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: j < alimentos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                              <p style={{ color: C.t1, fontSize: 13.5, fontWeight: 500, lineHeight: 1.3, fontFamily: FONT_BODY }}>{al.nome}</p>
                              {al.substituicoes && al.substituicoes.length > 0 && (
                                <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {al.substituicoes.map((s, si) => (
                                    <p key={si} style={{ color: C.t3, fontSize: 11, fontStyle: 'italic', lineHeight: 1.4, fontFamily: FONT_BODY }}>
                                      ou {s.nome}{s.quantidade ? ` (${s.quantidade})` : ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                              <span style={{ color: C.t2, fontSize: 11, textAlign: 'right', minWidth: 56, fontFamily: FONT_MONO }}>{al.quantidade}</span>
                              <span style={{ color: C.energy, fontSize: 12.5, fontWeight: 700, width: 50, textAlign: 'right', fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{al.calorias}</span>
                              <span style={{ color: C.good, fontSize: 11.5, width: 40, textAlign: 'right', fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{al.proteina}g</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <span style={{ color: C.t2, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_BODY }}>Total</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ color: C.t3, fontSize: 11, width: 56, textAlign: 'right', fontFamily: FONT_MONO }}>—</span>
                            <span style={{ color: C.energy, fontSize: 13.5, fontWeight: 800, width: 50, textAlign: 'right', fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{totalCal}</span>
                            <span style={{ color: C.good, fontSize: 12.5, fontWeight: 700, width: 40, textAlign: 'right', fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }}>{totalProt}g</span>
                          </div>
                        </div>
                        {dica && (
                          <div style={{ margin: '10px 16px 14px', borderRadius: 12, background: alpha(C.good, 0.07), border: `1px solid ${alpha(C.good, 0.2)}`, padding: '11px 13px' }}>
                            <p style={{ color: C.good, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontWeight: 700, fontFamily: FONT_BODY }}>Dica</p>
                            <p style={{ color: C.t2, fontSize: 11.5, lineHeight: 1.6, fontFamily: FONT_BODY }}>{dica}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Suplementação */}
            {e.suplementos && e.suplementos.length > 0 && (
              <div style={{ ...glassCard, overflow: 'hidden', border: `1px solid ${secaoAberta === 'suplementos' ? alpha(C.recovery, 0.3) : 'rgba(255,255,255,0.12)'}` }}>
                <button onClick={() => setSecaoAberta(secaoAberta === 'suplementos' ? null : 'suplementos')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: alpha(C.recovery, 0.12), border: `1px solid ${alpha(C.recovery, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12, color: C.recovery }}>SP</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>Suplementação recomendada</p>
                    <p style={{ color: C.t2, fontSize: 11, fontFamily: FONT_BODY }}>{e.suplementos.length} suplemento{e.suplementos.length !== 1 ? 's' : ''} · baseado no seu objetivo</p>
                  </div>
                  <Chevron open={secaoAberta === 'suplementos'} color={secaoAberta === 'suplementos' ? C.recovery : C.t3} />
                </button>
                {secaoAberta === 'suplementos' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {e.suplementos.map((s, i) => (
                      <div key={i} style={{ padding: '14px 16px', borderBottom: i < e!.suplementos!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <p style={{ color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>{s.nome}</p>
                        <p style={{ color: C.recovery, fontSize: 11, marginTop: 2, fontFamily: FONT_MONO }}>{s.dose} · {s.horario}</p>
                        <p style={{ color: C.t2, fontSize: 11.5, lineHeight: 1.6, marginTop: 6, fontFamily: FONT_BODY }}>{s.motivo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hidratação */}
            {e.hidratacao && (
              <div style={{ ...glassCard, overflow: 'hidden', border: `1px solid ${secaoAberta === 'hidratacao' ? alpha(C.sleep, 0.3) : 'rgba(255,255,255,0.12)'}` }}>
                <button onClick={() => setSecaoAberta(secaoAberta === 'hidratacao' ? null : 'hidratacao')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: alpha(C.sleep, 0.12), border: `1px solid ${alpha(C.sleep, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12, color: C.sleep }}>H₂O</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>Hidratação personalizada</p>
                    <p style={{ color: C.sleep, fontSize: 11, fontFamily: FONT_MONO }}>{e.hidratacao.litros_dia}L por dia · baseado no seu peso e treino</p>
                  </div>
                  <Chevron open={secaoAberta === 'hidratacao'} color={secaoAberta === 'hidratacao' ? C.sleep : C.t3} />
                </button>
                {secaoAberta === 'hidratacao' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
                    <p style={{ color: C.t2, fontSize: 13.5, lineHeight: 1.7, fontFamily: FONT_BODY }}>{e.hidratacao.orientacao}</p>
                  </div>
                )}
              </div>
            )}

            {/* Estratégias */}
            {[
              { key: 'treino', label: 'Orientação de treino', sub: 'Pré e pós-treino com alimentos', cor: C.good, val: e.orientacao_treino },
              { key: 'desafio', label: 'Estratégia para seu desafio', sub: 'Como superar seu maior obstáculo', cor: C.energy, val: e.estrategia_desafio },
              { key: 'fome', label: 'Controle de fome', sub: 'Estratégia para o período crítico', cor: C.sleep, val: e.dica_fome },
            ].filter(s => s.val).map((s) => (
              <div key={s.key} style={{ ...glassCard, overflow: 'hidden', border: `1px solid ${secaoAberta === s.key ? alpha(s.cor, 0.3) : 'rgba(255,255,255,0.12)'}` }}>
                <button onClick={() => setSecaoAberta(secaoAberta === s.key ? null : s.key)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 4, height: 36, borderRadius: 999, background: s.cor, flexShrink: 0, boxShadow: `0 0 10px ${alpha(s.cor, 0.5)}` }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: s.cor, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>{s.label}</p>
                    <p style={{ color: C.t3, fontSize: 11, marginTop: 2, fontFamily: FONT_BODY }}>{s.sub}</p>
                  </div>
                  <Chevron open={secaoAberta === s.key} color={secaoAberta === s.key ? s.cor : C.t3} />
                </button>
                {secaoAberta === s.key && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ color: C.t2, fontSize: 13.5, lineHeight: 1.7, paddingTop: 14, fontFamily: FONT_BODY }}>{s.val}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...glassCard, padding: 20 }}>
            <p style={{ color: C.t2, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-line', fontFamily: FONT_BODY }}>{plano.conteudo}</p>
            <button onClick={onIniciarConsulta} style={{ marginTop: 16, width: '100%', background: `linear-gradient(135deg, ${C.energy2}, ${C.energy})`, color: '#fff', fontWeight: 700, padding: '13px 0', borderRadius: 12, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: FONT_BODY }}>Gerar novo plano detalhado →</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ ...glassCard, padding: 20, borderLeft: `3px solid ${C.good}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: alpha(C.good, 0.12), border: `1px solid ${alpha(C.good, 0.22)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12, color: C.good }}>NU</div>
          <div>
            <p style={{ color: C.t1, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{vinculoNutri?.nome ?? 'Nutricionista'}</p>
            <p style={{ color: C.good, fontSize: 12, fontFamily: FONT_BODY }}>Plano profissional ativo</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ABA HOJE
───────────────────────────────────────────── */
function AbaHoje({ perfil, scoreHoje, treinouHoje, vinculoNutri, userId, registroId, setRegistroId, qualidade, setQualidade, calorias, setCalorias, proteina, setProteina, coposAgua, setCoposAgua, observacoes, setObservacoes, jaRegistrou, setJaRegistrou }: {
  perfil: Perfil; scoreHoje: number | null; treinouHoje: boolean
  vinculoNutri: { nome: string | null; id: string } | null; userId: string; registroId: string | null
  setRegistroId: (v: string | null) => void; qualidade: number | null; setQualidade: (v: number | null) => void
  calorias: string; setCalorias: (v: string) => void; proteina: string; setProteina: (v: string) => void
  coposAgua: number; setCoposAgua: (v: number) => void; observacoes: string; setObservacoes: (v: string) => void
  jaRegistrou: boolean; setJaRegistrou: (v: boolean) => void
}) {
  const [salvando, setSalvando] = useState(false)

  const metaCal = getMetaCalorias(perfil.peso, perfil.objetivo)
  const metaProt = getMetaProteina(perfil.peso, perfil.objetivo)
  const pctCal = calorias && metaCal ? Math.min(100, Math.round((parseInt(calorias) / metaCal) * 100)) : 0
  const pctProt = proteina && metaProt ? Math.min(100, Math.round((parseFloat(proteina) / metaProt) * 100)) : 0

  async function salvarRegistro() {
    if (!qualidade) return
    setSalvando(true)
    const payload = { usuario_id: userId, data: getTodayBR(), qualidade_alimentacao: qualidade, calorias: calorias ? parseInt(calorias) : null, proteina: proteina ? parseFloat(proteina) : null, carboidrato: null, gordura: null, copos_agua: coposAgua }
    if (registroId) {
      await supabase.from('nutricao').update(payload).eq('id', registroId)
    } else {
      const { data } = await supabase.from('nutricao').insert(payload).select('id').single()
      if (data) setRegistroId(data.id)
    }
    setJaRegistrou(true)
    setSalvando(false)
  }

  async function atualizarAgua(copos: number) {
    const novos = Math.max(0, Math.min(12, copos))
    setCoposAgua(novos)
    const hoje = getTodayBR()
    if (registroId) {
      await supabase.from('nutricao').update({ copos_agua: novos }).eq('id', registroId)
    } else {
      const { data } = await supabase.from('nutricao').insert({ usuario_id: userId, data: hoje, copos_agua: novos }).select('id').single()
      if (data) setRegistroId(data.id)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12, padding: '12px', color: C.t1, fontSize: 14, fontFamily: FONT_BODY,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats topo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Recuperação', val: scoreHoje ?? '—', sub: '/100', cor: scoreHoje ? scoreHoje >= 70 ? C.good : C.warn : C.t3 },
          { label: 'Treino', val: treinouHoje ? '✓' : '—', sub: 'hoje', cor: treinouHoje ? C.good : C.t3 },
          { label: 'Meta', val: metaCal ? `${Math.round(metaCal / 100) / 10}k` : '—', sub: 'kcal', cor: C.energy },
        ].map((s, i) => (
          <div key={i} style={{ ...glassCard, padding: 14, textAlign: 'center', borderColor: s.cor !== C.t3 ? alpha(s.cor, 0.22) : 'rgba(255,255,255,0.12)' }}>
            <p style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: FONT_BODY }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.cor, fontFamily: FONT_DISPLAY, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.val}</p>
            <p style={{ color: C.t3, fontSize: 9, marginTop: 3, fontFamily: FONT_MONO }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Registro do dia */}
      <div style={{ ...glassCard, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>Como foi hoje?</p>
          <p style={{ color: C.t3, fontSize: 11, fontFamily: FONT_BODY }}>Avalie e registre em 30 segundos</p>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {QUALIDADE_OPCOES.map(op => {
              const active = qualidade === op.valor
              return (
                <button key={op.valor} onClick={() => setQualidade(op.valor)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 4px', borderRadius: 14, cursor: 'pointer', transition: 'all .15s',
                    border: `1px solid ${active ? alpha(op.cor, 0.4) : 'rgba(255,255,255,0.1)'}`,
                    background: active ? alpha(op.cor, 0.12) : 'rgba(255,255,255,0.02)',
                    color: active ? op.cor : C.t2 }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{op.valor}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY }}>{op.label}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Calorias', val: calorias, set: setCalorias, meta: metaCal, unit: 'kcal', pct: pctCal, cor: C.energy },
              { label: 'Proteína', val: proteina, set: setProteina, meta: metaProt, unit: 'g', pct: pctProt, cor: C.good },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ color: C.t2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_BODY }}>{f.label}</label>
                  {f.meta && <span style={{ color: C.t3, fontSize: 9, fontFamily: FONT_MONO }}>meta {f.meta}{f.unit === 'g' ? 'g' : ''}</span>}
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="number" placeholder="0" value={f.val} onChange={e => f.set(e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums' }} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.t3, fontSize: 9, fontFamily: FONT_MONO }}>{f.unit}</span>
                </div>
                {f.val && f.meta && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: f.pct >= 100 ? C.good : f.cor, boxShadow: `0 0 10px ${alpha(f.pct >= 100 ? C.good : f.cor, 0.4)}`, width: `${f.pct}%`, transition: 'width .4s ease' }} />
                    </div>
                    <p style={{ color: C.t3, fontSize: 9, textAlign: 'center', marginTop: 5, fontFamily: FONT_MONO }}>{f.pct}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <textarea placeholder="Como foi? Algo que dificultou ou ajudou... (opcional — melhora a análise da IA)" value={observacoes}
            onChange={e => setObservacoes(e.target.value)} rows={2}
            style={{ ...inputStyle, resize: 'none' }} />

          <button onClick={salvarRegistro} disabled={!qualidade || salvando}
            style={{ width: '100%', fontWeight: 700, padding: '15px 0', borderRadius: 16, fontSize: 14, cursor: !qualidade || salvando ? 'default' : 'pointer', opacity: !qualidade || salvando ? 0.4 : 1, border: 'none', transition: 'all .15s', fontFamily: FONT_BODY,
              ...(jaRegistrou
                ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: C.t1 }
                : { background: `linear-gradient(135deg, ${C.energy2}, ${C.energy})`, color: '#fff', boxShadow: `0 10px 30px ${alpha(C.energy, 0.3)}` }) }}>
            {salvando ? 'Salvando...' : jaRegistrou ? '✓ Registrado — atualizar' : 'Registrar →'}
          </button>
        </div>
      </div>

      {/* Hidratação */}
      <div style={{ ...glassCard, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: FONT_DISPLAY }}>Hidratação</p>
              <p style={{ color: C.t3, fontSize: 11, fontFamily: FONT_MONO }}>{coposAgua * 250}ml de 2000ml</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: coposAgua >= 8 ? C.good : coposAgua >= 4 ? C.sleep : C.t2, fontFamily: FONT_DISPLAY, fontVariantNumeric: 'tabular-nums' }}>
              {coposAgua}<span style={{ color: C.t3, fontSize: 14, fontWeight: 400 }}>/8</span>
            </p>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: C.sleep, boxShadow: `0 0 10px ${alpha(C.sleep, 0.4)}`, width: `${Math.min(100, (coposAgua / 8) * 100)}%`, transition: 'width .3s ease' }} />
          </div>
        </div>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => atualizarAgua(coposAgua - 1)} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: C.t1, fontSize: 18, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>−</button>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} onClick={() => atualizarAgua(i + 1)} style={{ height: 28, borderRadius: 8, cursor: 'pointer', border: i < coposAgua ? 'none' : '1px solid rgba(255,255,255,0.14)', background: i < coposAgua ? C.sleep : 'rgba(255,255,255,0.05)', boxShadow: i < coposAgua ? `0 0 8px ${alpha(C.sleep, 0.3)}` : 'none', transition: 'all .15s' }} />
            ))}
          </div>
          <button onClick={() => atualizarAgua(coposAgua + 1)} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: C.t1, fontSize: 18, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>+</button>
        </div>
      </div>

      {/* Nutricionista vínculo */}
      <div style={{ ...glassCard, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12,
            background: vinculoNutri ? alpha(C.good, 0.12) : 'rgba(255,255,255,0.06)', color: vinculoNutri ? C.good : C.t2, border: `1px solid ${vinculoNutri ? alpha(C.good, 0.22) : 'rgba(255,255,255,0.14)'}` }}>NU</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: C.t1, fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY }}>Nutricionista</p>
            <p style={{ color: C.t3, fontSize: 12, fontFamily: FONT_BODY }}>{vinculoNutri ? vinculoNutri.nome ?? 'Conectada' : 'Conecte para plano profissional'}</p>
          </div>
          {!vinculoNutri && <button style={{ fontSize: 10, color: C.t2, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '7px 12px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0, fontFamily: FONT_BODY }}>+ Conectar</button>}
          {vinculoNutri && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.good, boxShadow: `0 0 8px ${alpha(C.good, 0.6)}`, flexShrink: 0 }} />}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────────── */
export default function Nutricao() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [carregando, setCarregando] = useState(true)
  const [userId, setUserId] = useState('')
  const [perfil, setPerfil] = useState<Perfil>({ nome: null, peso: null, objetivo: null })
  const [scoreHoje, setScoreHoje] = useState<number | null>(null)
  const [treinouHoje, setTreinouHoje] = useState(false)
  const [registroId, setRegistroId] = useState<string | null>(null)
  const [vinculoNutri, setVinculoNutri] = useState<{ nome: string | null; id: string } | null>(null)
  const [mostrarQuiz, setMostrarQuiz] = useState(false)
  const [gerandoPlano, setGerandoPlano] = useState(false)
  const [planoAtivo, setPlanoAtivo] = useState<PlanoNutricional | null>(null)
  const [aba, setAba] = useState<'plano' | 'hoje'>('hoje')
  const [qualidade, setQualidade] = useState<number | null>(null)
  const [calorias, setCalorias] = useState('')
  const [proteina, setProteina] = useState('')
  const [coposAgua, setCoposAgua] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [jaRegistrou, setJaRegistrou] = useState(false)

  const hora = getHourBR()
  const isManha = hora < 12
  const isTarde = hora >= 12 && hora < 18

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUserId(session.user.id)
    const hoje = getTodayBR()
    const [{ data: perfilData }, { data: sonoHoje }, { data: treinoHoje }, { data: atividadeHoje }, { data: registroHoje }, { data: vinculo }, { data: planoData }] = await Promise.all([
      supabase.from('perfis').select('nome,peso,objetivo').eq('id', session.user.id).single(),
      supabase.from('sono').select('score_recuperacao').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('treinos').select('id').eq('cliente_id', session.user.id).eq('concluido', true).eq('data', hoje).limit(1),
      supabase.from('atividades_livres').select('id').eq('usuario_id', session.user.id).eq('data', hoje).limit(1),
      supabase.from('nutricao').select('*').eq('usuario_id', session.user.id).eq('data', hoje).single(),
      supabase.from('vinculos').select('profissional_id').eq('cliente_id', session.user.id).eq('tipo', 'nutricionista').eq('ativo', true).single(),
      supabase.from('planos_nutricionais').select('*').eq('usuario_id', session.user.id).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single(),
    ])
    if (perfilData) setPerfil(perfilData)
    if (sonoHoje?.score_recuperacao) setScoreHoje(sonoHoje.score_recuperacao)
    if ((treinoHoje && treinoHoje.length > 0) || (atividadeHoje && atividadeHoje.length > 0)) setTreinouHoje(true)
    if (planoData) { setPlanoAtivo(planoData); setAba('plano') }
    if (registroHoje) {
      setRegistroId(registroHoje.id)
      setQualidade(registroHoje.qualidade_alimentacao ?? null)
      setCalorias(registroHoje.calorias ? String(registroHoje.calorias) : '')
      setProteina(registroHoje.proteina ? String(registroHoje.proteina) : '')
      setCoposAgua(registroHoje.copos_agua ?? 0)
      setObservacoes(registroHoje.observacoes ?? '')
      if (registroHoje.qualidade_alimentacao) setJaRegistrou(true)
    }
    if (vinculo) {
      const { data: np } = await supabase.from('perfis').select('nome').eq('id', vinculo.profissional_id).single()
      if (np) setVinculoNutri({ nome: np.nome, id: vinculo.profissional_id })
    }
    setCarregando(false)
  }

  async function gerarPlanoNutricional(respostas: RespostasQuiz) {
    setMostrarQuiz(false)
    setGerandoPlano(true)
    setAba('plano')
    const metaCal = getMetaCalorias(perfil.peso, perfil.objetivo)
    const metaProt = getMetaProteina(perfil.peso, perfil.objetivo)
    const restricoesArr = Array.isArray(respostas.restricoes) ? respostas.restricoes.join(', ') : respostas.restricoes

    const HORARIO_LABEL: Record<string, string> = { jejum_manha: 'em jejum pela manhã', manha: 'pela manhã com café', almoco: 'na hora do almoço (12h-14h)', tarde: 'à tarde (14h-18h)', noite: 'à noite (após 18h)', nao_treina: 'não treina regularmente' }
    const ONDE_LABEL: Record<string, string> = { casa: 'em casa com cozinha própria', casa_pronto: 'em casa com comida pronta ou delivery', trabalho_rua: 'no trabalho ou em restaurantes', misto: 'mistura de casa e fora' }
    const ROTINA_LABEL: Record<string, string> = { home_office: 'home office', presencial_fixo: 'trabalho presencial com horário fixo', presencial_var: 'trabalho presencial com horários variáveis', fisico: 'trabalho físico/operacional', nao_trabalha: 'estudante ou não trabalha' }
    const DESAFIO_LABEL: Record<string, string> = { fome_ansiosa: 'fome excessiva e compulsão alimentar', consistencia: 'falta de consistência e disciplina', tempo: 'falta de tempo para preparar refeições', proteina: 'dificuldade em consumir proteína suficiente', noite: 'comer muito à noite', social: 'dificuldade em situações sociais' }
    const OBJETIVO_REFEICOES: Record<string, number> = { perder_peso: 5, ganhar_massa: 6, melhorar_condicionamento: 5, saude_geral: 4 }
    const numRefeicoes = OBJETIVO_REFEICOES[perfil.objetivo ?? 'saude_geral'] ?? 5

    const prompt = `Você é uma nutricionista esportiva com 15 anos de experiência clínica. Sua missão é criar um plano alimentar completo, detalhado e verdadeiramente personalizado.

PERFIL DO PACIENTE:
- Nome: ${perfil.nome ?? 'Atleta'}
- Objetivo: ${OBJETIVO_LABEL[perfil.objetivo ?? ''] ?? 'Saúde geral'}
- Peso atual: ${perfil.peso ? `${perfil.peso}kg` : 'não informado'}
- Meta calórica: ${metaCal ? `${metaCal}kcal/dia` : 'calcule com base no perfil'}
- Meta proteína: ${metaProt ? `${metaProt}g/dia` : 'calcule com base no perfil'}

ROTINA:
- Come: ${ONDE_LABEL[respostas.onde_come as string] ?? respostas.onde_come}
- Treina: ${HORARIO_LABEL[respostas.horario_treino_nutri as string] ?? respostas.horario_treino_nutri}
- Desafio: ${DESAFIO_LABEL[respostas.desafio as string] ?? respostas.desafio}
- Restrições: ${restricoesArr}
- Trabalho: ${ROTINA_LABEL[respostas.rotina_trabalho as string] ?? respostas.rotina_trabalho}
- Álcool: ${respostas.alcool}
- Maior fome: ${respostas.fome_horario}
- Paciente faz ${respostas.refeicoes_dia} refeições/dia

DECISÃO CLÍNICA: Para o objetivo "${OBJETIVO_LABEL[perfil.objetivo ?? ''] ?? 'saúde geral'}" o ideal são ${numRefeicoes} refeições. Crie com ${numRefeicoes} refeições e explique em nota_nutri (máx 2 frases).

REGRAS:
1. EXATAMENTE ${numRefeicoes} refeições
2. Quantidade precisa em gramas para cada alimento
3. Calorias e proteína individuais por alimento
4. Total de calorias: ~${metaCal ?? 2000}kcal
5. Total de proteína: ~${metaProt ?? 120}g
6. Adapte ao local de refeição informado
7. Respeite restrições alimentares
8. Hidratação = peso(${perfil.peso ?? 70}kg) × 35ml + ajuste treino
9. Suplementos só se justificado

Responda APENAS JSON válido:

{
  "nota_nutri": "Explicação curta sobre o número de refeições.",
  "refeicoes": [
    {
      "nome": "Café da Manhã",
      "horario": "07:00",
      "calorias": 480,
      "proteina": 32,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "3 unidades (150g)", "calorias": 215, "proteina": 19, "carboidrato": 2, "gordura": 15 },
        { "nome": "Pão integral", "quantidade": "2 fatias (60g)", "calorias": 148, "proteina": 5, "carboidrato": 28, "gordura": 2 }
      ],
      "dica": "Dica prática e específica."
    }
  ],
  "suplementos": [
    { "nome": "Whey Protein", "dose": "30g", "horario": "Pós-treino", "motivo": "Motivo clínico específico." }
  ],
  "hidratacao": {
    "litros_dia": 3.2,
    "orientacao": "Orientação específica de hidratação."
  },
  "orientacao_treino": "Orientação de pré e pós-treino com alimentos e timing.",
  "estrategia_desafio": "Estratégia prática para o desafio principal.",
  "dica_fome": "Estratégia para o período de maior fome."
}`

    try {
      const res = await fetch('/api/analise-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modo: 'plano' }),
      })
      const data = await res.json()
      const texto = data.analise ?? ''
      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const planoJSON = JSON.parse(jsonMatch[0])
      const refeicoesPorDia = planoJSON.refeicoes?.length ?? numRefeicoes

      await supabase.from('planos_nutricionais').update({ ativo: false }).eq('usuario_id', userId).eq('ativo', true)
      const { data: novoPlano } = await supabase.from('planos_nutricionais').insert({
        usuario_id: userId, criado_por: 'ia', conteudo: JSON.stringify(planoJSON),
        calorias_meta: metaCal, proteina_meta: metaProt, refeicoes_por_dia: refeicoesPorDia, ativo: true,
      }).select('*').single()
      if (novoPlano) setPlanoAtivo(novoPlano)
    } catch (e) {
      console.error('Erro ao gerar plano:', e)
    } finally {
      setGerandoPlano(false)
    }
  }

  if (mostrarQuiz) return <QuizIA tipo="nutricao" onConcluir={gerarPlanoNutricional} onCancelar={() => setMostrarQuiz(false)} />
  if (carregando) return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${C.good}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  const periodo = isManha ? { label: 'Manhã', cor: C.warn } : isTarde ? { label: 'Tarde', cor: C.sleep } : { label: 'Noite', cor: C.recovery }

  const abaPlanoEl = <AbaPlano plano={planoAtivo} gerandoPlano={gerandoPlano} vinculoNutri={vinculoNutri} onIniciarConsulta={() => setMostrarQuiz(true)} isDesktop={isDesktop} />
  const abaHojeEl = <AbaHoje perfil={perfil} scoreHoje={scoreHoje} treinouHoje={treinouHoje} vinculoNutri={vinculoNutri} userId={userId} registroId={registroId} setRegistroId={setRegistroId} qualidade={qualidade} setQualidade={setQualidade} calorias={calorias} setCalorias={setCalorias} proteina={proteina} setProteina={setProteina} coposAgua={coposAgua} setCoposAgua={setCoposAgua} observacoes={observacoes} setObservacoes={setObservacoes} jaRegistrou={jaRegistrou} setJaRegistrou={setJaRegistrou} />

  return (
    <main className="md:flex" style={{ minHeight: '100dvh', color: C.t1, fontFamily: FONT_BODY }}>
      <SidebarProfissional tipo="cliente" />
      <div className="flex-1 md:h-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '0 16px', paddingTop: isDesktop ? 36 : 'max(3rem,calc(env(safe-area-inset-top)+1.5rem))' }}>
        <div style={{ maxWidth: isDesktop ? 1100 : 448, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ color: C.t3, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2, fontFamily: FONT_BODY }}>KORE</p>
              <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: C.t1, lineHeight: 1, fontFamily: FONT_DISPLAY }}>Nutrição</h1>
              <p style={{ color: C.t3, fontSize: 11, marginTop: 6, fontFamily: FONT_BODY }}>{(() => { const d = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1); })()}</p>
            </div>
            <div style={{ marginTop: 4, padding: '7px 13px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_BODY, color: periodo.cor, background: alpha(periodo.cor, 0.1), border: `1px solid ${alpha(periodo.cor, 0.25)}` }}>
              {periodo.label}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, marginBottom: 16, background: 'rgba(255,255,255,0.04)' }}>
            {([['plano', 'Meu Plano'], ['hoje', 'Hoje']] as const).map(([id, label]) => {
              const active = aba === id
              return (
                <button key={id} onClick={() => setAba(id)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', position: 'relative', transition: 'all .15s', border: 'none', fontFamily: FONT_BODY,
                    background: active ? `linear-gradient(135deg, ${C.energy2}, ${C.energy})` : 'transparent',
                    color: active ? '#fff' : C.t2,
                    boxShadow: active ? `0 6px 20px ${alpha(C.energy, 0.3)}` : 'none' }}>
                  {label}
                  {id === 'hoje' && jaRegistrou && aba !== 'hoje' && <span style={{ position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: '50%', background: C.good }} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isDesktop ? 48 : 96 }}>
        <div style={{ maxWidth: isDesktop ? 1100 : 448, margin: '0 auto', width: '100%', padding: '16px', boxSizing: 'border-box' }}>
          {isDesktop ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>
              {aba === 'plano' ? (
                <>
                  <div>{abaPlanoEl}</div>
                  <div>{abaHojeEl}</div>
                </>
              ) : (
                <>
                  <div>{abaHojeEl}</div>
                  <div>{abaPlanoEl}</div>
                </>
              )}
            </div>
          ) : (
            <>
              {aba === 'plano' && abaPlanoEl}
              {aba === 'hoje' && abaHojeEl}
            </>
          )}
        </div>
      </div>
      </div>
    </main>
  )
}
