import {
  MODEL_CONFIGS,
  DEFAULT_SECTION_PROPORTIONS,
  BudgetAllocationStrategy,
} from '@agenttailor/shared';
import type { TokenBudget, ModelConfig } from '@agenttailor/shared';

const PLATFORM_TO_MODEL: Record<string, string> = {
  chatgpt: 'gpt-4o',
  claude: 'claude-sonnet',
};

function resolveModelConfig(targetPlatform: string, model?: string): ModelConfig {
  const modelId = model ?? PLATFORM_TO_MODEL[targetPlatform.toLowerCase()] ?? 'gpt-4o';
  return MODEL_CONFIGS[modelId] ?? (MODEL_CONFIGS['gpt-4o'] as ModelConfig);
}

/**
 * Create a fresh TokenBudget for the given platform/model.
 * Allocates sections using DEFAULT_SECTION_PROPORTIONS.
 */
export function createBudget(targetPlatform: string, model?: string): TokenBudget {
  const config = resolveModelConfig(targetPlatform, model);
  const totalAvailable =
    config.maxContextTokens - config.reservedForResponse - config.reservedForConversation;

  const allocations: Record<string, number> = {};
  const used: Record<string, number> = {};

  for (const [section, proportion] of Object.entries(DEFAULT_SECTION_PROPORTIONS)) {
    allocations[section] = Math.floor(totalAvailable * proportion);
    used[section] = 0;
  }

  return {
    totalAvailable,
    allocations,
    used,
    remaining: totalAvailable,
  };
}

/**
 * Custom allocation of totalTokens across sections.
 * PROPORTIONAL: multiply totalTokens by each section's weight.
 * PRIORITY: allocate in order of weight descending, giving each section its requested proportion
 * or whatever is left, whichever is smaller.
 */
export function allocateBudget(
  totalTokens: number,
  sections: Record<string, number>,
  strategy: BudgetAllocationStrategy,
): Record<string, number> {
  const result: Record<string, number> = {};
  const entries = Object.entries(sections);

  if (strategy === 'PROPORTIONAL') {
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [section, weight] of entries) {
      result[section] = totalWeight > 0 ? Math.floor(totalTokens * (weight / totalWeight)) : 0;
    }
  } else {
    // PRIORITY: sort descending by weight, fill greedily
    const sorted = [...entries].sort(([, a], [, b]) => b - a);
    const totalWeight = sorted.reduce((sum, [, w]) => sum + w, 0);
    let remaining = totalTokens;

    for (const [section, weight] of sorted) {
      const requested =
        totalWeight > 0 ? Math.floor(totalTokens * (weight / totalWeight)) : 0;
      const granted = Math.min(requested, remaining);
      result[section] = granted;
      remaining -= granted;
    }
  }

  return result;
}

/**
 * Track token usage for a section. Returns a new TokenBudget (immutable).
 */
export function trackUsage(budget: TokenBudget, section: string, tokenCount: number): TokenBudget {
  const newUsed = { ...budget.used, [section]: (budget.used[section] ?? 0) + tokenCount };
  const totalUsed = Object.values(newUsed).reduce((sum, v) => sum + v, 0);

  return {
    ...budget,
    used: newUsed,
    remaining: budget.totalAvailable - totalUsed,
  };
}

/**
 * Returns true if every section's usage is within its allocated limit.
 */
export function isWithinBudget(budget: TokenBudget): boolean {
  for (const [section, usedTokens] of Object.entries(budget.used)) {
    const allocated = budget.allocations[section] ?? 0;
    if (usedTokens > allocated) return false;
  }
  return true;
}

/**
 * Redistribute tokens from under-used sections to over-budget ones, proportionally.
 * Returns a new TokenBudget with updated allocations (immutable).
 */
export function rebalance(budget: TokenBudget): TokenBudget {
  const sections = Object.keys(budget.allocations);

  // Identify surplus (under-used) and deficit (over-budget) sections
  let totalSurplus = 0;
  const deficits: Record<string, number> = {};

  for (const section of sections) {
    const allocated = budget.allocations[section] ?? 0;
    const used = budget.used[section] ?? 0;
    const slack = allocated - used;
    if (slack > 0) {
      totalSurplus += slack;
    } else if (slack < 0) {
      deficits[section] = -slack; // amount over budget
    }
  }

  if (Object.keys(deficits).length === 0 || totalSurplus === 0) {
    return { ...budget };
  }

  const totalDeficit = Object.values(deficits).reduce((sum, v) => sum + v, 0);
  const newAllocations = { ...budget.allocations };

  // Reduce under-used sections proportionally to cover deficit
  const transferable = Math.min(totalSurplus, totalDeficit);

  for (const section of sections) {
    const allocated = budget.allocations[section] ?? 0;
    const used = budget.used[section] ?? 0;
    const slack = allocated - used;
    if (slack > 0 && totalSurplus > 0) {
      const contribution = Math.floor((slack / totalSurplus) * transferable);
      newAllocations[section] = allocated - contribution;
    }
  }

  // Distribute gained tokens to over-budget sections proportionally
  for (const [section, deficit] of Object.entries(deficits)) {
    const share = Math.floor((deficit / totalDeficit) * transferable);
    newAllocations[section] = (newAllocations[section] ?? 0) + share;
  }

  return {
    ...budget,
    allocations: newAllocations,
  };
}

/**
 * Returns a human-readable summary of the budget state.
 */
export function getBudgetReport(budget: TokenBudget): string {
  const lines: string[] = [
    `Token Budget Report`,
    `===================`,
    `Total Available: ${budget.totalAvailable.toLocaleString()}`,
    `Remaining:       ${budget.remaining.toLocaleString()}`,
    ``,
    `Section Breakdown:`,
  ];

  const sections = Object.keys(budget.allocations);
  for (const section of sections) {
    const allocated = budget.allocations[section] ?? 0;
    const used = budget.used[section] ?? 0;
    const pct = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
    const status = used > allocated ? ' [OVER BUDGET]' : '';
    lines.push(`  ${section.padEnd(20)} ${used.toLocaleString()} / ${allocated.toLocaleString()} (${pct}%)${status}`);
  }

  return lines.join('\n');
}
