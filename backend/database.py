import os;
import psycopg;
from pathlib import Path;
from dotenv import load_dotenv;

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')
def get_connection():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    return psycopg.connect(database_url)
