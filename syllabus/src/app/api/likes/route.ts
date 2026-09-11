import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { getLikersForUser } from "@/lib/discovery";
import { getTier } from "@/lib/tiers";

// "Class Roster" — who liked you. Gated behind Enrolled+ (seeWhoLikedYou).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();

  const tier = getTier(user.tier);
  const cards = await getLikersForUser(user.id);

  if (!tier.seeWhoLikedYou) {
    // Locked: reveal the count as a teaser, hide identities.
    return json({ entitled: false, count: cards.length, cards: [], upgradeTo: "enrolled" });
  }
  return json({ entitled: true, count: cards.length, cards });
}
