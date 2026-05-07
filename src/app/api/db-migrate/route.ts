/**
 * Kjøres én gang for å legge til nye kolonner i leads-tabellen.
 * POST /api/db-migrate
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Legg til outreach_count hvis den ikke finnes
    await db.execute(sql`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS outreach_count integer NOT NULL DEFAULT 0;
    `);

    // Legg til called_at hvis den ikke finnes
    await db.execute(sql`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS called_at timestamp;
    `);

    // Legg til follow_up_scheduled_at hvis den ikke finnes
    await db.execute(sql`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS follow_up_scheduled_at timestamp;
    `);

    // Sett outreach_count = 1 for leads som allerede er kontaktet
    // (de har fått én e-post men kolonnen er ny og er 0)
    await db.execute(sql`
      UPDATE leads
      SET outreach_count = 1
      WHERE status IN ('contacted', 'replied', 'interested', 'demo_booked', 'no_reply')
      AND outreach_count = 0;
    `);

    return NextResponse.json({ ok: true, message: "Migrering fullført" });
  } catch (err) {
    console.error("[db-migrate]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
