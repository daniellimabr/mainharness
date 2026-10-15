// Registry of project migrations between harness versions (ordered by version).
export interface Migration {
  version: string;
  kind: "simple" | "structural";
  description: string;
  /** Applies the change; returns the files touched (relative to the project root or absolute). */
  up(root: string): string[];
  /** Reverts the change (rollback); returns the files touched. */
  down?(root: string): string[];
}

/** v0.1.0 is the baseline: no migrations yet. */
export const MIGRATIONS: Migration[] = [];
