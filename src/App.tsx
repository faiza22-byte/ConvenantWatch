import { useEffect } from "react";
import { Route, Switch, Router as WouterRouter, useLocation } from "wouter";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/lib/auth";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* =========================
   PAGES
========================= */

import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import CompanyDashboard from "@/pages/CompanyDashboard";
import LoanReportPage from "@/pages/LoanReportPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import PortfolioOverview from "@/pages/PortfolioOverview";

/* =========================
   QUERY CLIENT
========================= */

const queryClient = new QueryClient();

/* =========================
   ROOT REDIRECT
========================= */

function RootRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (user?.role === "admin") setLocation("/admin");
    else if (user?.role === "company") setLocation("/dashboard");
    else setLocation("/login");
  }, [user, isLoading]);

  return <div style={{ color: "white" }}>Redirecting...</div>;
}

/* =========================
   PROTECTED ROUTE (FIXED)
========================= */

function ProtectedRoute({
  component: Component,
  adminOnly = false,
  ...rest
}: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLocation("/login");
      return;
    }

    if (adminOnly && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, adminOnly]);

  if (isLoading) return <div>Loading auth...</div>;

  if (!user) return <div>Redirecting to login...</div>;

  if (adminOnly && user.role !== "admin")
    return <div>Not authorized</div>;

  return <Component {...rest} />;
}

/* =========================
   ROUTER
========================= */

function Router() {
  return (
    <Switch>

      {/* PUBLIC */}
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* ADMIN */}
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly={true} />}
      </Route>

      {/* PORTFOLIO */}
      <Route path="/portfolio">
        {() => <ProtectedRoute component={PortfolioOverview} adminOnly={true} />}
      </Route>

      <Route path="/loan-report/:companyId" component={LoanReportPage} />

      {/* DASHBOARD */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={CompanyDashboard} />}
      </Route>

      {/* COMPANY VIEW */}
      <Route path="/company/:id">
        {(params: any) => (
          <ProtectedRoute
            component={CompanyDashboard}
            companyId={params.id}
          />
        )}
      </Route>

      {/* ROOT */}
      <Route path="/" component={RootRedirect} />

      {/* FALLBACK */}
      <Route component={NotFound} />
    </Switch>
  );
}

/* =========================
   APP
========================= */

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;