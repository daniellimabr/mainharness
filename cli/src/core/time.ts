// Human-facing times in Daniel's timezone (config.timezone, default America/Sao_Paulo).
// Machine data (events) stays in UTC.
import { loadConfig } from "./config";

function parts(iso: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: loadConfig().timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

/** "02:05" in the local timezone. */
export function localHM(iso: string): string {
  const p = parts(iso);
  return `${p.hour}:${p.minute}`;
}

/** "2026-10-15 01:59:39" in the local timezone. */
export function localDateTime(iso: string): string {
  const p = parts(iso);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
