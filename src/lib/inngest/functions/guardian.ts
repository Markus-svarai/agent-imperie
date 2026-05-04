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
      signal: AbortSignal.timeout(5000), // 5 sekunder timeout
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
  },
  { cron: "*/30 * * * *" },
  async ({ step, event }) => {
    // Steg 1: Sjekk alle endepunkter
    const checks = await step.run("sjekk-endepunkter", async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // NOTE: /api/inngest only handles POST (Inngest SDK), not GET.
      // Use /api/dashboard/stats as a proper GET health endpoint instead.
      const resultater = await Promise.all([
        sjekkEndepunkt("App", appUrl),
        sjekkEndepunkt("Dashboard API", `${appUrl}/api/dashboard/stats`),
      ]);

      return resultater;
    });

    // Steg 2: Finn feil
    const feil = checks.filter((c) => c.status === "feil");
    const alleOk = feil.length === 0;

    // Steg 3: Send varsel hvis noe er nede
    if (!alleOk) {
      await step.run("send-varsel", async () => {
        // Send event til Inngest — kan brukes til å trigge Jarvis eller notifikasjoner
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
