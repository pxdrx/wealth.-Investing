-- =============================================================================
-- Script de auditoria do schema Supabase (banco real)
-- Executar no Supabase Dashboard → SQL Editor
-- Objetivo: preencher o relatório docs/AUDIT-SUPABASE-REAL-DATABASE.md
-- =============================================================================

-- 1) Colunas por tabela (public schema)
SELECT
  table_name,
  column_name,
  ordinal_position,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'accounts',
    'prop_accounts',
    'journal_trades',
    'prop_payouts',
    'wallet_transactions',
    'ingestion_logs'
  )
ORDER BY table_name, ordinal_position;

-- 2) Colunas com default e journal_trades.net_pnl_usd (para auditoria de generated/default)
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
  AND (c.column_name = 'net_pnl_usd' OR c.column_default IS NOT NULL)
ORDER BY c.table_name, c.ordinal_position;

-- 3) Primary keys e unique constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, kcu.ordinal_position;

-- 4) Foreign keys
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

-- 5) Índices (pg_indexes)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
ORDER BY tablename, indexname;

-- 6) RLS habilitado por tabela
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND relname IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
ORDER BY relname;

-- 7) Policies (RLS)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
ORDER BY tablename, policyname;

-- 8) Triggers (útil para net_pnl_usd ou outros defaults)
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
ORDER BY event_object_table, trigger_name;

-- 9) Resumo: tabelas existentes no public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles', 'accounts', 'prop_accounts', 'journal_trades',
    'prop_payouts', 'wallet_transactions', 'ingestion_logs'
  )
ORDER BY table_name;
