from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import psycopg2

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.db.database import conn, cur
from app.schemas.user import UserSignup, UserLogin

import json
import os
import uuid
import time
from pathlib import Path
from typing import Optional

from app.ingestion.pdf_processor import (
    extract_text_from_pdf,
    chunk_text
)

from app.services.store_chunks import (
    store_chunks
)

from app.retrieval.hybrid_search import (
    hybrid_search
)

from app.retrieval.document_fetch import (
    fetch_document_chunks,
    is_summary_query
)

from app.services.generation_service import (
    stream_answer
)

from app.metrics import metrics

app = FastAPI(
    title="ContextIQ"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://contextiq-at2q.vercel.app",
        "https://contextiq-at2q-git-main-neha-damani-s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
EVALUATION_RESULTS_PATH = BASE_DIR / "evaluation" / "results.json"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


class QueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None


def load_evaluation_metrics():

    default_metrics = {
        "precision_at_5": None,
        "mrr": None,
        "recall_at_5": None
    }

    if not EVALUATION_RESULTS_PATH.exists():

        return default_metrics

    try:

        with open(
            EVALUATION_RESULTS_PATH
        ) as f:

            eval_metrics = json.load(f)

    except (OSError, json.JSONDecodeError):

        return default_metrics

    return {
        "precision_at_5":
            eval_metrics.get("precision_at_5"),
        "mrr":
            eval_metrics.get("mrr"),
        "recall_at_5":
            eval_metrics.get("recall_at_5")
    }


@app.get("/")
async def root():

    return {
        "message":
        "ContextIQ API running"
    }


@app.get("/health")
async def health():

    return {
        "status":
        "healthy"
    }


@app.get("/metrics")
async def get_metrics():

    retrieval_avg = 0
    generation_avg = 0
    eval_metrics = load_evaluation_metrics()

    if metrics["retrieval_latency"]:

        retrieval_avg = (
            sum(metrics["retrieval_latency"])
            /
            len(metrics["retrieval_latency"])
        )

    if metrics["generation_latency"]:

        generation_avg = (
            sum(metrics["generation_latency"])
            /
            len(metrics["generation_latency"])
        )

    return {

        "retrieval_latency_ms":
            round(
                retrieval_avg * 1000,
                2
            ),

        "generation_latency_s":
            round(
                generation_avg,
                2
            ),

        "retrieval_history":
            metrics["retrieval_latency"],

        "generation_history":
            metrics["generation_latency"],

        "token_history":
            metrics["token_usage_history"],

        "failed_history":
            metrics["failed_query_history"],

        "total_queries":
            metrics["total_queries"],

        "failed_queries":
            metrics["failed_queries"],

        "token_usage":
            metrics["token_usage"],

        "precision_at_5":
            eval_metrics["precision_at_5"],

        "mrr":
            eval_metrics["mrr"],

        "recall_at_5":
            eval_metrics["recall_at_5"],

        "top_missed_queries":
            metrics["missed_queries"][-10:]
    }


@app.post("/signup")
async def signup(user: UserSignup):

    hashed_password = hash_password(
        user.password
    )

    try:

        cur.execute(
            """
            INSERT INTO users (
                name,
                email,
                password_hash
            )
            VALUES (%s, %s, %s)
            RETURNING id, name, email, created_at
            """,
            (
                user.name,
                user.email,
                hashed_password
            )
        )

        created_user = cur.fetchone()
        conn.commit()

    except psycopg2.errors.UniqueViolation:

        conn.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    except psycopg2.Error:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not create user"
        )

    return {
        "message": "User created successfully",
        "user": {
            "id": str(created_user[0]),
            "name": created_user[1],
            "email": created_user[2],
            "created_at": created_user[3].isoformat()
        }
    }


@app.post("/login")
async def login(user: UserLogin):

    try:

        cur.execute(
            """
            SELECT
                id,
                name,
                email,
                password_hash,
                created_at
            FROM users
            WHERE email = %s
            """,
            (
                user.email,
            )
        )

        existing_user = cur.fetchone()

    except psycopg2.Error:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not log in"
        )

    if (
        not existing_user
        or not verify_password(
            user.password,
            existing_user[3]
        )
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        {
            "sub": existing_user[2]
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
class GoogleLogin(BaseModel):
    email: str
    name: str


@app.post("/login/google")
async def login_google(user_info: GoogleLogin):
    try:
        cur.execute(
            """
            SELECT
                id,
                name,
                email,
                password_hash,
                created_at
            FROM users
            WHERE email = %s
            """,
            (
                user_info.email,
            )
        )
        existing_user = cur.fetchone()
    except psycopg2.Error:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )

    if not existing_user:
        # Create a new user with a random secure password hash
        hashed_password = hash_password(str(uuid.uuid4()))
        try:
            cur.execute(
                """
                INSERT INTO users (
                    name,
                    email,
                    password_hash
                )
                VALUES (%s, %s, %s)
                RETURNING id, name, email, created_at
                """,
                (
                    user_info.name,
                    user_info.email,
                    hashed_password
                )
            )
            created_user = cur.fetchone()
            conn.commit()
            user_data = created_user
        except psycopg2.Error:
            conn.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not create Google user"
            )
    else:
        user_data = existing_user

    token = create_access_token(
        {
            "sub": user_data[2]
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }



@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    original_filename = Path(
        file.filename or ""
    ).name

    if (
        not original_filename
        or Path(original_filename).suffix.lower() != ".pdf"
    ):

        raise HTTPException(
            status_code=400,
            detail="Only PDF uploads are supported"
        )

    file_path = UPLOAD_DIR / (
        f"{uuid.uuid4()}-{original_filename}"
    )

    try:

        with open(
            file_path,
            "wb"
        ) as buffer:

            content = await file.read()

            if not content:

                raise HTTPException(
                    status_code=400,
                    detail="Uploaded PDF is empty"
                )

            buffer.write(content)

        pages = extract_text_from_pdf(
            str(file_path)
        )

        chunks = chunk_text(
            pages
        )

        if not chunks:

            raise HTTPException(
                status_code=422,
                detail="No extractable text was found in this PDF"
            )

        document_id = str(
            uuid.uuid4()
        )

        store_chunks(
            chunks=chunks,
            document_id=document_id,
            filename=original_filename,
            owner_id=current_user["id"]
        )

    except HTTPException:

        conn.rollback()

        raise

    except psycopg2.Error as exc:

        conn.rollback()

        print(
            f"Upload database error: {exc}",
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail="Document indexing failed while saving chunks"
        ) from exc

    except Exception as exc:

        conn.rollback()

        print(
            f"Upload processing error: {exc}",
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail="Document upload failed during processing"
        ) from exc

    return {

        "filename":
            original_filename,

        "pages_extracted":
            len(pages),

        "chunks_created":
            len(chunks),

        "document_id":
            document_id
    }


@app.post("/query")
async def query_docs(
    request: QueryRequest,
    current_user=Depends(get_current_user)
):

    metrics["total_queries"] += 1

    retrieval_start = time.time()

    if (
        request.document_id
        and is_summary_query(request.query)
    ):

        print(
            "Summary query detected; fetching full document",
            flush=True
        )

        results = fetch_document_chunks(
            document_id=request.document_id,
            owner_id=current_user["id"]
        )

    else:

        results = hybrid_search(
            request.query,
            owner_id=current_user["id"]
        )

    retrieval_end = time.time()

    metrics["retrieval_latency"].append(
        round(
            retrieval_end - retrieval_start,
            3
        )
    )

    if len(results) == 0:

        metrics["failed_queries"] += 1

        metrics["failed_query_history"].append(
            1
        )

        metrics["missed_queries"].append(
            request.query
        )

    else:

        metrics["failed_query_history"].append(
            0
        )

    def generate():

        for token in stream_answer(
            request.query,
            results
        ):
            yield token

    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )
