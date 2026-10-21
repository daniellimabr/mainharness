/** Parses "1h30m" / "45m" / "20s" into seconds. */
export function parseDuration(text: string): number {
  let total = 0;
  for (const [, n, unit] of text.matchAll(/(\d+)([hms])/g)) {
    const v = Number(n);
    if (unit === "h") total += v * 60;
    else if (unit === "m") total += v;
    else total += v / 60;
  }
  return total;
}
