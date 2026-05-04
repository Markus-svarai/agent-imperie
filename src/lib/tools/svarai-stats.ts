/**
 * SvarAI stats tool — gir agenter i Agent Imperie tilgang til ekte bookingdata,
 * samtaledata og klinikkdata fra SvarAI-produktet.
 *
 * Forutsetter at begge apper peker på samme Supabase-prosjekt.
 */

import { db, schema } from "@/lib/db";
import { gte, eq, and, count, sql } from "drizzle-orm";

/** Hent bookingstatistikk for siste N dager */
export async function getBookingStats(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const bookings = await db
    .select()
    .from(schema.svaraiBookings)
    .where(gte(schema.svaraiBookings.createdAt, since))
    .orderBy(schema.svaraiBookings.createdAt);

  const total = bookings.length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  // Gruppert per klinikk
  const perClinic: Record<string, number> = {};
  for (const b of bookings) {
    perClinic[b.clinicId] = (perClinic[b.clinicId] ?? 0) + 1;
  }

  // Gruppert per tjeneste
  const perService: Record<string, number> = {};
  for (const b of bookings) {
    const svc = b.serviceName ?? "Ukjent";
    perService[svc] = (perService[svc] ?? 0) + 1;
  }

  // Daglig trend — siste 7 dager
  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);
  const dailyTrend = bookings
    .filter((b) => b.createdAt >= last7)
    .reduce<Record<string, number>>((acc, b) => {
      const day = b.createdAt.toISOString().slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

  return {
    periode: `siste ${days} dager`,
    totalt: total,
    bekreftet: confirmed,
    venter: pending,
    avlyst: cancelled,
    konverteringsrate: total > 0 ? Math.round((confirmed / total) * 100) + "%" : "0%",
    perKlinikk: perClinic,
    perTjeneste: perService,
    dagligTrend: dailyTrend,
  };
}

/** Hent samtalestatistikk (AI-resepsjonist) */
export async function getConversationStats(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const convs = await db
    .select()
    .from(schema.svaraiConversations)
    .where(gte(schema.svaraiConversations.createdAt, since));

  const total = convs.length;
  const endedInBooking = convs.filter((c) => c.endedInBooking).length;
  const unanswered = convs.filter((c) => c.hasUnanswered).length;
  const bookingRate = total > 0 ? Math.round((endedInBooking / total) * 100) : 0;

  // Gjennomsnittlig antall meldinger per samtale
  const avgMessages =
    total > 0
      ? Math.round(
          convs.reduce((sum, c) => sum + (c.messages as unknown[]).length, 0) / total
        )
      : 0;

  return {
    periode: `siste ${days} dager`,
    totaltSamtaler: total,
    endreSomBooking: endedInBooking,
    bookingRate: bookingRate + "%",
    ubesvarteSpørsmål: unanswered,
    gjennomsnittligeMeldinger: avgMessages,
  };
}

/** Hent alle aktive klinikker */
export async function getActiveClinics() {
  const clinics = await db.select().from(schema.svaraiClinics);
  return clinics.map((c) => ({
    id: c.id,
    navn: c.name,
    type: c.type,
    by: c.addressCity,
    telefon: c.contactPhone,
    epost: c.contactEmail,
  }));
}

/** Full oversikt — brukes av Rex og Lens */
export async function getSvarAIOverview(days = 30) {
  const [bookings, conversations, clinics] = await Promise.all([
    getBookingStats(days),
    getConversationStats(days),
    getActiveClinics(),
  ]);

  return {
    bookinger: bookings,
    samtaler: conversations,
    klinikker: {
      antall: clinics.length,
      liste: clinics,
    },
  };
}
