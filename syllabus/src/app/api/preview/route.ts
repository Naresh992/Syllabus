import { prisma } from "@/lib/db";
import { json } from "@/lib/api";
import { cardInclude } from "@/lib/serialize";
import { parseStringArray } from "@/lib/json";

export const dynamic = "force-dynamic";

// Public social-proof endpoint for the enroll screen. Returns blurred teasers
// of REAL verified students (first name only, no last names) plus a short
// "recently verified" activity feed. No auth required — it only ever exposes
// first names, campus/major, and a blurred thumbnail.
export async function GET() {
  const [members, recently] = await Promise.all([
    prisma.user.findMany({
      where: { isAdmin: false, verificationStatus: "approved" },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.verificationDoc.findMany({
      where: { status: "approved" },
      include: { user: { include: cardInclude } },
      orderBy: { reviewedAt: "desc" },
      take: 5,
    }),
  ]);

  const cards = members.map((u) => {
    const photos = parseStringArray(u.profile?.photos);
    const first = u.name.trim().split(/\s+/)[0] ?? u.name;
    return {
      id: u.id,
      name: first,
      major: u.profile?.major ?? "",
      campus: u.campus?.name ?? u.college,
      intent: u.profile?.intent ?? "Open to Anything",
      photo: photos[0] ?? `/api/avatar/${u.id}`,
      blurred: true,
    };
  });

  const activity = recently.map((d) => {
    const first = d.user.name.trim().split(/\s+/)[0] ?? d.user.name;
    return {
      name: first,
      campus: d.user.campus?.name ?? d.user.college,
      verifiedAt: d.reviewedAt?.toISOString() ?? d.user.createdAt.toISOString(),
    };
  });

  return json({ cards, activity });
}