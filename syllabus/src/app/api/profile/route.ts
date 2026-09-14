import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiError, json } from "@/lib/api";
import { stringify, parseStringArray, parsePrompts } from "@/lib/json";
import { INTENTS, MIN_PHOTOS, MAX_PHOTOS } from "@/lib/constants";
import { getTier } from "@/lib/tiers";

const promptSchema = z.object({
  q: z.string().min(1),
  a: z.string().trim().min(1, "Answer a prompt").max(300),
});

const schema = z.object({
  bio: z.string().max(600).default(""),
  photos: z.array(z.string().min(1)).min(MIN_PHOTOS, `Add at least ${MIN_PHOTOS} photos`).max(MAX_PHOTOS),
  major: z.string().trim().min(1, "Pick your major"),
  classYear: z.string().trim().min(1, "Pick your class year"),
  intent: z.string().refine((v) => INTENTS.includes(v as typeof INTENTS[number]), "Pick a valid prerequisite"),
  hookupOptIn: z.boolean().default(false),
  prompts: z.array(promptSchema).min(3, "Answer all 3 prompts"),
  ageMin: z.coerce.number().int().min(18).max(100).default(18),
  ageMax: z.coerce.number().int().min(18).max(100).default(40),
  sameCampusOnly: z.boolean().default(true),
  intentFilter: z.array(z.string()).default([]),
  sameCampusVisibility: z.boolean().default(false),
  incognito: z.boolean().default(false),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return json({ profile: null });
  return json({
    profile: {
      ...profile,
      photos: parseStringArray(profile.photos),
      prompts: parsePrompts(profile.prompts),
      intentFilter: parseStringArray(profile.intentFilter),
    },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return apiError.unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError.badRequest(parsed.error.issues[0]?.message ?? "Invalid profile");
  }
  const d = parsed.data;
  if (d.ageMin > d.ageMax) return apiError.badRequest("Age range is invalid.");

  const hookupOptIn = d.hookupOptIn;

  // Tier gates: inter-college & incognito are paid perks.
  const tier = getTier(user.tier);
  const sameCampusOnly = tier.interCollege ? d.sameCampusOnly : true;
  const incognito = tier.incognito ? d.incognito : false;

  const data = {
    bio: d.bio,
    photos: stringify(d.photos),
    major: d.major,
    classYear: d.classYear,
    intent: d.intent,
    hookupOptIn,
    prompts: stringify(d.prompts),
    ageMin: d.ageMin,
    ageMax: d.ageMax,
    sameCampusOnly,
    intentFilter: stringify(d.intentFilter),
    sameCampusVisibility: d.sameCampusVisibility,
    incognito,
  };

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return json({ ok: true });
}
