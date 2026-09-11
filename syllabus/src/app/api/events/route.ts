import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { parseStringArray } from "@/lib/json";
import { getTier } from "@/lib/tiers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();

  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
    include: {
      campus: { select: { name: true } },
      rsvps: {
        include: {
          user: { select: { name: true, campusId: true, profile: { select: { photos: true } } } },
        },
      },
    },
  });

  const earlyAccess = getTier(user.tier).earlyEventAccess;

  return json({
    earlyAccess,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      location: e.location,
      campus: e.campus.name,
      sameCampus: e.campusId === user.campusId,
      attendeeCount: e.rsvps.length,
      attending: e.rsvps.some((r) => r.userId === user.id),
      attendees: e.rsvps.slice(0, 12).map((r) => ({
        name: r.user.name,
        photo: parseStringArray(r.user.profile?.photos)[0] ?? null,
      })),
    })),
  });
}
