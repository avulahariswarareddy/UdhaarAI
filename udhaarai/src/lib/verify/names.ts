/**
 * Customer name matching. Entirely deterministic.
 *
 * The failure this prevents is the worst one in the product: "Ramesh Yadav"
 * and "Ramesh Yadhav" become two customers, the balance splits in half, and
 * nobody notices until a customer argues. Exact string matching guarantees
 * this happens, because handwriting is inconsistent and transliteration is
 * not standardised.
 *
 * Three layers, cheapest first:
 *   1. canonical form  — case, spacing, honorifics, diacritics
 *   2. phonetic key    — Indic transliteration collapse (dh/d, v/w, sh/s)
 *   3. Jaro-Winkler    — character-level similarity with a prefix bonus
 */

const HONORIFICS = [
  "shri", "sri", "smt", "mr", "mrs", "ms", "dr",
  "\u0936\u094D\u0930\u0940", "\u0936\u094D\u0930\u0940\u092E\u0924\u0940",
  "\u0C36\u0C4D\u0C30\u0C40",
];

/** Lowercase, strip honorifics and punctuation, collapse whitespace. */
export function canonical(name: string): string {
  let s = (name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const h of HONORIFICS) {
    s = s.replace(new RegExp(`^${h}\\s+`), "").replace(new RegExp(`\\s+${h}$`), "");
  }
  return s.trim();
}

/**
 * Phonetic key for Latin-transliterated Indic names. Collapses the
 * distinctions that transliteration is inconsistent about, so that
 * Yadav/Yadhav, Vinod/Winod, Krishna/Krsna all land on the same key.
 */
export function phoneticKey(name: string): string {
  let s = canonical(name);
  if (!s) return "";

  s = s
    // Collapse doubled letters first — handwriting and transliteration both
    // produce spurious doubles ("Sureshh", "Kumaar"), and leaving them in
    // defeats the digraph rules below.
    .replace(/(.)\1+/g, "$1")
    .replace(/ph/g, "f")
    .replace(/(bh|dh|gh|jh|kh|th|ch)/g, (m) => m[0]) // aspiration is unreliable
    .replace(/w/g, "v")
    .replace(/sh|s\u0323/g, "s")
    .replace(/z/g, "j")
    .replace(/ck|q/g, "k")
    .replace(/x/g, "ks")
    .replace(/([aeiou])\1+/g, "$1")
    .replace(/[aeiou]/g, (m, i) => (i === 0 ? m : "")) // vowels only anchor the start
    .replace(/(.)\1+/g, "$1")
    .replace(/\s/g, "");

  return s;
}

/** Jaro-Winkler similarity, 0 to 1. Standard implementation. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aFlags = new Array(a.length).fill(false);
  const bFlags = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(i + window + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (!bFlags[j] && a[i] === b[j]) {
        aFlags[i] = bFlags[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - transpositions) / m) / 3;

  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;

  return jaro + prefix * 0.1 * (1 - jaro);
}

export type NameMatch = {
  id: string;
  name: string;
  score: number;
  basis: "exact" | "phonetic" | "similar";
};

/**
 * Find existing customers a read name might already be.
 *
 * Returns candidates, never a decision. Above 0.94 the app auto-merges;
 * between 0.86 and 0.94 the admin is asked. That band is where the
 * genuinely ambiguous cases live and a human is worth the two seconds.
 */
export function findMatches(
  readName: string,
  existing: { id: string; name: string }[],
  limit = 3
): NameMatch[] {
  const c = canonical(readName);
  if (!c) return [];
  const key = phoneticKey(readName);

  const scored: NameMatch[] = [];

  for (const e of existing) {
    const ec = canonical(e.name);
    if (!ec) continue;

    if (ec === c) {
      scored.push({ id: e.id, name: e.name, score: 1, basis: "exact" });
      continue;
    }

    const ek = phoneticKey(e.name);
    const jw = jaroWinkler(c, ec);

    if (key && ek && key === ek) {
      // Phonetically identical. Still blend in the literal similarity so a
      // short key collision cannot outrank a genuinely close spelling.
      scored.push({ id: e.id, name: e.name, score: Math.max(0.93, jw), basis: "phonetic" });
      continue;
    }

    // Token overlap catches reordered names: "Yadav Ramesh" vs "Ramesh Yadav"
    const at = new Set(c.split(" "));
    const bt = new Set(ec.split(" "));
    const shared = [...at].filter((t) => bt.has(t)).length;
    const tokenScore = shared / Math.max(at.size, bt.size);

    const score = Math.max(jw, tokenScore >= 0.5 ? 0.88 * tokenScore + 0.12 : 0);
    if (score >= 0.82) scored.push({ id: e.id, name: e.name, score, basis: "similar" });
  }

  return scored.sort((x, y) => y.score - x.score).slice(0, limit);
}

export const AUTO_MERGE = 0.94;
export const ASK_ADMIN = 0.86;
