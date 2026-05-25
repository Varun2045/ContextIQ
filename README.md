# Retrievium – Production RAG Platform

## Overview

Retrievium is a production-grade Retrieval-Augmented Generation (RAG) platform engineered for secure document ingestion, semantic retrieval, and AI-powered question answering.

The platform enables users to upload PDF documents, automatically extract and chunk content, generate lightweight hashing-based vector embeddings, and perform hybrid retrieval combining vector similarity with lexical BM25 relevance scoring. Retrieved context is then supplied to a Groq-hosted Large Language Model to generate grounded, context-aware responses.

Unlike traditional RAG demos, Retrievium implements JWT-based authentication and per-user document ownership enforcement, ensuring that users can only retrieve information from documents they have personally uploaded.

---

## Architecture

```text
User
 │
 ▼
Next.js Frontend
 │
 ▼
FastAPI Backend
 │
 ├── JWT Authentication
 ├── PDF Processing
 ├── Chunking Pipeline
 ├── Lightweight Hashing Embeddings
 ├── Hybrid Retrieval
 └── Groq Streaming Response Generation
 │
 ▼
PostgreSQL + pgvector (Supabase)
```

---

## Key Features

### Authentication & Security

- JWT-based Authentication
- Secure Password Hashing
- Protected API Endpoints
- Route-Level Access Control
- Session Persistence

### Document Processing

- PDF Upload Support
- Automated Text Extraction
- Recursive Document Chunking
- Upload Validation and Clear Error Responses
- Metadata Preservation
- Scalable Ingestion Pipeline

### Retrieval Pipeline

- Lightweight Hashing Embedding Generation
- pgvector Semantic Search
- Hybrid Retrieval (Vector + Lexical)
- Groq-Powered Streaming Response Generation

### Multi-Tenant Isolation

- Per-User Document Ownership
- Ownership-Aware Retrieval
- User-Level Data Separation
- Secure Document Access Control

### Evaluation & Observability

- Retrieval Evaluation Utilities
- Relevance Testing Dataset
- Modular Retrieval Architecture
- Retrieval Performance Analysis

---

## Technical Highlights

### Hybrid Retrieval

Retrievium combines dense vector retrieval with lexical relevance matching to improve retrieval quality beyond traditional vector-only search systems.

### Ownership-Aware Search

Each document chunk is associated with a specific user identifier.

```sql
WHERE owner_id = current_user_id
```

This guarantees strict user-level document isolation and prevents cross-user data exposure.

### Semantic Search Infrastructure

Embeddings are generated locally with scikit-learn's `HashingVectorizer` and stored inside PostgreSQL using pgvector. Similarity search is executed directly within the database using vector distance operators, then combined with BM25 lexical scoring for lightweight retrieval that fits Render's free memory tier.

### Groq Response Generation

Retrieved chunks are sent to Groq for streamed grounded answers. The default model is configured in `backend/app/services/generation_service.py` as `llama-3.3-70b-versatile` and can be changed with `GROQ_MODEL`.

### Upload Error Handling

The upload API validates PDF uploads before indexing. It rejects non-PDF files, empty PDFs, and PDFs with no extractable text, and returns clear error messages to the frontend. Database and processing failures are rolled back and reported with explicit upload/indexing errors.

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript

### Backend

- FastAPI
- Python

### Database

- PostgreSQL
- pgvector
- Supabase

### AI & Retrieval

- scikit-learn HashingVectorizer
- Groq
- Hybrid Search
- Semantic Retrieval

### Security

- JWT Authentication
- Password Hashing
- Protected Routes
- Ownership-Based Access Control

---

## System Capabilities

- PDF Document Ingestion
- Lightweight Hashing Embedding Generation
- pgvector Similarity Search
- Hybrid Semantic-Lexical Retrieval
- Groq Streaming Answer Generation
- JWT-Protected APIs
- Per-User Document Isolation
- FastAPI REST Architecture
- Supabase PostgreSQL Backend
- End-to-End RAG Workflow

---

## Run Locally

### Backend

Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/app/.env` and configure:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger Documentation:

```text
http://127.0.0.1:8000/docs
```

---

### Frontend

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:3000
```

---

## Example Workflow

1. User creates an account
2. User logs in via JWT authentication
3. PDF documents are uploaded and validated
4. Text is extracted and chunked
5. Lightweight hashing embeddings are generated
6. Chunks are stored in PostgreSQL + pgvector
7. User submits a natural language query
8. Hybrid retrieval identifies relevant context
9. Retrieved context is supplied to Groq
10. A grounded response is streamed back to the user

---

## Engineering Challenges Solved

- Secure Multi-User Authentication
- Vector Database Integration
- Hybrid Retrieval Implementation
- Per-User Document Ownership Enforcement
- End-to-End RAG Pipeline Orchestration
- Semantic Search Infrastructure
- Groq-Based Streaming Generation
- Production-Oriented API Design
- Explicit Upload Validation and Failure Reporting
- Scalable Document Processing Workflow

---

## Future Improvements

- Streaming Responses
- Conversation Memory
- Citation Generation
- Managed embedding provider support
- Multi-Document Collections
- Analytics Dashboard
- CI/CD Pipelines
- Kubernetes Deployment

---

## Author

**Neha Damani**

Production-grade Retrieval-Augmented Generation (RAG) platform featuring lightweight hashing-based embedding generation, Groq-powered streamed answers, pgvector similarity search, hybrid semantic-lexical retrieval, JWT authentication, ownership-aware access control, document chunking pipelines, FastAPI backend services, Next.js frontend architecture, and PostgreSQL-backed vector retrieval infrastructure.
