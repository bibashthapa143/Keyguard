"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import zxcvbn from "zxcvbn";

const CHAR_SETS = {
  uppercase: { label: "Uppercase", sample: "A-Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  lowercase: { label: "Lowercase", sample: "a-z", chars: "abcdefghijklmnopqrstuvwxyz" },
  numbers: { label: "Numbers", sample: "0-9", chars: "0123456789" },
  symbols: { label: "Symbols", sample: "!@#$%…", chars: "!@#$%^&*()_+-=[]{}|;:,.<>?" },
};

const MEMORABLE_WORDS = [
  "acorn", "amber", "anchor", "apron", "artist", "atom", "autumn", "bacon",
  "badge", "banana", "beacon", "breeze", "bubble", "cactus", "candle", "canyon",
  "castle", "cedar", "clover", "comet", "coral", "crater", "crystal", "desert",
  "dolphin", "dragon", "eagle", "echo", "ember", "falcon", "forest", "frost",
  "galaxy", "glacier", "harbor", "haven", "horizon", "island", "jungle", "lagoon",
  "lantern", "marble", "meadow", "meteor", "mountain", "nebula", "oasis", "ocean",
  "orchid", "palace", "pathway", "pebble", "planet", "prism", "quartz", "radar",
  "ridge", "river", "safari", "shadow", "summit", "timber", "twilight", "valley",
  "velvet", "vortex", "whisper", "zenith"
];

function getSecureRandomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("inspect"); // "inspect" | "generate"

  // --- Inspector State ---
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState(null);
  const [strengthLabel, setStrengthLabel] = useState(null);
  const [crackTime, setCrackTime] = useState(null);
  const [rawCrackTimes, setRawCrackTimes] = useState(null);
  const [feedbackWarning, setFeedbackWarning] = useState(null);
  const [feedbackSuggestions, setFeedbackSuggestions] = useState([]);
  const [breachCount, setBreachCount] = useState(null);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [fullSha1, setFullSha1] = useState(null);
  const [showAttackMatrix, setShowAttackMatrix] = useState(false);

  // --- Generator State ---
  const [genMode, setGenMode] = useState("random"); // "random" | "passphrase"
  const [genLength, setGenLength] = useState(16);
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalizeWords, setCapitalizeWords] = useState(true);
  const [includeNumberInPassphrase, setIncludeNumberInPassphrase] = useState(true);

  const [genOptions, setGenOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [clipboardTimer, setClipboardTimer] = useState(null);
  const clipboardTimeoutRef = useRef(null);

  const [genStrengthLabel, setGenStrengthLabel] = useState(null);
  const [genCrackTime, setGenCrackTime] = useState(null);

  // --- Theme State ---
  const [theme, setTheme] = useState("system");
  const [resolvedTheme, setResolvedTheme] = useState("dark");

  useEffect(() => {
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setResolvedTheme(prefersDark ? "dark" : "light");
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(e) {
      setResolvedTheme(e.matches ? "dark" : "light");
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const isDark = resolvedTheme === "dark";

  // Intentional, human-designed restrained palette (no cartoon colors or neon)
  const t = {
    bg: isDark ? "#0D0E11" : "#F8F9FA",
    surface: isDark ? "#14161A" : "#FFFFFF",
    surfaceSubtle: isDark ? "#1A1D23" : "#F1F3F5",
    surfaceElevated: isDark ? "#20242B" : "#E9ECEF",
    border: isDark ? "#262930" : "#E2E5E9",
    borderHighlight: isDark ? "#363A45" : "#CED4DA",
    text: isDark ? "#F1F3F5" : "#1A1D20",
    textSecondary: isDark ? "#9498A4" : "#495057",
    textMuted: isDark ? "#636773" : "#868E96",
    track: isDark ? "#23262E" : "#E9ECEF",
    primary: isDark ? "#EDEDEF" : "#111315",
    primaryBg: isDark ? "#FFFFFF" : "#111315",
    primaryText: isDark ? "#0D0E11" : "#FFFFFF",
    accent: "#3B82F6",
    accentText: "#FFFFFF",
    danger: isDark ? "#F87171" : "#DC2626",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.08)" : "#FEF2F2",
    dangerBorder: isDark ? "rgba(239, 68, 68, 0.25)" : "#FEE2E2",
    warning: isDark ? "#FBBF24" : "#D97706",
    warningBg: isDark ? "rgba(245, 158, 11, 0.08)" : "#FFFBEB",
    warningBorder: isDark ? "rgba(245, 158, 11, 0.25)" : "#FEF3C7",
    success: isDark ? "#34D399" : "#059669",
    successBg: isDark ? "rgba(16, 185, 129, 0.08)" : "#ECFDF5",
    successBorder: isDark ? "rgba(16, 185, 129, 0.25)" : "#D1FAE5",
  };

  const mono = "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace";
  const sans = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  function formatCrackDuration(seconds) {
    if (seconds < 0.01) return "instant";
    if (seconds < 1) return "< 1 second";

    const units = [
      { label: "seconds", secs: 1 },
      { label: "minutes", secs: 60 },
      { label: "hours", secs: 60 * 60 },
      { label: "days", secs: 60 * 60 * 24 },
      { label: "months", secs: 60 * 60 * 24 * 30 },
      { label: "years", secs: 60 * 60 * 24 * 365 },
      { label: "centuries", secs: 60 * 60 * 24 * 365 * 100 },
    ];

    let chosen = units[0];
    for (const unit of units) {
      if (seconds >= unit.secs) chosen = unit;
    }

    const value = seconds / chosen.secs;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${chosen.label}`;
  }

  function evaluateStrength(pwd) {
    if (!pwd) {
      return {
        score: null,
        label: null,
        crackTime: null,
        rawCrackTimes: null,
        warning: null,
        suggestions: [],
      };
    }
    const result = zxcvbn(pwd);
    const scoreMap = ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"];
    const rawSeconds = result.crack_times_seconds.offline_fast_hashing_1e10_per_second;

    return {
      score: result.score,
      label: scoreMap[result.score],
      crackTime: formatCrackDuration(rawSeconds),
      rawCrackTimes: result.crack_times_seconds,
      warning: result.feedback.warning || null,
      suggestions: result.feedback.suggestions || [],
    };
  }

  async function calculateSha1(text) {
    const data = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest("SHA-1", data);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  // --- Real-time Debounced Credential Analysis ---
  useEffect(() => {
    if (!password) {
      setScore(null);
      setStrengthLabel(null);
      setCrackTime(null);
      setRawCrackTimes(null);
      setFeedbackWarning(null);
      setFeedbackSuggestions([]);
      setBreachCount(null);
      setFullSha1(null);
      setCheckingBreach(false);
      return;
    }

    // 1. Immediate local heuristic analysis
    const result = evaluateStrength(password);
    setScore(result.score);
    setStrengthLabel(result.label);
    setCrackTime(result.crackTime);
    setRawCrackTimes(result.rawCrackTimes);
    setFeedbackWarning(result.warning);
    setFeedbackSuggestions(result.suggestions);

    // 2. Debounced k-anonymity breach query
    setCheckingBreach(true);
    const timer = setTimeout(async () => {
      try {
        const hash = await calculateSha1(password);
        setFullSha1(hash);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          headers: { "Add-Padding": "true" },
        });

        if (!res.ok) throw new Error("HIBP API unreachable");

        const text = await res.text();
        const lines = text.split("\n");
        let foundCount = 0;
        for (const line of lines) {
          const [lineSuffix, count] = line.split(":");
          if (lineSuffix && lineSuffix.trim() === suffix) {
            foundCount = parseInt(count, 10);
            break;
          }
        }

        setBreachCount(foundCount);
        if (foundCount > 0) {
          setStrengthLabel("Compromised");
          setScore(0);
        }
      } catch (err) {
        setBreachCount(-1);
      } finally {
        setCheckingBreach(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [password]);

  // --- Generator Engine ---
  const generateSecret = useCallback(() => {
    let result = "";

    if (genMode === "random") {
      const activeKeys = Object.keys(genOptions).filter((k) => genOptions[k]);
      if (activeKeys.length === 0) return;

      let pool = "";
      const mandatory = [];

      activeKeys.forEach((key) => {
        const chars = CHAR_SETS[key].chars;
        pool += chars;
        mandatory.push(chars[getSecureRandomInt(chars.length)]);
      });

      const remaining = Math.max(0, genLength - mandatory.length);
      const chars = [...mandatory];

      for (let i = 0; i < remaining; i++) {
        chars.push(pool[getSecureRandomInt(pool.length)]);
      }

      for (let i = chars.length - 1; i > 0; i--) {
        const j = getSecureRandomInt(i + 1);
        const temp = chars[i];
        chars[i] = chars[j];
        chars[j] = temp;
      }

      result = chars.join("");
    } else {
      const words = [];
      for (let i = 0; i < wordCount; i++) {
        let word = MEMORABLE_WORDS[getSecureRandomInt(MEMORABLE_WORDS.length)];
        if (capitalizeWords) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        words.push(word);
      }

      if (includeNumberInPassphrase) {
        const digit = getSecureRandomInt(100);
        const idx = getSecureRandomInt(words.length);
        words[idx] = `${words[idx]}${digit}`;
      }

      result = words.join(separator);
    }

    setGeneratedPassword(result);
    setCopied(false);

    const evalResult = evaluateStrength(result);
    setGenStrengthLabel(evalResult.label);
    setGenCrackTime(evalResult.crackTime);
  }, [
    genMode,
    genLength,
    genOptions,
    wordCount,
    separator,
    capitalizeWords,
    includeNumberInPassphrase,
  ]);

  useEffect(() => {
    generateSecret();
  }, [generateSecret]);

  function handleOptionToggle(key) {
    const activeCount = Object.values(genOptions).filter(Boolean).length;
    if (genOptions[key] && activeCount <= 1) return;

    setGenOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // --- Copy with 30s Ephemeral Memory Auto-Clear ---
  async function copyToClipboard(val) {
    const text = val || generatedPassword;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (clipboardTimeoutRef.current) {
        clearInterval(clipboardTimeoutRef.current);
      }

      let sec = 30;
      setClipboardTimer(sec);

      clipboardTimeoutRef.current = setInterval(async () => {
        sec -= 1;
        if (sec <= 0) {
          clearInterval(clipboardTimeoutRef.current);
          setClipboardTimer(null);
          setCopied(false);
          try {
            await navigator.clipboard.writeText("");
          } catch (e) {
            // Buffer wipe fallback
          }
        } else {
          setClipboardTimer(sec);
        }
      }, 1000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  }

  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) clearInterval(clipboardTimeoutRef.current);
    };
  }, []);

  function transferToInspector() {
    setPassword(generatedPassword);
    setActiveTab("inspect");
  }

  // Heuristic checklist
  const checklist = [
    { label: "At least 10 characters", passed: password.length >= 10 },
    { label: "Uppercase & lowercase letters", passed: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Numeric digits", passed: /[0-9]/.test(password) },
    { label: "Special symbol", passed: /[^A-Za-z0-9]/.test(password) },
    { label: "Uncompromised in known breaches", passed: breachCount === 0 },
  ];

  const getScoreColor = (val) => {
    if (breachCount > 0) return t.danger;
    if (val === null || val === undefined) return t.track;
    if (val <= 1) return t.danger;
    if (val === 2) return t.warning;
    return t.success;
  };

  const activeOptionCount = Object.values(genOptions).filter(Boolean).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        fontFamily: sans,
        color: t.text,
        display: "flex",
        flexDirection: "column",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {/* Top Application Header */}
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

            {/* Clean Segmented Theme Switcher */}
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

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          maxWidth: 880,
          width: "100%",
          margin: "0 auto",
          padding: "28px 16px 48px",
        }}
      >
        {/* Workspace Mode Switcher (Clean macOS/Linear-style Segment) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 20,
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={() => setActiveTab("inspect")}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: activeTab === "inspect" ? 600 : 400,
                color: activeTab === "inspect" ? t.text : t.textSecondary,
                background: activeTab === "inspect" ? t.surfaceSubtle : "transparent",
                border: `1px solid ${activeTab === "inspect" ? t.borderHighlight : "transparent"}`,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Analyze Password
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("generate")}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: activeTab === "generate" ? 600 : 400,
                color: activeTab === "generate" ? t.text : t.textSecondary,
                background: activeTab === "generate" ? t.surfaceSubtle : "transparent",
                border: `1px solid ${activeTab === "generate" ? t.borderHighlight : "transparent"}`,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Generate Password
            </button>
          </div>

          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: mono }}>
            {activeTab === "inspect" ? "Local evaluation + HIBP range check" : "Hardware CSPRNG"}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PASSWORD ANALYZER / INSPECTOR                      */}
        {/* ======================================================== */}
        {activeTab === "inspect" && (
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

              {/* Password Input Field */}
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
                      onClick={() => setActiveTab("generate")}
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
        )}

        {/* ======================================================== */}
        {/* TAB 2: PASSWORD GENERATOR                                */}
        {/* ======================================================== */}
        {activeTab === "generate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Generator Card */}
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "20px 22px",
              }}
            >
              {/* Generator Sub-mode Selector */}
              <div
                style={{
                  display: "inline-flex",
                  background: t.surfaceSubtle,
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  padding: 2,
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => setGenMode("random")}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    border: "none",
                    borderRadius: 4,
                    background: genMode === "random" ? t.surface : "transparent",
                    color: genMode === "random" ? t.text : t.textSecondary,
                    cursor: "pointer",
                    fontWeight: genMode === "random" ? 600 : 400,
                  }}
                >
                  Random String
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode("passphrase")}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    border: "none",
                    borderRadius: 4,
                    background: genMode === "passphrase" ? t.surface : "transparent",
                    color: genMode === "passphrase" ? t.text : t.textSecondary,
                    cursor: "pointer",
                    fontWeight: genMode === "passphrase" ? 600 : 400,
                  }}
                >
                  Diceware Passphrase
                </button>
              </div>

              {/* Secret Display & Action Bar */}
              <div
                style={{
                  background: t.surfaceSubtle,
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontFamily: mono,
                    color: t.text,
                    wordBreak: "break-all",
                    lineHeight: 1.4,
                    minHeight: 24,
                  }}
                >
                  {generatedPassword || "Select at least 1 character set"}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: `1px solid ${t.border}`,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      onClick={generateSecret}
                      style={{
                        padding: "5px 10px",
                        fontSize: 12,
                        fontFamily: mono,
                        borderRadius: 4,
                        border: `1px solid ${t.border}`,
                        background: t.surface,
                        color: t.text,
                        cursor: "pointer",
                      }}
                    >
                      Regenerate
                    </button>

                    <button
                      type="button"
                      onClick={transferToInspector}
                      style={{
                        padding: "5px 10px",
                        fontSize: 12,
                        borderRadius: 4,
                        border: "none",
                        background: "none",
                        color: t.accent,
                        cursor: "pointer",
                      }}
                    >
                      Test in Inspector →
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedPassword)}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontFamily: mono,
                      fontWeight: 600,
                      borderRadius: 4,
                      border: "none",
                      background: copied ? t.success : t.primaryBg,
                      color: copied ? "#FFFFFF" : t.primaryText,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {copied ? (
                      <>
                        <span>Copied</span>
                        {clipboardTimer !== null && <span>({clipboardTimer}s)</span>}
                      </>
                    ) : (
                      "Copy secret"
                    )}
                  </button>
                </div>
              </div>

              {/* Generator Strength Preview */}
              {genStrengthLabel && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginTop: 10,
                    color: t.textSecondary,
                  }}
                >
                  <span>
                    Rating: <strong style={{ color: t.success }}>{genStrengthLabel}</strong>
                  </span>
                  {genCrackTime && (
                    <span style={{ fontFamily: mono, color: t.textMuted }}>
                      crack resistance: ≈ {genCrackTime}
                    </span>
                  )}
                </div>
              )}

              {/* Controls: Random String */}
              {genMode === "random" ? (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Length Slider */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Length</span>
                      <span style={{ fontFamily: mono, fontWeight: 700 }}>
                        {genLength} chars
                      </span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      value={genLength}
                      onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                      style={{ width: "100%", color: t.primary }}
                    />
                  </div>

                  {/* Character Sets Grid */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>
                      Character Sets
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                      {Object.entries(CHAR_SETS).map(([key, item]) => {
                        const isChecked = genOptions[key];
                        const isOnlyActive = isChecked && activeOptionCount <= 1;

                        return (
                          <label
                            key={key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              borderRadius: 6,
                              background: t.surfaceSubtle,
                              border: `1px solid ${isChecked ? t.borderHighlight : t.border}`,
                              cursor: isOnlyActive ? "not-allowed" : "pointer",
                              fontSize: 12.5,
                            }}
                          >
                            <span>
                              {item.label}{" "}
                              <span style={{ color: t.textMuted, fontFamily: mono, fontSize: 11 }}>
                                ({item.sample})
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOnlyActive}
                              onChange={() => handleOptionToggle(key)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Controls: Passphrase */
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Word count slider */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Word count</span>
                      <span style={{ fontFamily: mono, fontWeight: 700 }}>
                        {wordCount} words
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="7"
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                      style={{ width: "100%", color: t.primary }}
                    />
                  </div>

                  {/* Options */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: t.surfaceSubtle,
                        border: `1px solid ${t.border}`,
                        fontSize: 12.5,
                      }}
                    >
                      <span>Separator</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["-", ".", "_", " "].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSeparator(s)}
                            style={{
                              padding: "2px 7px",
                              fontSize: 11,
                              fontFamily: mono,
                              borderRadius: 4,
                              border: `1px solid ${separator === s ? t.borderHighlight : t.border}`,
                              background: separator === s ? t.surface : "transparent",
                              color: separator === s ? t.text : t.textMuted,
                              cursor: "pointer",
                            }}
                          >
                            {s === " " ? "space" : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: t.surfaceSubtle,
                        border: `1px solid ${t.border}`,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <span>Capitalize words</span>
                      <input
                        type="checkbox"
                        checked={capitalizeWords}
                        onChange={(e) => setCapitalizeWords(e.target.checked)}
                      />
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: t.surfaceSubtle,
                        border: `1px solid ${t.border}`,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <span>Append random digit</span>
                      <input
                        type="checkbox"
                        checked={includeNumberInPassphrase}
                        onChange={(e) => setIncludeNumberInPassphrase(e.target.checked)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Grounded Minimalist Footer */}
      <footer
        style={{
          borderTop: `1px solid ${t.border}`,
          padding: "14px 20px",
          fontSize: 11.5,
          color: t.textMuted,
          background: t.surface,
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>KEYGUARD &bull; Client-side security verification</span>
          <span style={{ fontFamily: mono }}>NIST SP 800-63B &bull; HIBP k-anonymity &bull; Web Crypto CSPRNG</span>
        </div>
      </footer>
    </div>
  );
}
