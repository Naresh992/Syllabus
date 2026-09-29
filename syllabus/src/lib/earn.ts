import { prisma } from "./db";
import { startOfToday } from "./limits";

// -----------------------------------------------------------------------------
// Earn tab — shared rules (prototype).
// Balances are integer credits, 1 credit = ₹1. Production AdMob rates
// (₹0.10–0.50/ad) would map to paise; the prototype credits a flat amount.
// -----------------------------------------------------------------------------

export const AD_PAYOUT_CREDITS = 1;
export const AD_COOLDOWN_SECONDS = 120; // 2 min between rewarded ads
export const PAYOUT_MIN_CREDITS = 50; // min UPI withdrawal (₹50)
export const PAYOUT_MONTHLY_CAP = 2000; // hard cap per user per calendar month
export const REFERRAL_PAYOUT_CREDITS = 25;

// Daily rewarded-ad caps per subscription tier.
export const EARN_ADS_PER_DAY: Record<string, number> = {
  audit: 5,
  enrolled: 10,
  honor_roll: 15,
  extra_credit: 20,
};

export function adsPerDay(tierId: string | null | undefined): number {
  return EARN_ADS_PER_DAY[tierId ?? "audit"] ?? EARN_ADS_PER_DAY.audit;
}

const TIER_RANK: Record<string, number> = {
  audit: 0,
  enrolled: 1,
  honor_roll: 2,
  extra_credit: 3,
};

export function tierRank(tierId: string | null | undefined): number {
  return TIER_RANK[tierId ?? "audit"] ?? 0;
}

// Minimum tier rank required per task category.
export const CATEGORY_MIN_RANK: Record<string, number> = {
  watch: 0,
  feedback: 0,
  social: 0,
  engagement: 0,
  refer: 1, // Enrolled+
  content: 2, // Honor Roll+
};

export function categoryUnlocked(category: string, tierId: string | null | undefined): boolean {
  return tierRank(tierId) >= (CATEGORY_MIN_RANK[category] ?? 0);
}

export type EarnTaskSeed = {
  category: string;
  title: string;
  description: string;
  payoutAmount: number;
  requiresReview: boolean;
  tierRequired: string | null;
};

// Default task catalog (idempotent seed). Keep payouts modest — Earn is a
// bonus layer on top of Connect + Learn, not the headline.
export const DEFAULT_EARN_TASKS: EarnTaskSeed[] = [
  {
    category: "refer",
    title: "Refer a friend",
    description: "Share your code. You earn when they get ID-verified.",
    payoutAmount: REFERRAL_PAYOUT_CREDITS,
    requiresReview: false,
    tierRequired: "enrolled",
  },
  {
    category: "content",
    title: "Post an approved Reel or photo",
    description: "Submit your post link. Reviewed by the team before payout.",
    payoutAmount: 15,
    requiresReview: true,
    tierRequired: "honor_roll",
  },
  {
    category: "engagement",
    title: "Check in at a Study Group event",
    description: "RSVP + show up. Organizers confirm attendance.",
    payoutAmount: 10,
    requiresReview: true,
    tierRequired: null,
  },
  {
    category: "feedback",
    title: "Complete the campus survey",
    description: "One-time survey about your Resyllabus experience.",
    payoutAmount: 5,
    requiresReview: false,
    tierRequired: null,
  },
  {
    category: "social",
    title: "Share Resyllabus to your story",
    description: "Post to Instagram, upload a screenshot for review.",
    payoutAmount: 5,
    requiresReview: true,
    tierRequired: null,
  },
];

export async function ensureEarnTasks(): Promise<void> {
  const count = await prisma.earnTask.count();
  if (count > 0) return;
  await prisma.earnTask.createMany({ data: DEFAULT_EARN_TASKS });
}

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    create: { userId, balance: 0, lifetimeEarned: 0, lifetimePaidOut: 0 },
    update: {},
  });
}

export async function creditWallet(userId: string, amount: number) {
  if (amount <= 0) throw new Error("Invalid credit amount.");
  return prisma.wallet.upsert({
    where: { userId },
    create: { userId, balance: amount, lifetimeEarned: amount, lifetimePaidOut: 0 },
    update: { balance: { increment: amount }, lifetimeEarned: { increment: amount } },
  });
}

export async function debitWallet(userId: string, amount: number) {
  if (amount <= 0) throw new Error("Invalid debit amount.");
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < amount) throw new Error("Insufficient balance.");
  return prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });
}

function randomCode(length = 6): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const created = await prisma.referralCode.create({
        data: { userId, code: randomCode() },
      });
      return created.code;
    } catch {
      // code collision — retry with a fresh code
    }
  }
  throw new Error("Could not generate a referral code. Try again.");
}

export function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function adsWatchedToday(userId: string): Promise<number> {
  return prisma.adView.count({
    where: { userId, createdAt: { gte: startOfToday() } },
  });
}

export async function lastAdViewAt(userId: string): Promise<Date | null> {
  const last = await prisma.adView.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

export async function paidOutThisMonth(userId: string): Promise<number> {
  const rows = await prisma.payoutRequest.findMany({
    where: {
      userId,
      status: { in: ["pending", "approved", "paid"] },
      createdAt: { gte: startOfMonth() },
    },
    select: { amount: true },
  });
  return rows.reduce((sum, r) => sum + r.amount, 0);
}
