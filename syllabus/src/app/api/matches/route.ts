import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { toCard, cardInclude } from "@/lib/serialize";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();

  const matches = await prisma.match.findMany({
    where: { active: true, OR: [{ userAId: user.id }, { userBId: user.id }] },
    include: {
      userA: { include: cardInclude },
      userB: { include: cardInclude },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
  });

  const roster = matches
    .map((m) => {
      const other = m.userAId === user.id ? m.userB : m.userA;
      const last = m.messages[0] ?? null;
      return {
        matchId: m.id,
        matchedAt: m.matchedAt,
        profile: toCard(other),
        lastMessage: last
          ? { content: last.content, sentAt: last.sentAt, fromMe: last.senderId === user.id }
          : null,
        lastActivity: last?.sentAt ?? m.matchedAt,
      };
    })
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  return json({ roster });
}
