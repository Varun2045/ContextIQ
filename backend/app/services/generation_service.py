import time
import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

from app.metrics import metrics

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(
    dotenv_path=ENV_PATH,
    override=True
)

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile"
)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)
SYSTEM_PROMPT = """
You are an enterprise knowledge assistant.

Rules:

1. Answer ONLY using the provided context.

2. Do NOT use prior knowledge or external information.

3. You may summarize, combine, rephrase, and synthesize information from multiple retrieved passages when all supporting information is present in the context.

4. Do NOT introduce facts, assumptions, conclusions, or details that are not supported by the context.

5. If the answer cannot be determined from the provided context, respond exactly:

"I do not know based on the provided context."

6. Be concise, accurate, and grounded in the retrieved content. Format your answer using structured paragraphs for explanations, and clear bullet points or numbered lists when listing items, key steps, or details to ensure high readability.

7. Do NOT include inline citations (such as page numbers, file names, or parenthetical references) directly inside the body of your response text. Keep the body text clean and easy to read.

8. The source metadata will be appended automatically at the end of the stream, so you do not need to format any sources yourself.

9. Never claim certainty about information that is not explicitly supported by the context.
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

    for chunk in retrieved_chunks:

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
    # GROQ STREAMING
    # =========================

    print(
        f"Starting Groq model {GROQ_MODEL}",
        flush=True
    )
    groq_start = time.time()

    response = client.chat.completions.create(
        model=GROQ_MODEL,
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
        ],
        stream=True
    )

    # =========================
    # STREAM TOKENS
    # =========================

    full_answer = ""
    first_token_seen = False

    for chunk in response:

        if not first_token_seen:

            print(
                f"Groq first token in "
                f"{time.time() - groq_start:.3f}s",
                flush=True
            )

            first_token_seen = True

        token = chunk.choices[0].delta.content

        if token is None:
            continue

        full_answer += token

        yield token

    print(
        f"Groq stream finished in "
        f"{time.time() - groq_start:.3f}s",
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
