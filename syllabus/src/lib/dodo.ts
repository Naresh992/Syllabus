import "server-only";
import { getTier, type TierId } from "./tiers";

// -----------------------------------------------------------------------------
// Dodo Payments integration (test + live).
// Flow: server creates a Checkout Session (product_cart) -> browser redirects
// to checkout_url -> Dodo returns to /billing/return -> server confirms via
// GET /checkouts/{session_id} (payment_status === "succeeded") -> upgrade.
// Webhooks (payment.succeeded) are the backup path.
// Env: DODO_PAYMENTS_API_KEY, DODO_ENV=test|live, DODO_WEBHOOK_SECRET,
//   DODO_PRODUCT_ENROLLED, DODO_PRODUCT_HONOR_ROLL, DODO_PRODUCT_EXTRA_CREDIT
// Dashboard: create 3 ONE-TIME products priced 599 / 1299 / 2399 INR.
// Without keys/products, checkout fails CLOSED with a clear message.
// Docs: https://docs.dodopayments.com (hosts below + Bearer auth confirmed)
// -----------------------------------------------------------------------------

const API_KEY = process.env.DODO_PAYMENTS_API_KEY || "";
const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET || "";
export const DODO_ENV = process.env.DODO_ENV === "live" ? "live" : "test";

const PRODUCT_IDS: Record<TierId, string> = {
  audit: "",
  enrolled: process.env.DODO_PRODUCT_ENROLLED || "",
  honor_roll: process.env.DODO_PRODUCT_HONOR_ROLL || "",
  extra_credit: process.env.DODO_PRODUCT_EXTRA_CREDIT || "",
};

function base(): string {
  return DODO_ENV === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}

export function isDodoConfigured(): boolean {
  return Boolean(API_KEY);
}

export function productIdFor(tier: TierId): string {
  return PRODUCT_IDS[tier] ?? "";
}

async function api<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as any)?.message || (data as any)?.error || `Dodo error ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Dodo request failed");
  }
  return data as T;
}

export type CreatedSession = {
  orderId: string; // Dodo session_id (our Payment.orderId)
  checkoutUrl: string;
  amount: number; // paise (ledger unit)
  amountInr: number;
  currency: "INR";
  environment: "test" | "live";
};

export async function createCheckoutSession(
  tierId: TierId,
  user: { id: string; email: string; name: string },
  returnUrl: string
): Promise<CreatedSession> {
  if (!isDodoConfigured()) throw new Error("Payments are not configured yet.");
  const productId = productIdFor(tierId);
  if (!productId) throw new Error("This plan is not configured for payments yet.");
  const tier = getTier(tierId);

  const data = await api<{ session_id: string; checkout_url: string }>(
    "/checkouts",
    "POST",
    {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name.slice(0, 100) },
      return_url: returnUrl,
      billing_currency: "INR",
      feature_flags: { redirect_immediately: true },
      metadata: { userId: user.id, tier: tierId, app: "resyllabus" },
    }
  );

  if (!data.session_id || !data.checkout_url) {
    throw new Error("Dodo did not return a checkout session.");
  }

  return {
    orderId: data.session_id,
    checkoutUrl: data.checkout_url,
    amount: tier.priceInr * 100,
    amountInr: tier.priceInr,
    currency: "INR",
    environment: DODO_ENV,
  };
}

export type DodoSessionStatus = {
  status: string | null; // succeeded | failed | cancelled | processing | ...
  paymentId: string | null;
  email: string | null;
};

export async function getSessionStatus(sessionId: string): Promise<DodoSessionStatus> {
  const data = await api<{
    payment_id?: string | null;
    payment_status?: string | null;
    customer_email?: string | null;
  }>(`/checkouts/${encodeURIComponent(sessionId)}`, "GET");

  return {
    status: typeof data.payment_status === "string" ? data.payment_status.toLowerCase() : null,
    paymentId: data.payment_id ?? null,
    email: data.customer_email ?? null,
  };
}

export function webhookSecret(): string {
  return WEBHOOK_SECRET;
}
