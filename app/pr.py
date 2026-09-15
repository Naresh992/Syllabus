"""PR creation. NOTE: open-only. There is deliberately NO merge function."""
import httpx
from .guardrails import assert_branch_allowed


def create_branch_and_pr(repo_full_name: str, installation_id: int, issue_number: int,
                         title: str, body: str, diff_files: dict[str, str], default_branch: str = "main") -> dict:
    """diff_files: {path: new_content}. Creates branch ai-fix/issue-N via GitHub API, commits, opens PR.
    Implemented via git operations in sandbox in production; API-contents version here for clarity."""
    from .github import api_headers
    branch = f"ai-fix/issue-{issue_number}"
    assert_branch_allowed(branch)  # hard rule in code
    headers = api_headers(installation_id)

    # 1. get default branch SHA
    r = httpx.get(f"https://api.github.com/repos/{repo_full_name}/git/ref/heads/{default_branch}",
                  headers=headers, timeout=15)
    r.raise_for_status()
    base_sha = r.json()["object"]["sha"]

    # 2. create branch
    r = httpx.post(f"https://api.github.com/repos/{repo_full_name}/git/refs",
                   headers=headers, json={"ref": f"refs/heads/{branch}", "sha": base_sha}, timeout=15)
    if r.status_code not in (200, 201) and "already exists" not in r.text:
        r.raise_for_status()

    # 3. commit each file via contents API (simple; production uses git tree API for atomicity)
    for path, content in diff_files.items():
        import base64
        # get existing sha if any
        g = httpx.get(f"https://api.github.com/repos/{repo_full_name}/contents/{path}?ref={branch}",
                      headers=headers, timeout=15)
        sha = g.json().get("sha") if g.status_code == 200 else None
        put = httpx.put(f"https://api.github.com/repos/{repo_full_name}/contents/{path}",
                        headers=headers,
                        json={"message": f"ai-fix: {title}", "content": base64.b64encode(content.encode()).decode(),
                              "branch": branch, **({"sha": sha} if sha else {})}, timeout=15)
        put.raise_for_status()

    # 4. open PR (base = default branch, NEVER the reverse)
    pr = httpx.post(f"https://api.github.com/repos/{repo_full_name}/pulls", headers=headers,
                    json={"title": title, "head": branch, "base": default_branch, "body": body}, timeout=15)
    pr.raise_for_status()
    return pr.json()


def build_pr_body(issue_number: int, root_cause: str, fix: str, test_results: str) -> str:
    return (
        f"Automated fix for #{issue_number} (label `ai-fix`).\n\n"
        f"**Root cause:** {root_cause}\n\n**Fix:** {fix}\n\n"
        f"**Tests:**\n```\n{test_results[:3000]}\n```\n\n"
        f"_Human review required. This agent cannot merge._"
    )


def post_issue_comment(repo_full_name: str, installation_id: int, issue_number: int, body: str):
    from .github import api_headers
    headers = api_headers(installation_id)
    r = httpx.post(f"https://api.github.com/repos/{repo_full_name}/issues/{issue_number}/comments",
                   headers=headers, json={"body": body}, timeout=15)
    r.raise_for_status()
    return r.json()
