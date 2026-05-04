-- Legg til "bounced" i lead_status enum
-- Kjør i Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rxeofhcdkeyrutethbfw/sql/new

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'bounced';
