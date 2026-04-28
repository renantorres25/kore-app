// lib/atualizarDecisaoDia.ts
// Função utilitária chamada após qualquer registro do dia
// para regenerar a Decisão do Dia com contexto atualizado

import { supabase } from './supabase'

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export async function atualizarDecisaoDia(userId: string) {
  try {
    const hoje = getTodayBR()

    // Busca todos os dados do dia
    const [
      { data: sono },
      { data: be },
      { data: perfil },
      { data: treinos },
      { data: atividades },
    ] = await Promise.all([
      supabase.from('sono').select('duracao_minutos, qualidade, hrv, spo2, sono_profundo, sono_rem, score_recuperacao').eq('usuario_id', userId).eq('data', hoje).single(),
      supabase.from('bem_estar').select('energia, humor, dor_muscular, qualidade_sono').eq('usuario_id', userId).eq('data', hoje).single(),
      supabase.from('perfis').select('nome, peso, objetivo').eq('id', userId).single(),
      supabase.from('treinos').select('nome, plano, calorias_estimadas').eq('cliente_id', userId).eq('data', hoje).eq('concluido', true),
      supabase.from('atividades_livres').select('modalidade, duracao_min, distancia_km, distancia_m, calorias_wearable, calorias_estimadas, intensidade').eq('usuario_id', userId).eq('data', hoje),
    ])

    // Sem sono não gera decisão
    if (!sono?.score_recuperacao) return

    // Monta resumo das atividades do dia
    const atividadesDia: string[] = []
    treinos?.forEach((t: any) => {
      atividadesDia.push(`Musculação Plano ${t.plano}${t.calorias_estimadas ? ` (~${t.calorias_estimadas}kcal)` : ''}`)
    })
    atividades?.forEach((a: any) => {
      const labels: Record<string, string> = { corrida: 'Corrida', bike: 'Bike', natacao: 'Natação', crossfit: 'Crossfit', outro: 'Atividade' }
      const label = labels[a.modalidade] ?? 'Atividade'
      const cals = a.calorias_wearable ?? a.calorias_estimadas
      let detalhe = `${a.duracao_min}min`
      if (a.distancia_km) detalhe += ` · ${a.distancia_km}km`
      if (a.distancia_m) detalhe += ` · ${a.distancia_m}m`
      atividadesDia.push(`${label} (${detalhe}${cals ? ` ~${cals}kcal` : ''})`)
    })

    const resumoAtividades = atividadesDia.length > 0
      ? atividadesDia.join(', ')
      : 'nenhuma atividade registrada ainda hoje'

    const jaHouveTreino = atividadesDia.length > 0

    const prompt = `Você é o coach de IA do KORE. Analise os dados abaixo e gere a DECISÃO DO DIA atualizada para este atleta.

ATLETA: ${perfil?.nome ?? 'Atleta'} | Objetivo: ${perfil?.objetivo ?? 'saúde geral'} | Peso: ${perfil?.peso ?? '?'}kg

DADOS DE HOJE:
- Score de recuperação: ${sono.score_recuperacao}/100
- Sono: ${sono.duracao_minutos ? `${Math.floor(sono.duracao_minutos/60)}h${sono.duracao_minutos%60}min` : '?'} | Qualidade: ${sono.qualidade ?? '?'}/5
- HRV: ${sono.hrv ? `${sono.hrv}ms` : '?'} | SpO2: ${sono.spo2 ? `${sono.spo2}%` : '?'}
- Sono profundo: ${sono.sono_profundo ? `${sono.sono_profundo}min` : '?'} | REM: ${sono.sono_rem ? `${sono.sono_rem}min` : '?'}
- Energia: ${be?.energia ?? '?'}/5 | Humor: ${be?.humor ?? '?'}/5 | Dor muscular: ${be?.dor_muscular ?? '?'}/5

ATIVIDADES JÁ FEITAS HOJE: ${resumoAtividades}

${jaHouveTreino ? 'IMPORTANTE: O atleta JÁ treinou hoje. Ajuste as recomendações para recuperação pós-treino, nutrição e sono da noite.' : ''}

Responda APENAS em JSON válido, sem markdown:
{
  "decisao": "frase curta e direta considerando o que já foi feito hoje",
  "motivo": "1 linha explicando com dados reais do dia",
  "treino": "${jaHouveTreino ? 'orientação pós-treino ou se deve fazer algo mais' : 'recomendação de treino para hoje'}",
  "nutricao": "ajuste nutricional específico para o momento do dia",
  "sono_rec": "recomendação de sono para esta noite",
  "cor": "verde | amarelo | laranja | vermelho"
}`

    const res = await fetch('/api/analise-treino', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, modo: 'plano' }),
    })
    const data = await res.json()
    const texto = data.analise ?? ''
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return
    const resultado = JSON.parse(jsonMatch[0])

    await supabase.from('decisao_dia').upsert({
      usuario_id: userId,
      data: hoje,
      decisao: resultado.decisao,
      motivo: resultado.motivo,
      treino: resultado.treino,
      nutricao: resultado.nutricao,
      sono_rec: resultado.sono_rec,
      cor: resultado.cor,
    }, { onConflict: 'usuario_id,data' })

  } catch (e) {
    console.error('Erro ao atualizar decisão do dia:', e)
  }
}