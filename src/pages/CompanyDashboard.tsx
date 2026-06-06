import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  FileText,
  Link2,
  RefreshCw,
  Unlink,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis, YAxis
} from "recharts";
import { Link, useLocation, useRoute } from "wouter";

import { QuickBooksDataPanel, type QuickBooksSyncPayload } from "@/components/QuickBooksDataPanel";
import { QuickBooksSyncResultDialog } from "@/components/QuickBooksSyncResultDialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError, subscribeToCovenantAlerts } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CompanyAlert } from "@/lib/mock-data";
import { Company } from "@/lib/mock-data";
import { companyToQbPayload, hasQuickBooksFigures } from "@/lib/quickbooks-display";
import { useQueryClient } from "@tanstack/react-query";
export default function CompanyDashboard({ isAdminView = false }: { isAdminView?: boolean }) {
  const [matchId, params] = useRoute("/company/:id");
  const [matchDash] = useRoute("/dashboard");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  
  const companyId =
    user?.role === "company"
      ? user.companyId ?? ""
      : (matchId && params?.id) || "";
  const { data: company, isLoading, isError } = useCompany(companyId);

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCovenantId, setSelectedCovenantId] = useState<string>("");
   // adjust path if needed
  const [loanAgreement, setLoanAgreement] = useState<Company["loanAgreement"] | null>(null);
  
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterStep, setLetterStep] = useState<1 | 2>(1);
  const [letterRecipient, setLetterRecipient] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loanFile, setLoanFile] = useState<File | null>(null);
  const [isLoanReportOpen, setIsLoanReportOpen] = useState(false);
  const [isUploadingLoanAgreement, setIsUploadingLoanAgreement] = useState(false);
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false);
  const [isSyncResultOpen, setIsSyncResultOpen] = useState(false);
  const [syncResultPayload, setSyncResultPayload] = useState<QuickBooksSyncPayload | null>(null);
  const [liveQbData, setLiveQbData] = useState<QuickBooksSyncPayload | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRealmId, setManualRealmId] = useState("");
  const [manualRefreshToken, setManualRefreshToken] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [syncStartDate, setSyncStartDate] = useState("");
  const [syncEndDate, setSyncEndDate] = useState("");
  const [alerts, setAlerts] = useState<CompanyAlert[]>([]);
  const returnPath = useMemo(
  () => (isAdminView ? `/company/${companyId}` : "/dashboard"),
  [isAdminView, companyId]
);

/* -------------------- QB OAuth redirect handling -------------------- */
useEffect(() => {
  if (!company) return;

  const params = new URLSearchParams(window.location.search);
  const qb = params.get("qb");

  if (qb === "connected") {
    toast({
      title: "QuickBooks connected",
      description: "Your company is linked. Run a sync to pull financial data.",
    });

    setIsFinancialsOpen(true);
    queryClient.invalidateQueries({ queryKey: ["company", companyId] });
  }

  if (qb === "error") {
    const detail = params.get("qb_error");

    toast({
      title: "QuickBooks connection failed",
      description: detail
        ? decodeURIComponent(detail)
        : "Authorization was not completed.",
      variant: "destructive",
    });
  }

  window.history.replaceState({}, "", returnPath);
}, [company, companyId, returnPath, toast, queryClient]);

/* -------------------- Initialize company-dependent state -------------------- */
useEffect(() => {
  if (!company) return;

  setAlerts(company.alerts ?? []);
  setLoanAgreement(company.loanAgreement ?? null);

  // always sync covenant properly
  setSelectedCovenantId(
    company.covenants?.[0]?.id || ""
  );

}, [company]);
/* ------------------ alerts --------------------------- */
useEffect(() => {
  const socket = subscribeToCovenantAlerts(companyId);

  socket.on("covenant-alerts", (newAlerts) => {
    console.log("🔥 ALERTS RECEIVED:", newAlerts);
    setAlerts(newAlerts);
  });

  socket.onAny((event, data) => {
    console.log("📡 SOCKET EVENT:", event, data);
  });

  return () => {
    socket.off("covenant-alerts");
    socket.offAny();
  };
}, [companyId]);
/* -------------------- Loading / error states -------------------- */
if (isLoading) {
  return (
    <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-slate-400">
      Loading company data…
    </div>
  );
}

if (isError || !company) {
  return (
    <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-slate-100">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">
          {isError ? "Failed to load company" : "Company not found"}
        </h2>
        <Button
          variant="outline"
          onClick={() =>
            setLocation(user?.role === "admin" ? "/admin" : "/")
          }
        >
          Go Back
        </Button>
      </div>
    </div>
  );
}

/* -------------------- Derived state -------------------- */
const canSync = Boolean(company.quickbooks?.canSync);
const useOauth = company.quickbooks?.connectionSource === "oauth";
const hasConnectionSource = Boolean(company.quickbooks?.connectionSource);
const quickBooksError = company.quickbooks?.lastSyncError ?? "";
const needsQuickBooksReconnect =
  Boolean(quickBooksError) &&
  /refresh token|token type|invalid_grant|reconnect quickbooks/i.test(quickBooksError);

const displayQbData = liveQbData ?? companyToQbPayload(company);
const hasQbData = hasQuickBooksFigures(displayQbData);

const showConnectButton = !useOauth || needsQuickBooksReconnect;

const connectionLabel =
  company.quickbooks?.connectionSource === "env"
    ? "Using shared QuickBooks connection"
    : "Not connected";

const selectedCovenant =
  company.covenants?.find((c) => c.id === selectedCovenantId) ?? null;

const breachCovenant =
  company.covenants?.find((c) => c.status === "BREACH") ?? null;

/* -------------------- QuickBooks Connect -------------------- */
const handleConnectQuickBooks = async () => {
  setIsConnecting(true);
  let popup: Window | null = null;

  try {
    popup = window.open(
      "about:blank",
      "quickbooks_oauth",
      "toolbar=0,location=0,menubar=0,width=800,height=700"
    );

    if (popup) {
      try {
        popup.document.title = "QuickBooks OAuth";
        popup.document.body.innerHTML =
          "<p style='font-family: system-ui; padding:1rem;'>Connecting to QuickBooks...</p>";
      } catch {}
    }

    const { authorizationUrl } = await api.getQuickBooksConnectUrl(
      user?.role === "admin" ? companyId : undefined,
      returnPath
    );

    if (!authorizationUrl) {
      throw new Error("QuickBooks authorization URL not returned.");
    }

    if (popup && !popup.closed) {
      popup.location.assign(authorizationUrl);
      popup.focus();
    } else {
      toast({
        title: "Popup blocked",
        description: "Redirecting in this tab instead.",
      });
      window.location.assign(authorizationUrl);
    }

    setIsManualModalOpen(true);
  } catch (err) {
    if (popup && !popup.closed) popup.close();

    if (
      err instanceof ApiError &&
      err.message.startsWith("QuickBooks is not configured")
    ) {
      setIsManualModalOpen(true);
      toast({
        title: "OAuth not configured",
        description: "Manual token entry is available.",
      });
    } else {
      toast({
        title: "Could not start QuickBooks",
        description:
          err instanceof ApiError ? err.message : "Connection failed",
        variant: "destructive",
      });
    }
  } finally {
    setIsConnecting(false);
  }
};

/* -------------------- Manual OAuth completion -------------------- */
const handleCompletedAuth = async () => {
  setIsSavingManual(true);

  try {
    await api.saveQuickBooksManual(
      user?.role === "admin" ? companyId : undefined,
      {
        realmId: manualRealmId,
        refreshToken: manualRefreshToken,
      }
    );

    await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    await queryClient.invalidateQueries({ queryKey: ["companies"] });

    toast({
      title: "QuickBooks connected",
      description: "Tokens saved successfully.",
    });

    setIsManualModalOpen(false);
    setManualRealmId("");
    setManualRefreshToken("");
  } catch (err) {
    toast({
      title: "Save failed",
      description:
        err instanceof ApiError ? err.message : "Could not save tokens",
      variant: "destructive",
    });
  } finally {
    setIsSavingManual(false);
    setIsConnecting(false);
  }
};

/* -------------------- Disconnect -------------------- */
const handleDisconnectQuickBooks = async () => {
  try {
    await api.disconnectQuickBooks(
      user?.role === "admin" ? companyId : undefined
    );

    await queryClient.invalidateQueries({ queryKey: ["company", companyId] });

    toast({ title: "QuickBooks disconnected" });
  } catch (err) {
    toast({
      title: "Disconnect failed",
      description: err instanceof ApiError ? err.message : "Try again",
      variant: "destructive",
    });
  }
};

/* -------------------- Sync -------------------- */
const handleSync = async () => {
  setIsSyncing(true);

  try {
    const result = await api.syncQuickBooks(
      user?.role === "admin" ? companyId : undefined,
      {
        startDate: syncStartDate || undefined,
        endDate: syncEndDate || undefined,
      }
    );

    await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    await queryClient.invalidateQueries({ queryKey: ["companies"] });

    const payload: QuickBooksSyncPayload = {
      companyName: result.companyName,
      lastSync: result.lastSync,
      realmId: result.realmId,
      figures: result.figures,
      ratios: result.ratios,
      rawLineCounts: result.rawLineCounts,
      covenantsUpdated: result.covenantsUpdated,
    };

    setLiveQbData(payload);
    setSyncResultPayload(payload);
    setIsSyncResultOpen(true);
    setIsFinancialsOpen(true);
  } catch (err) {
    toast({
      title: "Sync Failed",
      description:
        err instanceof ApiError
          ? err.message
          : "Could not sync QuickBooks data.",
      variant: "destructive",
    });
  } finally {
    setIsSyncing(false);
  }
};

/* -------------------- Alerts toggle -------------------- */


const handleLoanFileChange = (file: File | null) => {
  setLoanFile(file);
};

const handleUploadLoanAgreement = async () => {
  if (!loanFile) {
    toast({ title: "Select a PDF first", variant: "destructive" });
    return;
  }
  if (!company) return;

  setIsUploadingLoanAgreement(true);
  try {
    // Single call: upload + full processing pipeline
    await api.uploadLoanAgreement(companyId, loanFile);

    // Fetch the final processed agreement
    const { loanAgreement: parsed } = await api.getLoanAgreement(companyId);
    setLoanAgreement(parsed);
    await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    toast({
      title: "Loan agreement parsed",
      description: "The report and formulas have been saved to the company record.",
    });
    setIsUploadModalOpen(false);
    setLoanFile(null);
  } catch (err) {
    toast({
      title: "Upload failed",
      description: err instanceof ApiError ? err.message : "Could not parse the loan agreement.",
      variant: "destructive",
    });
  } finally {
    setIsUploadingLoanAgreement(false);
  }
};

const handleOpenLoanReport = async () => {
  setIsLoanReportOpen(true);
  if (!loanAgreement && company) {
    try {
      const response = await api.getLoanAgreement(companyId);
      setLoanAgreement(response.loanAgreement);
    } catch (err) {
      toast({
        title: "Cannot load report",
        description: err instanceof ApiError ? err.message : "Failed to load loan agreement report.",
        variant: "destructive",
      });
    }
  }
};

/* -------------------- Letter -------------------- */
const letterTemplate = (() => {
  const recipient = letterRecipient.trim() || "Lender";
  const breachSummary = breachCovenant
    ? `${breachCovenant.name} is currently ${breachCovenant.status.toLowerCase()} at ${breachCovenant.value}, against a threshold of ${breachCovenant.threshold}.`
    : "All tracked covenants are currently within compliance thresholds.";

  return [
    `Dear ${recipient},`,
    "",
    `This letter summarizes the current covenant position for ${company.name}.`,
    "",
    breachSummary,
    `The dashboard was last updated ${company.lastSync}.`,
    "",
    "Please let us know if you need supporting schedules or additional detail.",
    "",
    "Sincerely,",
    company.name,
  ].join("\n");
})();

const handleGenerateLetter = () => {
  if (!letterRecipient.trim()) {
    toast({ title: "Recipient required", variant: "destructive" });
    return;
  }
  setLetterStep(2);
};

const downloadReport = () => {
  toast({ title: "Report Downloaded" });
};

/* -------------------- Chart data -------------------- */
const getChartData = () => {
  if (!selectedCovenant) return [];

  const historyLen = selectedCovenant.history?.length ?? 0;

  const data: { month: string; history: number | null; projection: number | null }[] =
    selectedCovenant.history?.map((h, i) => ({
      month: h.month,
      history: h.value,
      projection: i === historyLen - 1 ? h.value : null,
    })) ?? [];

  if (selectedCovenant.projection?.length) {
    selectedCovenant.projection.forEach((p) => {
      data.push({
        month: p.month,
        history: null,
        projection: p.value,
      });
    });
  }

  return data;
};

  return (
    <div className="institutional-dashboard institutional-company min-h-screen bg-[#f4f1ea] text-slate-900 relative pb-20">
      {isAdminView && (
        <div className="bg-slate-800/80 text-slate-300 text-sm py-2 px-4 flex justify-between items-center z-50 relative border-b border-slate-700">
          <span>Viewing as Admin &mdash; {company.name}</span>
          <Link href="/admin" className="hover:text-white flex items-center text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to Admin
          </Link>
        </div>
      )}

      {breachCovenant && (
        <div className="w-full bg-red-950/50 border-b border-red-900/50 text-red-200 px-4 py-2.5 text-center text-sm font-medium z-40 relative">
          Covenant breach: {breachCovenant.name} — immediate review required.
        </div>
      )}

      <nav className="sticky top-0 bg-[#0c0f14]/95 backdrop-blur-md border-b border-slate-800 z-30 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">

          {/* LEFT — back + logo + company name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link href={user?.role === 'admin' ? "/admin" : "/"} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
            <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs flex-shrink-0 border border-slate-600">
              CW
            </div>
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">{company.name}</h1>
              <p className="text-[10px] text-white/40 leading-tight">Covenant Dashboard</p>
            </div>
          </div>

          {/* CENTER — QuickBooks sync status + prominent sync button */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  hasQbData ? "bg-emerald-500" : canSync ? "bg-slate-400" : "bg-amber-500"
                }`}
              />
              <div>
                <p className="text-[10px] text-slate-500 leading-tight">QuickBooks</p>
                <p className="text-xs text-slate-300 font-medium leading-tight">
                  {needsQuickBooksReconnect
                    ? "Needs reconnect"
                    : hasQbData
                    ? `Synced ${company.lastSync}`
                    : canSync
                    ? "Ready to sync"
                    : "Not configured"}
                </p>
              </div>
            </div>
            {canSync && (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="h-9 px-4 bg-slate-100 text-slate-900 hover:bg-white rounded-md font-medium text-sm gap-2"
                data-testid="btn-sync-now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing…" : "Sync QuickBooks"}
              </Button>
            )}
            {!useOauth && canSync && (
              <Button
                variant="outline"
                onClick={handleConnectQuickBooks}
                disabled={isConnecting}
                className="h-9 border-slate-700 text-slate-300 hover:bg-slate-800 text-sm gap-2"
                data-testid="btn-connect-qb"
              >
                <Link2 className="w-3.5 h-3.5" />
                {isConnecting ? "…" : "Link OAuth"}
              </Button>
            )}
            {useOauth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectQuickBooks}
                className="h-9 text-slate-500 hover:text-slate-300"
                title="Disconnect"
              >
                <Unlink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* RIGHT — actions + avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              className="hidden sm:flex h-9 px-3 bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 text-sm gap-2"
              onClick={() => setIsUploadModalOpen(true)}
              data-testid="btn-upload-pdf"
            >
              <Upload className="w-3.5 h-3.5" /> Upload PDF
            </Button>

            <Button
              className="hidden sm:flex h-9 px-3 bg-slate-700 border-slate-700 text-slate-100 hover:bg-slate-600 text-sm gap-2"
              onClick={() => setIsLetterModalOpen(true)}
              data-testid="btn-generate-letter"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Letter
            </Button>

            <ThemeToggle />

            <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-semibold border border-slate-700 ml-1 cursor-pointer relative group text-sm flex-shrink-0">
              {company.name.charAt(0)}
              <div className="absolute top-full right-0 bg-[#0D1222] border border-white/10 rounded-xl shadow-2xl p-2 hidden group-hover:block min-w-[160px] z-50">
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <p className="text-xs text-white/70 font-medium truncate">{user?.email}</p>
                  <p className="text-[10px] text-white/40">{company.name}</p>
                </div>
                <button onClick={() => { logout(); setLocation("/login"); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-lg">
                  Sign out
                </button>
              </div>
            </div>
          </div>

        </div>
      </nav>

      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete QuickBooks Authorization</DialogTitle>
            <DialogDescription>
              We opened the QuickBooks OAuth page in a new tab. After completing OAuth (or obtaining sandbox tokens), paste the <strong>realmId</strong> and <strong>refresh token</strong> here and click "Completed auth".
            </DialogDescription>
            <DialogDescription>
              If the popup is blocked, open the Intuit Developer site in the same browser at{' '}
              <a href="https://developer.intuit.com" className="text-primary underline" target="_blank" rel="noreferrer">
                developer.intuit.com
              </a>{' '}
              to create an app and get your QuickBooks <strong>realmId</strong> and <strong>refresh token</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div>
              <label className="text-xs text-slate-400">Realm ID</label>
              <Input value={manualRealmId} onChange={(e) => setManualRealmId((e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Refresh Token</label>
              <Input value={manualRefreshToken} onChange={(e) => setManualRefreshToken((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCompletedAuth} disabled={isSavingManual || !manualRealmId || !manualRefreshToken}>{isSavingManual ? "Saving…" : "Completed auth"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-[1400px] mx-auto px-6 py-8 relative z-10 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Covenants", value: company.covenants.length },
            { label: "Passing", value: company.covenants.filter((c) => c.status === "PASS").length },
            { label: "Warning", value: company.covenants.filter((c) => c.status === "WARNING").length },
            { label: "Breach", value: company.covenants.filter((c) => c.status === "BREACH").length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 flex flex-col items-center"
            >
              <span className="text-xs text-slate-500 uppercase tracking-wide mb-1">{stat.label}</span>
              <span className="text-2xl font-semibold text-slate-100">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* QuickBooks Panel */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 grid gap-4 lg:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">QuickBooks integration</p>
            <p className="text-sm text-slate-300 mb-1">
              {hasQbData && hasConnectionSource
                ? `Synced ${company.lastSync}`
                : hasQbData && !hasConnectionSource
                ? `Last synced ${company.lastSync}. QuickBooks connection is not currently active.`
                : needsQuickBooksReconnect
                ? "QuickBooks needs a fresh authorization."
                : canSync
                ? "Ready to sync from your QuickBooks connection."
                : connectionLabel}
            </p>
            {needsQuickBooksReconnect && (
              <p className="text-sm text-amber-300">Reconnect QuickBooks, then run sync again.</p>
            )}
            {!hasQbData && canSync && (
              <p className="text-sm text-slate-500">Sync to pull revenue, debt, ratios, and other covenant inputs from QuickBooks.</p>
            )}
            {!hasQbData && !canSync && (
              <p className="text-sm text-slate-500">Connect QuickBooks or enter manual tokens to enable sync.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end items-end">
            {canSync && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-slate-500">Start</label>
                  <Input
                    type="date"
                    value={syncStartDate}
                    onChange={(event) => setSyncStartDate(event.target.value)}
                    className="h-11 w-[145px] bg-white/90 dark:bg-slate-50/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-black text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-slate-500">End</label>
                  <Input
                    type="date"
                    value={syncEndDate}
                    onChange={(event) => setSyncEndDate(event.target.value)}
                    className="h-11 w-[145px] bg-white/90 dark:bg-slate-50/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-black text-sm"
                  />
                </div>
              </div>
            )}
            {showConnectButton && (
              <Button
                variant="outline"
                onClick={handleConnectQuickBooks}
                disabled={isConnecting}
                className="h-11 text-sm"
              >
                <Link2 className="w-4 h-4" />
                {isConnecting ? "Connecting…" : "Connect QuickBooks"}
              </Button>
            )}
            {canSync && (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="h-11 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing…" : "Sync QuickBooks"}
              </Button>
            )}
          </div>
        </div>

        {/* Covenant Cards */}

{(company.covenants ?? []).map((covenant, i) => {
  const liveResult = company.covenantResults?.find(
    (r) =>
      r.name?.trim().toLowerCase() ===
      covenant.name?.trim().toLowerCase()
  );

  const mergedCovenant = {
    ...covenant,
    value: liveResult?.value ?? covenant.value,
    status: liveResult?.status ?? covenant.status,
    formulaUsed: liveResult?.formulaUsed,
  };

  const isBreach = mergedCovenant.status === "BREACH";
  const isWarning = mergedCovenant.status === "WARNING";

  const accent = isBreach
    ? "border-l-red-600"
    : isWarning
    ? "border-l-amber-500"
    : "border-l-emerald-600";

  const statusBadge = isBreach
    ? "bg-red-500/15 text-red-400 border border-red-500/30"
    : isWarning
    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";

  const thresholdLabel =
    mergedCovenant.type === "MAX"
      ? "Max threshold"
      : "Min threshold";

  return (
    <motion.div
      key={mergedCovenant.id || i}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.35 }}
      className={`rounded-lg border border-slate-800 bg-slate-900/40 p-5 border-l-4 ${accent}`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 text-base">
            {mergedCovenant.name}
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            {mergedCovenant.type === "MAX"
              ? "Maximum ratio covenant"
              : "Minimum ratio covenant"}
          </p>

          {mergedCovenant.formulaUsed && (
            <p className="text-[11px] text-slate-600 mt-1">
              Formula: {mergedCovenant.formulaUsed}
            </p>
          )}
        </div>

        <span
          className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md ${statusBadge}`}
        >
          {mergedCovenant.status}
        </span>
      </div>

      {/* VALUE + THRESHOLD */}
      <div className="flex items-end gap-6 mb-4">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            Current Value
          </p>

          <p className="text-4xl font-semibold text-slate-50 tabular-nums leading-none">
            {typeof mergedCovenant.value === "number"
              ? mergedCovenant.value.toFixed(2)
              : "N/A"}

            <span className="text-lg text-slate-400 ml-1">
              x
            </span>
          </p>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            {thresholdLabel}
          </p>

          <p className="text-2xl font-medium text-slate-300 tabular-nums leading-none">
            {mergedCovenant.threshold}

            <span className="text-base text-slate-500 ml-1">
              x
            </span>
          </p>
        </div>
      </div>

      {!isBreach && (
        <p className="text-xs text-slate-500">
          {isWarning
            ? "Approaching threshold — monitor closely"
            : "Within safe limits"}
        </p>
      )}
    </motion.div>
  );
})}

        {/* Forecast Chart */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">90-day forecast</h2>
              <p className="text-sm text-slate-500">Historical trend and projected values</p>
            </div>
            <Select value={selectedCovenantId} onValueChange={setSelectedCovenantId}>
              <SelectTrigger className="w-[250px] bg-slate-900 border-slate-700 text-slate-200">
                <SelectValue placeholder="Select covenant" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                {company.covenants.map(c => (
                  <SelectItem key={c.id} value={c.id} className="hover:bg-white/5 focus:bg-white/10">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedCovenant && (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val + 'x'}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "#0D1222", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", backdropFilter: "blur(20px)" }}
                    itemStyle={{ color: "white" }}
                  />
                  
                  <ReferenceLine 
                    y={selectedCovenant.threshold} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                  />
                  
                  <ReferenceArea 
                    y1={selectedCovenant.threshold} 
                    y2={selectedCovenant.type === 'MAX' ? Math.max(...getChartData().map(d => Math.max(d.history || 0, d.projection || 0))) + 0.5 : 0} 
                    fill="#ef4444" 
                    fillOpacity={0.08} 
                  />

                  <Line type="monotone" dataKey="history" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="projection" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3, fill: "#64748b", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">Forecasts based on recent trends. Actual results may vary.</p>
        </div>

       <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
  
  {/* ALERTS - 70% */}
  <div className="md:col-span-7 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
    
    <h2 className="text-lg font-semibold mb-4 text-slate-100">
      Alerts
    </h2>

    <div className="space-y-3">
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recent alerts to display.
        </p>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between p-3 rounded-md border border-slate-800"
          >
            {/* LEFT */}
            <div>
              <p className="font-medium text-white">
                {alert.covenantName} — {alert.value}x
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                {new Date(alert.date).toLocaleString()}
              </p>
            </div>

            {/* STATUS */}
            <span
              className={`text-xs font-medium px-2 py-1 rounded-md ${
                alert.status === "BREACH"
                  ? "bg-destructive/20 text-destructive"
                  : "bg-warning/20 text-warning"
              }`}
            >
              {alert.status}
            </span>
          </div>
        ))
      )}
    </div>
  </div>

  {/* ACTIONS - 30% */}
  <div className="md:col-span-3 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
    
    <h2 className="text-lg font-semibold mb-1 text-slate-100 flex items-center gap-2">
      <FileText className="w-4 h-4 text-slate-500" /> Documents
    </h2>

    <p className="text-sm text-muted-foreground mb-6">
      Manage compliance files
    </p>

    <div className="space-y-4 relative z-10">

      <div 
        onClick={() => setIsUploadModalOpen(true)}
        className="border border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-800/50 transition-all"
      >
        <Upload className="w-6 h-6 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-white">
          Upload Loan Agreement
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF</p>
      </div>

      <Button
        onClick={() => setIsLetterModalOpen(true)}
        variant="outline"
        className="w-full border-slate-700 h-11"
      >
        <FileText className="w-4 h-4 mr-2" />
        Generate compliance letter
      </Button>

      <Button
        variant="outline"
        onClick={downloadReport}
        className="w-full border-slate-700"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Report
      </Button>

      <Button
        onClick={handleOpenLoanReport}
        className="w-full bg-slate-700 text-white hover:bg-slate-600 h-11"
      >
        <FileText className="w-4 h-4 mr-2" />
        Loan Agreement Report
      </Button>

      <div className="h-px w-full bg-white/10 my-4" />

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Loan Agreement
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">
            Active
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Last Letter
          </span>
          <span className="text-xs text-white">
            May 12, 2025
          </span>
        </div>
      </div>

    </div>
  </div>

</div>

        <Collapsible open={isFinancialsOpen} onOpenChange={setIsFinancialsOpen} className="rounded-lg border border-slate-800 bg-slate-900/40">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-slate-800/30 transition-colors rounded-lg">
            <div className="text-left">
              <h2 className="text-lg font-semibold text-slate-100">Financial details</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Live QuickBooks figures {hasQbData ? `· updated ${company.lastSync}` : "· sync to load"}
              </p>
            </div>
            <span className="text-xs text-slate-500">{isFinancialsOpen ? "Collapse" : "Expand"}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6 border-t border-slate-800">
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {showConnectButton && (
                <Button
                  variant="outline"
                  onClick={handleConnectQuickBooks}
                  disabled={isConnecting}
                  className="bg-slate-800 text-slate-100 gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  {isConnecting ? "Connecting…" : "Connect QuickBooks"}
                </Button>
              )}
              {canSync && (
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-slate-100 text-slate-900 gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  Sync QuickBooks
                </Button>
              )}
            </div>

            {!canSync && (
              <p className="text-sm text-amber-200/80 mt-4">
                Add QuickBooks credentials to .env or use Connect QuickBooks to enable sync.
              </p>
            )}

            {canSync && !hasQbData && (
              <p className="text-sm text-slate-400 mt-4">
                Click <strong className="text-slate-200">Sync QuickBooks</strong> to pull revenue, debt, ratios, and other covenant inputs from your books.
              </p>
            )}

            {company.quickbooks?.connectionSource === "env" && (
              <p className="text-xs text-slate-500 mt-3">
                Using shared QuickBooks connection (sandbox). All synced figures below are from QuickBooks Online.
              </p>
            )}

            {hasQbData && displayQbData ? (
              <div className="mt-6">
                <QuickBooksDataPanel data={displayQbData} />
              </div>
            ) : canSync ? null : (
              <p className="text-sm text-slate-500 mt-6 py-8 text-center border border-dashed border-slate-700 rounded-lg">
                No QuickBooks data available.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <QuickBooksSyncResultDialog
        open={isSyncResultOpen}
        onOpenChange={setIsSyncResultOpen}
        payload={syncResultPayload}
      />

      {/* Modals */}
      <Dialog open={isLetterModalOpen} onOpenChange={setIsLetterModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#0D1222] border-white/10 text-white shadow-2xl shadow-black">
          {letterStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Generate Compliance Letter</DialogTitle>
                <DialogDescription className="text-muted-foreground">Create a formal notification regarding covenant status.</DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <label className="text-sm font-medium mb-3 block text-white">Recipient Name / Title</label>
                <Input 
                  placeholder="e.g. Jane Doe, CFO" 
                  value={letterRecipient} 
                  onChange={(e) => setLetterRecipient(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsLetterModalOpen(false)} className="hover:bg-white/10">Cancel</Button>
                <Button onClick={handleGenerateLetter} className="bg-indigo-600 hover:bg-indigo-700 text-white">Generate Letter</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Letter Preview</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Textarea 
                  className="min-h-[350px] font-mono text-sm bg-black/50 border-white/10 text-white/90 p-4 leading-relaxed resize-none" 
                  value={letterTemplate} 
                  readOnly 
                />
              </div>
              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button variant="ghost" onClick={() => setIsLetterModalOpen(false)} className="hover:bg-white/10">Close</Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => {
                    navigator.clipboard.writeText(letterTemplate);
                    toast({ title: "Copied to clipboard" });
                  }}>Copy Text</Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Download TXT</Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="bg-[#0D1222] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Upload Loan Agreement</DialogTitle>
            <DialogDescription className="text-muted-foreground">Upload an amended or new loan agreement for parsing.</DialogDescription>
          </DialogHeader>
          <label className="block border-2 border-dashed border-white/20 rounded-xl p-8 mt-4 text-center hover:bg-white/5 hover:border-indigo-500/50 transition-colors cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-base font-medium text-white">Select a PDF to upload</p>
            <p className="text-sm text-muted-foreground mt-2">PDF only, up to 50MB</p>
            <p className="text-sm text-slate-300 mt-3">{loanFile ? loanFile.name : "No file selected"}</p>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleLoanFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)} className="hover:bg-white/10">Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleUploadLoanAgreement}
              disabled={!loanFile || isUploadingLoanAgreement}
            >
              {isUploadingLoanAgreement ? "Uploading…" : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

   <Dialog open={isLoanReportOpen} onOpenChange={setIsLoanReportOpen}>
  <DialogContent className="bg-[#0D1222] border-white/10 text-white max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">

    {/* HEADER */}
    <DialogHeader className="shrink-0">
      <DialogTitle>Loan Agreement Report</DialogTitle>
      <DialogDescription className="text-muted-foreground">
        Preview summary of the parsed loan agreement. Open full report for detailed view.
      </DialogDescription>
    </DialogHeader>

    {/* CONTENT */}
    <div className="flex-1 overflow-y-auto pr-2 space-y-6">

      {loanAgreement ? (
        <>
          {/* FILE INFO + SUMMARY PREVIEW */}
          <div className="rounded-xl bg-slate-950/80 p-4 border border-white/10 text-sm">

            <p className="text-sm text-slate-400 mb-2">
              File: {loanAgreement.sourceFileName}
            </p>

            <p className="text-sm text-slate-400 mb-4">
              Parsed: {new Date(loanAgreement.parsedAt).toLocaleString()}
            </p>

            {/* SUMMARY instead of raw report */}
            <p className="text-sm text-slate-300 leading-relaxed">
              {loanAgreement.summary || "No summary available."}
            </p>

           {/* ACTION BUTTON */}
<div className="flex gap-2 mt-4">
  <Button
    className="bg-indigo-600 hover:bg-indigo-700 text-white"
    onClick={() => {
      setIsLoanReportOpen(false);

      const id = company?.companyId ?? (company as any)?.id;

      if (!id) {
        console.error("Missing companyId (both companyId and id are undefined)", company);
        return;
      }

      setLocation(`/loan-report/${id}`);
    }}
  >
    Open Full Report
  </Button>
</div>

          </div>

          {/* FORMULAS */}
          {loanAgreement.formulas && loanAgreement.formulas.length > 0 ? (
            <div className="space-y-3">

              <h3 className="text-base font-semibold">
                Extracted Formulas
              </h3>

              <div className="space-y-3">
                {loanAgreement.formulas.map((formula, index) => {
                  const statusColor =
                    formula.operator === "<=" || formula.operator === "<"
                      ? "text-amber-400"
                      : "text-emerald-400";

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-semibold text-white">
                          {formula.name}
                        </p>
                        {formula.threshold !== undefined && (
                          <span className={`text-xs font-mono px-2 py-0.5 rounded bg-slate-800 ${statusColor}`}>
                            {formula.operator} {formula.threshold}{formula.unit === "x" ? "x" : formula.unit === "%" ? "%" : formula.unit === "$" ? ` (${formula.unit})` : ""}
                          </span>
                        )}
                      </div>

                     <p className="text-xs font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-900/40 rounded px-2 py-1 mb-2">
  {formula.expression || "N/A"}
</p>

                      {formula.description && (
                        <p className="text-xs text-slate-400">
                          {formula.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
              No formulas were extracted from this agreement.
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          No loan agreement report is available yet. Upload a PDF and parse it to generate the report.
        </div>
      )}

    </div>

    {/* FOOTER */}
    <DialogFooter className="shrink-0 mt-4">
      <Button
        className="bg-slate-700 hover:bg-slate-600 text-white"
        onClick={() => setIsLoanReportOpen(false)}
      >
        Close
      </Button>
    </DialogFooter>

  </DialogContent>
</Dialog>
    </div>
  );
}
