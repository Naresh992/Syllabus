import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid college email"),
});

// "Verify with mail" path: if the address belongs to a known campus domain,
// grant the verified tick instantly. No ownership link is sent in this
// prototype (flagged: add a mailed one-time code before treating this as
// strong verification) — admins can still reject accounts on report, and the
// ID + selfie path remains for everyone else.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError.badRequest(parsed.error.issues[0]?.message ?? "Invalid email");
  }
  const email = parsed.data.email;

  const domain = email.split("@")[1] ?? "";
  const campus = await prisma.campus.findUnique({ where: { domain } }).catch(() => null);
  if (!campus) {
    return apiError.badRequest(
      "We don't recognize that college domain yet — verify with your student ID instead."
    );
  }

  const taken = await prisma.user.findFirst({
    where: { email, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) {
    return apiError.badRequest("That email is already on another account. Use your own college email.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      campusId: campus.id,
      college: campus.name,
      verificationStatus: "approved",
    },
  });

  return json({ ok: true, status: "approved", campus: campus.name });
}
