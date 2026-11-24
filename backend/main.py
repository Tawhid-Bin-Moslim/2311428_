
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.users import router as users_router
from routers.maintenance import router as maintenance_router
from routers.auth import router as auth_router
from routers.buildings import router as buildings_router
from routers.flats import router as flats_router
from routers.occupancies import router as occupancies_router


app = FastAPI(
    title="Apartment Management System",
    description="ApartmentCare Maintenance Management API",
    version="1.0.0",
)


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


app.include_router(maintenance_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(buildings_router)
app.include_router(flats_router)
app.include_router(occupancies_router)


# Health Check
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
