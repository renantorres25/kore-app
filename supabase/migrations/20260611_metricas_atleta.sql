ALTER TABLE perfis
ADD COLUMN IF NOT EXISTS tsb_atual numeric(6,1),
ADD COLUMN IF NOT EXISTS atl_atual numeric(6,1),
ADD COLUMN IF NOT EXISTS ctl_atual numeric(6,1),
ADD COLUMN IF NOT EXISTS metricas_atualizadas_em timestamptz;
