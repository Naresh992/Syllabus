import { NextResponse } from "next/server";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export const apiError = {
  unauthorized: () =>
    NextResponse.json({ error: "You need to sign in first." }, { status: 401 }),
  forbidden: (message = "You don't have access to that.") =>
    NextResponse.json({ error: message }, { status: 403 }),
  notVerified: () =>
    NextResponse.json(
      { error: "Your account is still pending verification.", code: "not_verified" },
      { status: 403 }
    ),
  badRequest: (message: string, extra?: Record<string, unknown>) =>
    NextResponse.json({ error: message, ...extra }, { status: 400 }),
  notFound: (message = "Not found.") =>
    NextResponse.json({ error: message }, { status: 404 }),
  paywall: (message: string, tier?: string) =>
    NextResponse.json({ error: message, code: "upgrade_required", tier }, { status: 402 }),
  server: (message = "Something went wrong.") =>
    NextResponse.json({ error: message }, { status: 500 }),
};
