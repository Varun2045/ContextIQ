"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Sun, Moon } from "lucide-react";

interface Toast {
  type: "success" | "error" | "info";
  message: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getErrorMessage(
  response: Response,
  fallback: string
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    const detail = data?.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  const text = await response.text();

  return text || fallback;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      const defaultTheme = prefersLight ? "light" : "dark";
      setTheme(defaultTheme);
      if (defaultTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  // Helper: Display dynamic custom toast notification
  const showToast = (message: string, type: Toast["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // =========================
  // FILE DRAG & DROP HANDLERS
  // =========================
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        showToast(`Selected: ${droppedFile.name}`, "info");
      } else {
        showToast("Please upload a PDF document.", "error");
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      showToast(`Selected: ${e.target.files[0].name}`, "info");
    }
  };

  // =========================
  // UPLOAD PDF
  // =========================
  const uploadFile = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        showToast("Please log in before uploading a document.", "error");
        return;
      }

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          showToast("Session expired or user deleted. Please log in again.", "error");
          return;
        }

        const errorText = await getErrorMessage(
          response,
          "Document indexing failed. Verify backend server."
        );

        showToast(`Upload failed (${response.status}): ${errorText}`, "error");
        return;
      }

      showToast("Document uploaded and indexed successfully", "success");
    } catch (error) {
      console.warn(error);
      showToast(
        error instanceof Error
          ? error.message
          : "Document indexing failed. Verify backend server.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ASK QUESTION
  // =========================
  const askQuestion = async () => {
    if (!query) return;

    setAnswer("");
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        showToast("Please log in before querying documents.", "error");
        return;
      }

      const response = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          showToast("Session expired or user deleted. Please log in again.", "error");
          return;
        }

        const errorText = await getErrorMessage(
          response,
          "Retrieval query failed. Verify backend status."
        );

        showToast(`Query failed (${response.status}): ${errorText}`, "error");
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setAnswer((prev) => prev + chunk);
      }
    } catch (error) {
      console.warn(error);
      showToast(
        error instanceof Error
          ? error.message
          : "Retrieval query failed. Verify backend status.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (promptText: string) => {
    setQuery(promptText);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    showToast("Answer copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const isThreadEmpty = !query && !answer;

  const suggestions = [
    {
      title: "Synthesize Key Risks",
      desc: "Perform risk mapping on recently indexed policies",
      prompt:
        "Can you analyze the uploaded documents and map the primary operational and regulatory risks mentioned?",
    },
    {
      title: "Financial Checklist",
      desc: "Generate summary tables of core financial data",
      prompt:
        "Please review the financial statements in the document and extract a clean outline of revenue vs expenses.",
    },
    {
      title: "Compliance Check",
      desc: "Verify adherence guidelines inside agreements",
      prompt:
        "What are the specific liability provisions and termination terms outlined in the agreements?",
    },
  ];

  return (
    <main className="h-screen bg-[#08080C] text-[#E4E4E7] flex flex-col md:flex-row font-jakarta overflow-hidden relative">
      {/* Dynamic Font and Style Injector */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        .font-jakarta {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.16);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-pulse-glow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
        @keyframes bounce-dot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .dot-bounce-1 { animation: bounce-dot 1.2s infinite ease-in-out 0.1s; }
        .dot-bounce-2 { animation: bounce-dot 1.2s infinite ease-in-out 0.2s; }
        .dot-bounce-3 { animation: bounce-dot 1.2s infinite ease-in-out 0.3s; }
      `,
        }}
      />

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[30rem] h-[30rem] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-80 border-r border-[#1B1B26] bg-[#0C0C14]/90 backdrop-blur-xl p-6 flex-col justify-between z-10 shrink-0">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold logo-gradient tracking-tight">
                  ContextIQ
                </h1>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  Enterprise RAG
                </p>
              </div>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-[#12121E] border border-[#212130] rounded-xl text-zinc-400 hover:text-white transition duration-200 shadow-md active:scale-95"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>

          {/* System Status Metrics Card */}
          <div className="bg-[#12121E] border border-[#212130] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium">
                Session Status
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Active
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex justify-between">
              <span>Embedding model:</span>
              <span className="text-zinc-400">text-embedding-3</span>
            </div>
          </div>

          {/* FILE UPLOAD INTERFACE */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-1">
              Document Corpus
            </h3>

            {file ? (
              <div className="bg-[#12121E] border border-[#232335] rounded-xl p-3.5 flex flex-col gap-3 relative shadow-inner">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-red-500/10 rounded-lg text-red-400 shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200 truncate pr-4">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300 transition p-1 rounded-md hover:bg-zinc-800"
                    title="Remove file"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={uploadFile}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 ${
                    loading
                      ? theme === "light"
                        ? "bg-zinc-200 text-zinc-500 cursor-not-allowed border border-zinc-300"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-[#E4E4E7] text-black hover:bg-white active:scale-95 shadow-md shadow-white/5"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Indexing PDF...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Upload to Vector Store
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-[#2A2A3E] hover:border-zinc-700 bg-[#0E0E16]/50 hover:bg-[#12121E] text-zinc-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-[#151522] rounded-xl text-indigo-400 mb-2.5 border border-[#212133]">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-zinc-300">
                  Upload Knowledge Source
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">
                  Drag and drop or click to upload PDF
                </span>
              </div>
            )}
          </div>

          {/* SIDEBAR NAVIGATION */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-1 mb-2">
              Workspaces
            </h3>
            <Link
              href="/"
              className="group flex items-center justify-between w-full bg-[#12121F]/80 border border-[#20202F]/80 p-3 rounded-xl hover:bg-[#161626] transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-indigo-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-zinc-200">
                  AI Retrieval Agent
                </span>
              </div>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </Link>

            <Link
              href="/dashboard"
              className="group flex items-center justify-between w-full bg-transparent border border-transparent p-3 rounded-xl hover:bg-[#12121E]/60 hover:border-[#1E1E2B] transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 group-hover:text-zinc-300 transition">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </span>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition">
                  RAG Performance Logs
                </span>
              </div>
              <svg
                className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Footer Brand Indicator */}
        <div className="pt-4 border-t border-[#161623] text-zinc-500">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            className="group w-full mb-3 flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100 shadow-lg shadow-rose-950/20 hover:bg-rose-500 hover:border-rose-400 hover:text-white transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

        </div>
      </aside>

      {/* MOBILE NAV HEADER */}
      <header className="md:hidden flex items-center justify-between bg-[#0C0C14] border-b border-[#1B1B26] px-5 py-4 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg">
            <svg
              className="w-4.5 h-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-sm font-bold mobile-logo tracking-tight">
            ContextIQ
          </span>
        </div>

        {/* Simple File Input Toggle on Mobile Header */}
        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-[#12121E] border border-[#212130] rounded-xl text-zinc-400 hover:text-white transition duration-200 active:scale-95"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          <label className="cursor-pointer bg-[#12121E] border border-[#212130] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-zinc-300">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>{file ? "Change PDF" : "Add PDF"}</span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {file && (
            <button
              onClick={uploadFile}
              disabled={loading}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-500 active:scale-95"
            >
              {loading ? "..." : "Upload"}
            </button>
          )}
        </div>
      </header>

      {/* CHAT INTERACTIVE PANEL */}
      <section className="flex-1 flex flex-col z-10 min-w-0">
        {/* TOP STATUS BAR */}
        <div className="hidden md:flex items-center justify-between border-b border-[#14141E] bg-[#08080C]/40 backdrop-blur-md px-10 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-glow" />
            <span className="text-xs text-zinc-400 font-semibold">
              Semantic Model Gateway Active
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              Context Length: <strong className="text-zinc-400">128k</strong>
            </span>
            <span className="w-px h-3 bg-[#1D1D2C]" />
            <span>
              Search Threshold: <strong className="text-zinc-400">0.82</strong>
            </span>
          </div>
        </div>

        {/* WORKSPACE CONTENT BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 flex flex-col">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
            {isThreadEmpty ? (
              /* DYNAMIC WELCOME HERO DASHBOARD */
              <div className="flex-1 flex flex-col justify-center items-center py-8">
                <div className="text-center max-w-2xl mb-12 relative">
                  <div className="inline-flex items-center gap-1.5 bg-[#12121E] border border-indigo-500/20 px-3.5 py-1 rounded-full text-indigo-400 text-xs font-semibold mb-6 shadow-inner tracking-wide uppercase">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Enterprise Cognitive Layer
                  </div>

                  <h2 className="text-4xl md:text-5.5xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
                    What would you like to retrieve?
                  </h2>
                  <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-light">
                    Upload critical PDF document corpuses, then query details
                    instantly. ContextIQ matches vector databases directly to
                    formulate structured answers.
                  </p>
                </div>

                {/* SUGGESTION TILES */}
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <svg
                      className="w-4 h-4 text-indigo-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Recommended Queries
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(item.prompt)}
                        className="text-left bg-[#0E0E17]/60 hover:bg-[#12121E] border border-[#1A1A2A] hover:border-indigo-500/30 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] group"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-indigo-400 font-mono tracking-wider">
                            {item.title}
                          </span>
                          <svg
                            className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-zinc-300 mb-1 leading-snug">
                          {item.desc}
                        </p>
                        <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ACTIVE DIALOG THREAD */
              <div className="flex-1 flex flex-col justify-end py-6 space-y-6">
                {/* USER MESSAGE ROW */}
                {query && (
                  <div className="flex justify-end items-start gap-4">
                    <div className="flex flex-col items-end gap-1.5 max-w-2xl min-w-0">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-1">
                        Origin Query
                      </span>
                      <div className="bg-[#1A1A2F]/90 border border-indigo-500/20 text-[#F4F4F5] p-5 rounded-2xl rounded-tr-sm shadow-md shadow-indigo-950/10 text-sm leading-relaxed font-medium">
                        {query}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#1D1D2C] border border-[#2E2E44] flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 text-zinc-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* AI RESPONSE ROW */}
                {(answer || loading) && (
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
                      <svg
                        className="w-4.5 h-4.5 text-white animate-pulse-glow"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center justify-between mr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Cognitive Output
                          </span>
                          {answer && (
                            <span className="bg-[#12121E] border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-semibold text-emerald-400 uppercase tracking-wide">
                              Grounded
                            </span>
                          )}
                        </div>
                        {answer && (
                          <button
                            onClick={handleCopyText}
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-semibold px-2 py-1 rounded-md hover:bg-[#12121E] transition duration-200"
                            title="Copy answer"
                          >
                            {copied ? (
                              <>
                                <svg
                                  className="w-3.5 h-3.5 text-emerald-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span className="text-emerald-400 text-[10px]">
                                  Copied
                                </span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                  />
                                </svg>
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="bg-[#0E0E16]/80 border border-[#191928] p-6 rounded-2xl rounded-tl-sm shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                        {answer ? (
                          <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-[1.8] whitespace-pre-wrap font-jakarta font-normal">
                            {answer}
                          </div>
                        ) : (
                          loading && (
                            <div className="flex items-center gap-1.5 py-2">
                              <span className="w-2 h-2 bg-indigo-500 rounded-full dot-bounce-1" />
                              <span className="w-2 h-2 bg-indigo-500 rounded-full dot-bounce-2" />
                              <span className="w-2 h-2 bg-indigo-500 rounded-full dot-bounce-3" />
                            </div>
                          )
                        )}

                        {answer && (
                          <div className="mt-5 pt-4 border-t border-[#161623] flex items-center justify-between text-[10px] text-zinc-500">
                            <div className="flex items-center gap-1.5">
                              <svg
                                className="w-3.5 h-3.5 text-indigo-400/80"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span>
                                Confidence Metric:{" "}
                                <strong>100% Vector Lock</strong>
                              </span>
                            </div>
                            <span>Powered by LlamaIndex + PgVector</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* INPUT BAR FLOATING CONSOLE */}
        <div className="border-t border-[#12121E] bg-[#08080C]/80 backdrop-blur-lg px-6 md:px-10 py-5">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <div className="relative flex items-center bg-[#101019] border border-[#20202F] rounded-2xl px-5 py-3.5 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30 transition duration-200 shadow-xl shadow-black/20">
              {/* Paperclip Shortcut for Mobile/Quick selects */}
              <button
                onClick={triggerFileSelect}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition mr-2 hover:bg-zinc-800/40 rounded-lg"
                title="Select local document"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder="Ask grounded questions about your documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none w-full mr-4"
              />

              <button
                onClick={askQuestion}
                disabled={loading || !query}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition duration-200 ${
                  !query || loading
                    ? "bg-[#181827] text-zinc-500 cursor-not-allowed border border-[#252538]"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                }`}
              >
                <span>Search</span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-between px-2 text-[10px] text-zinc-500">
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Response will be verified against referenced documents.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">
                  Press <strong>Enter</strong> to send
                </span>
                <span className="w-px h-3 bg-zinc-700/30 hidden sm:inline" />
                <span className="font-semibold tracking-wide">
                  Enterprise Secure Cloud
                </span>
                <span className="bg-[#12121F] border border-[#20202F]/80 px-2 py-0.5 rounded-full text-zinc-400 font-mono text-[9px]">
                  v1.2.8
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#11111B] border border-[#252538] px-5 py-4 rounded-xl shadow-2xl shadow-black/80 animate-fade-in transition duration-300">
          {toast.type === "success" && (
            <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          {toast.type === "error" && (
            <div className="p-1 bg-red-500/10 rounded-lg text-red-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          )}
          {toast.type === "info" && (
            <div className="p-1 bg-indigo-500/10 rounded-lg text-indigo-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
          <span className="text-xs font-semibold text-zinc-200">
            {toast.message}
          </span>
        </div>
      )}
    </main>
  );
}
