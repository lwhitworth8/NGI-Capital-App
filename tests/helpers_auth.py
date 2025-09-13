from jose import jwt
from src.api.config import SECRET_KEY, ALGORITHM


def make_token(email: str) -> str:
    return jwt.encode({"sub": email}, SECRET_KEY, algorithm=ALGORITHM)


def auth_headers(email: str) -> dict:
    return {"Authorization": f"Bearer {make_token(email)}"}

