import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { getSwipeStatus } from "@/lib/limits";
import { createOrGetMatch } from "@/lib/match";
import { toCard, cardInclude } from "@/lib/serialize";
import { getTier } from "@/lib/tiers";

const schema = z.object({
  targetId: z.string().min(1),
  direction: z.enum(["add", "drop", "raise_hand"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();
  if (!user.hasProfile) return apiError.badRequest("Finish enrolling first.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Invalid swipe");
  const { targetId, direction } = parsed.data;
  if (targetId === user.id) return apiError.badRequest("You can't swipe on yourself.");

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, verificationStatus: true, isAdmin: true },
  });
  if (!target || target.isAdmin || target.verificationStatus !== "approved") {
    return apiError.notFound("That profile isn't available.");
  }

  // Not if either side blocked the other.
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: targetId },
        { blockerId: targetId, blockedId: user.id },
      ],
    },
  });
  if (block) return apiError.forbidden("That profile isn't available.");

  const tier = getTier(user.tier);
  const status = await getSwipeStatus(user.id, user.tier);
  const alreadySwiped = await prisma.swipe.findUnique({
    where: { swiperId_swipedId: { swiperId: user.id, swipedId: targetId } },
  });

  // Enforce limits only for brand-new swipes.
  if (!alreadySwiped) {
    if (direction === "raise_hand") {
      if (status.superRemaining <= 0) {
        return apiError.paywall(
          tier.superLikesPerWeek === 0
            ? "Raise Hand is a paid feature. Upgrade to send super likes."
            : "You're out of Raise Hands this week. Upgrade for more.",
          "enrolled"
        );
      }
    } else if (status.swipeLimit != null && status.swipesUsed >= status.swipeLimit) {
      return apiError.paywall(
        `You've used all ${status.swipeLimit} swipes today. Upgrade to Enrolled for unlimited swipes.`,
        "enrolled"
      );
    }
  }

  await prisma.swipe.upsert({
    where: { swiperId_swipedId: { swiperId: user.id, swipedId: targetId } },
    create: { swiperId: user.id, swipedId: targetId, direction },
    update: { direction },
  });

  let matched = false;
  let matchPayload: { matchId: string; profile: ReturnType<typeof toCard> } | null = null;

  if (direction === "add" || direction === "raise_hand") {
    const reciprocal = await prisma.swipe.findFirst({
      where: { swiperId: targetId, swipedId: user.id, direction: { in: ["add", "raise_hand"] } },
    });
    if (reciprocal) {
      const { match } = await createOrGetMatch(user.id, targetId);
      const other = await prisma.user.findUnique({
        where: { id: targetId },
        include: cardInclude,
      });
      matched = true;
      matchPayload = other ? { matchId: match.id, profile: toCard(other) } : null;
    }
  }

  const nextStatus = await getSwipeStatus(user.id, user.tier);
  return json({ ok: true, matched, match: matchPayload, status: nextStatus });
}
