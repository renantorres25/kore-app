import type { SupabaseClient } from '@supabase/supabase-js'

// Marca sessoes_prescritas como concluída quando o atleta registra uma atividade
// correspondente (mesma data + modalidade) em atividades_livres — mesma correspondência
// usada em /personal/aluno/[id]
export async function sincronizarSessaoPrescrita(
  supabase: SupabaseClient,
  atletaId: string,
  data: string,
  modalidade: string
) {
  const { data: pendentes } = await supabase
    .from('sessoes_prescritas')
    .select('id')
    .eq('atleta_id', atletaId)
    .eq('data', data)
    .eq('modalidade', modalidade)
    .neq('status', 'concluido')

  if (pendentes && pendentes.length > 0) {
    await supabase.from('sessoes_prescritas').update({ status: 'concluido' }).in('id', pendentes.map(p => p.id))
  }
}
