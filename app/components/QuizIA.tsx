'use client'

import { useState } from 'react'

export type RespostasQuiz = Record<string, string | string[]>

type Opcao = { valor: string; label: string; emoji?: string }

type Pergunta = {
  id: string
  pergunta: string
  subtitulo?: string
  tipo: 'single' | 'multi' | 'texto' | 'escala'
  opcoes?: Opcao[]
  maxSelecoes?: number
  placeholder?: string
  obrigatorio?: boolean
  temCampoLivre?: boolean         // mostra input quando seleciona "outro"
  valorGatilho?: string           // qual valor dispara o campo livre
}

// ─── PERGUNTAS TREINO ─────────────────────────────────────────────────────────

export const PERGUNTAS_TREINO: Pergunta[] = [
  {
    id: 'objetivo_treino',
    pergunta: 'O que mais importa para você agora?',
    subtitulo: 'Isso define toda a lógica de progressão do plano',
    tipo: 'single',
    opcoes: [
      { valor: 'forca',           label: 'Ganhar força e massa muscular',     emoji: '💪' },
      { valor: 'definicao',       label: 'Perder gordura e definir',          emoji: '🔥' },
      { valor: 'condicionamento', label: 'Condicionamento físico geral',      emoji: '❤️' },
      { valor: 'performance',     label: 'Melhorar performance esportiva',    emoji: '⚡' },
      { valor: 'reabilitacao',    label: 'Voltar gradualmente ao treino',     emoji: '🌱' },
    ],
  },
  {
    id: 'modalidades',
    pergunta: 'Quais atividades você faz ou quer incluir?',
    subtitulo: 'Selecione tudo que faz parte da sua rotina ou interesse',
    tipo: 'multi',
    opcoes: [
      { valor: 'musculacao',  label: 'Musculação',         emoji: '🏋️' },
      { valor: 'corrida',     label: 'Corrida',             emoji: '🏃' },
      { valor: 'bike',        label: 'Ciclismo / Bike',     emoji: '🚴' },
      { valor: 'natacao',     label: 'Natação',             emoji: '🏊' },
      { valor: 'crossfit',    label: 'Crossfit / Funcional',emoji: '⚡' },
      { valor: 'futebol',     label: 'Futebol / esporte coletivo', emoji: '⚽' },
      { valor: 'lutas',       label: 'Lutas / artes marciais', emoji: '🥊' },
      { valor: 'outro',       label: 'Outra atividade',     emoji: '🎯' },
    ],
  },
  {
    id: 'dias_semana',
    pergunta: 'Quantos dias por semana você consegue se exercitar?',
    subtitulo: 'Considere todos os tipos de atividade, não só musculação',
    tipo: 'single',
    opcoes: [
      { valor: '2',  label: '2 dias',  emoji: '😌' },
      { valor: '3',  label: '3 dias',  emoji: '💪' },
      { valor: '4',  label: '4 dias',  emoji: '🔥' },
      { valor: '5',  label: '5 dias',  emoji: '⚡' },
      { valor: '6+', label: '6+ dias', emoji: '🏆' },
    ],
  },
  {
    id: 'duracao',
    pergunta: 'Quanto tempo disponível por sessão?',
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
    pergunta: 'Em qual período você costuma se exercitar?',
    subtitulo: 'Isso influencia volume, intensidade e nutrição peri-treino',
    tipo: 'single',
    opcoes: [
      { valor: 'manha_cedo',  label: 'Manhã cedo (antes 9h)',    emoji: '🌅' },
      { valor: 'manha',       label: 'Manhã (9h–12h)',           emoji: '☀️' },
      { valor: 'almoco',      label: 'Hora do almoço (12h–14h)', emoji: '🌤' },
      { valor: 'tarde',       label: 'Tarde (14h–18h)',          emoji: '🌇' },
      { valor: 'noite',       label: 'Noite (após 18h)',         emoji: '🌙' },
      { valor: 'variado',     label: 'Varia muito',              emoji: '🔀' },
    ],
  },
  {
    id: 'foco',
    pergunta: 'Na musculação, qual grupo muscular quer priorizar?',
    subtitulo: 'Escolha até 2 — o plano vai enfatizar esses grupos',
    tipo: 'multi',
    maxSelecoes: 2,
    opcoes: [
      { valor: 'peito_triceps',   label: 'Peito & Tríceps',   emoji: '💪' },
      { valor: 'costas_biceps',   label: 'Costas & Bíceps',   emoji: '🔙' },
      { valor: 'pernas_gluteos',  label: 'Pernas & Glúteos',  emoji: '🦵' },
      { valor: 'ombros_trapezio', label: 'Ombros & Trapézio', emoji: '🏋️' },
      { valor: 'core_abdomen',    label: 'Core & Abdômen',    emoji: '🎯' },
      { valor: 'equilibrado',     label: 'Equilibrado — sem prioridade', emoji: '⚖️' },
    ],
  },
  {
    id: 'experiencia',
    pergunta: 'Como você descreveria sua experiência atual?',
    subtitulo: 'Vamos calibrar as cargas e a complexidade dos exercícios',
    tipo: 'single',
    opcoes: [
      { valor: 'iniciante',     label: 'Iniciante — menos de 1 ano',    emoji: '🌱' },
      { valor: 'intermediario', label: 'Intermediário — 1 a 3 anos',    emoji: '📈' },
      { valor: 'avancado',      label: 'Avançado — mais de 3 anos',     emoji: '🏆' },
      { valor: 'retomando',     label: 'Retomando depois de uma pausa', emoji: '🔄' },
    ],
  },
  {
    id: 'limitacao',
    pergunta: 'Tem alguma limitação física ou lesão?',
    subtitulo: 'Adaptar o plano previne lesões e mantém a progressão',
    tipo: 'multi',
    temCampoLivre: true,
    valorGatilho: 'outro',
    opcoes: [
      { valor: 'nenhuma',   label: 'Nenhuma limitação',    emoji: '✅' },
      { valor: 'joelho',    label: 'Joelho',               emoji: '🦵' },
      { valor: 'lombar',    label: 'Lombar / coluna',      emoji: '🔙' },
      { valor: 'ombro',     label: 'Ombro / manguito',    emoji: '💪' },
      { valor: 'cervical',  label: 'Cervical / pescoço',  emoji: '🤕' },
      { valor: 'outro',     label: 'Outra — descrever →', emoji: '⚠️' },
    ],
  },
  {
    id: 'observacoes_treino',
    pergunta: 'Algo mais que o personal trainer deve saber?',
    subtitulo: 'Contexto extra torna o plano muito mais preciso',
    tipo: 'texto',
    placeholder: 'Ex: "Treino antes de trabalhar e tenho só 45min reais", "quero incluir corrida 2x/semana junto com musculação", "odeio agachamento", "tenho competição em 3 meses"...',
    obrigatorio: false,
  },
]

// ─── PERGUNTAS NUTRIÇÃO ───────────────────────────────────────────────────────

export const PERGUNTAS_NUTRICAO: Pergunta[] = [
  {
    id: 'rotina_treino_nutri',
    pergunta: 'Como é sua rotina de exercícios atual?',
    subtitulo: 'Fundamental para calcular seu gasto calórico real',
    tipo: 'single',
    opcoes: [
      { valor: 'sedentario',     label: 'Sedentário — pouco ou nenhum exercício', emoji: '🛋️' },
      { valor: 'leve_1_2',       label: 'Leve — 1 a 2x por semana',              emoji: '🚶' },
      { valor: 'moderado_3_4',   label: 'Moderado — 3 a 4x por semana',          emoji: '🏃' },
      { valor: 'intenso_5_6',    label: 'Intenso — 5 a 6x por semana',           emoji: '💪' },
      { valor: 'atleta',         label: 'Atleta — treino diário ou 2x/dia',      emoji: '🏆' },
    ],
  },
  {
    id: 'esportes_pratica',
    pergunta: 'Quais atividades você pratica regularmente?',
    subtitulo: 'Cada esporte tem demandas energéticas diferentes',
    tipo: 'multi',
    opcoes: [
      { valor: 'musculacao',  label: 'Musculação',              emoji: '🏋️' },
      { valor: 'corrida',     label: 'Corrida / caminhada',     emoji: '🏃' },
      { valor: 'bike',        label: 'Ciclismo / Bike',         emoji: '🚴' },
      { valor: 'natacao',     label: 'Natação',                 emoji: '🏊' },
      { valor: 'crossfit',    label: 'Crossfit / Funcional',    emoji: '⚡' },
      { valor: 'esporte_col', label: 'Futebol / esporte coletivo', emoji: '⚽' },
      { valor: 'nenhum',      label: 'Não pratico esportes',    emoji: '🛋️' },
    ],
  },
  {
    id: 'intensidade_treino',
    pergunta: 'Qual a intensidade média dos seus treinos?',
    subtitulo: 'Impacta diretamente no seu gasto calórico e necessidade de carboidratos',
    tipo: 'single',
    opcoes: [
      { valor: 'muito_leve', label: 'Muito leve — quase sem esforço',        emoji: '😌' },
      { valor: 'leve',       label: 'Leve — fico pouco cansado',             emoji: '🙂' },
      { valor: 'moderada',   label: 'Moderada — fico suado mas confortável', emoji: '😤' },
      { valor: 'intensa',    label: 'Intensa — saio exausto',                emoji: '😰' },
      { valor: 'maxima',     label: 'Máxima — treino de atleta de alta performance', emoji: '🔥' },
    ],
  },
  {
    id: 'onde_come',
    pergunta: 'Onde você faz a maioria das refeições?',
    subtitulo: 'Isso define o que é realista sugerir no dia a dia',
    tipo: 'single',
    opcoes: [
      { valor: 'casa',         label: 'Em casa — cozinho',               emoji: '🍳' },
      { valor: 'casa_pronto',  label: 'Em casa — comida pronta/delivery', emoji: '📦' },
      { valor: 'trabalho_rua', label: 'No trabalho / restaurante',        emoji: '🍽️' },
      { valor: 'misto',        label: 'Mistura de tudo',                  emoji: '🔀' },
    ],
  },
  {
    id: 'horario_treino_nutri',
    pergunta: 'Em que horário você costuma treinar?',
    subtitulo: 'Fundamental para organizar pré e pós-treino',
    tipo: 'single',
    opcoes: [
      { valor: 'jejum_manha', label: 'Manhã em jejum (antes 9h)',  emoji: '🌅' },
      { valor: 'manha',       label: 'Manhã com café (9h–12h)',    emoji: '☀️' },
      { valor: 'almoco',      label: 'Hora do almoço (12h–14h)',   emoji: '🌤' },
      { valor: 'tarde',       label: 'Tarde (14h–18h)',            emoji: '🌇' },
      { valor: 'noite',       label: 'Noite (após 18h)',           emoji: '🌙' },
      { valor: 'nao_treina',  label: 'Não treino regularmente',    emoji: '😴' },
    ],
  },
  {
    id: 'desafio',
    pergunta: 'Qual seu maior desafio com alimentação?',
    subtitulo: 'Seja honesto — vamos trabalhar em cima disso',
    tipo: 'single',
    opcoes: [
      { valor: 'fome_ansiosa', label: 'Fome excessiva / compulsão',       emoji: '😤' },
      { valor: 'consistencia', label: 'Falta de consistência / disciplina', emoji: '📉' },
      { valor: 'tempo',        label: 'Falta de tempo para preparar',      emoji: '⏰' },
      { valor: 'proteina',     label: 'Dificuldade em consumir proteína',  emoji: '🥩' },
      { valor: 'noite',        label: 'Como muito à noite',                emoji: '🌙' },
      { valor: 'social',       label: 'Dificuldade em situações sociais',  emoji: '🍺' },
    ],
  },
  {
    id: 'restricoes',
    pergunta: 'Tem alguma restrição alimentar?',
    subtitulo: 'Selecione todas que se aplicam',
    tipo: 'multi',
    temCampoLivre: true,
    valorGatilho: 'alergias',
    opcoes: [
      { valor: 'nenhuma',     label: 'Nenhuma',                    emoji: '✅' },
      { valor: 'lactose',     label: 'Intolerância à lactose',     emoji: '🥛' },
      { valor: 'gluten',      label: 'Intolerância ao glúten',     emoji: '🌾' },
      { valor: 'vegetariano', label: 'Vegetariano',                emoji: '🥦' },
      { valor: 'vegano',      label: 'Vegano',                     emoji: '🌱' },
      { valor: 'alergias',    label: 'Alergias — descrever →',     emoji: '⚠️' },
    ],
  },
  {
    id: 'rotina_trabalho',
    pergunta: 'Como é sua rotina de trabalho?',
    subtitulo: 'Impacta nos horários e qualidade das refeições',
    tipo: 'single',
    opcoes: [
      { valor: 'home_office',    label: 'Home office / em casa',              emoji: '🏠' },
      { valor: 'presencial_fixo', label: 'Presencial com horário fixo',       emoji: '🏢' },
      { valor: 'presencial_var',  label: 'Presencial com horários variáveis', emoji: '🔄' },
      { valor: 'fisico',          label: 'Trabalho físico / operacional',     emoji: '⚒️' },
      { valor: 'nao_trabalha',    label: 'Estudante / não trabalho',          emoji: '📚' },
    ],
  },
  {
    id: 'alcool',
    pergunta: 'Com que frequência consome bebidas alcoólicas?',
    subtitulo: 'Sem julgamentos — impacta calorias e recuperação',
    tipo: 'single',
    opcoes: [
      { valor: 'nunca',       label: 'Nunca ou raramente',        emoji: '🚫' },
      { valor: 'ocasional',   label: 'Ocasionalmente (1–2x/mês)', emoji: '🥂' },
      { valor: 'semanal',     label: 'Toda semana',              emoji: '🍺' },
      { valor: 'varios_dias', label: 'Vários dias na semana',    emoji: '⚠️' },
    ],
  },
  {
    id: 'fome_horario',
    pergunta: 'Em qual período você sente mais fome ou vontade de beliscar?',
    subtitulo: 'Vamos reforçar esse período com opções estratégicas',
    tipo: 'single',
    opcoes: [
      { valor: 'manha',  label: 'Manhã',               emoji: '🌅' },
      { valor: 'almoco', label: 'Após o almoço',       emoji: '☀️' },
      { valor: 'tarde',  label: 'Tarde (15h–18h)',     emoji: '🌇' },
      { valor: 'noite',  label: 'Noite / após jantar', emoji: '🌙' },
      { valor: 'sempre', label: 'O tempo todo',        emoji: '😅' },
    ],
  },
  {
    id: 'observacoes_nutricionista',
    pergunta: 'Algo que a nutricionista precisa saber?',
    subtitulo: 'Este campo é muito importante — seja específico',
    tipo: 'texto',
    placeholder: 'Ex: "Estou grávida de 20 semanas", "tenho diabetes tipo 2", "faço uso de metformina", "tenho histórico de distúrbio alimentar", "quero ganhar 5kg em 3 meses", "não consigo comer antes das 10h"...',
    obrigatorio: false,
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
  const [camposLivres, setCamposLivres] = useState<Record<string, string>>({})
  const [animando, setAnimando] = useState(false)

  const pergunta = perguntas[stepAtual]
  const total = perguntas.length
  const progresso = ((stepAtual) / total) * 100

  const respostaAtual = respostas[pergunta.id]
  const campoLivreAtual = camposLivres[pergunta.id] ?? ''

  const mostrarCampoLivre = pergunta.temCampoLivre && pergunta.valorGatilho &&
    (Array.isArray(respostaAtual)
      ? respostaAtual.includes(pergunta.valorGatilho)
      : respostaAtual === pergunta.valorGatilho)

  const temResposta = (() => {
    if (pergunta.tipo === 'texto') {
      return pergunta.obrigatorio === false ? true : !!respostaAtual
    }
    if (Array.isArray(respostaAtual)) return respostaAtual.length > 0
    return !!respostaAtual
  })()

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

    // Mescla campo livre na resposta se houver
    const respostasFinal = { ...respostas }
    if (pergunta.tipo === 'texto') {
      respostasFinal[pergunta.id] = campoLivreAtual || 'Nenhuma observação'
    } else if (mostrarCampoLivre && campoLivreAtual) {
      const chave = `${pergunta.id}_detalhe`
      respostasFinal[chave] = campoLivreAtual
    }

    if (stepAtual === total - 1) {
      onConcluir(respostasFinal)
      return
    }
    setRespostas(respostasFinal)
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

  const cor = tipo === 'treino' ? {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    barra: 'bg-emerald-400',
    btn: 'bg-emerald-500 text-black',
    selectedBg: 'bg-emerald-500/15',
    selectedBorder: 'border-emerald-500/40',
    selectedText: 'text-emerald-400',
    check: 'border-emerald-400 bg-emerald-400',
    input: 'focus:border-emerald-500/40',
  } : {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    barra: 'bg-blue-400',
    btn: 'bg-blue-500 text-white',
    selectedBg: 'bg-blue-500/15',
    selectedBorder: 'border-blue-500/40',
    selectedText: 'text-blue-400',
    check: 'border-blue-400 bg-blue-400',
    input: 'focus:border-blue-500/40',
  }

  return (
    <main className="min-h-[100dvh] bg-[#0d1117] text-white flex flex-col">

      {/* Header */}
      <div className="shrink-0 px-4 pt-12 pb-4" style={{ background: 'rgba(8,8,8,0.97)' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={voltar} className="text-zinc-600 text-[10px] uppercase tracking-widest hover:text-zinc-400 transition-colors active:scale-95">
              ← {stepAtual === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">{stepAtual + 1} de {total}</p>
          </div>
          <div className="h-1 bg-white/[0.09] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${cor.barra}`}
              style={{ width: `${progresso + (100 / total)}%` }} />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">

          <div className="mb-8"
            style={{ opacity: animando ? 0 : 1, transform: animando ? 'translateY(8px)' : 'translateY(0)', transition: 'all 0.25s ease' }}>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 border ${cor.border} ${cor.bg}`}>
              <span className={`text-[10px] uppercase tracking-[0.15em] font-semibold ${cor.text}`}>
                {tipo === 'treino' ? '✦ Consultoria de treino' : '✦ Consultoria nutricional'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight mb-2">{pergunta.pergunta}</h2>
            {pergunta.subtitulo && <p className="text-zinc-500 text-sm leading-relaxed">{pergunta.subtitulo}</p>}
            {pergunta.tipo === 'multi' && pergunta.maxSelecoes && (
              <p className={`text-xs mt-2 ${cor.text}`}>Selecione até {pergunta.maxSelecoes}</p>
            )}
            {pergunta.tipo === 'multi' && !pergunta.maxSelecoes && (
              <p className={`text-xs mt-2 ${cor.text}`}>Pode selecionar mais de uma</p>
            )}
          </div>

          <div className="space-y-2"
            style={{ opacity: animando ? 0 : 1, transform: animando ? 'translateY(12px)' : 'translateY(0)', transition: 'all 0.25s ease 0.05s' }}>

            {/* Pergunta de texto livre */}
            {pergunta.tipo === 'texto' && (
              <div>
                <textarea
                  value={campoLivreAtual}
                  onChange={e => setCamposLivres(p => ({ ...p, [pergunta.id]: e.target.value }))}
                  placeholder={pergunta.placeholder}
                  rows={5}
                  className={`w-full bg-white/[0.07] border border-white/[0.14] rounded-2xl px-4 py-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed ${cor.input} transition-colors`}
                />
                {pergunta.obrigatorio === false && (
                  <p className="text-zinc-700 text-[10px] mt-2 text-center">Campo opcional — mas quanto mais detalhe, melhor o plano</p>
                )}
              </div>
            )}

            {/* Opções múltipla escolha */}
            {pergunta.opcoes?.map((op) => {
              const sel = isSelected(op.valor)
              return (
                <button key={op.valor} onClick={() => selecionarOpcao(op.valor)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left ${
                    sel ? `${cor.selectedBg} ${cor.selectedBorder}` : 'bg-white/[0.02] border-white/[0.11] hover:border-white/[0.12]'
                  }`}>
                  {op.emoji && <span className="text-2xl shrink-0">{op.emoji}</span>}
                  <span className={`font-semibold text-sm flex-1 ${sel ? cor.selectedText : 'text-zinc-300'}`}>{op.label}</span>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${sel ? cor.check : 'border-white/[0.15]'}`}>
                    {sel && <span className="text-black text-[10px] font-black">✓</span>}
                  </div>
                </button>
              )
            })}

            {/* Campo livre quando seleciona "outro" ou "alergias" */}
            {mostrarCampoLivre && (
              <div className="mt-2">
                <textarea
                  value={campoLivreAtual}
                  onChange={e => setCamposLivres(p => ({ ...p, [pergunta.id]: e.target.value }))}
                  placeholder={
                    pergunta.valorGatilho === 'alergias'
                      ? 'Descreva suas alergias alimentares (ex: amendoim, frutos do mar, ovo...)'
                      : 'Descreva sua limitação ou lesão com detalhes...'
                  }
                  rows={3}
                  className={`w-full bg-white/[0.07] border border-white/[0.14] rounded-2xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none resize-none ${cor.input} transition-colors`}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-4 border-t border-white/[0.14]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)', background: 'rgba(8,8,8,0.97)' }}>
        <div className="max-w-md mx-auto">
          <button onClick={avancar} disabled={!temResposta || animando}
            className={`w-full font-bold py-4 rounded-2xl text-sm active:scale-95 disabled:opacity-30 transition-all tracking-wide ${
              temResposta ? cor.btn : 'bg-white/[0.09] text-zinc-600 border border-white/[0.14]'
            }`}>
            {stepAtual === total - 1 ? '✦ Gerar meu plano personalizado' : 'Próximo →'}
          </button>
        </div>
      </div>
    </main>
  )
}