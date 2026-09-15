from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    paused = Column(Boolean, default=False)  # global kill switch
    # Per-customer budget overrides (fall back to global settings when None)
    max_tokens_per_job = Column(Integer, nullable=True)
    max_wall_clock_sec = Column(Integer, nullable=True)
    max_cost_per_job_usd = Column(Float, nullable=True)
    stripe_customer_id = Column(String(255), default="")
    notify_url = Column(String(512), default="")  # webhook for job notifications
    # Owner-provided LLM credentials (set from dashboard; used instead of server .env)
    llm_api_key = Column(String(512), default="")
    llm_model = Column(String(128), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    repos = relationship("Repo", back_populates="customer")


class AppConfig(Base):
    """Server-level settings writable from the website (e.g. GitHub App credentials)."""
    __tablename__ = "app_config"
    key = Column(String(128), primary_key=True)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow)


class Repo(Base):
    __tablename__ = "repos"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    full_name = Column(String(255), nullable=False)  # owner/repo
    installation_id = Column(Integer, nullable=False)
    default_branch = Column(String(128), default="main")
    trigger_label = Column(String(64), default="ai-fix")
    paused = Column(Boolean, default=False)  # per-repo kill switch
    # Per-repo budget overrides
    max_tokens_per_job = Column(Integer, nullable=True)
    max_cost_per_job_usd = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer", back_populates="repos")
    jobs = relationship("Job", back_populates="repo")
    docs = relationship("RepoDoc", back_populates="repo", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    repo_id = Column(Integer, ForeignKey("repos.id"), nullable=False)
    issue_number = Column(Integer, nullable=False)
    issue_body = Column(Text, default="")
    status = Column(String(32), default="pending")  # pending/running/succeeded/failed
    transcript = Column(Text, default="")  # full audit log (JSON)
    tokens_used = Column(Integer, default=0)
    wall_clock_sec = Column(Float, default=0.0)
    cost_usd = Column(Float, default=0.0)
    model = Column(String(128), default="")
    error = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    repo = relationship("Repo", back_populates="jobs")
    pr = relationship("PRRecord", uselist=False, back_populates="job")
    billing_events = relationship("BillingEvent", back_populates="job", cascade="all, delete-orphan")


class PRRecord(Base):
    __tablename__ = "prs"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, unique=True)
    pr_number = Column(Integer, nullable=True)
    pr_url = Column(String(512), default="")
    branch = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    job = relationship("Job", back_populates="pr")


class RepoDoc(Base):
    """Indexed chunks for per-repo RAG memory (README, CONTRIBUTING, style, past PRs).

    We store plain text chunks + token-overlap retrieval (no external vector DB
    required). If pgvector/Chroma is later configured, an `embedding` column can
    be added without changing callers: memory.retrieve() keeps its signature.
    """
    __tablename__ = "repo_docs"
    id = Column(Integer, primary_key=True)
    repo_id = Column(Integer, ForeignKey("repos.id"), nullable=False)
    kind = Column(String(64), default="doc")  # readme|contributing|style|pr|file
    path = Column(String(512), default="")
    content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    repo = relationship("Repo", back_populates="docs")


class BillingEvent(Base):
    """Usage/billing ledger per job. Backs GET /usage and future Stripe metered billing."""
    __tablename__ = "billing_events"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    customer_id = Column(Integer, nullable=False)
    tokens = Column(Integer, default=0)
    seconds = Column(Float, default=0.0)
    cost_usd = Column(Float, default=0.0)
    stripe_reported = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    job = relationship("Job", back_populates="billing_events")
