import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-notebook">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="font-display text-sm uppercase text-ink-faint hover:text-crimson-600">← Back to Resyllabus</Link>
        <h1 className="font-display mt-4 text-4xl uppercase">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: September 14, 2026</p>
        <p className="mt-4 text-sm text-ink-light">Welcome to ReSyllabus. These Terms govern your use of the Platform (&quot;ReSyllabus&quot;), operated from Hyderabad, Telangana, India. By creating an account or using the Platform, you agree to these Terms.</p>

        <div className="prose prose-sm mt-8 max-w-none text-sm text-ink-light">
          <h2 className="font-display text-xl uppercase text-ink">1. Eligibility</h2>
          <ul className="list-disc pl-5">
            <li>You must be at least <b>18</b> and a currently enrolled college/university student.</li>
            <li>Valid college email and genuine college ID required for verification.</li>
            <li>Accurate information only — impersonation or fake IDs result in immediate termination.</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">2. Account &amp; Verification</h2>
          <ul className="list-disc pl-5">
            <li>Matching/messaging requires successful identity and student verification.</li>
            <li>We may reject/suspend verification if fraud is suspected.</li>
            <li>You are responsible for your credentials and account activity.</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">3. Acceptable Use</h2>
          <p>You agree not to: harass, post false/misleading/explicit content, circumvent verification, create fake accounts, use bots, solicit money, or share others&apos; private info without consent. Violations may lead to suspension without refund.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">4. Subscriptions &amp; Payments</h2>
          <p>Free and paid tiers available. Paid tiers unlock features as described at purchase. Billed recurringly until cancelled. Prices may update prospectively. See <Link href="/refund" className="text-crimson-600 underline">Refund &amp; Cancellation Policy</Link>.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">5. User Content</h2>
          <p>You own your content but grant ReSyllabus a limited license to display it to operate the Service. We may remove content violating Terms.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">6. Safety Disclaimer</h2>
          <p>We verify identity at sign-up but cannot guarantee user conduct after verification. Meet at your own discretion — meet in public and exercise caution. We are not liable for interactions arising from the Platform.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">7. Termination</h2>
          <p>We may suspend/terminate for violations or safety. You may delete your account anytime via settings or by contacting us.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, we are not liable for indirect/incidental/consequential damages including data loss or disputes.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">9. Changes</h2>
          <p>Updated Terms will be posted; continued use constitutes acceptance.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">10. Governing Law</h2>
          <p>Laws of India; courts of Hyderabad, Telangana have jurisdiction.</p>

          <h2 className="font-display mt-8 text-xl uppercase text-ink">11. Contact</h2>
          <p>ReSyllabus — <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 underline">resyllabus1@gmail.com</a> — Hyderabad, Telangana, India</p>
        </div>
      </div>
    </div>
  );
}
