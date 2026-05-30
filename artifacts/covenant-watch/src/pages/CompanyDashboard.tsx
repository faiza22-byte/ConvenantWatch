import { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, 
  Download, Upload, FileText, Loader2, ShieldAlert, Sparkles, User
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ReferenceLine, ReferenceArea, ResponsiveContainer 
} from "recharts";

import { MOCK_COMPANIES, CovenantStatus, CompanyAlert } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function CompanyDashboard({ isAdminView = false }: { isAdminView?: boolean }) {
  const [matchId, params] = useRoute("/company/:id");
  const [matchDash] = useRoute("/dashboard");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
  const companyId = (matchId && params?.id) || (matchDash && user?.companyId) || "";

  const company = useMemo(() => {
    return MOCK_COMPANIES.find(c => c.id === companyId);
  }, [companyId]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCovenantId, setSelectedCovenantId] = useState<string>("");
  const [alerts, setAlerts] = useState<CompanyAlert[]>([]);
  
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterStep, setLetterStep] = useState<1 | 2>(1);
  const [letterRecipient, setLetterRecipient] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false);

  useMemo(() => {
    if (company && !selectedCovenantId) {
      setSelectedCovenantId(company.covenants[0]?.id || "");
      setAlerts(company.alerts);
    }
  }, [company, selectedCovenantId]);

  if (!company) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <Button onClick={() => setLocation(user?.role === "admin" ? "/admin" : "/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const selectedCovenant = company.covenants.find(c => c.id === selectedCovenantId);
  const breachCovenant = company.covenants.find(c => c.status === "BREACH");

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: "Sync Complete",
        description: "Financial data successfully updated from QuickBooks Online.",
      });
    }, 1500);
  };

  const handleToggleAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: !a.acknowledged } : a
    ));
  };

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

  const letterTemplate = `CONFIDENTIAL - COVENANT COMPLIANCE NOTICE

To: ${letterRecipient}
Company: ${company.name}
Date: ${new Date().toLocaleDateString()}

Dear ${letterRecipient},

This letter serves as formal notification regarding the current status of financial covenants as outlined in the Loan Agreement for ${company.name}.

${company.covenants.map(c => 
`- ${c.name}: Current value is ${c.value}x against a ${c.type === 'MAX' ? 'maximum' : 'minimum'} threshold of ${c.threshold}x. Status: ${c.status}.`
).join('\n')}

${breachCovenant ? `\nURGENT: Immediate action is required regarding the breach of the ${breachCovenant.name}. Please contact your portfolio manager immediately.` : '\nPlease maintain current reporting schedules.'}

Sincerely,
CovenantWatch Monitoring System`;

  const getChartData = () => {
    if (!selectedCovenant) return [];
    const data: any[] = [];
    const historyLen = selectedCovenant.history.length;
    selectedCovenant.history.forEach((h, i) => {
      data.push({
        month: h.month,
        history: h.value,
        projection: i === historyLen - 1 ? h.value : null
      });
    });
    if (selectedCovenant.projection) {
      selectedCovenant.projection.forEach(p => {
        data.push({
          month: p.month,
          history: null,
          projection: p.value
        });
      });
    }
    return data;
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white relative pb-20">
      <AnimatedBackground />
      
      {isAdminView && (
        <div className="bg-indigo-600/20 text-indigo-200 text-sm py-1.5 px-4 flex justify-between items-center z-50 relative border-b border-indigo-500/20">
          <span>Viewing as Admin &mdash; {company.name}</span>
          <Link href="/admin" className="hover:text-white flex items-center text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to Admin
          </Link>
        </div>
      )}

      {breachCovenant && (
        <div className="w-full bg-destructive/15 border-b border-destructive/30 text-destructive-foreground px-4 py-3 text-center font-bold tracking-wide shadow-[0_0_20px_rgba(239,68,68,0.2)] z-40 relative">
          <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span>COVENANT BREACH DETECTED &mdash; {breachCovenant.name}. Immediate action required.</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/10 z-30 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">

          {/* LEFT — back + logo + company name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link href={user?.role === 'admin' ? "/admin" : "/"} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-md shadow-indigo-500/30">
              CW
            </div>
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">{company.name}</h1>
              <p className="text-[10px] text-white/40 leading-tight">Covenant Dashboard</p>
            </div>
          </div>

          {/* CENTER — QuickBooks sync status + prominent sync button */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/40 leading-tight">QuickBooks Online</p>
                <p className="text-xs text-emerald-400 font-medium leading-tight">Connected · {company.lastSync}</p>
              </div>
            </div>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="h-9 px-4 bg-[#2CA01C]/20 hover:bg-[#2CA01C]/30 border border-[#2CA01C]/40 text-[#44C32A] hover:text-[#5FD441] rounded-lg font-semibold text-sm gap-2 transition-all duration-200 shadow-[0_0_15px_rgba(44,160,28,0.15)] hover:shadow-[0_0_20px_rgba(44,160,28,0.25)]"
              data-testid="btn-sync-now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync QuickBooks"}
            </Button>
          </div>

          {/* RIGHT — actions + avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              className="hidden sm:flex h-9 px-3 glass hover:bg-white/10 border-white/10 text-white/70 hover:text-white text-sm gap-2"
              onClick={() => setIsUploadModalOpen(true)}
              data-testid="btn-upload-pdf"
            >
              <Upload className="w-3.5 h-3.5" /> Upload PDF
            </Button>

            <Button
              className="hidden sm:flex h-9 px-3 bg-gradient-to-r from-indigo-500 to-violet-600 border-0 hover:from-indigo-600 hover:to-violet-700 text-sm gap-2 shadow-md shadow-indigo-500/25"
              onClick={() => setIsLetterModalOpen(true)}
              data-testid="btn-generate-letter"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Letter
            </Button>

            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold border border-indigo-500/30 ml-1 cursor-pointer relative group text-sm flex-shrink-0">
              {company.name.charAt(0)}
              <div className="absolute top-11 right-0 bg-[#0D1222] border border-white/10 rounded-xl shadow-2xl p-2 hidden group-hover:block min-w-[160px] z-50">
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

      <div className="max-w-[1400px] mx-auto px-6 py-8 relative z-10 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 border-white/10 flex flex-col items-center justify-center">
            <span className="text-sm text-muted-foreground mb-1">Covenants</span>
            <span className="text-2xl font-bold">{company.covenants.length}</span>
          </div>
          <div className="glass rounded-xl p-4 border-emerald-500/20 glow-emerald flex flex-col items-center justify-center">
            <span className="text-sm text-emerald-400 mb-1">Passing</span>
            <span className="text-2xl font-bold">{company.covenants.filter(c => c.status === 'PASS').length}</span>
          </div>
          <div className="glass rounded-xl p-4 border-warning/20 glow-amber flex flex-col items-center justify-center">
            <span className="text-sm text-warning mb-1">Warning</span>
            <span className="text-2xl font-bold">{company.covenants.filter(c => c.status === 'WARNING').length}</span>
          </div>
          <div className="glass rounded-xl p-4 border-destructive/20 glow-red flex flex-col items-center justify-center">
            <span className="text-sm text-destructive mb-1">Breach</span>
            <span className="text-2xl font-bold">{company.covenants.filter(c => c.status === 'BREACH').length}</span>
          </div>
        </div>

        {/* Covenant Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {company.covenants.map((covenant, i) => {
            let borderColor = "border-white/10";
            let glowClass = "";
            let textGradient = "";
            
            if (covenant.status === "PASS") {
              borderColor = "border-emerald-500/30";
              glowClass = "glow-emerald";
              textGradient = "from-emerald-300 to-emerald-500";
            } else if (covenant.status === "WARNING") {
              borderColor = "border-warning/40";
              glowClass = "glow-amber";
              textGradient = "from-amber-300 to-amber-500";
            } else if (covenant.status === "BREACH") {
              borderColor = "border-destructive/40";
              glowClass = "glow-red";
              textGradient = "from-red-400 to-red-600";
            }

            let fillPercent = 0;
            if (covenant.type === 'MAX') {
              fillPercent = Math.min((covenant.value / covenant.threshold) * 100, 100);
            } else {
              fillPercent = Math.min((covenant.threshold / covenant.value) * 100, 100);
            }
            
            let progressColor = "bg-emerald-400";
            if (fillPercent > 100 || covenant.status === 'BREACH') progressColor = "bg-destructive";
            else if (fillPercent > 80 || covenant.status === 'WARNING') progressColor = "bg-warning";

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                key={covenant.id} 
                className={`glass rounded-2xl p-6 ${borderColor} ${glowClass} relative overflow-hidden`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-semibold text-lg">{covenant.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {covenant.type === 'MAX' ? '≤' : '≥'} {covenant.threshold}x {covenant.type === 'MAX' ? 'maximum' : 'minimum'}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    covenant.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    covenant.status === 'WARNING' ? 'bg-warning/10 text-warning border border-warning/20' :
                    'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}>
                    {covenant.status}
                  </div>
                </div>

                <div className="mb-6">
                  <div className={`text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br ${textGradient}`}>
                    {covenant.value}x
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: `${fillPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Current</span>
                    <span className="text-muted-foreground">Threshold: {covenant.threshold}x</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    {covenant.status === "BREACH" ? (
                      <span className="text-destructive font-bold">{covenant.breachAmount ? `Breached by ${covenant.breachAmount}` : 'In Breach'}</span>
                    ) : (
                      <span className="text-white font-medium">{covenant.headroom} headroom</span>
                    )}
                  </div>
                  {covenant.projectedBreachDays && (
                    <div className="mt-2 text-xs font-medium text-warning bg-warning/10 py-1.5 px-3 rounded-md flex items-center gap-2 border border-warning/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Projected breach in ~{covenant.projectedBreachDays} days
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Forecast Chart */}
        <div className="glass rounded-2xl p-6 border-white/10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold">90-Day Forecast</h2>
              <p className="text-sm text-muted-foreground">Historical trend and projected values</p>
            </div>
            <Select value={selectedCovenantId} onValueChange={setSelectedCovenantId}>
              <SelectTrigger className="w-[250px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select covenant" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D1222] border-white/10 text-white">
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

                  <Line type="monotone" dataKey="history" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="projection" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">Forecasts based on recent trends. Actual results may vary.</p>
        </div>

        {/* Bottom Two Columns */}
        <div className="grid md:grid-cols-5 gap-6">
          
          {/* Alerts */}
          <div className="md:col-span-3 glass rounded-2xl p-6 border-white/10">
            <h2 className="text-xl font-bold mb-1">Alert History</h2>
            <p className="text-sm text-muted-foreground mb-6">Recent covenant events</p>
            
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-white/5">
                No recent alerts to display.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {alert.status === "BREACH" ? <ShieldAlert className="w-5 h-5 text-destructive" /> : <AlertTriangle className="w-5 h-5 text-warning" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">{alert.covenantName} &mdash; {alert.value}x</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${alert.status === "BREACH" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                        {alert.status}
                      </span>
                      <Switch checked={alert.acknowledged} onCheckedChange={() => handleToggleAlert(alert.id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="md:col-span-2 glass rounded-2xl p-6 border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Sparkles className="w-24 h-24 text-indigo-400" /></div>
            <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Documents & Actions
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Manage compliance files</p>
            
            <div className="space-y-4 relative z-10">
              <div 
                onClick={() => setIsUploadModalOpen(true)}
                className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-indigo-500/50 transition-all"
              >
                <Upload className="w-6 h-6 text-indigo-400 mb-2" />
                <p className="text-sm font-medium text-white">Upload Loan Agreement</p>
                <p className="text-xs text-muted-foreground mt-1">PDF or DOCX</p>
              </div>

              <Button onClick={() => setIsLetterModalOpen(true)} className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 h-12 text-md shadow-lg shadow-indigo-500/25">
                <FileText className="w-5 h-5 mr-2" /> Generate Compliance Letter
              </Button>
              
              <Button variant="ghost" onClick={downloadReport} className="w-full bg-white/5 hover:bg-white/10 border border-white/10">
                <Download className="w-4 h-4 mr-2" /> Download Report
              </Button>

              <div className="h-px w-full bg-white/10 my-4" />

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Loan Agreement</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">Active</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Last Letter</span>
                  <span className="text-xs text-white">May 12, 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financials Table */}
        <Collapsible open={isFinancialsOpen} onOpenChange={setIsFinancialsOpen} className="glass rounded-2xl border-white/10">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors rounded-2xl">
            <div>
              <h2 className="text-xl font-bold text-left">Raw Financial Data</h2>
              <p className="text-sm text-muted-foreground text-left mt-1">Most recent metrics from QuickBooks</p>
            </div>
            <Button variant="ghost" size="sm" className="pointer-events-none">
              {isFinancialsOpen ? 'Hide Details' : 'View Details'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-6 pt-0 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {Object.entries(company.financials).map(([key, val]) => (
                <div key={key} className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-xl font-bold text-white">{val}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

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
          <div className="border-2 border-dashed border-white/20 rounded-xl p-12 mt-4 text-center hover:bg-white/5 hover:border-indigo-500/50 transition-colors cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-base font-medium text-white">Click to upload or drag and drop</p>
            <p className="text-sm text-muted-foreground mt-2">PDF or DOCX up to 50MB</p>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)} className="hover:bg-white/10">Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
              toast({ title: "File uploaded successfully" });
              setIsUploadModalOpen(false);
            }}>Upload Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}