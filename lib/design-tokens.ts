/**
 * Design tokens — extracted from Home page (single source of truth).
 *
 * ALL pages must reference this file instead of hard-coding values.
 * DO NOT add tokens here that don't exist on the Home page.
 */

// ── Accent gradient (gold → orange → pink) ───────────────────────────────────
export const GRAD    = "linear-gradient(135deg, #FFC857 0%, #FF6A3D 50%, #FF2E63 100%)";
export const GRAD_90 = "linear-gradient(90deg,  #FFC857 0%, #FF6A3D 50%, #FF2E63 100%)";

// Individual accent stops
export const ACCENT_GOLD   = "#FFC857";
export const ACCENT_ORANGE = "#FF6A3D";
export const ACCENT_PINK   = "#FF2E63";

// ── Backgrounds ───────────────────────────────────────────────────────────────
export const BG_PRIMARY         = "#000000";   // page background
export const BG_CARD            = "#0e0e10";   // standard card
export const BG_CARD_ELEVATED   = "#111113";   // elevated card (creator plan, etc.)
export const BG_OVERLAY         = "rgba(255,255,255,0.025)";  // translucent panels

// ── Borders ───────────────────────────────────────────────────────────────────
export const BORDER_SUBTLE  = "rgba(255,255,255,0.05)";   // border-white/5
export const BORDER_DEFAULT = "rgba(255,255,255,0.08)";   // border-white/8
export const BORDER_HOVER   = "rgba(255,255,255,0.15)";   // hover state

// Highlighted card border (Creator / featured)
export const BORDER_ACCENT  = "rgba(255,106,61,0.4)";

// ── Text hierarchy ────────────────────────────────────────────────────────────
export const TEXT_PRIMARY   = "#ffffff";
export const TEXT_SECONDARY = "rgba(255,255,255,0.70)";
export const TEXT_MUTED     = "rgba(255,255,255,0.50)";
export const TEXT_FAINT     = "rgba(255,255,255,0.35)";
export const TEXT_GHOST     = "rgba(255,255,255,0.20)";

// ── Ambient glows (background decorations) ───────────────────────────────────
export const GLOW_TOP   = `radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,106,61,0.08) 0%, transparent 70%)`;
export const GLOW_HERO  = `
  radial-gradient(ellipse 90% 70% at 15% -5%, rgba(255,200,87,0.75) 0%, transparent 55%),
  radial-gradient(ellipse 70% 60% at 85%  5%, rgba(255,106,61,0.65) 0%, transparent 55%),
  radial-gradient(ellipse 60% 50% at 50% 25%, rgba(255,46,99,0.5)   0%, transparent 60%),
  linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 55%, #000 100%)
`;

// ── Typography ────────────────────────────────────────────────────────────────
export const FONT = "Inter, sans-serif";

// ── Radius ────────────────────────────────────────────────────────────────────
export const RADIUS_SM   = "8px";
export const RADIUS_MD   = "12px";
export const RADIUS_LG   = "16px";  // rounded-2xl equivalent
export const RADIUS_FULL = "9999px";

// ── Shadows ───────────────────────────────────────────────────────────────────
export const SHADOW_CARD_HIGHLIGHTED =
  "0 0 0 1px rgba(255,106,61,0.4), 0 8px 32px rgba(255,106,61,0.1)";

// ── Tailwind class helpers (for className strings) ────────────────────────────
export const tw = {
  // Pages
  pageBg:   "bg-black text-white",
  // Cards
  card:     "bg-[#0e0e10] border border-white/5 rounded-2xl",
  cardHover:"hover:border-white/10 transition-all",
  // Input fields
  input:    "bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#FF6A3D]/50 transition-colors",
  // Buttons
  btnPrimary: "rounded-xl text-white font-semibold transition-all hover:opacity-90",
  btnGhost:   "bg-white/5 border border-white/10 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all",
  // Labels
  label:    "text-xs font-medium text-white/50",
  // Error / success banners
  error:    "bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400",
  success:  "bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400",
} as const;
