import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import {
  adsPerDay,
  adsWatchedToday,
  categoryUnlocked,
  ensureEarnTasks,
  getOrCreateReferralCode,
  getOrCreateWallet,
  lastAdViewAt,
  paidOutThisMonth,
  AD_COOLDOWN_SECONDS,
  PAYOUT_MIN_CREDITS,
  PAYOUT_MONTHLY_CAP,
  REFERRAL_PAYOUT_CREDITS,
} from "@/lib/earn";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  await ensureEarnTasks();
  const [wallet, referralCode] = await Promise.all([
    getOrCreateWallet(user.id),
    getOrCreateReferralCode(user.id),
  ]);

  const [tasks, completions, adsToday, lastAd, monthPaidOut, referral] = await Promise.all([
    prisma.earnTask.findMany({ where: { active: true }, orderBy: { payoutAmount: "desc" } }),
    prisma.taskCompletion.findMany({ where: { userId: user.id } }),
    adsWatchedToday(user.id),
    lastAdViewAt(user.id),
    paidOutThisMonth(user.id),
    prisma.referralCode.findUnique({
      where: { userId: user.id },
      include: { _count: false } as never,
    }),
  ]);

  const completionByTask = new Map(completions.map((c) => [c.taskId, c]));
  const cap = adsPerDay(user.tier);
  const cooldownRemaining = lastAd
    ? Math.max(0, AD_COOLDOWN_SECONDS - Math.floor((Date.now() - lastAd.getTime()) / 1000))
    : 0;

  const [adViews, payoutRequests, referralsRewarded] = await Promise.all([
    prisma.adView.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payoutRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.referralUse.count({ where: { referrerId: user.id, credited: true } }),
  ]);

  type HistoryItem = {
    kind: string;
    title: string;
    amount: number;
    status: string;
    at: string;
  };
  const history: HistoryItem[] = [
    ...adViews.map((a) => ({
      kind: "ad",
      title: "Rewarded ad watched",
      amount: a.creditedAmount,
      status: a.verified ? "credited" : "pending",
      at: a.createdAt.toISOString(),
    })),
    ...completions.map((c) => {
      const t = tasks.find((x) => x.id === c.taskId);
      return {
        kind: "task",
        title: t?.title ?? "Task",
        amount: c.creditedAmount,
        status: c.status,
        at: c.completedAt.toISOString(),
      };
    }),
    ...payoutRequests.map((p) => ({
      kind: "payout",
      title: `UPI withdrawal → ${p.upiId}`,
      amount: -p.amount,
      status: p.status,
      at: p.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 20);

  return json({
    wallet: {
      balance: wallet.balance,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimePaidOut: wallet.lifetimePaidOut,
    },
    ads: {
      watchedToday: adsToday,
      dailyCap: cap,
      cooldownRemaining,
      payoutPerAd: 1,
    },
    tasks: tasks.map((t) => {
      const done = completionByTask.get(t.id);
      return {
        id: t.id,
        category: t.category,
        title: t.title,
        description: t.description,
        payoutAmount: t.payoutAmount,
        requiresReview: t.requiresReview,
        locked: !categoryUnlocked(t.category, user.tier),
        tierRequired: t.tierRequired,
        completion: done
          ? { status: done.status, creditedAmount: done.creditedAmount }
          : null,
      };
    }),
    referral: {
      code: referralCode,
      usesCount: referral?.usesCount ?? 0,
      rewardedCount: referralsRewarded,
      payoutPerReferral: REFERRAL_PAYOUT_CREDITS,
    },
    payout: {
      minCredits: PAYOUT_MIN_CREDITS,
      monthlyCap: PAYOUT_MONTHLY_CAP,
      usedThisMonth: monthPaidOut,
    },
    history,
  });
}
