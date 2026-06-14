import { getHojeStr, getDateOffsetStr } from './alertas-cientificos'

/* ─────────────────────────────────────────────────────────
   Cálculos de performance/evolução compartilhados entre
   app/evolucao/page.tsx e KoreAIChat (contexto da IA geral)
   ───────────────────────────────────────────────────────── */

export type AtividadeLivrePerf = {
  data: string
  modalidade: string
  duracao_min: number | null
  distancia_km: number | null
  distancia_m: number | null
  fc_media: number | null
  fc_max?: number | null
}

export type SessaoPace = { data: string; modalidade: string; zona: string | null; pace: number; fc_media: number | null }

export type SemanaVolume = { inicio: string; total: number; porModalidade: Record<string, { km: number; sessoes: number; min: number }> }

// modalidades de volume — rótulos
export const VOL_LABELS: Record<string, string> = { corrida: 'Corrida', bike: 'Bike', natacao: 'Natação', musculacao: 'Musculação', crossfit: 'Crossfit', outro: 'Outro' }
// modalidades sem distância (km) — exibidas por tempo (sessões/min)
export const VOL_SEM_DISTANCIA = new Set(['musculacao', 'crossfit'])

export const MOD_LABELS_PACE: Record<string, string> = { corrida: 'Corrida', bike: 'Bike', natacao: 'Natação' }
export const ZONAS_ORDEM = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as const
export const ZONA_LABELS: Record<string, string> = {
  Z1: 'Z1 · Regenerativo', Z2: 'Z2 · Aeróbico base', Z3: 'Z3 · Tempo', Z4: 'Z4 · Limiar', Z5: 'Z5 · VO2max',
}

export function getTodayBR(): string {
  return getHojeStr()
}

export function getSunday(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  return r
}

export function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export function calcularPace(modalidade: string, duracaoMin: number, distanciaKm: number | null, distanciaM: number | null): number | null {
  if (modalidade === 'corrida') {
    if (!distanciaKm || distanciaKm <= 0) return null
    return duracaoMin / distanciaKm
  }
  if (modalidade === 'bike') {
    if (!distanciaKm || distanciaKm <= 0) return null
    return distanciaKm / (duracaoMin / 60)
  }
  if (modalidade === 'natacao') {
    const metros = distanciaM ?? (distanciaKm ? distanciaKm * 1000 : null)
    if (!metros || metros <= 0) return null
    return duracaoMin / (metros / 100)
  }
  return null
}

// Zona de FC com base em % da FCmax
export function calcularZonaFC(fcMedia: number | null, fcmax: number | null): string | null {
  if (fcMedia == null || !fcmax) return null
  const pct = (fcMedia / fcmax) * 100
  if (pct < 60) return 'Z1'
  if (pct < 70) return 'Z2'
  if (pct < 80) return 'Z3'
  if (pct < 90) return 'Z4'
  return 'Z5'
}

export function formatPaceValue(modalidade: string, valor: number): string {
  if (modalidade === 'bike') return valor.toFixed(1)
  const min = Math.floor(valor)
  const sec = Math.round((valor - min) * 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function linhaTendencia(valores: number[]): number[] {
  const n = valores.length
  const xs = valores.map((_, i) => i)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = valores.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * valores[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x * x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return valores.map(() => sumY / n)
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return xs.map(x => intercept + slope * x)
}

// Interpreta a evolução do pace/velocidade dentro de uma zona de FC, com base no primeiro/último ponto e na direção da linha de tendência
export function interpretarPaceZona(modalidade: string, zona: string, valores: number[]): string {
  if (valores.length < 3) return 'Registre mais treinos nesta zona para ver sua evolução'
  const tendencia = linhaTendencia(valores)
  const x = formatPaceValue(modalidade, valores[0])
  const y = formatPaceValue(modalidade, valores[valores.length - 1])
  const delta = tendencia[tendencia.length - 1] - tendencia[0]
  const limiar = Math.abs(tendencia[0]) * 0.01

  if (modalidade === 'corrida') {
    if (delta < -limiar) return `Seu pace em ${zona} melhorou de ${x} para ${y} min/km — você está mais eficiente 🏃`
    if (delta > limiar) return `Seu pace em ${zona} subiu de ${x} para ${y} min/km — pode ser sinal de fadiga acumulada`
    return `Seu pace em ${zona} está estável em ~${y} min/km`
  }
  if (modalidade === 'bike') {
    if (delta > limiar) return `Sua velocidade em ${zona} subiu de ${x} para ${y} km/h — você está pedalando mais forte 🚴`
    if (delta < -limiar) return `Sua velocidade em ${zona} caiu de ${x} para ${y} km/h`
    return `Sua velocidade em ${zona} está estável em ~${y} km/h`
  }
  if (modalidade === 'natacao') {
    if (delta < -limiar) return `Seu pace em ${zona} melhorou de ${x} para ${y} min/100m — você está nadando melhor 🏊`
    if (delta > limiar) return `Seu pace em ${zona} subiu de ${x} para ${y} min/100m — pode ser sinal de fadiga acumulada`
    return `Seu pace em ${zona} está estável em ~${y} min/100m`
  }
  return ''
}

/**
 * Sessões de pace por zona de FC — uma entrada por atividade de corrida/bike/natação
 * com pace calculável, ordenadas por data crescente.
 */
export function calcularSessoesPace(atividades: AtividadeLivrePerf[], fcmax: number | null): SessaoPace[] {
  const pace: SessaoPace[] = []
  atividades.forEach(a => {
    if (!['corrida', 'bike', 'natacao'].includes(a.modalidade) || !a.duracao_min) return
    const distKm = a.distancia_km != null ? Number(a.distancia_km) : null
    const distM = a.distancia_m != null ? Number(a.distancia_m) : null
    const p = calcularPace(a.modalidade, a.duracao_min, distKm, distM)
    if (p == null) return
    const fcMedia = a.fc_media ?? null
    pace.push({ data: a.data, modalidade: a.modalidade, zona: calcularZonaFC(fcMedia, fcmax), pace: p, fc_media: fcMedia })
  })
  pace.sort((a, b) => a.data.localeCompare(b.data))
  return pace
}

/**
 * Volume semanal por modalidade (domingo a sábado), últimas `semanas` semanas (incluindo a atual).
 */
export function calcularVolumeSemanal(atividades: AtividadeLivrePerf[], semanas: number = 8): SemanaVolume[] {
  const hojeDate = new Date(getTodayBR() + 'T12:00:00-03:00')
  const resultado: SemanaVolume[] = []
  for (let w = semanas - 1; w >= 0; w--) {
    const domingo = getSunday(hojeDate)
    domingo.setDate(domingo.getDate() - w * 7)
    const sabado = new Date(domingo); sabado.setDate(domingo.getDate() + 6)
    const inicio = domingo.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const fim = sabado.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const porModalidade: SemanaVolume['porModalidade'] = {}
    atividades.forEach(a => {
      if (a.data < inicio || a.data > fim) return
      if (!VOL_LABELS[a.modalidade]) return // ignora modalidades não mapeadas (dados sujos)
      const km = a.distancia_km ?? (a.distancia_m ? a.distancia_m / 1000 : 0)
      const min = a.duracao_min ?? 0
      if (!porModalidade[a.modalidade]) porModalidade[a.modalidade] = { km: 0, sessoes: 0, min: 0 }
      porModalidade[a.modalidade].km += km
      porModalidade[a.modalidade].min += min
      porModalidade[a.modalidade].sessoes += 1
    })
    const total = Object.values(porModalidade).reduce((acc, v) => acc + v.km, 0)
    resultado.push({ inicio, total, porModalidade })
  }
  return resultado
}

/** Tendência de volume total (km) comparando a primeira metade com a segunda metade do período. */
export function tendenciaVolume(semanas: SemanaVolume[]): 'aumentando' | 'estável' | 'reduzindo' {
  if (semanas.length < 2) return 'estável'
  const metade = Math.floor(semanas.length / 2)
  const primeira = semanas.slice(0, metade).reduce((s, sem) => s + sem.total, 0) / metade
  const segunda = semanas.slice(metade).reduce((s, sem) => s + sem.total, 0) / (semanas.length - metade)
  if (segunda > primeira * 1.1) return 'aumentando'
  if (segunda < primeira * 0.9) return 'reduzindo'
  return 'estável'
}

export type CargaInterna = { carga: number; pctMedio: number }

/**
 * Carga interna de um período: soma de (fc_media/fcmax) × duracao_min das atividades
 * com FC e duração registradas. pctMedio = % médio da FCmax ponderado pela duração.
 */
export function calcularCargaInternaSemana(
  atividades: { data: string; fc_media?: number | null; duracao_min?: number | null }[],
  fcmax: number,
  start: string,
  end: string
): CargaInterna {
  const ativs = atividades.filter(a => a.data >= start && a.data <= end && a.fc_media != null && a.duracao_min != null)
  let cargaTotal = 0, pctPonderado = 0, minTotal = 0
  ativs.forEach(a => {
    const min = a.duracao_min ?? 0
    const pct = (a.fc_media as number) / fcmax
    cargaTotal += pct * min
    pctPonderado += pct * min
    minTotal += min
  })
  const pctMedio = minTotal > 0 ? pctPonderado / minTotal : 0
  return { carga: Math.round(cargaTotal), pctMedio }
}

export type ResumoPaceZona = {
  modalidade: string; zona: string; valorFormatado: string; unidade: string
  count: number; interpretacao: string
}

/**
 * Resumo de pace/velocidade por zona de FC, para todas as modalidades (corrida/bike/natação),
 * incluindo apenas zonas com pelo menos 3 atividades. Se `top` for informado, retorna
 * apenas as combinações com mais atividades (ordenado desc.).
 */
export function calcularPaceZonaFCResumo(sessoesPace: SessaoPace[], top?: number): ResumoPaceZona[] {
  const resumo: ResumoPaceZona[] = []
  ;(['corrida', 'bike', 'natacao'] as const).forEach(mod => {
    const contagens: Record<string, number> = {}
    sessoesPace.filter(s => s.modalidade === mod && s.zona).forEach(s => { contagens[s.zona!] = (contagens[s.zona!] ?? 0) + 1 })
    ZONAS_ORDEM.filter(z => (contagens[z] ?? 0) >= 3).forEach(z => {
      const pontos = sessoesPace.filter(s => s.modalidade === mod && s.zona === z).slice(-12)
      const valores = pontos.map(p => p.pace)
      const media = valores.reduce((a, b) => a + b, 0) / valores.length
      const unidade = mod === 'bike' ? 'km/h' : mod === 'natacao' ? 'min/100m' : 'min/km'
      resumo.push({
        modalidade: mod, zona: z, valorFormatado: formatPaceValue(mod, media), unidade,
        count: valores.length, interpretacao: interpretarPaceZona(mod, z, valores),
      })
    })
  })
  resumo.sort((a, b) => b.count - a.count)
  return top != null ? resumo.slice(0, top) : resumo
}

export type EficienciaCardiaca = { recente: number; anterior: number; diff: number; mensagem: string }

/** FC média dos últimos 14 dias vs. 14 dias anteriores (4 semanas atrás), com interpretação. */
export function calcularEficienciaCardiaca(atividades: AtividadeLivrePerf[]): EficienciaCardiaca | null {
  const corte14 = getDateOffsetStr(13)
  const corte28 = getDateOffsetStr(27)
  const recentes = atividades.filter(a => a.fc_media != null && a.data >= corte14)
  const anteriores = atividades.filter(a => a.fc_media != null && a.data >= corte28 && a.data < corte14)
  if (!recentes.length || !anteriores.length) return null
  const mediaRecente = recentes.reduce((s, a) => s + a.fc_media!, 0) / recentes.length
  const mediaAnterior = anteriores.reduce((s, a) => s + a.fc_media!, 0) / anteriores.length
  const diff = mediaRecente - mediaAnterior
  const mensagem = diff > 5
    ? 'Sua FC está aumentando — sinal de fadiga acumulada. Considere uma semana mais leve.'
    : diff < -5
    ? 'Sua FC está caindo para o mesmo esforço — você está mais fit. Continue assim!'
    : 'Sua FC está estável — condicionamento mantido.'
  return { recente: Math.round(mediaRecente), anterior: Math.round(mediaAnterior), diff, mensagem }
}
