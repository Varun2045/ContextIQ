import time

from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder

from app.db.database import cur
from app.services.embedding_service import (
    generate_embedding
)


def log_timing(label, started_at):
    elapsed = time.time() - started_at

    print(
        f"{label} finished in {elapsed:.3f}s",
        flush=True
    )


# =========================
# RERANKER
# =========================

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

# =========================
# HYBRID SEARCH
# =========================

def hybrid_search(
    query: str,
    owner_id=None
):

    start = time.time()

    print("Starting embedding", flush=True)
    stage_start = time.time()

    # =========================
    # VECTOR SEARCH
    # =========================

    query_embedding = generate_embedding(
        query
    )

    log_timing("Embedding", stage_start)

    embedding_string = str(
        query_embedding
    )

    print("Starting vector search", flush=True)
    stage_start = time.time()

    if owner_id:

        cur.execute(
            """
            SELECT
                id,
                document_id,
                chunk_text,
                page_number,
                filename,
                1 - (embedding <=> %s::vector)
                AS vector_score
            FROM chunks
            WHERE owner_id = %s
            ORDER BY embedding <=> %s::vector
            LIMIT 10
            """,
            (
                embedding_string,
                owner_id,
                embedding_string
            )
        )

    else:

        cur.execute(
            """
            SELECT
                id,
                document_id,
                chunk_text,
                page_number,
                filename,
                1 - (embedding <=> %s::vector)
                AS vector_score
            FROM chunks
            ORDER BY embedding <=> %s::vector
            LIMIT 10
            """,
            (
                embedding_string,
                embedding_string
            )
        )

    vector_results = cur.fetchall()

    log_timing("Vector search", stage_start)
    print("Starting BM25", flush=True)
    stage_start = time.time()

    # =========================
    # BM25 SEARCH
    # =========================

    if owner_id:

        cur.execute(
            """
            SELECT chunk_text
            FROM chunks
            WHERE owner_id = %s
            """,
            (
                owner_id,
            )
        )

    else:

        cur.execute(
            """
            SELECT chunk_text
            FROM chunks
            """
        )

    all_chunks = cur.fetchall()

    print(
        f"BM25 fetched {len(all_chunks)} chunks",
        flush=True
    )

    documents = [
        row[0]
        for row in all_chunks
    ]

    if not documents:
        return []

    tokenized_docs = [
        doc.split()
        for doc in documents
    ]

    bm25 = BM25Okapi(
        tokenized_docs
    )

    bm25_scores = bm25.get_scores(
        query.split()
    )

    log_timing("BM25", stage_start)

    score_map = {
        doc: float(score)
        for doc, score in zip(
            documents,
            bm25_scores
        )
    }

    # =========================
    # HYBRID SCORING
    # =========================

    combined_results = []

    for row in vector_results:

        chunk_id = row[0]
        document_id = row[1]
        chunk_text = row[2]
        page_number = row[3]
        filename = row[4]
        vector_score = float(row[5])

        bm25_score = score_map.get(
            chunk_text,
            0.0
        )

        final_score = (
            0.7 * vector_score
            +
            0.3 * bm25_score
        )

        combined_results.append({

            "chunk_id":
                chunk_id,

            "document_id":
                document_id,

            "chunk_text":
                chunk_text,

            "page_number":
                page_number,

            "filename":
                filename,

            "vector_score":
                vector_score,

            "bm25_score":
                bm25_score,

            "final_score":
                float(final_score)
        })

    # =========================
    # HYBRID SORT
    # =========================

    combined_results.sort(
        key=lambda x: x["final_score"],
        reverse=True
    )

    # =========================
    # RERANK
    # =========================

    pairs = [

        (
            query,
            result["chunk_text"]
        )

        for result in combined_results
    ]

    if pairs:

        print("Starting reranking", flush=True)
        stage_start = time.time()

        rerank_scores = reranker.predict(
            pairs
        )

        log_timing("Reranking", stage_start)

        for i in range(
            len(combined_results)
        ):

            combined_results[i][
                "rerank_score"
            ] = float(
                rerank_scores[i]
            )

        combined_results.sort(
            key=lambda x: x[
                "rerank_score"
            ],
            reverse=True
        )

    # =========================
    # REMOVE DUPLICATES
    # =========================

    unique_results = []
    seen_chunks = set()

    for result in combined_results:

        chunk_text = result[
            "chunk_text"
        ]

        if chunk_text not in seen_chunks:

            seen_chunks.add(
                chunk_text
            )

            unique_results.append(
                result
            )

    final_results = unique_results[:5]

    # =========================
    # DEBUG
    # =========================

    if final_results:

        print(
            f"Search completed in "
            f"{time.time() - start:.2f}s"
        )

        print(
            "TOP RERANK SCORE:",
            final_results[0][
                "rerank_score"
            ]
        )

        print(
            "RETRIEVED CHUNKS:",
            len(final_results)
        )

    return final_results
