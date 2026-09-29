import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { REFERRAL_PAYOUT_CREDITS } from "@/lib/earn";

const schema = z.object({ code: z.string().trim().min(4).max(16) });

// Apply a friend's referral code. The referrer is paid when THIS user
// completes ID verification (see the admin verification approve hook) —
// not at code-apply time. One referral credit per referred user, ever.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Enter a valid referral code.");
  const code = parsed.data.code.toUpperCase().trim();

  const target = await prisma.referralCode.findUnique({ where: { code } });
  if (!target) return apiError.notFound("That referral code doesn't exist.");
  if (target.userId === user.id) return apiError.badRequest("You can't use your own code.");

  const already = await prisma.referralUse.findUnique({ where: { referredId: user.id } });
  if (already) return apiError.badRequest("You already applied a referral code.");

  await prisma.$transaction([
    prisma.referralUse.create({
      data: { referrerId: target.userId, referredId: user.id, creditedAmount: REFERRAL_PAYOUT_CREDITS },
    }),
    prisma.referralCode.update({
      where: { userId: target.userId },
      data: { usesCount: { increment: 1 } },
    }),
  ]);

  return json({
    ok: true,
    note: `Code applied. Your friend earns ₹${REFERRAL_PAYOUT_CREDITS} when you get ID-verified.`,
  });
}
