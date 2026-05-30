import { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { 
  ArrowLeft, RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, 
  ChevronDown, ChevronUp, Download, Upload, FileText, Loader2,
  ShieldAlert
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ReferenceLine, ReferenceArea, ResponsiveContainer 
} from "recharts";

import { MOCK_COMPANIES, CovenantStatus, Covenant, CompanyAlert } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

import { ThemeToggle } from "@/components/theme-toggle";

export default function CompanyDashboard() {
  const [match, params] = useRoute("/company/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const company = useMemo(() => {
    return MOCK_COMPANIES.find(c => c.id === params?.id);
  }, [params?.id]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCovenantId, setSelectedCovenantId] = useState<string>("");
  const [alerts, setAlerts] = useState<CompanyAlert[]>([]);
  
  // Modals state
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterStep, setLetterStep] = useState<1 | 2>(1);
  const [letterRecipient, setLetterRecipient] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false);

  // Initialize selected covenant and alerts
  useMemo(() => {
    if (company && !selectedCovenantId) {
      setSelectedCovenantId(company.covenants[0]?.id || "");
      setAlerts(company.alerts);
    }
  }, [company, selectedCovenantId]);

  if (!match || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <Button onClick={() => setLocation("/")}>Return to Portfolio</Button>
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
    const content = `COVENANT COMPLIANCE REPORT\nCompany: ${company.name}\nDate: ${new Date().toLocaleDateString()}\n\nStatus: ${breachCovenant ? 'BREACH' : 'COMPLIANT'}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.name.replace(/\s+/g, "_")}_Covenant_Report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const getStatusColor = (status: CovenantStatus) => {
    switch (status) {
      case "BREACH": return "bg-destructive/10 border-destructive/20 text-destructive";
      case "WARNING": return "bg-warning/10 border-warning/20 text-warning-foreground";
      case "PASS": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400";
    }
  };

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
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Section 1: Header Bar & Breach Banner */}
      {breachCovenant && (
        <div className="w-full bg-destructive text-destructive-foreground px-4 py-3 text-center font-bold tracking-wide shadow-md z-50 relative">
          <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
            <ShieldAlert className="w-5 h-5" />
            <span>COVENANT BREACH DETECTED — {breachCovenant.name}. Immediate action required.</span>
          </div>
        </div>
      )}
      
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Portfolio
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Connected — QuickBooks Online</span>
              <span className="text-border mx-1">|</span>
              <span>Last sync: {company.lastSync}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="w-full md:w-auto"
              data-testid="button-sync"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {/* Section 2: Covenant Gauge Cards */}
        <div>
          <h2 className="text-xl font-bold mb-4">Covenants Monitored</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {company.covenants.map(covenant => (
              <Card key={covenant.id} className={`border ${getStatusColor(covenant.status)}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold">{covenant.name}</CardTitle>
                    <Badge variant={covenant.status === "PASS" ? "outline" : covenant.status === "WARNING" ? "default" : "destructive"} 
                           className={covenant.status === "WARNING" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
                    >
                      {covenant.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {covenant.type === 'MAX' ? '≤' : '≥'} {covenant.threshold}x {covenant.type === 'MAX' ? 'maximum' : 'minimum'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-bold tracking-tighter">
                      {covenant.value}x
                    </div>
                    <div className="text-right">
                      {covenant.status === "BREACH" ? (
                        <div className="text-sm font-semibold text-destructive flex items-center justify-end gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> 
                          {covenant.breachAmount ? `Breached by ${covenant.breachAmount}` : 'In Breach'}
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-muted-foreground">
                          {covenant.headroom} headroom
                        </div>
                      )}
                    </div>
                  </div>
                  {(covenant.status === "WARNING" || covenant.status === "BREACH") && covenant.projectedBreachDays && (
                    <div className="mt-4 text-xs font-medium text-destructive bg-destructive/10 p-2 rounded-md flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Projected breach in ~{covenant.projectedBreachDays} days
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Section 3: 90-Day Forecast Chart */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>90-Day Forecast</CardTitle>
              <CardDescription>Historical trend and projected values</CardDescription>
            </div>
            <Select value={selectedCovenantId} onValueChange={setSelectedCovenantId}>
              <SelectTrigger className="w-[200px]" data-testid="select-covenant">
                <SelectValue placeholder="Select covenant" />
              </SelectTrigger>
              <SelectContent>
                {company.covenants.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {selectedCovenant && (
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${val}x`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--popover-foreground))" }}
                      itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                    />
                    
                    {/* Threshold Line */}
                    <ReferenceLine 
                      y={selectedCovenant.threshold} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="4 4" 
                      label={{ 
                        position: 'insideTopLeft', 
                        value: `Threshold (${selectedCovenant.threshold}x)`, 
                        fill: 'hsl(var(--destructive))',
                        fontSize: 12
                      }} 
                    />
                    
                    {/* Danger Area Shading */}
                    <ReferenceArea 
                      y1={selectedCovenant.threshold} 
                      y2={selectedCovenant.type === 'MAX' ? Math.max(...getChartData().map(d => Math.max(d.history || 0, d.projection || 0))) + 0.5 : 0} 
                      fill="hsl(var(--destructive))" 
                      fillOpacity={0.1} 
                    />

                    <Line 
                      type="monotone" 
                      dataKey="history" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      name="Historical"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projection" 
                      stroke="hsl(280 65% 60%)" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: "hsl(280 65% 60%)" }}
                      name="Projected"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-6 text-center italic">
              Forecasts are based on recent financial trends and are for planning purposes only. Actual results depend on business performance.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Section 4: Alert History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Last 10 covenant events</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                  No recent alerts to display.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Covenant</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Acknowledged</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map(alert => (
                        <TableRow key={alert.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{alert.date}</TableCell>
                          <TableCell className="font-medium">{alert.covenantName}</TableCell>
                          <TableCell>
                            <Badge variant={alert.status === "BREACH" ? "destructive" : alert.status === "WARNING" ? "default" : "outline"} 
                                   className={alert.status === "WARNING" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
                            >
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{alert.value}x</TableCell>
                          <TableCell className="text-right">
                            <Switch 
                              checked={alert.acknowledged} 
                              onCheckedChange={() => handleToggleAlert(alert.id)}
                              data-testid={`switch-ack-${alert.id}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Actions Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage compliance docs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <Dialog open={isLetterModalOpen} onOpenChange={(open) => {
                setIsLetterModalOpen(open);
                if (!open) { setTimeout(() => { setLetterStep(1); setLetterRecipient(""); }, 300); }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" data-testid="button-gen-letter">
                    <FileText className="w-4 h-4 mr-2" /> Generate Compliance Letter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  {letterStep === 1 ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Generate Compliance Letter</DialogTitle>
                        <DialogDescription>Create a formal notification for the company regarding their covenant status.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">Who is this letter addressed to?</label>
                        <Input 
                          placeholder="e.g. Jane Doe, CFO" 
                          value={letterRecipient} 
                          onChange={(e) => setLetterRecipient(e.target.value)}
                          data-testid="input-recipient"
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleGenerateLetter} data-testid="button-generate">Generate Letter</Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Compliance Letter Generated</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea 
                          className="min-h-[300px] font-mono text-xs bg-muted/30" 
                          value={letterTemplate} 
                          readOnly 
                        />
                      </div>
                      <DialogFooter className="flex gap-2 sm:justify-between">
                        <Button variant="outline" onClick={() => setIsLetterModalOpen(false)}>Close</Button>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => {
                            navigator.clipboard.writeText(letterTemplate);
                            toast({ title: "Copied to clipboard" });
                          }}>Copy to Clipboard</Button>
                          <Button onClick={() => {
                            const blob = new Blob([letterTemplate], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `Compliance_Letter_${company.name.replace(/\s+/g, "_")}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast({ title: "Downloaded letter" });
                          }}>Download .txt</Button>
                        </div>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" data-testid="button-upload-loan">
                    <Upload className="w-4 h-4 mr-2" /> Upload New Loan Agreement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Loan Agreement</DialogTitle>
                    <DialogDescription>Upload an amended or new loan agreement. The system will process it for covenant changes.</DialogDescription>
                  </DialogHeader>
                  <div className="border-2 border-dashed border-border rounded-lg p-10 mt-4 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX up to 50MB</p>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
                    <Button onClick={() => {
                      toast({ title: "File uploaded successfully" });
                      setIsUploadModalOpen(false);
                    }}>Upload Document</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button className="w-full justify-start" variant="outline" onClick={downloadReport} data-testid="button-download-report">
                <Download className="w-4 h-4 mr-2" /> Download Covenant Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Section 6: Raw Financials */}
        <Card>
          <Collapsible open={isFinancialsOpen} onOpenChange={setIsFinancialsOpen}>
            <CardHeader className="p-0 border-b">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-between items-center py-6 px-6 h-auto rounded-none hover:bg-muted/50" data-testid="trigger-financials">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-lg font-semibold">Raw Financials</span>
                    <span className="text-sm font-normal text-muted-foreground">Latest period key figures</span>
                  </div>
                  {isFinancialsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Line Item</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Source Report</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Net Income</TableCell>
                        <TableCell>{company.financials.netIncome}</TableCell>
                        <TableCell className="text-muted-foreground">Profit & Loss</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Interest Expense</TableCell>
                        <TableCell>{company.financials.interestExpense}</TableCell>
                        <TableCell className="text-muted-foreground">Profit & Loss</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/30">
                        <TableCell className="font-semibold">EBITDA (Calculated)</TableCell>
                        <TableCell className="font-semibold">{company.financials.ebitda}</TableCell>
                        <TableCell className="text-muted-foreground">Calculated</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Debt</TableCell>
                        <TableCell>{company.financials.totalDebt}</TableCell>
                        <TableCell className="text-muted-foreground">Balance Sheet</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Current Assets</TableCell>
                        <TableCell>{company.financials.currentAssets}</TableCell>
                        <TableCell className="text-muted-foreground">Balance Sheet</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Current Liabilities</TableCell>
                        <TableCell>{company.financials.currentLiabilities}</TableCell>
                        <TableCell className="text-muted-foreground">Balance Sheet</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cash</TableCell>
                        <TableCell>{company.financials.cash}</TableCell>
                        <TableCell className="text-muted-foreground">Balance Sheet</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

      </div>
    </div>
  );
}
