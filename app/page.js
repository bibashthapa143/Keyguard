"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import zxcvbn from "zxcvbn";

const CHAR_SETS = {
  uppercase: { label: "Uppercase Letters", detail: "A-Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  lowercase: { label: "Lowercase Letters", detail: "a-z", chars: "abcdefghijklmnopqrstuvwxyz" },
  numbers: { label: "Numbers & Digits", detail: "0-9", chars: "0123456789" },
  symbols: { label: "Special Symbols", detail: "!@#$…", chars: "!@#$%^&*()_+-=[]{}|;:,.<>?" },
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
  const [activeTab, setActiveTab] = useState("check"); // "check" | "generate"

  // --- Checker State ---
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [strength, setStrength] = useState(null);
  const [crackTime, setCrackTime] = useState(null);
  const [rawCrackTimes, setRawCrackTimes] = useState(null);
  const [feedbackWarning, setFeedbackWarning] = useState(null);
  const [feedbackSuggestions, setFeedbackSuggestions] = useState([]);
  const [breachCount, setBreachCount] = useState(null);
  const [checking, setChecking] = useState(false);
  const [hashPrefix, setHashPrefix] = useState(null);
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

  const [genStrength, setGenStrength] = useState(null);
  const [genCrackTime, setGenCrackTime] = useState(null);

  // --- Theme State ---
  const [theme, setTheme] = useState("system");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
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

  // SaaS Cybersecurity Design Tokens
  const colors = {
    pageBg: isDark ? "#090D16" : "#F8FAFC",
    cardBg: isDark ? "#0F172A" : "#FFFFFF",
    cardSubtle: isDark ? "#131C31" : "#F1F5F9",
    inputBg: isDark ? "#0B111E" : "#F8FAFC",
    border: isDark ? "#1E293B" : "#E2E8F0",
    borderHighlight: isDark ? "#334155" : "#CBD5E1",
    textPrimary: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#475569",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    trackBg: isDark ? "#1E293B" : "#E2E8F0",
    accent: "#0EA5E9",
    accentHover: "#38BDF8",
    accentGlow: "rgba(14, 165, 233, 0.15)",
    accentText: "#FFFFFF",
    danger: "#EF4444",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
    dangerBorder: isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA",
    warning: "#F59E0B",
    warningBg: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
    warningBorder: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
    success: "#10B981",
    successBg: isDark ? "rgba(16, 185, 129, 0.12)" : "#ECFDF5",
    successBorder: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
  };

  const mono = "ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace";
  const sans = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  function formatCrackTime(seconds) {
    if (seconds < 0.01) return "instantly";
    if (seconds < 1) return "less than a second";

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
    return `${value.toFixed(1)} ${chosen.label}`;
  }

  function getStrength(pwd) {
    if (!pwd) {
      return {
        label: null,
        crackTime: null,
        rawCrackTimes: null,
        warning: null,
        suggestions: [],
      };
    }
    const result = zxcvbn(pwd);
    let label = "Weak";
    if (result.score >= 4) label = "Strong";
    else if (result.score >= 2) label = "Medium";

    const rawSeconds = result.crack_times_seconds.offline_fast_hashing_1e10_per_second;

    return {
      label,
      crackTime: formatCrackTime(rawSeconds),
      rawCrackTimes: result.crack_times_seconds,
      warning: result.feedback.warning || null,
      suggestions: result.feedback.suggestions || [],
    };
  }

  function getChecklist(pwd) {
    return [
      { label: "8+ characters", passed: pwd.length >= 8 },
      { label: "Uppercase letter", passed: /[A-Z]/.test(pwd) },
      { label: "Number digit", passed: /[0-9]/.test(pwd) },
      { label: "Special symbol", passed: /[^A-Za-z0-9]/.test(pwd) },
    ];
  }

  async function sha1(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  // --- Live Debounced Password Analysis ---
  useEffect(() => {
    if (!password) {
      setStrength(null);
      setCrackTime(null);
      setRawCrackTimes(null);
      setFeedbackWarning(null);
      setFeedbackSuggestions([]);
      setBreachCount(null);
      setHashPrefix(null);
      setChecking(false);
      return;
    }

    // 1. Instant local zxcvbn evaluation
    const result = getStrength(password);
    setStrength(result.label);
    setCrackTime(result.crackTime);
    setRawCrackTimes(result.rawCrackTimes);
    setFeedbackWarning(result.warning);
    setFeedbackSuggestions(result.suggestions);

    // 2. Debounced asynchronous k-anonymity breach check
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const fullHash = await sha1(password);
        const prefix = fullHash.slice(0, 5);
        const suffix = fullHash.slice(5);
        setHashPrefix(prefix);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          headers: { "Add-Padding": "true" },
        });

        if (!response.ok) throw new Error("HIBP Network Error");

        const text = await response.text();
        const lines = text.split("\n");
        let found = 0;
        for (const line of lines) {
          const [lineSuffix, count] = line.split(":");
          if (lineSuffix && lineSuffix.trim() === suffix) {
            found = parseInt(count, 10);
            break;
          }
        }
        setBreachCount(found);

        // Security best practice: downgrade compromised password to Weak
        if (found > 0) {
          setStrength("Weak");
        }
      } catch (err) {
        setBreachCount(-1);
      } finally {
        setChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [password]);

  // --- Cryptographically Secure Password / Passphrase Generator ---
  const generatePassword = useCallback(() => {
    let result = "";

    if (genMode === "random") {
      const activeKeys = Object.keys(genOptions).filter((k) => genOptions[k]);
      if (activeKeys.length === 0) return;

      let pool = "";
      const mandatoryChars = [];

      activeKeys.forEach((key) => {
        const setChars = CHAR_SETS[key].chars;
        pool += setChars;
        mandatoryChars.push(setChars[getSecureRandomInt(setChars.length)]);
      });

      const remainingCount = Math.max(0, genLength - mandatoryChars.length);
      const resultChars = [...mandatoryChars];

      for (let i = 0; i < remainingCount; i++) {
        resultChars.push(pool[getSecureRandomInt(pool.length)]);
      }

      for (let i = resultChars.length - 1; i > 0; i--) {
        const j = getSecureRandomInt(i + 1);
        const temp = resultChars[i];
        resultChars[i] = resultChars[j];
        resultChars[j] = temp;
      }

      result = resultChars.join("");
    } else {
      const chosenWords = [];
      for (let i = 0; i < wordCount; i++) {
        let word = MEMORABLE_WORDS[getSecureRandomInt(MEMORABLE_WORDS.length)];
        if (capitalizeWords) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        chosenWords.push(word);
      }

      if (includeNumberInPassphrase) {
        const randomDigit = getSecureRandomInt(100);
        const insertIndex = getSecureRandomInt(chosenWords.length);
        chosenWords[insertIndex] = `${chosenWords[insertIndex]}${randomDigit}`;
      }

      result = chosenWords.join(separator);
    }

    setGeneratedPassword(result);
    setCopied(false);

    const evalResult = getStrength(result);
    setGenStrength(evalResult.label);
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
    generatePassword();
  }, [generatePassword]);

  function handleOptionToggle(key) {
    const activeCount = Object.values(genOptions).filter(Boolean).length;
    if (genOptions[key] && activeCount <= 1) return;

    setGenOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // --- Copy with 30-Second Ephemeral Auto-Clear ---
  async function copyToClipboard(textToCopy) {
    const target = textToCopy || generatedPassword;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);

      if (clipboardTimeoutRef.current) {
        clearInterval(clipboardTimeoutRef.current);
      }

      let secondsLeft = 30;
      setClipboardTimer(secondsLeft);

      clipboardTimeoutRef.current = setInterval(async () => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          clearInterval(clipboardTimeoutRef.current);
          setClipboardTimer(null);
          setCopied(false);
          try {
            await navigator.clipboard.writeText("");
          } catch (e) {
            // Buffer wipe fallback
          }
        } else {
          setClipboardTimer(secondsLeft);
        }
      }, 1000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }

  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) clearInterval(clipboardTimeoutRef.current);
    };
  }, []);

  function sendToChecker() {
    setPassword(generatedPassword);
    setActiveTab("check");
  }

  const checklist = getChecklist(password);

  const strengthLevels = ["Weak", "Medium", "Strong"];
  const strengthColor = {
    Weak: colors.danger,
    Medium: colors.warning,
    Strong: colors.success,
  };
  const activeSegments = strength ? strengthLevels.indexOf(strength) + 1 : 0;
  const genActiveSegments = genStrength ? strengthLevels.indexOf(genStrength) + 1 : 0;

  const themeOptions = [
    { value: "light", label: "Light Mode" },
    { value: "dark", label: "Dark Mode" },
    { value: "system", label: "System Default" },
  ];

  const activeOptionCount = Object.values(genOptions).filter(Boolean).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        fontFamily: sans,
        color: colors.textPrimary,
        display: "flex",
        flexDirection: "column",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      {/* SaaS Top Navigation Bar */}
      <header
        style={{
          borderBottom: `1px solid ${colors.border}`,
          background: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${colors.accent}, #0284C7)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 16px ${colors.accentGlow}`,
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              ⛨
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>
                  CYBERSHIELD
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: mono,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: colors.cardSubtle,
                    color: colors.accent,
                    border: `1px solid ${colors.border}`,
                    fontWeight: 700,
                  }}
                >
                  LAB v2.0
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: colors.textMuted }}>
                Zero-Knowledge Credential Security &amp; Entropy Engine
              </p>
            </div>
          </div>

          {/* Right Controls: Security Badge & Theme Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "none",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontFamily: mono,
                padding: "4px 10px",
                borderRadius: 6,
                background: colors.successBg,
                color: colors.success,
                border: `1px solid ${colors.successBorder}`,
              }}
              className="desktop-badge"
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.success }} />
              NIST SP 800-63B ALIGNED
            </div>

            {/* Theme Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                aria-label="Theme selector"
                style={{
                  height: 34,
                  padding: "0 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  background: colors.cardBg,
                  color: colors.textSecondary,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{isDark ? "🌙 Dark" : "☀️ Light"}</span>
                <span style={{ fontSize: 9 }}>▼</span>
              </button>

              {themeMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    background: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                    minWidth: 140,
                    zIndex: 60,
                  }}
                >
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTheme(opt.value);
                        setThemeMenuOpen(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: 12,
                        fontWeight: theme === opt.value ? 700 : 500,
                        border: "none",
                        background: theme === opt.value ? colors.cardSubtle : "transparent",
                        color: theme === opt.value ? colors.accent : colors.textPrimary,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main SaaS Dashboard Container */}
      <main
        style={{
          flex: 1,
          maxWidth: 960,
          width: "100%",
          margin: "0 auto",
          padding: "32px 16px 64px",
        }}
      >
        {/* Navigation Mode Segmented Pills */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: 0,
                color: colors.textPrimary,
              }}
            >
              {activeTab === "check" ? "Credential Auditor & Breach Analyzer" : "Cryptographic Entropy Generator"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: colors.textSecondary }}>
              {activeTab === "check"
                ? "Evaluate mathematical brute-force resilience and query 900M+ compromised records via k-anonymity."
                : "Create high-entropy passwords or memorable Diceware passphrases using hardware-backed CSPRNG."}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              background: colors.cardSubtle,
              padding: 3,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("check")}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeTab === "check" ? 700 : 600,
                color: activeTab === "check" ? colors.accent : colors.textSecondary,
                background: activeTab === "check" ? colors.cardBg : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: activeTab === "check" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              🛡️ Audit Credential
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("generate")}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeTab === "generate" ? 700 : 600,
                color: activeTab === "generate" ? colors.accent : colors.textSecondary,
                background: activeTab === "generate" ? colors.cardBg : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: activeTab === "generate" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              ⚡ Generate Secrets
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODULE 1: CREDENTIAL AUDITOR (CHECKER VIEW)              */}
        {/* ======================================================== */}
        {activeTab === "check" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Primary Input Card */}
            <div
              style={{
                background: colors.cardBg,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                boxShadow: isDark
                  ? "0 20px 40px -15px rgba(0,0,0,0.5)"
                  : "0 10px 30px -10px rgba(0,0,0,0.06)",
                padding: "24px 24px 28px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: colors.textSecondary,
                  }}
                >
                  Candidate Secret
                </label>

                {password && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: mono,
                      color: colors.textMuted,
                      background: colors.cardSubtle,
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {password.length} chars
                  </span>
                )}
              </div>

              {/* Password Input Field with Actions */}
              <div style={{ position: "relative" }}>
                <input
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter or paste password to evaluate…"
                  autoComplete="off"
                  spellCheck="false"
                  style={{
                    width: "100%",
                    padding: "14px 100px 14px 16px",
                    fontSize: 16,
                    fontFamily: mono,
                    boxSizing: "border-box",
                    border: `1px solid ${colors.borderHighlight}`,
                    borderRadius: 10,
                    outline: "none",
                    background: colors.inputBg,
                    color: colors.textPrimary,
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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
                    gap: 4,
                  }}
                >
                  {password && (
                    <button
                      type="button"
                      onClick={() => setPassword("")}
                      title="Clear input"
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.textMuted,
                        cursor: "pointer",
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    style={{
                      background: colors.cardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textSecondary,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: mono,
                      fontWeight: 700,
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    {visible ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {/* Character Heuristics Checklist */}
              {password && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  {checklist.map((item) => (
                    <span
                      key={item.label}
                      style={{
                        fontSize: 12,
                        fontFamily: mono,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: `1px solid ${item.passed ? colors.successBorder : colors.border}`,
                        color: item.passed ? colors.success : colors.textMuted,
                        background: item.passed ? colors.successBg : colors.cardSubtle,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{item.passed ? "✓" : "○"}</span>
                      <span>{item.label}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Strength Gauge & Telemetry Strip */}
              {strength && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: i < activeSegments ? strengthColor[strength] : colors.trackBg,
                          boxShadow:
                            i < activeSegments ? `0 0 10px ${strengthColor[strength]}40` : "none",
                          transition: "background 0.25s ease, box-shadow 0.25s ease",
                        }}
                      />
                    ))}
                  </div>

                  {/* Telemetry Metric Cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      marginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        background: colors.cardSubtle,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                        Strength Rating
                      </span>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: strengthColor[strength],
                          marginTop: 2,
                        }}
                      >
                        {strength} Resilience
                      </div>
                    </div>

                    <div
                      style={{
                        background: colors.cardSubtle,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                        Offline Fast-Crack Time
                      </span>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          fontFamily: mono,
                          color: colors.textPrimary,
                          marginTop: 2,
                        }}
                      >
                        ≈ {crackTime}
                      </div>
                    </div>

                    <div
                      style={{
                        background: colors.cardSubtle,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                        k-Anonymity Hash Prefix
                      </span>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: mono,
                          color: colors.accent,
                          marginTop: 2,
                        }}
                      >
                        {hashPrefix ? `SHA1:${hashPrefix}…` : "Calculating…"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Breach Intelligence Incident Card */}
            {checking && (
              <div
                style={{
                  background: colors.cardBg,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: `2px solid ${colors.accent}`,
                    borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Querying HaveIBeenPwned k-anonymity breach database…
              </div>
            )}

            {!checking && breachCount !== null && breachCount > 0 && (
              <div
                style={{
                  background: colors.dangerBg,
                  borderRadius: 12,
                  border: `1px solid ${colors.dangerBorder}`,
                  padding: "20px",
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: colors.danger,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  !
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.danger }}>
                      CRITICAL COMPROMISE DETECTED
                    </h3>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: colors.danger,
                        color: "#FFFFFF",
                        fontWeight: 700,
                      }}
                    >
                      {breachCount.toLocaleString()} LEAKED INSTANCES
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13.5, color: colors.textPrimary, lineHeight: 1.5 }}>
                    This exact credential exists in known public breach databases. It is vulnerable to automated credential-stuffing and dictionary attacks regardless of length or complexity.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("generate")}
                    style={{
                      marginTop: 12,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderRadius: 6,
                      background: colors.danger,
                      color: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Generate a Secure Replacement →
                  </button>
                </div>
              </div>
            )}

            {!checking && breachCount === 0 && (
              <div
                style={{
                  background: colors.successBg,
                  borderRadius: 12,
                  border: `1px solid ${colors.successBorder}`,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: colors.success,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.success }}>
                    Zero Public Breach Records Found
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: colors.textSecondary }}>
                    Validated through client-side SHA-1 range matching without leaking the secret.
                  </p>
                </div>
              </div>
            )}

            {!checking && breachCount === -1 && (
              <div
                style={{
                  background: colors.warningBg,
                  borderRadius: 10,
                  border: `1px solid ${colors.warningBorder}`,
                  padding: "14px 18px",
                  fontSize: 13,
                  color: colors.warning,
                }}
              >
                ⚠️ HIBP breach service temporarily unreachable. Offline entropy analysis remains active.
              </div>
            )}

            {/* Contextual Security Advisory (zxcvbn feedback) */}
            {(feedbackWarning || feedbackSuggestions.length > 0) && (
              <div
                style={{
                  background: colors.cardBg,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>💡</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, textTransform: "uppercase" }}>
                    Security Advisory &amp; Optimization
                  </span>
                </div>
                {feedbackWarning && (
                  <p style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 600, color: colors.warning }}>
                    • {feedbackWarning}
                  </p>
                )}
                {feedbackSuggestions.map((sug, i) => (
                  <p key={i} style={{ margin: "4px 0", fontSize: 13, color: colors.textSecondary }}>
                    • {sug}
                  </p>
                ))}
              </div>
            )}

            {/* Interactive Attack Simulation Matrix Accordion */}
            {rawCrackTimes && (
              <div
                style={{
                  background: colors.cardBg,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAttackMatrix(!showAttackMatrix)}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: colors.textPrimary,
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>⚙️</span>
                    <span>Multi-Vector Attack Resistance Matrix</span>
                  </span>
                  <span style={{ color: colors.accent, fontSize: 12, fontFamily: mono }}>
                    {showAttackMatrix ? "Hide Matrix ▲" : "Inspect Matrix ▼"}
                  </span>
                </button>

                {showAttackMatrix && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${colors.border}` }}>
                    <p style={{ fontSize: 12.5, color: colors.textMuted, margin: "14px 0" }}>
                      Estimated time required to crack this password across various attacker capabilities:
                    </p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: "left", color: colors.textMuted }}>
                            <th style={{ padding: "8px 6px" }}>Attack Scenario</th>
                            <th style={{ padding: "8px 6px" }}>Calculated Guess Rate</th>
                            <th style={{ padding: "8px 6px" }}>Estimated Time</th>
                            <th style={{ padding: "8px 6px" }}>Threat Class</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <td style={{ padding: "10px 6px", fontWeight: 600 }}>Online Login (Rate-Limited)</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, color: colors.textSecondary }}>100 guesses / hour</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, fontWeight: 700, color: colors.success }}>
                              {formatCrackTime(rawCrackTimes.online_throttling_100_per_hour)}
                            </td>
                            <td style={{ padding: "10px 6px", color: colors.success }}>Low</td>
                          </tr>
                          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <td style={{ padding: "10px 6px", fontWeight: 600 }}>Unthrottled API Endpoint</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, color: colors.textSecondary }}>10 guesses / sec</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, fontWeight: 700, color: colors.textPrimary }}>
                              {formatCrackTime(rawCrackTimes.online_no_throttling_10_per_second)}
                            </td>
                            <td style={{ padding: "10px 6px", color: colors.warning }}>Moderate</td>
                          </tr>
                          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <td style={{ padding: "10px 6px", fontWeight: 600 }}>Offline Slow Hash (Argon2/bcrypt)</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, color: colors.textSecondary }}>10,000 hashes / sec</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, fontWeight: 700, color: colors.textPrimary }}>
                              {formatCrackTime(rawCrackTimes.offline_slow_hashing_1e4_per_second)}
                            </td>
                            <td style={{ padding: "10px 6px", color: colors.warning }}>High</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "10px 6px", fontWeight: 600 }}>Offline GPU Rig (8x RTX 4090 / MD5)</td>
                            <td style={{ padding: "10px 6px", fontFamily: mono, color: colors.textSecondary }}>10,000,000,000 / sec</td>
                            <td
                              style={{
                                padding: "10px 6px",
                                fontFamily: mono,
                                fontWeight: 700,
                                color: crackTime?.includes("second") || crackTime?.includes("instant") ? colors.danger : colors.success,
                              }}
                            >
                              {formatCrackTime(rawCrackTimes.offline_fast_hashing_1e10_per_second)}
                            </td>
                            <td style={{ padding: "10px 6px", color: colors.danger, fontWeight: 700 }}>Critical</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULE 2: ENTROPY GENERATOR (GENERATOR VIEW)             */}
        {/* ======================================================== */}
        {activeTab === "generate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Generated Output Card */}
            <div
              style={{
                background: colors.cardBg,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                boxShadow: isDark
                  ? "0 20px 40px -15px rgba(0,0,0,0.5)"
                  : "0 10px 30px -10px rgba(0,0,0,0.06)",
                padding: "24px",
              }}
            >
              {/* Generator Sub-mode switch */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() => setGenMode("random")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 12.5,
                    fontWeight: genMode === "random" ? 700 : 600,
                    borderRadius: 8,
                    border: `1px solid ${genMode === "random" ? colors.accent : colors.border}`,
                    background: genMode === "random" ? colors.accentGlow : colors.cardSubtle,
                    color: genMode === "random" ? colors.accent : colors.textSecondary,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Alphanumeric &amp; Symbols
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode("passphrase")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 12.5,
                    fontWeight: genMode === "passphrase" ? 700 : 600,
                    borderRadius: 8,
                    border: `1px solid ${genMode === "passphrase" ? colors.accent : colors.border}`,
                    background: genMode === "passphrase" ? colors.accentGlow : colors.cardSubtle,
                    color: genMode === "passphrase" ? colors.accent : colors.textSecondary,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Memorable Diceware Passphrase
                </button>
              </div>

              {/* Secret Display Box */}
              <div
                style={{
                  background: colors.inputBg,
                  borderRadius: 10,
                  border: `1px solid ${colors.borderHighlight}`,
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontFamily: mono,
                    color: colors.textPrimary,
                    wordBreak: "break-all",
                    letterSpacing: "0.03em",
                    lineHeight: 1.5,
                    minHeight: 28,
                  }}
                >
                  {generatedPassword || "Select at least 1 character set"}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    paddingTop: 12,
                    borderTop: `1px solid ${colors.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{
                      background: colors.cardSubtle,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "8px 14px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>🔄</span>
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedPassword)}
                    style={{
                      background: copied ? colors.success : colors.accent,
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "8px 16px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: `0 4px 12px ${copied ? colors.successBorder : colors.accentGlow}`,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copied ? (
                      <>
                        <span>✓ Copied!</span>
                        {clipboardTimer !== null && (
                          <span style={{ fontSize: 11, fontFamily: mono }}>({clipboardTimer}s)</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copy Secret</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Real-time Generator Strength Meter */}
              {genStrength && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 5,
                          borderRadius: 3,
                          background: i < genActiveSegments ? strengthColor[genStrength] : colors.trackBg,
                          transition: "background 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: strengthColor[genStrength], fontWeight: 700 }}>
                      {genStrength} Rating
                    </span>
                    {genCrackTime && (
                      <span style={{ color: colors.textMuted, fontFamily: mono }}>
                        offline crack time ≈ {genCrackTime}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 1: Random Character Customization */}
              {genMode === "random" ? (
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Slider */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                        Password Length
                      </label>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: mono,
                          fontWeight: 700,
                          color: colors.accent,
                          background: colors.cardSubtle,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {genLength} characters
                      </span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      value={genLength}
                      onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                      style={{ width: "100%" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: colors.textMuted,
                        marginTop: 4,
                        fontFamily: mono,
                      }}
                    >
                      <span>8</span>
                      <span>16 (Balanced)</span>
                      <span>32 (Strong)</span>
                      <span>48</span>
                    </div>
                  </div>

                  {/* Character Set Toggles */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, display: "block", marginBottom: 10 }}>
                      Character Architecture
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
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
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: colors.cardSubtle,
                              border: `1px solid ${isChecked ? colors.accent : colors.border}`,
                              cursor: isOnlyActive ? "not-allowed" : "pointer",
                              userSelect: "none",
                              transition: "all 0.15s ease",
                              opacity: isOnlyActive ? 0.7 : 1,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: 11, fontFamily: mono, color: colors.textMuted }}>
                                {item.detail}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOnlyActive}
                              onChange={() => handleOptionToggle(key)}
                              style={{ width: 16, height: 16, accentColor: colors.accent, cursor: isOnlyActive ? "not-allowed" : "pointer" }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode 2: Passphrase Customization */
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                        Word Count (Diceware)
                      </label>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: mono,
                          fontWeight: 700,
                          color: colors.accent,
                          background: colors.cardSubtle,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {wordCount} words
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="7"
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                      style={{ width: "100%" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: colors.textMuted,
                        marginTop: 4,
                        fontFamily: mono,
                      }}
                    >
                      <span>3</span>
                      <span>4 (Recommended)</span>
                      <span>7</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: colors.cardSubtle,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Separator</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["-", ".", "_", " "].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSeparator(s)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              fontFamily: mono,
                              borderRadius: 4,
                              border: `1px solid ${separator === s ? colors.accent : colors.border}`,
                              background: separator === s ? colors.accent : colors.cardBg,
                              color: separator === s ? "#FFFFFF" : colors.textPrimary,
                              cursor: "pointer",
                            }}
                          >
                            {s === " " ? "␣" : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: colors.cardSubtle,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Capitalize Words</span>
                      <input
                        type="checkbox"
                        checked={capitalizeWords}
                        onChange={(e) => setCapitalizeWords(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: colors.accent, cursor: "pointer" }}
                      />
                    </label>

                    <label
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: colors.cardSubtle,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Append Random Digit</span>
                      <input
                        type="checkbox"
                        checked={includeNumberInPassphrase}
                        onChange={(e) => setIncludeNumberInPassphrase(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: colors.accent, cursor: "pointer" }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Action Bridge Button */}
              <button
                type="button"
                onClick={sendToChecker}
                style={{
                  width: "100%",
                  marginTop: 24,
                  padding: "14px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  background: `linear-gradient(135deg, ${colors.accent}, #0284C7)`,
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  boxShadow: `0 4px 16px ${colors.accentGlow}`,
                  transition: "all 0.15s ease",
                }}
              >
                Deploy this Secret to Credential Auditor →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Strip */}
      <footer
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: "16px 24px",
          textAlign: "center",
          fontSize: 12,
          color: colors.textMuted,
          background: isDark ? "rgba(15, 23, 42, 0.4)" : "#F1F5F9",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>CYBERSHIELD LAB // Zero-Knowledge Architecture</span>
          <span>NIST SP 800-63B &bull; Web Crypto CSPRNG &bull; HaveIBeenPwned API</span>
        </div>
      </footer>
    </div>
  );
}
