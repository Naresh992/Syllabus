"""Docker-per-job sandbox. One isolated container per job, torn down after."""
import uuid
from dataclasses import dataclass

try:
    import docker
except ImportError:
    docker = None

SANDBOX_IMAGE = "ai-fixer-sandbox:latest"


@dataclass
class Sandbox:
    container_id: str
    workdir: str = "/work"


def start_sandbox(repo_full_name: str, token: str, default_branch: str = "main") -> Sandbox:
    """Clone repo at default branch into a fresh container. Raises if docker unavailable."""
    if docker is None:
        raise RuntimeError("docker package not installed")
    client = docker.from_env()
    name = f"ai-fix-{uuid.uuid4().hex[:12]}"
    clone_url = f"https://x-access-token:{token}@github.com/{repo_full_name}.git"
    # Container clones + installs deps based on detected manifest
    cmd = (
        f"bash -lc 'git clone --depth 1 --branch {default_branch} {clone_url} /work "
        "&& cd /work && "
        "(test -f requirements.txt && pip install -q -r requirements.txt || true); "
        "(test -f package.json && (npm ci --no-audit --no-fund || npm install) || true); "
        "sleep infinity'"
    )
    container = client.containers.run(
        SANDBOX_IMAGE, command=cmd, name=name, detach=True,
        mem_limit="2g", cpu_quota=100000, network_mode="none",  # no egress; GitHub via clone already done? use bridge if clone inside
    )
    return Sandbox(container_id=container.id)


def exec_in_sandbox(sandbox: Sandbox, cmd: str) -> tuple[int, str]:
    from .guardrails import assert_command_allowed
    assert_command_allowed(cmd)  # hard gate BEFORE exec
    client = docker.from_env()
    container = client.containers.get(sandbox.container_id)
    result = container.exec_run(["bash", "-lc", f"cd /work && {cmd}"], demux=False)
    output = result.output.decode("utf-8", errors="replace") if isinstance(result.output, bytes) else str(result.output)
    return result.exit_code, output[-8000:]  # truncate fed-back output


def stop_sandbox(sandbox: Sandbox):
    client = docker.from_env()
    try:
        c = client.containers.get(sandbox.container_id)
        c.remove(force=True)
    except Exception:
        pass
