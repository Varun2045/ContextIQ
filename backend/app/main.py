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

from app.services.generation_service import (
    stream_answer
)

from app.metrics import metrics

app = FastAPI(
    title="Retrievium"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
BASE_DIR = Path(__file__).resolve().parent.parent
EVALUATION_RESULTS_PATH = BASE_DIR / "evaluation" / "results.json"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


class QueryRequest(BaseModel):
    query: str


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
        "Retrievium API running"
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


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        content = await file.read()

        buffer.write(content)

    pages = extract_text_from_pdf(
        file_path
    )

    chunks = chunk_text(
        pages
    )

    document_id = str(
        uuid.uuid4()
    )

    store_chunks(
        chunks=chunks,
        document_id=document_id,
        filename=file.filename,
        owner_id=current_user["id"]
    )

    return {

        "filename":
            file.filename,

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
