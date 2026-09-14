import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-notebook">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="font-display text-sm uppercase text-ink-faint hover:text-crimson-600">← Back to Resyllabus</Link>
        <h1 className="font-display mt-4 text-4xl uppercase">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: September 14, 2026</p>
        <p className="mt-4 text-sm text-ink-light">ReSyllabus (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a verified student community platform (&quot;the Platform&quot;, &quot;the App&quot;) that allows verified college students to connect for friendship, networking, study collaboration, and dating. By using ReSyllabus, you agree to the practices described in this policy.</p>

        <div className="prose prose-sm mt-8 max-w-none">
          <h2 className="font-display text-xl uppercase">1. Information We Collect</h2>
          <ul className="list-disc pl-5 text-sm text-ink-light">
            <li><b>Account Information:</b> Name, college email, date of birth, gender, college/campus, major, class year.</li>
            <li><b>Verification Information:</b> Photo of college ID and a live selfie — used solely to verify you are a genuine, currently enrolled student aged 18+.</li>
            <li><b>Profile Information:</b> Photos, bio, prompts, intent, and other content you add.</li>
            <li><b>Usage Information:</b> Swipes, matches, messages, and engagement data.</li>
            <li><b>Payment Information:</b> Processed by third-party gateway. We do not store full card/UPI/bank details.</li>
            <li><b>Device & Technical:</b> IP, device type, OS, and city/campus-level location only — no precise GPS tracking.</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-sm text-ink-light">
            <li>Verify you are a genuine enrolled student aged 18+</li>
            <li>Create your profile and enable matching</li>
            <li>Process subscriptions and manage your tier</li>
            <li>Maintain safety — reports, blocks, fraud prevention</li>
            <li>Communicate about account, matches, updates</li>
            <li>Improve features and experience</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase">3. How We Protect Your ID and Verification Data</h2>
          <ul className="list-disc pl-5 text-sm text-ink-light">
            <li>ID and selfies are stored securely and separately from your public profile.</li>
            <li><b>Your ID and selfie are never shown to other users and never displayed publicly.</b></li>
            <li>Access is restricted to authorized personnel/systems solely for eligibility confirmation.</li>
            <li>Retained only as long as necessary for compliance/safety, then securely deleted per applicable law.</li>
          </ul>

          <h2 className="font-display mt-8 text-xl uppercase">4. Sharing of Information</h2>
          <p className="text-sm text-ink-light">We do not sell personal information. Limited sharing with:</p>
          <ul className="list-disc pl-5 text-sm text-ink-light">
            <li>Payment processors for transactions</li>
            <li>Verification providers to confirm eligibility</li>
            <li>Law enforcement/regulators if required by law or safety</li>
            <li>Service providers (hosting, analytics) under confidentiality</li>
          </ul>
          <p className="mt-2 text-sm text-ink-light">Other users only see what you make public (photos, bio, prompts, intent, campus/city) — never ID or exact location.</p>

          <h2 className="font-display mt-8 text-xl uppercase">5. Your Rights</h2>
          <p className="text-sm text-ink-light">Depending on location, you may access, correct, delete, or withdraw consent for your data. Contact <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 underline">resyllabus1@gmail.com</a>.</p>

          <h2 className="font-display mt-8 text-xl uppercase">6. Data Retention</h2>
          <p className="text-sm text-ink-light">Retained while account is active. On deletion, public profile and data removed within reasonable period except where law/safety requires retention.</p>

          <h2 className="font-display mt-8 text-xl uppercase">7. Children&apos;s Privacy</h2>
          <p className="text-sm text-ink-light">Strictly <b>18+</b>. We do not knowingly collect data from anyone under 18; such accounts are suspended and data deleted.</p>

          <h2 className="font-display mt-8 text-xl uppercase">8. Changes to This Policy</h2>
          <p className="text-sm text-ink-light">Updates will be notified via app/email. Continued use after changes constitutes acceptance.</p>

          <h2 className="font-display mt-8 text-xl uppercase">9. Contact Us</h2>
          <p className="text-sm text-ink-light">ReSyllabus — <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 underline">resyllabus1@gmail.com</a> — Hyderabad, Telangana, India</p>
        </div>
      </div>
    </div>
  );
}
