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

export function gerarNarrativaBloco(bloco: BlocoNarrativa, modalidade: ModalidadeNarrativa): string {
  const partes: string[] = []

  // Distância ou duração
  if (bloco.distancia_km != null) {
    partes.push(modalidade === 'natacao' ? `${Math.round(bloco.distancia_km * 1000)}m` : `${bloco.distancia_km}km`)
  } else if (bloco.duracao_min != null) {
    partes.push(`${bloco.duracao_min}min`)
  }

  // Pace alvo (corrida/natação)
  if (bloco.pace_alvo) {
    partes.push(`a ${bloco.pace_alvo}`)
  }

  // Bike: watts ou %FTP
  if (modalidade === 'bike') {
    if (bloco.watts_alvo != null) partes.push(`a ${bloco.watts_alvo}W`)
    else if (bloco.ftp_pct != null) partes.push(`a ${bloco.ftp_pct}% FTP`)
  }

  // Faixa de FC ou zona
  if (bloco.fc_min != null && bloco.fc_max != null) {
    partes.push(`FC ${bloco.fc_min}-${bloco.fc_max}bpm`)
  } else if (bloco.zona_fc) {
    partes.push(`zona ${bloco.zona_fc}`)
  }

  let descricao = partes.length > 0 ? `${bloco.nome}: ${partes.join(', ')}` : bloco.nome
  if (bloco.observacao) descricao += ` — ${bloco.observacao}`

  if (bloco.repeticoes != null && bloco.repeticoes > 1) {
    descricao = `Repetir ${bloco.repeticoes}x: ${descricao}`
  }

  return descricao
}
