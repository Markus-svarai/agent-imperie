/**
 * seed-test-lead.mjs
 * Lager ett test-lead med Markus sin Gmail for å verifisere full inbound-flow.
 * Kjør: node scripts/seed-test-lead.mjs
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.rxeofhcdkeyrutethbfw:qukjux-8viZka-nycxat@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEST_EMAIL = "markus08aasheim@gmail.com";

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function run() {
  // Sjekk om lead allerede finnes
  const existing = await sql`
    SELECT id, status FROM leads
    WHERE org_id = ${ORG_ID}
      AND LOWER(email) = LOWER(${TEST_EMAIL})
    LIMIT 1
  `;

  if (existing.length > 0) {
    console.log(`⏭️  Test-lead finnes allerede: id=${existing[0].id} status=${existing[0].status}`);

    // Reset til "contacted" så inbound-flow oppdaterer til "replied"
    await sql`
      UPDATE leads
      SET status = 'contacted',
          last_contacted_at = NOW() - INTERVAL '1 day',
          updated_at = NOW()
      WHERE id = ${existing[0].id}
    `;
    console.log(`🔄 Resatt til status=contacted for å teste status-bump → replied`);
    await sql.end();
    return;
  }

  // Sett inn nytt test-lead
  const result = await sql`
    INSERT INTO leads (
      org_id, company_name, contact_name, email,
      specialty, location, status, source,
      fit_score, notes, last_contacted_at,
      created_at, updated_at
    ) VALUES (
      ${ORG_ID},
      'Markus Test Klinikk',
      'Markus Aasheim',
      ${TEST_EMAIL},
      'tannlege',
      'Moss',
      'contacted',
      'manual',
      8,
      'Testlead for å verifisere full inbound-flow. Slett etter testing.',
      NOW() - INTERVAL '1 day',
      NOW(), NOW()
    )
    RETURNING id, company_name, email, status
  `;

  const lead = result[0];
  console.log(`✅ Test-lead opprettet:`);
  console.log(`   ID:      ${lead.id}`);
  console.log(`   Klinikk: ${lead.company_name}`);
  console.log(`   E-post:  ${lead.email}`);
  console.log(`   Status:  ${lead.status}`);
  console.log(`\n📧 Send nå en e-post til test@replies.svarai.no fra ${TEST_EMAIL}`);
  console.log(`   Forventet flow:`);
  console.log(`   1. Resend mottar e-post`);
  console.log(`   2. Webhook matcher lead: ${lead.id}`);
  console.log(`   3. Lead-status bumpes: contacted → replied`);
  console.log(`   4. Inngest mottar email.received`);
  console.log(`   5. Titan trigges med leadId=${lead.id}`);
  console.log(`   6. Titan leser e-post + sender oppfølging + oppdaterer status`);

  await sql.end();
}

run().catch((err) => {
  console.error("Feil:", err);
  process.exit(1);
});
