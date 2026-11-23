from pydantic import BaseModel, Field
class LoginRequest(BaseModel):
    role:str = Field(..., description="Admin,Building manager or Resident")
    user_id: str
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str