import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { categoryUnlocked, creditWallet } from "@/lib/earn";

const schema = z.object({
  taskId: z.string().min(1),
  proofUrl: z.string().max(2000).optional().default(""),
});

// Only self-serve categories go through here. "watch" is served by the
// rewarded-ad endpoint, "refer" by the referral endpoint.
const SELF_SERVE = new Set(["content", "engagement", "feedback", "social"]);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError.badRequest("Invalid task submission.");

  const task = await prisma.earnTask.findUnique({ where: { id: parsed.data.taskId } });
  if (!task || !task.active) return apiError.notFound("That task isn't available.");
  if (!SELF_SERVE.has(task.category)) {
    return apiError.badRequest("Submit this task from its own section (Watch & Earn or Refer).");
  }
  if (!categoryUnlocked(task.category, user.tier)) {
    return apiError.forbidden(
      `This task unlocks at ${task.tierRequired ?? "a higher tier"}. Upgrade to unlock it.`
    );
  }

  const existing = await prisma.taskCompletion.findUnique({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
  });
  if (existing) return apiError.badRequest("You already completed this task.");

  const proofUrl = parsed.data.proofUrl?.trim() ?? "";
  if (task.requiresReview && !proofUrl) {
    return apiError.badRequest("Add proof (link or screenshot URL) for review.");
  }

  if (!task.requiresReview) {
    const [completion] = await prisma.$transaction([
      prisma.taskCompletion.create({
        data: {
          userId: user.id,
          taskId: task.id,
          status: "approved",
          proofUrl: proofUrl || null,
          creditedAmount: task.payoutAmount,
          reviewedAt: new Date(),
        },
      }),
    ]);
    await creditWallet(user.id, task.payoutAmount);
    return json({ ok: true, completion, credited: task.payoutAmount }, { status: 201 });
  }

  const completion = await prisma.taskCompletion.create({
    data: {
      userId: user.id,
      taskId: task.id,
      status: "pending",
      proofUrl: proofUrl || null,
      creditedAmount: 0,
    },
  });
  return json(
    { ok: true, completion, credited: 0, note: "Submitted for review — payout after approval." },
    { status: 201 }
  );
}
