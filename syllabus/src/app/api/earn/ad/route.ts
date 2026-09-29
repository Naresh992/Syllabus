import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import {
  adsPerDay,
  adsWatchedToday,
  creditWallet,
  lastAdViewAt,
  AD_COOLDOWN_SECONDS,
  AD_PAYOUT_CREDITS,
} from "@/lib/earn";

// Prototype rewarded-ad completion. Production would verify an AdMob
// server-side callback here (never trust the client); the prototype records a
// mock callback id and enforces the same cooldown + daily-cap rules.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const cap = adsPerDay(user.tier);
  const [watched, last] = await Promise.all([
    adsWatchedToday(user.id),
    lastAdViewAt(user.id),
  ]);

  if (watched >= cap) {
    return apiError.badRequest(
      `Daily limit reached (${cap} ads). Come back tomorrow — or upgrade your tier for a higher cap.`,
      { code: "daily_cap" }
    );
  }

  if (last) {
    const elapsed = Math.floor((Date.now() - last.getTime()) / 1000);
    if (elapsed < AD_COOLDOWN_SECONDS) {
      return apiError.badRequest("Ad break — try again in a bit.", {
        code: "cooldown",
        retryAfter: AD_COOLDOWN_SECONDS - elapsed,
      });
    }
  }

  const callbackId = `mock_${user.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const [view] = await prisma.$transaction([
    prisma.adView.create({
      data: {
        userId: user.id,
        callbackId,
        verified: true,
        creditedAmount: AD_PAYOUT_CREDITS,
      },
    }),
  ]);
  await creditWallet(user.id, AD_PAYOUT_CREDITS);
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

  return json({
    ok: true,
    credited: AD_PAYOUT_CREDITS,
    balance: wallet?.balance ?? 0,
    watchedToday: watched + 1,
    dailyCap: cap,
    nextAvailableIn: AD_COOLDOWN_SECONDS,
    viewId: view.id,
  });
}
