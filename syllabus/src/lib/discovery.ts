import { prisma } from "@/lib/db";
import { toCard, cardInclude, type CardProfile } from "@/lib/serialize";
import { getTier } from "@/lib/tiers";
import { HOOKUP_INTENT } from "@/lib/constants";
import { parseStringArray } from "@/lib/json";

function subtractYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export async function getRelationshipSets(userId: string) {
  const [swipes, blocks] = await Promise.all([
    prisma.swipe.findMany({ where: { swiperId: userId }, select: { swipedId: true } }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  const swipedIds = swipes.map((s) => s.swipedId);
  const blockedIds = new Set<string>();
  for (const b of blocks) {
    blockedIds.add(b.blockerId);
    blockedIds.add(b.blockedId);
  }
  blockedIds.delete(userId);
  return { swipedIds, blockedIds: Array.from(blockedIds) };
}

// People who liked me (add / raise_hand). Returns a map id -> direction.
export async function getLikerMap(userId: string) {
  const likers = await prisma.swipe.findMany({
    where: { swipedId: userId, direction: { in: ["add", "raise_hand"] } },
    select: { swiperId: true, direction: true },
  });
  return new Map(likers.map((l) => [l.swiperId, l.direction]));
}

export async function getDiscoveryStack(userId: string, limit = 30): Promise<CardProfile[]> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, subscription: true },
  });
  if (!me || !me.profile) return [];

  const tier = getTier(me.subscription?.tier);
  const effectiveInterCollege = tier.interCollege && !me.profile.sameCampusOnly;

  const { swipedIds, blockedIds } = await getRelationshipSets(userId);
  const likerMap = await getLikerMap(userId);

  const today = new Date();
  const maxDob = subtractYears(today, me.profile.ageMin); // oldest-young bound
  const minDob = subtractYears(today, me.profile.ageMax + 1);

  const intentFilter = parseStringArray(me.profile.intentFilter);

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...swipedIds, ...blockedIds] },
      isAdmin: false,
      verificationStatus: "approved",
      dob: { lte: maxDob, gt: minDob },
      ...(effectiveInterCollege ? {} : { campusId: me.campusId }),
      profile: {
        incognito: false,
        ...(intentFilter.length ? { intent: { in: intentFilter } } : {}),
        ...(me.profile.hookupOptIn ? {} : { hookupOptIn: false }),
      },
      // Respect other users' "same-campus-only visibility" privacy setting.
      NOT: {
        AND: [{ campusId: { not: me.campusId } }, { profile: { sameCampusVisibility: true } }],
      },
    },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit * 2,
  });

  const cards = candidates.map((c) => {
    const dir = likerMap.get(c.id);
    return toCard(c, {
      likedYou: dir === "add" || dir === "raise_hand",
      superLikedYou: dir === "raise_hand",
    });
  });

  // Surface people who already liked you first (better first-run demo),
  // then recency order.
  cards.sort((a, b) => Number(b.likedYou ?? false) - Number(a.likedYou ?? false));
  return cards.slice(0, limit);
}

// "Class Roster" — people who liked me that I haven't acted on yet.
export async function getLikersForUser(userId: string): Promise<CardProfile[]> {
  const { swipedIds, blockedIds } = await getRelationshipSets(userId);
  const exclude = new Set([...swipedIds, ...blockedIds]);

  const likes = await prisma.swipe.findMany({
    where: { swipedId: userId, direction: { in: ["add", "raise_hand"] } },
    orderBy: { createdAt: "desc" },
    include: { swiper: { include: cardInclude } },
  });

  const seen = new Set<string>();
  const cards: CardProfile[] = [];
  for (const like of likes) {
    if (exclude.has(like.swiperId) || seen.has(like.swiperId)) continue;
    if (like.swiper.isAdmin || like.swiper.verificationStatus !== "approved") continue;
    seen.add(like.swiperId);
    cards.push(
      toCard(like.swiper, {
        likedYou: true,
        superLikedYou: like.direction === "raise_hand",
      })
    );
  }
  return cards;
}
