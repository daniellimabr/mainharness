// US$ estimate for one response from its transcript usage block and the config price table.
import type { Price } from "../core/config";

/** message.usage as written in Claude Code transcripts (all fields optional). */
export interface TranscriptUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number };
}

/** Exact model id, or the id without a trailing -YYYYMMDD date. */
export function priceFor(model: string, prices: Record<string, Price>): Price | null {
  return prices[model] ?? prices[model.replace(/-\d{8}$/, "")] ?? null;
}

/** Estimated US$ (6 decimals), or null when the model has no price. */
export function usd(
  model: string,
  usage: TranscriptUsage,
  prices: Record<string, Price>,
): number | null {
  const p = priceFor(model, prices);
  if (!p) return null;
  const write = usage.cache_creation_input_tokens ?? 0;
  const split = usage.cache_creation;
  const w1h = split ? (split.ephemeral_1h_input_tokens ?? 0) : 0;
  const w5m = split ? (split.ephemeral_5m_input_tokens ?? 0) : write;
  const total =
    (usage.input_tokens ?? 0) * p.input +
    (usage.output_tokens ?? 0) * p.output +
    (usage.cache_read_input_tokens ?? 0) * p.cacheRead +
    w5m * p.cacheWrite5m +
    w1h * p.cacheWrite1h;
  return Number((total / 1e6).toFixed(6));
}
