import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Building2, LayoutDashboard, Bell, FileText, Settings, LogOut, 
  ChevronRight, ShieldAlert, CheckCircle2, AlertTriangle, User,
  Activity, ArrowRight
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MOCK_COMPANIES, CovenantStatus } from "@/lib/mock-data";

export default function Admin() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const getStatusColor = (status: CovenantStatus) => {
    switch (status) {
      case "BREACH": return "text-destructive";
      case "WARNING": return "text-warning";
      case "PASS": return "text-emerald-400";
    }
  };

  const stats = {
    companies: MOCK_COMPANIES.length,
    covenants: MOCK_COMPANIES.reduce((acc, c) => acc + c.covenants.length, 0),
    warning: MOCK_COMPANIES.filter(c => c.covenants.some(cov => cov.status === "WARNING")).length,
    breach: MOCK_COMPANIES.filter(c => c.covenants.some(cov => cov.status === "BREACH")).length,
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-white/5 border-r border-white/10 flex flex-col z-20 backdrop-blur-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
            CovenantWatch
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" /> Overview
          </Link>
          <Link href="/portfolio" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
            <Building2 className="w-5 h-5" /> Companies
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
            <Bell className="w-5 h-5" /> Alerts
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
            <FileText className="w-5 h-5" /> Reports
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[240px] flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              System Overview
              <span className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 font-medium">Admin</span>
            </h1>
            <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Building2 className="w-16 h-16 text-indigo-400" /></div>
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Companies</p>
            <p className="text-4xl font-bold text-white">{stats.companies}</p>
          </div>
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><FileText className="w-16 h-16 text-white" /></div>
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Covenants</p>
            <p className="text-4xl font-bold text-white">{stats.covenants}</p>
          </div>
          <div className="glass rounded-2xl p-6 relative overflow-hidden border-warning/30 glow-amber">
            <div className="absolute top-0 right-0 p-4 opacity-20"><AlertTriangle className="w-16 h-16 text-warning" /></div>
            <p className="text-sm text-warning font-medium mb-2">In Warning</p>
            <p className="text-4xl font-bold text-white">{stats.warning}</p>
          </div>
          <div className="glass rounded-2xl p-6 relative overflow-hidden border-destructive/30 glow-red">
            <div className="absolute top-0 right-0 p-4 opacity-20"><ShieldAlert className="w-16 h-16 text-destructive" /></div>
            <p className="text-sm text-destructive font-medium mb-2">In Breach</p>
            <p className="text-4xl font-bold text-white">{stats.breach}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            {/* Companies Table */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Monitored Companies</h3>
                <Link href="/portfolio" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center">
                  View Portfolio <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">Company</th>
                      <th className="px-6 py-4 font-medium">CFO Email</th>
                      <th className="px-6 py-4 font-medium">Covenants</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Last Sync</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {MOCK_COMPANIES.map(company => {
                      const hasBreach = company.covenants.some(c => c.status === "BREACH");
                      const hasWarning = company.covenants.some(c => c.status === "WARNING");
                      const status = hasBreach ? "BREACH" : hasWarning ? "WARNING" : "PASS";
                      const emailMap: Record<string, string> = {
                        acme: "cfo@acme.com",
                        vertex: "cfo@vertex.com",
                        cascade: "cfo@cascade.com",
                        summit: "cfo@summit.com"
                      };

                      return (
                        <tr key={company.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-medium text-white">{company.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{emailMap[company.id]}</td>
                          <td className="px-6 py-4 text-muted-foreground">{company.covenants.length} monitored</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 ${getStatusColor(status)}`}>
                              {status === "BREACH" ? <ShieldAlert className="w-3.5 h-3.5" /> : status === "WARNING" ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{company.lastSync}</td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/company/${company.id}`}>
                              <button className="text-indigo-400 hover:text-indigo-300 font-medium">View</button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Log */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Recent Activity Log</h3>
              <div className="space-y-6">
                {[
                  { time: "10 mins ago", text: "Cascade Logistics: Leverage Ratio breach detected", type: "breach" },
                  { time: "2 hours ago", text: "Acme Industries: QuickBooks sync completed successfully", type: "sync" },
                  { time: "4 hours ago", text: "Summit Healthcare: Uploaded new Q1 Loan Agreement PDF", type: "doc" },
                  { time: "5 hours ago", text: "Vertex Manufacturing: Automated Compliance Letter generated", type: "doc" },
                  { time: "1 day ago", text: "Acme Industries: Leverage Ratio entered warning state", type: "warning" },
                ].map((event, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">
                      {event.type === "breach" ? <ShieldAlert className="w-5 h-5 text-destructive" /> :
                       event.type === "warning" ? <AlertTriangle className="w-5 h-5 text-warning" /> :
                       event.type === "sync" ? <Activity className="w-5 h-5 text-emerald-400" /> :
                       <FileText className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                      <p className="text-white text-sm">{event.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-1 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">System Health</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-sm font-medium text-white">API Gateway</span>
                  </div>
                  <span className="text-xs text-muted-foreground">99.9%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-sm font-medium text-white">PDF Parser</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-sm font-medium text-white">ERP Sync</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-sm font-medium text-white">Notification Engine</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Idle</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}