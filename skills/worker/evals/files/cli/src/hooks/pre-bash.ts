// Blocks destructive shell commands before they run.
const BLOCKED = [/git\s+push\s+--force/, /git\s+reset\s+--hard/];

export function isBlocked(cmd: string): boolean {
  return BLOCKED.some((re) => re.test(cmd));
}
