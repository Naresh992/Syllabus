import "server-only";
import crypto from "crypto";
import { getTier, type TierId } from "./tiers";

// -----------------------------------------------------------------------------
// Razorpay integration.
// If RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set, we create real (test-mode)
// orders and verify signatures. Otherwise we run in MOCK mode so the entire
// paywall + upgrade flow is demoable without any keys or network calls.
// -----------------------------------------------------------------------------

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

export function isRazorpayLive(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

export function publicKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || KEY_ID || "";
}

export type CreatedOrder = {
  mock: boolean;
  orderId: string;
  amount: number; // paise
  currency: "INR";
  keyId: string;
};

export async function createTierOrder(tierId: TierId, userId: string): Promise<CreatedOrder> {
  const tier = getTier(tierId);
  const amountPaise = tier.priceInr * 100;
  const receipt = `syllabus_${tierId}_${userId.slice(0, 8)}_${Date.now()}`;

  if (!isRazorpayLive()) {
    return {
      mock: true,
      orderId: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
      amount: amountPaise,
      currency: "INR",
      keyId: "rzp_test_mock",
    };
  }

  const Razorpay = (await import("razorpay")).default;
  const instance = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  const order = await instance.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes: { userId, tier: tierId },
  });

  return {
    mock: false,
    orderId: order.id,
    amount: Number(order.amount),
    currency: "INR",
    keyId: publicKeyId(),
  };
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  // Mock orders are always "verified" (no real payment happened).
  if (params.orderId.startsWith("order_mock_")) return true;
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return safeEqual(expected, params.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
