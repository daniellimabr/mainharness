/** Free text made safe for an event string field (no content-like chars, max 200). */
export function safeText(t: string): string {
  return t.replace(/[\r\n\t{};<>`]/g, " ").slice(0, 200);
}
