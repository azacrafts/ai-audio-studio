"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GRAD, tw } from "@/lib/design-tokens";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/";

  const [mode,         setMode]         = useState<Mode>("signin");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        router.push("/onboarding");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(redirect);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Ambient glow — home palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(ellipse, rgba(255,106,61,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5">
            <Image
              src="/logo.png"
              alt="Acoustic"
              width={140}
              height={46}
              className="h-10 w-auto object-contain"
              style={{ mixBlendMode: "screen" }}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-white/40 mt-1 text-center">
            {mode === "signin"
              ? "Sign in to your Acoustic studio"
              : "Start generating AI audio for free"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === m ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              )}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block ${tw.label} mb-1.5`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={tw.input + " w-full"}
            />
          </div>

          <div>
            <label className={`block ${tw.label} mb-1.5`}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className={tw.input + " w-full pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error   && <div className={tw.error}>{error}</div>}
          {success && <div className={tw.success}>{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 ${tw.btnPrimary} flex items-center justify-center gap-2 text-sm`}
            style={{ background: GRAD }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-6">
          By continuing, you agree to our{" "}
          <span className="text-white/40 cursor-pointer hover:text-white/60">Terms of Service</span>
        </p>
      </div>
    </div>
  );
}
