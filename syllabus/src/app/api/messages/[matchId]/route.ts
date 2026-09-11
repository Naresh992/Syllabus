import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { toCard, cardInclude } from "@/lib/serialize";
import { getTier } from "@/lib/tiers";

async function loadMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { userA: { include: cardInclude }, userB: { include: cardInclude } },
  });
  if (!match) return { error: "notfound" as const };
  if (match.userAId !== userId && match.userBId !== userId) return { error: "forbidden" as const };
  const other = match.userAId === userId ? match.userB : match.userA;
  return { match, other };
}

export async function GET(req: Request, { params }: { params: { matchId: string } }) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();

  const res = await loadMatch(params.matchId, user.id);
  if ("error" in res) {
    return res.error === "notfound" ? apiError.notFound("Conversation not found.") : apiError.forbidden();
  }

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: res.other.id },
        { blockerId: res.other.id, blockedId: user.id },
      ],
    },
  });

  const messages = await prisma.message.findMany({
    where: { matchId: params.matchId },
    orderBy: { sentAt: "asc" },
  });

  return json({
    match: { id: res.match.id, matchedAt: res.match.matchedAt, active: res.match.active },
    other: toCard(res.other),
    blocked: !!blocked,
    readReceipts: getTier(user.tier).readReceipts,
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentAt: m.sentAt,
      fromMe: m.senderId === user.id,
    })),
  });
}

const sendSchema = z.object({ content: z.string().trim().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: { matchId: string } }) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Type a message first.");

  const res = await loadMatch(params.matchId, user.id);
  if ("error" in res) {
    return res.error === "notfound" ? apiError.notFound("Conversation not found.") : apiError.forbidden();
  }
  if (!res.match.active) return apiError.forbidden("This conversation is closed.");

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: res.other.id },
        { blockerId: res.other.id, blockedId: user.id },
      ],
    },
  });
  if (blocked) return apiError.forbidden("You can't message this person.");

  const msg = await prisma.message.create({
    data: { matchId: params.matchId, senderId: user.id, content: parsed.data.content },
  });

  return json({
    message: { id: msg.id, content: msg.content, sentAt: msg.sentAt, fromMe: true },
  });
}
