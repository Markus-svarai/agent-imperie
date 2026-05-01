/**
 * find-clinics — Nova sitt prospekteringsverktøy.
 *
 * Søker etter norske klinikker via Tavily og returnerer
 * strukturerte leads som kan lagres i databasen.
 */

import { search } from "./search";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export interface ClinicLead {
  companyName: string;
  specialty: string;
  location: string;
  website?: string;
  email?: string;
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
        specialty: lead.specialty,
        location: lead.location,
        website: lead.website,
        email: lead.email,
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

/** Get all new leads ready for Hermes to contact */
export async function getNewLeads(limit = 10) {
  return db.query.leads.findMany({
    where: and(
      eq(schema.leads.orgId, DEFAULT_ORG_ID),
      eq(schema.leads.status, "new")
    ),
    orderBy: (leads, { desc }) => [desc(leads.fitScore)],
    limit,
  });
}
