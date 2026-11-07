"use client";

import React from "react";

export default function Header({ checkingBreach, theme, setTheme, t, mono }) {
  return (
    <header
      style={{
        borderBottom: `1px solid ${t.border}`,
        background: t.surface,
        padding: "12px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: mono,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: t.text,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: checkingBreach ? t.warning : t.success,
                display: "inline-block",
              }}
            />
            KEYGUARD
          </span>
          <span style={{ color: t.textMuted, fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: t.textSecondary, fontWeight: 400 }}>
            Password Inspector &amp; Generator
          </span>
        </div>

        {/* Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: mono,
              color: t.textMuted,
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${t.border}`,
              background: t.surfaceSubtle,
            }}
          >
            k-anonymity active
          </span>

          {/* Segmented Theme Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: t.surfaceSubtle,
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              padding: 2,
            }}
          >
            {["system", "dark", "light"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontFamily: mono,
                  border: "none",
                  borderRadius: 4,
                  background: theme === mode ? t.surface : "transparent",
                  color: theme === mode ? t.text : t.textMuted,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

