-- Add last_trade_sync_at to track when trade history was last synced from MetaAPI
ALTER TABLE metaapi_connections
  ADD COLUMN IF NOT EXISTS last_trade_sync_at TIMESTAMPTZ;
