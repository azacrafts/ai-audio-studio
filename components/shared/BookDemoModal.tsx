"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Coffee, Video, ExternalLink } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const OPTIONS = [
  {
    label:       "I'm in Astana",
    title:       "Coffee Boarding",
    description: "A coffee and a walkthrough at a cozy spot.",
    href:        "https://calendar.app.google/5CvkwXCjst6ENqBh7",
    icon:        Coffee,
    accent:      "#FFC857",
    bg:          "rgba(255,200,87,0.07)",
    border:      "rgba(255,200,87,0.2)",
    hoverBorder: "rgba(255,200,87,0.5)",
  },
  {
    label:       "I'm not in Astana",
    title:       "Video call",
    description: "Quick video call — I'll walk you through everything.",
    href:        "https://calendar.app.google/WQiWAW5LJiiybG238",
    icon:        Video,
    accent:      "#FF6A3D",
    bg:          "rgba(255,106,61,0.07)",
    border:      "rgba(255,106,61,0.2)",
    hoverBorder: "rgba(255,106,61,0.5)",
  },
];

function ModalContent({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);
  const closeRef   = useRef<HTMLButtonElement>(null);

  /* ── Lock scroll ── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => closeRef.current?.focus(), 50);
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* ── ESC to close ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── Focus trap ── */
  useEffect(() => {
    if (!dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const trap  = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return (
    <>
      <style>{`
        @keyframes demoBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes demoDialogIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>

      {/* ── Backdrop — rendered directly in body, outside any stacking context ── */}
      <div
        ref={overlayRef}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          9999,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          padding:         "16px",
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter:  "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          animation:       "demoBackdropIn 200ms ease both",
        }}
        onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        {/* ── Dialog ── */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-title"
          style={{
            position:     "relative",
            width:        "100%",
            maxWidth:     "580px",
            background:   "#111113",
            border:       "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding:      "32px",
            boxShadow:    "0 24px 64px rgba(0,0,0,0.7)",
            animation:    "demoDialogIn 200ms cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Close */}
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              position:       "absolute",
              top:            "16px",
              right:          "16px",
              width:          "32px",
              height:         "32px",
              borderRadius:   "8px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "transparent",
              border:         "none",
              color:          "rgba(255,255,255,0.4)",
              cursor:         "pointer",
              transition:     "all 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color      = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.4)";
            }}
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <h2
              id="demo-title"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize:   "20px",
                fontWeight: 600,
                color:      "white",
                margin:     0,
                marginBottom: "6px",
              }}
            >
              Book a demo
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize:   "14px",
                color:      "rgba(255,255,255,0.5)",
                margin:     0,
              }}
            >
              Pick what works for you.
            </p>
          </div>

          {/* Options grid */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap:                 "16px",
            }}
          >
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <a
                  key={opt.href}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                  style={{
                    display:        "block",
                    borderRadius:   "12px",
                    padding:        "20px",
                    background:     opt.bg,
                    border:         `1px solid ${opt.border}`,
                    textDecoration: "none",
                    cursor:         "pointer",
                    transition:     "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
                    outline:        "none",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = opt.hoverBorder;
                    el.style.transform   = "scale(1.03)";
                    el.style.boxShadow   = "0 8px 28px rgba(0,0,0,0.45)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = opt.border;
                    el.style.transform   = "scale(1)";
                    el.style.boxShadow   = "none";
                  }}
                  onMouseDown={(e)  => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
                  onMouseUp={(e)    => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
                >
                  {/* Label */}
                  <p
                    style={{
                      fontFamily:    "Inter, sans-serif",
                      fontSize:      "10px",
                      fontWeight:    600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color:         opt.accent,
                      margin:        0,
                      marginBottom:  "16px",
                    }}
                  >
                    {opt.label}
                  </p>

                  {/* Icon placeholder */}
                  <div
                    style={{
                      width:          "100%",
                      height:         "96px",
                      borderRadius:   "10px",
                      marginBottom:   "16px",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      background:     `linear-gradient(135deg, ${opt.accent}18, ${opt.accent}06)`,
                      border:         `1px solid ${opt.accent}22`,
                    }}
                  >
                    <Icon style={{ width: "32px", height: "32px", color: opt.accent, opacity: 0.65 }} />
                  </div>

                  {/* Title + description */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      <p
                        style={{
                          fontFamily:   "Inter, sans-serif",
                          fontSize:     "14px",
                          fontWeight:   600,
                          color:        "white",
                          margin:       0,
                          marginBottom: "4px",
                        }}
                      >
                        {opt.title}
                      </p>
                      <p
                        style={{
                          fontFamily:  "Inter, sans-serif",
                          fontSize:    "12px",
                          color:       "rgba(255,255,255,0.45)",
                          margin:      0,
                          lineHeight:  1.6,
                        }}
                      >
                        {opt.description}
                      </p>
                    </div>
                    <ExternalLink
                      style={{
                        width:       "14px",
                        height:      "14px",
                        flexShrink:  0,
                        marginTop:   "2px",
                        color:       opt.accent,
                        opacity:     0.4,
                        transition:  "opacity 150ms",
                      }}
                    />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export function BookDemoModal({ isOpen, onClose }: Props) {
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(<ModalContent onClose={onClose} />, document.body);
}
