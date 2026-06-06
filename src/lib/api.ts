import type { AuthUser } from "@/lib/auth-types";
import type { Company, CovenantAlertResponse } from "@/lib/mock-data";
import { io, Socket } from "socket.io-client";
const API_BASE = import.meta.env.VITE_API_URL ?? "";

/* =========================
ERROR HANDLING
========================= */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// keep single socket instance (VERY IMPORTANT)
let socket: Socket | null = null;

export function subscribeToCovenantAlerts(companyId: string) {
  console.log("🚀 subscribeToCovenantAlerts called with:", companyId);

  if (!socket) {
    console.log("🆕 Creating new socket instance...");

    socket = io(API_BASE, {
      transports: ["websocket"],
      withCredentials: true,
    });

    // ========================
    // CONNECTION DEBUG
    // ========================
    socket.on("connect", () => {
      console.log("🟢 Socket CONNECTED:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket DISCONNECTED:", socket?.id, "Reason:", reason);
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket CONNECT ERROR:", err.message);
    });

    socket.on("reconnect", (attempt) => {
      console.log("🔁 Socket RECONNECTED attempt:", attempt);
    });

    // ========================
    // LISTEN FOR ALL EVENTS
    // ========================
    socket.onAny((event, data) => {
      console.log("📡 SOCKET EVENT RECEIVED:", event, data);
    });
  }

  // ========================
  // CONNECTION STATE DEBUG
  // ========================
  console.log("🔎 Socket state BEFORE connect:");
  console.log("   connected:", socket.connected);
  console.log("   id:", socket.id);

  if (!socket.connected) {
    console.log("⚡ Forcing socket.connect()");
    socket.connect();
  }

  // ========================
  // ROOM JOIN DEBUG
  // ========================
  console.log("🏢 Emitting join-company:", companyId);

  socket.emit("join-company", companyId, (ack: any) => {
    console.log("✅ join-company ACK from server:", ack);
  });

  return socket;
}
/* =========================
AUTH TOKEN
========================= */

function getToken(): string | null {
  return localStorage.getItem("cw_token");
}

/* =========================
SAFE URL JOINER
prevents: //api/api/ or missing slash issues
========================= */

function buildUrl(path: string) {
  if (!API_BASE) return path;
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

/* =========================
CORE REQUEST WRAPPER
========================= */

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body &&
    Object.prototype.toString.call(options.body) === "[object FormData]";

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  const text = await res.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  // 🔥 LOG EVERYTHING FROM BACKEND
  console.groupCollapsed(
    `%c[API RESPONSE] ${path}`,
    "color: #4CAF50; font-weight: bold;"
  );
  console.log("📡 URL:", buildUrl(path));
  console.log("📊 Status:", res.status);
  console.log("📦 Raw Response Text:", text);
  console.log("🧠 Parsed JSON:", data);
  console.groupEnd();

  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status);
  }

  return data as T;
}

/* =========================
RAG TYPES
========================= */

export type ChatRole    = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export interface RAGStreamCallbacks {
  /** Called for each streamed token as it arrives */
  onToken:    (token: string) => void;
  /** Called once the stream closes cleanly */
  onDone:     () => void;
  /** Called if the server sends an error event or the fetch itself fails */
  onError:    (message: string) => void;
}

export interface RAGQueryResponse {
  answer:       string;
  chunksUsed:   number;
  chunkIndices: number[];
  sources:      string[][];
  usage: {
    prompt_tokens:     number;
    completion_tokens: number;
    total_tokens:      number;
  };
}

export interface RAGHealthResponse {
  ok:             boolean;
  collectionName: string;
  chunkCount:     number;
}

/* =========================
RAG SSE STREAMING HELPER
Can't use request() — we need the raw ReadableStream.
Mirrors the same auth + URL logic as request().
========================= */

async function streamRAG(
  path: string,
  body: object,
  callbacks: RAGStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "POST",
      headers,
      body:   JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    // network-level failure or abort
    if (err?.name === "AbortError") return;
    callbacks.onError(err?.message ?? "Network error");
    return;
  }

  if (!res.ok) {
    // try to parse an error body
    const text = await res.text().catch(() => "");
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(text)?.error ?? msg; } catch { /* ignore */ }
    callbacks.onError(msg);
    return;
  }

  // ── read SSE line by line ──
  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer      = lines.pop() ?? ""; // keep incomplete trailing line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const raw = line.slice(6).trim();
        if (!raw || raw === ": ping") continue;

        let parsed: { token?: string; done?: boolean; error?: string };
        try { parsed = JSON.parse(raw); }
        catch { continue; }

        if (parsed.error) { callbacks.onError(parsed.error); return; }
        if (parsed.done)  { callbacks.onDone();              return; }
        if (parsed.token) { callbacks.onToken(parsed.token);         }
      }
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") callbacks.onError(err?.message ?? "Stream read error");
  } finally {
    reader.releaseLock();
  }
}

/* =========================
API METHODS
========================= */

export const api = {

  /* =========================
  AUTH
  ========================= */

  login(email: string, password: string) {
    return request<{ user: AuthUser; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },
  
  signup(payload: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    jobTitle?: string;
    phone?: string;
    industry?: string;
  }) {
    return request<{ user: AuthUser; token: string }>(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  me() {
    return request<{ user: AuthUser }>("/api/auth/me");
  },

  /* =========================
  COMPANIES
  ========================= */

  getCompanies() {
    return request<{ companies: Company[] }>("/api/companies");
  },

  getCompany(id: string) {
    return request<{ company: Company }>(`/api/companies/${id}`);
  },

  /* =========================
  QUICKBOOKS
  ========================= */

  syncQuickBooks(
    companyId?: string,
    dateRange?: { startDate?: string; endDate?: string }
  ) {
    const body = {
      ...(companyId ? { companyId } : {}),
      ...(dateRange?.startDate ? { startDate: dateRange.startDate } : {}),
      ...(dateRange?.endDate ? { endDate: dateRange.endDate } : {}),
    };

    return request<{
      ok: boolean;
      message: string;
      companyId: string;
      companyName?: string;
      lastSync?: string;
      realmId?: string;
      figures?: Record<string, number>;
      ratios?: Record<string, number>;
      rawLineCounts?: Record<string, number>;
      covenantsUpdated?: number;
      dateRange?: { startDate: string; endDate: string };
    }>("/api/sync/quickbooks", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /* =========================
  LOAN AGREEMENT
  ========================= */

  uploadLoanAgreement(companyId: string, file: File) {
    if (!companyId) throw new Error("companyId is required");
    if (!file)      throw new Error("file is required");

    const formData = new FormData();
    formData.append("file", file, file.name);

    return request<{
      success: boolean;
      message: string;
      data: any;
    }>(
      `/api/companies/${encodeURIComponent(companyId)}/loan-agreement`,
      {
        method: "POST",
        body:   formData,
      }
    );
  },

  getLoanAgreement(companyId: string) {
    return request<{ loanAgreement: any }>(
      `/api/companies/${companyId}/loan-agreement`
    );
  },

  /* =========================
  QUICKBOOKS CONNECT
  ========================= */

  getQuickBooksConnectUrl(companyId?: string, returnPath?: string) {
    const params = new URLSearchParams();
    if (companyId)  params.set("companyId",  companyId);
    if (returnPath) params.set("returnPath", returnPath);

    return request<{ authorizationUrl: string }>(
      `/api/integrations/quickbooks/connect${params.toString() ? `?${params}` : ""}`
    );
  },

  getQuickBooksStatus(companyId?: string) {
    const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";

    return request<{
      connected:      boolean;
      realmId?:       string;
      connectedAt?:   string;
      lastSync?:      string;
      syncedAt?:      string;
      lastSyncError?: string;
    }>(`/api/integrations/quickbooks/status${qs}`);
  },

  disconnectQuickBooks(companyId?: string) {
    return request<{ ok: boolean; message: string }>(
      "/api/integrations/quickbooks/disconnect",
      {
        method: "DELETE",
        body:   JSON.stringify(companyId ? { companyId } : {}),
      }
    );
  },

  saveQuickBooksManual(
    companyId: string | undefined,
    payload: { realmId: string; refreshToken: string }
  ) {
    const body = companyId ? { companyId, ...payload } : { ...payload };

    return request<{ ok: boolean; message: string }>(
      "/api/integrations/quickbooks/manual",
      {
        method: "POST",
        body:   JSON.stringify(body),
      }
    );
  },

  /* =========================
  RAG — LOAN AGREEMENT CHAT
  ========================= */

  /**
   * Check whether a ChromaDB collection exists for this company
   * and return its chunk count.
   *
   * GET /api/rag/:companyId/health
   */
  ragHealth(companyId: string) {
    return request<RAGHealthResponse>(
      `/api/rag/${encodeURIComponent(companyId)}/health`
    );
  },

  /**
   * Stream a hybrid RAG answer (semantic + BM25 + RRF) as SSE tokens.
   * Returns an AbortController so the caller can cancel mid-stream.
   *
   * POST /api/rag/:companyId/query/stream
   *
   * @example
   * const { abort } = api.ragStream(
   *   companyId,
   *   { query, companyName, conversationHistory },
   *   {
   *     onToken: (t)  => setAnswer(a => a + t),
   *     onDone:  ()   => setStreaming(false),
   *     onError: (msg) => setError(msg),
   *   }
   * );
   * // cancel:  abort();
   */
  ragStream(
    companyId:   string,
    payload: {
      query:                string;
      companyName?:         string;
      conversationHistory?: ChatMessage[];
    },
    callbacks: RAGStreamCallbacks
  ): { abort: () => void } {
    const controller = new AbortController();

    // fire-and-forget — errors surface via callbacks.onError
    streamRAG(
      `/api/rag/${encodeURIComponent(companyId)}/query/stream`,
      {
        query:               payload.query,
        companyName:         payload.companyName         ?? "",
        conversationHistory: payload.conversationHistory ?? [],
      },
      callbacks,
      controller.signal
    );

    return { abort: () => controller.abort() };
  },

  /**
   * Non-streaming RAG query — returns full answer as JSON.
   * Useful for debugging or contexts where SSE isn't available.
   *
   * POST /api/rag/:companyId/query
   */
  ragQuery(
    companyId: string,
    payload: {
      query:                string;
      companyName?:         string;
      conversationHistory?: ChatMessage[];
    }
  ) {
    return request<RAGQueryResponse>(
      `/api/rag/${encodeURIComponent(companyId)}/query`,
      {
        method: "POST",
        body:   JSON.stringify({
          query:               payload.query,
          companyName:         payload.companyName         ?? "",
          conversationHistory: payload.conversationHistory ?? [],
        }),
      }
    );
  },

triggerCovenantAlerts(companyId: string) {
  return request<CovenantAlertResponse>(
    "/api/alerts/covenants/trigger",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyId }),
    }
  );
},
getCovenantAlerts(companyId: string) {
  return request<{ alerts: any[] }>(
    `/api/alerts/covenants/${companyId}`
  );
}
};