import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Limites por endpoint (chamadas por hora / por dia)
const LIMITES: Record<string, { hora: number; dia: number }> = {
  chat:    { hora: 30, dia: 150 },  // chat é mais leve, permite mais
  analise: { hora: 20, dia: 80  },  // análise de sono/treino
  plano:   { hora: 5,  dia: 20  },  // geração de plano nutricional — mais caro
  briefing:{ hora: 10, dia: 40  },  // briefing IA clínica
}

export async function checkRateLimit(
  usuarioId: string | null,
  endpoint: keyof typeof LIMITES
): Promise<{ ok: boolean; erro?: NextResponse }> {
  if (!usuarioId) {
    return {
      ok: false,
      erro: NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 }),
    }
  }

  const limite = LIMITES[endpoint] ?? { hora: 10, dia: 50 }

  const { data, error } = await supabaseAdmin.rpc('verificar_rate_limit', {
    p_usuario_id: usuarioId,
    p_endpoint: endpoint,
    p_limite_hora: limite.hora,
    p_limite_dia: limite.dia,
  })

  if (error) {
    // Se falhar a verificação, permite a chamada mas loga o erro
    console.error('[rate-limit] Erro ao verificar:', error.message)
    return { ok: true }
  }

  if (!data?.permitido) {
    return {
      ok: false,
      erro: NextResponse.json(
        { erro: data?.motivo ?? 'Limite de uso atingido. Tente novamente mais tarde.' },
        { status: 429 }
      ),
    }
  }

  return { ok: true }
}
