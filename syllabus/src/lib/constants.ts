// Shared domain constants for Resyllabus.

export const APP_NAME = "Resyllabus";
export const TAGLINE = "Add someone to your syllabus.";

// Relationship intent = "Prerequisites" (required, single-select).
// `hookup` is opt-in via a separate toggle (off by default).
export const INTENTS = [
  "New Friends",
  "Study Buddy First",
  "Open to Anything",
] as const;

export type Intent = (typeof INTENTS)[number];

// The 3 required prompt questions users answer while enrolling.
export const PROMPT_QUESTIONS = [
  "Most unhinged thing I've done on campus is…",
  "You'll find me in the library when…",
  "My ideal study partner is…",
  "The class that changed me was…",
  "I'll add you to my syllabus if…",
  "My most controversial campus opinion is…",
  "Two truths and a lie about my major…",
  "Hype me up before finals by…",
] as const;

export const CLASS_YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Grad Student",
] as const;

export const MAJORS = [
  "Computer Science",
  "Biology",
  "Business",
  "Psychology",
  "Mechanical Engineering",
  "Economics",
  "English Literature",
  "Political Science",
  "Nursing",
  "Fine Arts",
  "Philosophy",
  "Chemistry",
  "Communications",
  "Architecture",
  "Neuroscience",
  "Film & Media",
] as const;

export const REPORT_REASONS = [
  "Fake profile / impersonation",
  "Harassment or hate",
  "Inappropriate photos",
  "Spam or scam",
  "Underage",
  "Something else",
] as const;

// Photo constraints for profiles.
export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 6;

// Age gate.
export const MIN_AGE = 18;

export function calcAge(dob: Date | string): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
