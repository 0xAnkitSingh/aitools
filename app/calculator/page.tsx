import type { Metadata } from "next";
import CostCalculator from "@/app/components/CostCalculator";

export const metadata: Metadata = {
  title: "LLM Cost Calculator - Estimate Monthly AI Model Costs",
  description:
    "Calculate and compare costs for GPT-4, Claude, Gemini, and more. Estimate monthly spending based on your token usage and request volume.",
};

export default function CalculatorPage() {
  return <CostCalculator />;
}
