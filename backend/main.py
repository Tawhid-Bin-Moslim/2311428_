
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.maintenance import router as maintenance_router


app = FastAPI(
    title="Apartment Management System",
    description="ApartmentCare Maintenance Management API",
    version="1.0.0",
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Register Maintenance Router
app.include_router(maintenance_router)
