from pypdf import PdfReader


CHUNK_SIZE = 500
CHUNK_OVERLAP = 100


def extract_text_from_pdf(file_path: str):
    """
    Extract text page-by-page from PDF
    """

    reader = PdfReader(file_path)

    pages = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""

        pages.append({
            "page_number": page_num + 1,
            "text": text
        })

    return pages


def chunk_text(pages):
    """
    Chunk extracted text intelligently
    """

    chunks = []

    for page in pages:
        page_chunks = split_text(
            page["text"]
        )

        for chunk in page_chunks:
            chunks.append({
                "page_number": page["page_number"],
                "chunk_text": chunk
            })

    return chunks


def split_text(text):

    normalized_text = " ".join(
        text.split()
    )

    if not normalized_text:
        return []

    chunks = []
    start = 0

    while start < len(normalized_text):
        end = min(
            start + CHUNK_SIZE,
            len(normalized_text)
        )

        chunk = normalized_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end == len(normalized_text):
            break

        start = max(
            end - CHUNK_OVERLAP,
            start + 1
        )

    return chunks
