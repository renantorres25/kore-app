// Gera uma descrição narrativa legível para um bloco de sessão prescrita

export type BlocoNarrativa = {
  nome: string
  duracao_min: number | null
  distancia_km: number | null
  repeticoes: number | null
  zona_fc: string | null
  fc_min: number | null
  fc_max: number | null
  pace_alvo: string | null
  ftp_pct: number | null
  watts_alvo: number | null
  observacao: string | null
}

export type ModalidadeNarrativa = 'corrida' | 'bike' | 'natacao' | 'musculacao' | 'descanso'

const VERBO_MODALIDADE: Record<ModalidadeNarrativa, string> = {
  corrida: 'Correr',
  bike: 'Pedalar',
  natacao: 'Nadar',
  musculacao: 'Treinar',
  descanso: 'Descansar',
}

const TOLERANCIA_PACE = 0.08 // mesma tolerância usada na aderência (±8%)

// "5:30" ou "1:45" → segundos
function parsePaceToSec(pace: string | null): number | null {
  if (!pace) return null
  const m = pace.match(/(\d+):(\d{2})/)
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

// segundos → "26'40"
function formatMinSec(totalSec: number): string {
  const min = Math.floor(totalSec / 60)
  const sec = Math.round(totalSec % 60)
  return `${min}'${sec.toString().padStart(2, '0')}`
}

export function gerarNarrativaBloco(bloco: BlocoNarrativa, modalidade: ModalidadeNarrativa): string {
  // Musculação: formato simplificado, sempre legível
  if (modalidade === 'musculacao') {
    if (bloco.duracao_min != null) return `Bloco de musculação: ${bloco.duracao_min}min`
    if (bloco.observacao) return `Bloco de musculação: ${bloco.observacao}`
    return `Bloco de musculação: ${bloco.nome}`
  }

  const partes: string[] = []
  const verbo = VERBO_MODALIDADE[modalidade] ?? 'Treinar'

  // Distância ou duração como base (sempre gera algo)
  if (bloco.distancia_km != null) {
    const dist = modalidade === 'natacao' ? `${Math.round(bloco.distancia_km * 1000)}m` : `${bloco.distancia_km}km`
    partes.push(`${verbo} ${dist}`)
  } else if (bloco.duracao_min != null) {
    partes.push(`${verbo} ${bloco.duracao_min}min`)
  } else {
    partes.push(verbo)
  }

  // Zona de FC (sempre que disponível, independente da faixa de bpm)
  if (bloco.zona_fc) partes.push(bloco.zona_fc.toUpperCase())

  // Pace alvo (corrida/natação)
  if (bloco.pace_alvo) {
    const unidade = modalidade === 'natacao' ? 'min/100m' : 'min/km'
    partes.push(`pace ${bloco.pace_alvo} ${unidade}`)
  }

  // Bike: %FTP e/ou watts
  if (modalidade === 'bike') {
    if (bloco.ftp_pct != null) partes.push(`${bloco.ftp_pct}% FTP`)
    if (bloco.watts_alvo != null) partes.push(`${bloco.watts_alvo}W`)
  }

  // Faixa de FC (independente da zona)
  if (bloco.fc_min != null && bloco.fc_max != null) {
    partes.push(`FC ${bloco.fc_min}–${bloco.fc_max}bpm`)
  }

  // Tempo estimado de conclusão (corrida/natação com distância + pace alvo)
  if ((modalidade === 'corrida' || modalidade === 'natacao') && bloco.distancia_km != null && bloco.pace_alvo) {
    const paceSec = parsePaceToSec(bloco.pace_alvo)
    if (paceSec != null) {
      const unidades = modalidade === 'natacao' ? (bloco.distancia_km * 1000) / 100 : bloco.distancia_km
      const tempoAlvo = paceSec * unidades
      const tempoLimite = tempoAlvo * (1 + TOLERANCIA_PACE)
      partes.push(`completar entre ${formatMinSec(tempoAlvo)} e ${formatMinSec(tempoLimite)}`)
    }
  }

  let descricao = partes.join(' • ')
  if (bloco.observacao) descricao += ` — ${bloco.observacao}`

  if (bloco.repeticoes != null && bloco.repeticoes > 1) {
    descricao = `Repetir ${bloco.repeticoes}x: ${descricao}`
  }

  return descricao
}
