"""
VAJRA-AI Authentication & RBAC Dependencies
Extracts user identity from JWT and enforces role permissions
"""
from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.tokens import decode_access_token
from app.auth.database import get_connection

security_bearer = HTTPBearer(auto_error=False)


def get_token_from_request(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[str]:
    """Extract Bearer token from header or authorization credentials."""
    if creds and creds.credentials:
        return creds.credentials
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def get_current_user(token: Optional[str] = Depends(get_token_from_request)) -> dict:
    """Validate token and fetch active approved user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, full_name, email, organization, phone, role, status, created_at, approved_at, rejection_reason FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists",
            )
        user = dict(row)

    if user["status"] == "PENDING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting administrator approval."
        )
    elif user["status"] == "REJECTED":
        msg = "Your account has not been approved."
        if user.get("rejection_reason"):
            msg += f" Reason: {user['rejection_reason']}"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg
        )
    elif user["status"] == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact administrator."
        )
    elif user["status"] != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not approved for access."
        )

    return user


def require_role(allowed_roles: List[str]) -> Callable:
    """Dependency factory that restricts route access to specific roles."""
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{user_role}' is not authorized for this resource"
            )
        return current_user
    return role_checker


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensures caller has ADMIN role."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )
    return current_user
