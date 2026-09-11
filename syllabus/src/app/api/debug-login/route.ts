import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, getSessionUser, setSessionCookie } from "@/lib/auth";
import { json } from "@/lib/api";

// TEMPORARY diagnostic — runs the exact login steps and reports how far it
// gets. Never echoes passwords, hashes, or tokens. DELETE AFTER DIAGNOSIS.
const schema = z.object({ email: z.string(), password: z.string() });

export async function POST(req: Request) {
  const steps: Record<string, string> = {};
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    steps.parse = parsed.success ? "ok" : "bad-body";

    const user = await prisma.user
      .findUnique({ where: { email: parsed.success ? parsed.data.email : "?" } })
      .then((u) => {
        steps.findUser = u ? `found(isAdmin=${u.isAdmin})` : "not-found";
        return u;
      });

    if (user && parsed.success) {
      const match = await verifyPassword(parsed.data.password, user.passwordHash);
      steps.bcrypt = match ? "match" : "no-match";
      if (match) {
        const token = await signSession(user.id);
        steps.sign = `signed(len=${token.length})`;
        await setSessionCookie(user.id);
        steps.cookie = "set";
        const session = await getSessionUser();
        steps.session = session ? `read(${session.email})` : "null";
      }
    }
    return json({ steps });
  } catch (e: any) {
    steps.threw = String(e?.message ?? e).slice(0, 300);
    return json({ steps }, { status: 500 });
  }
}
