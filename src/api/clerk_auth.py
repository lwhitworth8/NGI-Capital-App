"""
Clerk authentication helpers for FastAPI backend.
Verifies Clerk-issued JWTs via JWKS URL (OIDC).

Environment variables expected:
  CLERK_JWKS_URL   - e.g., https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json
  CLERK_ISSUER     - e.g., https://<your-subdomain>.clerk.accounts.dev
  CLERK_AUDIENCE   - optional; recommended to match Clerk JWT template audience (e.g., 'backend')
"""

import os
import time
import json
import logging
from typing import Any, Dict, Optional

import requests
from jose import jwt
from jose.utils import base64url_decode

logger = logging.getLogger(__name__)

_JWKS_CACHE: Dict[str, Any] = {"keys": None, "ts": 0}


def _fetch_jwks(jwks_url: str) -> Dict[str, Any]:
    now = time.time()
    if _JWKS_CACHE["keys"] is not None and now - _JWKS_CACHE["ts"] < 3600:
        return _JWKS_CACHE["keys"]
    resp = requests.get(jwks_url, timeout=5)
    resp.raise_for_status()
    data = resp.json()
    _JWKS_CACHE["keys"] = data
    _JWKS_CACHE["ts"] = now
    return data


def verify_clerk_jwt(token: str) -> Optional[Dict[str, Any]]:
    jwks_url = os.getenv("CLERK_JWKS_URL", "").strip()
    issuer = os.getenv("CLERK_ISSUER", "").strip()
    audience = os.getenv("CLERK_AUDIENCE", "backend").strip()
    if not jwks_url or not issuer:
        logger.warning("CLERK_JWKS_URL or CLERK_ISSUER not configured; skipping Clerk verification")
        return None
    try:
        jwks = _fetch_jwks(jwks_url)
        # First, try strict audience check
        try:
            claims = jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                audience=audience,
                issuer=issuer,
                options={"verify_at_hash": False},
            )
            return claims
        except Exception as inner:
            # Fallback: accept any audience in development to ease local setup
            if os.getenv("ENV", "development").lower() == "development":
                try:
                    claims = jwt.decode(
                        token,
                        jwks,
                        algorithms=["RS256"],
                        issuer=issuer,
                        options={"verify_aud": False, "verify_at_hash": False},
                    )
                    return claims
                except Exception:
                    pass
            logger.debug("Clerk JWT audience/issuer verification failed: %s", str(inner))
        return None
    except Exception as e:
        logger.debug("Clerk JWT verification failed: %s", str(e))
        return None
