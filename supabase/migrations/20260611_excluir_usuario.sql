-- ============================================================================
-- KORE — Exclusão LGPD de usuário (função em transação)
-- Apaga todos os dados de um usuário, na ordem correta (filhos antes dos pais).
-- Chamada apenas pelo backoffice (service role). Revogada de anon/authenticated.
-- Pode ser rodada várias vezes (create or replace).
-- ============================================================================

create or replace function excluir_usuario_kore(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Treino (filhos antes dos pais)
  delete from series_registradas where cliente_id = uid;
  delete from exercicios_treino where treino_id in (select id from treinos where cliente_id = uid);
  delete from treinos where cliente_id = uid;

  -- Periodização
  delete from blocos_periodizacao where periodizacao_id in (select id from periodizacoes where cliente_id = uid);
  delete from periodizacoes where cliente_id = uid;

  -- Dados ligados por cliente_id / profissional_id / registrado_por
  delete from agendamentos where cliente_id = uid or profissional_id = uid;
  delete from anamneses where cliente_id = uid or profissional_id = uid;
  delete from evolucao_medidas where cliente_id = uid or registrado_por = uid;
  delete from convites where profissional_id = uid;
  delete from vinculos where cliente_id = uid or profissional_id = uid;

  -- Dados ligados por usuario_id
  delete from nutricao where usuario_id = uid;
  delete from planos_nutricionais where usuario_id = uid;
  delete from bem_estar where usuario_id = uid;
  delete from sono where usuario_id = uid;
  delete from decisao_dia where usuario_id = uid;
  delete from atividades_livres where usuario_id = uid;
  delete from chat_historico where usuario_id = uid;
  delete from api_uso where usuario_id = uid;
  delete from strava_connections where usuario_id = uid;
  delete from terra_connections where usuario_id = uid;

  -- Templates públicos: preserva o conteúdo, remove a autoria
  update templates_planos set criado_por = null where criado_por = uid;

  -- Tabelas do backoffice (ligadas por user_id)
  delete from assinaturas where user_id = uid;
  delete from pagamentos where user_id = uid;
  delete from eventos where user_id = uid;
  delete from tickets_sac where user_id = uid;
  delete from consentimentos where user_id = uid;

  -- Por fim, o perfil
  delete from perfis where id = uid;
end;
$$;

-- Só o service role (backoffice) pode executar.
revoke execute on function excluir_usuario_kore(uuid) from public, anon, authenticated;
