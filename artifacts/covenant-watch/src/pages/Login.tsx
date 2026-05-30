import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Lock, Mail, TrendingUp, Shield, Bell, BarChart3,
  User, Building2, Phone, ChevronRight, Check
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const FEATURES = [
  { icon: TrendingUp, title: "Real-Time Covenant Monitoring", desc: "Track all 5 covenant types against live QuickBooks data, updated nightly." },
  { icon: Bell, title: "90-Day Breach Forecasting", desc: "Predictive alerts warn you 60–90 days before a potential breach materializes." },
  { icon: Shield, title: "AI-Powered PDF Parsing", desc: "Upload any loan agreement and extract every covenant in under 60 seconds." },
  { icon: BarChart3, title: "Portfolio-Wide Oversight", desc: "Monitor all portfolio companies from a single command center dashboard." },
];

const FLOATING_CARDS = [
  { label: "Leverage Ratio", value: "3.85x", threshold: "≤ 4.0x", status: "WARNING", color: "amber" },
  { label: "Interest Coverage", value: "2.78x", threshold: "≥ 2.5x", status: "PASS", color: "emerald" },
  { label: "Current Ratio", value: "4.23x", threshold: "≤ 4.0x", status: "BREACH", color: "red" },
];

const INDUSTRIES = [
  "Manufacturing", "Healthcare", "Logistics & Transportation", "Technology",
  "Retail & Consumer", "Real Estate", "Energy", "Financial Services", "Other",
];

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const bar = ["bg-red-500", "bg-amber-400", "bg-emerald-400"][score - 1] ?? "bg-white/10";
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? bar : "bg-white/10"}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(c => (
          <span key={c.label} className={`flex items-center gap-1 text-[10px] transition-colors ${c.pass ? "text-emerald-400" : "text-white/30"}`}>
            <Check className="w-2.5 h-2.5" />{c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Sign-up fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
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

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    // Simulate successful sign-up
    setSignupSuccess(true);
  };

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setError("");
    setSignupSuccess(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <AnimatedBackground />

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col flex-1 relative z-10 p-12 justify-between overflow-hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/40">
              CW
            </div>
            <span className="text-xl font-bold text-white">CovenantWatch</span>
          </div>
        </div>

        <div className="max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Trusted by 200+ PE-backed CFOs
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              Covenant breach protection for{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
                private equity
              </span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed mb-10">
              Stop discovering covenant breaches after they happen. Monitor daily, forecast 90 days ahead, and act before your lender does.
            </p>
          </motion.div>

          <motion.div
            className="relative h-52 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {FLOATING_CARDS.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: -30, y: 10 * i }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: "easeOut" }}
                style={{ top: `${i * 52}px`, left: `${i * 24}px`, zIndex: 3 - i }}
                className={`absolute w-72 glass rounded-xl p-4 border flex items-center justify-between
                  ${card.color === "emerald" ? "border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.12)]" :
                    card.color === "amber" ? "border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.12)]" :
                    "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]"}`}
              >
                <div>
                  <p className="text-white/50 text-xs mb-0.5">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color === "emerald" ? "text-emerald-400" : card.color === "amber" ? "text-amber-400" : "text-red-400"}`}>
                    {card.value}
                  </p>
                  <p className="text-white/30 text-xs">{card.threshold}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
                  ${card.color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    card.color === "amber" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {card.status}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium leading-tight">{f.title}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex items-center gap-6 text-white/25 text-xs">
          <span>Private &amp; Secure</span>
          <span>SOC 2 Type II</span>
          <span>99.9% Uptime</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col justify-center w-full lg:w-[500px] xl:w-[540px] flex-shrink-0 relative z-10 p-6 lg:p-10 lg:border-l lg:border-white/10 lg:bg-[#070B14]/60 lg:backdrop-blur-2xl overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">CW</div>
          <span className="text-xl font-bold text-white">CovenantWatch</span>
        </div>

        {/* Mode toggle */}
        <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mb-8">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "signin" ? "bg-indigo-500/20 text-white border border-indigo-500/30 shadow" : "text-white/40 hover:text-white/60"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "signup" ? "bg-indigo-500/20 text-white border border-indigo-500/30 shadow" : "text-white/40 hover:text-white/60"}`}
          >
            Create Account
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── SIGN IN ── */}
          {mode === "signin" && (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                <p className="text-white/50 text-sm mt-1">Sign in to your covenant monitoring platform</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/60 text-xs uppercase tracking-wide">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                      placeholder="name@company.com"
                      data-testid="input-email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-white/60 text-xs uppercase tracking-wide">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                      placeholder="••••••••"
                      data-testid="input-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-white/30 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] mt-2"
                  data-testid="btn-login"
                >
                  Sign In to CovenantWatch
                </Button>
              </form>

              <Collapsible className="mt-6">
                <CollapsibleTrigger className="text-xs text-indigo-400/70 hover:text-indigo-300 flex items-center justify-center w-full gap-1.5 transition-colors">
                  <span className="w-1 h-1 rounded-full bg-indigo-400/70" />
                  View demo credentials
                  <span className="w-1 h-1 rounded-full bg-indigo-400/70" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 rounded-xl bg-black/30 border border-white/8 divide-y divide-white/5 overflow-hidden text-xs">
                  {[
                    { email: "cfo@acme.com", pass: "acme2025", company: "Acme Industries" },
                    { email: "cfo@vertex.com", pass: "vertex2025", company: "Vertex Manufacturing" },
                    { email: "cfo@cascade.com", pass: "cascade2025", company: "Cascade Logistics" },
                    { email: "cfo@summit.com", pass: "summit2025", company: "Summit Healthcare" },
                  ].map((c) => (
                    <div
                      key={c.email}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 cursor-pointer"
                      onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                    >
                      <div>
                        <p className="text-white/70">{c.email}</p>
                        <p className="text-white/30 text-[10px]">{c.company}</p>
                      </div>
                      <span className="text-white/40 font-mono">{c.pass}</span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 cursor-pointer bg-indigo-500/5"
                    onClick={() => { setEmail("admin@covenantwatch.com"); setPassword("CW_admin2025"); }}
                  >
                    <div>
                      <p className="text-indigo-400">admin@covenantwatch.com</p>
                      <p className="text-white/30 text-[10px]">System Administrator</p>
                    </div>
                    <span className="text-indigo-400/60 font-mono">CW_admin2025</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )}

          {/* ── SIGN UP ── */}
          {mode === "signup" && !signupSuccess && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Create your account</h2>
                <p className="text-white/50 text-sm mt-1">Start monitoring covenants in minutes — no credit card required</p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                    {error}
                  </div>
                )}

                {/* Row: Full name + Job title */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Full Name <span className="text-red-400">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                        placeholder="Jane Smith"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Job Title</Label>
                    <Input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                      placeholder="CFO, Finance Director…"
                    />
                  </div>
                </div>

                {/* Company name */}
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Company Name <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-9 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                      placeholder="Acme Industries LLC"
                      required
                    />
                  </div>
                </div>

                {/* Industry + phone row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Industry</Label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm px-3 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="" className="bg-[#0D1222]">Select industry</option>
                      {INDUSTRIES.map(i => <option key={i} value={i} className="bg-[#0D1222]">{i}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Work Email <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-9 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                      placeholder="jane@company.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Password <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      type={showSignupPass ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-9 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPass(!showSignupPass)}
                      className="absolute right-3 top-3 text-white/30 hover:text-white/70 transition-colors"
                    >
                      {showSignupPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={signupPassword} />
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Confirm Password <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-9 h-11 bg-white/5 border text-white placeholder:text-white/20 rounded-xl ${
                        confirmPassword && confirmPassword !== signupPassword ? "border-red-500/40" : "border-white/10"
                      }`}
                      placeholder="Re-enter your password"
                      required
                    />
                    {confirmPassword && confirmPassword === signupPassword && (
                      <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                </div>

                <p className="text-white/30 text-[10px] leading-relaxed pt-1">
                  By creating an account you agree to our{" "}
                  <span className="text-indigo-400 cursor-pointer hover:underline">Terms of Service</span> and{" "}
                  <span className="text-indigo-400 cursor-pointer hover:underline">Privacy Policy</span>.
                </p>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
                  data-testid="btn-signup"
                >
                  Create My Account <ChevronRight className="w-4 h-4" />
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── SIGN UP SUCCESS ── */}
          {mode === "signup" && signupSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(52,211,153,0.2)]">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Account request submitted!</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-1">
                Welcome, <span className="text-white">{fullName}</span>.
              </p>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                We'll review your application for <span className="text-white">{companyName}</span> and send onboarding instructions to <span className="text-indigo-400">{signupEmail}</span> within 1 business day.
              </p>
              <Button
                onClick={() => switchMode("signin")}
                className="h-10 px-6 bg-white/8 hover:bg-white/12 border border-white/10 text-white rounded-xl text-sm"
              >
                Back to Sign In
              </Button>
            </motion.div>
          )}

        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-white/8 text-center">
          <Link href="/admin/login" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            System Administration Access
          </Link>
        </div>
      </div>
    </div>
  );
}
