/**
 * Salvaging structured data out of a language model's reply.
 *
 * Gemini is called with a responseSchema, so it *should* return bare JSON.
 * "Should" is not a guarantee. In practice models occasionally wrap the
 * object in markdown fences, prefix it with a sentence, append an
 * explanation, or emit smart quotes and trailing commas. Any of those makes
 * a naive JSON.parse throw, and the shopkeeper sees "the page could not be
 * read" for a page that was actually read perfectly well.
 *
 * This module is the difference between the app *receiving* a response and
 * the app *using* it. It never gives up until every strategy has failed,
 * and it never leaks raw model text to the user.
 */

export type Salvage<T> =
  | { ok: true; value: T; strategy: string; repaired: boolean }
  | { ok: false; reason: string };

/** Strip markdown code fences, with or without a language tag. */
function stripFences(s: string): string {
  return s
    .replace(/^[\s\S]*?```(?:json|JSON|javascript)?\s*/m, (m) => (m.includes("```") ? "" : m))
    .replace(/```[\s\S]*$/m, "")
    .trim();
}

/** Find the outermost balanced {...} or [...], ignoring braces inside strings. */
function extractBalanced(s: string): string | null {
  const openIdx = s.search(/[{[]/);
  if (openIdx === -1) return null;

  const open = s[openIdx];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];

    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(openIdx, i + 1);
    }
  }
  // Unterminated — the model was cut off by a token limit.
  return null;
}

/** Conservative repairs for the mistakes models actually make. */
function repair(s: string): string {
  return s
    // Smart quotes around keys and values
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    // Trailing commas before a closing brace or bracket
    .replace(/,(\s*[}\]])/g, "$1")
    // Literal NaN / Infinity, which are not valid JSON
    .replace(/:\s*NaN\b/g, ": null")
    .replace(/:\s*-?Infinity\b/g, ": null");
}

/**
 * Close an object that was truncated mid-way by a token limit, so at least
 * the complete rows survive instead of the whole page being lost.
 */
function closeTruncated(s: string): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastSafe = -1;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{" || ch === "[") { stack.push(ch === "{" ? "}" : "]"); depth++; }
    else if (ch === "}" || ch === "]") { stack.pop(); depth--; }
    // A comma at depth 2 is a safe row boundary inside entries[]
    else if (ch === "," && depth === 2) lastSafe = i;
  }

  if (depth <= 0) return null;
  if (lastSafe === -1) return null;

  const truncatedAt = s.slice(0, lastSafe);
  // Rebuild the closers for whatever is still open
  let rebuilt = truncatedAt;
  let d = 0, inStr = false, esc = false;
  const open: string[] = [];
  for (let i = 0; i < rebuilt.length; i++) {
    const ch = rebuilt[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") { open.push("}"); d++; }
    else if (ch === "[") { open.push("]"); d++; }
    else if (ch === "}" || ch === "]") { open.pop(); d--; }
  }
  while (open.length) rebuilt += open.pop();
  return rebuilt;
}

/**
 * Try increasingly forgiving strategies. Returns which one worked so the
 * server log can show whether the model is drifting from the schema.
 */
export function salvageJson<T = unknown>(raw: string): Salvage<T> {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, reason: "empty response" };
  }

  const attempts: { name: string; text: string; repaired: boolean }[] = [];

  attempts.push({ name: "direct", text: raw.trim(), repaired: false });

  const fenced = stripFences(raw);
  if (fenced && fenced !== raw.trim()) {
    attempts.push({ name: "fenced", text: fenced, repaired: false });
  }

  for (const base of [raw, fenced]) {
    const balanced = extractBalanced(base);
    if (balanced) attempts.push({ name: "balanced", text: balanced, repaired: false });
  }

  // Repaired variants of everything above
  for (const a of [...attempts]) {
    const r = repair(a.text);
    if (r !== a.text) attempts.push({ name: `${a.name}+repair`, text: r, repaired: true });
  }

  for (const a of attempts) {
    try {
      return { ok: true, value: JSON.parse(a.text) as T, strategy: a.name, repaired: a.repaired };
    } catch {
      /* try the next strategy */
    }
  }

  // Last resort: the model ran out of tokens mid-object.
  const closed = closeTruncated(extractBalanced(raw) ?? raw);
  if (closed) {
    try {
      return { ok: true, value: JSON.parse(repair(closed)) as T, strategy: "truncated", repaired: true };
    } catch {
      /* fall through */
    }
  }

  return { ok: false, reason: "no valid JSON in response" };
}
