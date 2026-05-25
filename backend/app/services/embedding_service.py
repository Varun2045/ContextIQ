from sklearn.feature_extraction.text import HashingVectorizer

VECTOR_DIMENSIONS = 384

vectorizer = HashingVectorizer(
    n_features=VECTOR_DIMENSIONS,
    alternate_sign=False,
    norm="l2"
)


def generate_embedding(text: str):

    embedding = vectorizer.transform(
        [text]
    )

    return embedding.toarray()[0].tolist()
