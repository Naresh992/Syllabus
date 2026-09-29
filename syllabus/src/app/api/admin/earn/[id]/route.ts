import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { creditWallet } from "@/lib/earn";

const schema = z.object({
  kind: z.enum(["completion", "payout"]),
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (!user.isAdmin) return apiError.forbidden("Admins only.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Invalid action.");
  const { kind, action } = parsed.data;

  if (kind === "completion") {
    const completion = await prisma.taskCompletion.findUnique({
      where: { id: params.id },
      include: { task: true },
    });
    if (!completion) return apiError.notFound("Completion not found.");
    if (completion.status !== "pending") return json({ ok: true, status: completion.status });

    if (action === "reject") {
      const updated = await prisma.taskCompletion.update({
        where: { id: completion.id },
        data: { status: "rejected", reviewedAt: new Date(), reviewedBy: user.id },
      });
      return json({ ok: true, status: updated.status });
    }

    await prisma.taskCompletion.update({
      where: { id: completion.id },
      data: {
        status: "approved",
        creditedAmount: completion.task.payoutAmount,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    });
    await creditWallet(completion.userId, completion.task.payoutAmount);
    return json({ ok: true, status: "approved", credited: completion.task.payoutAmount });
  }

  const payout = await prisma.payoutRequest.findUnique({ where: { id: params.id } });
  if (!payout) return apiError.notFound("Payout request not found.");
  if (payout.status !== "pending") return json({ ok: true, status: payout.status });

  if (action === "reject") {
    // Refund the held balance.
    await prisma.$transaction([
      prisma.payoutRequest.update({
        where: { id: payout.id },
        data: { status: "rejected", processedAt: new Date() },
      }),
      prisma.wallet.upsert({
        where: { userId: payout.userId },
        create: { userId: payout.userId, balance: payout.amount, lifetimeEarned: 0, lifetimePaidOut: 0 },
        update: { balance: { increment: payout.amount } },
      }),
    ]);
    return json({ ok: true, status: "rejected" });
  }

  const [updated] = await prisma.$transaction([
    prisma.payoutRequest.update({
      where: { id: payout.id },
      data: { status: "paid", processedAt: new Date() },
    }),
    prisma.wallet.upsert({
      where: { userId: payout.userId },
      create: { userId: payout.userId, balance: 0, lifetimeEarned: 0, lifetimePaidOut: payout.amount },
      update: { lifetimePaidOut: { increment: payout.amount } },
    }),
  ]);
  return json({ ok: true, status: updated.status });
}
