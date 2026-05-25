def rerank_results(query, results):

    for result in results:
        result["rerank_score"] = result.get(
            "final_score",
            0.0
        )

    reranked = sorted(
        results,
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    # Keep top 5
    return reranked[:5]
