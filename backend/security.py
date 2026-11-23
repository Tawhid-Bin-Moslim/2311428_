import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
import jwt
from pwdlib import PasswordHash
from dotenv import load_dotenv

# loading environment variables from the project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")
#pass hashing
password_hash = PasswordHash.recommended()
def hash_password(password: str) -> str:
    """
    Hashes a password using the recommended hashing algorithm.
    Args:
        password (str): The plaintext password to be hashed.
    Returns:
        str: The hashed password.
    """
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a hashed password.
    Args:
        plain_password (str): The plaintext password to verify.
        hashed_password (str): The hashed password to compare against.
    Returns:
        bool: True if the password matches the hash, False otherwise.
    """
    return password_hash.verify(plain_password, hashed_password)
# jwt token configureation
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is not set.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Token expiration time in minutes

def create_access_token(data: dict) -> str:
    """Creates a signed JWT token with the given data and expiration time."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc)+ timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode and varify a JWT access token"""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
