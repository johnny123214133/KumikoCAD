// Fuzzy matching for the command palette and the pattern library's search box.
//
// A query is split into words; EVERY word has to match somewhere in the item, in any order, so
// "walnut goma" and "goma walnut" find the same pattern. A word matches a piece of text when its
// letters appear in the text in order ("sknr" finds "Sakura Shippo"), and is scored higher for
// matching at the start of a word, for letters that sit together and for fewer skipped letters.
// A word of 4+ letters that matches nothing that way still matches the start of a word of the text
// within one typo (two from 6 letters) — "saku" finds "Zakura", "asnoha" finds "Asanoha".
//
//   searchItems(items, query, fields) -> [{ item, score, matches }] best first
//     fields(item) -> [{ text, weight }]   what to look in, and how much a hit there counts
//   matches[fieldIndex] = the character positions matched in that field's text (for highlighting)
//
// Pure functions, no dependencies.

const MATCH = 16;       // each matched letter
const CONSECUTIVE = 14; // a letter right after the previous matched one
const WORD_START = 12;  // a letter at the start of a word
const GAP = -1.2;       // each skipped letter between matches
const LEAD = -0.35;     // each skipped letter before the first match

export const normalize = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // accents: "Ō" matches "o"
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Keeps positions meaningful for highlighting: same length as the original except accents are
// folded, so highlighting works on the folded string's indices (names here are plain ASCII).
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isWordStart = (t, i) => i === 0 || !/[a-z0-9]/.test(t[i - 1]);

// Best in-order alignment of `q` inside `t` (both folded). Returns { score, idx } or null.
// Dynamic programming over (query letter, text position): best[j][i] = best score with q[j]
// matched at t[i].
export function subsequence(q, t) {
  const m = q.length, n = t.length;
  if (!m || m > n) return null;
  let prev = new Array(n).fill(-Infinity);
  const from = []; // from[j][i] = where q[j-1] matched on the best path that has q[j] at t[i]
  for (let j = 0; j < m; j++) {
    const cur = new Array(n).fill(-Infinity);
    const back = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (t[i] !== q[j]) continue;
      const gain = MATCH + (isWordStart(t, i) ? WORD_START : 0);
      if (j === 0) { cur[i] = gain + LEAD * i; continue; }
      let best = -Infinity, at = -1;
      if (i >= 1 && prev[i - 1] > -Infinity) { best = prev[i - 1] + CONSECUTIVE; at = i - 1; }
      for (let k = 0; k < i - 1; k++) {
        if (prev[k] === -Infinity) continue;
        const v = prev[k] + GAP * (i - k - 1);
        if (v > best) { best = v; at = k; }
      }
      if (at >= 0) { cur[i] = best + gain; back[i] = at; }
    }
    from.push(back);
    prev = cur;
  }
  let end = -1, bestScore = -Infinity;
  for (let i = 0; i < n; i++) if (prev[i] > bestScore) { bestScore = prev[i]; end = i; }
  if (end < 0) return null;
  const idx = new Array(m);
  let at = end;
  for (let j = m - 1; j >= 0; j--) { idx[j] = at; at = from[j][at]; }
  // Letters scattered far apart ("wlnt" across a whole sentence) are not a match.
  if (idx[m - 1] - idx[0] + 1 > m * 2 + 4) return null;
  return { score: bestScore, idx };
}

// Edit distance with adjacent swaps, giving up above `max`.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = [];
  for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// One query word against one folded text: { score, idx } or null.
function matchWord(q, t) {
  const sub = subsequence(q, t);
  if (sub) {
    // A whole-word or prefix hit beats a scattered one.
    const at = t.indexOf(q);
    if (at >= 0 && isWordStart(t, at)) sub.score += 30 + (t.length === q.length ? 20 : 0);
    return sub;
  }
  // From the 4th letter on, a word of the text also matches within a few typos — as a PREFIX, so
  // "saku" finds "Zakura" without waiting for the whole word to be typed.
  if (q.length < 4) return null;
  const allowed = q.length >= 6 ? 2 : 1;
  let best = null;
  const re = /[a-z0-9]+/g;
  let w;
  while ((w = re.exec(t))) {
    const word = w[0];
    let dist = distance(q, word, allowed); // the whole word
    // ...or its first q.length letters (one more or fewer, for a dropped or doubled letter)
    for (let len = q.length - 1; len <= q.length + 1 && dist > 0; len++) {
      if (len >= 1 && len <= word.length) dist = Math.min(dist, distance(q, word.slice(0, len), allowed));
    }
    if (dist <= allowed) {
      const score = 22 - dist * 7;
      if (!best || score > best.score) best = { score, idx: Array.from({ length: Math.min(word.length, q.length) }, (_, k) => w.index + k) };
    }
  }
  return best;
}

// `query` against one item's fields. Returns { score, matches } or null if any word is unmatched.
export function scoreItem(queryWords, fields) {
  const folded = fields.map((f) => ({ text: fold(f.text), weight: f.weight ?? 1 }));
  let total = 0;
  const matches = fields.map(() => []);
  for (const q of queryWords) {
    let best = null, bestField = -1;
    folded.forEach((f, fi) => {
      if (!f.text) return;
      const r = matchWord(q, f.text);
      if (!r) return;
      const s = r.score * f.weight - f.text.length * 0.04; // a shorter text is a closer match
      if (!best || s > best.s) { best = { s, idx: r.idx }; bestField = fi; }
    });
    if (!best) return null;
    total += best.s;
    matches[bestField].push(...best.idx);
  }
  return { score: total, matches: matches.map((m) => [...new Set(m)].sort((a, b) => a - b)) };
}

export function searchItems(items, query, fields) {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return items.map((item) => ({ item, score: 0, matches: [] }));
  const out = [];
  items.forEach((item, order) => {
    const r = scoreItem(words, fields(item));
    if (r) out.push({ item, score: r.score, matches: r.matches, order });
  });
  out.sort((a, b) => b.score - a.score || a.order - b.order);
  return out;
}
