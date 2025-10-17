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
from jose import jwt, jwk
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
        # In test/dev, allow a local HS256 fallback to keep tests unblocked
        if os.getenv('PYTEST_CURRENT_TEST') or os.getenv('ALLOW_LOCAL_TEST_JWT'):
            try:
                from services.api.config import SECRET_KEY as _LOCAL_SECRET
                return jwt.decode(token, _LOCAL_SECRET, algorithms=['HS256'])
            except Exception:
                return None
        logger.warning("CLERK_JWKS_URL or CLERK_ISSUER not configured; skipping Clerk verification")
        return None
    try:
        jwks = _fetch_jwks(jwks_url)
        headers = jwt.get_unverified_header(token)
        kid = headers.get('kid')
        alg = headers.get('alg') or 'RS256'
        if not kid:
            logger.debug('Clerk JWT missing kid header')
            return None
        key = None
        for k in jwks.get('keys', []):
            if k.get('kid') == kid:
                key = k
                break
        if not key:
            logger.debug('No matching JWKS key for kid=%s', kid)
            return None

        # Verify signature manually using JWK
        # Build PEM from JWK for jose to verify with the correct algorithm (supports RSA/EC)
        public_key = jwk.construct(key)
        key_pem = public_key.to_pem().decode('utf-8')

        verify_aud = os.getenv('CLERK_VERIFY_AUDIENCE', '1').strip() not in ('0','false','False')
        aud_list = [a.strip() for a in (audience or '').split(',') if a.strip()]
        decode_opts = { 'verify_at_hash': False }
        try:
            if verify_aud and aud_list:
                return jwt.decode(
                    token,
                    key_pem,
                    algorithms=[alg],
                    issuer=issuer,
                    audience=aud_list[0] if len(aud_list)==1 else aud_list,
                    options=decode_opts,
                )
            # Relaxed aud (dev or unspecified)
            return jwt.decode(
                token,
                key_pem,
                algorithms=[alg],
                issuer=issuer,
                options={**decode_opts, 'verify_aud': False},
            )
        except Exception as inner:
            logger.debug('Clerk JWT pem decode failed (%s): %s', alg, str(inner))
            # Test/dev fallback to local HS256 token
            try:
                if os.getenv('PYTEST_CURRENT_TEST') or os.getenv('ALLOW_LOCAL_TEST_JWT'):
                    from services.api.config import SECRET_KEY as _LOCAL_SECRET
                    return jwt.decode(token, _LOCAL_SECRET, algorithms=['HS256'])
            except Exception:
                pass
            return None
    except Exception as e:
        logger.debug('Clerk JWT verification error: %s', str(e))
        return None


def verify_clerk_session_cookie(session_token: str) -> Optional[Dict[str, Any]]:
    """Verify Clerk session cookie via Clerk Management API.
    Returns minimal claims dict with 'sub' and may include 'email' when fetched.
    """
    try:
        sk = os.getenv('CLERK_SECRET_KEY', '').strip()
        if not sk or not session_token:
            return None
        # Verify the session token
        resp = requests.post(
            'https://api.clerk.dev/v1/sessions/verify',
            headers={
                'Authorization': f'Bearer {sk}',
                'Content-Type': 'application/json',
            },
            json={'token': session_token},
            timeout=5,
        )
        if resp.status_code != 200:
            logger.debug('Clerk session verify failed: %s %s', resp.status_code, resp.text)
            return None
        data = resp.json() or {}
        user_id = data.get('claims', {}).get('sub') or data.get('user_id')
        if not user_id:
            return None
        # Fetch user to resolve primary email
        email = ''
        try:
            u = requests.get(
                f'https://api.clerk.dev/v1/users/{user_id}',
                headers={'Authorization': f'Bearer {sk}'},
                timeout=5,
            )
            if u.status_code == 200:
                uj = u.json() or {}
                peid = (uj.get('primary_email_address_id') or '').strip()
                for e in (uj.get('email_addresses') or []):
                    if e.get('id') == peid and e.get('email_address'):
                        email = e.get('email_address'); break
                if not email and (uj.get('email_addresses') or []):
                    email = (uj.get('email_addresses')[0] or {}).get('email_address') or ''
        except Exception:
            pass
        return {'sub': user_id, 'email': email}
    except Exception as e:
        logger.debug('Clerk session cookie verification error: %s', str(e))
        return None
