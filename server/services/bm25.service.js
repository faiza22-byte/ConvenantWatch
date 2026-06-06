/**
 * BM25 â€” Probabilistic keyword ranking
 * Used alongside vector search for hybrid retrieval.
 *
 * BM25(q, d) = Î£ IDF(qi) * [ f(qi,d) * (k1+1) ] / [ f(qi,d) + k1*(1 - b + b*|d|/avgdl) ]
 */

const K1 = 1.5; // term frequency saturation
const B  = 0.75; // length normalisation factor

/* â”€â”€ tokenise: lowercase, strip punctuation, split on whitespace â”€â”€ */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* â”€â”€ build an inverse-document-frequency map over the corpus â”€â”€ */
function buildIDF(corpus) {
  const N   = corpus.length;
  const df  = new Map(); // term â†’ doc-frequency count

  for (const doc of corpus) {
    const terms = new Set(tokenise(doc));
    for (const t of terms) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const idf = new Map();
  for (const [term, freq] of df) {
    // Robertson-SpÃ¤rck Jones IDF with smoothing
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  }
  return idf;
}

/**
 * Score every document in `corpus` against `query`.
 * Returns array of { index, score } sorted descending.
 *
 * @param {string}   query
 * @param {string[]} corpus   â€” array of raw text chunks
 * @returns {{ index: number, score: number }[]}
 */
export function bm25Score(query, corpus) {
  if (!corpus.length) return [];

  const idf    = buildIDF(corpus);
  const avgdl  = corpus.reduce((s, d) => s + tokenise(d).length, 0) / corpus.length;
  const qTerms = tokenise(query);

  return corpus
    .map((doc, index) => {
      const tokens = tokenise(doc);
      const len    = tokens.length;

      // term-frequency map for this document
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

      let score = 0;
      for (const term of qTerms) {
        const f   = tf.get(term) ?? 0;
        const idfV = idf.get(term) ?? 0;
        score += idfV * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / avgdl)));
      }

      return { index, score };
    })
    .sort((a, b) => b.score - a.score);
}
