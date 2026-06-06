/**
 * ragRoutes.js
 *
 * Mount:
 *   app.use("/api/rag", ragRoutes);
 *
 * Endpoints:
 *   POST   /api/rag/:companyId/query/stream   — SSE streaming answer
 *   POST   /api/rag/:companyId/query           — JSON answer (debug)
 *   GET    /api/rag/:companyId/health          — collection health check
 */

import { Router }                                    from "express";
import { streamQuery, syncQuery, collectionHealth }  from "../controllers/ragController.controller.js";

/* ─────────────────────────────────────────
   OPTIONAL MIDDLEWARE STUBS
   Replace/extend these with your real auth
   and rate-limiting logic.
───────────────────────────────────────── */

/**
 * authMiddleware
 * Attach your JWT/session check here.
 * The stub below passes everything through.
 *
 * Example real implementation:
 *   import jwt from "jsonwebtoken";
 *   export function authMiddleware(req, res, next) {
 *     const token = req.headers.authorization?.split(" ")[1];
 *     if (!token) return res.status(401).json({ error: "Unauthorised" });
 *     try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
 *     catch { res.status(401).json({ error: "Invalid token" }); }
 *   }
 */
function authMiddleware(req, res, next) {
  // TODO: replace with real auth
  next();
}

/**
 * companyAccessGuard
 * Ensures the authenticated user can access this companyId.
 * Stub — always grants access. In production, check req.user.companyId.
 */
function companyAccessGuard(req, res, next) {
  // const { companyId } = req.params;
  // if (req.user.companyId !== companyId && !req.user.isAdmin) {
  //   return res.status(403).json({ error: "Forbidden" });
  // }
  next();
}

/**
 * ragRateLimiter
 * Basic in-memory window counter.
 * In production swap for express-rate-limit + Redis store.
 *
 * Limits: 30 requests / minute per IP on streaming endpoint.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT     = 30;
const rateCounts     = new Map(); // ip → { count, windowStart }

function ragRateLimiter(req, res, next) {
  const ip  = req.ip ?? req.connection.remoteAddress;
  const now = Date.now();
  const rec = rateCounts.get(ip);

  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    rateCounts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  rec.count++;
  if (rec.count > RATE_LIMIT) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment before asking again.",
      retryAfter: Math.ceil((rec.windowStart + RATE_WINDOW_MS - now) / 1000),
    });
  }

  next();
}

/* ─────────────────────────────────────────
   ROUTER
───────────────────────────────────────── */
const router = Router();

/* All RAG routes require auth and company access */
router.use(authMiddleware);
router.use("/:companyId", companyAccessGuard);

/**
 * @route  GET /api/rag/:companyId/health
 * @desc   Check if ChromaDB collection exists and return chunk count.
 * @access Protected
 */
router.get("/:companyId/health", collectionHealth);

/**
 * @route  POST /api/rag/:companyId/query/stream
 * @desc   Hybrid RAG query — returns answer as SSE token stream.
 * @access Protected
 *
 * Body:
 *   { query: string, companyName?: string, conversationHistory?: Message[] }
 *
 * SSE events:
 *   data: {"token":"..."}     — streamed answer token
 *   data: {"done":true}       — stream complete
 *   data: {"error":"..."}     — retrieval/LLM error
 */
router.post("/:companyId/query/stream", ragRateLimiter, streamQuery);

/**
 * @route  POST /api/rag/:companyId/query
 * @desc   Hybrid RAG query — returns full answer as JSON (debug/test).
 * @access Protected
 *
 * Body:
 *   { query: string, companyName?: string, conversationHistory?: Message[] }
 *
 * Response:
 *   { answer, chunksUsed, chunkIndices, sources, usage }
 */
router.post("/:companyId/query", ragRateLimiter, syncQuery);

export default router;
