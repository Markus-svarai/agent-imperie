import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lett helsesjekk-endepunkt for Guardian — ingen DB-query, alltid rask.
// Guardian bruker dette i stedet for /api/dashboard/stats for å unngå
// falske positiver ved DB-latens eller Supabase-nedtid.
export async function GET() {
  return NextResponse.json(
    { ok: true, ts: new Date().toISOString() },
    { status: 200 }
  );
}
