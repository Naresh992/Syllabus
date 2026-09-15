import hmac, hashlib, json
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from .db import get_db
from .models import Repo, Job, Customer
from .config import settings
from .queue import run_fix_job

router = APIRouter()


def verify_signature(payload: bytes, signature: str):
    if not signature or not signature.startswith("sha256="):
        raise HTTPException(401, "missing signature")
    from .setup import effective_github_conf
    secret = effective_github_conf()["webhook_secret"]
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(401, "bad signature")


@router.post("/webhooks/github")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    verify_signature(raw, request.headers.get("x-hub-signature-256", ""))
    event = request.headers.get("x-github-event", "")
    payload = json.loads(raw)

    if event == "issues" and payload.get("action") == "labeled":
        label = payload["label"]["name"]
        repo_name = payload["repository"]["full_name"]
        issue_number = payload["issue"]["number"]
        issue_body = payload["issue"].get("body", "") or ""
        installation_id = payload["installation"]["id"]
        repo = db.query(Repo).filter_by(full_name=repo_name).first()
        if not repo:
            return {"ignored": "repo not connected"}
        want = repo.trigger_label or settings.trigger_label
        if label != want:
            return {"ignored": "label mismatch"}
        if repo.paused:
            return {"ignored": "repo paused (kill switch)"}
        job = Job(repo_id=repo.id, issue_number=issue_number, issue_body=issue_body, status="pending")
        db.add(job)
        db.commit()
        db.refresh(job)
        run_fix_job.delay(job.id)
        return {"enqueued": job.id}

    if event == "installation" and payload.get("action") == "created":
        # Auto-connect: installer becomes a customer (matched by sender login
        # when possible), each installed repo becomes a connected Repo.
        installation_id = payload["installation"]["id"]
        login = (payload.get("sender") or {}).get("login", f"github-{installation_id}")
        customer = db.query(Customer).filter_by(name=login).first()
        if not customer:
            customer = Customer(name=login)
            db.add(customer)
            db.commit()
            db.refresh(customer)
        connected = []
        for r in payload.get("repositories", []):
            full = r["full_name"]
            existing = db.query(Repo).filter_by(full_name=full).first()
            if existing:
                existing.installation_id = installation_id
                existing.paused = False
                connected.append(full)
            else:
                db.add(Repo(customer_id=customer.id, full_name=full,
                            installation_id=installation_id,
                            default_branch=r.get("default_branch", "main")))
                connected.append(full)
        db.commit()
        return {"connected": connected, "customer_id": customer.id}

    if event == "installation" and payload.get("action") in ("deleted", "suspend"):
        # Auto kill-switch: installer removed the app -> pause all its repos.
        installation_id = payload["installation"]["id"]
        repos = db.query(Repo).filter_by(installation_id=installation_id).all()
        for r in repos:
            r.paused = True
        db.commit()
        return {"paused": [r.full_name for r in repos]}

    if event == "installation_repositories":
        installation_id = payload["installation"]["id"]
        if payload.get("action") == "added":
            owner = payload["installation"]["account"]["login"]
            customer = db.query(Customer).filter_by(name=owner).first()
            if not customer:
                customer = Customer(name=owner)
                db.add(customer)
                db.commit()
                db.refresh(customer)
            added = []
            for r in payload.get("repositories_added", []):
                full = r["full_name"]
                if not db.query(Repo).filter_by(full_name=full).first():
                    db.add(Repo(customer_id=customer.id, full_name=full,
                                installation_id=installation_id))
                    added.append(full)
            db.commit()
            return {"connected": added}
        if payload.get("action") == "removed":
            removed = [r["full_name"] for r in payload.get("repositories_removed", [])]
            for full in removed:
                repo = db.query(Repo).filter_by(full_name=full).first()
                if repo:
                    repo.paused = True
            db.commit()
            return {"paused": removed}

    return {"ignored": event}
