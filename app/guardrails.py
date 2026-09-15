"""Guardrails enforced in code, not prompts. All agent actions funnel through here."""
import re
import shlex

PROTECTED_BRANCHES = {"main", "master", "production", "prod"}

# Allowlist: only test/build/lint/read-only commands. No rm -rf, no pushes, no migrations vs prod.
SAFE_COMMAND_PREFIXES = (
    "pytest", "python -m pytest", "npm test", "npm run test",
    "yarn test", "go test", "cargo test",
    "ruff", "flake8", "eslint", "tsc", "mypy", "black --check",
    "ls", "cat", "grep", "rg", "find", "git status", "git diff", "git log",
    "python ", "node ", "pip list", "pip install",
)

BLOCKED_PATTERNS = [
    r"rm\s+-rf", r"rm\s+-r\s+/", r"mkfs", r":\(\)\s*\{",
    r"git\s+push.*--force", r"git\s+push\s+origin\s+main", r"git\s+push\s+origin\s+master",
    r"push.*main", r"push.*master",
    r"alembic\s+upgrade\s+head.*prod", r"migrate.*prod",
    r"DROP\s+TABLE", r"DROP\s+DATABASE",
    r"gh\s+pr\s+merge", r"git\s+merge.*main",
]


def assert_branch_allowed(branch: str):
    base = branch.split("/")[-1] if "/" not in branch else branch
    if branch in PROTECTED_BRANCHES or base in PROTECTED_BRANCHES:
        raise PermissionError(f"Push to protected branch denied: {branch}")
    if not branch.startswith("ai-fix/"):
        raise PermissionError(f"Agent may only push to ai-fix/* branches, got: {branch}")


def assert_command_allowed(cmd: str):
    for pat in BLOCKED_PATTERNS:
        if re.search(pat, cmd, re.IGNORECASE):
            raise PermissionError(f"Blocked destructive command pattern '{pat}': {cmd}")
    stripped = cmd.strip()
    if not any(stripped.startswith(p) for p in SAFE_COMMAND_PREFIXES):
        raise PermissionError(f"Command not in allowlist: {cmd}")


def assert_no_merge_capability():
    # There is intentionally no merge function anywhere in the codebase.
    # This assertion documents the invariant for audit.
    import app.pr as pr_module
    assert not hasattr(pr_module, "merge_pr"), "merge capability must not exist"
    assert not hasattr(pr_module, "merge"), "merge capability must not exist"


def sanitize_path(path: str, workdir: str) -> str:
    """Prevent path traversal outside sandbox workdir."""
    import os
    full = os.path.normpath(os.path.join(workdir, path))
    if not full.startswith(os.path.normpath(workdir)):
        raise PermissionError(f"Path traversal denied: {path}")
    return full
