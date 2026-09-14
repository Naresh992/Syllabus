import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

// Records a hosted checkout payment failure against the order for diagnosis.
// It never changes the account tier.
const schema = z.object({
  orderId: z.string().min(1).max(100),
  code: z.string().max(50).nullable().optional(),
  description: z.string().max(300).nullable().optional(),
  reason: z.string().max(100).nullable().optional(),
  source: z.string().max(50).nullable().optional(),
  step: z.string().max(50).nullable().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ received: true });

  const d = parsed.data;
  await prisma.payment
    .updateMany({
      where: { orderId: d.orderId, userId: user.id },
      data: {
        status: "failed",
        rawPayload: JSON.stringify({
          code: d.code,
          description: d.description,
          reason: d.reason,
          source: d.source,
          step: d.step,
          at: new Date().toISOString(),
        }).slice(0, 20000),
      },
    })
    .catch(() => null);

  return json({ received: true });
}
