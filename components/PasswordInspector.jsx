"use client";

import React, { useState } from "react";
import { formatCrackDuration } from "../lib/strength";

export default function PasswordInspector({
  password,
  setPassword,
  score,
  strengthLabel,
  crackTime,
  rawCrackTimes,
  feedbackWarning,
  feedbackSuggestions,
  breachCount,
  checkingBreach,
  fullSha1,
  onGenerateAlternative,
  t,
  mono,
}) {
  const [visible, setVisible] = useState(false);
  const [showAttackMatrix, setShowAttackMatrix] = useState(false);

  const getScoreColor = (val) => {
    if (breachCount > 0) return t.danger;
    if (val === null || val === undefined) return t.track;
    if (val <= 1) return t.danger;
    if (val === 2) return t.warning;
    return t.success;
  };

  const checklist = [
    { label: "At least 10 characters", passed: password.length >= 10 },
    { label: "Uppercase & lowercase letters", passed: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Numeric digits", passed: /[0-9]/.test(password) },
    { label: "Special symbol", passed: /[^A-Za-z0-9]/.test(password) },
    { label: "Uncompromised in known breaches", passed: breachCount === 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Input Card */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: "20px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontFamily: mono,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: t.textSecondary,
              textTransform: "uppercase",
            }}
          >
            Password input
          </label>
          {password && (
            <span style={{ fontSize: 11, fontFamily: mono, color: t.textMuted }}>
              {password.length} characters
            </span>
          )}
        </div>

        {/* Input Field with Inline Controls */}
        <div style={{ position: "relative" }}>
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type or paste a password…"
            autoComplete="off"
            spellCheck="false"
            style={{
              width: "100%",
              padding: "11px 90px 11px 13px",
              fontSize: 15,
              fontFamily: mono,
              borderRadius: 6,
              border: `1px solid ${password ? t.borderHighlight : t.border}`,
              background: t.surfaceSubtle,
              color: t.text,
              outline: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {password && (
              <button
                type="button"
                onClick={() => setPassword("")}
                style={{
                  background: "none",
                  border: "none",
                  color: t.textMuted,
                  cursor: "pointer",
                  padding: "3px 6px",
                  fontSize: 12,
                  fontFamily: mono,
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.textSecondary,
                cursor: "pointer",
                fontSize: 11,
                fontFamily: mono,
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Multi-segment Strength Meter */}
        {password && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2, 3].map((segIndex) => {
                const isFilled = score !== null && segIndex <= score;
                return (
                  <div
                    key={segIndex}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: isFilled ? getScoreColor(score) : t.track,
                      transition: "background 0.15s ease",
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: getScoreColor(score),
                  }}
                >
                  {strengthLabel}
                </span>
                {score !== null && (
                  <span style={{ fontSize: 11, fontFamily: mono, color: t.textMuted }}>
                    (Score: {score}/4)
                  </span>
                )}
              </div>

              {crackTime && (
                <span style={{ fontSize: 12, fontFamily: mono, color: t.textSecondary }}>
                  Crack resistance: ≈ {crackTime}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Telemetry & Breach Status Details */}
      {password && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Breach Status Banner */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${t.border}`,
              background:
                breachCount > 0 ? t.dangerBg : breachCount === 0 ? t.successBg : t.surface,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background:
                    breachCount > 0
                      ? t.danger
                      : breachCount === 0
                      ? t.success
                      : t.textMuted,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      breachCount > 0
                        ? t.danger
                        : breachCount === 0
                        ? t.success
                        : t.text,
                  }}
                >
                  {checkingBreach
                    ? "Checking breach exposure…"
                    : breachCount > 0
                    ? `Compromised: Found in ${breachCount.toLocaleString()} known data breaches`
                    : breachCount === 0
                    ? "Clean: No breach records found"
                    : "HIBP service unreachable"}
                </div>
                <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 2 }}>
                  {breachCount > 0
                    ? "This password appears in known credential dumps. Treat it as exposed regardless of complexity."
                    : breachCount === 0
                    ? "Validated against 900M+ pwned passwords via k-anonymity range lookup."
                    : "Could not reach haveibeenpwned.com. Offline calculations remain accurate."}
                </div>
              </div>
            </div>

            {breachCount > 0 && (
              <button
                type="button"
                onClick={onGenerateAlternative}
                style={{
                  padding: "5px 11px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${t.dangerBorder}`,
                  borderRadius: 5,
                  background: t.surface,
                  color: t.danger,
                  cursor: "pointer",
                }}
              >
                Generate safe alternative →
              </button>
            )}
          </div>

          {/* Technical Inspector Metrics Table */}
          <div style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: mono,
                fontWeight: 600,
                color: t.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 10,
              }}
            >
              Cryptographic &amp; Heuristic Breakdown
            </div>

            {/* SHA-1 k-Anonymity Partition Representation */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 6,
                background: t.surfaceSubtle,
                fontSize: 12,
                fontFamily: mono,
                marginBottom: 12,
              }}
            >
              <span style={{ color: t.textMuted }}>SHA-1 Hash:</span>
              <div>
                {fullSha1 ? (
                  <>
                    <span style={{ color: t.accent, fontWeight: 700 }}>
                      {fullSha1.slice(0, 5)}
                    </span>
                    <span style={{ color: t.textMuted }}>
                      {"·".repeat(20)}
                    </span>
                    <span style={{ color: t.textSecondary }}>
                      {fullSha1.slice(35)}
                    </span>
                    <span style={{ fontSize: 10, color: t.textMuted, marginLeft: 8 }}>
                      (first 5 sent to API)
                    </span>
                  </>
                ) : (
                  <span style={{ color: t.textMuted }}>Computing…</span>
                )}
              </div>
            </div>

            {/* Checklist Items */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              {checklist.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12,
                    color: item.passed ? t.text : t.textMuted,
                  }}
                >
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      fontWeight: 700,
                      color: item.passed ? t.success : t.textMuted,
                    }}
                  >
                    {item.passed ? "Y" : "N"}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Advisory / Feedback Warning */}
          {(feedbackWarning || feedbackSuggestions.length > 0) && (
            <div
              style={{
                borderTop: `1px solid ${t.border}`,
                padding: "12px 20px",
                background: t.surfaceSubtle,
                fontSize: 12.5,
              }}
            >
              {feedbackWarning && (
                <div style={{ color: t.warning, fontWeight: 600, marginBottom: 2 }}>
                  Finding: {feedbackWarning}
                </div>
              )}
              {feedbackSuggestions.map((sug, i) => (
                <div key={i} style={{ color: t.textSecondary }}>
                  Recommendation: {sug}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hardware Attack Simulation Matrix */}
      {rawCrackTimes && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setShowAttackMatrix(!showAttackMatrix)}
            style={{
              width: "100%",
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              color: t.textSecondary,
            }}
          >
            <span>Offline &amp; Online Attack Scenarios</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: t.accent }}>
              {showAttackMatrix ? "Collapse [ - ]" : "Expand [ + ]"}
            </span>
          </button>

          {showAttackMatrix && (
            <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${t.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: "left", color: t.textMuted }}>
                    <th style={{ padding: "6px 0", fontWeight: 500 }}>Vector / Environment</th>
                    <th style={{ padding: "6px 0", fontWeight: 500 }}>Guess rate</th>
                    <th style={{ padding: "6px 0", fontWeight: 500 }}>Estimated duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "8px 0", color: t.text }}>Online login (rate-limited)</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, color: t.textMuted }}>100 / hour</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, fontWeight: 600, color: t.success }}>
                      {formatCrackDuration(rawCrackTimes.online_throttling_100_per_hour)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "8px 0", color: t.text }}>Online API (unthrottled)</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, color: t.textMuted }}>10 / second</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, fontWeight: 600, color: t.text }}>
                      {formatCrackDuration(rawCrackTimes.online_no_throttling_10_per_second)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "8px 0", color: t.text }}>Offline slow hash (Argon2 / bcrypt)</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, color: t.textMuted }}>10,000 / sec</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, fontWeight: 600, color: t.text }}>
                      {formatCrackDuration(rawCrackTimes.offline_slow_hashing_1e4_per_second)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: t.text }}>Offline GPU cluster (8x RTX 4090 / MD5)</td>
                    <td style={{ padding: "8px 0", fontFamily: mono, color: t.textMuted }}>10,000,000,000 / sec</td>
                    <td
                      style={{
                        padding: "8px 0",
                        fontFamily: mono,
                        fontWeight: 700,
                        color: crackTime?.includes("second") || crackTime?.includes("instant") ? t.danger : t.success,
                      }}
                    >
                      {formatCrackDuration(rawCrackTimes.offline_fast_hashing_1e10_per_second)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

