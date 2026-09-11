import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie, getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError.badRequest("Enter your email and password.");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return apiError.badRequest("Incorrect email or password.");
  }

  await setSessionCookie(user.id);
  const session = await getSessionUser();
  return json({ user: session });
}
