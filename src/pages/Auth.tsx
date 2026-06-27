import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, User, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";

type Role = "candidate" | "company";
type Mode = "login" | "signup";

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const initialRole = (params.get("role") as Role | null) ?? null;
  const initialMode = (params.get("mode") as Mode | null) ?? "signup";

  const [role, setRole] = useState<Role | null>(initialRole);
  const [mode, setMode] = useState<Mode>(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Keep URL in sync so reloads land on the right step
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (role) next.set("role", role); else next.delete("role");
    next.set("mode", mode);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role && mode === "signup") return;
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Welcome back!");
      } else {
        await signUp(email, password, fullName, role!, role === "company" ? companyName : undefined);
        toast.success("Account created! Check your email to verify.");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    if (mode === "signup" && role) setRole(null);
    else navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {mode === "signup" && role ? "Choose a different account type" : "Back to home"}
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Logo className="h-10 md:h-12" />
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">RecruitIQ</h1>
          </div>
          <p className="text-muted-foreground">AI-powered hiring platform</p>
        </div>

        {/* Step 1: Role picker (signup only) */}
        {mode === "signup" && !role ? (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="font-display">Create your account</CardTitle>
              <CardDescription>Pick the experience that fits you</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className="group p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="font-semibold text-foreground mb-1">Job Seeker</div>
                <div className="text-xs text-muted-foreground">
                  Build an AI resume, apply, and take AI-led interviews.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("company")}
                className="group p-5 rounded-xl border-2 border-border hover:border-secondary hover:bg-secondary/5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-3 group-hover:bg-secondary/20 transition-colors">
                  <Building2 className="w-5 h-5 text-secondary" />
                </div>
                <div className="font-semibold text-foreground mb-1">Employer</div>
                <div className="text-xs text-muted-foreground">
                  Post jobs, get AI-ranked candidates, and run smart interviews.
                </div>
              </button>

              <div className="sm:col-span-2 text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-primary hover:underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Step 2: Form (login OR signup with chosen role)
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="font-display">
                {mode === "login"
                  ? "Welcome back"
                  : role === "company"
                  ? "Create employer account"
                  : "Create job seeker account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Sign in to your account"
                  : role === "company"
                  ? "Tell us about your company to start hiring"
                  : "A few details and you're ready to apply"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && role === "candidate" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="headline">Professional Headline <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
                    </div>
                  </>
                )}

                {mode === "signup" && role === "company" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Your Full Name</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Hiring manager name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Acme Inc." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Company Website <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input id="companyWebsite" type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://acme.com" />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-sm text-primary hover:underline"
                >
                  {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
