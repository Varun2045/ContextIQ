from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

import bcrypt
from jose import jwt, JWTError

from datetime import datetime, timedelta
import os

from app.db.database import cur


SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire
        }
    )

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def verify_token(token: str):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError:

        return None


def get_user_by_email(email: str):

    cur.execute(
        """
        SELECT
            id,
            name,
            email
        FROM users
        WHERE email = %s
        """,
        (
            email,
        )
    )

    return cur.fetchone()


def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    payload = verify_token(token)

    if payload is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    email = payload.get("sub")

    if email is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    user = get_user_by_email(email)

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return {
        "id": str(user[0]),
        "name": user[1],
        "email": user[2]
    }
