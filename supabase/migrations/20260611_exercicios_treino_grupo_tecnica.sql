ALTER TABLE exercicios_treino
ADD COLUMN IF NOT EXISTS grupo_muscular text,
ADD COLUMN IF NOT EXISTS tecnica text;
