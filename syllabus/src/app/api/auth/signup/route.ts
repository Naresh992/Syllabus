import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie, getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { calcAge, MIN_AGE } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  dob: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Enter a valid date of birth"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, email, password, dob } = parsed.data;

  // .edu requirement + campus auto-detection from domain
  const domain = email.split("@")[1] ?? "";
  if (!domain.endsWith(".edu")) {
    return apiError.badRequest("Please use your college email address (must end in .edu).");
  }
  const campus = await prisma.campus.findUnique({ where: { domain } });
  if (!campus) {
    const campuses = await prisma.campus.findMany({ select: { domain: true } });
    return apiError.badRequest(
      `We haven't launched at ${domain} yet. Supported campuses: ${campuses
        .map((c) => c.domain)
        .join(", ")}.`
    );
  }

  // Hard 18+ gate
  const age = calcAge(dob);
  if (Number.isNaN(age) || age < MIN_AGE) {
    return apiError.badRequest(`You must be at least ${MIN_AGE} to join Syllabus.`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError.badRequest("An account with that email already exists. Try signing in.");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      dob: new Date(dob),
      campusId: campus.id,
      verificationStatus: "pending",
      subscription: { create: { tier: "audit", status: "active" } },
    },
  });

  await setSessionCookie(user.id);
  const session = await getSessionUser();
  return json({ user: session }, { status: 201 });
}
