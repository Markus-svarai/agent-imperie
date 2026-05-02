/**
 * seed-manual-leads.mjs
 * Legger inn alle klinikkene Markus allerede har kontaktet manuelt.
 * Kjør: node scripts/seed-manual-leads.mjs
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.rxeofhcdkeyrutethbfw:qukjux-8viZka-nycxat@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

const sql = postgres(DATABASE_URL, { ssl: "require" });

const leads = [
  // ── MOSS ────────────────────────────────────────────────────────────────
  {
    companyName: "NEMUS Moss",
    specialty: "tverrfaglig",
    location: "Moss",
    status: "interested",
    fitScore: 9,
    source: "manual",
    contactName: "Hans Jørgen",
    painPoint: "Behandler pasienter hele dagen — taper samtaler mellom behandlinger",
    notes: "Hans Jørgen er veldig interessert. Ring mandag formiddag for å booke demo. Varm lead — prioriter.",
  },
  {
    companyName: "Vestby Tverrfaglige Klinikk",
    specialty: "tverrfaglig",
    location: "Vestby",
    status: "interested",
    fitScore: 9,
    source: "manual",
    painPoint: "Tverrfaglig klinikk med høy bookingtrafikk — trenger AI-resepsjonist",
    notes: "Veldig positive, venter på tilbakemelding fra oss. Følg opp snarest.",
  },
  {
    companyName: "Park Fysioterapi",
    specialty: "fysioterapi",
    location: "Moss",
    status: "contacted",
    fitScore: 8,
    source: "manual",
    painPoint: "Fysioterapeut — svarer telefonen mellom behandlinger, mister samtaler",
    notes: "Ba om at vi ringer tilbake. Ring mandag før kl. 12. Påminnelse satt i Cowork.",
  },
  {
    companyName: "Ekholt Fysioterapi",
    specialty: "fysioterapi",
    location: "Moss",
    status: "contacted",
    fitScore: 8,
    source: "manual",
    painPoint: "Fysioterapi — høy telefontrafikk, ingen dedikert resepsjonist",
    notes: "Sendte melding. Ingen respons ennå — følg opp.",
  },
  {
    companyName: "Tannverket Moss",
    specialty: "tannlege",
    location: "Moss",
    status: "contacted",
    fitScore: 6,
    email: "post@tannverketmoss.no",
    phone: "69 25 46 86",
    source: "manual",
    painPoint: "Ba om e-post etter telefonsamtale",
    notes: "Ba om mail. Send oppfølging til post@tannverketmoss.no. NB: tannlege er ikke primær ICP.",
  },
  {
    companyName: "OC Tannlegene Klette og Race",
    specialty: "tannlege",
    location: "Moss",
    status: "contacted",
    fitScore: 6,
    source: "manual",
    contactName: "Inger",
    painPoint: "E-post sendt — ukjent respons",
    notes: "E-post sendt til Inger. Venter på svar. NB: tannlege er ikke primær ICP.",
  },

  // ── FREDRIKSTAD ─────────────────────────────────────────────────────────
  {
    companyName: "Brogaten Fysioterapi",
    specialty: "fysioterapi",
    location: "Fredrikstad",
    website: "https://www.brogatenfysioterapi.no",
    status: "contacted",
    fitScore: 8,
    source: "manual",
    painPoint: "Fysioterapi — svarer telefon mellom pasienter, trolig høy no-show",
    notes: "Ba om at vi ringer tilbake mandag. Ring mandag før kl. 12. Påminnelse satt i Cowork.",
  },
  {
    companyName: "Kapabel Helse",
    specialty: "kiropraktor",
    location: "Fredrikstad",
    website: "https://www.kapabelhelse.no/fredrikstad",
    phone: "461 21 770",
    status: "contacted",
    fitScore: 8,
    source: "manual",
    painPoint: "Kiropraktor + fysio — høy bookingtrafikk, ingen resepsjonist",
    notes: "Ba om mail. Ingen offentlig e-post funnet — ring for å få e-postadresse.",
  },
  {
    companyName: "Villa Helse",
    specialty: "fysioterapi",
    location: "Fredrikstad",
    phone: "97 27 96 10",
    status: "contacted",
    fitScore: 7,
    source: "manual",
    painPoint: "Fysioterapi med kommunal avtale — høy pasienttrafikk",
    notes: "Ba om mail. Ingen offentlig e-post funnet — ring for å få e-postadresse.",
  },
  {
    companyName: "MSK Klinikken",
    specialty: "fysioterapi",
    location: "Fredrikstad",
    status: "new",
    fitScore: 7,
    source: "manual",
    painPoint: "Muskel/skjelett-klinikk — typisk høy telefontrafikk",
    notes: "Mangler godt telefonnummer. Finn kontaktinfo og ta kontakt.",
  },
  {
    companyName: "Fredrikstad Rygg og Leddsenter",
    specialty: "fysioterapi",
    location: "Fredrikstad",
    status: "contacted",
    fitScore: 6,
    source: "manual",
    painPoint: "Spesialist rygg/ledd — trolig selvstendig praktiker",
    notes: "Svarte ikke. Redd for AI. Kan prøve igjen med mer trygghetsskapende tilnærming.",
  },
  {
    companyName: "Alfa Kiropraktikk",
    specialty: "kiropraktor",
    location: "Fredrikstad",
    status: "contacted",
    fitScore: 7,
    source: "manual",
    painPoint: "Kiropraktor — svarer telefon mellom behandlinger",
    notes: "Svarte ikke. Prøv igjen eller send e-post.",
  },
  {
    companyName: "Armstrongklinikken",
    specialty: "tverrfaglig",
    location: "Fredrikstad",
    status: "contacted",
    fitScore: 7,
    source: "manual",
    painPoint: "Ukjent — tverrfaglig klinikk",
    notes: "Uklart utfall fra første kontakt. Følg opp for å avklare interesse.",
  },
];

async function run() {
  console.log(`\n🚀 Inserter ${leads.length} manuelt kontaktede klinikker...\n`);

  let inserted = 0;
  let skipped = 0;

  for (const lead of leads) {
    // Sjekk om lead allerede eksisterer
    const existing = await sql`
      SELECT id FROM leads
      WHERE org_id = ${ORG_ID}
        AND LOWER(company_name) = LOWER(${lead.companyName})
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`⏭️  Allerede i DB: ${lead.companyName}`);
      skipped++;
      continue;
    }

    await sql`
      INSERT INTO leads (
        org_id, company_name, specialty, location,
        website, email, phone, contact_name,
        status, source, fit_score, notes,
        created_at, updated_at
      ) VALUES (
        ${ORG_ID},
        ${lead.companyName},
        ${lead.specialty},
        ${lead.location},
        ${lead.website ?? null},
        ${lead.email ?? null},
        ${lead.phone ?? null},
        ${lead.contactName ?? null},
        ${lead.status},
        ${lead.source},
        ${lead.fitScore},
        ${`Smertepunkt: ${lead.painPoint}\n\n${lead.notes}`},
        NOW(), NOW()
      )
    `;

    const icon = lead.status === "interested" ? "🔥" : lead.status === "contacted" ? "📧" : "🆕";
    console.log(`${icon} Lagt til: ${lead.companyName} (${lead.location}) — ${lead.status}`);
    inserted++;
  }

  console.log(`\n✅ Ferdig! ${inserted} lagt til, ${skipped} allerede i DB.`);
  console.log(`\n📊 Pipeline-oversikt:`);

  const stats = await sql`
    SELECT status, COUNT(*) as count
    FROM leads
    WHERE org_id = ${ORG_ID}
    GROUP BY status
    ORDER BY count DESC
  `;

  for (const row of stats) {
    console.log(`   ${row.status}: ${row.count}`);
  }

  await sql.end();
}

run().catch((err) => {
  console.error("Feil:", err);
  process.exit(1);
});
