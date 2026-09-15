"""Per-customer memory (RAG).

On first repo connection: index README, CONTRIBUTING.md, code style signals,
and past merged PR patterns. Before each agent run, retrieve() the most
relevant chunks and inject them into the system prompt.

Implementation: dependency-free token-overlap retrieval over the RepoDoc
table. Signature-compatible with a future pgvector/Chroma upgrade.
"""
import os
import re

MAX_CHUNK = 2000
STYLE_FILES = ("pyproject.toml", "setup.cfg", ".flake8", ".eslintrc", ".eslintrc.json",
               "tsconfig.json", "ruff.toml", ".prettierrc", "package.json")


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9_]{3,}", text.lower()))


def _chunk(text: str, path: str) -> list[str]:
    text = text[:12000]
    return [text[i:i + MAX_CHUNK] for i in range(0, len(text), MAX_CHUNK)] or [""]


def index_repo(repo_id: int, workdir: str, past_prs: list[dict] | None = None) -> int:
    """Scan a cloned repo dir and upsert RepoDoc rows. Returns chunk count."""
    from . import db as dbmod
    dbmod.get_engine()
    db = dbmod.SessionLocal()
    try:
        from .models import RepoDoc
        db.query(RepoDoc).filter_by(repo_id=repo_id).delete()
        docs: list[RepoDoc] = []

        for fname, kind in (("README.md", "readme"), ("README.rst", "readme"),
                            ("CONTRIBUTING.md", "contributing"), ("AGENTS.md", "contributing")):
            p = os.path.join(workdir, fname)
            if os.path.exists(p):
                with open(p, errors="replace") as f:
                    for c in _chunk(f.read(), fname):
                        docs.append(RepoDoc(repo_id=repo_id, kind=kind, path=fname, content=c))

        # Style signals: linter configs + manifest excerpts + extension census
        style_bits: list[str] = []
        for sf in STYLE_FILES:
            p = os.path.join(workdir, sf)
            if os.path.exists(p):
                with open(p, errors="replace") as f:
                    style_bits.append(f"=== {sf} ===\n{f.read()[:3000]}")
        exts: dict[str, int] = {}
        for root, _, files in os.walk(workdir):
            if ".git" in root:
                continue
            for fn in files:
                _, dot, ext = fn.rpartition(".")
                if dot:
                    exts[ext] = exts.get(ext, 0) + 1
        style_bits.append("file extensions: " + ", ".join(f"{k}x{v}" for k, v in sorted(exts.items())[:20]))
        docs.append(__import__("app.models", fromlist=["RepoDoc"]).RepoDoc(
            repo_id=repo_id, kind="style", path="STYLE", content="\n".join(style_bits)[:6000]))

        # Past merged PR patterns (titles + bodies, passed in by caller)
        for pr in (past_prs or [])[:20]:
            txt = f"PR #{pr.get('number')}: {pr.get('title', '')}\n{(pr.get('body') or '')[:1500]}"
            docs.append(RepoDoc(repo_id=repo_id, kind="pr", path=f"PR-{pr.get('number')}", content=txt))

        db.add_all(docs)
        db.commit()
        return len(docs)
    finally:
        db.close()


def retrieve(repo_id: int, query: str, k: int = 4) -> list[str]:
    """Return top-k chunk contents ranked by token overlap with query."""
    from . import db as dbmod
    dbmod.get_engine()
    db = dbmod.SessionLocal()
    try:
        from .models import RepoDoc
        rows = db.query(RepoDoc).filter_by(repo_id=repo_id).all()
        q = _tokens(query)
        scored = sorted(rows, key=lambda r: len(q & _tokens(r.path + " " + r.content)), reverse=True)
        return [f"[{r.kind}:{r.path}]\n{r.content[:1500]}" for r in scored[:k] if len(q & _tokens(r.path + " " + r.content)) > 0]
    finally:
        db.close()


def build_memory_prompt(repo_id: int, issue_body: str) -> str:
    ctx = retrieve(repo_id, issue_body)
    if not ctx:
        return ""
    return "Relevant repo conventions / past fixes:\n" + "\n---\n".join(ctx)
