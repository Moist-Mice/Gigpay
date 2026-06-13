'use client'

import { useEffect, useRef, useState } from "react";

interface ScrambleHeadingProps {
  label: string;
  plain: string;
  accent: string;
}

export function ScrambleHeading({ label, plain, accent }: ScrambleHeadingProps) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const fadeUp: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    transition: "opacity 0.55s ease, transform 0.55s ease",
  };

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        width: "100%",
        marginBottom: "4rem",
      }}
    >
      {/* Eyebrow label */}
      <div style={{ ...fadeUp, transitionDelay: "0ms", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)" }} />
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.6rem",
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
        }}>
          {label}
        </span>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)" }} />
      </div>

      {/* Heading */}
      <div
        role="heading"
        aria-level={2}
        style={{
          ...fadeUp,
          transitionDelay: "70ms",
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(1.3rem, 2.2vw, 1.9rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--foreground)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "0 0.22em",
          margin: 0,
        }}
      >
        {plain && <span>{plain}</span>}

        {/* Accent word — interactive underline */}
        <span
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            display: "inline-block",
            transform: hovered ? "translateY(-2px)" : "translateY(0)",
            transition: "transform 0.25s ease",
          }}
        >
          {accent}

          {/* Underline element */}
          <span style={{
            position: "absolute",
            left: 0,
            bottom: "-3px",
            width: "100%",
            height: "2px",
            borderRadius: "99px",
            background: "var(--primary)",
            boxShadow: hovered
              ? "0 0 8px var(--primary), 0 0 16px color-mix(in srgb, var(--primary) 50%, transparent)"
              : "none",
            transform: hovered ? "scaleX(1)" : "scaleX(0.6)",
            transformOrigin: "left",
            transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease",
          }} />
        </span>
      </div>
    </div>
  );
}
