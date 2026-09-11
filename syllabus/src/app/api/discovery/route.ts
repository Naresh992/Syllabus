import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { getDiscoveryStack } from "@/lib/discovery";
import { getSwipeStatus } from "@/lib/limits";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();
  if (!user.hasProfile) return apiError.badRequest("Finish enrolling first.", { code: "no_profile" });

  const [cards, status] = await Promise.all([
    getDiscoveryStack(user.id),
    getSwipeStatus(user.id, user.tier),
  ]);

  return json({ cards, status });
}
