import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { MOCK_COMPANIES, CovenantStatus } from "@/lib/mock-data";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PortfolioOverview() {
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

  const getStatusBadge = (status: CovenantStatus) => {
    switch (status) {
      case "BREACH":
        return <Badge variant="destructive" className="flex w-fit items-center gap-1.5 px-2.5 py-0.5"><AlertCircle className="w-3.5 h-3.5" /> BREACH</Badge>;
      case "WARNING":
        return <Badge variant="outline" className="flex w-fit items-center gap-1.5 border-warning text-warning px-2.5 py-0.5"><AlertTriangle className="w-3.5 h-3.5" /> WARNING</Badge>;
      case "PASS":
        return <Badge variant="outline" className="flex w-fit items-center gap-1.5 border-emerald-500 text-emerald-600 px-2.5 py-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
            <p className="text-muted-foreground mt-1">Monitor debt covenants across all portfolio companies.</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Companies in Breach</CardTitle>
              <ShieldAlert className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.breach}</div>
            </CardContent>
          </Card>

          <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-warning-foreground">Companies in Warning</CardTitle>
              <AlertTriangle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning-foreground">{stats.warning}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Covenants Monitored</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCovenants}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Covenants</TableHead>
                <TableHead>Last Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_COMPANIES.map((company) => {
                const worstStatus = getWorstStatus(company);
                return (
                  <TableRow key={company.id} className="hover:bg-muted/50 transition-colors group cursor-pointer" data-testid={`row-company-${company.id}`}>
                    <TableCell className="font-medium">
                      <Link href={`/company/${company.id}`} className="block w-full h-full">
                        {company.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/company/${company.id}`} className="block w-full h-full">
                        {getStatusBadge(worstStatus)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/company/${company.id}`} className="block w-full h-full text-muted-foreground">
                        {company.covenants.length} monitored
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/company/${company.id}`} className="block w-full h-full text-muted-foreground">
                        {company.lastSync}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
