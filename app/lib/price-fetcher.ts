import type { Model } from "./models";

const LITELLM_PRICING_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

interface LiteLLMEntry {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  litellm_provider?: string;
  mode?: string;
  max_tokens?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
}

const PROVIDER_MAP: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  vertex_ai: "Google",
  gemini: "Google",
  "vertex_ai-language-models": "Google",
  deepseek: "DeepSeek",
  xai: "xAI",
  cohere: "Cohere",
  cohere_chat: "Cohere",
};

const MODEL_NAME_OVERRIDES: Record<string, string> = {
  "gpt-4.1": "GPT-4.1",
  "gpt-4.1-mini": "GPT-4.1 Mini",
  "gpt-4.1-nano": "GPT-4.1 Nano",
  "gpt-4.5-preview": "GPT-4.5 Preview",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "gpt-4-turbo": "GPT-4 Turbo",
  "gpt-4": "GPT-4",
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "o1": "o1",
  "o1-mini": "o1-mini",
  "o3-mini": "o3-mini",
  "o3": "o3",
  "o4-mini": "o4-mini",
  "claude-opus-4-0": "Claude Opus 4",
  "claude-sonnet-4-0": "Claude Sonnet 4",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
  "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
  "claude-3-opus-20240229": "Claude 3 Opus",
  "claude-3-haiku-20240307": "Claude 3 Haiku",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
  "deepseek-chat": "DeepSeek Chat (V3)",
  "deepseek-reasoner": "DeepSeek Reasoner (R1)",
  "grok-3": "Grok 3",
  "grok-3-mini": "Grok 3 Mini",
  "grok-2": "Grok 2",
  "command-r-plus": "Command R+",
  "command-r": "Command R",
  "command-light": "Command Light",
};

const TARGET_MODELS: Record<string, string[]> = {
  OpenAI: [
    "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
    "gpt-4.5-preview", "gpt-4o", "gpt-4o-mini",
    "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo",
    "o1", "o1-mini", "o3-mini", "o3", "o4-mini",
  ],
  Anthropic: [
    "claude-opus-4-0", "claude-sonnet-4-0",
    "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229", "claude-3-haiku-20240307",
  ],
  Google: [
    "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash",
    "gemini-1.5-pro", "gemini-1.5-flash",
  ],
  DeepSeek: ["deepseek-chat", "deepseek-reasoner"],
  xAI: ["grok-3", "grok-3-mini", "grok-2"],
  Cohere: ["command-r-plus", "command-r", "command-light"],
};

function classifyTier(inputPrice: number, outputPrice: number): Model["tier"] {
  const avg = (inputPrice + outputPrice) / 2;
  if (avg >= 10) return "high-end";
  if (avg >= 1) return "mid-range";
  return "budget";
}

function toDisplayName(rawKey: string): string {
  const base = rawKey.replace(/^(openai\/|anthropic\/|gemini\/|vertex_ai\/|deepseek\/|xai\/|cohere\/|cohere_chat\/)/, "");
  if (MODEL_NAME_OVERRIDES[base]) return MODEL_NAME_OVERRIDES[base];
  return base
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchLatestPricing(): Promise<{
  models: Model[];
  fetchedAt: string;
  source: string;
}> {
  const res = await fetch(LITELLM_PRICING_URL, {
    next: { revalidate: 0 },
    headers: { "User-Agent": "AITextCleaner-PriceFetcher/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pricing data: ${res.status} ${res.statusText}`);
  }

  const data: Record<string, LiteLLMEntry> = await res.json();
  const models: Model[] = [];
  const seen = new Set<string>();

  for (const [provider, targetIds] of Object.entries(TARGET_MODELS)) {
    for (const targetId of targetIds) {
      if (seen.has(targetId)) continue;

      const possibleKeys = buildPossibleKeys(targetId, provider);
      let entry: LiteLLMEntry | undefined;
      let matchedKey = "";

      for (const key of possibleKeys) {
        if (data[key] && data[key].input_cost_per_token != null) {
          entry = data[key];
          matchedKey = key;
          break;
        }
      }

      if (!entry || entry.input_cost_per_token == null || entry.output_cost_per_token == null) {
        continue;
      }

      const inputPrice = entry.input_cost_per_token * 1_000_000;
      const outputPrice = entry.output_cost_per_token * 1_000_000;

      seen.add(targetId);
      models.push({
        id: targetId,
        name: toDisplayName(matchedKey || targetId),
        provider,
        inputPrice: Math.round(inputPrice * 1000) / 1000,
        outputPrice: Math.round(outputPrice * 1000) / 1000,
        tier: classifyTier(inputPrice, outputPrice),
      });
    }
  }

  return {
    models,
    fetchedAt: new Date().toISOString(),
    source: "litellm/model_prices_and_context_window.json",
  };
}

function buildPossibleKeys(modelId: string, provider: string): string[] {
  const prefixMap: Record<string, string[]> = {
    OpenAI: ["openai/", ""],
    Anthropic: ["anthropic/", ""],
    Google: ["gemini/", "vertex_ai/", ""],
    DeepSeek: ["deepseek/", ""],
    xAI: ["xai/", ""],
    Cohere: ["cohere_chat/", "cohere/", ""],
  };
  const prefixes = prefixMap[provider] || [""];
  return prefixes.map((p) => `${p}${modelId}`);
}
