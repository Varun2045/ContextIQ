import time
import ollama

from app.metrics import metrics

SYSTEM_PROMPT = """
You are an enterprise knowledge assistant.

STRICT RULES:

1. Answer ONLY using the provided context.

2. Do NOT use prior knowledge.

3. Do NOT infer or assume anything.

4. If the answer is not explicitly present in the context,
respond exactly with:

"I do not know based on the provided context."

5. Always cite sources using:
(Filename, Page Number)

6. Never mention information not present in the context.
"""


def stream_answer(
    query,
    retrieved_chunks
):

    start = time.time()

    context = ""

    # =========================
    # BUILD CONTEXT
    # =========================

    for chunk in retrieved_chunks:

        context += f"""

SOURCE:
Filename: {chunk['filename']}
Page: {chunk['page_number']}

Content:
{chunk['chunk_text']}
"""

    # =========================
    # BUILD SOURCES
    # =========================

    sources = []

    for chunk in retrieved_chunks[:2]:

        source = (
            f"({chunk['filename']}, "
            f"Page {chunk['page_number']})"
        )

        if source not in sources:
            sources.append(source)

    # =========================
    # DEBUG RETRIEVAL
    # =========================

    print("\n===== RETRIEVED CHUNKS =====")

    if not retrieved_chunks:
        print("NO CHUNKS RETRIEVED")

    for chunk in retrieved_chunks:

        print(
            f"{chunk['filename']} | Page {chunk['page_number']}"
        )

        print(
            chunk["chunk_text"][:500]
        )

        print("-" * 50)

    # =========================
    # TOKEN COUNT
    # =========================

    prompt_tokens = len(
        context.split()
    )

    query_tokens = len(
        query.split()
    )

    # =========================
    # OLLAMA STREAMING
    # =========================

    print("Starting Ollama", flush=True)
    ollama_start = time.time()

    response = ollama.chat(
        model="llama3",
        stream=True,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"""
Question:
{query}

Context:
{context}
"""
            }
        ]
    )

    # =========================
    # STREAM TOKENS
    # =========================

    full_answer = ""
    first_token_seen = False

    for chunk in response:

        if not first_token_seen:

            print(
                f"Ollama first token in "
                f"{time.time() - ollama_start:.3f}s",
                flush=True
            )

            first_token_seen = True

        token = chunk["message"]["content"]

        full_answer += token

        yield token

    print(
        f"Ollama stream finished in "
        f"{time.time() - ollama_start:.3f}s",
        flush=True
    )

    # =========================
    # STREAM SOURCES
    # =========================

    if sources:

        yield "\n\nSources:\n"

        for source in sources:

            yield source + "\n"

            full_answer += source + "\n"

    # =========================
    # METRICS
    # =========================

    latency = time.time() - start

    answer_tokens = len(
        full_answer.split()
    )

    current_tokens = (
        prompt_tokens
        + query_tokens
        + answer_tokens
    )

    metrics[
        "generation_latency"
    ].append(
        round(latency, 3)
    )

    metrics[
        "token_usage"
    ] += current_tokens

    metrics[
        "token_usage_history"
    ].append(
        current_tokens
    )

    # =========================
    # FAILED QUERY TRACKING
    # =========================

    if (
        "I do not know based on the provided context"
        in full_answer
    ):

        metrics[
            "failed_queries"
        ] += 1

        metrics[
            "missed_queries"
        ].append(
            query
        )

    # =========================
    # CONSOLE METRICS
    # =========================

    print("\n===== GENERATION METRICS =====")

    print(
        f"Latency: {latency:.2f} seconds"
    )

    print(
        f"Retrieved Chunks: {len(retrieved_chunks)}"
    )

    print(
        f"Estimated Tokens: {current_tokens}"
    )

    print(
        f"Failed Queries: {metrics['failed_queries']}"
    )

    print("==============================\n")
