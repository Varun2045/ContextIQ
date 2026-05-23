from sentence_transformers import CrossEncoder

# Load reranker model
reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

def rerank_results(query, results):

    # Create query-document pairs
    pairs = [
        (query, result["chunk_text"])
        for result in results
    ]

    # Predict relevance scores
    scores = reranker.predict(pairs)

    # Attach rerank scores
    for i in range(len(results)):
        results[i]["rerank_score"] = float(scores[i])

    # Sort by rerank score
    reranked = sorted(
        results,
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    # Keep top 5
    return reranked[:5]