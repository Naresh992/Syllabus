import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { getTier, type TierId } from "./tiers";

const keyId = process.env.API_KEY ?? "";
const keySecret = process.env.API_KEY_2 ?? "";

export function isRazorpayConfigured() {
  return Boolean(keyId && keySecret);
}

export function razorpayKeyId() {
  return keyId;
}

function client() {
  if (!isRazorpayConfigured()) throw new Error("Razorpay is not configured yet.");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpayOrder(tierId: TierId, receipt: string) {
  const tier = getTier(tierId);
  const order = await client().orders.create({
    amount: tier.priceInr * 100,
    currency: "INR",
    receipt,
    notes: { tier: tierId },
  });
  return { id: order.id, amount: order.amount, currency: order.currency };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyWebhookSignature(raw: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? keySecret;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return Boolean(signature) && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export { keyId as razorpayPublicKey };
