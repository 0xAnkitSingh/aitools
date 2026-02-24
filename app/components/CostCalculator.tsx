"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  MODELS as FALLBACK_MODELS,
  USAGE_PRESETS,
  calculateCost,
  formatCurrency,
  formatTokens,
  type Model,
} from "@/app/lib/models";

interface SavedCalculation {
  id: string;
  name: string;
  modelId: string;
  presetId: string;
  inputTokens: number;
  outputTokens: number;
  requestsPerDay: number;
  daysPerMonth: number;
  monthlyCost: number;
  savedAt: string;
}

type TierFilter = "all" | "high-end" | "mid-range" | "budget";

const TIER_COLORS: Record<string, string> = {
  "high-end": "text-rose-400 bg-rose-500/10 border-rose-500/30",
  "mid-range": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "budget": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

const TIER_LABELS: Record<string, string> = {
  "high-end": "High-End",
  "mid-range": "Mid-Range",
  "budget": "Budget",
};

export default function CostCalculator() {
  const [models, setModels] = useState<Model[]>(FALLBACK_MODELS);
  const [providers, setProviders] = useState<string[]>([...new Set(FALLBACK_MODELS.map((m) => m.provider))]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<string>("hardcoded-fallback");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState<Model>(
    FALLBACK_MODELS.find((m) => m.id === "gpt-3.5-turbo")!
  );
  const [selectedProvider, setSelectedProvider] = useState<string>("OpenAI");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [selectedPreset, setSelectedPreset] = useState(USAGE_PRESETS[0]);
  const [inputTokens, setInputTokens] = useState(USAGE_PRESETS[0].inputTokens);
  const [outputTokens, setOutputTokens] = useState(USAGE_PRESETS[0].outputTokens);
  const [requestsPerDay, setRequestsPerDay] = useState(USAGE_PRESETS[0].requestsPerDay);
  const [daysPerMonth, setDaysPerMonth] = useState(USAGE_PRESETS[0].daysPerMonth);
  const [calcName, setCalcName] = useState("");
  const [savedCalcs, setSavedCalcs] = useState<SavedCalculation[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("llm-saved-calculations");
    if (stored) {
      try { setSavedCalcs(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (data.models?.length > 0) {
          setModels(data.models);
          setProviders(data.providers ?? [...new Set(data.models.map((m: Model) => m.provider))]);
          setLastUpdated(data.lastUpdated);
          setPriceSource(data.source ?? "mongodb");
          const current = data.models.find((m: Model) => m.id === selectedModel.id);
          if (current) setSelectedModel(current);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredModels = useMemo(() => {
    return models.filter(
      (m) =>
        m.provider === selectedProvider &&
        (tierFilter === "all" || m.tier === tierFilter)
    );
  }, [models, selectedProvider, tierFilter]);

  const cost = useMemo(
    () => calculateCost(selectedModel, inputTokens, outputTokens, requestsPerDay, daysPerMonth),
    [selectedModel, inputTokens, outputTokens, requestsPerDay, daysPerMonth]
  );

  const selectPreset = useCallback((preset: typeof USAGE_PRESETS[number]) => {
    setSelectedPreset(preset);
    setInputTokens(preset.inputTokens);
    setOutputTokens(preset.outputTokens);
    setRequestsPerDay(preset.requestsPerDay);
    setDaysPerMonth(preset.daysPerMonth);
  }, []);

  const selectModel = useCallback((model: Model) => {
    setSelectedModel(model);
  }, []);

  const handleSave = useCallback(() => {
    if (!calcName.trim()) return;
    const calc: SavedCalculation = {
      id: Date.now().toString(),
      name: calcName.trim(),
      modelId: selectedModel.id,
      presetId: selectedPreset.id,
      inputTokens,
      outputTokens,
      requestsPerDay,
      daysPerMonth,
      monthlyCost: cost.monthlyCost,
      savedAt: new Date().toISOString(),
    };
    const updated = [...savedCalcs, calc];
    setSavedCalcs(updated);
    localStorage.setItem("llm-saved-calculations", JSON.stringify(updated));
    setCalcName("");
  }, [calcName, selectedModel, selectedPreset, inputTokens, outputTokens, requestsPerDay, daysPerMonth, cost, savedCalcs]);

  const loadCalc = useCallback((calc: SavedCalculation) => {
    const model = models.find((m) => m.id === calc.modelId);
    if (model) {
      setSelectedModel(model);
      setSelectedProvider(model.provider);
    }
    const preset = USAGE_PRESETS.find((p) => p.id === calc.presetId);
    if (preset) setSelectedPreset(preset);
    setInputTokens(calc.inputTokens);
    setOutputTokens(calc.outputTokens);
    setRequestsPerDay(calc.requestsPerDay);
    setDaysPerMonth(calc.daysPerMonth);
    setShowSaved(false);
  }, [models]);

  const handleRefreshPrices = useCallback(async (force?: boolean) => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/models/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: force === true }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRefreshMessage(`Prices refreshed: ${data.modelsUpdated} models updated.`);
        const fetchRes = await fetch("/api/models");
        const fetchData = await fetchRes.json();
        if (fetchData.models?.length > 0) {
          setModels(fetchData.models);
          setProviders(fetchData.providers ?? [...new Set(fetchData.models.map((m: Model) => m.provider))]);
          setLastUpdated(fetchData.lastUpdated ?? data.lastUpdated);
          setPriceSource(fetchData.source ?? "mongodb");
          const current = fetchData.models.find((m: Model) => m.id === selectedModel.id);
          if (current) setSelectedModel(current);
        }
      } else if (data.status === "skipped") {
        setRefreshMessage(data.message ?? "Refresh skipped (recently updated).");
      } else {
        setRefreshMessage(data.message ?? "Refresh failed.");
      }
    } catch {
      setRefreshMessage("Failed to refresh prices.");
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedModel.id]);

  const deleteCalc = useCallback((id: string) => {
    const updated = savedCalcs.filter((c) => c.id !== id);
    setSavedCalcs(updated);
    localStorage.setItem("llm-saved-calculations", JSON.stringify(updated));
  }, [savedCalcs]);

  const avgPrice = (m: Model) => ((m.inputPrice + m.outputPrice) / 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            Token-Level Precision
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
              Advanced LLM Cost Calculator
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400 sm:text-xl">
            Estimate your monthly costs based on your specific usage patterns
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Pricing Status Banner */}
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-3 w-3 rounded-full flex-shrink-0 ${
                  priceSource === "hardcoded-fallback" ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <div>
                <p className="text-sm text-white">
                  {lastUpdated
                    ? `Prices updated ${new Date(lastUpdated).toLocaleDateString()}`
                    : "Using fallback pricing data"}
                </p>
                <p className="text-xs text-slate-500">{models.length} models</p>
              </div>
            </div>
            <button
              onClick={() => handleRefreshPrices(true)}
              disabled={isRefreshing}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? "Refreshing…" : "Refresh Prices"}
            </button>
          </div>
          {refreshMessage && (
            <p className="mt-3 text-sm text-slate-400 border-t border-slate-700/50 pt-3">
              {refreshMessage}
            </p>
          )}
        </div>

        {/* Selected Model Banner */}
        <div className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Selected Model</p>
              <h2 className="text-xl font-bold text-white">{selectedModel.name}</h2>
              <p className="text-sm text-slate-400">{selectedModel.provider}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Input</p>
              <p className="text-lg font-bold text-violet-300 font-mono">${selectedModel.inputPrice.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Output</p>
              <p className="text-lg font-bold text-violet-300 font-mono">${selectedModel.outputPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Usage Configuration */}
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Usage Configuration</h2>
              <p className="text-sm text-slate-400 mb-5">Define your usage pattern and requirements</p>

              {/* Presets */}
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Usage Pattern Preset</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {USAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => selectPreset(preset)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        selectedPreset.id === preset.id
                          ? "border-violet-500/60 bg-violet-500/10"
                          : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600"
                      }`}
                    >
                      <p className="font-medium text-sm text-white">{preset.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                        <span>Input: {preset.inputTokens.toLocaleString()} tokens</span>
                        <span>Output: {preset.outputTokens.toLocaleString()} tokens</span>
                        <span>Requests: {preset.requestsPerDay.toLocaleString()}/day</span>
                        <span>Days: {preset.daysPerMonth}/month</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid gap-5 sm:grid-cols-2">
                <NumberInput label="Input Tokens Per Request" value={inputTokens} onChange={setInputTokens} min={1} max={128000} suffix="tokens" />
                <NumberInput label="Output Tokens Per Request" value={outputTokens} onChange={setOutputTokens} min={1} max={128000} suffix="tokens" />
                <NumberInput label="Requests Per Day" value={requestsPerDay} onChange={setRequestsPerDay} min={1} max={1000000} />
                <NumberInput label="Days Per Month" value={daysPerMonth} onChange={setDaysPerMonth} min={1} max={31} />
              </div>

              {/* Tips */}
              <div className="mt-5 rounded-xl bg-slate-900/50 border border-slate-700/30 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Usage Tips</p>
                <ul className="space-y-1 text-xs text-slate-500">
                  <li>Input tokens are counted for each request sent to the model</li>
                  <li>Output tokens are generated by the model in response</li>
                  <li>Consider batching requests to optimize costs</li>
                  <li>Adjust days per month based on your service schedule</li>
                </ul>
              </div>
            </section>

            {/* Model Selection */}
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Model Selection</h2>
              <p className="text-sm text-slate-400 mb-5">Choose the best model for your use case</p>

              {/* Tier filter */}
              <div className="flex gap-2 mb-4">
                {(["all", "high-end", "mid-range", "budget"] as TierFilter[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      tierFilter === tier
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {tier === "all" ? "All" : TIER_LABELS[tier]}
                  </button>
                ))}
              </div>

              {/* Currently selected */}
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Currently Selected:</p>
                  <p className="font-semibold text-white">{selectedModel.name}</p>
                  <p className="text-xs text-slate-400">{selectedModel.provider}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Input: ${selectedModel.inputPrice.toFixed(2)}/M tokens</p>
                  <p>Output: ${selectedModel.outputPrice.toFixed(2)}/M tokens</p>
                </div>
              </div>

              {/* Provider tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {providers.map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedProvider === provider
                        ? "bg-slate-700 text-white ring-1 ring-violet-500/50"
                        : "bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>

              {/* Models grid */}
              <div className="grid gap-2">
                {filteredModels.length === 0 && (
                  <p className="text-sm text-slate-500 py-4 text-center">No models match the current filter.</p>
                )}
                {filteredModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => selectModel(model)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      selectedModel.id === model.id
                        ? "border-violet-500/60 bg-violet-500/10"
                        : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">{model.name}</p>
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[model.tier]}`}>
                            {TIER_LABELS[model.tier]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ${avgPrice(model).toFixed(2)}/M tokens
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-400 shrink-0">
                        <p>Input: ${model.inputPrice.toFixed(2)}</p>
                        <p>Output: ${model.outputPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Model tips */}
              <div className="mt-5 rounded-xl bg-slate-900/50 border border-slate-700/30 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Model Selection Tips</p>
                <ul className="space-y-1 text-xs text-slate-500">
                  <li>High-end models offer the best performance but cost significantly more</li>
                  <li>Mid-range models provide a good balance of cost and performance</li>
                  <li>Budget models are great for high-volume, simpler tasks</li>
                  <li>Consider your token usage patterns when selecting a model</li>
                </ul>
              </div>
            </section>

            {/* Save Calculation */}
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Save Calculation</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={calcName}
                  onChange={(e) => setCalcName(e.target.value)}
                  placeholder="e.g., Customer Support Bot - March 2025"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleSave}
                  disabled={!calcName.trim()}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>

              <button
                onClick={() => setShowSaved(!showSaved)}
                className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                {showSaved ? "Hide" : "Show"} Saved Calculations ({savedCalcs.length})
              </button>

              {showSaved && savedCalcs.length > 0 && (
                <div className="mt-3 space-y-2">
                  {savedCalcs.map((calc) => (
                    <div
                      key={calc.id}
                      className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/30 p-3"
                    >
                      <div className="cursor-pointer min-w-0" onClick={() => loadCalc(calc)}>
                        <p className="font-medium text-sm text-white truncate">{calc.name}</p>
                        <p className="text-xs text-slate-500">
                          {models.find((m) => m.id === calc.modelId)?.name ?? calc.modelId} &middot; {formatCurrency(calc.monthlyCost)}/mo
                        </p>
                      </div>
                      <button
                        onClick={() => deleteCalc(calc.id)}
                        className="shrink-0 ml-3 text-slate-600 hover:text-rose-400 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showSaved && savedCalcs.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">No saved calculations yet.</p>
              )}
            </section>
          </div>

          {/* Right Column - Cost Estimate */}
          <div className="space-y-6 lg:sticky lg:top-16 lg:self-start">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">Cost Estimate</h2>
              <p className="text-xs text-slate-500 mb-6">Based on your current configuration</p>

              {/* Monthly */}
              <div className="rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 p-5 mb-4">
                <p className="text-xs text-violet-300 uppercase tracking-wider mb-1">Monthly Cost</p>
                <p className="text-4xl font-bold text-white font-mono">{formatCurrency(cost.monthlyCost)}</p>
                <div className="flex gap-3 mt-2 text-xs text-slate-400">
                  <span>{formatTokens(cost.totalTokens)} tokens</span>
                  <span>{cost.totalRequests.toLocaleString()} requests</span>
                </div>
              </div>

              {/* Daily & Yearly */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl bg-slate-900/50 border border-slate-700/30 p-4">
                  <p className="text-xs text-slate-500 mb-1">Daily Average</p>
                  <p className="text-xl font-bold text-white font-mono">{formatCurrency(cost.dailyCost)}</p>
                  <p className="text-xs text-slate-500 mt-1">{requestsPerDay.toLocaleString()} requests/day</p>
                </div>
                <div className="rounded-xl bg-slate-900/50 border border-slate-700/30 p-4">
                  <p className="text-xs text-slate-500 mb-1">Yearly Projection</p>
                  <p className="text-xl font-bold text-white font-mono">{formatCurrency(cost.yearlyCost)}</p>
                  <p className="text-xs text-slate-500 mt-1">Based on monthly usage</p>
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Monthly Usage Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Input Tokens:</span>
                    <span className="text-white font-mono">
                      {formatTokens(cost.totalInputTokens)}{" "}
                      <span className="text-violet-300">({formatCurrency(cost.inputCost)})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Output Tokens:</span>
                    <span className="text-white font-mono">
                      {formatTokens(cost.totalOutputTokens)}{" "}
                      <span className="text-violet-300">({formatCurrency(cost.outputCost)})</span>
                    </span>
                  </div>
                  <div className="border-t border-slate-700/50 pt-2 flex justify-between">
                    <span className="text-slate-400">Total Tokens:</span>
                    <span className="text-white font-mono">{formatTokens(cost.totalTokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Requests:</span>
                    <span className="text-white font-mono">{cost.totalRequests.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Cost Distribution Bar */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Monthly Cost Distribution</p>
                <div className="h-4 w-full rounded-full overflow-hidden bg-slate-900 flex">
                  <div
                    className="bg-violet-500 transition-all duration-500"
                    style={{ width: `${cost.inputPercentage}%` }}
                  />
                  <div
                    className="bg-indigo-400 transition-all duration-500"
                    style={{ width: `${cost.outputPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
                    <span className="text-slate-400">Input: {cost.inputPercentage.toFixed(1)}%</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-slate-400">Output: {cost.outputPercentage.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Compare */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Compare (same usage)</p>
              <div className="space-y-2">
                {models
                  .filter((m) => m.id !== selectedModel.id)
                  .sort((a, b) => {
                    const ca = calculateCost(a, inputTokens, outputTokens, requestsPerDay, daysPerMonth).monthlyCost;
                    const cb = calculateCost(b, inputTokens, outputTokens, requestsPerDay, daysPerMonth).monthlyCost;
                    return ca - cb;
                  })
                  .slice(0, 5)
                  .map((m) => {
                    const c = calculateCost(m, inputTokens, outputTokens, requestsPerDay, daysPerMonth);
                    const diff = c.monthlyCost - cost.monthlyCost;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          selectModel(m);
                          setSelectedProvider(m.provider);
                        }}
                        className="w-full text-left flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-900/30 p-3 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.provider}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-mono text-white">{formatCurrency(c.monthlyCost)}</p>
                          <p className={`text-xs font-mono ${diff < 0 ? "text-emerald-400" : diff > 0 ? "text-rose-400" : "text-slate-500"}`}>
                            {diff < 0 ? "" : "+"}{formatCurrency(diff)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          min={min}
          max={max}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="text-xs text-slate-500 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}
