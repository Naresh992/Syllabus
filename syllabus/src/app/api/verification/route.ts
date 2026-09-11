import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";

// Basic face-match is a PLACEHOLDER for MVP (flagged for a KYC vendor such as
// Persona/Onfido). We store a mock score and mark the account pending review.
const schema = z.object({
  idPhotoUrl: z.string().min(1, "College ID photo is required"),
  selfieUrl: z.string().min(1, "A selfie is required"),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  const doc = await prisma.verificationDoc.findUnique({
    where: { userId: user.id },
    select: { status: true, createdAt: true, reviewedAt: true, faceMatchScore: true },
  });
  return json({ status: user.verificationStatus, doc });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError.badRequest(parsed.error.issues[0]?.message ?? "Invalid upload");
  }

  // Placeholder "face match": deterministic-ish mock score. Never auto-approves.
  const faceMatchScore = 0.78 + Math.random() * 0.2;

  await prisma.verificationDoc.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      idPhotoUrl: parsed.data.idPhotoUrl,
      selfieUrl: parsed.data.selfieUrl,
      status: "pending",
      faceMatchScore,
    },
    update: {
      idPhotoUrl: parsed.data.idPhotoUrl,
      selfieUrl: parsed.data.selfieUrl,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      faceMatchScore,
    },
  });

  // Keep the user pending until an admin approves.
  if (user.verificationStatus !== "approved") {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationStatus: "pending" },
    });
  }

  return json({ ok: true, status: "pending" });
}
