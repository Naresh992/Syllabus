import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

// The Dodo return_url carries payment_id/status, but the browser is untrusted:
// the return page resolves the user's own latest pending order here and the
// verify step re-checks everything server-side.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const pending = await prisma.payment.findFirst({
    where: { userId: user.id, status: "created" },
    orderBy: { createdAt: "desc" },
    select: { orderId: true, tier: true, amount: true, createdAt: true },
  });

  return json({ pending });
}
