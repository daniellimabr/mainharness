export interface Task {
  id: string;
  title: string;
  files: string[];
}

/** Parses the "| Id | Tarefa | ... |" table of a sprint plan. */
export function parseTasks(md: string): Task[] {
  return md
    .split("\n")
    .filter((l) => /^\| T\d+ /.test(l))
    .map((l) => {
      const [id, title, , files] = l.split("|").slice(1).map((c) => c.trim());
      return { id, title, files: files.split(",").map((f) => f.trim()) };
    });
}
