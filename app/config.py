from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    database_url: str = "postgresql+psycopg2://ai_fixer:ai_fixer@localhost:5432/ai_fixer"
    redis_url: str = "redis://localhost:6379/0"

    github_app_id: str = "123456"
    github_app_slug: str = "patchpilot-ai"  # used for the install link
    github_app_private_key_path: str = "./private-key.pem"
    github_webhook_secret: str = "changeme"

    anthropic_api_key: str = ""
    agent_model: str = "claude-sonnet-4-5-20250929"

    agent_max_iterations: int = 15
    agent_max_wall_clock_sec: int = 1200
    agent_max_tokens_per_job: int = 60000
    trigger_label: str = "ai-fix"

    # Billing: blended price per 1k tokens (input+output avg). Override per model if needed.
    price_per_1k_tokens_usd: float = 0.009
    max_cost_per_job_usd: float = 2.00


settings = Settings()
