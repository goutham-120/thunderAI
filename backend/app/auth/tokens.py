"""
VAJRA-AI JWT Token Handling
Uses PyJWT (already installed in environment)
"""
import os
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

# Secret must come from environment — never hardcoded in production
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "vajra-ai-dev-secret-change-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))


def create_access_token(payload: Dict[str, Any]) -> str:
    """Create a signed JWT token containing user identity + role."""
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    data["iat"] = datetime.now(timezone.utc)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT. Returns payload dict or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
