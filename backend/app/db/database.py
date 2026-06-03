import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(
    dotenv_path=ENV_PATH,
    override=True
)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

# Determine sslmode: use environment variable if provided,
# otherwise default to "require" except for localhost/127.0.0.1
SSL_MODE = os.getenv("SSL_MODE")
if not SSL_MODE:
    if "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
        SSL_MODE = "disable"
    else:
        SSL_MODE = "require"

conn = psycopg2.connect(
    DATABASE_URL,
    sslmode=SSL_MODE
)
cur = conn.cursor()

# Create tables and extensions if they don't exist
try:
    # Try enabling pgvector extension
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Warning: Could not enable 'vector' extension. Ensure pgvector is installed: {e}", flush=True)

    # Create users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()

    # Create chunks table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chunks (
            id UUID PRIMARY KEY,
            document_id UUID NOT NULL,
            filename VARCHAR(255) NOT NULL,
            chunk_text TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            embedding vector(384),
            owner_id UUID REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    print("Database schema verified/created successfully.", flush=True)
except Exception as e:
    conn.rollback()
    print(f"Error verifying database schema: {e}", flush=True)


