import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCompanies } from "@/hooks/use-companies";
import { useAuth } from "@/lib/auth";
import { Company, CovenantStatus } from "@/lib/mock-data";
import { AnimatePresence, motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart2,
    Bell,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Cpu,
    Database,
    DollarSign,
    Eye,
    FileText,
    LayoutDashboard,
    LogOut,
    Mail,
    Minus,
    RefreshCw,
    Settings,
    ShieldAlert,
    TrendingUp,
    User
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const COMPANY_META: Record<string, { industry: string; email: string; sector: string; founded: string; aum: string; debtFacility: string }> = {
  acme:    { industry: "Manufacturing",  email: "cfo@acme.com",    sector: "Industrials",    founded: "1998", aum: "$120M", debtFacility: "$49.3M" },
  vertex:  { industry: "Manufacturing",  email: "cfo@vertex.com",  sector: "Industrials",    founded: "2005", aum: "$85M",  debtFacility: "$38.1M" },
  cascade: { industry: "Logistics",      email: "cfo@cascade.com", sector: "Transportation", founded: "2011", aum: "$200M", debtFacility: "$91.2M" },
  summit:  { industry: "Healthcare",     email: "cfo@summit.com",  sector: "Healthcare",     founded: "2003", aum: "$155M", debtFacility: "$67.4M" },
};

function getWorstStatus(company: Company): CovenantStatus {
  const statuses = company.covenants.map(c => c.status);
  if (statuses.includes("BREACH")) return "BREACH";
  if (statuses.includes("WARNING")) return "WARNING";
  return "PASS";
}

function StatusBadge({ status }: { status: CovenantStatus }) {
  const cfg = {
    BREACH:  { cls: "bg-red-500/10 text-red-400 border-red-500/20",     icon: ShieldAlert },
    WARNING: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertTriangle },
    PASS:    { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function CovenantRow({ covenant }: { covenant: Company["covenants"][0] }) {
  const fillPercent = covenant.type === "MAX"
    ? Math.min((covenant.value / covenant.threshold) * 100, 120)
    : Math.min((covenant.threshold / covenant.value) * 100, 120);

  const barColor = covenant.status === "BREACH" ? "bg-red-500" : covenant.status === "WARNING" ? "bg-amber-400" : "bg-emerald-400";
  const TrendIcon = covenant.status === "BREACH" ? TrendingUp : covenant.status === "WARNING" ? TrendingUp : Minus;
  const trendColor = covenant.status === "PASS" ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 items-center px-5 py-3 rounded-xl hover:bg-white/5 transition-colors group text-sm">
      <div>
        <p className="text-white font-medium">{covenant.name}</p>
        <p className="text-white/35 text-xs">{covenant.type === "MAX" ? "Must stay below" : "Must stay above"} {covenant.threshold}x</p>
      </div>
      <div>
        <p className={`text-xl font-bold tabular-nums ${covenant.status === "BREACH" ? "text-red-400" : covenant.status === "WARNING" ? "text-amber-400" : "text-emerald-400"}`}>
          {covenant.value}x
        </p>
      </div>
      <div>
        <p className="text-white/60">{covenant.threshold}x</p>
        <p className="text-white/30 text-xs">{covenant.type}</p>
      </div>
      <div>
        <StatusBadge status={covenant.status} />
      </div>
      <div className="pr-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(fillPercent, 100)}%` }} />
          </div>
          <span className="text-xs text-white/40 w-10 text-right">{Math.round(fillPercent)}%</span>
        </div>
        <p className="text-[10px] text-white/30">
          {covenant.status === "BREACH" ? "Threshold breached" :
           covenant.headroom ? `${covenant.headroom} headroom` :
           "Within limits"}
        </p>
      </div>
      <div className="flex items-center gap-1 justify-end">
        {covenant.projectedBreachDays && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
            ~{covenant.projectedBreachDays}d
          </span>
        )}
        <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
      </div>
    </div>
  );
}

function CompanyDetailPanel({ company }: { company: Company }) {
  const companyKey = company.id ?? company.companyId;
  const meta = COMPANY_META[companyKey];
  const worstStatus = getWorstStatus(company);
  const passing = company.covenants.filter(c => c.status === "PASS").length;
  const warnings = company.covenants.filter(c => c.status === "WARNING").length;
  const breaches = company.covenants.filter(c => c.status === "BREACH").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      className="border-t border-white/8"
    >
      {/* Company header */}
      <div className="px-6 py-5 bg-white/[0.02]">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-lg flex-shrink-0">
              {company.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-white">{company.name}</h3>
                <StatusBadge status={worstStatus} />
              </div>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{meta.industry}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{meta.email}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Est. {meta.founded}</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />Last sync: {company.lastSync}</span>
              </div>
            </div>
          </div>
          <Link href={`/company/${company.id}`}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium transition-colors" data-testid={`btn-view-${company.id}`}>
              <Eye className="w-3.5 h-3.5" /> Open Dashboard
            </button>
          </Link>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Debt Facility", value: meta.debtFacility, icon: DollarSign, color: "text-white" },
            { label: "AUM", value: meta.aum, icon: BarChart2, color: "text-white" },
            { label: "Covenants Passing", value: `${passing}/${company.covenants.length}`, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "In Warning", value: String(warnings), icon: AlertTriangle, color: warnings > 0 ? "text-amber-400" : "text-white/30" },
            { label: "In Breach", value: String(breaches), icon: ShieldAlert, color: breaches > 0 ? "text-red-400" : "text-white/30" },
          ].map(m => (
            <div key={m.label} className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 flex items-center gap-3">
              <m.icon className={`w-4 h-4 ${m.color} flex-shrink-0`} />
              <div>
                <p className="text-[10px] text-white/35">{m.label}</p>
                <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Financials row */}
        <div className="rounded-xl bg-white/3 border border-white/8 p-4 mb-6">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Key Financial Metrics (from QuickBooks)</p>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-4 text-sm">
            {[
              { label: "Net Income", value: company.financials.netIncome },
              { label: "Interest Expense", value: company.financials.interestExpense },
              { label: "EBITDA", value: company.financials.ebitda },
              { label: "Total Debt", value: company.financials.totalDebt },
              { label: "Current Assets", value: company.financials.currentAssets },
              { label: "Current Liabilities", value: company.financials.currentLiabilities },
              { label: "Cash", value: company.financials.cash },
            ].map(f => (
              <div key={f.label}>
                <p className="text-white/35 text-[10px]">{f.label}</p>
                <p className="text-white font-semibold">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Covenants table */}
        <div className="rounded-xl bg-white/3 border border-white/8 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 px-5 py-3 border-b border-white/8 text-[10px] font-semibold text-white/35 uppercase tracking-wider">
            <span>Covenant</span>
            <span>Current</span>
            <span>Threshold</span>
            <span>Status</span>
            <span>Proximity</span>
            <span className="text-right">Trend</span>
          </div>
          <div className="divide-y divide-white/5">
            {company.covenants.map(cov => (
              <CovenantRow key={cov.id} covenant={cov} />
            ))}
          </div>
        </div>

        {/* Alert history */}
        {company.alerts.length > 0 && (
          <div className="mt-4 rounded-xl bg-white/3 border border-white/8 p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Alerts</p>
            <div className="space-y-2">
              {company.alerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 py-1.5">
                  <StatusBadge status={alert.status} />
                  <span className="text-white/70 text-sm flex-1">{alert.covenantName}</span>
                  <span className="text-white/50 text-sm font-mono">{alert.value}x</span>
                  <span className="text-white/30 text-xs">{alert.date}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${alert.acknowledged ? "text-white/30 bg-white/5" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"}`}>
                    {alert.acknowledged ? "Acknowledged" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Building2, label: "Companies", href: "/portfolio" },
  { icon: Bell, label: "Alerts", href: "/admin" },
  { icon: FileText, label: "Reports", href: "/admin" },
  { icon: Settings, label: "Settings", href: "/admin" },
];

const ACTIVITY_LOG = [
  { time: "10 min ago", text: "Cascade Logistics: Leverage Ratio breach detected (4.23x vs 4.0x max)", type: "breach", company: "Cascade" },
  { time: "2 hours ago", text: "Acme Industries: QuickBooks nightly sync completed (3 reports pulled)", type: "sync", company: "Acme" },
  { time: "4 hours ago", text: "Summit Healthcare: Loan Agreement PDF uploaded and parsed (3 covenants extracted)", type: "doc", company: "Summit" },
  { time: "5 hours ago", text: "Vertex Manufacturing: Automated compliance letter generated for Q1 2025", type: "doc", company: "Vertex" },
  { time: "8 hours ago", text: "Cascade Logistics: Fixed Charge Coverage breached (1.08x vs 1.1x min)", type: "breach", company: "Cascade" },
  { time: "1 day ago", text: "Acme Industries: Leverage Ratio entered WARNING state (3.80x → 3.85x)", type: "warning", company: "Acme" },
  { time: "1 day ago", text: "Summit Healthcare: Interest Coverage Ratio approaching threshold (2.1x vs 2.0x min)", type: "warning", company: "Summit" },
  { time: "2 days ago", text: "System: Nightly forecast run completed — 1 projected breach in 47 days", type: "sync", company: "System" },
];

export default function Admin() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("Overview");
  const { data: companies = [], isLoading, isError } = useCompanies();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const stats = {
    companies: companies.length,
    covenants: companies.reduce((acc, c) => acc + c.covenants.length, 0),
    warning: companies.filter(c => c.covenants.some(cov => cov.status === "WARNING") && !c.covenants.some(cov => cov.status === "BREACH")).length,
    breach: companies.filter(c => c.covenants.some(cov => cov.status === "BREACH")).length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-white/60">
        Loading portfolio…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-red-400">
        Failed to load companies. Is the API server running?
      </div>
    );
  }

  const toggleCompany = (id: string) => {
    setExpandedCompany(prev => prev === id ? null : id);
  };

  return (
    <div className="institutional-dashboard institutional-admin min-h-screen bg-[#f4f1ea] flex relative">

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col z-20" style={{ background: "rgba(7,11,20,0.85)", borderRight: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-500/30">
              CW
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">CovenantWatch</p>
              <p className="text-white/30 text-[10px]">Admin Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setActiveNav(item.label)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                activeNav === item.label
                  ? "bg-indigo-500/15 text-white border border-indigo-500/20"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              <item.icon className={`w-4 h-4 ${activeNav === item.label ? "text-indigo-400" : ""}`} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium text-white/80 truncate">{user?.email}</p>
              <p className="text-[10px] text-white/30">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="btn-admin-logout"
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/8 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[220px] flex-1 p-8 relative z-10 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              System Overview
              <span className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 font-semibold border border-violet-500/20">Admin</span>
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-emerald-400 font-medium">All Systems Operational</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Portfolio Companies", value: stats.companies, icon: Building2, color: "text-white", glow: "" },
            { label: "Total Covenants", value: stats.covenants, icon: FileText, color: "text-indigo-400", glow: "border-indigo-500/20 glow-indigo" },
            { label: "Companies in Warning", value: stats.warning, icon: AlertTriangle, color: "text-amber-400", glow: stats.warning > 0 ? "border-amber-500/20 glow-amber" : "" },
            { label: "Companies in Breach", value: stats.breach, icon: ShieldAlert, color: "text-red-400", glow: stats.breach > 0 ? "border-red-500/20 glow-red" : "" },
          ].map(s => (
            <div key={s.label} className={`glass rounded-2xl p-5 relative overflow-hidden ${s.glow}`}>
              <div className="absolute -top-2 -right-2 opacity-8">
                <s.icon className="w-20 h-20" />
              </div>
              <p className="text-white/40 text-xs font-medium mb-2">{s.label}</p>
              <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Companies — expandable detail rows */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-white/8 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Portfolio Company Records</h2>
              <p className="text-white/40 text-xs mt-0.5">Click any company to expand full covenant details</p>
            </div>
            <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/8">{companies.length} companies</span>
          </div>

          <div className="divide-y divide-white/5">
            {companies.map((company) => {
              const companyKey = company.id ?? company.companyId;
              const meta = COMPANY_META[companyKey] ?? {
                industry: "General",
                email: `${companyKey}@covenantwatch.com`,
                sector: "Unknown",
                founded: "N/A",
                aum: "N/A",
                debtFacility: "N/A",
              };
              const worst = getWorstStatus(company);
              const isExpanded = expandedCompany === companyKey;
              const passing = company.covenants.filter(c => c.status === "PASS").length;

              return (
                <div key={companyKey}>
                  {/* Summary row */}
                  <motion.button
                    className="w-full text-left"
                    onClick={() => toggleCompany(companyKey)}
                    data-testid={`btn-expand-${companyKey}`}
                  >
                    <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-white/3 transition-all duration-150 ${isExpanded ? "bg-white/4" : ""}`}>
                      {/* Company */}
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-10 rounded-full flex-shrink-0 ${worst === "BREACH" ? "bg-red-500" : worst === "WARNING" ? "bg-amber-400" : "bg-emerald-400"}`} />
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-600/15 border border-white/10 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {company.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{company.name}</p>
                          <p className="text-white/35 text-xs">{meta.industry} · {meta.sector}</p>
                        </div>
                      </div>

                      {/* CFO */}
                      <div>
                        <p className="text-white/50 text-xs">{meta.email}</p>
                        <p className="text-white/25 text-[10px]">CFO</p>
                      </div>

                      {/* Covenants */}
                      <div>
                        <p className="text-white/70 text-sm font-medium">{passing}/{company.covenants.length} passing</p>
                        <div className="flex gap-0.5 mt-1">
                          {company.covenants.map(c => (
                            <div
                              key={c.id}
                              className={`h-1 flex-1 rounded-full ${c.status === "BREACH" ? "bg-red-500" : c.status === "WARNING" ? "bg-amber-400" : "bg-emerald-400"}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Status */}
                      <div><StatusBadge status={worst} /></div>

                      {/* Last sync */}
                      <div>
                        <p className="text-white/50 text-xs">{company.lastSync}</p>
                        <p className="text-white/25 text-[10px]">Last sync</p>
                      </div>

                      {/* Expand toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/25 hidden xl:block">{isExpanded ? "Collapse" : "Expand"}</span>
                        <div className={`w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                        </div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Expanded detail panel */}
                  <AnimatePresence>
                    {isExpanded && <CompanyDetailPanel company={company} />}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom two-col: activity + system health */}
        <div className="grid grid-cols-3 gap-6">
          {/* Activity log */}
          <div className="col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">System Activity Log</h3>
              <span className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded border border-white/8">Last 48 hours</span>
            </div>
            <div className="space-y-4">
              {ACTIVITY_LOG.map((event, i) => {
                const IconComp = event.type === "breach" ? ShieldAlert : event.type === "warning" ? AlertTriangle : event.type === "sync" ? Activity : FileText;
                const iconColor = event.type === "breach" ? "text-red-400 bg-red-500/10 border-red-500/20" : event.type === "warning" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : event.type === "sync" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                return (
                  <div key={i} className="flex gap-3 items-start group">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm leading-snug">{event.text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white/25 text-xs">{event.time}</span>
                        <span className="text-white/15">·</span>
                        <span className="text-white/30 text-xs">{event.company}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System health */}
          <div className="col-span-1 space-y-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-4">System Health</h3>
              <div className="space-y-3">
                {[
                  { label: "API Gateway", sub: "99.9% uptime", status: "ok" },
                  { label: "QuickBooks Sync", sub: "Last run 2:00 AM", status: "ok" },
                  { label: "PDF Parser", sub: "Idle — ready", status: "ok" },
                  { label: "Alert Engine", sub: "2 active watches", status: "warn" },
                  { label: "Database", sub: "14.2K records", status: "ok" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/8">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${item.status === "ok" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"}`} />
                      <div>
                        <p className="text-white/80 text-xs font-medium">{item.label}</p>
                        <p className="text-white/30 text-[10px]">{item.sub}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${item.status === "ok" ? "text-emerald-400" : "text-amber-400"}`}>
                      {item.status === "ok" ? "Online" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Alerts sent (30d)", value: "14", icon: Bell },
                  { label: "PDFs parsed", value: "8", icon: FileText },
                  { label: "Letters generated", value: "5", icon: ArrowUpRight },
                  { label: "Syncs completed", value: "62", icon: Database },
                  { label: "Avg. ratio checks/day", value: "14", icon: Cpu },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50">
                      <s.icon className="w-3.5 h-3.5" />
                      <span className="text-xs">{s.label}</span>
                    </div>
                    <span className="text-white font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
