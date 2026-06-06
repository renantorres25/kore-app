'use client'
import React from 'react'
import { C } from './tokens'

type PillCfg = { bg: string; border: string; color: string }

const PILL_CONFIGS: Record<string, PillCfg> = {
  'Ganhar massa':             { bg: 'rgba(255,90,54,0.12)',   border: 'rgba(255,90,54,0.30)',   color: '#FF8A3D' },
  'Perder peso':              { bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.30)', color: '#FB7185' },
  'Manter peso':              { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)',  color: '#60A5FA' },
  'Melhorar condicionamento': { bg: 'rgba(45,212,167,0.12)',  border: 'rgba(45,212,167,0.30)',  color: '#2DD4A7' },
  'Saúde geral':              { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.30)', color: '#A78BFA' },
  'Intermediário':            { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.30)', color: '#A78BFA' },
  'Avançado':                 { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)',  color: '#60A5FA' },
  'Iniciante':                { bg: 'rgba(45,212,167,0.12)',  border: 'rgba(45,212,167,0.30)',  color: '#2DD4A7' },
}
const PILL_DEFAULT: PillCfg = {
  bg: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.13)',
  color: C.t2,
}

export function Pill({ label, icon }: { label: string; icon?: React.ReactNode }) {
  const isDiasNoPlano = label.includes('dias no plano')
  const cfg: PillCfg = isDiasNoPlano
    ? { bg: 'rgba(45,212,167,0.10)', border: 'rgba(45,212,167,0.25)', color: '#2DD4A7' }
    : (PILL_CONFIGS[label] ?? PILL_DEFAULT)

  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      borderRadius: 999, padding: '5px 13px',
      fontSize: 12, fontWeight: 600,
      backdropFilter: 'blur(8px)',
      letterSpacing: '0.01em',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {icon ?? (isDiasNoPlano && <span style={{ fontSize: 10 }}>📅</span>)}
      {label}
    </span>
  )
}
