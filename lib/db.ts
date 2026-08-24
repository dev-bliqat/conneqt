import "server-only";

import { Pool } from "pg";

declare global {
  var __crmPgPool: Pool | undefined;
}

function normalizeDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");

  if (sslmode === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

export function getPgPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL saknas.");
  }

  if (!globalThis.__crmPgPool) {
    const normalizedConnectionString = normalizeDatabaseUrl(connectionString);

    globalThis.__crmPgPool = new Pool({
      connectionString: normalizedConnectionString,
    });
  }

  return globalThis.__crmPgPool;
}
