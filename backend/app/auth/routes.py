"""
VAJRA-AI Authentication & Administrator API Routes
Implements:
  - User Registration (PENDING_APPROVAL by default)
  - Login (validates approval status & credentials, returns JWT)
  - Profile retrieval (/api/auth/me)
  - Admin Approval / Rejection Workflow
  - Admin Role & Status Management
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from app.auth.database import get_connection
from app.auth.hashing import hash_password, verify_password
from app.auth.tokens import create_access_token
from app.auth.dependencies import get_current_user, require_admin

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])
admin_router = APIRouter(prefix="/api/admin", tags=["Admin User Management"])

VALID_PUBLIC_ROLES = {"WEATHER_FORECASTER", "USER", "ELECTRICAL_INFRASTRUCTURE"}
ALL_VALID_ROLES = {"ADMIN", "WEATHER_FORECASTER", "USER", "ELECTRICAL_INFRASTRUCTURE"}
VALID_STATUSES = {"PENDING_APPROVAL", "APPROVED", "REJECTED", "DISABLED"}


# =========================================================================
# Schemas
# =========================================================================

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None
    organization: Optional[str] = ""
    phone: Optional[str] = ""
    requested_role: str = Field(..., description="WEATHER_FORECASTER, USER, or ELECTRICAL_INFRASTRUCTURE")


class LoginRequest(BaseModel):
    email: str
    password: str


class RejectRequest(BaseModel):
    reason: Optional[str] = None


class RoleChangeRequest(BaseModel):
    role: str


class StatusChangeRequest(BaseModel):
    status: str


# =========================================================================
# Public Auth Endpoints
# =========================================================================

@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(req: RegisterRequest):
    email = req.email.strip().lower()
    full_name = req.full_name.strip()
    
    if req.confirm_password and req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # Normalize role string (allow human-readable strings from UI)
    role_norm = req.requested_role.strip().upper().replace(" ", "_").replace("&", "_")
    if "ELECTRICAL" in role_norm or "INFRASTRUCTURE" in role_norm:
        role_norm = "ELECTRICAL_INFRASTRUCTURE"
    elif "FORECASTER" in role_norm:
        role_norm = "WEATHER_FORECASTER"
    elif role_norm in {"USER", "NORMAL_USER", "GENERAL_USER"}:
        role_norm = "USER"
    
    if role_norm == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be registered publicly."
        )

    if role_norm not in VALID_PUBLIC_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid requested role. Choose from: Weather Forecaster, User, Electrical & Infrastructure"
        )

    p_hash = hash_password(req.password)
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        cursor = conn.cursor()
        # Check uniqueness
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists."
            )

        cursor.execute("""
            INSERT INTO users (
                full_name, email, password_hash, organization, phone, role, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
        """, (
            full_name,
            email,
            p_hash,
            req.organization.strip() if req.organization else "",
            req.phone.strip() if req.phone else "",
            role_norm,
            now_iso
        ))
        conn.commit()

    return {
        "status": "success",
        "message": "Account created successfully. Your account is awaiting administrator approval.",
        "account_status": "PENDING_APPROVAL"
    }


@auth_router.post("/login")
def login_user(req: LoginRequest):
    email = req.email.strip().lower()
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, full_name, email, password_hash, organization, phone, role, status, rejection_reason FROM users WHERE email = ?",
            (email,)
        )
        row = cursor.fetchone()
        
    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_status = row["status"]
    
    if user_status == "PENDING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting administrator approval."
        )
    elif user_status == "REJECTED":
        msg = "Your account has not been approved."
        if row["rejection_reason"]:
            msg += f" Reason: {row['rejection_reason']}"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg
        )
    elif user_status == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact administrator."
        )
    elif user_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account status does not permit login."
        )

    # User is APPROVED — generate JWT token
    token = create_access_token({
        "sub": str(row["id"]),
        "user_id": row["id"],
        "email": row["email"],
        "role": row["role"],
        "full_name": row["full_name"],
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": row["id"],
            "full_name": row["full_name"],
            "email": row["email"],
            "organization": row["organization"],
            "phone": row["phone"],
            "role": row["role"],
            "status": row["status"]
        }
    }


@auth_router.get("/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "user": current_user
    }


@auth_router.post("/logout")
def logout_user():
    return {
        "status": "success",
        "message": "Logged out successfully"
    }


# =========================================================================
# Admin Protected Endpoints
# =========================================================================

@admin_router.get("/stats")
def get_admin_stats(admin_user: dict = Depends(require_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total FROM users")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS pending FROM users WHERE status = 'PENDING_APPROVAL'")
        pending = cursor.fetchone()["pending"]

        cursor.execute("SELECT COUNT(*) AS approved FROM users WHERE status = 'APPROVED'")
        approved = cursor.fetchone()["approved"]

        cursor.execute("SELECT COUNT(*) AS rejected FROM users WHERE status = 'REJECTED'")
        rejected = cursor.fetchone()["rejected"]

        cursor.execute("SELECT COUNT(*) AS disabled FROM users WHERE status = 'DISABLED'")
        disabled = cursor.fetchone()["disabled"]

        cursor.execute("SELECT role, COUNT(*) AS count FROM users GROUP BY role")
        by_role = {row["role"]: row["count"] for row in cursor.fetchall()}

    return {
        "total_users": total,
        "pending_approvals": pending,
        "approved_accounts": approved,
        "rejected_accounts": rejected,
        "disabled_accounts": disabled,
        "users_by_role": by_role
    }


@admin_router.get("/users")
def get_all_users(admin_user: dict = Depends(require_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, full_name, email, organization, phone, role, status, created_at, approved_at, rejection_reason
            FROM users
            ORDER BY created_at DESC
        """)
        users = [dict(row) for row in cursor.fetchall()]
    return {"users": users}


@admin_router.get("/pending-users")
def get_pending_users(admin_user: dict = Depends(require_admin)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, full_name, email, organization, phone, role, status, created_at
            FROM users
            WHERE status = 'PENDING_APPROVAL'
            ORDER BY created_at ASC
        """)
        pending = [dict(row) for row in cursor.fetchall()]
    return {"pending_users": pending}


@admin_router.post("/users/{user_id}/approve")
def approve_user(user_id: int, admin_user: dict = Depends(require_admin)):
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        cursor.execute("""
            UPDATE users
            SET status = 'APPROVED', approved_at = ?, rejection_reason = NULL
            WHERE id = ?
        """, (now_iso, user_id))
        conn.commit()

    return {"status": "success", "message": f"User {user_id} has been APPROVED."}


@admin_router.post("/users/{user_id}/reject")
def reject_user(user_id: int, req: RejectRequest = None, admin_user: dict = Depends(require_admin)):
    reason = req.reason.strip() if req and req.reason else "Application criteria not met by administrator."
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row["role"] == "ADMIN":
            raise HTTPException(status_code=400, detail="Cannot reject primary ADMIN account")

        cursor.execute("""
            UPDATE users
            SET status = 'REJECTED', rejection_reason = ?
            WHERE id = ?
        """, (reason, user_id))
        conn.commit()

    return {"status": "success", "message": f"User {user_id} has been REJECTED.", "reason": reason}


@admin_router.patch("/users/{user_id}/role")
def change_user_role(user_id: int, req: RoleChangeRequest, admin_user: dict = Depends(require_admin)):
    new_role = req.role.strip().upper().replace(" ", "_").replace("&", "_")
    if "ELECTRICAL" in new_role or "INFRASTRUCTURE" in new_role:
        new_role = "ELECTRICAL_INFRASTRUCTURE"
    elif "FORECASTER" in new_role:
        new_role = "WEATHER_FORECASTER"
    elif new_role in {"USER", "NORMAL_USER", "GENERAL_USER"}:
        new_role = "USER"
    elif new_role == "ADMIN":
        new_role = "ADMIN"
    
    if new_role not in ALL_VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{req.role}'. Valid roles: {list(ALL_VALID_ROLES)}"
        )

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
        conn.commit()

    return {"status": "success", "message": f"User {user_id} role updated to {new_role}."}


@admin_router.patch("/users/{user_id}/status")
def change_user_status(user_id: int, req: StatusChangeRequest, admin_user: dict = Depends(require_admin)):
    new_status = req.status.strip().upper()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Valid statuses: {list(VALID_STATUSES)}"
        )

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row["role"] == "ADMIN" and new_status != "APPROVED":
            raise HTTPException(status_code=400, detail="Cannot disable or change status of primary ADMIN account")

        cursor.execute("UPDATE users SET status = ? WHERE id = ?", (new_status, user_id))
        conn.commit()

    return {"status": "success", "message": f"User {user_id} status updated to {new_status}."}
