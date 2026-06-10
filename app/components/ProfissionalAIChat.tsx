'use client'

import { useState, useEffect, useRef } from 'react'

type Mensagem = { role: 'user' | 'assistant'; content: string }

export type ContextoProfissional = {
  profissionalTipo: 'personal' | 'nutricionista'
  profissionalNome: string | null
  paciente: {
    nome: string | null
    peso: number | null
    altura: number | null
    objetivo: string | null
    nivel: string | null
    metaPeso: number | null
    metaDataLimite: string | null
    fcmax: number | null
    ftp: number | null
  }
  alertasClinicos: {
    lesoes: string | null
    restricoesFisicas: string | null
    medicamentos: string | null
    alergias?: string | null
    restricoesAlimentares?: string | null
  }
  treinamento?: {
    treinosSemana: number
    diasSemTreinar: number | null
    scoreRecuperacaoHoje: number | null
    sonoHorasHoje: number | null
    exerciciosMaxCarga: { nome: string; maxCarga: number; sessoes: number }[]
    planos?: { plano: string; nome: string; exercicios: { nome: string; series: number; repeticoes: number; carga: number | null; observacoes: string }[] }[]
    periodizacaoFase?: string | null
    atividadesSemana?: { data: string; modalidade: string; duracao_min: number | null; distancia_km?: number | null; calorias: number | null }[]
  } | null
  nutricao?: {
    caloriasPrescritas: number | null
    proteinaPrescritas: number | null
    caloriasSemanaisGastas: number | null
    treinosSemana: number
    periodizacao: string | null
    atividadesSemana?: { data: string; modalidade: string; duracao_min: number | null; distancia_km?: number | null; calorias: number | null }[]
  } | null
  composicao?: {
    ultimoPeso: number | null
    gorduraPct: number | null
    massaMuscular: number | null
    data: string | null
  } | null
  ultimaAvaliacao: string | null
  proximaConsulta?: { data: string; hora: string | null; tipo: string | null } | null
  anamneseCompleta?: Record<string, any> | null
  sono?: {
    hoje: { score: number | null; duracaoMin: number | null } | null
    historico7d: { data: string; score: number | null; duracaoMin: number | null }[]
  } | null
  bemEstarHoje?: { humor: number | null; energia: number | null; dorMuscular: number | null; notas: string | null } | null
  planoAlimentar?: {
    calorias: number | null
    proteina: number | null
    refeicoes: { nome: string; horario: string; calorias: number; proteina: number; alimentos: string[] }[]
    suplementos: string[]
    hidratacao: string | null
    orientacaoTreino: string | null
    observacoes: string | null
  } | null
  treinosRegistrados?: { data: string; nome: string; calorias: number | null; volume: number; exercicios: string[] }[]
  medidasHistorico?: { data: string | null; peso: number | null; gorduraPct: number | null; massaMuscular: number | null }[]
  historicoCompleto?: {
    atividades: { data: string; modalidade: string; duracao_min: number; distancia_km: number | null; calorias: number | null }[]
    treinos: { data: string; nome: string; calorias: number | null; exercicios: string[] }[]
    sono: { data: string; score: number | null; duracao_min: number | null }[]
  } | null
  fcmaxEstimado?: number | null
  cargaInternaSemanas?: { label: string; carga: number; atual: boolean }[] | null
  distModalidade28d?: { tipo: string; count: number; pct: number }[] | null
}

const TERMOS_IRRELEVANTES = /^(nenhum[ao]?|nada|não|nao|sem|ok|okay|oke?|n\/a|-)$/i
function filtrarAlerta(val: string | null): string | null {
  if (!val) return null
  const partes = val.split(/\s*[·,]\s*/).map(v => v.trim()).filter(v => v && !TERMOS_IRRELEVANTES.test(v))
  return partes.length ? partes.join(' · ') : null
}

function formatAnamnese(a: Record<string, any> | null | undefined): string | null {
  if (!a) return null
  const linhas: (string | false | null)[] = [
    a.objetivo_detalhado && `Objetivo detalhado: ${a.objetivo_detalhado}`,
    a.motivacao && `Motivação: ${a.motivacao}`,
    a.prazo_semanas && `Prazo desejado: ${a.prazo_semanas} semanas`,
    a.nivel_atividade && `Nível de atividade: ${a.nivel_atividade}`,
    a.historico_esportivo && `Histórico esportivo: ${a.historico_esportivo}`,
    a.patologias && `Patologias: ${a.patologias}`,
    a.cirurgias && `Cirurgias: ${a.cirurgias}`,
    a.historico_familiar && `Histórico familiar: ${a.historico_familiar}`,
    a.suplementos && `Suplementos em uso: ${a.suplementos}`,
    a.intolerancias && `Intolerâncias: ${a.intolerancias}`,
    a.preferencias_alimentares && `Preferências alimentares: ${a.preferencias_alimentares}`,
    a.aversoes_alimentares && `Aversões alimentares: ${a.aversoes_alimentares}`,
    a.habitos_alimentares && `Hábitos alimentares: ${a.habitos_alimentares}`,
    a.refeicoes_por_dia && `Refeições por dia (relatado): ${a.refeicoes_por_dia}`,
    a.horarios_refeicoes && `Horários das refeições: ${a.horarios_refeicoes}`,
    a.onde_come && `Onde costuma comer: ${a.onde_come}`,
    a.quem_prepara && `Quem prepara as refeições: ${a.quem_prepara}`,
    a.consumo_agua_litros && `Consumo de água: ${a.consumo_agua_litros}L/dia`,
    a.consumo_ultraprocessados && `Consumo de ultraprocessados: ${a.consumo_ultraprocessados}`,
    a.funcionamento_intestinal && `Funcionamento intestinal: ${a.funcionamento_intestinal}`,
    a.horas_sono && `Horas de sono (relatado): ${a.horas_sono}h`,
    a.qualidade_sono && `Qualidade do sono (relatado): ${a.qualidade_sono}`,
    a.nivel_estresse && `Nível de estresse: ${a.nivel_estresse}/10`,
    a.fuma != null && `Fumante: ${a.fuma ? 'sim' : 'não'}`,
    a.alcool && `Consumo de álcool: ${a.alcool}`,
    a.rotina_trabalho && `Rotina de trabalho: ${a.rotina_trabalho}`,
    a.profissao && `Profissão: ${a.profissao}`,
    a.modalidade_treino && `Modalidade de treino preferida: ${a.modalidade_treino}`,
    a.frequencia_treino && `Frequência de treino (relatado): ${a.frequencia_treino}`,
    a.horario_treino && `Horário de treino preferido: ${a.horario_treino}`,
    a.peso_maximo && `Peso máximo já registrado: ${a.peso_maximo}kg`,
    a.peso_minimo && `Peso mínimo já registrado: ${a.peso_minimo}kg`,
    a.peso_habitual && `Peso habitual: ${a.peso_habitual}kg`,
    a.efeito_sanfona != null && `Efeito sanfona relatado: ${a.efeito_sanfona ? 'sim' : 'não'}`,
    a.tentativas_emagrecimento && `Tentativas anteriores de emagrecimento: ${a.tentativas_emagrecimento}`,
    a.exames_laboratoriais && `Exames laboratoriais relevantes: ${a.exames_laboratoriais}`,
    a.ciclo_regular != null && `Ciclo regular: ${a.ciclo_regular ? 'sim' : 'não'}`,
    a.fase_ciclo && `Fase do ciclo: ${a.fase_ciclo}`,
    a.sintomas_ciclo && `Sintomas do ciclo: ${a.sintomas_ciclo}`,
    a.observacoes && `Observações gerais: ${a.observacoes}`,
  ]
  const texto = linhas.filter(Boolean).join('\n')
  return texto || null
}

function buildSystemPrompt(ctx: ContextoProfissional): string {
  const tipo = ctx.profissionalTipo === 'personal' ? 'Personal Trainer' : 'Nutricionista'
  const pacNome = ctx.paciente.nome ?? 'paciente'
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const lesoesFiltradas = filtrarAlerta(ctx.alertasClinicos.lesoes)
  const rfFiltradas = filtrarAlerta(ctx.alertasClinicos.restricoesFisicas)
  const medsFiltrados = filtrarAlerta(ctx.alertasClinicos.medicamentos)
  const alergiasFiltradas = filtrarAlerta(ctx.alertasClinicos.alergias ?? null)
  const restAlimFiltradas = filtrarAlerta(ctx.alertasClinicos.restricoesAlimentares ?? null)
  const alertas = [
    lesoesFiltradas && `Lesões: ${lesoesFiltradas}`,
    rfFiltradas && `Restrições físicas: ${rfFiltradas}`,
    medsFiltrados && `Medicamentos: ${medsFiltrados}`,
    alergiasFiltradas && `Alergias: ${alergiasFiltradas}`,
    restAlimFiltradas && `Restrições alimentares: ${restAlimFiltradas}`,
  ].filter(Boolean).join('\n') || 'Nenhum alerta clínico registrado'

  const composicao = ctx.composicao?.ultimoPeso
    ? `Última medição (${ctx.composicao.data ?? '?'}): ${ctx.composicao.ultimoPeso}kg | gordura ${ctx.composicao.gorduraPct ?? '?'}% | massa muscular ${ctx.composicao.massaMuscular ?? '?'}kg`
    : 'Sem medições registradas'

  let dadosEspecificos = ''
  if (ctx.profissionalTipo === 'personal' && ctx.treinamento) {
    const ex = ctx.treinamento.exerciciosMaxCarga.slice(0, 6)
      .map(e => `${e.nome}(${e.sessoes}x, ${e.maxCarga}kg)`).join(', ') || 'sem dados'

    let planosTexto = ''
    if (ctx.treinamento.planos?.length) {
      planosTexto = '\n\nPLANOS DE TREINO PRESCRITOS:\n' + ctx.treinamento.planos.map(p =>
        `Plano ${p.plano} — ${p.nome}:\n` +
        p.exercicios.map(e =>
          `  • ${e.nome}: ${e.series}x${e.repeticoes}${e.carga ? ` @ ${e.carga}kg` : ''}${e.observacoes ? ` (${e.observacoes})` : ''}`
        ).join('\n')
      ).join('\n\n')
    }

    let atividadesPersonalTexto = ''
    if (ctx.treinamento.atividadesSemana?.length) {
      atividadesPersonalTexto = '\n\nATIVIDADES DESTA SEMANA:\n' + ctx.treinamento.atividadesSemana.map(a => {
        const dataFmt = new Date(a.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
        const dur = a.duracao_min ? `${a.duracao_min}min` : '?'
        const dist = a.distancia_km ? ` · ${a.distancia_km}km` : ''
        const cal = a.calorias ? ` · ${a.calorias} kcal` : ''
        return `- ${dataFmt}: ${a.modalidade} (${dur}${dist}${cal})`
      }).join('\n')
    }

    dadosEspecificos = `
DADOS DE TREINO:
- Treinos esta semana: ${ctx.treinamento.treinosSemana}
- Dias sem treinar: ${ctx.treinamento.diasSemTreinar ?? '?'}
- Score de recuperação hoje: ${ctx.treinamento.scoreRecuperacaoHoje ? `${ctx.treinamento.scoreRecuperacaoHoje}/100` : 'não registrado'}
- Sono hoje: ${ctx.treinamento.sonoHorasHoje ? `${ctx.treinamento.sonoHorasHoje}h` : 'não registrado'}
- Principais cargas históricas: ${ex}
- Fase de periodização atual: ${ctx.treinamento.periodizacaoFase ?? 'não configurada'}${planosTexto}${atividadesPersonalTexto}`
  }

  if (ctx.profissionalTipo === 'nutricionista' && ctx.nutricao) {
    let atividadesTexto = ''
    if (ctx.nutricao.atividadesSemana?.length) {
      atividadesTexto = '\n\nATIVIDADES DESTA SEMANA (detalhado):\n' + ctx.nutricao.atividadesSemana.map(a => {
        const dataFmt = new Date(a.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
        const dur = a.duracao_min ? `${a.duracao_min}min` : '?min'
        const dist = a.distancia_km ? ` · ${a.distancia_km}km` : ''
        const cal = a.calorias ? ` · ${a.calorias} kcal` : ' · sem calorias'
        return `- ${dataFmt}: ${a.modalidade} (${dur}${dist}${cal})`
      }).join('\n')
    }

    dadosEspecificos = `
DADOS NUTRICIONAIS:
- Plano atual: ${ctx.nutricao.caloriasPrescritas ?? '?'} kcal/dia | proteína ${ctx.nutricao.proteinaPrescritas ?? '?'}g
- Atividades esta semana: ${ctx.nutricao.treinosSemana} sessões
- Calorias gastas nos treinos esta semana: ${ctx.nutricao.caloriasSemanaisGastas ? `${ctx.nutricao.caloriasSemanaisGastas} kcal` : 'sem dados'}
- Fase de periodização: ${ctx.nutricao.periodizacao ?? 'não configurada'}${atividadesTexto}`
  }

  let secoesAdicionais = ''

  const anamneseTexto = formatAnamnese(ctx.anamneseCompleta)
  if (anamneseTexto) {
    secoesAdicionais += `\n\nANAMNESE / HISTÓRICO CLÍNICO COMPLETO:\n${anamneseTexto}`
  }

  if (ctx.sono) {
    const hojeSono = ctx.sono.hoje
      ? `Score ${ctx.sono.hoje.score ?? '?'}/100${ctx.sono.hoje.duracaoMin ? ` · ${(ctx.sono.hoje.duracaoMin / 60).toFixed(1)}h` : ''}`
      : 'sem registro hoje'
    let historicoTexto = ''
    if (ctx.sono.historico7d?.length) {
      historicoTexto = '\n' + ctx.sono.historico7d.map(s => {
        const dataFmt = new Date(s.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
        const dur = s.duracaoMin ? `${(s.duracaoMin / 60).toFixed(1)}h` : '?'
        return `- ${dataFmt}: score ${s.score ?? '?'}/100 · ${dur}`
      }).join('\n')
    }
    secoesAdicionais += `\n\nSONO E RECUPERAÇÃO:\nHoje: ${hojeSono}${historicoTexto}`
  }

  if (ctx.bemEstarHoje) {
    const b = ctx.bemEstarHoje
    secoesAdicionais += `\n\nBEM-ESTAR HOJE:\nHumor ${b.humor ?? '?'}/10 · Energia ${b.energia ?? '?'}/10 · Dor muscular ${b.dorMuscular ?? '?'}/10${b.notas ? ` · Notas: ${b.notas}` : ''}`
  }

  if (ctx.planoAlimentar) {
    const pa = ctx.planoAlimentar
    let refeicoesTexto = ''
    if (pa.refeicoes?.length) {
      refeicoesTexto = '\n' + pa.refeicoes.map(r =>
        `- ${r.nome} (${r.horario}): ${r.calorias} kcal · ${r.proteina}g proteína${r.alimentos?.length ? ` — ${r.alimentos.join(', ')}` : ''}`
      ).join('\n')
    }
    const supTexto = pa.suplementos?.length ? `\nSuplementos prescritos: ${pa.suplementos.join(', ')}` : ''
    const hidTexto = pa.hidratacao ? `\nHidratação: ${pa.hidratacao}` : ''
    const orientTexto = pa.orientacaoTreino ? `\nOrientação para treino: ${pa.orientacaoTreino}` : ''
    const obsTexto = pa.observacoes ? `\nObservações da nutricionista: ${pa.observacoes}` : ''
    secoesAdicionais += `\n\nPLANO ALIMENTAR PRESCRITO (${pa.calorias ?? '?'} kcal/dia · ${pa.proteina ?? '?'}g proteína):${refeicoesTexto}${supTexto}${hidTexto}${orientTexto}${obsTexto}`
  }

  if (ctx.treinosRegistrados?.length) {
    secoesAdicionais += '\n\nTREINOS REGISTRADOS (últimos 30 dias):\n' + ctx.treinosRegistrados.slice(0, 12).map(t => {
      const dataFmt = new Date(t.data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
      const cal = t.calorias ? ` · ${t.calorias} kcal` : ''
      const exs = t.exercicios?.length ? ` — ${t.exercicios.slice(0, 5).join(', ')}` : ''
      return `- ${dataFmt}: ${t.nome}${cal} · volume ${t.volume}kg${exs}`
    }).join('\n')
  }

  if (ctx.medidasHistorico?.length) {
    secoesAdicionais += '\n\nEVOLUÇÃO DE MEDIDAS:\n' + ctx.medidasHistorico.slice(0, 8).map(m => {
      const dataFmt = m.data ? new Date(m.data).toLocaleDateString('pt-BR') : '?'
      return `- ${dataFmt}: ${m.peso ?? '?'}kg · gordura ${m.gorduraPct ?? '?'}% · massa muscular ${m.massaMuscular ?? '?'}kg`
    }).join('\n')
  }

  if (ctx.historicoCompleto) {
    const atsByMonth: Record<string, { count: number; min: number; kcal: number }> = {}
    ctx.historicoCompleto.atividades.forEach(a => {
      const mes = a.data.slice(0, 7)
      if (!atsByMonth[mes]) atsByMonth[mes] = { count: 0, min: 0, kcal: 0 }
      atsByMonth[mes].count++
      atsByMonth[mes].min += a.duracao_min ?? 0
      atsByMonth[mes].kcal += a.calorias ?? 0
    })
    const atsLinhas = Object.entries(atsByMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, v]) => {
        const nomeMes = new Date(mes + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        const horas = v.min >= 60 ? `${(v.min / 60).toFixed(1)}h` : `${v.min}min`
        return `- ${nomeMes}/${mes.slice(2, 4)}: ${v.count} atividades · ${horas}${v.kcal > 0 ? ` · ${v.kcal} kcal` : ''}`
      }).join('\n')

    const trByMonth: Record<string, number> = {}
    ctx.historicoCompleto.treinos.forEach(t => { trByMonth[t.data.slice(0, 7)] = (trByMonth[t.data.slice(0, 7)] ?? 0) + 1 })
    const trLinhas = Object.entries(trByMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, n]) => {
        const nomeMes = new Date(mes + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        return `- ${nomeMes}/${mes.slice(2, 4)}: ${n} treinos`
      }).join('\n')

    const sonoComScore = ctx.historicoCompleto.sono.filter(s => s.score !== null)
    const mediaScore = sonoComScore.length
      ? Math.round(sonoComScore.reduce((s, r) => s + (r.score ?? 0), 0) / sonoComScore.length)
      : null
    const sonoComDur = ctx.historicoCompleto.sono.filter(s => s.duracao_min !== null)
    const mediaDur = sonoComDur.length
      ? Math.round(sonoComDur.reduce((s, r) => s + (r.duracao_min ?? 0), 0) / sonoComDur.length)
      : null

    if (atsLinhas) secoesAdicionais += `\n\nHISTÓRICO COMPLETO — ATIVIDADES LIVRES (6 meses):\n${atsLinhas}`
    if (trLinhas) secoesAdicionais += `\n\nHISTÓRICO COMPLETO — TREINOS DE MUSCULAÇÃO (6 meses):\n${trLinhas}`
    if (mediaScore !== null || mediaDur !== null) {
      secoesAdicionais += `\n\nHISTÓRICO DE SONO (últimos 6 meses):\nScore médio: ${mediaScore ?? '?'}/100 · Duração média: ${mediaDur !== null ? (mediaDur / 60).toFixed(1) + 'h' : '?'} · ${sonoComScore.length} noites registradas`
    }
  }

  if (ctx.proximaConsulta) {
    const dataFmtConsulta = new Date(ctx.proximaConsulta.data).toLocaleDateString('pt-BR')
    secoesAdicionais += `\n\nPRÓXIMA CONSULTA AGENDADA: ${dataFmtConsulta}${ctx.proximaConsulta.hora ? ` às ${ctx.proximaConsulta.hora}` : ''}${ctx.proximaConsulta.tipo ? ` (${ctx.proximaConsulta.tipo})` : ''}`
  }

  if (ctx.fcmaxEstimado) {
    secoesAdicionais += `\n\nFC MÁXIMA ESTIMADA: ${ctx.fcmaxEstimado} bpm (base para cálculo de zonas)`
  }

  if (ctx.cargaInternaSemanas?.length) {
    secoesAdicionais += '\n\nCARGA INTERNA SEMANAL (FC% × minutos):\n' + ctx.cargaInternaSemanas.map(s =>
      `${s.label}: ${s.carga}`
    ).join('\n')
  }

  if (ctx.distModalidade28d?.length) {
    secoesAdicionais += '\n\nDISTRIBUIÇÃO DE MODALIDADES (últimos 28 dias):\n' + ctx.distModalidade28d.map(d =>
      `${d.tipo}: ${d.pct}% (${d.count} sessões)`
    ).join('\n')
  }

  return `Você é o KORE AI — assistente clínico integrado ao perfil de ${pacNome} para uso exclusivo do ${tipo} ${ctx.profissionalNome ?? ''}.

Você não é um chatbot genérico. Você conhece os dados reais deste paciente/aluno e responde como consultor clínico especializado que está ao lado do profissional durante uma consulta ou montagem de plano.

REGRAS:
- Respostas curtas e diretas (máximo 3 parágrafos)
- Sem markdown, sem asteriscos, sem bullet points, sem listas numeradas
- Use o nome ${pacNome} naturalmente
- Sempre considere os alertas clínicos em todas as recomendações
- Foque em insights práticos e acionáveis para o profissional
- Contexto: ${hoje}

PERFIL DO PACIENTE/ALUNO:
- Nome: ${pacNome} | Objetivo: ${ctx.paciente.objetivo ?? '?'}
- Peso: ${ctx.paciente.peso ? `${ctx.paciente.peso}kg` : '?'} | Altura: ${ctx.paciente.altura ? `${ctx.paciente.altura}cm` : '?'}
- Nível: ${ctx.paciente.nivel ?? '?'} | FC máx: ${ctx.paciente.fcmax ? `${ctx.paciente.fcmax}bpm` : '?'} | FTP: ${ctx.paciente.ftp ? `${ctx.paciente.ftp}W` : '?'}
- Meta: ${ctx.paciente.metaPeso ? `${ctx.paciente.metaPeso}kg` : '?'} ${ctx.paciente.metaDataLimite ? `até ${new Date(ctx.paciente.metaDataLimite).toLocaleDateString('pt-BR')}` : ''}
- Última avaliação: ${ctx.ultimaAvaliacao ? new Date(ctx.ultimaAvaliacao).toLocaleDateString('pt-BR') : 'nunca'}

ALERTAS CLÍNICOS (SEMPRE CONSIDERE):
${alertas}

COMPOSIÇÃO CORPORAL:
${composicao}
${dadosEspecificos}${secoesAdicionais}`
}

function KoreIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const SUGESTOES: Record<'personal' | 'nutricionista', string[]> = {
  personal: [
    'Pode treinar pesado hoje?',
    'Análise de carga esta semana',
    'Exercício seguro para as lesões',
    'Progresso em relação à meta',
    'Ajuste no plano dessa semana',
  ],
  nutricionista: [
    'Ajuste calórico pelos treinos',
    'Adequação do plano à periodização',
    'Sugestões para as restrições',
    'Resumo clínico para consulta',
    'Meta realista para o prazo',
  ],
}

export default function ProfissionalAIChat({ contexto, pacienteId }: { contexto: ContextoProfissional; pacienteId?: string }) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [profId, setProfId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isPersonal = contexto.profissionalTipo === 'personal'

  // Chave única por profissional + paciente
  const storageKey = profId && pacienteId ? `kore_chat_prof_${profId}_${pacienteId}` : null

  // Carregar profId + histórico ao montar
  useEffect(() => {
    async function init() {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setProfId(session.user.id)
      const key = `kore_chat_prof_${session.user.id}_${pacienteId}`
      try {
        const saved = localStorage.getItem(key)
        if (saved) {
          const hist: Mensagem[] = JSON.parse(saved)
          if (hist.length > 0) setMensagens(hist)
        }
      } catch {}
    }
    if (pacienteId) init()
  }, [pacienteId])
  const corClass = {
    btn: isPersonal ? 'bg-blue-500' : 'bg-emerald-500',
    shadow: isPersonal ? '0 4px 20px rgba(59,130,246,0.45)' : '0 4px 20px rgba(16,185,129,0.45)',
    pulse: isPersonal ? 'bg-blue-400' : 'bg-emerald-400',
    iconBg: isPersonal ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20',
    iconText: isPersonal ? 'text-blue-400' : 'text-emerald-400',
    label: isPersonal ? 'text-blue-400' : 'text-emerald-400',
    focus: isPersonal ? 'focus:border-blue-500/40' : 'focus:border-emerald-500/40',
    sugestao: isPersonal
      ? 'hover:border-blue-500/40 hover:text-blue-400'
      : 'hover:border-emerald-500/40 hover:text-emerald-400',
  }

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      const nome = contexto.paciente.nome?.split(' ')[0] ?? 'paciente'
      const tipoLabel = isPersonal ? 'aluno' : 'paciente'
      let boasVindas = `Pronto para ajudar com ${nome}. `
      if (isPersonal && contexto.treinamento?.scoreRecuperacaoHoje) {
        const score = contexto.treinamento.scoreRecuperacaoHoje
        boasVindas += `Score de recuperação hoje: ${score}/100 — ${score >= 80 ? 'excelente, pode ir com tudo.' : score >= 60 ? 'boa recuperação.' : 'baixo, considere moderar a intensidade.'}`
      } else if (!isPersonal && contexto.nutricao) {
        boasVindas += `Plano atual: ${contexto.nutricao.caloriasPrescritas ?? '?'} kcal, ${contexto.nutricao.treinosSemana} treinos esta semana. O que quer analisar?`
      } else {
        boasVindas += `O que quer analisar sobre este ${tipoLabel}?`
      }
      const inicial: Mensagem[] = [{ role: 'assistant', content: boasVindas }]
      setMensagens(inicial)
      if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(inicial)) } catch {} }
    }
    if (aberto) setTimeout(() => inputRef.current?.focus(), 300)
  }, [aberto])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  function salvarHistorico(msgs: Mensagem[]) {
    const key = storageKey
    if (!key) return
    try {
      // Manter últimas 50 mensagens
      const trimmed = msgs.slice(-50)
      localStorage.setItem(key, JSON.stringify(trimmed))
    } catch {}
  }

  async function enviarMensagem(textoOverride?: string) {
    const texto = (textoOverride ?? input).trim()
    if (!texto || enviando) return
    const novaMensagem: Mensagem = { role: 'user', content: texto }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    salvarHistorico(novasMensagens)
    setInput('')
    setEnviando(true)
    try {
      const res = await fetch('/api/kore-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novasMensagens, systemPrompt: buildSystemPrompt(contexto), usuarioId: profId }),
      })
      const data = await res.json()
      const resposta = data.resposta ?? 'Erro ao processar.'
      const comResposta = [...novasMensagens, { role: 'assistant' as const, content: resposta }]
      setMensagens(comResposta)
      salvarHistorico(comResposta)
    } catch {
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    }
    setEnviando(false)
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        className={`fixed z-40 transition-all duration-300 ${aberto ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)', right: '12px' }}>
        <div className={`w-11 h-11 rounded-2xl ${corClass.btn} flex items-center justify-center active:scale-90 transition-all`}
          style={{ boxShadow: corClass.shadow }}>
          <KoreIcon size={18} className="text-white" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center">
          <div className={`w-1.5 h-1.5 rounded-full ${corClass.pulse} animate-pulse`} />
        </div>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row md:justify-end"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="bg-[#141414] flex flex-col w-full h-full md:w-[580px] md:rounded-l-3xl md:border-l md:border-white/[0.11]">

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.11] shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${corClass.iconBg} border flex items-center justify-center shrink-0`}>
                  <KoreIcon size={18} className={corClass.iconText} />
                </div>
                <div>
                  <p className="text-white font-black text-base md:text-lg">KORE AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${corClass.pulse} animate-pulse`} />
                    <p className={`${corClass.label} text-[11px] md:text-xs uppercase tracking-wider`}>
                      {contexto.paciente.nome ?? 'Paciente'} · Assistente clínico
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mensagens.length > 1 && (
                  <button onClick={() => {
                    setMensagens([])
                    if (storageKey) { try { localStorage.removeItem(storageKey) } catch {} }
                  }} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1">
                    Limpar
                  </button>
                )}
                <button onClick={() => setAberto(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.09] flex items-center justify-center text-zinc-500 hover:text-white active:scale-90 transition-all text-sm">✕</button>
              </div>
            </div>

            {(() => {
              const alertasVisiveis = [
                filtrarAlerta(contexto.alertasClinicos.lesoes),
                filtrarAlerta(contexto.alertasClinicos.restricoesFisicas),
                filtrarAlerta(contexto.alertasClinicos.medicamentos),
              ].filter(Boolean)
              if (!alertasVisiveis.length) return null
              return (
                <div className="mx-4 mt-3 px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 shrink-0">
                  <p className="text-red-300 text-[10px] uppercase tracking-wider font-bold mb-1">⚠ Alertas ativos</p>
                  <p className="text-red-200/70 text-[10px] leading-relaxed line-clamp-2">{alertasVisiveis.join(' · ')}</p>
                </div>
              )
            })()}

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {mensagens.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className={`w-6 h-6 rounded-lg ${corClass.iconBg} border flex items-center justify-center shrink-0 mr-2 mt-1`}>
                      <KoreIcon size={11} className={corClass.iconText} />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-white/[0.09] text-zinc-200 rounded-tl-sm border border-white/[0.11]'}`}>
                    <p className="text-sm md:text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {enviando && (
                <div className="flex justify-start">
                  <div className={`w-6 h-6 rounded-lg ${corClass.iconBg} border flex items-center justify-center shrink-0 mr-2`}>
                    <KoreIcon size={11} className={corClass.iconText} />
                  </div>
                  <div className="bg-white/[0.09] border border-white/[0.11] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {mensagens.length <= 1 && !enviando && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
                {SUGESTOES[contexto.profissionalTipo].map(s => (
                  <button key={s} onClick={() => enviarMensagem(s)}
                    className={`shrink-0 text-[11px] md:text-xs border border-white/[0.10] text-zinc-400 rounded-xl px-3 py-2 md:px-4 md:py-2.5 ${corClass.sugestao} active:scale-95 transition-all whitespace-nowrap`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pt-2 pb-4 border-t border-white/[0.11] shrink-0"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder={`Pergunte sobre ${contexto.paciente.nome?.split(' ')[0] ?? 'este paciente'}...`}
                  disabled={enviando}
                  className={`flex-1 bg-white/[0.09] border border-white/[0.10] rounded-2xl px-4 py-3 text-white text-sm md:text-base placeholder:text-zinc-600 focus:outline-none ${corClass.focus} disabled:opacity-50 transition-colors`} />
                <button onClick={() => enviarMensagem()} disabled={!input.trim() || enviando}
                  className={`w-11 h-11 rounded-2xl ${corClass.btn} flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shrink-0`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
