/**
 * Simple token estimator based on character count.
 * ~4 characters per token for English text (GPT tokenizer approximation).
 */

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateTokensForLines(lines: string[]): number {
  return estimateTokens(lines.join("\n"));
}

export interface TokenBudget {
  total: number;
  systemPrompt: number;
  outputReserve: number;
  available: number;
  used: number;
}

export function createBudget(total: number): TokenBudget {
  const systemPrompt = 500;
  const outputReserve = 2000;
  return {
    total,
    systemPrompt,
    outputReserve,
    available: total - systemPrompt - outputReserve,
    used: 0,
  };
}

export function consumeBudget(budget: TokenBudget, tokens: number): boolean {
  if (budget.used + tokens > budget.available) {
    return false;
  }
  budget.used += tokens;
  return true;
}

export function remainingBudget(budget: TokenBudget): number {
  return budget.available - budget.used;
}
