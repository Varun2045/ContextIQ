"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
interface Metrics {
  retrieval_latency_ms: number;
  generation_latency_s: number;
  total_queries: number;
  failed_queries: number;
  token_usage: number;

  precision?: number | null;
  precision_at_k?: number | null;
  precision_at_5?: number | null;
  recall?: number | null;
  recall_at_k?: number | null;
  recall_at_5?: number | null;
  mrr: number | null;

  top_missed_queries: string[];

  retrieval_history: number[];
  generation_history: number[];
  token_history: number[];
  failed_history: number[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    value: number | string;
    name?: string;
  }[];
  label?: number | string;
}

// Custom tooltip renderer to match the premium glassmorphism theme
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0C0C14]/90 backdrop-blur-md border border-[#232335] p-3 rounded-xl shadow-xl">
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
          Session {label}
        </p>
        <p className="text-sm font-extrabold text-white">
          {payload[0].value}{" "}
          <span className="text-[10px] font-normal text-zinc-400">
            {payload[0].name === "latency_ms"
              ? "ms"
              : payload[0].name === "latency_s"
                ? "s"
                : "units"}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/metrics")
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error(err));
  }, []);

  if (!metrics) {
    return (
      <main className="min-h-screen bg-[#08080C] text-[#E4E4E7] flex flex-col items-center justify-center font-jakarta overflow-hidden relative">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
          .font-jakarta {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }
        `,
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center gap-4 z-10">
          <div className="p-3 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 animate-pulse">
            <svg
              className="w-8 h-8 text-white"
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
          <div className="text-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight">
              Synthesizing Diagnostics...
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium tracking-wide">
              Syncing metrics with active nodes
            </p>
          </div>
        </div>
      </main>
    );
  }

  const retrievalData =
    metrics.retrieval_history?.map((value, index) => ({
      index: index + 1,
      value,
    })) || [];

  const generationData =
    metrics.generation_history?.map((value, index) => ({
      index: index + 1,
      value,
    })) || [];

  const tokenData =
    metrics.token_history?.map((value, index) => ({
      index: index + 1,
      value,
    })) || [];

  const failedData =
    metrics.failed_history?.map((value, index) => ({
      index: index + 1,
      value,
    })) || [];

  const precision =
    metrics.precision_at_5 ?? metrics.precision_at_k ?? metrics.precision;
  const recall = metrics.recall_at_5 ?? metrics.recall_at_k ?? metrics.recall;
  const formatPercent = (value?: number | null) =>
    typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "N/A";
  const formatDecimal = (value?: number | null) =>
    typeof value === "number" ? value.toFixed(3) : "N/A";

  return (
    <main className="min-h-screen bg-[#08080C] text-[#E4E4E7] p-6 md:p-10 font-jakarta overflow-x-hidden relative">
      {/* Font & Global CSS Styles */}
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
      `,
        }}
      />

      {/* Decorative radial glows */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto z-10 relative">
        {/* HEADER PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Telemetry Node 01
              </span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Feed
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
              Metrics Dashboard
            </h1>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 bg-[#12121E] border border-[#202030] text-zinc-300 hover:text-white px-5 py-3 rounded-xl font-semibold text-xs transition duration-200 active:scale-95 shadow-lg shadow-black/10"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back to Chat</span>
          </Link>
        </div>

        {/* METRICS METADATA GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* LATENCIES COLUMN */}
          <div className="space-y-6">
            {/* Retrieval Latency */}
            <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-600/10 transition duration-300" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Retrieval Latency
                </span>
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">
                {metrics.retrieval_latency_ms}{" "}
                <span className="text-base font-semibold text-zinc-500">
                  ms
                </span>
              </h2>
              <p className="text-[10px] text-emerald-400 mt-2 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Optimized Range
              </p>
            </div>

            {/* LLM Latency */}
            <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-violet-600/10 transition duration-300" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  LLM Latency
                </span>
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">
                {metrics.generation_latency_s}{" "}
                <span className="text-base font-semibold text-zinc-500">s</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                Generation pipeline speed
              </p>
            </div>
          </div>

          {/* QUERIES COLUMN */}
          <div className="space-y-6">
            {/* Total Queries */}
            <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-600/10 transition duration-300" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Total Queries
                </span>
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
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
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">
                {metrics.total_queries}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                Accumulated transactions
              </p>
            </div>

            {/* Failed Queries */}
            <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-rose-600/10 transition duration-300" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Failed Queries
                </span>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <h2
                className={`text-4xl font-extrabold tracking-tight ${metrics.failed_queries > 0 ? "text-rose-400" : "text-white"}`}
              >
                {metrics.failed_queries}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                Operations with network failures
              </p>
            </div>
          </div>

          {/* MISSED & TOKEN COLUMN */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-600/10 transition duration-300" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Token Utilization
                </span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
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
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">
                {metrics.token_usage}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-2 mb-6 font-medium">
                Computational load total
              </p>
            </div>

            <div className="border-t border-[#1C1C2A] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-3.5 h-3.5 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Top Missed Queries
                </span>
              </div>

              {metrics.top_missed_queries.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-1">
                  Zero missing indexes
                </p>
              ) : (
                <ul className="space-y-2">
                  {metrics.top_missed_queries.map((query, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 bg-[#12121E]/60 border border-[#1F1F30] p-2 rounded-lg text-xs text-zinc-300 font-medium"
                    >
                      <span className="text-[10px] font-bold text-zinc-500 font-mono mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="truncate">{query}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        {/* RETRIEVAL QUALITY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Precision@5 */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-600/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Precision@5
              </span>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
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
                    d="M9 12.75l2.25 2.25L15.75 9M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              {formatPercent(precision)}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium">
              Retrieved chunks relevance
            </p>
          </div>

          {/* Recall@5 */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-600/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Recall@5
              </span>
              <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
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
                    d="M21 21l-4.35-4.35M11 6a5 5 0 100 10 5 5 0 000-10zm0 2v3l2 2"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              {formatPercent(recall)}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium">
              Relevant chunks discovered
            </p>
          </div>

          {/* MRR */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none group-hover:bg-violet-600/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                MRR
              </span>
              <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
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
                    d="M4 19V5m0 14h16M8 16l3-4 3 2 4-7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              {formatDecimal(metrics.mrr)}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium">
              Mean reciprocal rank
            </p>
          </div>
        </div>

        {/* TELEMETRY CHARTS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Retrieval Trend */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Retrieval Latency Performance (ms)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={retrievalData}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="#161623"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#2e2e42", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  name="latency_ms"
                  dataKey="value"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  activeDot={{
                    r: 6,
                    fill: "#6366F1",
                    stroke: "#08080C",
                    strokeWidth: 2,
                  }}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Generation Trend */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              LLM Generation Speed Trend (s)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={generationData}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="#161623"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#2e2e42", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  name="latency_s"
                  dataKey="value"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  activeDot={{
                    r: 6,
                    fill: "#8B5CF6",
                    stroke: "#08080C",
                    strokeWidth: 2,
                  }}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Token Trend */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Token Consumption Metrics
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={tokenData}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="#161623"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#2e2e42", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  name="tokens"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  activeDot={{
                    r: 6,
                    fill: "#10B981",
                    stroke: "#08080C",
                    strokeWidth: 2,
                  }}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Failed Query Trend */}
          <div className="bg-[#0C0C14]/90 border border-[#1B1B26] rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              Failure Event Distributions
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={failedData}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="#161623"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#52525B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#2e2e42", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  name="failures"
                  dataKey="value"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  activeDot={{
                    r: 6,
                    fill: "#EF4444",
                    stroke: "#08080C",
                    strokeWidth: 2,
                  }}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
