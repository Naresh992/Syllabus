import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (user.verificationStatus !== "approved") return apiError.notVerified();

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return apiError.notFound("Event not found.");

  const existing = await prisma.eventRSVP.findUnique({
    where: { eventId_userId: { eventId: params.id, userId: user.id } },
  });

  let attending: boolean;
  if (existing) {
    await prisma.eventRSVP.delete({ where: { id: existing.id } });
    attending = false;
  } else {
    await prisma.eventRSVP.create({ data: { eventId: params.id, userId: user.id } });
    attending = true;
  }

  const count = await prisma.eventRSVP.count({ where: { eventId: params.id } });
  return json({ attending, count });
}
