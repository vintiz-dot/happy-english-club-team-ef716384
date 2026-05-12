import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { GraduationCap, Sparkles, Lock, Mail, Eye, EyeOff, Rocket, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "login" | "signup" | "forgot";
type UserRole = "admin" | "teacher" | "family" | "student";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [checkingAdmins, setCheckingAdmins] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      const state = location.state as { redirectTo?: string } | null;
      const redirectTo = state?.redirectTo || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, location]);

  const checkForAdmins = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'checkAdmins' }
      });

      if (error) {
        console.error('Error checking for admins:', error);
      } else {
        setShowBootstrap(!data.hasAdmins);
      }
    } catch (error) {
      console.error('Error checking for admins:', error);
    } finally {
      setCheckingAdmins(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'bootstrap' }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Use the credentials returned from the server (secure random credentials)
      if (data.temporaryPassword && data.email) {
        toast.success(
          `Admin account created!\n\nEmail: ${data.email}\nTemporary Password: ${data.temporaryPassword}\n\nPlease save these credentials and change the password immediately!`,
          { duration: 30000 }
        );
        
        // Set the email field so user can manually login
        setEmail(data.email);
        setShowBootstrap(false);
        setMode("login");
        
        // Note: We do NOT auto-login - user must manually login with the provided credentials
        // This is more secure as it forces the user to acknowledge and save the credentials
      } else {
        throw new Error('Bootstrap failed - no credentials returned from server');
      }
    } catch (error: any) {
      toast.error("Bootstrap failed: " + error.message);
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    checkForAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success("Login successful! Welcome back!");
        
        const state = location.state as { redirectTo?: string } | null;
        const redirectTo = state?.redirectTo || "/dashboard";
        navigate(redirectTo);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });

        if (error) throw error;

        toast.success("Reset email sent! Check your email for a password reset link.");
        setMode("login");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              role: role,
            },
          },
        });

        if (error) throw error;

        toast.success("Registration successful! Your account has been created.");
        
        const state = location.state as { redirectTo?: string } | null;
        const redirectTo = state?.redirectTo || "/dashboard";
        navigate(redirectTo);
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmins) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center">
        <div className="glass-premium rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated floating orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <Card className="glass-premium w-full max-w-md border-0 shadow-2xl relative z-10 overflow-hidden backdrop-blur-xl">
        {/* Glossy overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
        
        <CardHeader className="space-y-4 relative">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-2xl">
                <GraduationCap className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-base flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>Education Management System</span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 relative">
          {showBootstrap && (
            <div className="glass rounded-xl p-4 border border-primary/30 space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">System Setup Required</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    No admin account exists. Create the first admin to get started.
                  </p>
                  <Button
                    onClick={handleBootstrap}
                    disabled={bootstrapping}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300"
                  >
                    {bootstrapping ? "Setting up..." : "Create First Admin"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass border-primary/20 focus:border-primary transition-all duration-300 h-11"
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-primary" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="glass border-primary/20 focus:border-primary transition-all duration-300 h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">Account Type</Label>
                <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                  <SelectTrigger className="glass border-primary/20 focus:border-primary transition-all duration-300 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-primary hover:text-accent transition-colors"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : mode === "signup" ? (
                "Create Account"
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-primary/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="glass px-3 py-1 rounded-full text-muted-foreground">
                {mode === "login" ? "New here?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {mode === "login" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("signup")}
                className="flex-1 glass border-primary/20 hover:border-primary hover:bg-primary/10 transition-all duration-300"
              >
                Sign Up
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("login")}
                className="flex-1 glass border-primary/20 hover:border-primary hover:bg-primary/10 transition-all duration-300"
              >
                Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
