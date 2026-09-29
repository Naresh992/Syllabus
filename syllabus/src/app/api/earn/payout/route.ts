import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import {
  getOrCreateWallet,
  paidOutThisMonth,
  PAYOUT_MIN_CREDITS,
  PAYOUT_MONTHLY_CAP,
} from "@/lib/earn";

const schema = z.object({
  amount: z.number().int().min(1),
  upiId: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}/, "Enter a valid UPI ID (name@bank)."),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError.badRequest(parsed.error.issues[0]?.message ?? "Invalid payout request.");
  }
  const { amount, upiId } = parsed.data;

  if (amount < PAYOUT_MIN_CREDITS) {
    return apiError.badRequest(`Minimum withdrawal is ${PAYOUT_MIN_CREDITS} credits (₹${PAYOUT_MIN_CREDITS}).`);
  }

  const [wallet, usedThisMonth] = await Promise.all([
    getOrCreateWallet(user.id),
    paidOutThisMonth(user.id),
  ]);
  if (wallet.balance < amount) return apiError.badRequest("Insufficient balance.");
  if (usedThisMonth + amount > PAYOUT_MONTHLY_CAP) {
    return apiError.badRequest(
      `Monthly payout cap is ₹${PAYOUT_MONTHLY_CAP}. You have ₹${PAYOUT_MONTHLY_CAP - usedThisMonth} left this month.`
    );
  }

  const request = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: { decrement: amount } },
    });
    return tx.payoutRequest.create({
      data: { userId: user.id, amount, upiId, status: "pending" },
    });
  });

  return json(
    { ok: true, request, note: "Withdrawal requested — UPI transfer after approval." },
    { status: 201 }
  );
}
