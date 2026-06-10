-- ============================================================================
-- KORE — Fundação do Backoffice / Painel Administrativo
-- ADITIVO: cria apenas tabelas novas e referencia perfis(id). NÃO altera nada existente.
-- ============================================================================

-- 1. Papéis administrativos (equipe interna)
create table if not exists admin_users (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references perfis(id) on delete cascade,
  papel       text not null check (papel in ('super_admin','admin','financeiro','sac','analista')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create or replace function is_admin(uid uuid default auth.uid())
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_users a where a.user_id = uid and a.ativo);
$$;

create or replace function admin_papel(uid uuid default auth.uid())
returns text language sql security definer stable set search_path = public as $$
  select papel from admin_users a where a.user_id = uid and a.ativo limit 1;
$$;

alter table admin_users enable row level security;
create policy admin_users_select on admin_users for select using (is_admin());
create policy admin_users_write  on admin_users for all
  using (admin_papel() = 'super_admin') with check (admin_papel() = 'super_admin');

-- 2. Telemetria de eventos (base de todos os KPIs)
create table if not exists eventos (
  id            bigint generated always as identity primary key,
  user_id       uuid references perfis(id) on delete set null,
  tipo_evento   text not null,
  propriedades  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_eventos_tipo on eventos (tipo_evento);
create index if not exists idx_eventos_user on eventos (user_id);
create index if not exists idx_eventos_data on eventos (created_at);
alter table eventos enable row level security;
create policy eventos_insert_own  on eventos for insert to authenticated with check (user_id = auth.uid());
create policy eventos_select_admin on eventos for select using (is_admin());

-- 3. Assinaturas e pagamentos (provedor-agnóstico: serve Stripe, Pagar.me, etc.)
create table if not exists assinaturas (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references perfis(id) on delete cascade,
  plano                  text not null check (plano in ('solo','conectado')),
  status                 text not null default 'trial' check (status in ('trial','ativa','inadimplente','cancelada')),
  provedor               text,
  provedor_assinatura_id text,
  trial_fim              date,
  inicio                 timestamptz not null default now(),
  cancelada_em           timestamptz,
  created_at             timestamptz not null default now()
);
create index if not exists idx_assinaturas_user   on assinaturas (user_id);
create index if not exists idx_assinaturas_status on assinaturas (status);

create table if not exists pagamentos (
  id                    uuid primary key default gen_random_uuid(),
  assinatura_id         uuid references assinaturas(id) on delete set null,
  user_id               uuid references perfis(id) on delete set null,
  valor                 numeric(10,2) not null,
  moeda                 text not null default 'BRL',
  status                text not null check (status in ('pago','falho','reembolsado','pendente')),
  metodo                text,
  provedor_pagamento_id text,
  pago_em               timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists idx_pagamentos_assinatura on pagamentos (assinatura_id);
create index if not exists idx_pagamentos_user       on pagamentos (user_id);
alter table assinaturas enable row level security;
alter table pagamentos  enable row level security;
create policy assinaturas_select      on assinaturas for select using (user_id = auth.uid() or is_admin());
create policy assinaturas_admin_write on assinaturas for all   using (is_admin()) with check (is_admin());
create policy pagamentos_select       on pagamentos  for select using (user_id = auth.uid() or is_admin());
create policy pagamentos_admin_write  on pagamentos  for all   using (is_admin()) with check (is_admin());

-- 4. SAC / Suporte
create table if not exists tickets_sac (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references perfis(id) on delete set null,
  canal          text not null check (canal in ('in_app','whatsapp','email')),
  assunto        text not null,
  descricao      text,
  status         text not null default 'aberto' check (status in ('aberto','em_andamento','resolvido','fechado')),
  prioridade     text not null default 'media' check (prioridade in ('baixa','media','alta')),
  responsavel_id uuid references admin_users(id),
  sla_vencimento timestamptz,
  csat           int check (csat between 1 and 5),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_tickets_status on tickets_sac (status);
alter table tickets_sac enable row level security;
create policy tickets_insert_own  on tickets_sac for insert to authenticated with check (user_id = auth.uid());
create policy tickets_select      on tickets_sac for select using (user_id = auth.uid() or is_admin());
create policy tickets_admin_write on tickets_sac for all   using (is_admin()) with check (is_admin());

-- 5. Log de auditoria (imutável: sem policy de update/delete)
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid references perfis(id) on delete set null,
  acao        text not null,
  entidade    text,
  entidade_id text,
  antes       jsonb,
  depois      jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_admin on audit_log (admin_id);
create index if not exists idx_audit_data  on audit_log (created_at);
alter table audit_log enable row level security;
create policy audit_select_admin on audit_log for select using (is_admin());
create policy audit_insert_admin on audit_log for insert with check (is_admin());

-- 6. Consentimentos (LGPD)
create table if not exists consentimentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references perfis(id) on delete cascade,
  tipo         text not null,
  versao_termo text not null,
  aceito       boolean not null default true,
  aceito_em    timestamptz not null default now(),
  ip           text
);
create index if not exists idx_consent_user on consentimentos (user_id);
alter table consentimentos enable row level security;
create policy consent_insert_own on consentimentos for insert to authenticated with check (user_id = auth.uid());
create policy consent_select     on consentimentos for select using (user_id = auth.uid() or is_admin());
