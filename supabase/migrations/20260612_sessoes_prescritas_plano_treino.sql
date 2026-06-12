ALTER TABLE sessoes_prescritas
ADD COLUMN IF NOT EXISTS plano_treino_id uuid REFERENCES treinos(id) ON DELETE SET NULL;
