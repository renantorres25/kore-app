ALTER TABLE periodizacoes
ADD COLUMN IF NOT EXISTS modalidade text DEFAULT 'musculacao',
ADD COLUMN IF NOT EXISTS data_prova date,
ADD COLUMN IF NOT EXISTS volume_semanal_alvo numeric;

ALTER TABLE blocos_periodizacao
ADD COLUMN IF NOT EXISTS volume_alvo numeric,
ADD COLUMN IF NOT EXISTS unidade_volume text DEFAULT 'km';
