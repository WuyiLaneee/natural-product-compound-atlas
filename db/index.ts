import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export class DatabaseUnavailableError extends Error {
  readonly code = "DB_UNAVAILABLE";

  constructor() {
    super(
      "Cloudflare D1 binding `DB` is unavailable. Set `.openai/hosting.json` d1 to `DB` and ensure the runtime binding is present.",
    );
    this.name = "DatabaseUnavailableError";
  }
}

export function getDb() {
  return drizzle(getD1Binding(), { schema });
}

export function getD1Binding(): D1Database {
  if (!env.DB) {
    throw new DatabaseUnavailableError();
  }

  return env.DB;
}

export type AppDatabase = ReturnType<typeof getDb>;

export function isDatabaseUnavailableError(
  error: unknown,
): error is DatabaseUnavailableError {
  return (
    error instanceof DatabaseUnavailableError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "DB_UNAVAILABLE")
  );
}
