import json
from pathlib import Path

from app.retrieval.hybrid_search import hybrid_search


K = 5
DATASET_PATH = Path(__file__).with_name(
    "test_dataset.json"
)
RESULTS_PATH = Path(__file__).with_name(
    "results.json"
)


def normalize_id(value):

    if value is None:

        return None

    return str(value)


def get_relevant_chunk_ids(item):

    ids = (
        item.get("relevant_chunk_ids")
        or item.get("expected_chunk_ids")
        or item.get("relevant_document_ids")
        or item.get("expected_document_ids")
    )

    if not ids:

        return set()

    return {
        normalize_id(chunk_id)
        for chunk_id in ids
        if normalize_id(chunk_id) is not None
    }


def get_result_ids(result):

    return {
        normalize_id(value)
        for value in (
            result.get("chunk_id"),
            result.get("id"),
            result.get("document_id")
        )
        if normalize_id(value) is not None
    }


def is_relevant_by_keywords(result, keywords):

    if not keywords:

        return False

    text = result["chunk_text"].lower()

    return any(
        keyword.lower() in text
        for keyword in keywords
    )


def is_relevant(result, relevant_chunk_ids=None, keywords=None):

    if relevant_chunk_ids:

        return bool(
            get_result_ids(result)
            &
            relevant_chunk_ids
        )

    return is_relevant_by_keywords(
        result,
        keywords
    )


def count_relevant_retrieved(
    results,
    relevant_chunk_ids=None,
    keywords=None,
    k=K
):

    top_results = results[:k]

    return sum(
        1
        for result in top_results
        if is_relevant(
            result,
            relevant_chunk_ids,
            keywords
        )
    )


def precision_at_k(
    results,
    relevant_chunk_ids=None,
    keywords=None,
    k=K
):

    if k <= 0:

        return 0

    relevant_count = count_relevant_retrieved(
        results,
        relevant_chunk_ids,
        keywords,
        k
    )

    return relevant_count / k


def recall_at_k(
    results,
    relevant_chunk_ids=None,
    keywords=None,
    expected_relevant_count=None,
    k=K
):

    if relevant_chunk_ids:

        expected_relevant_count = len(
            relevant_chunk_ids
        )

    if expected_relevant_count is None:

        return None

    if expected_relevant_count <= 0:

        return 0

    relevant_count = count_relevant_retrieved(
        results,
        relevant_chunk_ids,
        keywords,
        k
    )

    return relevant_count / expected_relevant_count


def reciprocal_rank(
    results,
    relevant_chunk_ids=None,
    keywords=None,
    k=K
):

    for idx, result in enumerate(
        results[:k]
    ):

        if is_relevant(
            result,
            relevant_chunk_ids,
            keywords
        ):

            return 1 / (idx + 1)

    return 0


def average(values):

    if not values:

        return 0

    return sum(values) / len(values)


def evaluate(
    dataset_path=DATASET_PATH,
    k=K,
    results_path=RESULTS_PATH
):

    with open(
        dataset_path
    ) as f:

        dataset = json.load(f)

    precision_scores = []
    recall_scores = []
    reciprocal_ranks = []

    for item in dataset:

        query = item["query"]

        keywords = item.get(
            "expected_chunk_keywords",
            []
        )

        relevant_chunk_ids = get_relevant_chunk_ids(
            item
        )

        expected_relevant_count = item.get(
            "expected_relevant_count"
        )

        results = hybrid_search(
            query
        )

        precision_scores.append(
            precision_at_k(
                results,
                relevant_chunk_ids,
                keywords,
                k
            )
        )

        recall = recall_at_k(
            results,
            relevant_chunk_ids,
            keywords,
            expected_relevant_count,
            k
        )

        if recall is not None:

            recall_scores.append(
                recall
            )

        reciprocal_ranks.append(
            reciprocal_rank(
                results,
                relevant_chunk_ids,
                keywords,
                k
            )
        )

        print(
            f"{query} | retrieved={len(results)} | "
            f"precision@{k}={precision_scores[-1]:.3f} | "
            f"rr={reciprocal_ranks[-1]:.3f}"
        )

    print()

    avg_precision = round(
        average(precision_scores),
        3
    )

    avg_recall = None

    print(
        f"Precision@{k}:",
        avg_precision
    )

    if recall_scores:

        avg_recall = round(
            average(recall_scores),
            3
        )

        print(
            f"Recall@{k}:",
            avg_recall
        )

    else:

        print(
            f"Recall@{k}: N/A "
            "(add expected_relevant_count per dataset item)"
        )

    avg_mrr = round(
        average(reciprocal_ranks),
        3
    )

    print(
        "MRR:",
        avg_mrr
    )

    results = {
        "precision_at_5": avg_precision,
        "mrr": avg_mrr,
        "recall_at_5": avg_recall
    }

    with open(
        results_path,
        "w"
    ) as f:

        json.dump(
            results,
            f,
            indent=2
        )

    print(
        f"Wrote evaluation metrics to {results_path}"
    )

    return results


if __name__ == "__main__":

    evaluate()
