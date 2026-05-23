import json

from app.retrieval.hybrid_search import hybrid_search


def evaluate():

    with open(
        "evaluation_dataset.json"
    ) as f:

        dataset = json.load(f)

    precision_scores = []
    reciprocal_ranks = []

    for item in dataset:

        query = item["query"]

        keywords = item[
            "expected_chunk_keywords"
        ]

        results = hybrid_search(query)

        relevant = 0
        first_rank = None

        for idx, chunk in enumerate(results):

            text = chunk[
                "chunk_text"
            ].lower()

            hit = any(
                keyword.lower() in text
                for keyword in keywords
            )

            if hit:

                relevant += 1

                if first_rank is None:

                    first_rank = idx + 1

        precision = (
            relevant / len(results)
            if results else 0
        )

        precision_scores.append(
            precision
        )

        if first_rank:

            reciprocal_ranks.append(
                1 / first_rank
            )

        else:

            reciprocal_ranks.append(
                0
            )

    precision_at_k = (
        sum(precision_scores)
        /
        len(precision_scores)
    )

    mrr = (
        sum(reciprocal_ranks)
        /
        len(reciprocal_ranks)
    )

    print(
        "Precision@K:",
        round(
            precision_at_k,
            3
        )
    )

    print(
        "MRR:",
        round(
            mrr,
            3
        )
    )