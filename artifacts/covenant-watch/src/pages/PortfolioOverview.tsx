import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  Building2, ShieldAlert, AlertTriangle, CheckCircle2,
  ArrowRight, Activity, Search
} from "lucide-react";
import { MOCK_COMPANIES, CovenantStatus } from "@/lib/mock-data";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";

export default function PortfolioOverview() {
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    warning: 0,
    breach: 0,
    totalCovenants: 0
  });

  useEffect(() => {
    let warning = 0;
    let breach = 0;
    let totalCovs = 0;

    MOCK_COMPANIES.forEach(company => {
      totalCovs += company.covenants.length;
      const statuses = company.covenants.map(c => c.status);
      if (statuses.includes("BREACH")) breach++;
      else if (statuses.includes("WARNING")) warning++;
    });

    setStats({
      total: MOCK_COMPANIES.length,
      warning,
      breach,
      totalCovenants: totalCovs
    });
  }, []);

  const getWorstStatus = (company: typeof MOCK_COMPANIES[0]): CovenantStatus => {
    const statuses = company.covenants.map(c => c.status);
    if (statuses.includes("BREACH")) return "BREACH";
    if (statuses.includes("WARNING")) return "WARNING";
    return "PASS";
  };

  const getStatusColor = (status: CovenantStatus) => {
    switch (status) {
      case "BREACH": return "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]";
      case "WARNING": return "bg-warning shadow-[0_0_10px_rgba(251,191,36,0.5)]";
      case "PASS": return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]";
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white relative pb-20">
      <AnimatedBackground />

      <nav className="sticky top-0 bg-[#070B14]/80 backdrop-blur-xl border-b border-white/10 z-30 px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">CovenantWatch</span>
          </div>
          
          <h1 className="text-xl font-bold hidden md:block">Portfolio Overview</h1>
          
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
              Admin Panel
            </Link>
            <div className="w-px h-5 bg-white/10 mx-2" />
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-white transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 py-12 relative z-10 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass rounded-2xl p-6 border-white/10 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><Building2 className="w-24 h-24" /></div>
            <p className="text-sm text-muted-foreground font-medium mb-2 uppercase tracking-wider">Total Companies</p>
            <p className="text-4xl font-black text-white">{stats.total}</p>
          </div>
          <div className="glass rounded-2xl p-6 border-destructive/30 glow-red relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10"><ShieldAlert className="w-24 h-24 text-destructive" /></div>
            <p className="text-sm text-destructive font-medium mb-2 uppercase tracking-wider">In Breach</p>
            <p className="text-4xl font-black text-white">{stats.breach}</p>
          </div>
          <div className="glass rounded-2xl p-6 border-warning/30 glow-amber relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10"><AlertTriangle className="w-24 h-24 text-warning" /></div>
            <p className="text-sm text-warning font-medium mb-2 uppercase tracking-wider">In Warning</p>
            <p className="text-4xl font-black text-white">{stats.warning}</p>
          </div>
          <div className="glass rounded-2xl p-6 border-white/10 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><Activity className="w-24 h-24" /></div>
            <p className="text-sm text-muted-foreground font-medium mb-2 uppercase tracking-wider">Covenants Tracked</p>
            <p className="text-4xl font-black text-white">{stats.totalCovenants}</p>
          </div>
        </div>

        {/* Portfolio Table */}
        <div className="glass rounded-2xl border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold">Company Directory</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                className="pl-9 bg-black/40 border-white/10 text-white placeholder:text-muted-foreground h-10 rounded-xl"
                placeholder="Search companies..."
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/20 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium">Industry</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Covenants</th>
                  <th className="px-6 py-4 font-medium">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MOCK_COMPANIES.map(company => {
                  const worstStatus = getWorstStatus(company);
                  
                  const industryMap: Record<string, string> = {
                    acme: "Manufacturing",
                    vertex: "Manufacturing",
                    cascade: "Logistics",
                    summit: "Healthcare"
                  };

                  return (
                    <tr key={company.id} className="hover:bg-white/5 transition-colors group relative cursor-pointer" onClick={() => window.location.href = `/company/${company.id}`}>
                      {/* Status indicator bar */}
                      <td className="p-0 absolute left-0 top-0 bottom-0 w-[3px]">
                        <div className={`w-full h-full ${getStatusColor(worstStatus)} opacity-70 group-hover:opacity-100 transition-opacity`} />
                      </td>
                      
                      <td className="px-6 py-5 pl-8">
                        <span className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors block">
                          {company.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground text-sm">
                        {industryMap[company.id]}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          worstStatus === "BREACH" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                          worstStatus === "WARNING" ? "bg-warning/10 text-warning border border-warning/20" :
                          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {worstStatus === "BREACH" ? <ShieldAlert className="w-3.5 h-3.5" /> : 
                           worstStatus === "WARNING" ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                           <CheckCircle2 className="w-3.5 h-3.5" />}
                          {worstStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{company.covenants.length}</span> active
                        </div>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground text-sm flex items-center justify-between">
                        {company.lastSync}
                        <ArrowRight className="w-4 h-4 text-white/0 group-hover:text-indigo-400 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}