from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from database import get_connection

app = FastAPI(title="Apartment Management System")

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

class MaintenanceRequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5)
    location: str = Field(min_length=2, max_length=150)
    priority: Literal["low", "medium", "high"] = "medium"


@app.post("/api/maintenance-requests", status_code=201)
def create_maintenance_request(request: MaintenanceRequestCreate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO maintenance_requests
                    (title, description, location, priority)
                VALUES (%s, %s, %s, %s)
                RETURNING id, title, description, location,
                          priority, status, created_at
                """,
                (
                    request.title,
                    request.description,
                    request.location,
                    request.priority,
                ),
            )
            result = cur.fetchone()

    return {
        "id": result[0],
        "title": result[1],
        "description": result[2],
        "location": result[3],
        "priority": result[4],
        "status": result[5],
        "created_at": result[6],
    }
@app.get("/api/maintenance-requests")
def list_maintenance_requests():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, title, description, location,
                       priority, status, created_at
                FROM maintenance_requests
                ORDER BY created_at DESC
            """)
            rows = cur.fetchall()

    return [
        {
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "location": row[3],
            "priority": row[4],
            "status": row[5],
            "created_at": row[6],
        }
        for row in rows
    ]

class MaintenanceRequestUpdate(BaseModel):
    status: Literal["pending", "in_progress", "completed"]



@app.put("/api/maintenance-requests/{request_id}")
def update_maintenance_request(
    request_id: int,
    request: MaintenanceRequestUpdate
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE maintenance_requests
                SET status = %s
                WHERE id = %s
                RETURNING id, title, description, location,
                          priority, status, created_at
                """,
                (request.status, request_id),
            )

            result = cur.fetchone()

            if result is None:
                raise HTTPException(
                    status_code=404,
                    detail="Maintenance request not found"
                )

    return {
        "id": result[0],
        "title": result[1],
        "description": result[2],
        "location": result[3],
        "priority": result[4],
        "status": result[5],
        "created_at": result[6],
    }

@app.delete("/api/maintenance-requests/{request_id}")
def delete_maintenance_request(request_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM maintenance_requests
                WHERE id = %s
                RETURNING id
                """,
                (request_id,),
            )

            result = cur.fetchone()

            if result is None:
                raise HTTPException(
                    status_code=404,
                    detail="Maintenance request not found"
                )

    return {
        "message": "Maintenance request deleted successfully",
        "id": result[0]
    }
