import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "syllabus_session";
const DAY = 60 * 60 * 24;
const MAX_AGE = 30 * DAY;

function secret(): Uint8Array {
  const configured = process.env.SESSION_SECRET;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production.");
  }
  return new TextEncoder().encode(configured || "local-development-only-secret");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await signSession(userId);
  // Secure cookies in production (HTTPS). Local plain-http serving of the
  // production build (`next start`) needs SESSION_COOKIE_SECURE=0 — see README.
  const secure =
    process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "0";
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

async function readUserId(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  dob: Date;
  isAdmin: boolean;
  verificationStatus: string;
  campusId: string | null;
  campusName: string | null;
  campusDomain: string | null;
  college: string | null;
  city: string | null;
  country: string | null;
  tier: string;
  hasProfile: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const uid = await readUserId();
  if (!uid) return null;
  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: { campus: true, subscription: true, profile: { select: { id: true } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    dob: user.dob,
    isAdmin: user.isAdmin,
    verificationStatus: user.verificationStatus,
    campusId: user.campusId,
    campusName: user.campus?.name ?? user.college,
    campusDomain: user.campus?.domain ?? null,
    college: user.college,
    city: user.city,
    country: user.country,
    tier: user.subscription?.tier ?? "audit",
    hasProfile: !!user.profile,
  };
}
