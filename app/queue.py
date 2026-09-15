from celery import Celery
from .config import settings

celery = Celery("ai_fixer", broker=settings.redis_url, backend=settings.redis_url)
celery.conf.update(task_time_limit=1500, task_acks_late=True)


def resolve_budgets(customer, repo) -> tuple[int, int, float]:
    """Precedence: repo override > customer override > global settings."""
    max_tokens = (repo.max_tokens_per_job or customer.max_tokens_per_job
                  or settings.agent_max_tokens_per_job)
    max_wall = (customer.max_wall_clock_sec or settings.agent_max_wall_clock_sec)
    max_cost = (repo.max_cost_per_job_usd or customer.max_cost_per_job_usd
                or settings.max_cost_per_job_usd)
    return max_tokens, max_wall, max_cost


@celery.task(name="run_fix_job", bind=True, max_retries=0)
def run_fix_job(self, job_id: int):
    import json, time, subprocess, tempfile, os
    from .db import get_engine, SessionLocal
    get_engine()
    from .models import Job, Repo, PRRecord, Customer
    from .agent import LocalExecutor, run_agent_loop
    from .pr import build_pr_body, create_branch_and_pr, post_issue_comment
    from .memory import build_memory_prompt, index_repo
    from .billing import record_billing

    t0 = time.time()
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job:
            return {"status": "failed", "reason": "job not found"}
        repo = db.get(Repo, job.repo_id)
        customer = db.get(Customer, repo.customer_id)
        repo_id, installation_id = repo.id, repo.installation_id
        full_name, issue_number, issue_body = repo.full_name, job.issue_number, job.issue_body
        default_branch = repo.default_branch or "main"

        # Kill switch (global + per-repo)
        if customer.paused or repo.paused:
            job.status = "failed"
            job.error = "paused by kill switch"
            db.commit()
            return {"status": "failed", "reason": "paused"}

        max_tokens, max_wall, max_cost = resolve_budgets(customer, repo)
        customer_id = customer.id
        llm_key = customer.llm_api_key or None
        llm_model = customer.llm_model or settings.agent_model

        job.status = "running"
        job.model = llm_model
        db.commit()

        # Sandbox: clone to temp dir (Docker container in prod; local tempdir in dev/test)
        tmp = tempfile.mkdtemp(prefix=f"job-{job_id}-")
        from .github import get_installation_token
        token = get_installation_token(installation_id)
        clone_url = f"https://x-access-token:{token}@github.com/{full_name}.git"
        subprocess.run(["git", "clone", "--depth", "1", "--branch", default_branch, clone_url, tmp],
                       check=False, timeout=120)

        # RAG: index on first run (or if empty), then retrieve context for the prompt
        try:
            from .models import RepoDoc
            n_docs = db.query(RepoDoc).filter_by(repo_id=repo_id).count()
            if n_docs == 0 and os.path.isdir(tmp):
                index_repo(repo_id, tmp)
            memory_context = build_memory_prompt(repo_id, issue_body)
        except Exception:
            memory_context = ""

        executor = LocalExecutor(workdir=tmp, issue_body=issue_body, test_command="pytest -q")
        result = run_agent_loop(
            issue_body, executor,
            max_iterations=settings.agent_max_iterations,
            max_tokens=max_tokens,
            max_wall_clock=max_wall,
            memory_context=memory_context,
            max_cost_usd=max_cost,
            api_key=llm_key,
            model=llm_model,
        )
        elapsed = time.time() - t0
        job = db.get(Job, job_id)
        job.tokens_used = result.tokens_used
        job.wall_clock_sec = elapsed
        job.transcript = json.dumps(result.transcript)[:50000]
        db.commit()

        cost = record_billing(job_id, customer_id, result.tokens_used, elapsed)

        if result.success:
            out = subprocess.run(["git", "-C", tmp, "status", "--porcelain"], capture_output=True, text=True)
            changed = [l[3:].strip().strip('"') for l in out.stdout.splitlines() if l.strip()]
            diff_files = {}
            for p in changed:
                fp = os.path.join(tmp, p)
                if os.path.isfile(fp):
                    with open(fp, errors="replace") as f:
                        diff_files[p] = f.read()
            last_test = ""
            for t in reversed(result.transcript):
                if isinstance(t, dict) and t.get("result", "").startswith("exit="):
                    last_test = t["result"]
                    break
            body = build_pr_body(issue_number, "see transcript", f"changed: {changed}",
                                 last_test or "(no test output)")
            pr = create_branch_and_pr(full_name, installation_id, issue_number,
                                      f"AI fix for #{issue_number}", body, diff_files,
                                      default_branch=default_branch)
            db.add(PRRecord(job_id=job.id, pr_number=pr["number"], pr_url=pr.get("html_url", ""),
                            branch=f"ai-fix/issue-{issue_number}"))
            job.status = "succeeded"
            db.commit()
        else:
            try:
                post_issue_comment(full_name, installation_id, issue_number,
                                   f"AI fixer tried {result.turns} steps but could not fix this within budget "
                                   f"({result.tokens_used} tokens, ${cost:.4f}). Transcript available to maintainers.")
            except Exception:
                pass
            job = db.get(Job, job_id)
            job.status = "failed"
            job.error = "agent did not reach passing tests"
            db.commit()
        return {"status": job.status}
    except Exception as e:
        try:
            db.rollback()
            job = db.get(Job, job_id)
            if job:
                job.status = "failed"
                job.error = str(e)[:2000]
                db.commit()
        except Exception:
            pass
        raise
    finally:
        db.close()
