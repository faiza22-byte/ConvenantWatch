/**
 * Reciprocal Rank Fusion (RRF)
 *
 * Combines multiple ranked lists without needing score normalisation.
 * RRF(d) = Σ 1 / (k + rank(d, list))
 *
 * k=60 is the canonical constant from the original Cormack et al. paper.
 * It dampens the effect of very high ranks and reduces sensitivity to outliers.
 */

const K = 60;

/**
 * Fuse N ranked lists into a single merged ranking.
 *
 * @param {Array<{ id: string, [key: string]: any }[]>} rankedLists
 *   Each list is ordered best→worst. Items must have a unique `id` field.
 *
 * @param {number[]} [weights]
 *   Optional per-list weight multipliers (default all 1.0).
 *   e.g. [1.0, 0.6] gives semantic results more influence than BM25.
 *
 * @returns {{ id: string, rrfScore: number, sources: string[] }[]}
 *   Merged list sorted by RRF score descending, with provenance tracking.
 */
export function reciprocalRankFusion(rankedLists, weights) {
  const W       = weights ?? rankedLists.map(() => 1.0);
  const scores  = new Map(); // id → cumulative RRF score
  const meta    = new Map(); // id → original item data
  const sources = new Map(); // id → which lists contributed

  rankedLists.forEach((list, listIdx) => {
    list.forEach((item, rank) => {
      const { id } = item;
      const contribution = W[listIdx] / (K + rank + 1);

      scores.set(id, (scores.get(id) ?? 0) + contribution);

      if (!meta.has(id)) meta.set(id, item);

      const src = sources.get(id) ?? [];
      src.push(listIdx === 0 ? "semantic" : "bm25");
      sources.set(id, src);
    });
  });

  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([id, rrfScore]) => ({
      ...meta.get(id),
      rrfScore,
      sources: [...new Set(sources.get(id))],
    }));
}
