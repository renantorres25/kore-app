-- Adiciona status calculados de aderência ao enum de status de sessoes_prescritas
ALTER TABLE sessoes_prescritas DROP CONSTRAINT sessoes_prescritas_status_check;

ALTER TABLE sessoes_prescritas ADD CONSTRAINT sessoes_prescritas_status_check
  CHECK (status IN ('planejado', 'concluido', 'cancelado', 'parcial', 'nao_realizado', 'realizado_sem_planejamento'));
