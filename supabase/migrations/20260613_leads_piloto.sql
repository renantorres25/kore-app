-- ── Leads do formulário "Entrar no Piloto" ─────────────────────────────────
-- Histórico de interesse capturado em /piloto, além do e-mail de notificação.

create table if not exists leads_piloto (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('profissional', 'atleta')),
  dados       jsonb not null default '{}'::jsonb,
  whatsapp    text not null,
  created_at  timestamptz not null default now()
);

alter table leads_piloto enable row level security;

-- Envio é feito via API com service role (bypassa RLS) — sem policy de insert/select público.
