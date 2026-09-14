import Link from "next/link";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-notebook">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="font-display text-sm uppercase text-ink-faint hover:text-crimson-600">← Back to Resyllabus</Link>
        <h1 className="font-display mt-4 text-4xl uppercase">Refund &amp; Cancellation Policy</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: September 14, 2026</p>

        <div className="prose prose-sm mt-8 max-w-none text-sm text-ink-light">
          <h2 className="font-display text-xl uppercase text-ink">1. Subscription Cancellation</h2>
          <ul className="list-disc pl-5">
            <li>Cancel anytime via account settings or email <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 underline">resyllabus1@gmail.com</a>.</li>
            <li>Access continues until end of current billing period; no partial credit except as below.</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">2. Refund Eligibility</h2>
          <ul className="list-disc pl-5">
            <li><b>Refund window:</b> Within <b>24–48 hours</b> of payment, provided premium features have <b>not been used</b> (e.g., no Super Likes, boosts, or premium messaging).</li>
            <li>If any paid feature was used, transaction is non-refundable.</li>
            <li>Requests after 48 hours are not eligible regardless of usage.</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">3. Non-Refundable Circumstances</h2>
          <ul className="list-disc pl-5">
            <li>Change of mind after window</li>
            <li>Partial use after window</li>
            <li>Suspension for Terms violation</li>
            <li>Failure to cancel before next cycle</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">4. How to Request a Refund</h2>
          <p>Email <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 underline">resyllabus1@gmail.com</a> with account email, date/amount, and reason. Approved refunds return to original payment method within 7–10 business days.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">5. Failed or Duplicate Payments</h2>
          <p>Contact us immediately with proof. Verified errors are refunded in full regardless of window.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">6. Contact</h2>
          <p>ReSyllabus — <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 underline">resyllabus1@gmail.com</a> — Hyderabad, Telangana, India</p>
        </div>
      </div>
    </div>
  );
}
