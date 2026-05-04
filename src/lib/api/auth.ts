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

// ─── In-memory rate limiter for trigger endpoint ───────────────────────────
// Simple per-agent cooldown: max 1 manual trigger per agent per 60 seconds.
// Resets on redeploy — good enough for a single-operator dashboard.

const lastTrigger = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 60 seconds

/**
 * Returns a 429 response if the agent was triggered within the cooldown window,
 * otherwise records the trigger time and returns null (allow).
 */
export function checkRateLimit(agentId: string): NextResponse | null {
  const now = Date.now();
  const last = lastTrigger.get(agentId) ?? 0;
  const elapsed = now - last;

  if (elapsed < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return NextResponse.json(
      { error: `For mange forespørsler. Prøv igjen om ${retryAfter} sekunder.` },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  lastTrigger.set(agentId, now);
  return null;
}
