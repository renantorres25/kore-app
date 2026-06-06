'use client'
import React, { useState } from 'react'

export function GlassCard({
  children, style, accent, interactive = false, ...rest
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
  interactive?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  const [hover, setHover] = useState(false)
  const glow = accent ?? 'rgba(255,255,255,0.04)'

  const base: React.CSSProperties = {
    background: 'rgba(255,255,255,0.065)',
    backdropFilter: 'blur(16px) saturate(130%)',
    WebkitBackdropFilter: 'blur(16px) saturate(130%)',
    border: `1px solid ${hover && interactive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 'var(--radius-card)',
    boxShadow: hover && interactive
      ? `0 0 0 1px rgba(255,255,255,0.10), 0 30px 80px rgba(0,0,0,0.55), 0 0 70px ${glow}, inset 0 1px 0 rgba(255,255,255,0.14)`
      : `0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${glow}, inset 0 1px 0 rgba(255,255,255,0.10)`,
    transform: hover && interactive ? 'translateY(-4px) translateZ(0)' : 'translateZ(0)',
    transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease',
    isolation: 'isolate',
    willChange: 'transform',
    ...style,
  }

  return (
    <div
      {...rest}
      style={base}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
    >
      {children}
    </div>
  )
}
