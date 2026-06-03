# 🧠 ContextIQ — Production-Grade RAG Platform

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-svg&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-svg&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-blue?style=flat-svg&logo=postgresql)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Cloud%20Database-Supabase-3ecf8e?style=flat-svg&logo=supabase)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Inference%20Engine-Groq%20Llama%203.3-orange?style=flat-svg)](https://groq.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Active-brightgreen?style=flat-svg)](https://contextiq-frontend.onrender.com/)

🚀 **Live Demo: https://contextiq-frontend.onrender.com/**

ContextIQ is a production-grade, secure, multi-tenant **Retrieval-Augmented Generation (RAG)** platform engineered for blazing-fast document ingestion, ownership-aware hybrid retrieval, and AI-powered question answering.

Unlike simple RAG prototypes, ContextIQ features **JWT-based session authentication**, strict **user-level document isolation** (preventing cross-user data exposure), custom **hybrid search algorithms**, and real-time **telemetry metrics** for measuring retrieval performance.

---

## 📸 Platform Demos

Here is a visual walkthrough of the platform. You can replace these placeholder banners with your screenshots:

### 1. Unified Authentication Gate (Light & Dark Mode)
> Dynamic, system-preference-driven login split-screen with instant CSS toggling.
> 
> ![Unified Authentication Gate](assets/LoginScreen.png)

### 2. Main Retrieval Workspace (Dashboard)
> Interactive dashboard for uploading corpuses, selecting active documents, and reviewing indexing logs.
> 
> ![Main Retrieval Workspace](assets/Dashboard%20Overview%20Demo.png)

### 3. Streamed Grounded AI Querying
> Grounded streaming answers using Groq-hosted Llama-3.3-70b-versatile, with validation metrics.
> 
> ![Streamed Grounded AI Querying](assets/Streamed%20Grounded%20AI%20Querying.png)

### 4. Telemetry and Analytics Engine
> Analytics showing precise metrics for retrieval latency, token counts, MRR, and Precision@5.
> 
> ![Telemetry and Analytics Engine](assets/Telemetry%20and%20Analytics%20Engine.png)

---

## 🛠️ System Architecture

ContextIQ is designed with a decoupled frontend-backend model, leveraging high-performance Python streaming and low-latency database vectors:

```mermaid
graph TD
    User([User]) -->|Queries / Uploads| FE[Next.js Frontend]
    FE -->|API Requests + JWT| BE[FastAPI Backend]
    
    subgraph Ingestion Pipeline [Ingestion Pipeline]
        BE -->|PDF Extract| PDF[pypdf Extractor]
        PDF -->|Recursive Split| Chunks[Text Chunker]
        Chunks -->|HashingVectorizer| Embed[Lightweight Hashing Embeddings]
    end

    subgraph Storage & Retrieval [Storage & Retrieval]
        Embed -->|Index & Store| DB[(PostgreSQL + pgvector)]
        BE -->|Ownership-Aware Query| DB
        DB -->|Context Records| BE
    end

    subgraph Response Generation [Response Generation]
        BE -->|Context + Query| LLM[Groq Llama 3.3]
        LLM -->|Streamed Tokens| FE
    end

    classDef default fill:#0e0e16,stroke:#3b3b4f,color:#fff;
    classDef highlight fill:#1f1f3a,stroke:#6366f1,color:#fff;
    class FE,BE highlight;
```

---

## 🌟 Key Features

### 🔒 Enterprise-Grade Security
* **JWT Token Sessions:** Client-side token storage with secure headers and automated redirection guards.
* **Per-User Isolation:** Multi-tenant document database rows. A user can only search or view files they personally uploaded.
* **Database Row Encryption:** Cryptographic schema separation using Supabase authentication filters.

### 📄 Intelligent Ingestion Pipeline
* **Recursive Chunking:** Splitting raw PDF extracts to preserve sentence boundaries and semantic structures.
* **Lightweight Hashing Embeddings:** Employs `HashingVectorizer` to map tokens into a dense space optimized for memory efficiency.
* **Upload Sanitization:** Automated rejection of encrypted, blank, corrupt, or non-PDF files with visual alerts.

### 🔎 Hybrid Retrieval Engine
* **Semantic Vector Search:** Direct cosine similarity querying in PostgreSQL via `pgvector`.
* **Lexical BM25 Search:** Ranked keyword matching to capture exact terms and technical phrases.
* **Rerank & Fusion:** Linear combination of lexical and vector results to prioritize high-relevance chunks.

### 📊 Observability & Telemetry
* **Real-time Latency Metrics:** Tracking time-to-first-token, retrieval duration, and generation performance.
* **Precision & Relevance Testing:** Inbuilt scoring functions assessing Mean Reciprocal Rank (MRR) and Precision@5.

---

## ⚙️ Engineering Challenges Solved

> [!TIP]
> **Performance Optimization: Overcoming Bcrypt Deprecation Latency**
> 
> Passlib's pure-Python fallback causes a 2-second authentication delay on modern Python runtimes. We bypassed this by swapping the hashing check with native binary-compiled `bcrypt` bindings, reducing login response times from **2000ms** to less than **150ms**.

> [!NOTE]
> **Dynamic Styling: Eliminating Unstyled Theme Flashes**
> 
> To prevent jarring screen flashes during Next.js hydration, an inline render-blocking script detects user theme preferences (`prefers-color-scheme`) and injects the light theme class directly into the HTML element before React renders the viewport.

---

## 🚀 Local Deployment Guide

### Prerequisites
* Node.js (v20+)
* Python (3.10+)
* PostgreSQL Database (with `pgvector` enabled, e.g., Supabase)
* Groq API Key

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file inside `backend/app/` with the following variables:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_key
   GROQ_MODEL=llama-3.3-70b-versatile
   DATABASE_URL=postgresql://your_postgres_credentials
   JWT_SECRET=your_custom_jwt_hex_secret
   ```

5. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

* Backend running at: `http://127.0.0.1:8000`
* Swagger docs available at: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the JavaScript packages:
   ```bash
   npm install
   ```

3. Configure `.env.local` in the frontend root:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

* Web dashboard active at: `http://localhost:3000`

---

## ⚡ Database Schema Setup

If you are setting up the PostgreSQL database from scratch, use the SQL commands below to initialize the vectors and tables:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chunks table with vector support
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    chunk_text TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    embedding vector(384),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔮 Future Roadmap

* 💬 **Converational Multi-turn Memory:** Maintain conversation context history across queries.
* 📌 **Source Citation Highlighting:** Render dynamic hyperlinks directly pointing to specific pages of the document source.
* 📈 **Advanced Analytics Dashboard:** Add visual graphs using Recharts for ingestion throughput and latency breakdowns.
* 📦 **Docker Containerization:** Add dockerfiles for easy orchestration with Kubernetes and ECS.

---

## 👤 Author

**Varun Damani** - *Software Engineering & AI Architect*

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](file:///c:/Users/varun/Downloads/ContextIQ/LICENSE) file for details.

---

If **ContextIQ** saved you time, please consider giving it a ⭐ — it helps more people discover it!
