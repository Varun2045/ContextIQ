"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      if (!data.access_token) {
        console.error("Login response missing access_token:", data);
        throw new Error("Login succeeded, but no access token was returned.");
      }

      localStorage.setItem("token", data.access_token);

      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        throw new Error("Login token could not be saved in this browser.");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08080C] text-[#E4E4E7] flex items-center justify-center px-5 py-10 font-jakarta overflow-hidden relative">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
          .font-jakarta {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
        `,
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,#08080C_0%,#0B0B13_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

      <section className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_420px] gap-8 items-center">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#242438] bg-[#0C0C14]/80 px-3 py-1.5 text-xs font-semibold text-zinc-400 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Secure retrieval workspace
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight max-w-xl">
            Welcome back to Retrievium.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-400 max-w-lg">
            Sign in to upload documents, query your indexed knowledge base, and monitor retrieval quality from the dashboard.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
            {["Hybrid Search", "Reranking", "Metrics"].map((item) => (
              <div
                key={item}
                className="border border-[#1B1B26] bg-[#0C0C14]/70 rounded-2xl px-4 py-4"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 mb-3" />
                <p className="text-xs font-bold text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className="w-full border border-[#1B1B26] bg-[#0C0C14]/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40"
        >
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">
                Access Portal
              </p>
              <h2 className="text-3xl font-extrabold text-white mt-2">
                Login
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LockKeyhole className="h-5 w-5 text-white" />
            </div>
          </div>

          <label className="block mb-4">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Email
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#202033] bg-[#08080C] px-4 py-3 focus-within:border-indigo-500/70 transition">
              <Mail className="h-4 w-4 text-zinc-500" />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-zinc-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Password
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#202033] bg-[#08080C] px-4 py-3 focus-within:border-indigo-500/70 transition">
              <LockKeyhole className="h-4 w-4 text-zinc-500" />
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          {error && (
            <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            className="mt-6 w-full h-12 rounded-xl bg-white text-[#08080C] font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Enter dashboard"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold text-indigo-300 hover:text-white transition"
            >
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
