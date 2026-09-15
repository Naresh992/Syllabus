"""Agent loop with Claude tool use. Tested against simple bugs first."""
import time
import json
from dataclasses import dataclass, field

from .config import settings
from .guardrails import sanitize_path, assert_command_allowed

TOOLS = [
    {"name": "read_file", "description": "Read a file from the repo", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}},
    {"name": "write_file", "description": "Write (overwrite) a file", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
    {"name": "edit_file", "description": "Exact string replace in a file", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "old": {"type": "string"}, "new": {"type": "string"}}, "required": ["path", "old", "new"]}},
    {"name": "run_command", "description": "Run an allowlisted test/build/lint command", "input_schema": {"type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"]}},
    {"name": "search_codebase", "description": "Grep for a pattern", "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "get_issue_context", "description": "Return the original bug report", "input_schema": {"type": "object", "properties": {}}},
]

SYSTEM_PROMPT = """You are an AI software engineer fixing a bug. Rules:
- First reproduce/understand the bug: read the issue, search the codebase, read relevant files.
- Make the smallest fix possible. Do not refactor unrelated code.
- After each file change, run the relevant tests via run_command.
- If tests fail, read the failure and try again.
- Never attempt to merge, push to main, or run destructive commands (tools block these anyway).
"""


@dataclass
class AgentResult:
    success: bool
    turns: int
    tokens_used: int
    transcript: list = field(default_factory=list)


class LocalExecutor:
    """Local-filesystem executor used for tests and for sandbox-via-exec adapter.

    workdir: repo root. test_command: run after each write, e.g. 'pytest -q'.
    """
    def __init__(self, workdir: str, issue_body: str, test_command: str = "pytest -q"):
        import os
        self.workdir = os.path.abspath(workdir)
        os.makedirs(self.workdir, exist_ok=True)
        self.issue_body = issue_body
        self.test_command = test_command

    def read_file(self, path: str) -> str:
        full = sanitize_path(path, self.workdir)
        with open(full) as f:
            return f.read()[:20000]

    def write_file(self, path: str, content: str):
        full = sanitize_path(path, self.workdir)
        with open(full, "w") as f:
            f.write(content)
        return self._run_tests()

    def edit_file(self, path: str, old: str, new: str):
        full = sanitize_path(path, self.workdir)
        with open(full) as f:
            src = f.read()
        if old not in src:
            return "oldString not found"
        with open(full, "w") as f:
            f.write(src.replace(old, new, 1))
        return self._run_tests()

    def run_command(self, cmd: str) -> str:
        assert_command_allowed(cmd)
        import subprocess
        try:
            out = subprocess.run(cmd, shell=True, cwd=self.workdir, capture_output=True, text=True, timeout=120)
            return f"exit={out.returncode}\n{out.stdout[-4000:]}\n{out.stderr[-4000:]}"
        except subprocess.TimeoutExpired:
            return "exit=124\nTIMEOUT"

    def search_codebase(self, query: str) -> str:
        import subprocess
        out = subprocess.run(["grep", "-rn", query, ".", "--include=*.py", "--include=*.js", "--include=*.ts"],
                             cwd=self.workdir, capture_output=True, text=True)
        return (out.stdout or "(no matches)")[:6000]

    def _run_tests(self) -> str:
        return self.run_command(self.test_command)


def run_agent_loop(issue_body: str, executor: LocalExecutor,
                   model_client=None, max_iterations: int = 15,
                   max_tokens: int = 60000, max_wall_clock: int = 1200,
                   memory_context: str = "", max_cost_usd: float | None = None,
                   api_key: str | None = None, model: str | None = None) -> AgentResult:
    """Core loop. model_client must expose .step(system, issue, transcript)->(tool, args) and .tokens.
    If None, uses Anthropic API via tool use. Auto-runs tests after each write (inside executor)."""
    import anthropic
    from .billing import cost_for_tokens
    start = time.time()
    transcript: list = []
    tokens = 0
    turns = 0
    system = SYSTEM_PROMPT + (f"\n{memory_context}\n" if memory_context else "")

    if model_client is None:
        key = api_key or settings.anthropic_api_key or None
        if not key:
            raise RuntimeError("No LLM API key: set ANTHROPIC_API_KEY in .env or save one in customer settings.")
        client = anthropic.Anthropic(api_key=key)
        active_model = model or settings.agent_model
        use_api = True
    else:
        client = model_client
        use_api = False

    messages = [{"role": "user", "content": f"BUG REPORT:\n{issue_body}\n\nStart by exploring the codebase, then fix it. Run tests after each change."}]

    for i in range(max_iterations):
        if time.time() - start > max_wall_clock:
            transcript.append({"type": "system", "text": "wall-clock budget exceeded"})
            break
        if tokens >= max_tokens:
            transcript.append({"type": "system", "text": "token budget exceeded"})
            break
        if max_cost_usd is not None and cost_for_tokens(tokens) >= max_cost_usd:
            transcript.append({"type": "system", "text": "cost budget exceeded"})
            break
        turns = i + 1

        if use_api:
            resp = client.messages.create(
                model=active_model, max_tokens=2048, system=system,
                tools=[{"name": t["name"], "description": t["description"], "input_schema": t["input_schema"]} for t in TOOLS],
                messages=messages,
            )
            tokens += resp.usage.input_tokens + resp.usage.output_tokens
            # execute tool calls
            tool_calls = [b for b in resp.content if b.type == "tool_use"]
            texts = [b.text for b in resp.content if b.type == "text"]
            if texts:
                messages.append({"role": "assistant", "content": texts[0]})
                transcript.append({"turn": turns, "text": texts[0]})
            if not tool_calls:
                # model claims done -> verify tests pass
                out = executor.run_command(executor.test_command)
                transcript.append({"turn": turns, "tool": "run_command(auto-verify)", "result": out})
                success = out.splitlines()[0].strip() == "exit=0"
                return AgentResult(success=success, turns=turns, tokens_used=tokens, transcript=transcript)
            results = []
            for tc in tool_calls:
                res = _dispatch(executor, tc.name, tc.input or {})
                transcript.append({"turn": turns, "tool": tc.name, "args": tc.input, "result": res[:2000]})
                results.append({"type": "tool_result", "tool_use_id": tc.id, "content": res[:6000]})
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": results})
            # success heuristic: last edit/write test run exited 0
            last = transcript[-1]["result"] if transcript else ""
            if transcript and transcript[-1].get("tool") in ("write_file", "edit_file", "run_command") and last.startswith("exit=0"):
                return AgentResult(success=True, turns=turns, tokens_used=tokens, transcript=transcript)
        else:
            # test FakeModel path
            name, args = client.step(system, issue_body, transcript)
            if name == "done":
                out = executor.run_command(executor.test_command)
                transcript.append({"turn": turns, "tool": "run_command(auto-verify)", "result": out})
                success = out.splitlines()[0].strip() == "exit=0"
                return AgentResult(success=success, turns=turns, tokens_used=tokens, transcript=transcript)
            tokens += 500  # stub accounting
            res = _dispatch(executor, name, args)
            transcript.append({"turn": turns, "tool": name, "args": args, "result": res[:2000]})

    # final verification
    out = executor.run_command(executor.test_command)
    success = out.splitlines()[0].strip() == "exit=0"
    transcript.append({"type": "system", "text": f"final verify: {out[:1000]}"})
    return AgentResult(success=success, turns=turns, tokens_used=tokens, transcript=transcript)


def _dispatch(executor: LocalExecutor, name: str, args: dict) -> str:
    try:
        if name == "read_file":
            return executor.read_file(args["path"])
        if name == "write_file":
            return executor.write_file(args["path"], args["content"])
        if name == "edit_file":
            return executor.edit_file(args["path"], args["old"], args["new"])
        if name == "run_command":
            return executor.run_command(args["cmd"])
        if name == "search_codebase":
            return executor.search_codebase(args["query"])
        if name == "get_issue_context":
            return executor.issue_body
        return f"unknown tool {name}"
    except PermissionError as e:
        return f"DENIED: {e}"
    except Exception as e:
        return f"ERROR: {e}"
