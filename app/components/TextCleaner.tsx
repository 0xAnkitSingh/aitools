"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  cleanText,
  DEFAULT_OPTIONS,
  type CleaningOptions,
  type CleaningStats,
} from "@/app/lib/cleaner";

const OPTION_LABELS: { key: keyof CleaningOptions; label: string; description: string }[] = [
  { key: "removeHiddenChars", label: "Remove hidden characters", description: "Zero-width spaces, soft hyphens, and other invisible Unicode characters" },
  { key: "convertNonBreakingSpaces", label: "Convert non-breaking spaces", description: "Replace \u00A0 with regular spaces" },
  { key: "normalizeDashes", label: "Normalize dashes", description: "Convert em-dashes and en-dashes to standard hyphens" },
  { key: "normalizeQuotes", label: "Normalize quotes", description: "Convert curly/smart quotes to straight quotes" },
  { key: "convertEllipsis", label: "Convert ellipsis", description: "Replace \u2026 character with three dots" },
  { key: "removeTrailingWhitespace", label: "Remove trailing whitespace", description: "Strip spaces and tabs at line endings" },
  { key: "removeAsterisks", label: "Remove asterisks (*)", description: "Remove all asterisk characters from text" },
  { key: "removeMarkdownHeadings", label: "Remove markdown headings", description: "Strip # heading syntax from line beginnings" },
];

const STAT_LABELS: { key: keyof Omit<CleaningStats, "totalCleaned">; label: string; icon: string }[] = [
  { key: "hiddenChars", label: "Hidden Characters", icon: "\u{1F47B}" },
  { key: "nonBreakingSpaces", label: "Non-breaking Spaces", icon: "\u23B5" },
  { key: "dashesNormalized", label: "Dashes Normalized", icon: "\u2014" },
  { key: "quotesNormalized", label: "Quotes Normalized", icon: "\u275D" },
  { key: "ellipsesConverted", label: "Ellipses Converted", icon: "\u2026" },
  { key: "trailingWhitespace", label: "Trailing Whitespace", icon: "\u2327" },
  { key: "asterisksRemoved", label: "Asterisks Removed", icon: "\u2731" },
  { key: "markdownHeadings", label: "Markdown Headings", icon: "#" },
];

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    if (start === end) return;

    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevValue.current = end;
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

export default function TextCleaner() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [options, setOptions] = useState<CleaningOptions>(DEFAULT_OPTIONS);
  const [stats, setStats] = useState<CleaningStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [globalStats, setGlobalStats] = useState<CleaningStats>({
    hiddenChars: 0,
    nonBreakingSpaces: 0,
    dashesNormalized: 0,
    quotesNormalized: 0,
    ellipsesConverted: 0,
    trailingWhitespace: 0,
    asterisksRemoved: 0,
    markdownHeadings: 0,
    totalCleaned: 0,
  });

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setGlobalStats(data);
      })
      .catch(() => {});
  }, []);

  const toggleOption = useCallback((key: keyof CleaningOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const handleClean = useCallback(async () => {
    if (!input.trim()) return;
    const result = cleanText(input, options);
    setOutput(result.cleaned);
    setStats(result.stats);

    if (result.stats.totalCleaned > 0) {
      try {
        const res = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.stats),
        });
        const updated = await res.json();
        if (!updated.error) setGlobalStats(updated);
      } catch {
        setGlobalStats((prev) => ({
          hiddenChars: prev.hiddenChars + result.stats.hiddenChars,
          nonBreakingSpaces: prev.nonBreakingSpaces + result.stats.nonBreakingSpaces,
          dashesNormalized: prev.dashesNormalized + result.stats.dashesNormalized,
          quotesNormalized: prev.quotesNormalized + result.stats.quotesNormalized,
          ellipsesConverted: prev.ellipsesConverted + result.stats.ellipsesConverted,
          trailingWhitespace: prev.trailingWhitespace + result.stats.trailingWhitespace,
          asterisksRemoved: prev.asterisksRemoved + result.stats.asterisksRemoved,
          markdownHeadings: prev.markdownHeadings + result.stats.markdownHeadings,
          totalCleaned: prev.totalCleaned + result.stats.totalCleaned,
        }));
      }
    }
  }, [input, options]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setStats(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-10 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Text Cleaning
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              AI Text Cleaner
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400 sm:text-xl">
            Instantly clean &amp; standardize your AI text. Remove invisible characters, weird spacing, and formatting quirks from ChatGPT or LLM outputs.
          </p>
        </div>
      </header>

      {/* Main tool */}
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left column - text areas */}
          <div className="space-y-6">
            {/* Input */}
            <div className="group rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm transition-colors focus-within:border-indigo-500/50">
              <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Input Text</h2>
                <span className="text-xs text-slate-500">{input.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste or type your AI-generated text here..."
                className="w-full min-h-[200px] resize-y bg-transparent px-5 py-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none font-mono leading-relaxed"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClean}
                disabled={!input.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clipRule="evenodd" />
                </svg>
                Clean Text
              </button>
              <button
                onClick={handleCopy}
                disabled={!output}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-400">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                      <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={!input && !output}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-transparent px-5 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022 1.005 11.36A2.75 2.75 0 0 0 7.76 20h4.48a2.75 2.75 0 0 0 2.742-2.53l1.005-11.36.149.022a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                </svg>
                Clear
              </button>
            </div>

            {/* Inline stats banner */}
            {stats && stats.totalCleaned > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-400 shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-emerald-300">
                  Cleaned <span className="font-bold text-emerald-200">{stats.totalCleaned.toLocaleString()}</span> issue{stats.totalCleaned !== 1 ? "s" : ""} in your text
                </p>
              </div>
            )}
            {stats && stats.totalCleaned === 0 && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-blue-400 shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-300">Your text is already clean - no issues found!</p>
              </div>
            )}

            {/* Output */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Cleaned Text</h2>
                <span className="text-xs text-slate-500">{output.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={output}
                readOnly
                placeholder="Cleaned text will appear here..."
                className="w-full min-h-[200px] resize-y bg-transparent px-5 py-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Right column - options */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Cleaning Options</h2>
                <button
                  onClick={resetOptions}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Reset All
                </button>
              </div>
              <div className="space-y-1">
                {OPTION_LABELS.map(({ key, label, description }) => (
                  <label
                    key={key}
                    className="group flex items-start gap-3 rounded-lg p-2.5 cursor-pointer transition-colors hover:bg-slate-700/30"
                    title={description}
                  >
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={options[key]}
                        onChange={() => toggleOption(key)}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-5 rounded-md border-2 border-slate-600 bg-slate-900/50 transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-600" />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="absolute top-0.5 left-0.5 h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors leading-snug">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Per-clean stats */}
            {stats && stats.totalCleaned > 0 && (
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">This Clean</h2>
                <div className="space-y-2">
                  {STAT_LABELS.map(({ key, label, icon }) => {
                    const val = stats[key];
                    if (val === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-400">
                          <span className="w-5 text-center text-xs">{icon}</span>
                          {label}
                        </span>
                        <span className="font-mono text-indigo-300">{val.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Why use section */}
        <section className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
                Why Use AI Text Cleaner?
              </span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-400 text-lg">
              AI-generated text often contains invisible characters and formatting quirks that can cause issues when copied into other applications. These hidden artifacts can lead to unexpected behavior, formatting problems, and even errors in code. It can also lead to text being flagged as AI generated.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-10">
            <span className="bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {OPTION_LABELS.map(({ key, label, description }, i) => (
              <div
                key={key}
                className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 transition-all hover:border-indigo-500/30 hover:bg-slate-800/60"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{label}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who is this for */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-10">
            <span className="bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
              Who Is This For?
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Developers", desc: "Clean code snippets from AI assistants before using them in your projects." },
              { title: "Writers & Editors", desc: "Ensure text is free from hidden formatting before pasting into documents or CMSs." },
              { title: "Content Creators", desc: "Avoid formatting issues when moving text between different platforms." },
              { title: "Anyone using AI tools", desc: "Get cleaner, more reliable text from ChatGPT, Claude, or other LLMs." },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 transition-all hover:border-emerald-500/30 hover:bg-slate-800/60"
              >
                <div className="mt-0.5 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Global stats */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-2">
            <span className="bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
              Global Cleaning Statistics
            </span>
          </h2>
          <p className="text-slate-500 text-center mb-10 text-sm">Total characters cleaned across all sessions</p>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Characters Cleaned</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-mono">
                <AnimatedCounter value={globalStats.totalCleaned} />
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STAT_LABELS.map(({ key, label, icon }) => (
                <div key={key} className="text-center rounded-xl bg-slate-900/50 p-4">
                  <div className="text-lg mb-1">{icon}</div>
                  <p className="text-lg font-bold text-white font-mono">
                    <AnimatedCounter value={globalStats[key]} />
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 border-t border-slate-800 pt-8 pb-4 text-center">
          <p className="text-sm text-slate-500">
            Also useful for: <span className="text-slate-400">ChatGPT Text Cleaner</span> and <span className="text-slate-400">AI Cleaner</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
