"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LoadingScreen, Spinner, Seal } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/fetcher";

type State =
  | { kind: "working"; label: string }
  | { kind: "success"; tierName: string }
  | { kind: "failed"; message: string };

export default function BillingReturnPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "working", label: "Confirming your payment…" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const returnedOrderId = params.get("order_id") ?? "";
        const returnedPaymentId = params.get("payment_id") ?? "";
        const returnedSignature = params.get("signature") ?? "";

        // Resolve OUR pending order (never trust client-provided ids alone).
        const { pending } = await apiGet("/api/billing/pending");
        if (!pending) {
          setState({
            kind: "failed",
            message: "We couldn't find a pending upgrade on your account. If you were charged, contact support.",
          });
          return;
        }

        if (!returnedOrderId || !returnedPaymentId || !returnedSignature || returnedOrderId !== pending.orderId) {
          setState({ kind: "failed", message: "Payment confirmation details are missing or invalid." });
          return;
        }

        setState({ kind: "working", label: "Confirming with Razorpay…" });
        const res = await apiPost("/api/billing/verify", {
          orderId: returnedOrderId,
          paymentId: returnedPaymentId,
          signature: returnedSignature,
        });
        setState({ kind: "success", tierName: res.tierName });
        router.refresh();
      } catch (e: any) {
        setState({ kind: "failed", message: e.message || "Could not confirm the payment." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.kind === "working") return <LoadingScreen label={state.label} />;

  if (state.kind === "success") {
    return (
      <div className="mx-auto max-w-md pt-6 text-center">
        <div className="card taped p-8 pt-10">
          <div className="mx-auto w-fit animate-pop">
            <Seal size={96} color="bg-marker text-ink">A+<br />paid</Seal>
          </div>
          <h1 className="font-display mt-4 text-3xl uppercase">Payment confirmed</h1>
          <p className="mt-2 font-medium text-ink-light">
            Welcome to <span className="hl font-bold text-ink">{state.tierName}</span> — perks are active now.
          </p>
          <div className="mt-6 flex gap-2">
            <Link href="/roster" className="btn-ghost flex-1">My Roster</Link>
            <Link href="/syllabus" className="btn-primary flex-1">The Syllabus →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pt-6 text-center">
      <div className="card taped p-8 pt-10">
        <div className="mx-auto grid h-16 w-16 -rotate-6 place-items-center rounded-full border-2 border-ink bg-redpen font-display text-3xl text-paper-50">
          ✕
        </div>
        <h1 className="font-display mt-4 text-2xl uppercase">Payment didn&apos;t go through</h1>
        <p className="mt-2 text-sm font-medium text-ink-light">{state.message}</p>
        <div className="mt-6 flex gap-2">
          <Link href="/roster" className="btn-ghost flex-1">Back</Link>
          <Link href="/pricing" className="btn-marker flex-1">Try again</Link>
        </div>
      </div>
    </div>
  );
}
