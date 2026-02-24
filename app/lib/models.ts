export interface Model {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;  // per 1M tokens
  outputPrice: number; // per 1M tokens
  tier: "high-end" | "mid-range" | "budget";
}

export interface UsagePreset {
  id: string;
  name: string;
  description: string;
  inputTokens: number;
  outputTokens: number;
  requestsPerDay: number;
  daysPerMonth: number;
}

export const PROVIDERS = ["OpenAI", "Anthropic", "Google", "DeepSeek", "xAI", "Cohere"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const MODELS: Model[] = [
  // OpenAI
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", inputPrice: 2.00, outputPrice: 8.00, tier: "mid-range" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", inputPrice: 0.40, outputPrice: 1.60, tier: "budget" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "OpenAI", inputPrice: 0.10, outputPrice: 0.40, tier: "budget" },
  { id: "gpt-4.5-preview", name: "GPT-4.5 Preview", provider: "OpenAI", inputPrice: 75.00, outputPrice: 75.00, tier: "high-end" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", inputPrice: 2.50, outputPrice: 10.00, tier: "mid-range" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", inputPrice: 0.15, outputPrice: 0.60, tier: "budget" },
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI", inputPrice: 30.00, outputPrice: 60.00, tier: "high-end" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", inputPrice: 0.50, outputPrice: 1.50, tier: "budget" },
  { id: "o1", name: "o1", provider: "OpenAI", inputPrice: 15.00, outputPrice: 60.00, tier: "high-end" },
  { id: "o3-mini", name: "o3-mini", provider: "OpenAI", inputPrice: 1.10, outputPrice: 4.40, tier: "mid-range" },
  { id: "o1-mini", name: "o1-mini", provider: "OpenAI", inputPrice: 1.10, outputPrice: 4.40, tier: "mid-range" },

  // Anthropic
  { id: "claude-4-opus", name: "Claude 4 Opus", provider: "Anthropic", inputPrice: 15.00, outputPrice: 75.00, tier: "high-end" },
  { id: "claude-4-sonnet", name: "Claude 4 Sonnet", provider: "Anthropic", inputPrice: 3.00, outputPrice: 15.00, tier: "mid-range" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", inputPrice: 3.00, outputPrice: 15.00, tier: "mid-range" },
  { id: "claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", inputPrice: 0.80, outputPrice: 4.00, tier: "budget" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", inputPrice: 15.00, outputPrice: 75.00, tier: "high-end" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", inputPrice: 0.25, outputPrice: 1.25, tier: "budget" },

  // Google
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", inputPrice: 1.25, outputPrice: 10.00, tier: "mid-range" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", inputPrice: 0.15, outputPrice: 0.60, tier: "budget" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", inputPrice: 0.10, outputPrice: 0.40, tier: "budget" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", inputPrice: 1.25, outputPrice: 5.00, tier: "mid-range" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", inputPrice: 0.075, outputPrice: 0.30, tier: "budget" },

  // DeepSeek
  { id: "deepseek-chat", name: "DeepSeek Chat (V3)", provider: "DeepSeek", inputPrice: 0.27, outputPrice: 1.10, tier: "budget" },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)", provider: "DeepSeek", inputPrice: 0.55, outputPrice: 2.19, tier: "mid-range" },

  // xAI
  { id: "grok-3", name: "Grok 3", provider: "xAI", inputPrice: 3.00, outputPrice: 15.00, tier: "mid-range" },
  { id: "grok-3-mini", name: "Grok 3 Mini", provider: "xAI", inputPrice: 0.30, outputPrice: 0.50, tier: "budget" },
  { id: "grok-2", name: "Grok 2", provider: "xAI", inputPrice: 2.00, outputPrice: 10.00, tier: "mid-range" },

  // Cohere
  { id: "command-r-plus", name: "Command R+", provider: "Cohere", inputPrice: 2.50, outputPrice: 10.00, tier: "mid-range" },
  { id: "command-r", name: "Command R", provider: "Cohere", inputPrice: 0.15, outputPrice: 0.60, tier: "budget" },
  { id: "command-light", name: "Command Light", provider: "Cohere", inputPrice: 0.30, outputPrice: 0.60, tier: "budget" },
];

export const USAGE_PRESETS: UsagePreset[] = [
  {
    id: "customer-support",
    name: "Customer Support Chatbot",
    description: "Moderate input/output with high request volume",
    inputTokens: 400,
    outputTokens: 200,
    requestsPerDay: 1000,
    daysPerMonth: 30,
  },
  {
    id: "content-generation",
    name: "Content Generation",
    description: "Low input with high output and moderate request volume",
    inputTokens: 300,
    outputTokens: 1000,
    requestsPerDay: 100,
    daysPerMonth: 30,
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    description: "High input with moderate output and low request volume",
    inputTokens: 3000,
    outputTokens: 500,
    requestsPerDay: 50,
    daysPerMonth: 30,
  },
  {
    id: "document-summarization",
    name: "Document Summarization",
    description: "Very high input with moderate output and low request volume",
    inputTokens: 10000,
    outputTokens: 800,
    requestsPerDay: 20,
    daysPerMonth: 30,
  },
  {
    id: "custom",
    name: "Custom Usage",
    description: "Define your own usage pattern",
    inputTokens: 500,
    outputTokens: 300,
    requestsPerDay: 100,
    daysPerMonth: 30,
  },
];

export function calculateCost(
  model: Model,
  inputTokens: number,
  outputTokens: number,
  requestsPerDay: number,
  daysPerMonth: number
) {
  const totalRequests = requestsPerDay * daysPerMonth;
  const totalInputTokens = inputTokens * totalRequests;
  const totalOutputTokens = outputTokens * totalRequests;
  const totalTokens = totalInputTokens + totalOutputTokens;

  const inputCost = (totalInputTokens / 1_000_000) * model.inputPrice;
  const outputCost = (totalOutputTokens / 1_000_000) * model.outputPrice;
  const monthlyCost = inputCost + outputCost;
  const dailyCost = monthlyCost / daysPerMonth;
  const yearlyCost = monthlyCost * 12;

  const inputPercentage = monthlyCost > 0 ? (inputCost / monthlyCost) * 100 : 0;
  const outputPercentage = monthlyCost > 0 ? (outputCost / monthlyCost) * 100 : 0;

  return {
    monthlyCost,
    dailyCost,
    yearlyCost,
    inputCost,
    outputCost,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    totalRequests,
    inputPercentage,
    outputPercentage,
  };
}

export function formatCurrency(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

export function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}
