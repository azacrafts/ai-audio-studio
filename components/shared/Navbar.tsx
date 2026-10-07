"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Zap, LogIn, LogOut, User, ChevronDown, CalendarDays } from "lucide-react";
// Note: Button component removed — replaced with native <button> + design tokens
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { BookDemoModal } from "@/components/shared/BookDemoModal";
import { GRAD } from "@/lib/design-tokens";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const links = [
    { href: "/", label: "Home" },
    { href: "/generate", label: "Studio" },
    { href: "/editor", label: "Editor" },
    { href: "/pricing", label: "Pricing" },
  ];

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchPlan(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchPlan(session.user.id);
        else setPlan("free");
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchPlan = async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    if (data?.plan) setPlan(data.plan);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const PLAN_COLORS: Record<string, string> = {
    creator: "text-[#FFC857] bg-[#FFC857]/10",
    pro:     "text-[#FF6A3D] bg-[#FF6A3D]/10",
    free:    "text-white/30 bg-white/5",
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ background: "rgba(10,10,10,0.92)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/logo.png"
            alt="Acoustic"
            width={120}
            height={40}
            className="h-9 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
            style={{ mixBlendMode: "screen" }}
            priority
          />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Book a demo — always visible */}
          <button
            onClick={() => setDemoOpen(true)}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3.5 py-1.5 rounded-lg transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Book a demo
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: GRAD }}
                >
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-white/70 hidden sm:block max-w-[120px] truncate">
                  {user.email?.split("@")[0]}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                    PLAN_COLORS[plan] ?? PLAN_COLORS.free
                  )}
                >
                  {plan}
                </span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", menuOpen && "rotate-180")} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-xs text-white/50 truncate">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      Upgrade plan
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth">
                <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </button>
              </Link>
              <Link href="/pricing">
                <button
                  className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: GRAD }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Upgrade
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      <BookDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </header>
  );
}
