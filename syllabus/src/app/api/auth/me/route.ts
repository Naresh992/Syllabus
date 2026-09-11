import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { getTier } from "@/lib/tiers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  return json({ user, tierInfo: getTier(user.tier) });
}
