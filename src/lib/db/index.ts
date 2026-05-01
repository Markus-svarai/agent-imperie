import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pg__: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse connection across hot-reloads in dev
const client =
  global.__pg__ ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Supabase pgbouncer compatibility
  });

if (process.env.NODE_ENV !== "production") {
  global.__pg__ = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type Database = typeof db;
