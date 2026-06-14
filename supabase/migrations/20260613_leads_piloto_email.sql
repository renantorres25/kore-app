-- ── Adiciona coluna de email aos leads do formulário "Entrar no Piloto" ────

alter table leads_piloto add column if not exists email text;
