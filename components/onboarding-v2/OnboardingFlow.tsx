"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Step1UserType } from "./Step1UserType";
// Headphones removed — using logo.png instead
import { Step2UseCases } from "./Step2UseCases";
import { Step3Genres } from "./Step3Genres";
import { createClient } from "@/lib/supabase/client";

// ── Step transition variants ──────────────────────────────────────────────────

const stepVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
};

const stepTransition = { duration: 0.38, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 24 : 8,
            backgroundColor: i === current
              ? "#FF6A3D"
              : i < current
              ? "rgba(255,255,255,0.3)"
              : "rgba(255,255,255,0.12)",
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Acoustic"
      width={110}
      height={36}
      className="h-8 w-auto object-contain"
      style={{ mixBlendMode: "screen" }}
      priority
    />
  );
}

// ── Data state ────────────────────────────────────────────────────────────────

interface OnboardingData {
  userType: string;
  useCases: string[];
  genres: string[];
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward
  const [data, setData]       = useState<Partial<OnboardingData>>({});
  const [saving, setSaving]   = useState(false);

  const TOTAL_STEPS = 3;

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  // Step 1 handler
  const handleUserType = (userType: string) => {
    setData((d) => ({ ...d, userType }));
    goNext();
  };

  // Step 2 handler
  const handleUseCases = (useCases: string[]) => {
    setData((d) => ({ ...d, useCases }));
    goNext();
  };

  // Step 3 handler (final) — save + navigate to pricing
  const handleGenres = async (genres: string[]) => {
    const finalData: OnboardingData = {
      userType: data.userType ?? "other",
      useCases: data.useCases ?? [],
      genres,
    };
    setData(finalData);
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("users").upsert({
          id: user.id,
          email: user.email,
          plan: "free",
          persona: finalData.userType,
          use_cases: finalData.useCases,
          genres: finalData.genres,
        });
      }
    } catch (err) {
      console.warn("[onboarding] save failed:", err);
    } finally {
      setSaving(false);
    }

    // Brief fade before navigating
    router.push("/pricing?from=onboarding");
  };

  const stepContent = [
    <Step1UserType key="step1" onSelect={handleUserType} />,
    <Step2UseCases key="step2" onContinue={handleUseCases} />,
    <Step3Genres   key="step3" onContinue={handleGenres} />,
  ];

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF6A3D]/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-[#FF2E63]/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20">
        <Logo />
      </div>

      {/* Step content — centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
            className="w-full"
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots — fixed bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
        <ProgressDots current={step} total={TOTAL_STEPS} />
        {saving && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-white/30"
          >
            Saving preferences…
          </motion.p>
        )}
      </div>
    </div>
  );
}
