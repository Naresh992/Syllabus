// -----------------------------------------------------------------------------
// Subscription tiers — academic-themed. Prices are whole INR amounts used by Dodo product plans.
// -----------------------------------------------------------------------------

export type TierId = "audit" | "enrolled" | "honor_roll" | "extra_credit";

export type Tier = {
  id: TierId;
  name: string;
  blurb: string;
  priceInr: number; // whole rupees / month
  swipesPerDay: number | null; // null = unlimited
  superLikesPerWeek: number; // "Raise Hand"
  perks: string[];
  // feature gates
  seeWhoLikedYou: boolean; // "Class Roster"
  interCollege: boolean;
  advancedFilters: boolean;
  readReceipts: boolean;
  weeklyBoost: boolean; // "Dean's List Spotlight"
  incognito: boolean; // "Independent Study"
  topBadge: boolean; // "Valedictorian"
  earlyEventAccess: boolean;
  adFree: boolean;
};

export const TIERS: Record<TierId, Tier> = {
  audit: {
    id: "audit",
    name: "Audit",
    blurb: "Sit in on the course. Free forever.",
    priceInr: 0,
    swipesPerDay: 15,
    superLikesPerWeek: 0,
    perks: ["15 swipes / day", "Basic filters", "Message & connect"],
    seeWhoLikedYou: false,
    interCollege: false,
    advancedFilters: false,
    readReceipts: false,
    weeklyBoost: false,
    incognito: false,
    topBadge: false,
    earlyEventAccess: false,
    adFree: false,
  },
  enrolled: {
    id: "enrolled",
    name: "Enrolled",
    blurb: "Full course load. The essentials, unlocked.",
    priceInr: 599,
    swipesPerDay: null,
    superLikesPerWeek: 5,
    perks: [
      "Unlimited swipes",
      'See who liked you ("Class Roster")',
      '5 Raise Hands / week',
      "Ad-free",
      "Inter-college mode",
    ],
    seeWhoLikedYou: true,
    interCollege: true,
    advancedFilters: false,
    readReceipts: false,
    weeklyBoost: false,
    incognito: false,
    topBadge: false,
    earlyEventAccess: false,
    adFree: true,
  },
  honor_roll: {
    id: "honor_roll",
    name: "Honor Roll",
    blurb: "Top of the class. Get seen more.",
    priceInr: 1299,
    swipesPerDay: null,
    superLikesPerWeek: 5,
    perks: [
      "Everything in Enrolled",
      'Weekly boost ("Dean\'s List Spotlight")',
      "Advanced filters",
      "Read receipts",
    ],
    seeWhoLikedYou: true,
    interCollege: true,
    advancedFilters: true,
    readReceipts: true,
    weeklyBoost: true,
    incognito: false,
    topBadge: false,
    earlyEventAccess: false,
    adFree: true,
  },
  extra_credit: {
    id: "extra_credit",
    name: "Extra Credit",
    blurb: "Go above and beyond. Everything, plus prestige.",
    priceInr: 2399,
    swipesPerDay: null,
    superLikesPerWeek: 999,
    perks: [
      "Everything in Honor Roll",
      "Unlimited Raise Hands",
      'Incognito mode ("Independent Study")',
      'Top profile badge ("Valedictorian")',
      "Early access to Study Group events",
    ],
    seeWhoLikedYou: true,
    interCollege: true,
    advancedFilters: true,
    readReceipts: true,
    weeklyBoost: true,
    incognito: true,
    topBadge: true,
    earlyEventAccess: true,
    adFree: true,
  },
};

export const TIER_ORDER: TierId[] = ["audit", "enrolled", "honor_roll", "extra_credit"];

export function getTier(id: string | null | undefined): Tier {
  if (id && id in TIERS) return TIERS[id as TierId];
  return TIERS.audit;
}

export function isPaidTier(id: string | null | undefined): boolean {
  return !!id && id !== "audit" && id in TIERS;
}
