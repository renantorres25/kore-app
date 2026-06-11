-- Tipos de sessão por modalidade
CREATE TYPE modalidade_treino AS ENUM
  ('corrida', 'bike', 'natacao', 'musculacao', 'descanso', 'outro');

CREATE TYPE tipo_sessao AS ENUM
  ('continuo', 'intervalado', 'longo', 'regenerativo',
   'fartlek', 'ritmo', 'tecnico', 'forca', 'livre');

-- Sessão prescrita pelo coach
CREATE TABLE IF NOT EXISTS sessoes_prescritas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  atleta_id       uuid NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  data            date NOT NULL,
  modalidade      modalidade_treino NOT NULL,
  tipo_sessao     tipo_sessao,
  duracao_min     integer,
  distancia_km    numeric(6,2),
  observacao      text,
  status          text NOT NULL DEFAULT 'planejado'
                  CHECK (status IN ('planejado','concluido','cancelado','parcial')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Blocos da sessão (aquecimento, principal, desaquecimento)
CREATE TABLE IF NOT EXISTS blocos_sessao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id       uuid NOT NULL REFERENCES sessoes_prescritas(id) ON DELETE CASCADE,
  ordem           integer NOT NULL DEFAULT 1,
  nome            text NOT NULL, -- 'Aquecimento', 'Principal', 'Desaquecimento'
  duracao_min     integer,
  distancia_km    numeric(6,2),
  repeticoes      integer,       -- para intervalados (ex: 6x1km)
  zona_fc         text,          -- 'Z1'|'Z2'|'Z3'|'Z4'|'Z5'
  fc_min          integer,       -- calculado a partir do fcmax do atleta
  fc_max          integer,
  pace_alvo       text,          -- ex: '5:30/km'
  ftp_pct         integer,       -- % do FTP para bike (ex: 75)
  watts_alvo      integer,       -- calculado a partir do FTP
  observacao      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessoes_atleta_data
  ON sessoes_prescritas (atleta_id, data);
CREATE INDEX IF NOT EXISTS idx_sessoes_coach
  ON sessoes_prescritas (coach_id);
CREATE INDEX IF NOT EXISTS idx_blocos_sessao
  ON blocos_sessao (sessao_id, ordem);

-- RLS
ALTER TABLE sessoes_prescritas ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocos_sessao ENABLE ROW LEVEL SECURITY;

-- Coach pode ler e escrever as sessões dos seus atletas
CREATE POLICY sessoes_coach_all ON sessoes_prescritas
  FOR ALL USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Atleta pode ler suas próprias sessões
CREATE POLICY sessoes_atleta_read ON sessoes_prescritas
  FOR SELECT USING (atleta_id = auth.uid());

-- Blocos seguem as sessões
CREATE POLICY blocos_coach_all ON blocos_sessao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessoes_prescritas s
      WHERE s.id = blocos_sessao.sessao_id
      AND s.coach_id = auth.uid()
    )
  );

CREATE POLICY blocos_atleta_read ON blocos_sessao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessoes_prescritas s
      WHERE s.id = blocos_sessao.sessao_id
      AND s.atleta_id = auth.uid()
    )
  );
