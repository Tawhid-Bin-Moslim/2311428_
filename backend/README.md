# ApartmentCare Backend

The ApartmentCare backend uses FastAPI and Python.

## Prerequisites

- Python installed
- PowerShell terminal

## Setup

Run these commands from the project root directory.

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

## Run the server

From the project root, run:

```powershell
python -m uvicorn main:app --reload --app-dir backend
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend health |
| GET | `/api/hello` | Return a greeting |

## API documentation

After starting the server, open:

- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health
