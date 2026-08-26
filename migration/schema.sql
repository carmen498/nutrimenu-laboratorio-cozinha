-- REPRESENTAÇÃO PORTÁVEL INFERIDA, NÃO É O DDL FÍSICO DO BASE44.
-- PostgreSQL 15+ é uma sugestão, não tecnologia atual confirmada.
-- O payload JSONB preserva campos até gerar DDL coluna-a-coluna de TODOS os JSONC.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS labcozinha;

CREATE TABLE IF NOT EXISTS labcozinha.records (
  entity_name text NOT NULL,
  id text NOT NULL,
  created_date timestamptz,
  updated_date timestamptz,
  created_by_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_checksum text,
  PRIMARY KEY (entity_name, id)
);
CREATE INDEX IF NOT EXISTS records_creator_idx ON labcozinha.records(entity_name, created_by_id);
CREATE INDEX IF NOT EXISTS records_payload_gin ON labcozinha.records USING gin(payload);

CREATE TABLE IF NOT EXISTS labcozinha.id_map (
  entity_name text NOT NULL,
  source_id text NOT NULL,
  target_id text NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(entity_name, source_id),
  UNIQUE(entity_name, target_id)
);

CREATE TABLE IF NOT EXISTS labcozinha.migration_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  source_count bigint,
  target_count bigint,
  source_checksum text,
  target_checksum text,
  status text NOT NULL CHECK(status IN ('started','validated','failed','rolled_back')),
  notes text
);
COMMIT;

-- AÇÃO NECESSÁRIA antes de produção:
-- 1) gerar tabelas tipadas a partir de base44/entities/*.jsonc;
-- 2) validar dados legados antes de NOT NULL/enums;
-- 3) criar FKs e índices baseados em planos de consulta;
-- 4) implementar RLS equivalente usando o identity provider destino;
-- 5) substituir esta camada de preservação ou mantê-la apenas como staging de importação.