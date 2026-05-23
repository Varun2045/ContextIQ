from app.db.database import cur
from app.services.embedding_service import (
    generate_embedding
)

def search_chunks(
    query: str,
    owner_id=None
):

    query_embedding = generate_embedding(query)

    if owner_id:

        cur.execute("""
            SELECT
                chunk_text,
                page_number
            FROM chunks
            WHERE owner_id = %s
            ORDER BY embedding <=> %s::vector
            LIMIT 5
        """, (
            owner_id,
            query_embedding
        ))

    else:

        cur.execute("""
            SELECT
                chunk_text,
                page_number
            FROM chunks
            ORDER BY embedding <=> %s::vector
            LIMIT 5
        """, (
            query_embedding,
        ))

    results = cur.fetchall()

    return results
