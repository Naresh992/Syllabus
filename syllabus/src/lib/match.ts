import { prisma } from "@/lib/db";

// Matches are stored with a canonical (sorted) ordering so the unique
// constraint holds regardless of who swiped first.
export async function createOrGetMatch(aId: string, bId: string) {
  const [x, y] = [aId, bId].sort();
  const existing = await prisma.match.findFirst({
    where: {
      OR: [
        { userAId: x, userBId: y },
        { userAId: y, userBId: x },
      ],
    },
  });
  if (existing) return { match: existing, created: false };
  const match = await prisma.match.create({ data: { userAId: x, userBId: y } });
  return { match, created: true };
}
