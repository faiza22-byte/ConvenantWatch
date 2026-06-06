/**
 * ragService.js
 *
 * Core retrieval-augmented generation service.
 *
 * Pipeline:
 *   query
 *     → embed query (text-embedding-3-large, matches your ingest model)
 *     → semantic search  (ChromaDB cosine similarity)
 *     → BM25 keyword search (in-memory, over retrieved + expanded set)
 *     → RRF fusion         (merge & re-rank both lists)
 *     → MMR deduplication  (remove near-duplicate chunks)
 *     → build grounded prompt
 *     → stream GPT-4o answer
 */

import { ChromaClient } from "chromadb";
import OpenAI from "openai";
import { bm25Score } from "./bm25.service.js";
import { reciprocalRankFusion } from "./rrf.service.js";

/* ─────────────────────────────────────────
   CLIENTS
───────────────────────────────────────── */
const chroma = new ChromaClient({
  host: process.env.CHROMA_HOST ?? "localhost",
  port: Number(process.env.CHROMA_PORT ?? 8000),
  ssl:  process.env.CHROMA_SSL === "true",
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ─────────────────────────────────────────
   CONSTANTS  (tune these per your corpus)
───────────────────────────────────────────
  SEMANTIC_TOP_K   — how many chunks ChromaDB returns via vector search
  BM25_EXPAND_K    — extra chunks fetched (larger pool) for BM25 scoring
  FINAL_TOP_K      — chunks actually sent to the LLM after fusion + MMR
  MMR_LAMBDA       — 0 = max diversity, 1 = max relevance
  SEMANTIC_WEIGHT  — RRF list weight for vector results (vs BM25 at 1.0)
*/
const SEMANTIC_TOP_K   = 10;
const BM25_EXPAND_K    = 20; // pull wider pool for BM25 to work over
const FINAL_TOP_K      = 6;
const MMR_LAMBDA       = 0.7;
const SEMANTIC_WEIGHT  = 1.0;
const BM25_WEIGHT      = 0.6;
const EMBED_MODEL      = "text-embedding-3-large"; // ← matches your ingest
const CHAT_MODEL       = "gpt-4o";

/* ─────────────────────────────────────────
   STEP 1 — EMBED QUERY
───────────────────────────────────────── */
async function embedQuery(text) {
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/* ─────────────────────────────────────────
   STEP 2 — SEMANTIC SEARCH (ChromaDB)
───────────────────────────────────────── */
/**
 * Returns top-K chunks by cosine similarity from the company's collection.
 * Also pulls a wider pool (BM25_EXPAND_K) so BM25 has more candidates.
 *
 * @returns {{ semanticHits: Chunk[], expandedPool: Chunk[] }}
 */
async function semanticSearch(companyId, queryEmbedding) {
  const collectionName = `loan-${companyId}`;

  let collection;
  try {
    collection = await chroma.getCollection({ name: collectionName });
  } catch {
    throw new Error(
      `No loan agreement found for company "${companyId}". ` +
      `Please upload and process the agreement first.`
    );
  }

  // Fetch a wider pool once — slice it into semantic hits + BM25 pool
  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: Math.max(SEMANTIC_TOP_K, BM25_EXPAND_K),
    include: ["documents", "metadatas", "distances"],
  });

  const docs      = result.documents[0]   ?? [];
  const metas     = result.metadatas[0]   ?? [];
  const distances = result.distances[0]   ?? [];

  // ChromaDB returns L2 distance — convert to cosine similarity score
  const allChunks = docs.map((doc, i) => ({
    id:           `${companyId}-${metas[i]?.chunkIndex ?? i}`,
    text:         doc,
    chunkIndex:   metas[i]?.chunkIndex ?? i,
    distance:     distances[i],
    // Normalise to [0,1] similarity (approximate; good enough for ranking)
    vectorScore:  1 / (1 + distances[i]),
  }));

  return {
    semanticHits: allChunks.slice(0, SEMANTIC_TOP_K),
    expandedPool: allChunks, // up to BM25_EXPAND_K items
  };
}

/* ─────────────────────────────────────────
   STEP 3 — BM25 KEYWORD SEARCH
───────────────────────────────────────── */
/**
 * Scores the expanded pool with BM25, returns ranked list.
 */
function keywordSearch(query, expandedPool) {
  const corpus = expandedPool.map((c) => c.text);
  const ranked = bm25Score(query, corpus);

  return ranked.map(({ index, score }) => ({
    ...expandedPool[index],
    bm25Score: score,
  }));
}

/* ─────────────────────────────────────────
   STEP 4 — RRF FUSION
───────────────────────────────────────── */
/**
 * Merges semantic and BM25 ranked lists via Reciprocal Rank Fusion.
 * Semantic list is weighted higher (more signal for domain text).
 */
function fuseResults(semanticHits, bm25Hits) {
  return reciprocalRankFusion(
    [semanticHits, bm25Hits],
    [SEMANTIC_WEIGHT, BM25_WEIGHT]
  );
}

/* ─────────────────────────────────────────
   STEP 5 — MMR DEDUPLICATION
───────────────────────────────────────── */
/**
 * Maximal Marginal Relevance — iteratively picks chunks that are
 * both relevant to the query AND dissimilar to already-selected chunks.
 *
 * Uses simple Jaccard token overlap as a cheap similarity proxy
 * (avoids a second embedding round-trip).
 *
 * MMR(d) = λ * relevance(d, q) - (1-λ) * max_similarity(d, selected)
 */
function mmrDeduplicate(fusedChunks, topK) {
  if (fusedChunks.length <= topK) return fusedChunks;

  /* tokenise each chunk once */
  const tokenSets = fusedChunks.map(
    (c) => new Set(c.text.toLowerCase().split(/\s+/))
  );

  function jaccard(setA, setB) {
    let intersection = 0;
    for (const t of setA) if (setB.has(t)) intersection++;
    return intersection / (setA.size + setB.size - intersection);
  }

  const selected  = [];
  const remaining = fusedChunks.map((c, i) => ({ chunk: c, idx: i }));

  while (selected.length < topK && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestPos   = 0;

    remaining.forEach(({ chunk, idx }, pos) => {
      const relevance = chunk.rrfScore; // proxy for query relevance

      const maxSim = selected.length === 0
        ? 0
        : Math.max(...selected.map(({ idx: si }) => jaccard(tokenSets[idx], tokenSets[si])));

      const mmrScore = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * maxSim;

      if (mmrScore > bestScore) { bestScore = mmrScore; bestPos = pos; }
    });

    selected.push(remaining[bestPos]);
    remaining.splice(bestPos, 1);
  }

  return selected.map(({ chunk }) => chunk);
}

/* ─────────────────────────────────────────
   STEP 6 — BUILD SYSTEM PROMPT
───────────────────────────────────────── */
function buildSystemPrompt(chunks, companyName) {
  const context = chunks
  .map((c) => c.text)
  .join("\n\n---\n\n");

  return `You are a senior credit analyst assistant reviewing loan agreements.
Your answers must be grounded EXCLUSIVELY in the document context provided below.
Do not use outside knowledge. If the answer is not in the context, say so explicitly.

Rules:
- Be precise and professional.
- Cite chunk numbers (e.g. [CHUNK 2]) when referencing specific clauses.
- For numeric values (rates, ratios, amounts) always quote the exact figure.
- If multiple chunks contain conflicting information, surface the conflict.
- Keep answers concise unless the user asks for a full breakdown.

Company: ${companyName ?? "Unknown"}

═══════════════════════════════
LOAN AGREEMENT CONTEXT
═══════════════════════════════
${context}
═══════════════════════════════`;
}

/* ─────────────────────────────────────────
   STEP 7 — STREAM ANSWER
───────────────────────────────────────── */
/**
 * Streams GPT-4o tokens into `res` (Express response) as SSE.
 * Format:  data: <token>\n\n
 * Sentinel: data: [DONE]\n\n
 */
async function streamAnswer(systemPrompt, conversationHistory, query, res) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-8), // keep last 4 turns for context
    { role: "user",   content: query },
  ];

  const stream = await openai.chat.completions.create({
    model:       CHAT_MODEL,
    messages,
    temperature: 0.15, // low temp for factual document QA
    max_tokens:  1200,
    stream:      true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

/* ─────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────── */

/**
 * Full hybrid RAG pipeline — semantic + BM25 + RRF + MMR → streaming answer.
 *
 * @param {object} opts
 * @param {string}   opts.companyId          — maps to `loan-{companyId}` collection
 * @param {string}   opts.companyName        — shown in system prompt
 * @param {string}   opts.query              — user's question
 * @param {Array}    opts.conversationHistory — prior { role, content } turns
 * @param {object}   opts.res                — Express response (SSE mode)
 */
export async function hybridRAG({ companyId, companyName, query, conversationHistory = [], res }) {
  /* 1. embed */
  const queryEmbedding = await embedQuery(query);

  /* 2. semantic search */
  const { semanticHits, expandedPool } = await semanticSearch(companyId, queryEmbedding);

  /* 3. BM25 keyword search over expanded pool */
  const bm25Hits = keywordSearch(query, expandedPool);

  /* 4. RRF fusion */
  const fused = fuseResults(semanticHits, bm25Hits);

  /* 5. MMR dedup */
  const finalChunks = mmrDeduplicate(fused, FINAL_TOP_K);

  /* 6. system prompt */
  const systemPrompt = buildSystemPrompt(finalChunks, companyName);

  /* 7. stream */
  await streamAnswer(systemPrompt, conversationHistory, query, res);

  /* return retrieval metadata (useful for logging/debugging) */
  return {
    chunksUsed:    finalChunks.length,
    chunkIndices:  finalChunks.map((c) => c.chunkIndex),
    sources:       finalChunks.map((c) => c.sources),
  };
}

/**
 * Non-streaming variant — returns full answer string.
 * Useful for internal calls / testing.
 */
export async function hybridRAGSync({ companyId, companyName, query, conversationHistory = [] }) {
  const queryEmbedding             = await embedQuery(query);
  const { semanticHits, expandedPool } = await semanticSearch(companyId, queryEmbedding);
  const bm25Hits                   = keywordSearch(query, expandedPool);
  const fused                      = fuseResults(semanticHits, bm25Hits);
  const finalChunks                = mmrDeduplicate(fused, FINAL_TOP_K);
  const systemPrompt               = buildSystemPrompt(finalChunks, companyName);

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-8),
    { role: "user",   content: query },
  ];

  const res = await openai.chat.completions.create({
    model:       CHAT_MODEL,
    messages,
    temperature: 0.15,
    max_tokens:  1200,
  });

  return {
    answer:       res.choices[0].message.content,
    chunksUsed:   finalChunks.length,
    chunkIndices: finalChunks.map((c) => c.chunkIndex),
    sources:      finalChunks.map((c) => c.sources),
    usage:        res.usage,
  };
}
