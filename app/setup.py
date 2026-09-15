"""Website-driven setup: 1-click GitHub App creation (manifest flow) + server settings store.

Owner flow (no terminal needed):
1. GET /github/manifest -> paste/open at https://github.com/settings/apps/new?state=...
   (or click the button on the site, which does it for you).
2. GitHub redirects back to GET /github/callback?code=...&state=...
3. Server exchanges the code for app id + private key + webhook secret and
   stores them in the app_config table. Done — webhooks + PR creation work.
"""
import httpx


def get_setting(key: str, default: str = "") -> str:
    from . import db as dbmod
    dbmod.get_engine()
    db = dbmod.SessionLocal()
    try:
        from .models import AppConfig
        row = db.get(AppConfig, key)
        return row.value if row else default
    finally:
        db.close()


def set_setting(key: str, value: str):
    from . import db as dbmod
    dbmod.get_engine()
    db = dbmod.SessionLocal()
    try:
        from .models import AppConfig
        row = db.get(AppConfig, key)
        if row:
            row.value = value
        else:
            db.add(AppConfig(key=key, value=value))
        db.commit()
    finally:
        db.close()


def effective_github_conf():
    """DB-stored credentials win; fall back to .env settings."""
    from .config import settings
    return {
        "app_id": get_setting("github_app_id", settings.github_app_id),
        "private_key": get_setting("github_app_private_key", ""),
        "private_key_path": settings.github_app_private_key_path,
        "webhook_secret": get_setting("github_webhook_secret", settings.github_webhook_secret),
        "slug": get_setting("github_app_slug", settings.github_app_slug),
    }


def build_manifest(public_base_url: str) -> dict:
    """Manifest for 1-click app creation. public_base_url = your reachable URL."""
    return {
        "name": "PatchPilot AI Fixer",
        "url": public_base_url,
        "hook_attributes": {"url": f"{public_base_url}/webhooks/github"},
        "redirect_url": f"{public_base_url}/github/callback",
        "public": False,
        "default_permissions": {
            "contents": "write",
            "issues": "read",
            "pull_requests": "write",
            "checks": "read",
            "metadata": "read",
        },
        "default_events": ["issues", "installation", "installation_repositories"],
    }


def exchange_manifest_code(code: str) -> dict:
    """GitHub App manifest conversion: code -> {id, slug, pem, webhook_secret}."""
    r = httpx.post(f"https://api.github.com/app-manifests/{code}/conversions", timeout=20)
    r.raise_for_status()
    return r.json()


def save_converted_app(data: dict) -> dict:
    set_setting("github_app_id", str(data["id"]))
    set_setting("github_app_slug", data.get("slug", ""))
    set_setting("github_app_private_key", data.get("pem", ""))
    set_setting("github_webhook_secret", data.get("webhook_secret", ""))
    return {"app_id": str(data["id"]), "slug": data.get("slug", "")}
