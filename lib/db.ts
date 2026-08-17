import "server-only";

import { Pool } from "pg";

declare global {
  var __crmPgPool: Pool | undefined;
}

export function getPgPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL saknas.");
  }

  if (!globalThis.__crmPgPool) {
    globalThis.__crmPgPool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  return globalThis.__crmPgPool;
}
