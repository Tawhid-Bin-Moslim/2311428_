from fastapi import APIRouter
from schemas.auth import LoginRequest, LoginResponse
from services.auth import authenticate_user
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
@router.post("/login", response_model= LoginResponse)
def login(request: LoginRequest):
        return authenticate_user(request)