import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { calcAge } from "@/lib/constants";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  if (!user.isAdmin) return apiError.forbidden("Admins only.");

  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const where = status === "all" ? {} : { status };

  const docs = await prisma.verificationDoc.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      user: { include: { campus: { select: { name: true, domain: true } } } },
    },
  });

  const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.verificationDoc.count({ where: { status: "pending" } }),
    prisma.verificationDoc.count({ where: { status: "approved" } }),
    prisma.verificationDoc.count({ where: { status: "rejected" } }),
  ]);

  return json({
    counts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    docs: docs.map((d) => ({
      id: d.id,
      userId: d.userId,
      name: d.user.name,
      email: d.user.email,
      campus: d.user.campus?.name ?? d.user.college,
      domain: d.user.campus?.domain ?? null,
      college: d.user.college,
      city: d.user.city,
      country: d.user.country,
      age: calcAge(d.user.dob),
      dob: d.user.dob,
      status: d.status,
      idPhotoUrl: d.idPhotoUrl,
      selfieUrl: d.selfieUrl,
      faceMatchScore: d.faceMatchScore,
      createdAt: d.createdAt,
      reviewedAt: d.reviewedAt,
    })),
  });
}
