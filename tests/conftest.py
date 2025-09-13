import sys
import os
import time
import subprocess
from pathlib import Path

# Ensure project root is on sys.path so `import src...` works consistently
ROOT = Path(__file__).resolve().parent.parent
root_str = str(ROOT)
if root_str not in sys.path:
    sys.path.insert(0, root_str)

_SERVER_PROC = None

# Shared auth helpers for tests
def make_token(email: str) -> str:
    """Build a local HS256 token accepted by the test Clerk shim."""
    try:
        from jose import jwt  # type: ignore
        from src.api.config import SECRET_KEY, ALGORITHM
        return jwt.encode({"sub": email}, SECRET_KEY, algorithm=ALGORITHM)
    except Exception:
        return f"clerk:{email}"

def auth_headers(email: str) -> dict:
    return {"Authorization": f"Bearer {make_token(email)}"}

def _wait_for_health(base_url: str, timeout_seconds: int = 20) -> bool:
    try:
        import requests
    except Exception:
        return False
    deadline = time.time() + timeout_seconds
    url = f"{base_url}/api/health"
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=2)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False

def pytest_sessionstart(session):
    """
    Start a local FastAPI server for integration tests that hit http://localhost:8001.
    Uses an isolated SQLite DB under .tmp/test_api.db so the host DB is untouched.
    """
    global _SERVER_PROC
    base_url = os.environ.get("TEST_BASE_URL", "http://localhost:8001")

    # If a server is already running, don't spawn another.
    # Quick probe avoids port conflicts.
    if _wait_for_health(base_url, timeout_seconds=1):
        return

    tmp_dir = ROOT / ".tmp"
    tmp_dir.mkdir(exist_ok=True)
    db_path = tmp_dir / "test_api.db"

    env = os.environ.copy()
    env.setdefault("ENV", "development")
    env.setdefault("ALLOW_ALL_HOSTS", "1")
    # Enable local JWT fallback in Clerk verification for tests
    env.setdefault("ALLOW_LOCAL_TEST_JWT", "1")
    env.setdefault("ENABLE_ENV_ADMIN_FALLBACK", "1")
    env.setdefault(
        "ALLOWED_ADVISORY_ADMINS",
        "lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com",
    )
    env["DATABASE_PATH"] = str(db_path)
    env.setdefault("SECRET_KEY", "testing-secret-key")

    # Initialize the database with required seed data
    init_script = ROOT / "init_db_simple.py"
    subprocess.run([sys.executable, str(init_script)], check=True, cwd=str(ROOT), env=env)
    # Ensure Landon's password matches test expectation
    reset_script = ROOT / "scripts" / "dev_reset_password.py"
    if reset_script.exists():
        subprocess.run([
            sys.executable,
            str(reset_script),
            "--email", "lwhitworth@ngicapitaladvisory.com",
            "--password", "FlashJayz2002!$!",
        ], check=True, cwd=str(ROOT), env=env)

    # Start uvicorn server bound to localhost:8001
    _SERVER_PROC = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "src.api.main:app", "--host", "127.0.0.1", "--port", "8001", "--log-level", "warning"],
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Wait for server to be healthy
    if not _wait_for_health(base_url, timeout_seconds=20):
        # If port is occupied by another process or the spawn failed, do not fail the test session.
        # Most tests use FastAPI TestClient directly and do not require an external server.
        try:
            if _SERVER_PROC is not None:
                _SERVER_PROC.terminate()
        except Exception:
            pass
        # Continue without raising to allow in-process tests to run
        return


def pytest_configure(config):
    """Global monkeypatch of Clerk verification for tests.
    Accepts tokens of form 'clerk:<email>' and HS256 tokens using SECRET_KEY.
    """
    import importlib
    import types
    from jose import jwt as _jwt  # type: ignore
    from src.api.config import SECRET_KEY
    import src.api.auth_deps as auth_deps
    import src.api.clerk_auth as clerk_auth
    # Ensure env allowlist for admin gating in tests
    os.environ.setdefault("ENABLE_ENV_ADMIN_FALLBACK", "1"); os.environ.setdefault("DISABLE_ACCOUNTING_GUARD","1")
    os.environ.setdefault(
        "ALLOWED_ADVISORY_ADMINS",
        "lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com",
    )

    def _claims_from_token(token: str):
        if not isinstance(token, str):
            return None
        if token.startswith("clerk:"):
            em = token.split(":", 1)[1]
            return {"sub": em, "email": em}
        try:
            return _jwt.decode(token, SECRET_KEY, algorithms=["HS256"])  # type: ignore
        except Exception:
            return None

    def _verify(token: str):
        return _claims_from_token(token)

    # Install lightweight shims
    setattr(auth_deps, "verify_clerk_jwt", _verify)
    setattr(clerk_auth, "verify_clerk_jwt", _verify)

def pytest_sessionfinish(session, exitstatus):
    """Tear down the spawned API server if we started one."""
    global _SERVER_PROC
    if _SERVER_PROC is not None:
        try:
            _SERVER_PROC.terminate()
        except Exception:
            pass
        _SERVER_PROC = None
