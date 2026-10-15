// Tiny argument parser: positionals + --flag value / --flag=value / --bool.
export interface Parsed {
  _: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(args: string[]): Parsed {
  const out: Parsed = { _: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (a === "--") {
      out._.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        out.flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          out.flags[a.slice(2)] = next;
          i++;
        } else out.flags[a.slice(2)] = true;
      }
    } else out._.push(a);
  }
  return out;
}

export function flagStr(p: Parsed, name: string): string | undefined {
  const v = p.flags[name];
  return typeof v === "string" ? v : undefined;
}
