"""
VAJRA-AI Password Hashing
Uses stdlib hashlib.pbkdf2_hmac (PBKDF2-HMAC-SHA256) — no external deps
"""
import hashlib
import os
import base64


def hash_password(password: str) -> str:
    """Hash a plaintext password. Returns a storable string."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 260_000)
    # Store as "salt_b64:hash_b64"
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(key).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    try:
        salt_b64, key_b64 = stored_hash.split(":", 1)
        salt = base64.b64decode(salt_b64)
        expected_key = base64.b64decode(key_b64)
        derived_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 260_000)
        return hmac_compare(derived_key, expected_key)
    except Exception:
        return False


def hmac_compare(a: bytes, b: bytes) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    import hmac
    return hmac.compare_digest(a, b)
