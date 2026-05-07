/**
 * find-clinics — Nova sitt prospekteringsverktøy.
 *
 * Søker etter norske klinikker via Tavily og returnerer
 * strukturerte leads som kan lagres i databasen.
 */

import { search } from "./search";
import { db, schema } from "@/lib/db";
import { eq, and, or, isNull, lte } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export interface ClinicLead {
  companyName: string;
  specialty: string;
  location: string;
  website?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  fitScore: number;
  painPoint: string;
  approachAngle: string;
}

export interface FindClinicsInput {
  specialty: string; // "tannlege" | "lege" | "hudklinikk" | "fysioterapi"
  location: string;  // "Oslo" | "Bergen" | "Trondheim" etc.
  maxResults?: number;
}

/** Search for Norwegian clinics and return raw results */
export async function searchClinics(input: FindClinicsInput): Promise<string> {
  const { specialty, location, maxResults = 5 } = input;

  const queries = await Promise.allSettled([
    search(`${specialty} klinikk ${location} kontakt nettside`, { maxResults, days: 90 }),
    search(`${specialty} ${location} booking time bestilling`, { maxResults: 3, days: 90 }),
    search(`${specialty} klinikk ${location} site:no`, { maxResults: 3, days: 90 }),
  ]);

  const results = queries
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string>).value)
    .join("\n\n---\n\n");

  return results || "(ingen resultater)";
}

/** Store a lead in the DB if it doesn't already exist (by email or companyName) */
export async function storeLead(lead: ClinicLead): Promise<string> {
  try {
    // Check for duplicate
    if (lead.email) {
      const existing = await db.query.leads.findFirst({
        where: and(
          eq(schema.leads.orgId, DEFAULT_ORG_ID),
          eq(schema.leads.email, lead.email)
        ),
      });
      if (existing) return existing.id;
    }

    const [inserted] = await db
      .insert(schema.leads)
      .values({
        orgId: DEFAULT_ORG_ID,
        companyName: lead.companyName,
        contactName: lead.contactName,
        specialty: lead.specialty,
        location: lead.location,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
        fitScore: lead.fitScore,
        notes: `Smertepunkt: ${lead.painPoint}\nInngangsvinkel: ${lead.approachAngle}`,
        source: "nova",
        status: "new",
      })
      .returning({ id: schema.leads.id });

    return inserted.id;
  } catch (err) {
    console.error("[storeLead] Feil:", err);
    return "error";
  }
}

/** Get all new leads ready for Hermes to contact.
 * Ekskluderer leads kontaktet de siste 5 dagene som sikkerhetsventil
 * hvis status ikke ble oppdatert korrekt etter forrige sending. */
export async function getNewLeads(limit = 10) {
  return db.query.leads.findMany({
    where: and(
      eq(schema.leads.orgId, DEFAULT_ORG_ID),
      eq(schema.leads.status, "new"),
      // Aldri kontakt leads som allerede har fått e-post
      eq(schema.leads.outreachCount, 0),
    ),
    orderBy: (leads, { desc }) => [desc(leads.fitScore)],
    limit,
  });
}

/** Leads som har fått første e-post men ikke oppfølger ennå */
export async function getLeadsForFollowUp(limit = 10) {
  return db.query.leads.findMany({
    where: and(
      eq(schema.leads.orgId, DEFAULT_ORG_ID),
      eq(schema.leads.status, "contacted"),
      eq(schema.leads.outreachCount, 1),
    ),
    orderBy: (leads, { asc }) => [asc(leads.lastContactedAt)],
    limit,
  });
}

/**
 * Pipeline stats — brukes av alle salgsagenter for å starte med riktig kontekst.
 * Returnerer formatert tekststreng klar til å injiseres i agent-rapporter.
 */
export async function getPipelineStats(): Promise<string> {
  const allLeads = await db.query.leads.findMany({
    where: eq(schema.leads.orgId, DEFAULT_ORG_ID),
  });

  if (allLeads.length === 0) {
    return `📊 PIPELINE-STATUS (${new Date().toLocaleDateString("nb-NO")}):
Totalt: 0 leads i databasen
Status: Pre-pipeline — ingen leads registrert ennå
Fase: Tidlig pilot — søker etter de første 2-3 testklinikker`;
  }

  const byStatus = allLeads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.status] = (acc[lead.status] ?? 0) + 1;
    return acc;
  }, {});

  const customers = byStatus["customer"] ?? 0;
  const demoBooked = byStatus["demo_booked"] ?? 0;
  const interested = byStatus["interested"] ?? 0;
  const replied = byStatus["replied"] ?? 0;
  const contacted = byStatus["contacted"] ?? 0;
  const newLeads = byStatus["new"] ?? 0;
  const notInterested = byStatus["not_interested"] ?? 0;

  const lines = [
    `📊 PIPELINE-STATUS (${new Date().toLocaleDateString("nb-NO")}):`,
    `Totalt: ${allLeads.length} leads`,
    customers > 0 ? `✅ Kunder (pilot aktiv): ${customers}` : `✅ Kunder: 0 — søker første pilotkllinikk`,
    demoBooked > 0 ? `🗓️  Demo booket: ${demoBooked}` : null,
    interested > 0 ? `🔥 Interesserte: ${interested}` : null,
    replied > 0 ? `💬 Svart: ${replied}` : null,
    contacted > 0 ? `📧 Kontaktet: ${contacted}` : null,
    newLeads > 0 ? `🆕 Nye (ikke kontaktet): ${newLeads}` : null,
    notInterested > 0 ? `❌ Ikke interessert: ${notInterested}` : null,
    customers === 0
      ? `\n🎯 MÅL: Få inn 2-3 pilotklinikker som tester SvarAI gratis`
      : `\n🎯 MÅL: Konvertere piloter til betalende kunder`,
  ].filter(Boolean).join("\n");

  return lines;
}
