import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter


def extract_text_from_pdf(file_path: str):
    """
    Extract text page-by-page from PDF
    """

    doc = fitz.open(file_path)

    pages = []

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)

        text = page.get_text()

        pages.append({
            "page_number": page_num + 1,
            "text": text
        })

    return pages


def chunk_text(pages):
    """
    Chunk extracted text intelligently
    """

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    chunks = []

    for page in pages:
        split_chunks = splitter.split_text(page["text"])

        for chunk in split_chunks:
            chunks.append({
                "page_number": page["page_number"],
                "chunk_text": chunk
            })

    return chunks