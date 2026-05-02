/**
 * migrate-phase7.mjs — Phase 7: The Brain
 * Legger til agent_memory, strategy_proposals, og no_reply lead-status.
 * Kjør: node scripts/migrate-phase7.mjs
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.rxeofhcdkeyrutethbfw:qukjux-8viZka-nycxat@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function run() {
  console.log("🚀 Phase 7 migration...\n");

  // 1. Add no_reply to lead_status enum
  try {
    await sql`ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'no_reply'`;
    console.log("✅ lead_status enum: added 'no_reply'");
  } catch (e) {
    console.log("⏭️  lead_status 'no_reply' already exists");
  }

  // 2. Create agent_memory table
  await sql`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      agent_id    TEXT NOT NULL,
      key         TEXT NOT NULL,
      value       JSONB NOT NULL,
      confidence  NUMERIC(3,2) DEFAULT 1.0,
      source_run_id UUID,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (org_id, agent_id, key)
    )
  `;
  console.log("✅ agent_memory table created");

  await sql`CREATE INDEX IF NOT EXISTS memory_agent_idx ON agent_memory(agent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS memory_org_agent_key_idx ON agent_memory(org_id, agent_id, key)`;

  // 3. Create strategy_proposals table
  await sql`
    CREATE TABLE IF NOT EXISTS strategy_proposals (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      created_by  TEXT NOT NULL,
      run_id      UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
      title       TEXT NOT NULL,
      summary     TEXT NOT NULL,
      proposals   JSONB DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("✅ strategy_proposals table created");

  await sql`CREATE INDEX IF NOT EXISTS proposals_org_idx ON strategy_proposals(org_id)`;
  await sql`CREATE INDEX IF NOT EXISTS proposals_status_idx ON strategy_proposals(status)`;
  await sql`CREATE INDEX IF NOT EXISTS proposals_created_idx ON strategy_proposals(created_at DESC)`;

  console.log("\n✅ Phase 7 migration complete!");
  await sql.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
