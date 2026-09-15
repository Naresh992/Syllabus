"""GitHub App JWT -> installation token flow."""
import time
import jwt
import httpx
from .config import settings


def build_app_jwt() -> str:
    from .setup import effective_github_conf
    conf = effective_github_conf()
    private_key = conf["private_key"]
    if not private_key:
        with open(conf["private_key_path"], "r") as f:
            private_key = f.read()
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 600, "iss": conf["app_id"]}
    return jwt.encode(payload, private_key, algorithm="RS256")


def get_installation_token(installation_id: int) -> str:
    app_jwt = build_app_jwt()
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    headers = {
        "Authorization": f"Bearer {app_jwt}",
        "Accept": "application/vnd.github+json",
    }
    r = httpx.post(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()["token"]


def api_headers(installation_id: int) -> dict:
    token = get_installation_token(installation_id)
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
