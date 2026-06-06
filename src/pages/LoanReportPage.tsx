import { ThemeToggle } from "@/components/theme-toggle";
import type { ChatMessage } from "@/lib/api";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Company } from "@/lib/mock-data";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Hash,
  Layers,
  LogOut,
  MessageSquare,
  Printer,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useParams } from "wouter";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type LoanSection = { heading: string; content: string };
type LoanFormula = {
  name: string;
  formula?: string;
  expression?: string;
  description?: string;
  threshold?: number | string;
  operator?: string;
  unit?: string;
};
type LoanReport = {
  title?: string;
  summary?: string;
  sections?: LoanSection[];
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function LoanReportPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<number>(-1);

  /* chat state */
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api
      .getCompany(companyId)
      .then((res) => { setCompany(res.company); setError(null); })
      .catch((err) => { console.error(err); setError(err.message || "Failed to load company"); })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, streamingContent]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatOpen]);

  useEffect(() => { return () => { abortRef.current?.(); }; }, []);

  const loan = company?.loanAgreement;
  const report: LoanReport | undefined = useMemo(() => {
    if (!loan) return undefined;
    if (typeof loan.report === "string") {
      return {
        title: "Loan Agreement Report",
        summary: loan.summary || loan.report,
        sections: [{ heading: "Extracted Report", content: loan.report }],
      };
    }
    return loan.report;
  }, [loan]);

  const sections = report?.sections ?? [];
  const activeContent = activeSection >= 0 ? sections[activeSection] : null;
  const handleLogout = () => { logout(); setLocation("/login"); };

  /* ── SEND CHAT ── */
  const handleSend = () => {
    const q = input.trim();
    if (!q || chatLoading || !companyId) return;
    abortRef.current?.();
    abortRef.current = null;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: q };
    const historyForRequest = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    setStreamingContent("");
    setChatLoading(true);

    const { abort } = api.ragStream(
      companyId,
      { query: q, companyName: company?.name ?? "", conversationHistory: historyForRequest },
      {
        onToken: (token) => { setStreamingContent((prev) => prev + token); },
        onDone: () => {
          setStreamingContent((buffered) => {
            setMessages((prev) => [...prev, { role: "assistant", content: buffered }]);
            return "";
          });
          setChatLoading(false);
          abortRef.current = null;
        },
        onError: (errMsg) => {
          setStreamingContent("");
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}` }]);
          setChatLoading(false);
          abortRef.current = null;
        },
      }
    );
    abortRef.current = abort;
  };

  /* ─── LOADING / ERROR ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-slate-400 text-sm">
        Loading report…
      </div>
    );
  }
  if (error || !company) {
    return (
      <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-slate-100 text-sm">
        {error || "No company found"}
      </div>
    );
  }

  /* ─── MAIN RENDER ─── */
  return (
    <div className="h-screen bg-[#0c0f14] text-slate-100 flex flex-col overflow-hidden">

      {/* ── NAV (matches dashboard exactly) ── */}
      <nav className="sticky top-0 bg-[#0c0f14]/95 backdrop-blur-md border-b border-slate-800 z-30 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setLocation(`/company/${company.companyId ?? (company as any).id}`)}
              className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
            <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs flex-shrink-0 border border-slate-600">
              CW
            </div>
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">
                Loan Agreement Report
              </h1>
              <p className="text-[10px] text-white/40 leading-tight">{company.name}</p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800">
              <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-slate-300 font-medium leading-tight">Parsed</p>
            </div>
            <ThemeToggle />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-700 bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-700 bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── 3-COLUMN BODY ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

        {/* LEFT SIDEBAR */}
        <aside className="w-[220px] flex-shrink-0 border-r border-slate-800 bg-[#0c0f14] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
            <FileText className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contents</span>
          </div>
          <nav className="overflow-y-auto flex-1 py-2">
            <button
              onClick={() => setActiveSection(-1)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[12.5px] transition-all border-l-2 ${
                activeSection === -1
                  ? "border-l-indigo-500 bg-indigo-500/8 text-indigo-300 font-medium"
                  : "border-l-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <BookOpen className="w-3 h-3 flex-shrink-0" />
              Executive Summary
            </button>
            {sections.map((section, i) => (
              <button
                key={`${section.heading}-${i}`}
                onClick={() => setActiveSection(i)}
                className={`w-full flex items-start gap-2 px-4 py-2.5 text-left text-[12.5px] transition-all border-l-2 leading-snug ${
                  activeSection === i
                    ? "border-l-indigo-500 bg-indigo-500/8 text-indigo-300 font-medium"
                    : "border-l-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span className="text-[10px] font-mono text-slate-600 mt-0.5 flex-shrink-0">{i + 1}.</span>
                {section.heading}
              </button>
            ))}
          </nav>
        </aside>

        {/* CENTER READER */}
        <section className="flex-1 overflow-y-auto px-8 py-8 min-w-0">
          <div className="max-w-[780px] mx-auto space-y-6">

            {/* Title block */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                  Credit documentation review
                </p>
                <h1 className="text-2xl font-bold text-white leading-tight mb-1">
                  {report?.title || "Loan Agreement Report"}
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  {loan?.sourceFileName || "No source file recorded"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" /> Parsed
              </div>
            </div>

            {/* Section content */}
            <AnimatePresence mode="wait">
              {activeContent ? (
                <motion.article
                  key={`section-${activeSection}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-6"
                >
                  <h2 className="text-base font-semibold text-slate-100 mb-4 pb-3 border-b border-slate-800">
                    {activeContent.heading}
                  </h2>
                  <p className="text-[13.5px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                    {activeContent.content || "No content available for this section."}
                  </p>
                </motion.article>
              ) : (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Summary card */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
                    <h2 className="text-base font-semibold text-slate-100 mb-4 pb-3 border-b border-slate-800">
                      Executive Summary
                    </h2>
                    <p className="text-[13.5px] leading-relaxed text-slate-400">
                      {report?.summary || loan?.summary || "No summary available for this loan agreement."}
                    </p>
                  </div>

                  {/* Metric cards — matching dashboard stat row style */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Borrower",  value: company.name,                     icon: <Building2 className="w-3.5 h-3.5 text-indigo-400" /> },
                      { label: "Sections",  value: sections.length,                  icon: <Layers className="w-3.5 h-3.5 text-indigo-400" /> },
                      { label: "Formulas",  value: loan?.formulas?.length ?? 0,       icon: <Calculator className="w-3.5 h-3.5 text-indigo-400" /> },
                      { label: "Parsed",    value: loan?.parsedAt ? new Date(loan.parsedAt).toLocaleDateString() : "N/A", icon: <Clock className="w-3.5 h-3.5 text-indigo-400" /> },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-2"
                      >
                        {stat.icon}
                        <span className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</span>
                        <span className="text-lg font-semibold text-slate-100 truncate">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* RIGHT INSPECTOR */}
        <aside className="w-[268px] flex-shrink-0 border-l border-slate-800 bg-slate-900/20 flex flex-col overflow-hidden">

          {/* Document details — pinned, never scrolls */}
          <div className="p-4 border-b border-slate-800 flex-shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Document Details
            </h3>
            <dl className="space-y-3">
              {[
                { label: "Source file",    value: loan?.sourceFileName || "Not available" },
                { label: "Parsed at",      value: loan?.parsedAt ? new Date(loan.parsedAt).toLocaleString() : "N/A" },
                { label: "Vector chunks",  value: String(loan?.chunkCount ?? 0) },
                { label: "Reference ID",   value: (loan?.report as any)?.referenceId || "N/A" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-600 mb-0.5">{label}</dt>
                  <dd className="text-xs text-slate-400 font-mono break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Covenant Formulas — scrolls independently */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Covenant Formulas
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">

            {loan?.formulas?.length ? (
              <div className="space-y-2.5">
                {(loan.formulas as LoanFormula[]).map((formula, i) => {
                  const isMax = formula.operator === "<=" || formula.operator === "<";
                  const thresholdColor = isMax ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                  return (
                    <motion.div
                      key={`${formula.name}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <p className="text-[12px] font-medium text-slate-200 leading-snug">{formula.name}</p>
                        {formula.threshold !== undefined && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${thresholdColor}`}>
                            {formula.operator} {formula.threshold}{formula.unit === "x" ? "x" : formula.unit === "%" ? "%" : formula.unit === "$" ? "$" : ""}
                          </span>
                        )}
                      </div>
                      <code className="block text-[11px] font-mono text-indigo-300 bg-indigo-950/50 border border-indigo-900/30 rounded px-2 py-1.5 mb-1.5 leading-relaxed">
                        {formula.formula || formula.expression || "N/A"}
                      </code>
                      {formula.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{formula.description}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center">
                <Hash className="w-4 h-4 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 italic">No formulas were extracted from this agreement.</p>
              </div>
            )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── CHAT DRAWER ── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed bottom-[52px] left-0 right-0 z-40 h-[400px] bg-[#0c0f14] border-t border-slate-700 shadow-2xl flex flex-col"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Ask about this Agreement</p>
                  <p className="text-[10px] text-slate-500">RAG-powered · hybrid semantic + BM25</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-md border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            {messages.length === 0 && !chatLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm text-center px-6">
                <MessageSquare className="w-7 h-7 opacity-25 mb-1" />
                <span>Ask anything about the loan agreement.</span>
                <span className="text-xs text-slate-600">e.g. "What is the interest rate?" or "List all covenants."</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 px-1">
                      {msg.role === "user" ? "You" : "Assistant"}
                    </span>
                    {msg.role === "user" ? (
                      <div className="max-w-[75%] px-3.5 py-2.5 rounded-xl rounded-br-sm text-[13px] leading-relaxed bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[80%] px-3.5 py-3 rounded-xl rounded-bl-sm bg-slate-900 border border-slate-800 text-slate-300 text-[13px] leading-relaxed prose-chat">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-300 text-[13px] leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                            ul: ({ children }) => <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-400">{children}</ul>,
                            ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-400">{children}</ol>,
                            li: ({ children }) => <li className="text-slate-300 text-[13px] leading-relaxed pl-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-base font-bold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-[14px] font-semibold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[13px] font-semibold text-slate-200 mt-2 mb-1 first:mt-0">{children}</h3>,
                            code: ({ children }) => <code className="font-mono text-[11px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">{children}</code>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 text-slate-400 italic">{children}</blockquote>,
                            hr: () => <hr className="border-slate-700 my-3" />,
                          }}
                        >
                          {msg.content.replace(/\s*\[CHUNK\s*\d+\]/gi, "")}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 px-1">Assistant</span>
                    <div className="max-w-[80%] px-3.5 py-3 rounded-xl rounded-bl-sm bg-slate-900 border border-slate-800 text-slate-300 text-[13px] leading-relaxed">
                      {streamingContent ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-300 text-[13px] leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                            ul: ({ children }) => <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-400">{children}</ul>,
                            ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-400">{children}</ol>,
                            li: ({ children }) => <li className="text-slate-300 text-[13px] leading-relaxed pl-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-base font-bold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-[14px] font-semibold text-slate-100 mt-3 mb-1.5 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[13px] font-semibold text-slate-200 mt-2 mb-1 first:mt-0">{children}</h3>,
                            code: ({ children }) => <code className="font-mono text-[11px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">{children}</code>,
                          }}
                        >
                          {streamingContent.replace(/\s*\[CHUNK\s*\d+\]/gi, "")}
                        </ReactMarkdown>
                      ) : (
                        <span className="flex gap-1 items-center h-4">
                          {[0, 0.2, 0.4].map((delay, j) => (
                            <span
                              key={j}
                              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                              style={{ animationDelay: `${delay}s` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-800 flex-shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={chatLoading}
                placeholder="Ask a question about this loan agreement…"
                className="flex-1 h-9 bg-slate-900 border border-slate-700 rounded-md px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={chatLoading || !input.trim()}
                className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHAT BAR (toggle) ── */}
      <div
        onClick={() => setChatOpen((v) => !v)}
        className="fixed bottom-0 left-0 right-0 z-50 h-[52px] bg-[#0c0f14] border-t border-slate-800 flex items-center gap-3 px-5 cursor-pointer hover:bg-slate-900/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="flex-1 text-sm font-medium text-slate-300">Ask about this Loan Agreement</span>
        <span className="text-xs text-slate-600 hidden sm:block">RAG · Hybrid Search</span>
        <span className="text-slate-500">
          {chatOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </span>
      </div>

    </div>
  );
}
