import "server-only";
import crypto from "crypto";
import DodoPayments from "dodopayments";
import { getTier, type TierId } from "./tiers";

const apiKey = process.env.DODO_PAYMENTS_API_KEY ?? "";
const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? "";

export const dodo = apiKey ? new DodoPayments({ bearerToken: apiKey }) : null;

const productIds: Partial<Record<TierId, string>> = {
  enrolled: process.env.DODO_PRODUCT_ID_ENROLLED,
  honor_roll: process.env.DODO_PRODUCT_ID_HONOR_ROLL,
  extra_credit: process.env.DODO_PRODUCT_ID_EXTRA_CREDIT,
};

export function getDodoProductId(tierId: TierId) {
  const productId = productIds[tierId];
  if (!productId) throw new Error(`Dodo product ID is missing for ${getTier(tierId).name}.`);
  return productId;
}

export async function createTierCheckout(tierId: TierId, user: { id: string; email: string; name: string }) {
  if (!dodo) throw new Error("Dodo Payments is not configured.");
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  const baseUrl = origin?.startsWith("http") ? origin : `https://${origin}`;
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: getDodoProductId(tierId), quantity: 1 }],
    customer: { email: user.email, name: user.name },
    metadata: { userId: user.id, tier: tierId },
    return_url: `${baseUrl}/pricing?payment=complete&tier=${tierId}`,
    cancel_url: `${baseUrl}/pricing?payment=cancelled`,
    customization: { show_order_details: true },
  });
  if (!session.checkout_url) throw new Error("Dodo did not return a checkout URL.");
  return { sessionId: session.session_id, checkoutUrl: session.checkout_url };
}

export function verifyDodoWebhook(rawBody: string, headers: Headers) {
  const id = headers.get("webhook-id") ?? "";
  const timestamp = headers.get("webhook-timestamp") ?? "";
  const signatureHeader = headers.get("webhook-signature") ?? "";
  if (!webhookSecret || !id || !timestamp || !signatureHeader) return false;
  const secret = webhookSecret.replace(/^whsec_/, "");
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", Buffer.from(secret, "base64")).update(signed).digest("base64");
  return signatureHeader.split(" ").some((value) => {
    const signature = value.replace(/^v\d+,/, "");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
