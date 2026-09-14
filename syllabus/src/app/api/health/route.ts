import { prisma } from "@/lib/db";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

// Public deployment diagnostic. Reports ONLY whether env vars are present
// (never values) plus a DB ping result with any credentials redacted.
function redact(msg: string): string {
  return msg.replace(/:\/\/[^@\s]+@/g, "://***@").slice(0, 300);
}

export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    DODO_PAYMENTS_API_KEY: !!process.env.DODO_PAYMENTS_API_KEY,
    DODO_WEBHOOK_SECRET: Boolean(
      process.env.DODO_WEBHOOK_SECRET || process.env.DODO_PAYMENTS_WEBHOOK_SECRET
    ),
    DODO_PRODUCT_ENROLLED: !!process.env.DODO_PRODUCT_ENROLLED,
    DODO_PRODUCT_HONOR_ROLL: !!process.env.DODO_PRODUCT_HONOR_ROLL,
    DODO_PRODUCT_EXTRA_CREDIT: !!process.env.DODO_PRODUCT_EXTRA_CREDIT,
    DODO_ENV: process.env.DODO_ENV || "not set",
  };

  let db = "skipped";
  if (env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "ok";
    } catch (e: any) {
      db = `error: ${redact(String(e?.message ?? e))}`;
    }
  } else {
    db = "error: DATABASE_URL is not set";
  }

  const status = db === "ok" ? 200 : 503;
  return json(
    { ok: db === "ok", env, db, time: new Date().toISOString() },
    { status }
  );
}
