import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { creditWallet } from "@/lib/earn";

const schema = z.object({ action: z.enum(["approve", "reject"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (!user.isAdmin) return apiError.forbidden("Admins only.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Invalid action");

  const doc = await prisma.verificationDoc.findUnique({ where: { id: params.id } });
  if (!doc) return apiError.notFound("Verification record not found.");

  const status = parsed.data.action === "approve" ? "approved" : "rejected";

  await prisma.$transaction([
    prisma.verificationDoc.update({
      where: { id: doc.id },
      data: { status, reviewedBy: user.id, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: doc.userId },
      data: { verificationStatus: status },
    }),
  ]);

  // Refer & Earn: pay the referrer once when the friend completes ID verification.
  if (status === "approved") {
    const use = await prisma.referralUse.findUnique({ where: { referredId: doc.userId } });
    if (use && !use.credited) {
      await prisma.referralUse.update({ where: { id: use.id }, data: { credited: true } });
      await creditWallet(use.referrerId, use.creditedAmount);
    }
  }

  return json({ ok: true, status });
}
