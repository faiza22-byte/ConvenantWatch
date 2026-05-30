import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import Admin from "@/pages/Admin";
import PortfolioOverview from "@/pages/PortfolioOverview";
import CompanyDashboard from "@/pages/CompanyDashboard";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (adminOnly && user.role !== "admin") {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, adminOnly, setLocation]);

  if (isLoading) return null;
  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;

  return <Component {...rest} />;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user?.role === "admin") {
        setLocation("/admin");
      } else if (user?.role === "company") {
        setLocation("/dashboard");
      } else {
        setLocation("/login");
      }
    }
  }, [user, isLoading, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      
      <Route path="/admin">
        <ProtectedRoute component={Admin} adminOnly={true} />
      </Route>
      
      <Route path="/portfolio">
        <ProtectedRoute component={PortfolioOverview} adminOnly={true} />
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute component={CompanyDashboard} />
      </Route>
      
      <Route path="/company/:id">
        {(params) => <ProtectedRoute component={CompanyDashboard} isAdminView={true} />}
      </Route>
      
      <Route path="/" component={RootRedirect} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;