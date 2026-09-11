import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  const blocks = await prisma.block.findMany({
    where: { blockerId: user.id },
    include: { blocked: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return json({ blocks: blocks.map((b) => ({ id: b.blocked.id, name: b.blocked.name })) });
}

const schema = z.object({
  targetId: z.string().min(1),
  action: z.enum(["block", "unblock"]).default("block"),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Invalid request");
  const { targetId, action } = parsed.data;
  if (targetId === user.id) return apiError.badRequest("You can't block yourself.");

  if (action === "unblock") {
    await prisma.block
      .delete({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } } })
      .catch(() => null);
    return json({ ok: true, blocked: false });
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } },
    create: { blockerId: user.id, blockedId: targetId },
    update: {},
  });

  // Close any match between the two so it leaves the roster & chat.
  const [x, y] = [user.id, targetId].sort();
  await prisma.match.updateMany({
    where: {
      OR: [
        { userAId: x, userBId: y },
        { userAId: y, userBId: x },
      ],
    },
    data: { active: false },
  });

  return json({ ok: true, blocked: true });
}
