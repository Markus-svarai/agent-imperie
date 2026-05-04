/**
 * enrich-lead — søker etter telefonnummer og kontaktperson for et lead.
 * Bruker Tavily raw results + regex for norske telefonnumre.
 * Kalles av /api/leads/[id]/enrich og av Nova etter storeLead.
 */

import { tavily } from "@tavily/core";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// Norske telefonnumre: 8 siffer, evt. med +47 / 0047 foran, ulike mellomrom/bindestrek
const PHONE_RE =
  /(?:\+47|0047)?[\s-]?(?:\(?\d{2,3}\)?[\s-]?)?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/g;

// Ord som indikerer at nummeret er et telefonnummer
const PHONE_CONTEXT_RE =
  /(?:tlf|telefon|ring|mobil|kontakt|call|phone|tel)[.:)]*\s*([+\d][\d\s\-().]{6,})/gi;

function extractPhones(text: string): string[] {
  const found = new Set<string>();

  // Kontekst-match er mest pålitelig
  let m: RegExpExecArray | null;
  const ctx = new RegExp(PHONE_CONTEXT_RE.source, "gi");
  while ((m = ctx.exec(text)) !== null) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 8 || digits.length === 10 || digits.length === 12) {
      found.add(m[1].trim());
    }
  }

  // Fall back til rå regex
  const raw = text.match(PHONE_RE) ?? [];
  for (const r of raw) {
    const digits = r.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 12) {
      found.add(r.trim());
    }
  }

  return [...found].slice(0, 3);
}

// Enkel formatering: 8 siffer → "XXX XX XXX"
function formatNorwegian(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0047/, "").replace(/^47/, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  }
  return raw.trim();
}

export interface EnrichResult {
  phone: string | null;
  contactName: string | null;
  source: string | null;
}

export async function enrichLeadContact(input: {
  companyName: string;
  location?: string | null;
  specialty?: string | null;
}): Promise<EnrichResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { phone: null, contactName: null, source: null };

  const client = tavily({ apiKey });
  const q = `${input.companyName} ${input.location ?? ""} telefon kontakt`.trim();

  try {
    const res = await client.search(q, {
      maxResults: 5,
      days: 365,
      includeAnswer: false,
    });

    const allText = res.results?.map((r) => `${r.title}\n${r.content}`).join("\n") ?? "";
    const phones = extractPhones(allText);
    const phone = phones[0] ? formatNorwegian(phones[0]) : null;

    // Prøv å finne kontaktnavn (daglig leder / leder / eier)
    const nameMatch = allText.match(
      /(?:daglig leder|leder|eier|kontakt|klinikksjef|behandler)[:\s]+([A-ZÆØÅ][a-zæøå]+(?:\s[A-ZÆØÅ][a-zæøå]+)?)/
    );
    const contactName = nameMatch?.[1] ?? null;
    const source = res.results?.[0]?.url ?? null;

    return { phone, contactName, source };
  } catch {
    return { phone: null, contactName: null, source: null };
  }
}

/** Kjør enrichment og oppdater lead direkte i DB */
export async function enrichAndUpdateLead(leadId: string): Promise<EnrichResult> {
  const lead = await db.query.leads.findFirst({
    where: eq(schema.leads.id, leadId),
    columns: { companyName: true, location: true, specialty: true, phone: true, contactName: true },
  });

  if (!lead) return { phone: null, contactName: null, source: null };

  const result = await enrichLeadContact({
    companyName: lead.companyName ?? "",
    location: lead.location,
    specialty: lead.specialty,
  });

  // Oppdater kun tomme felter — ikke overstyr det Markus har lagt inn manuelt
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (result.phone && !lead.phone) update.phone = result.phone;
  if (result.contactName && !lead.contactName) update.contactName = result.contactName;

  if (Object.keys(update).length > 1) {
    await db.update(schema.leads).set(update).where(eq(schema.leads.id, leadId));
  }

  return result;
}
