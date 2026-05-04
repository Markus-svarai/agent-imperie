-- SvarAI product tables — kjør én gang i Supabase SQL Editor
-- Prosjekt: rxeofhcdkeyrutethbfw
-- https://supabase.com/dashboard/project/rxeofhcdkeyrutethbfw/sql/new

-- ── Klinikker ──────────────────────────────────────────────────────────────
create table if not exists clinics (
  id                   text primary key,
  name                 text not null,
  type                 text not null default 'generell',
  tagline              text,
  address_street       text,
  address_postal       text,
  address_city         text,
  contact_phone        text,
  contact_email        text,
  contact_website      text,
  cancellation_policy  text,
  booking_lead_hours   int  not null default 2,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Tjenester ──────────────────────────────────────────────────────────────
create table if not exists clinic_services (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        text not null references clinics(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes int  not null default 30,
  price_nok        int  not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ── Åpningstider ──────────────────────────────────────────────────────────
create table if not exists clinic_hours (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  text not null references clinics(id) on delete cascade,
  day        text not null,
  sort_order int  not null default 0,
  open       text,
  close      text,
  unique (clinic_id, day)
);

-- ── Bookinger ─────────────────────────────────────────────────────────────
create table if not exists bookings (
  id           text primary key,
  clinic_id    text not null,
  service_id   text,
  service_name text,
  date         text not null,
  time         text not null,
  name         text not null,
  phone        text not null,
  email        text not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);

create index if not exists bookings_clinic_idx  on bookings(clinic_id);
create index if not exists bookings_date_idx    on bookings(date);
create index if not exists bookings_status_idx  on bookings(status);
create index if not exists bookings_created_idx on bookings(created_at);

-- ── Samtaler (AI-resepsjonist) ─────────────────────────────────────────────
create table if not exists conversations (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         text not null,
  session_id        text not null,
  messages          jsonb not null default '[]',
  ended_in_booking  boolean default false,
  has_unanswered    boolean default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists conversations_clinic_idx  on conversations(clinic_id);
create index if not exists conversations_booking_idx on conversations(ended_in_booking);
create index if not exists conversations_created_idx on conversations(created_at);

-- ── Disable RLS (service role brukes fra backend) ─────────────────────────
alter table clinics            disable row level security;
alter table clinic_services    disable row level security;
alter table clinic_hours       disable row level security;
alter table bookings           disable row level security;
alter table conversations      disable row level security;
