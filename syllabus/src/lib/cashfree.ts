import "server-only";
import crypto from "crypto";
import { getTier, type TierId } from "./tiers";

// -----------------------------------------------------------------------------
// Cashfree PG integration (sandbox + production).
// Server uses App ID + Secret Key to create orders and confirm status
// server-to-server. The browser only ever sees the payment_session_id.
// Without keys, checkout fails CLOSED with a clear message (no mock upgrades).
// Get keys: https://test.cashfree.com (sandbox) / https://merchant.cashfree.com
// Env: CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV=sandbox|production
// -----------------------------------------------------------------------------

const APP_ID = process.env.CASHFREE_APP_ID || "";
const SECRET = process.env.CASHFREE_SECRET_KEY || "";
export const CASHFREE_ENV =
  process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";

const API_VERSION = "2023-08-01";

function base(): string {
  return CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function isCashfreeLive(): boolean {
  return Boolean(APP_ID && SECRET);
}

export type CreatedOrder = {
  orderId: string; // OUR order id (also the Cashfree order_id)
  cfOrderId: string; // Cashfree's cf_order_id
  amount: number; // paise (our ledger unit)
  amountInr: number; // rupees (Cashfree unit)
  currency: "INR";
  paymentSessionId: string;
  environment: "sandbox" | "production";
};

async function api<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": APP_ID,
      "x-client-secret": SECRET,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as any)?.message || (data as any)?.error || `Cashfree error ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Cashfree request failed");
  }
  return data as T;
}

export async function createTierOrder(
  tierId: TierId,
  user: { id: string; email: string; name: string },
  phone: string
): Promise<CreatedOrder> {
  if (!isCashfreeLive()) {
    throw new Error("Payments are not configured yet.");
  }
  const tier = getTier(tierId);
  const orderId = `resy_${tierId}_${crypto.randomBytes(8).toString("hex")}`.slice(0, 50);

  const data = await api<{
    cf_order_id: string;
    payment_session_id: string;
    order_status: string;
  }>("/orders", "POST", {
    order_id: orderId,
    order_amount: tier.priceInr,
    order_currency: "INR",
    customer_details: {
      customer_id: user.id,
      customer_email: user.email,
      customer_phone: phone,
      customer_name: user.name.slice(0, 100),
    },
    order_note: `Resyllabus ${tier.name} plan`,
  });

  if (!data.payment_session_id) throw new Error("Cashfree did not return a payment session.");

  return {
    orderId,
    cfOrderId: data.cf_order_id,
    amount: tier.priceInr * 100,
    amountInr: tier.priceInr,
    currency: "INR",
    paymentSessionId: data.payment_session_id,
    environment: CASHFREE_ENV,
  };
}

export type CashfreeOrderStatus = {
  orderStatus: string; // ACTIVE | PAID | EXPIRED ...
  cfPaymentId: string | null;
  amountInr: number;
};

export async function getOrderStatus(orderId: string): Promise<CashfreeOrderStatus> {
  const data = await api<{
    order_status: string;
    order_amount: number;
    cf_order_id: string;
  }>(`/orders/${encodeURIComponent(orderId)}`, "GET");

  let cfPaymentId: string | null = null;
  if (data.order_status === "PAID") {
    try {
      const pays = await api<{ cf_payment_id?: string }[]>(
        `/orders/${encodeURIComponent(orderId)}/payments`,
        "GET"
      );
      const list = Array.isArray(pays) ? pays : [];
      cfPaymentId = list.map((p) => p.cf_payment_id).find(Boolean) ?? data.cf_order_id ?? null;
    } catch {
      cfPaymentId = data.cf_order_id ?? null;
    }
  }

  return {
    orderStatus: data.order_status,
    cfPaymentId,
    amountInr: Number(data.order_amount),
  };
}

// Normalize an Indian mobile number to 10 digits. Returns null if invalid.
export function normalizePhone(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  const stripped = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (stripped.length === 13 && stripped.startsWith("91")) return stripped.slice(3);
  return /^[6-9]\d{9}$/.test(stripped) ? stripped : null;
}

// Cashfree PG webhook signature: HMAC-SHA256(secret, timestamp + rawBody),
// sent as hex or base64 in x-webhook-signature with x-webhook-timestamp.
export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
  if (!SECRET || !timestamp || !signature) return false;
  const hmac = crypto.createHmac("sha256", SECRET).update(timestamp + rawBody);
  const hex = hmac.digest("hex");
  const b64 = Buffer.from(hex, "hex").toString("base64");
  return safeEqual(hex, signature) || safeEqual(b64, signature);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length || ab.length === 0) return false;
  return crypto.timingSafeEqual(ab, bb);
}
