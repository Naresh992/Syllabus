"""Billing hooks: cost tracking per job + usage API + Stripe stub."""
from .config import settings


def cost_for_tokens(tokens: int) -> float:
    return round(tokens / 1000 * settings.price_per_1k_tokens_usd, 4)


def record_billing(job_id: int, customer_id: int, tokens: int, seconds: float) -> float:
    """Write a BillingEvent row and update Job.cost_usd. Returns cost."""
    from . import db as dbmod
    dbmod.get_engine()
    db = dbmod.SessionLocal()
    try:
        from .models import BillingEvent, Job
        cost = cost_for_tokens(tokens)
        db.add(BillingEvent(job_id=job_id, customer_id=customer_id,
                            tokens=tokens, seconds=seconds, cost_usd=cost))
        job = db.get(Job, job_id)
        if job:
            job.cost_usd = cost
        db.commit()
        # Future: stripe.BillingMeterEvent.create(...) here, then mark stripe_reported.
        return cost
    finally:
        db.close()


def usage_summary(customer_id: int) -> dict:
    from . import db as dbmod
    dbmod.get_engine()
    db = dbmod.SessionLocal()
    try:
        from .models import Job, Repo, BillingEvent
        jobs = db.query(Job).join(Repo).filter(Repo.customer_id == customer_id).all()
        events = db.query(BillingEvent).filter_by(customer_id=customer_id).all()
        billed = sum(e.cost_usd or 0 for e in events)
        unbilled = sum((j.cost_usd or 0) for j in jobs) - billed
        return {
            "customer_id": customer_id,
            "jobs": len(jobs),
            "tokens": sum(j.tokens_used or 0 for j in jobs),
            "seconds": sum(j.wall_clock_sec or 0 for j in jobs),
            "cost_usd_total": round(sum(j.cost_usd or 0 for j in jobs), 4),
            "cost_usd_billed": round(billed, 4),
            "cost_usd_unbilled": round(max(unbilled, 0), 4),
            "stripe_customer": "",  # filled by caller
            "detail": [{"job_id": j.id, "status": j.status, "tokens": j.tokens_used,
                        "sec": j.wall_clock_sec, "cost_usd": j.cost_usd} for j in jobs],
        }
    finally:
        db.close()
