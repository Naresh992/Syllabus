import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-notebook">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="font-display text-sm uppercase text-ink-faint hover:text-crimson-600">← Back to Resyllabus</Link>
        <h1 className="font-display mt-4 text-4xl uppercase">Contact Us</h1>
        <p className="mt-3 text-ink-light">We&apos;re here to help. Reach out with questions, feedback, verification issues, or support requests.</p>

        <div className="card mt-8 p-6">
          <h2 className="font-display text-lg uppercase">Business</h2>
          <p className="mt-2 text-sm"><span className="font-bold">ReSyllabus</span> <span className="text-ink-faint">— Individual / Proprietor-operated; formal business registration in progress</span></p>
          <p className="mt-3 text-sm"><span className="font-bold">Email:</span> <a href="mailto:resyllabus1@gmail.com" className="text-crimson-600 hover:underline">resyllabus1@gmail.com</a></p>
          <p className="mt-1 text-sm"><span className="font-bold">Address:</span> Hyderabad, Telangana, India</p>
          <p className="mt-1 text-sm"><span className="font-bold">Support Hours:</span> Mon–Sat, 10 AM – 6 PM IST</p>
        </div>

        <div className="card mt-6 p-6">
          <h2 className="font-display text-lg uppercase">How we can help</h2>
          <p className="mt-2 text-sm text-ink-light">For account verification issues, billing questions, refund requests, or to report a safety concern, email us at <a href="mailto:resyllabus1@gmail.com" className="font-bold text-crimson-600 hover:underline">resyllabus1@gmail.com</a> and we&apos;ll respond as soon as possible.</p>
        </div>
      </div>
    </div>
  );
}
