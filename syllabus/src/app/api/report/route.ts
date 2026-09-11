import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

const schema = z.object({
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
  context: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Tell us what's wrong.");
  if (parsed.data.targetId === user.id) return apiError.badRequest("You can't report yourself.");

  await prisma.report.create({
    data: {
      reporterId: user.id,
      reportedId: parsed.data.targetId,
      reason: parsed.data.reason,
      context: parsed.data.context,
    },
  });

  return json({ ok: true });
}
