/**
 * Migration: add system_enabled column to orgs table
 * Run: node scripts/migrate-kill-switch.mjs
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log("Adding system_enabled to orgs...");
  await sql`
    ALTER TABLE orgs
    ADD COLUMN IF NOT EXISTS system_enabled boolean NOT NULL DEFAULT true;
  `;
  console.log("✅ system_enabled added (default: true — system is active)");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
