"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import Modal from "@/components/Modal";
import { LoadingScreen, Spinner, Seal } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/fetcher";
import { TIERS, TIER_ORDER, type TierId } from "@/lib/tiers";

export default function PricingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/api/auth/me").then(({ user }) => setCurrent(user.tier)).catch(() => setCurrent("audit"));
  }, []);

  function finishUpgrade(tierId: TierId) {
    setCurrent(tierId);
    setBusyTier(null);
    setSuccess(TIERS[tierId].name);
    router.refresh();
  }

  async function choose(tierId: TierId) {
    setError(null);
    setBusyTier(tierId);
    try {
      const order = await apiPost("/api/billing/checkout", { tier: tierId });
      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
        document.body.appendChild(script);
      });
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable.");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Resyllabus",
        description: TIERS[tierId].name,
        order_id: order.orderId,
        theme: { color: "#f4c542" },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          window.location.href = `/billing/return?order_id=${encodeURIComponent(response.razorpay_order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id)}&signature=${encodeURIComponent(response.razorpay_signature)}`;
        },
        modal: { ondismiss: () => setBusyTier(null) },
      });
      checkout.open();
    } catch (e: any) {
      setError(e.message || "Upgrade failed.");
      setBusyTier(null);
    }
  }

  async function downgrade() {
    setBusyTier("audit");
    try {
      await apiPost("/api/billing/cancel");
      setCurrent("audit");
      router.refresh();
    } finally {
      setBusyTier(null);
    }
  }

  if (!current) return <LoadingScreen label="Loading plans…" />;

  const currentIdx = TIER_ORDER.indexOf(current as TierId);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <p className="font-hand text-3xl text-redpen">pick your course load</p>
        <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">
          Free to audit.<br />Cheap to <span className="hl">ace.</span>
        </h1>
        <p className="mt-2 font-medium text-ink-light">Upgrade anytime. Secure checkout via Razorpay.</p>
      </div>

      {error && (
        <p className="mx-auto mt-4 max-w-md rounded-lg bg-redpen/10 px-3 py-2 text-center text-sm text-redpen">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {TIER_ORDER.map((id, idx) => {
          const t = TIERS[id];
          const isCurrent = id === current;
          const featured = id === "enrolled";
          return (
            <div
              key={id}
              className={clsx(
                "card flex flex-col p-6 transition-transform hover:rotate-0 hover:scale-[1.03]",
                featured ? "rotate-1 bg-ink text-paper-50" : idx % 2 === 0 ? "-rotate-1" : "rotate-1"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl uppercase">{t.name}</h3>
                {featured && <span className="badge bg-marker text-ink">★ Popular</span>}
                {isCurrent && <span className="badge bg-forest-600 text-paper-50">Current</span>}
              </div>
              <p className={clsx("mt-1 min-h-[40px] text-sm font-medium", featured ? "text-paper-50/70" : "text-ink-light")}>{t.blurb}</p>
              <p className="font-display mt-3 text-3xl">
                {t.priceInr === 0 ? (
                  "Free"
                ) : (
                  <>
                    ₹{t.priceInr}
                    <span className="text-base font-normal text-ink-light">/mo</span>
                  </>
                )}
              </p>

              <ul className={clsx("mt-4 flex-1 space-y-2 text-sm font-medium", featured ? "text-paper-50/80" : "text-ink-light")}>
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className={featured ? "text-marker" : "text-forest-600"}>✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <button className="btn-ghost w-full" disabled>
                    Current plan
                  </button>
                ) : id === "audit" ? (
                  <button className="btn-ghost w-full" onClick={downgrade} disabled={busyTier === "audit"}>
                    {busyTier === "audit" ? <Spinner className="h-4 w-4" /> : "Downgrade to Audit"}
                  </button>
                ) : (
                  <button
                    className={featured ? "btn-primary w-full" : "btn-forest w-full"}
                    onClick={() => choose(id)}
                    disabled={busyTier === id}
                  >
                    {busyTier === id ? (
                      <Spinner className="h-4 w-4" />
                    ) : idx > currentIdx ? (
                      `Upgrade to ${t.name}`
                    ) : (
                      `Switch to ${t.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!success} onClose={() => setSuccess(null)} title="You're upgraded!">
        <div className="mx-auto w-fit">
          <Seal size={80} color="bg-marker text-ink">A+</Seal>
        </div>
        <p className="mt-3 text-center font-medium text-ink-light">
          Welcome to <span className="hl font-bold text-ink">{success}</span>. Your new perks are
          active immediately.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setSuccess(null)}>
            Stay here
          </button>
          <button className="btn-primary flex-1" onClick={() => router.push("/syllabus")}>
            Back to The Syllabus
          </button>
        </div>
      </Modal>
    </div>
  );
}
