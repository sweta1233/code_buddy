import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import get_db
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    college: str = ""
    grad_year: int | None = None


class LoginIn(BaseModel):
    email: str  # accepts either the account email or username
    password: str


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "name": user.name,
        "college": user.college,
        "grad_year": user.grad_year,
    }


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    username = body.username.strip().lower()
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(400, "Invalid email")
    if db.execute(select(User).where(User.email == email)).scalars().first():
        raise HTTPException(409, "Email already registered")
    if db.execute(select(User).where(User.username == username)).scalars().first():
        raise HTTPException(409, "Username already taken")

    user = User(
        email=email, username=username, name=body.name.strip(),
        password_hash=hash_password(body.password),
        college=body.college.strip(), grad_year=body.grad_year,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(user.id), "user": _user_out(user)}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    identity = body.email.strip().lower()
    user = db.execute(
        select(User).where(User.email == identity)
    ).scalars().first()
    if user is None:
        user = db.execute(select(User).where(User.username == identity)).scalars().first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_access_token(user.id), "user": _user_out(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_out(user)
