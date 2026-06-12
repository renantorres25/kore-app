-- ── Conversa dos chamados de SAC ────────────────────────────────────────────
-- Mensagens de ida e volta dentro de cada ticket. Funciona 100% in-app,
-- sem depender de e-mail. O e-mail (quando houver domínio) só notificará.

create table if not exists ticket_mensagens (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets_sac(id) on delete cascade,
  autor_id    uuid references perfis(id) on delete set null,
  autor_tipo  text not null check (autor_tipo in ('usuario','admin')),
  mensagem    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ticket_msg_ticket on ticket_mensagens (ticket_id, created_at);

alter table ticket_mensagens enable row level security;

-- Usuário lê as mensagens dos tickets dele; admin lê tudo.
drop policy if exists ticket_msg_select on ticket_mensagens;
create policy ticket_msg_select on ticket_mensagens for select
  using (
    is_admin()
    or exists (select 1 from tickets_sac t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- Usuário só insere mensagens como 'usuario', em tickets que são dele.
-- O admin escreve via service role (bypassa RLS), então não precisa de policy de insert para admin.
drop policy if exists ticket_msg_insert_own on ticket_mensagens;
create policy ticket_msg_insert_own on ticket_mensagens for insert to authenticated
  with check (
    autor_tipo = 'usuario'
    and autor_id = auth.uid()
    and exists (select 1 from tickets_sac t where t.id = ticket_id and t.user_id = auth.uid())
  );
