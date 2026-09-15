from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .db import init_db, get_db
from .models import Customer, Repo, Job, PRRecord
from .webhooks import router as webhook_router
from .queue import run_fix_job
from .billing import usage_summary


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="AI Bug Fixer (MVP)", lifespan=lifespan)
from fastapi.middleware.cors import CORSMiddleware as _CORS
app.add_middleware(_CORS, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(webhook_router)


# ---------- schemas ----------
class EnqueueReq(BaseModel):
    repo_id: int
    issue_number: int
    issue_body: str = ""


class PauseReq(BaseModel):
    paused: bool = True


class CustomerCreate(BaseModel):
    name: str


class CustomerSettings(BaseModel):
    paused: bool | None = None
    max_tokens_per_job: int | None = None
    max_wall_clock_sec: int | None = None
    max_cost_per_job_usd: float | None = None
    notify_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None


class RepoCreate(BaseModel):
    customer_id: int
    full_name: str
    installation_id: int
    default_branch: str = "main"
    trigger_label: str = "ai-fix"


class RepoSettings(BaseModel):
    trigger_label: str | None = None
    default_branch: str | None = None
    paused: bool | None = None
    max_tokens_per_job: int | None = None
    max_cost_per_job_usd: float | None = None


# ---------- customers / repos ----------
@app.post("/customers")
def create_customer(req: CustomerCreate, db: Session = Depends(get_db)):
    c = Customer(name=req.name)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name}


@app.get("/customers")
def list_customers(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "paused": c.paused} for c in db.query(Customer).all()]


@app.patch("/customers/{customer_id}")
def update_customer(customer_id: int, req: CustomerSettings, db: Session = Depends(get_db)):
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "customer not found")
    for f in ("paused", "max_tokens_per_job", "max_wall_clock_sec", "max_cost_per_job_usd", "notify_url",
              "llm_api_key", "llm_model"):
        v = getattr(req, f)
        if v is not None:
            setattr(c, f, v)
    db.commit()
    has_key = bool(c.llm_api_key)
    return {"id": c.id, "paused": c.paused, "llm_key_set": has_key, "llm_model": c.llm_model or ""}


@app.post("/repos")
def connect_repo(req: RepoCreate, db: Session = Depends(get_db)):
    r = Repo(**req.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "full_name": r.full_name}


@app.get("/repos")
def list_repos(customer_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Repo)
    if customer_id is not None:
        q = q.filter_by(customer_id=customer_id)
    return [{"id": r.id, "full_name": r.full_name, "trigger_label": r.trigger_label,
             "paused": r.paused, "default_branch": r.default_branch} for r in q.all()]


@app.patch("/repos/{repo_id}")
def update_repo(repo_id: int, req: RepoSettings, db: Session = Depends(get_db)):
    r = db.get(Repo, repo_id)
    if not r:
        raise HTTPException(404, "repo not found")
    for f in ("trigger_label", "default_branch", "paused", "max_tokens_per_job", "max_cost_per_job_usd"):
        v = getattr(req, f)
        if v is not None:
            setattr(r, f, v)
    db.commit()
    return {"id": r.id, "paused": r.paused, "trigger_label": r.trigger_label}


@app.post("/repos/{repo_id}/pause")
def kill_switch(repo_id: int, req: PauseReq, db: Session = Depends(get_db)):
    r = db.get(Repo, repo_id)
    if not r:
        raise HTTPException(404, "repo not found")
    r.paused = req.paused
    db.commit()
    return {"repo": r.full_name, "paused": r.paused}


@app.post("/repos/{repo_id}/index")
def reindex_repo(repo_id: int, db: Session = Depends(get_db)):
    """Re-index endpoint: worker clones and indexes on next job; this marks docs stale."""
    from .models import RepoDoc
    n = db.query(RepoDoc).filter_by(repo_id=repo_id).count()
    return {"repo_id": repo_id, "indexed_chunks": n, "hint": "re-index runs automatically on next job"}


# ---------- jobs / PRs ----------
@app.post("/jobs")
def enqueue(req: EnqueueReq, db: Session = Depends(get_db)):
    repo = db.get(Repo, req.repo_id)
    if not repo:
        raise HTTPException(404, "repo not found")
    if repo.paused:
        raise HTTPException(409, "repo paused (kill switch)")
    job = Job(repo_id=req.repo_id, issue_number=req.issue_number, issue_body=req.issue_body, status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)
    run_fix_job.delay(job.id)
    return {"job_id": job.id}


@app.get("/jobs")
def list_jobs(repo_id: int | None = None, status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Job)
    if repo_id is not None:
        q = q.filter_by(repo_id=repo_id)
    if status:
        q = q.filter_by(status=status)
    q = q.order_by(Job.id.desc()).limit(100)
    return [{"id": j.id, "repo_id": j.repo_id, "issue": j.issue_number, "status": j.status,
             "tokens": j.tokens_used, "cost_usd": j.cost_usd, "created_at": str(j.created_at)} for j in q.all()]


@app.get("/jobs/{job_id}")
def job_status(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return {"id": job.id, "status": job.status, "tokens": job.tokens_used,
            "wall_clock": job.wall_clock_sec, "cost_usd": job.cost_usd,
            "model": job.model, "error": job.error}


@app.get("/jobs/{job_id}/transcript")
def job_transcript(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return {"transcript": job.transcript}


@app.get("/prs")
def list_prs(repo_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(PRRecord).join(Job)
    if repo_id is not None:
        q = q.filter(Job.repo_id == repo_id)
    q = q.order_by(PRRecord.id.desc()).limit(100)
    return [{"job_id": p.job_id, "pr_number": p.pr_number, "url": p.pr_url, "branch": p.branch} for p in q.all()]


# ---------- billing ----------
@app.get("/usage")
def usage(customer_id: int, db: Session = Depends(get_db)):
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "customer not found")
    out = usage_summary(customer_id)
    out["stripe_customer"] = c.stripe_customer_id or ""
    return out


@app.post("/billing/stripe-webhook")
async def stripe_webhook():
    # Stub: verify Stripe signature + record meter events here.
    return {"ok": True, "stub": True}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/github/install-url")
def github_install_url():
    from .config import settings
    from .setup import get_setting
    slug = get_setting("github_app_slug", settings.github_app_slug)
    return {"url": f"https://github.com/apps/{slug}/installations/new"}


@app.get("/setup/github", include_in_schema=False)
def setup_github_page(base_url: str = "http://127.0.0.1:8000"):
    """1-click GitHub App creation page. Owner opens it, clicks once, approves on GitHub."""
    import json as _json
    from .setup import build_manifest
    from fastapi.responses import HTMLResponse
    manifest = _json.dumps(build_manifest(base_url))
    return HTMLResponse(f"""<!doctype html><html><body style="font-family:system-ui;max-width:640px;margin:40px auto">
<h1>Create your PatchPilot GitHub App</h1>
<p>Click once — GitHub creates the app with the right permissions and sends us the credentials.</p>
<form action="https://github.com/settings/apps/new" method="post">
<input type="hidden" name="manifest" value='{manifest}'>
<button style="background:#111;color:#fff;padding:14px 26px;border-radius:8px;font-size:16px">Create GitHub App →</button>
</form>
<p style="color:#777">Your server must be reachable at {base_url} for GitHub to deliver webhooks.</p>
</body></html>""")


@app.get("/github/callback", include_in_schema=False)
def github_callback(code: str = ""):
    """GitHub redirects here after app creation. Exchange code, store credentials."""
    from fastapi.responses import HTMLResponse
    from .setup import exchange_manifest_code, save_converted_app
    if not code:
        return HTMLResponse("<h1>Missing code</h1>", status_code=400)
    try:
        saved = save_converted_app(exchange_manifest_code(code))
    except Exception as e:
        return HTMLResponse(f"<h1>Setup failed</h1><p>{e}</p>", status_code=500)
    return HTMLResponse(f"""<!doctype html><html><body style="font-family:system-ui;max-width:640px;margin:40px auto">
<h1>GitHub App connected ✓</h1>
<p>App id <b>{saved['app_id']}</b> ({saved['slug']}). Webhooks + PR creation are live.</p>
<p><a href="/app">Open dashboard →</a></p></body></html>""")


@app.get("/setup/status")
def setup_status(db: Session = Depends(get_db)):
    from .config import settings as _s
    from .setup import effective_github_conf
    conf = effective_github_conf()
    customers = db.query(Customer).all()
    return {"github_app_configured": bool(conf["private_key"]),
            "github_app_id": conf["app_id"],
            "server_llm_key": bool(_s.anthropic_api_key),
            "customers": [{"id": c.id, "name": c.name, "llm_key_set": bool(c.llm_api_key)} for c in customers]}


# Serve built dashboard (dashboard/dist) if present; otherwise API-only.
# /app/* serves the SPA (dashboard); / serves the landing site (same bundle, path-routed).
if os.path.isdir("dashboard/dist"):
    from fastapi.responses import FileResponse

    @app.get("/app", include_in_schema=False)
    def spa_root():
        return FileResponse("dashboard/dist/index.html")

    @app.get("/app/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        return FileResponse("dashboard/dist/index.html")

    app.mount("/", StaticFiles(directory="dashboard/dist", html=True), name="dashboard")
