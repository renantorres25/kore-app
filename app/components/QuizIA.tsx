'use client'

import { useState } from 'react'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type RespostasQuiz = Record<string, string | string[]>

type Opcao = { valor: string; label: string; emoji?: string }

type Pergunta = {
  id: string
  pergunta: string
  subtitulo?: string
  tipo: 'single' | 'multi'
  opcoes: Opcao[]
  maxSelecoes?: number
}

// ─── PERGUNTAS TREINO ─────────────────────────────────────────────────────────

export const PERGUNTAS_TREINO: Pergunta[] = [
  {
    id: 'dias_semana',
    pergunta: 'Quantos dias por semana você consegue treinar?',
    subtitulo: 'Seja realista — consistência vale mais que intensidade',
    tipo: 'single',
    opcoes: [
      { valor: '2', label: '2 dias', emoji: '😌' },
      { valor: '3', label: '3 dias', emoji: '💪' },
      { valor: '4', label: '4 dias', emoji: '🔥' },
      { valor: '5', label: '5 dias', emoji: '⚡' },
      { valor: '6+', label: '6+ dias', emoji: '🏆' },
    ],
  },
  {
    id: 'duracao',
    pergunta: 'Quanto tempo tem disponível por treino?',
    subtitulo: 'Inclua aquecimento e descanso entre séries',
    tipo: 'single',
    opcoes: [
      { valor: '30-40min', label: '30–40 min', emoji: '⚡' },
      { valor: '45-60min', label: '45–60 min', emoji: '💪' },
      { valor: '60-80min', label: '60–80 min', emoji: '🔥' },
      { valor: '90min+',   label: '90 min+',   emoji: '🏆' },
    ],
  },
  {
    id: 'periodo',
    pergunta: 'Em qual período você costuma treinar?',
    subtitulo: 'Isso influencia volume e intensidade das sessões',
    tipo: 'single',
    opcoes: [
      { valor: 'manha',   label: 'Manhã cedo (antes 9h)',   emoji: '🌅' },
      { valor: 'manha_tarde', label: 'Manhã/tarde (9h–14h)', emoji: '☀️' },
      { valor: 'tarde',   label: 'Tarde (14h–18h)',         emoji: '🌤' },
      { valor: 'noite',   label: 'Noite (após 18h)',        emoji: '🌙' },
    ],
  },
  {
    id: 'foco',
    pergunta: 'Qual grupo muscular quer priorizar?',
    subtitulo: 'Escolha até 2 — o plano vai enfatizar esses grupos',
    tipo: 'multi',
    maxSelecoes: 2,
    opcoes: [
      { valor: 'peito_triceps',   label: 'Peito & Tríceps',   emoji: '💪' },
      { valor: 'costas_biceps',   label: 'Costas & Bíceps',   emoji: '🔙' },
      { valor: 'pernas_gluteos',  label: 'Pernas & Glúteos',  emoji: '🦵' },
      { valor: 'ombros_trapezio', label: 'Ombros & Trapézio', emoji: '🏋️' },
      { valor: 'core_abdomen',    label: 'Core & Abdômen',    emoji: '🎯' },
      { valor: 'equilibrado',     label: 'Equilibrado',       emoji: '⚖️' },
    ],
  },
  {
    id: 'experiencia',
    pergunta: 'Como você descreveria sua experiência atual?',
    subtitulo: 'Vamos calibrar as cargas e complexidade dos exercícios',
    tipo: 'single',
    opcoes: [
      { valor: 'iniciante',       label: 'Iniciante — técnica básica ainda',  emoji: '🌱' },
      { valor: 'intermediario',   label: 'Intermediário — treino há 1-3 anos', emoji: '📈' },
      { valor: 'avancado',        label: 'Avançado — treino há 3+ anos',       emoji: '🏆' },
      { valor: 'retomando',       label: 'Retomando depois de pausa',          emoji: '🔄' },
    ],
  },
  {
    id: 'limitacao',
    pergunta: 'Tem alguma limitação física ou lesão?',
    subtitulo: 'Adaptar o plano previne lesões e mantém a progressão',
    tipo: 'multi',
    opcoes: [
      { valor: 'nenhuma',         label: 'Nenhuma limitação',   emoji: '✅' },
      { valor: 'joelho',          label: 'Joelho',              emoji: '🦵' },
      { valor: 'lombar',          label: 'Lombar / coluna',     emoji: '🔙' },
      { valor: 'ombro',           label: 'Ombro / manguito',    emoji: '💪' },
      { valor: 'cervical',        label: 'Cervical / pescoço',  emoji: '🤕' },
      { valor: 'outro',           label: 'Outra limitação',     emoji: '⚠️' },
    ],
  },
  {
    id: 'objetivo_treino',
    pergunta: 'O que mais importa para você agora?',
    subtitulo: 'Isso define a lógica de progressão do plano',
    tipo: 'single',
    opcoes: [
      { valor: 'forca',          label: 'Ganhar força e massa',        emoji: '💪' },
      { valor: 'definicao',      label: 'Definição e queima de gordura', emoji: '🔥' },
      { valor: 'condicionamento', label: 'Condicionamento físico geral', emoji: '❤️' },
      { valor: 'reabilitacao',   label: 'Voltar gradualmente ao treino', emoji: '🌱' },
    ],
  },
]

// ─── PERGUNTAS NUTRIÇÃO ───────────────────────────────────────────────────────

export const PERGUNTAS_NUTRICAO: Pergunta[] = [
  {
    id: 'refeicoes_dia',
    pergunta: 'Quantas refeições você faz por dia?',
    subtitulo: 'Inclua lanches, mesmo os pequenos',
    tipo: 'single',
    opcoes: [
      { valor: '1-2', label: '1 ou 2 refeições', emoji: '😔' },
      { valor: '3',   label: '3 refeições',      emoji: '😐' },
      { valor: '4-5', label: '4 ou 5 refeições', emoji: '🙂' },
      { valor: '6+',  label: '6 ou mais',        emoji: '💪' },
    ],
  },
  {
    id: 'onde_come',
    pergunta: 'Onde você faz a maioria das refeições?',
    subtitulo: 'Isso define o que é realista sugerir no dia a dia',
    tipo: 'single',
    opcoes: [
      { valor: 'casa',          label: 'Em casa — cozinho',          emoji: '🍳' },
      { valor: 'casa_pronto',   label: 'Em casa — comida pronta/delivery', emoji: '📦' },
      { valor: 'trabalho_rua',  label: 'No trabalho / restaurante',  emoji: '🍽️' },
      { valor: 'misto',         label: 'Mistura de tudo',            emoji: '🔀' },
    ],
  },
  {
    id: 'horario_treino_nutri',
    pergunta: 'Em que horário você costuma treinar?',
    subtitulo: 'Fundamental para organizar pré e pós-treino',
    tipo: 'single',
    opcoes: [
      { valor: 'jejum_manha',  label: 'Manhã em jejum (antes 9h)',    emoji: '🌅' },
      { valor: 'manha',        label: 'Manhã com café (9h–12h)',      emoji: '☀️' },
      { valor: 'almoco',       label: 'Hora do almoço (12h–14h)',     emoji: '🌤' },
      { valor: 'tarde',        label: 'Tarde (14h–18h)',              emoji: '🌇' },
      { valor: 'noite',        label: 'Noite (após 18h)',             emoji: '🌙' },
      { valor: 'nao_treina',   label: 'Não treino regularmente',      emoji: '😴' },
    ],
  },
  {
    id: 'desafio',
    pergunta: 'Qual seu maior desafio com alimentação?',
    subtitulo: 'Seja honesto — vamos trabalhar em cima disso',
    tipo: 'single',
    opcoes: [
      { valor: 'fome_ansiosa',   label: 'Fome excessiva / compulsão',    emoji: '😤' },
      { valor: 'consistencia',   label: 'Falta de consistência / disciplina', emoji: '📉' },
      { valor: 'tempo',          label: 'Falta de tempo para preparar',   emoji: '⏰' },
      { valor: 'proteina',       label: 'Dificuldade em consumir proteína', emoji: '🥩' },
      { valor: 'noite',          label: 'Como muito à noite',             emoji: '🌙' },
      { valor: 'social',         label: 'Dificuldade em situações sociais', emoji: '🍺' },
    ],
  },
  {
    id: 'restricoes',
    pergunta: 'Tem alguma restrição alimentar?',
    subtitulo: 'Selecione todas que se aplicam',
    tipo: 'multi',
    opcoes: [
      { valor: 'nenhuma',      label: 'Nenhuma',          emoji: '✅' },
      { valor: 'lactose',      label: 'Intolerância à lactose', emoji: '🥛' },
      { valor: 'gluten',       label: 'Intolerância ao glúten', emoji: '🌾' },
      { valor: 'vegetariano',  label: 'Vegetariano',      emoji: '🥦' },
      { valor: 'vegano',       label: 'Vegano',           emoji: '🌱' },
      { valor: 'alergias',     label: 'Alergias específicas',  emoji: '⚠️' },
    ],
  },
  {
    id: 'rotina_trabalho',
    pergunta: 'Como é sua rotina de trabalho?',
    subtitulo: 'Impacta diretamente nos horários e qualidade das refeições',
    tipo: 'single',
    opcoes: [
      { valor: 'home_office',   label: 'Home office / em casa',         emoji: '🏠' },
      { valor: 'presencial_fixo', label: 'Presencial com horário fixo', emoji: '🏢' },
      { valor: 'presencial_var', label: 'Presencial com horários variáveis', emoji: '🔄' },
      { valor: 'fisico',        label: 'Trabalho físico / operacional', emoji: '⚒️' },
      { valor: 'nao_trabalha',  label: 'Estudante / não trabalho',      emoji: '📚' },
    ],
  },
  {
    id: 'alcool',
    pergunta: 'Com que frequência consome bebidas alcoólicas?',
    subtitulo: 'Sem julgamentos — impacta calorias e recuperação',
    tipo: 'single',
    opcoes: [
      { valor: 'nunca',        label: 'Nunca ou raramente',    emoji: '🚫' },
      { valor: 'ocasional',    label: 'Ocasionalmente (1-2x/mês)', emoji: '🥂' },
      { valor: 'semanal',      label: 'Toda semana',           emoji: '🍺' },
      { valor: 'varios_dias',  label: 'Vários dias na semana', emoji: '⚠️' },
    ],
  },
  {
    id: 'fome_horario',
    pergunta: 'Em qual período você sente mais fome ou vontade de beliscar?',
    subtitulo: 'Vamos reforçar esse período com opções estratégicas',
    tipo: 'single',
    opcoes: [
      { valor: 'manha',   label: 'Manhã',            emoji: '🌅' },
      { valor: 'almoco',  label: 'Após o almoço',    emoji: '☀️' },
      { valor: 'tarde',   label: 'Tarde (15h–18h)',  emoji: '🌇' },
      { valor: 'noite',   label: 'Noite / após jantar', emoji: '🌙' },
      { valor: 'sempre',  label: 'O tempo todo',     emoji: '😅' },
    ],
  },
]

// ─── COMPONENTE QUIZ ──────────────────────────────────────────────────────────

type Props = {
  tipo: 'treino' | 'nutricao'
  onConcluir: (respostas: RespostasQuiz) => void
  onCancelar: () => void
}

export default function QuizIA({ tipo, onConcluir, onCancelar }: Props) {
  const perguntas = tipo === 'treino' ? PERGUNTAS_TREINO : PERGUNTAS_NUTRICAO
  const [stepAtual, setStepAtual] = useState(0)
  const [respostas, setRespostas] = useState<RespostasQuiz>({})
  const [animando, setAnimando] = useState(false)

  const pergunta = perguntas[stepAtual]
  const total = perguntas.length
  const progresso = ((stepAtual) / total) * 100

  const respostaAtual = respostas[pergunta.id]
  const temResposta = Array.isArray(respostaAtual)
    ? respostaAtual.length > 0
    : !!respostaAtual

  function selecionarOpcao(valor: string) {
    if (pergunta.tipo === 'single') {
      setRespostas(r => ({ ...r, [pergunta.id]: valor }))
    } else {
      const atual = (respostas[pergunta.id] as string[]) ?? []
      const max = pergunta.maxSelecoes ?? 99
      if (atual.includes(valor)) {
        setRespostas(r => ({ ...r, [pergunta.id]: atual.filter(v => v !== valor) }))
      } else if (atual.length < max) {
        setRespostas(r => ({ ...r, [pergunta.id]: [...atual, valor] }))
      }
    }
  }

  function isSelected(valor: string): boolean {
    const atual = respostas[pergunta.id]
    if (Array.isArray(atual)) return atual.includes(valor)
    return atual === valor
  }

  function avancar() {
    if (!temResposta || animando) return
    if (stepAtual === total - 1) {
      onConcluir(respostas)
      return
    }
    setAnimando(true)
    setTimeout(() => {
      setStepAtual(s => s + 1)
      setAnimando(false)
    }, 250)
  }

  function voltar() {
    if (stepAtual === 0) { onCancelar(); return }
    setAnimando(true)
    setTimeout(() => {
      setStepAtual(s => s - 1)
      setAnimando(false)
    }, 200)
  }

  const corAccent = tipo === 'treino' ? {
    text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    btnBg: 'bg-emerald-500', selectedBg: 'bg-emerald-500/15', selectedBorder: 'border-emerald-500/40', selectedText: 'text-emerald-400',
  } : {
    text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    btnBg: 'bg-blue-500', selectedBg: 'bg-blue-500/15', selectedBorder: 'border-blue-500/40', selectedText: 'text-blue-400',
  }

  return (
    <main className="min-h-[100dvh] bg-[#080808] text-white flex flex-col">

      {/* Header */}
      <div className="shrink-0 px-4 pt-12 pb-4" style={{ background: 'rgba(8,8,8,0.97)' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={voltar} className="text-zinc-600 text-[10px] uppercase tracking-widest hover:text-zinc-400 transition-colors active:scale-95">
              ← {stepAtual === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">{stepAtual + 1} de {total}</p>
          </div>

          {/* Barra de progresso */}
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${tipo === 'treino' ? 'bg-emerald-400' : 'bg-blue-400'}`}
              style={{ width: `${progresso + (100 / total)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">

          {/* Pergunta */}
          <div
            className="mb-8"
            style={{ opacity: animando ? 0 : 1, transform: animando ? 'translateY(8px)' : 'translateY(0)', transition: 'all 0.25s ease' }}
          >
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 border ${corAccent.border} ${corAccent.bg}`}>
              <span className={`text-[10px] uppercase tracking-[0.15em] font-semibold ${corAccent.text}`}>
                {tipo === 'treino' ? '✦ Consultoria de treino' : '✦ Consultoria nutricional'}
              </span>
            </div>

            <h2 className="text-2xl font-black text-white leading-tight mb-2">{pergunta.pergunta}</h2>
            {pergunta.subtitulo && (
              <p className="text-zinc-500 text-sm leading-relaxed">{pergunta.subtitulo}</p>
            )}
            {pergunta.tipo === 'multi' && pergunta.maxSelecoes && (
              <p className={`text-xs mt-2 ${corAccent.text}`}>Selecione até {pergunta.maxSelecoes}</p>
            )}
            {pergunta.tipo === 'multi' && !pergunta.maxSelecoes && (
              <p className={`text-xs mt-2 ${corAccent.text}`}>Pode selecionar mais de uma</p>
            )}
          </div>

          {/* Opções */}
          <div
            className="space-y-2"
            style={{ opacity: animando ? 0 : 1, transform: animando ? 'translateY(12px)' : 'translateY(0)', transition: 'all 0.25s ease 0.05s' }}
          >
            {pergunta.opcoes.map((op) => {
              const sel = isSelected(op.valor)
              return (
                <button
                  key={op.valor}
                  onClick={() => selecionarOpcao(op.valor)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left ${
                    sel
                      ? `${corAccent.selectedBg} ${corAccent.selectedBorder}`
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  {op.emoji && (
                    <span className="text-2xl shrink-0">{op.emoji}</span>
                  )}
                  <span className={`font-semibold text-sm flex-1 ${sel ? corAccent.selectedText : 'text-zinc-300'}`}>
                    {op.label}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    sel
                      ? `${tipo === 'treino' ? 'border-emerald-400 bg-emerald-400' : 'border-blue-400 bg-blue-400'}`
                      : 'border-white/[0.15]'
                  }`}>
                    {sel && <span className="text-black text-[10px] font-black">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-4 border-t border-white/[0.04]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)', background: 'rgba(8,8,8,0.97)' }}>
        <div className="max-w-md mx-auto">
          <button
            onClick={avancar}
            disabled={!temResposta || animando}
            className={`w-full font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all tracking-wide ${
              temResposta
                ? tipo === 'treino'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-blue-500 text-white'
                : 'bg-white/[0.06] text-zinc-600 border border-white/[0.08]'
            }`}
          >
            {stepAtual === total - 1 ? '✦ Gerar meu plano personalizado' : 'Próximo →'}
          </button>
        </div>
      </div>
    </main>
  )
}