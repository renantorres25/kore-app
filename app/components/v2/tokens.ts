/* ═══════════════════════════════════════════════════════
   KORE v2 — Design Tokens centralizados
   Importe este arquivo em qualquer componente v2
   ═══════════════════════════════════════════════════════ */

export const C = {
  energy:   '#FF5A36',
  energy2:  '#FF8A3D',
  good:     '#2DD4A7',
  sleep:    '#60A5FA',
  recovery: '#A78BFA',
  warn:     '#F5B544',
  danger:   '#FB7185',
  t1:       '#F5F6F8',
  t2:       '#9AA0AD',
  t3:       '#7A8290',
} as const

export const FONT_DISPLAY = "'Sora', system-ui, sans-serif"
export const FONT_BODY    = "'Plus Jakarta Sans', system-ui, sans-serif"
export const FONT_MONO    = "var(--font-geist-mono), 'JetBrains Mono', monospace"

export function revealStyle(delay: number, mounted: boolean): React.CSSProperties {
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : 'translateY(14px)',
    transition: `opacity 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    willChange: 'opacity, transform',
  }
}

import type React from 'react'
