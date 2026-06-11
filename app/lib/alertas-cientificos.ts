export type AlertaNivel = 'vermelho' | 'amarelo' | 'verde' | 'cinza'

export type AtividadeBase = {
  data: string
  duracao_min: number | null
  fc_media: number | null
}

export type AtividadeCompleta = AtividadeBase & {
  fc_max: number | null
  calorias_wearable: number | null
  calorias_estimadas: number | null
}

export type AlertaItem = {
  codigo: string
  nivel: 'vermelho' | 'amarelo'
  dadoTecnico: string
  mensagem: string
}

export type AlertaCientifico = {
  nivel: AlertaNivel
  alertas: AlertaItem[]
}

const NIVEL_ORDER: Record<'vermelho' | 'amarelo', number> = { vermelho: 0, amarelo: 1 }

function getHojeStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getDateOffsetStr(diasAtras: number): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function diasSemTreinar(ultimoTreino: string | null): number {
  if (!ultimoTreino) return 999
  const d = new Date(ultimoTreino + 'T12:00:00-03:00')
  const hoje = new Date()
  return Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * ACWR (Acute:Chronic Workload Ratio) — carga interna baseada em FC e duração.
 * Carga aguda = soma dos últimos 7 dias.
 * Carga crônica = média semanal das 4 semanas anteriores (dias 8-35).
 * Requer pelo menos 14 dias de histórico (atividade mais antiga ≤ hoje-13).
 */
export function calcularACWR(
  atividades: AtividadeBase[],
  fcmax: number
): { acwr: number | null; cargaAguda: number; cargaCronica: number } {
  const hoje = getHojeStr()
  const limiteAguda = getDateOffsetStr(6)   // últimos 7 dias (offsets 0-6)
  const limiteCronicaIni = getDateOffsetStr(34) // offset 34 (dia 35)
  const limiteCronicaFim = getDateOffsetStr(7)  // offset 7 (dia 8) — exclusivo

  const cargaDe = (a: AtividadeBase): number => {
    const fc = a.fc_media ?? 0.7 * fcmax
    const duracao = a.duracao_min ?? 0
    return (fc / fcmax) * duracao
  }

  const cargaAguda = atividades
    .filter(a => a.data >= limiteAguda && a.data <= hoje)
    .reduce((s, a) => s + cargaDe(a), 0)

  const somaCronica = atividades
    .filter(a => a.data >= limiteCronicaIni && a.data < limiteCronicaFim)
    .reduce((s, a) => s + cargaDe(a), 0)

  const cargaCronica = somaCronica / 4

  const earliestData = atividades.reduce<string | null>((min, a) => {
    if (min === null || a.data < min) return a.data
    return min
  }, null)

  const temHistoricoSuficiente = earliestData !== null && earliestData <= getDateOffsetStr(13)

  let acwr: number | null = null
  if (temHistoricoSuficiente && cargaCronica > 0) {
    acwr = cargaAguda / cargaCronica
  }

  return { acwr, cargaAguda, cargaCronica }
}

/**
 * FC Drift — variação da FC média ponderada por duração entre os últimos 7 dias
 * e os 7 dias anteriores (dias 8-14).
 * Requer pelo menos 10 atividades com fc_media preenchido.
 */
export function calcularFCDrift(
  atividades: AtividadeBase[]
): { drift: number | null; fcMediaRecente: number; fcMediaAnterior: number } {
  const hoje = getHojeStr()
  const limiteRecenteIni = getDateOffsetStr(6)   // offsets 0-6
  const limiteAnteriorIni = getDateOffsetStr(13) // offsets 7-13
  const limiteAnteriorFim = getDateOffsetStr(7)  // exclusivo

  const comFc = atividades.filter(a => a.fc_media != null)
  if (comFc.length < 10) {
    return { drift: null, fcMediaRecente: 0, fcMediaAnterior: 0 }
  }

  const mediaPonderada = (arr: AtividadeBase[]): number => {
    let somaPeso = 0
    let somaFcPeso = 0
    for (const a of arr) {
      if (a.fc_media == null) continue
      const peso = a.duracao_min ?? 1
      somaPeso += peso
      somaFcPeso += a.fc_media * peso
    }
    return somaPeso > 0 ? somaFcPeso / somaPeso : 0
  }

  const recentes = comFc.filter(a => a.data >= limiteRecenteIni && a.data <= hoje)
  const anteriores = comFc.filter(a => a.data >= limiteAnteriorIni && a.data < limiteAnteriorFim)

  const fcMediaRecente = mediaPonderada(recentes)
  const fcMediaAnterior = mediaPonderada(anteriores)

  if (fcMediaRecente === 0 || fcMediaAnterior === 0) {
    return { drift: null, fcMediaRecente, fcMediaAnterior }
  }

  const drift = ((fcMediaRecente - fcMediaAnterior) / fcMediaAnterior) * 100
  return { drift, fcMediaRecente, fcMediaAnterior }
}

/**
 * FC máxima estimada: perfil > maior fc_max registrado > 220-idade > fallback 185.
 */
export function calcularFcmaxEstimado(
  fcmaxPerfil: number | null,
  idade: number | null,
  atividadesMax: number[]
): number {
  if (fcmaxPerfil != null && fcmaxPerfil > 0) return fcmaxPerfil
  if (atividadesMax.length > 0) return Math.max(...atividadesMax)
  if (idade != null && idade > 0) return 220 - idade
  return 185
}

export type ComputeAlertaParams = {
  atividades30d: AtividadeCompleta[]
  fcmaxPerfil: number | null
  idade: number | null
  totalTreinos: number
  ultimoTreino: string | null
  // nutricionista
  caloriasPrescritas?: number | null
  proteinaPrescritas?: number | null
  pesoKg?: number | null
  evolucaoPeso?: { data: string; peso: number }[]
}

export function computeAlertaCientifico(params: ComputeAlertaParams): AlertaCientifico {
  const {
    atividades30d, fcmaxPerfil, idade, totalTreinos, ultimoTreino,
    caloriasPrescritas, proteinaPrescritas, pesoKg, evolucaoPeso,
  } = params

  // Nunca treinou
  if (totalTreinos === 0 && atividades30d.length === 0) {
    return { nivel: 'cinza', alertas: [] }
  }

  const alertas: AlertaItem[] = []

  const fcMaxAtividades = atividades30d
    .map(a => a.fc_max)
    .filter((v): v is number => v != null)
  const fcmax = calcularFcmaxEstimado(fcmaxPerfil, idade, fcMaxAtividades)

  const { acwr } = calcularACWR(atividades30d, fcmax)
  const { drift, fcMediaRecente, fcMediaAnterior } = calcularFCDrift(atividades30d)

  // ── ACWR ──────────────────────────────────────────
  if (acwr != null) {
    if (acwr > 1.5) {
      const pct = Math.round((acwr - 1) * 100)
      alertas.push({
        codigo: 'ACWR_ALTO',
        nivel: 'vermelho',
        dadoTecnico: `ACWR: ${acwr.toFixed(2)} | Zona segura: 0.8–1.3`,
        mensagem: `Carga ${pct}% acima da média das últimas 4 semanas. Risco de lesão elevado.`,
      })
    } else if (acwr >= 1.3) {
      alertas.push({
        codigo: 'ACWR_ELEVADO',
        nivel: 'amarelo',
        dadoTecnico: `ACWR: ${acwr.toFixed(2)} | Zona segura: 0.8–1.3`,
        mensagem: 'Carga elevada. Monitore sinais de fadiga nos próximos treinos.',
      })
    } else if (acwr < 0.8) {
      alertas.push({
        codigo: 'ACWR_BAIXO',
        nivel: 'amarelo',
        dadoTecnico: `ACWR: ${acwr.toFixed(2)} | Zona ideal: 0.8–1.3`,
        mensagem: 'Volume abaixo do habitual. Risco de perda de adaptação ao treino.',
      })
    }
  }

  // ── FC Drift ──────────────────────────────────────
  if (drift != null && drift > 8) {
    alertas.push({
      codigo: 'FC_DRIFT',
      nivel: 'vermelho',
      dadoTecnico: `FC média recente: ${Math.round(fcMediaRecente)}bpm | Anterior: ${Math.round(fcMediaAnterior)}bpm | Drift: +${drift.toFixed(1)}%`,
      mensagem: 'Frequência cardíaca subindo para o mesmo volume de treino. Sinal de fadiga acumulada.',
    })
  }

  // ── RED-S (nutricionista) ────────────────────────
  if (caloriasPrescritas != null && pesoKg != null && pesoKg > 0) {
    const comCal = atividades30d.filter(a => (a.calorias_wearable ?? a.calorias_estimadas) != null)

    if (comCal.length >= 5) {
      // TMB estimada (Mifflin-St Jeor simplificado sem sexo: ~22 × peso)
      const tmbEstimada = pesoKg * 22

      // Fator de atividade baseado no volume de treino
      // leve (<3 sessões/semana): 1.375
      // moderado (3-5 sessões): 1.55
      // intenso (>5 sessões): 1.725
      const sessoesSemanais = atividades30d.filter(a => {
        const hoje = getHojeStr()
        const seteDias = getDateOffsetStr(6)
        return a.data >= seteDias && a.data <= hoje
      }).length

      const fatorAtividade = sessoesSemanais <= 2 ? 1.375 : sessoesSemanais <= 5 ? 1.55 : 1.725
      const tdeeEstimado = tmbEstimada * fatorAtividade

      // TDEE já inclui atividade via fator — não soma gasto de treino separado
      const deficit = tdeeEstimado - caloriasPrescritas

      // Dispara se déficit > 300 kcal/dia (threshold mais conservador)
      if (deficit > 300) {
        alertas.push({
          codigo: 'RED_S',
          nivel: 'vermelho',
          dadoTecnico: `Déficit: ${Math.round(deficit)}kcal/dia | TDEE est.: ${Math.round(tdeeEstimado)}kcal | Prescrito: ${caloriasPrescritas}kcal`,
          mensagem: 'Plano calórico insuficiente para a carga de treino. Risco de perda muscular em 2–3 semanas.',
        })
      }
    }
  }

  // ── Inatividade ───────────────────────────────────
  const dias = diasSemTreinar(ultimoTreino)
  if (totalTreinos > 0) {
    if (dias >= 7) {
      alertas.push({
        codigo: 'INATIVIDADE_ALTA',
        nivel: 'vermelho',
        dadoTecnico: `${dias} dias sem atividade registrada`,
        mensagem: `Atleta inativo há ${dias} dias. Risco de descondicionamento.`,
      })
    } else if (dias >= 3) {
      alertas.push({
        codigo: 'INATIVIDADE_MODERADA',
        nivel: 'amarelo',
        dadoTecnico: `${dias} dias sem atividade registrada`,
        mensagem: `Sem treino registrado nos últimos ${dias} dias.`,
      })
    }
  }

  // ── Plateau de peso (nutricionista) ──────────────
  if (evolucaoPeso && evolucaoPeso.length >= 3 && caloriasPrescritas != null && pesoKg != null) {
    const manutencaoEstimada = pesoKg * 33
    const deficitAtivo = caloriasPrescritas < manutencaoEstimada
    if (deficitAtivo) {
      const ordenados = [...evolucaoPeso].sort((a, b) => b.data.localeCompare(a.data))
      const maisRecente = ordenados[0]
      const maisAntigo = ordenados[ordenados.length - 1]
      const variacao = Math.abs(maisRecente.peso - maisAntigo.peso)
      const diasEntre = Math.round(
        (new Date(maisRecente.data + 'T12:00:00-03:00').getTime() - new Date(maisAntigo.data + 'T12:00:00-03:00').getTime())
        / (1000 * 60 * 60 * 24)
      )
      const semanas = Math.max(1, Math.round(diasEntre / 7))
      if (variacao < 0.5) {
        alertas.push({
          codigo: 'PLATEAU_PESO',
          nivel: 'amarelo',
          dadoTecnico: `Peso estagnado: ${semanas} semanas | Variação: ${variacao.toFixed(1)}kg`,
          mensagem: 'Peso sem mudança significativa com déficit ativo. Considere ajustar protocolo.',
        })
      }
    }
  }

  // ── Proteína baixa (nutricionista) ───────────────
  if (proteinaPrescritas != null && pesoKg != null && pesoKg > 0 && acwr != null && acwr >= 1.0) {
    const gPerKg = proteinaPrescritas / pesoKg
    if (gPerKg < 1.6) {
      alertas.push({
        codigo: 'PROTEINA_BAIXA',
        nivel: 'amarelo',
        dadoTecnico: `Proteína: ${gPerKg.toFixed(1)}g/kg | Recomendado em carga alta: ≥1.6g/kg`,
        mensagem: 'Ingestão proteica abaixo do ideal para a carga de treino atual.',
      })
    }
  }

  // Ordena por severidade (vermelho antes de amarelo, preservando prioridade interna)
  alertas.sort((a, b) => NIVEL_ORDER[a.nivel] - NIVEL_ORDER[b.nivel])

  if (alertas.some(a => a.nivel === 'vermelho')) {
    return { nivel: 'vermelho', alertas }
  }
  if (alertas.some(a => a.nivel === 'amarelo')) {
    return { nivel: 'amarelo', alertas }
  }

  // Verde: ACWR na zona ideal + ≥3 sessões na última semana
  const sessoesSemana = atividades30d.filter(a => a.data >= getDateOffsetStr(6) && a.data <= getHojeStr()).length
  if (acwr != null && acwr >= 0.8 && acwr <= 1.3 && sessoesSemana >= 3) {
    return { nivel: 'verde', alertas: [] }
  }

  return { nivel: 'cinza', alertas: [] }
}

export type PontoPMC = {
  data: string
  tss: number        // carga do dia
  ctl: number        // fitness (42 dias)
  atl: number        // fadiga (7 dias)
  tsb: number        // form = CTL - ATL
}

/**
 * PMC (Performance Management Chart) — TSS diário + CTL/ATL/TSB via médias móveis exponenciais.
 * TSS diário = soma de (fc_media/fcmax) × duracao_min de todas as atividades do dia, normalizado para escala 0-100
 * (1h a 100% da FCmax = TSS 100).
 */
export function calcularPMC(
  atividades: { data: string; duracao_min: number | null; fc_media: number | null }[],
  fcmax: number,
  dias: number = 90
): PontoPMC[] {
  if (!fcmax || fcmax <= 0) return []

  // 1. Mapa de TSS por data
  const tssPorData = new Map<string, number>()
  for (const a of atividades) {
    if (a.fc_media == null || a.duracao_min == null) continue
    const tss = (a.fc_media / fcmax) * a.duracao_min * (100 / 60)
    tssPorData.set(a.data, (tssPorData.get(a.data) ?? 0) + tss)
  }
  if (tssPorData.size === 0) return []

  // 2. Range completo de datas (da atividade mais antiga até hoje), preenchendo dias sem treino com TSS=0
  const inicioStr = [...tssPorData.keys()].sort()[0]
  const hojeStr = getHojeStr()
  const inicio = new Date(inicioStr + 'T12:00:00-03:00')
  const hoje = new Date(hojeStr + 'T12:00:00-03:00')
  const totalDias = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // 3-5. CTL (EMA 42d), ATL (EMA 7d), TSB = CTL(ontem) - ATL(ontem)
  const pontos: PontoPMC[] = []
  let ctl = 0
  let atl = 0
  for (let i = 0; i < totalDias; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i)
    const dataStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const tss = tssPorData.get(dataStr) ?? 0
    const tsb = ctl - atl
    ctl = ctl + (tss - ctl) / 42
    atl = atl + (tss - atl) / 7
    pontos.push({
      data: dataStr,
      tss: Math.round(tss),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    })
  }

  return pontos.slice(-dias)
}
