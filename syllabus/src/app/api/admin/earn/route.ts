import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// Review queues for Earn: pending task completions + payout requests.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (!user.isAdmin) return apiError.forbidden("Admins only.");

  const queue = new URL(req.url).searchParams.get("queue") ?? "completions";

  if (queue === "payouts") {
    const payouts = await prisma.payoutRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    });
    return json({ payouts });
  }

  const completions = await prisma.taskCompletion.findMany({
    where: { status: "pending" },
    orderBy: { completedAt: "asc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      task: { select: { title: true, category: true, payoutAmount: true } },
    },
  });
  return json({ completions });
}
