import { calcAge } from "./constants";
import { parsePrompts, parseStringArray, type Prompt } from "./json";

export type CardProfile = {
  id: string;
  name: string;
  age: number;
  major: string;
  classYear: string;
  campus: string | null;
  campusId: string | null;
  location: string | null; // "City, Country" for global users
  intent: string;
  hookupOptIn: boolean;
  bio: string;
  photos: string[];
  prompts: Prompt[];
  topBadge: boolean; // "Valedictorian" (Extra Credit)
  likedYou?: boolean;
  superLikedYou?: boolean;
  blurred?: boolean; // unverified viewer → photos blurred + name truncated
};

type UserForCard = {
  id: string;
  name: string;
  dob: Date;
  campusId: string | null;
  college: string | null;
  city: string | null;
  country: string | null;
  campus: { name: string } | null;
  subscription: { tier: string } | null;
  profile: {
    bio: string;
    photos: string;
    major: string;
    classYear: string;
    intent: string;
    hookupOptIn: boolean;
    prompts: string;
  } | null;
};

export function toCard(
  u: UserForCard,
  extra?: { likedYou?: boolean; superLikedYou?: boolean }
): CardProfile {
  const location = [u.city, u.country].filter(Boolean).join(", ") || null;
  return {
    id: u.id,
    name: u.name,
    age: calcAge(u.dob),
    major: u.profile?.major ?? "",
    classYear: u.profile?.classYear ?? "",
    campus: u.campus?.name ?? u.college,
    campusId: u.campusId,
    location,
    intent: u.profile?.intent ?? "Open to Anything",
    hookupOptIn: u.profile?.hookupOptIn ?? false,
    bio: u.profile?.bio ?? "",
    photos: parseStringArray(u.profile?.photos),
    prompts: parsePrompts(u.profile?.prompts),
    topBadge: u.subscription?.tier === "extra_credit",
    likedYou: extra?.likedYou,
    superLikedYou: extra?.superLikedYou,
  };
}

// Standard include for building a CardProfile from a Prisma user query.
export const cardInclude = {
  campus: { select: { name: true } },
  subscription: { select: { tier: true } },
  profile: {
    select: {
      bio: true,
      photos: true,
      major: true,
      classYear: true,
      intent: true,
      hookupOptIn: true,
      prompts: true,
    },
  },
} as const;
