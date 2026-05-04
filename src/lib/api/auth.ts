/**
 * API auth helper for internal dashboard routes.
 *
 * Strategy: check for DASHBOARD_SECRET env var.
 * If set, every request must include `Authorization: Bearer <secret>` header.
 * If not set (local dev), all requests pass through.
 *
 * Vercel: add DASHBOARD_SECRET in Environment Variables.
 * Frontend: pass it via NEXT_PUBLIC_DASHBOARD_SECRET (set to same value).
 */

import { NextRequest, NextResponse } from "next/server";

export function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) return null; // No secret configured — allow all (local dev)

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return null; // Authorized

  return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
}
