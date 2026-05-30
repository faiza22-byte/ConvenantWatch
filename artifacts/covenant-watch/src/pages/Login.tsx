import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = login(email, password);
      if (user.role === "company") {
        setLocation("/dashboard");
      } else {
        setLocation("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4">
      <AnimatedBackground />
      
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="glass rounded-2xl p-8 glow-indigo">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              CovenantWatch
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Debt Covenant Intelligence</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  placeholder="name@company.com"
                  data-testid="input-email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  placeholder="••••••••"
                  data-testid="input-password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-white"
                  data-testid="btn-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0"
              data-testid="btn-login"
            >
              Sign In
            </Button>
          </form>

          <Collapsible className="mt-8">
            <CollapsibleTrigger className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center w-full">
              View Demo Credentials
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 p-4 rounded-lg bg-black/40 border border-white/5 text-xs text-muted-foreground space-y-2">
              <div className="flex justify-between"><span>cfo@acme.com</span><span>acme2025</span></div>
              <div className="flex justify-between"><span>cfo@vertex.com</span><span>vertex2025</span></div>
              <div className="flex justify-between"><span>cfo@cascade.com</span><span>cascade2025</span></div>
              <div className="flex justify-between"><span>cfo@summit.com</span><span>summit2025</span></div>
              <div className="flex justify-between text-indigo-400 border-t border-white/10 pt-2 mt-2">
                <span>admin@covenantwatch.com</span><span>CW_admin2025</span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mt-6 text-center">
          <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-white transition-colors">
            System Administration
          </Link>
        </div>
      </motion.div>
    </div>
  );
}