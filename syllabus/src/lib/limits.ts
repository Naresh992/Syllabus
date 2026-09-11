import { prisma } from "./db";
import { getTier } from "./tiers";

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export type SwipeStatus = {
  tier: string;
  swipeLimit: number | null; // null = unlimited
  swipesUsed: number;
  swipesRemaining: number | null;
  superLimit: number;
  superUsed: number;
  superRemaining: number;
};

export async function getSwipeStatus(userId: string, tierId: string): Promise<SwipeStatus> {
  const tier = getTier(tierId);
  const [swipesUsed, superUsed] = await Promise.all([
    prisma.swipe.count({
      where: { swiperId: userId, createdAt: { gte: startOfToday() } },
    }),
    prisma.swipe.count({
      where: { swiperId: userId, direction: "raise_hand", createdAt: { gte: sevenDaysAgo() } },
    }),
  ]);

  const swipesRemaining =
    tier.swipesPerDay == null ? null : Math.max(0, tier.swipesPerDay - swipesUsed);
  const superRemaining = Math.max(0, tier.superLikesPerWeek - superUsed);

  return {
    tier: tier.id,
    swipeLimit: tier.swipesPerDay,
    swipesUsed,
    swipesRemaining,
    superLimit: tier.superLikesPerWeek,
    superUsed,
    superRemaining,
  };
}
