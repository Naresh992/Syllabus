// Cross-provider JSON helpers. Profile.photos & Profile.prompts are stored as
// JSON strings for SQLite/Postgres portability. These decode/encode safely.

export type Prompt = { q: string; a: string };

export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function parsePrompts(value: string | null | undefined): Prompt[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.q === "string" && typeof p.a === "string")
      .map((p) => ({ q: String(p.q), a: String(p.a) }));
  } catch {
    return [];
  }
}

export function stringify(value: unknown): string {
  return JSON.stringify(value ?? []);
}
