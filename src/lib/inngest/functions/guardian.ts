import { inngest } from "../client";

interface HealthCheck {
  name: string;
  url: string;
  status: "ok" | "feil";
  responseMs: number | null;
  httpStatus: number | null;
  error?: string;
}

async function sjekkEndepunkt(name: string, url: string): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    return {
      name,
      url,
      status: res.ok ? "ok" : "feil",
      responseMs: Date.now() - start,
      httpStatus: res.status,
    };
  } catch (err) {
    return {
      name,
      url,
      status: "feil",
      responseMs: Date.now() - start,
      httpStatus: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const guardianHealthCheck = inngest.createFunction(
  {
    id: "guardian-health-check",
    name: "Guardian · Helsesjekk",
    // Maks 1 alert per 2 timer — forhindrer spam hvis appen er nede over tid
    rateLimit: {
      event: "guardian/alert",
      limit: 1,
      period: "2h",
    },
  },
  // Kl. 08:00 og 20:00 hver dag (norsk tid ≈ UTC+2 sommertime)
  { cron: "0 6,18 * * *" },
  async ({ step }) => {
    const checks = await step.run("sjekk-endepunkter", async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // Bruk /api/health — lett endepunkt uten DB-avhengighet.
      // /api/dashboard/stats ga falske positiver ved Supabase-latens.
      const resultater = await Promise.all([
        sjekkEndepunkt("App", `${appUrl}/api/health`),
      ]);

      return resultater;
    });

    const feil = checks.filter((c) => c.status === "feil");
    const alleOk = feil.length === 0;

    if (!alleOk) {
      await step.run("send-varsel", async () => {
        await inngest.send({
          name: "guardian/alert",
          data: {
            severity: "high",
            feil,
            timestamp: new Date().toISOString(),
            melding: `⚠️ Guardian oppdaget ${feil.length} feil: ${feil.map((f) => f.name).join(", ")}`,
          },
        });
        console.error(
          "[Guardian] VARSEL:",
          feil.map((f) => `${f.name} — ${f.error ?? f.httpStatus}`).join(", ")
        );
      });
    }

    return {
      timestamp: new Date().toISOString(),
      status: alleOk ? "ok" : "feil",
      checks,
      varsler: feil.length,
      melding: alleOk
        ? `Alle ${checks.length} systemer er oppe`
        : `${feil.length} av ${checks.length} systemer har feil`,
    };
  }
);
