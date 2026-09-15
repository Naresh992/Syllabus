import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { getDiscoveryStack } from "@/lib/discovery";
import { getSwipeStatus } from "@/lib/limits";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (!user.hasProfile) return apiError.badRequest("Finish enrolling first.", { code: "no_profile" });

  const verified = user.verificationStatus === "approved";
  const [cards, status] = await Promise.all([
    getDiscoveryStack(user.id),
    getSwipeStatus(user.id, user.tier),
  ]);

  // Unverified (email-first) members browse the stack as blurred previews:
  // photos and full names stay hidden until they get ID-verified to message.
  const deck = verified
    ? cards
    : cards.map((c) => ({
        ...c,
        blurred: true,
        name: c.name.trim().split(/\s+/)[0] ?? c.name,
      }));

  return json({ cards: deck, status, verificationRequired: !verified });
}
