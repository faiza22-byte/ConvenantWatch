/**
 * ragController.js
 *
 * Express controllers for the hybrid RAG endpoints.
 *
 * POST /api/rag/:companyId/query/stream  — SSE streaming (production)
 * POST /api/rag/:companyId/query         — JSON response   (debug / testing)
 * GET  /api/rag/:companyId/health        — collection reachability check
 */

import { hybridRAG, hybridRAGSync } from "../services/ragService.service.js";

/* ─────────────────────────────────────────
   VALIDATION HELPERS
───────────────────────────────────────── */
function validateQuery(query) {
  if (!query || typeof query !== "string") return "query must be a non-empty string";
  if (query.trim().length < 3)            return "query is too short (min 3 chars)";
  if (query.length > 2000)               return "query is too long (max 2000 chars)";
  return null;
}

function validateHistory(history) {
  if (!Array.isArray(history)) return "conversationHistory must be an array";

  for (const msg of history) {
    if (!["user", "assistant"].includes(msg.role)) {
      return `invalid role "${msg.role}" in conversationHistory`;
    }
    if (typeof msg.content !== "string") {
      return "each conversationHistory entry must have a string content field";
    }
  }
  return null;
}

/* ─────────────────────────────────────────
   CONTROLLER — STREAMING (SSE)
───────────────────────────────────────── */
/**
 * POST /api/rag/:companyId/query/stream
 *
 * Body:
 * {
 *   query:               string,          // user's question
 *   companyName?:        string,          // shown in LLM system prompt
 *   conversationHistory?: { role, content }[]  // prior turns
 * }
 *
 * Response: text/event-stream
 *   data: {"token":"..."}\n\n   — streamed tokens
 *   data: {"done":true}\n\n     — end of stream sentinel
 *   data: {"error":"..."}\n\n   — on error
 */
export async function streamQuery(req, res) {
  const { companyId }                                  = req.params;
  const { query, companyName = "", conversationHistory = [] } = req.body;

  /* ── validate ── */
  const queryErr   = validateQuery(query);
  const historyErr = validateHistory(conversationHistory);

  if (queryErr || historyErr) {
    return res.status(400).json({ error: queryErr ?? historyErr });
  }

  /* ── SSE headers ── */
  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  /* ── heartbeat — keeps connection alive during embedding round-trip ── */
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);

  try {
    const meta = await hybridRAG({
      companyId,
      companyName,
      query: query.trim(),
      conversationHistory,
      res,
    });

    /* log retrieval stats (attach to your logger of choice) */
    console.info("[RAG] stream complete", {
      companyId,
      chunksUsed:   meta.chunksUsed,
      chunkIndices: meta.chunkIndices,
    });

  } catch (err) {
    console.error("[RAG] stream error", err);

    /* try to send error event before closing — client may still be listening */
    try {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } catch {
      /* response already ended */
    }

  } finally {
    clearInterval(heartbeat);
  }
}

/* ─────────────────────────────────────────
   CONTROLLER — SYNC JSON (debug / testing)
───────────────────────────────────────── */
/**
 * POST /api/rag/:companyId/query
 *
 * Same body as the streaming endpoint.
 * Returns the full answer in one JSON response — useful for Postman/tests.
 *
 * Response:
 * {
 *   answer:       string,
 *   chunksUsed:   number,
 *   chunkIndices: number[],
 *   sources:      string[][],
 *   usage:        { prompt_tokens, completion_tokens, total_tokens }
 * }
 */
export async function syncQuery(req, res) {
  const { companyId }                                  = req.params;
  const { query, companyName = "", conversationHistory = [] } = req.body;

  const queryErr   = validateQuery(query);
  const historyErr = validateHistory(conversationHistory);

  if (queryErr || historyErr) {
    return res.status(400).json({ error: queryErr ?? historyErr });
  }

  try {
    const result = await hybridRAGSync({
      companyId,
      companyName,
      query: query.trim(),
      conversationHistory,
    });

    console.info("[RAG] sync complete", {
      companyId,
      chunksUsed: result.chunksUsed,
      tokens:     result.usage?.total_tokens,
    });

    return res.status(200).json(result);

  } catch (err) {
    console.error("[RAG] sync error", err);

    const status = err.message.includes("No loan agreement found") ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
}

/* ─────────────────────────────────────────
   CONTROLLER — HEALTH CHECK
───────────────────────────────────────── */
/**
 * GET /api/rag/:companyId/health
 *
 * Confirms the ChromaDB collection for this company exists
 * and returns its chunk count.
 *
 * Response:
 * {
 *   ok:             boolean,
 *   collectionName: string,
 *   chunkCount:     number
 * }
 */
export async function collectionHealth(req, res) {
  const { companyId } = req.params;

  try {
    const { ChromaClient } = await import("chromadb");
    const client = new ChromaClient({
      host: process.env.CHROMA_HOST ?? "localhost",
      port: Number(process.env.CHROMA_PORT ?? 8000),
      ssl:  process.env.CHROMA_SSL === "true",
    });

    const collectionName = `loan-${companyId}`;
    const collection     = await client.getCollection({ name: collectionName });
    const chunkCount     = await collection.count();

    return res.status(200).json({ ok: true, collectionName, chunkCount });

  } catch (err) {
    return res.status(404).json({
      ok:    false,
      error: `Collection not found for company "${companyId}": ${err.message}`,
    });
  }
}
