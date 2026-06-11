import { supabase } from './supabase'

// Registra um evento de telemetria (base dos KPIs do backoffice).
// Falha em silêncio de propósito: telemetria nunca deve quebrar a experiência.
//
// Uso (ex.): registrarEvento('first_log_created', { tipo: 'sono' })
//            registrarEvento('plan_assigned', { plano_id: id })
export async function registrarEvento(
  tipoEvento: string,
  propriedades: Record<string, any> = {}
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) return
    await supabase.from('eventos').insert({
      user_id: userId,
      tipo_evento: tipoEvento,
      propriedades,
    })
  } catch {
    /* silencioso */
  }
}
