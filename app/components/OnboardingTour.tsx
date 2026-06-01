'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const TOUR_KEY = 'kore_tour_done_v1'

type Step = {
  title: string
  desc: string
  action?: string
  actionRoute?: string
  emoji: string
}

const STEPS: Step[] = [
  {
    emoji: '👋',
    title: 'Bem-vindo ao KORE',
    desc: 'Seu app de performance integrada. Em menos de 2 minutos você já vai ter dados reais funcionando.',
  },
  {
    emoji: '🌙',
    title: 'Registre seu sono',
    desc: 'Todo dia ao acordar, leva 30 segundos. O KORE calcula seu score de recuperação e adapta as sugestões de treino.',
    action: 'Registrar sono agora',
    actionRoute: '/sono',
  },
  {
    emoji: '💪',
    title: 'Como você está hoje?',
    desc: 'Energia, humor, dor muscular. Isso alimenta a IA para dar coaching personalizado de verdade.',
    action: 'Registrar bem-estar',
    actionRoute: '/bem-estar',
  },
  {
    emoji: '🏋️',
    title: 'Seus treinos',
    desc: 'Seu personal já pode montar seus planos aqui. Você executa, registra as séries e a IA analisa sua evolução.',
    action: 'Ver treinos',
    actionRoute: '/treino',
  },
  {
    emoji: '✦',
    title: 'IA no canto inferior direito',
    desc: 'O botão verde é seu coach de IA. Pergunte qualquer coisa — ele conhece seus dados de treino, sono e nutrição.',
  },
  {
    emoji: '🚀',
    title: 'Tudo pronto!',
    desc: 'Quanto mais você registrar, mais inteligente fica o coaching. Comece pelo sono de hoje.',
    action: 'Começar agora',
    actionRoute: '/sono',
  },
]

export default function OnboardingTour() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      setTimeout(() => setVisible(true), 800)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (animating) return
    if (step === STEPS.length - 1) { dismiss(); return }
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setAnimating(false)
    }, 200)
  }

  function handleAction(route?: string) {
    dismiss()
    if (route) router.push(route)
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={next}
    >
      {/* Card */}
      <div
        className="w-full max-w-md rounded-3xl border border-white/[0.14] p-6 mb-8"
        style={{
          background: 'linear-gradient(145deg, #141414 0%, #1a1a1a 100%)',
          transform: animating ? 'translateY(8px)' : 'translateY(0)',
          opacity: animating ? 0 : 1,
          transition: 'all 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                background: i === step ? '#34d399' : 'rgba(255,255,255,0.08)',
                width: i === step ? '24px' : '6px',
              }}
            />
          ))}
        </div>

        {/* Emoji */}
        <div className="w-14 h-14 rounded-2xl bg-white/[0.07] border border-white/[0.11] flex items-center justify-center text-3xl mb-4">
          {current.emoji}
        </div>

        {/* Content */}
        <h2 className="text-white text-xl font-black mb-2 leading-tight">{current.title}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">{current.desc}</p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {current.action && (
            <button
              onClick={() => handleAction(current.actionRoute)}
              className="w-full bg-emerald-500 text-black font-bold py-3.5 rounded-xl text-sm tracking-wide active:scale-95 transition-all"
            >
              {current.action}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={next}
              className="flex-1 border border-white/[0.14] text-zinc-400 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-all hover:border-white/20 hover:text-white"
            >
              {step === STEPS.length - 1 ? 'Entendi' : 'Próximo →'}
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={dismiss}
                className="px-4 py-3 text-zinc-700 text-xs uppercase tracking-wider active:scale-95 transition-all hover:text-zinc-500"
              >
                Pular
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}