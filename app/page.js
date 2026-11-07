"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import zxcvbn from "zxcvbn";

const CHAR_SETS = {
  uppercase: { label: "Uppercase (A-Z)", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  lowercase: { label: "Lowercase (a-z)", chars: "abcdefghijklmnopqrstuvwxyz" },
  numbers: { label: "Numbers (0-9)", chars: "0123456789" },
  symbols: { label: "Symbols (!@#$…)", chars: "!@#$%^&*()_+-=[]{}|;:,.<>?" },
};

// Curated list of distinct, easy-to-type, memorable words (EFF-inspired)
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
  const [breachCount, setBreachCount] = useState(null);
  const [checking, setChecking] = useState(false);

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

  const colors = {
    pageBg: isDark ? "#0D1117" : "#F6F5F2",
    cardBg: isDark ? "#151B23" : "#FFFFFF",
    border: isDark ? "#2A313C" : "#E4E1D8",
    text: isDark ? "#E8EAED" : "#1B1F24",
    subtext: isDark ? "#8B94A3" : "#68707C",
    inputBg: isDark ? "#0D1117" : "#FBFAF7",
    trackBg: isDark ? "#232B35" : "#ECE9E1",
    accent: "#D9A441",
    accentHover: "#C49233",
    accentText: "#1B1300",
    danger: isDark ? "#F87171" : "#C0362C",
    dangerBg: isDark ? "rgba(248,113,113,0.08)" : "#FBEEEC",
    success: isDark ? "#4ADE80" : "#1E8E5A",
    successBg: isDark ? "rgba(74,222,128,0.08)" : "#EAF7EF",
  };

  const mono = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";
  const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
    return `${value.toFixed(2)} ${chosen.label}`;
  }

  function getStrength(pwd) {
    if (!pwd) return { label: null, crackTime: null };
    const result = zxcvbn(pwd);
    let label = "Weak";
    if (result.score >= 4) label = "Strong";
    else if (result.score >= 2) label = "Medium";

    const rawSeconds = result.crack_times_seconds.offline_fast_hashing_1e10_per_second;

    return {
      label,
      crackTime: formatCrackTime(rawSeconds),
    };
  }

  function getChecklist(pwd) {
    return [
      { label: "8+ characters", passed: pwd.length >= 8 },
      { label: "Uppercase letter", passed: /[A-Z]/.test(pwd) },
      { label: "Number", passed: /[0-9]/.test(pwd) },
      { label: "Symbol", passed: /[^A-Za-z0-9]/.test(pwd) },
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
      // Memorable Diceware Passphrase mode
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
  async function copyToClipboard() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
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
            // Memory scrub: clear clipboard buffer
            await navigator.clipboard.writeText("");
          } catch (e) {
            // Ignore if page is unfocused
          }
        } else {
          setClipboardTimer(secondsLeft);
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) clearInterval(clipboardTimeoutRef.current);
    };
  }, []);

  function sendToChecker() {
    setPassword(generatedPassword);
    setActiveTab("check");
    setStrength(null);
    setCrackTime(null);
    setBreachCount(null);
  }

  // --- Checker Execution ---
  async function checkPassword(targetPassword) {
    const pwdToCheck = targetPassword || password;
    if (!pwdToCheck) return;

    const result = getStrength(pwdToCheck);
    setStrength(result.label);
    setCrackTime(result.crackTime);

    setChecking(true);
    setBreachCount(null);

    try {
      const hash = await sha1(pwdToCheck);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const text = await response.text();

      const lines = text.split("\n");
      let found = 0;
      for (const line of lines) {
        const [lineSuffix, count] = line.split(":");
        if (lineSuffix.trim() === suffix) {
          found = parseInt(count, 10);
          break;
        }
      }
      setBreachCount(found);

      if (found > 0) {
        setStrength("Weak");
      }
    } catch (error) {
      setBreachCount(-1);
    }

    setChecking(false);
  }

  function handleChange(e) {
    const value = e.target.value;
    setPassword(value);
    setStrength(null);
    setCrackTime(null);
    setBreachCount(null);
  }

  const checklist = getChecklist(password);

  const strengthLevels = ["Weak", "Medium", "Strong"];
  const strengthColor = {
    Weak: colors.danger,
    Medium: colors.accent,
    Strong: colors.success,
  };
  const activeSegments = strength ? strengthLevels.indexOf(strength) + 1 : 0;
  const genActiveSegments = genStrength ? strengthLevels.indexOf(genStrength) + 1 : 0;

  const themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  const activeOptionCount = Object.values(genOptions).filter(Boolean).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: sans,
        padding: "32px 16px",
        position: "relative",
      }}
    >
      {/* Theme Switcher Button */}
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <button
          onClick={() => setThemeMenuOpen(!themeMenuOpen)}
          aria-label="Toggle theme menu"
          style={{
            width: 38,
            height: 38,
            fontSize: 15,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            background: colors.cardBg,
            color: colors.subtext,
            cursor: "pointer",
          }}
        >
          {isDark ? "◐" : "◑"}
        </button>

        {themeMenuOpen && (
          <div
            style={{
              position: "absolute",
              top: 46,
              right: 0,
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
              minWidth: 120,
              zIndex: 10,
            }}
          >
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setThemeMenuOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: theme === option.value ? 700 : 400,
                  border: "none",
                  background: theme === option.value ? colors.pageBg : "transparent",
                  color: theme === option.value ? colors.accent : colors.text,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: colors.cardBg,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          boxShadow: isDark
            ? "0 20px 60px rgba(0,0,0,0.45)"
            : "0 20px 50px rgba(20,20,10,0.08)",
          overflow: "hidden",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div style={{ height: 3, background: colors.accent }} />

        <div style={{ padding: "26px 26px 30px" }}>
          {/* Header */}
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.14em",
              fontWeight: 700,
              color: colors.accent,
              textTransform: "uppercase",
            }}
          >
            Password Security Lab
          </p>
          <h1
            style={{
              fontSize: 22,
              margin: "6px 0 0",
              color: colors.text,
              letterSpacing: "-0.01em",
            }}
          >
            {activeTab === "check" ? "Strength & Breach Check" : "Secure Password Generator"}
          </h1>
          <p style={{ color: colors.subtext, fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
            {activeTab === "check"
              ? "Score your password and confirm it hasn't surfaced in a known leak."
              : "Generate cryptographically secure passwords and memorable passphrases."}
          </p>

          {/* Segmented Mode Selector */}
          <div
            style={{
              display: "flex",
              marginTop: 18,
              padding: 3,
              borderRadius: 10,
              background: colors.trackBg,
              border: `1px solid ${colors.border}`,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("check")}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activeTab === "check" ? 700 : 500,
                color: activeTab === "check" ? colors.text : colors.subtext,
                background: activeTab === "check" ? colors.cardBg : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: activeTab === "check" ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🛡️ Check Strength
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("generate")}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activeTab === "generate" ? 700 : 500,
                color: activeTab === "generate" ? colors.text : colors.subtext,
                background: activeTab === "generate" ? colors.cardBg : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: activeTab === "generate" ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              ⚡ Generator
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: CHECK PASSWORD (Existing preserved functionality)  */}
          {/* ======================================================== */}
          {activeTab === "check" && (
            <div>
              <div style={{ position: "relative", marginTop: 20 }}>
                <input
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "12px 64px 12px 14px",
                    fontSize: 15,
                    fontFamily: mono,
                    boxSizing: "border-box",
                    border: `1px solid ${colors.border}`,
                    borderRadius: 9,
                    outline: "none",
                    background: colors.inputBg,
                    color: colors.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: mono,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: colors.subtext,
                    padding: "6px 8px",
                  }}
                >
                  {visible ? "HIDE" : "SHOW"}
                </button>
              </div>

              {password && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  {checklist.map((item) => (
                    <span
                      key={item.label}
                      style={{
                        fontSize: 11.5,
                        fontFamily: mono,
                        padding: "4px 9px",
                        borderRadius: 6,
                        border: `1px solid ${item.passed ? colors.success : colors.border}`,
                        color: item.passed ? colors.success : colors.subtext,
                        background: item.passed ? colors.successBg : "transparent",
                      }}
                    >
                      {item.passed ? "✓" : "·"} {item.label}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => checkPassword()}
                disabled={!password || checking}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "12px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.accentText,
                  background: !password || checking ? colors.trackBg : colors.accent,
                  border: "none",
                  borderRadius: 9,
                  cursor: !password || checking ? "not-allowed" : "pointer",
                  opacity: !password || checking ? 0.6 : 1,
                  transition: "background 0.2s ease, opacity 0.2s ease",
                }}
              >
                {checking ? "Checking…" : "Check password"}
              </button>

              {strength && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: i < activeSegments ? strengthColor[strength] : colors.trackBg,
                          transition: "background 0.25s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginTop: 9,
                    }}
                  >
                    <span
                      style={{
                        color: strengthColor[strength],
                        fontWeight: 700,
                        fontSize: 13.5,
                      }}
                    >
                      {strength}
                    </span>
                    {crackTime && (
                      <span style={{ color: colors.subtext, fontSize: 12, fontFamily: mono }}>
                        crack time ≈ {crackTime}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {breachCount !== null && breachCount >= 0 && (
                <div
                  style={{
                    marginTop: 18,
                    padding: "12px 14px",
                    borderRadius: 9,
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: breachCount > 0 ? colors.dangerBg : colors.successBg,
                    color: breachCount > 0 ? colors.danger : colors.success,
                    border: `1px solid ${breachCount > 0 ? colors.danger : colors.success}22`,
                  }}
                >
                  {breachCount > 0 ? (
                    <>
                      <strong>{breachCount.toLocaleString()}</strong> known breaches contain this
                      password. Treat it as compromised regardless of how complex it looks.
                    </>
                  ) : (
                    "No matches found in known breach data."
                  )}
                </div>
              )}

              {breachCount === -1 && (
                <div
                  style={{
                    marginTop: 18,
                    padding: "12px 14px",
                    borderRadius: 9,
                    fontSize: 13,
                    background: colors.dangerBg,
                    color: colors.danger,
                    border: `1px solid ${colors.danger}22`,
                  }}
                >
                  Couldn't reach the breach check. Confirm your connection and try again.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PASSWORD GENERATOR (Enhanced with Diceware & Timer) */}
          {/* ======================================================== */}
          {activeTab === "generate" && (
            <div style={{ marginTop: 20 }}>
              {/* Type Switcher: Random vs Memorable Passphrase */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                <button
                  type="button"
                  onClick={() => setGenMode("random")}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: genMode === "random" ? 700 : 500,
                    borderRadius: 7,
                    border: `1px solid ${genMode === "random" ? colors.accent : colors.border}`,
                    background: genMode === "random" ? colors.trackBg : "transparent",
                    color: genMode === "random" ? colors.accent : colors.subtext,
                    cursor: "pointer",
                  }}
                >
                  Random Characters
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode("passphrase")}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: genMode === "passphrase" ? 700 : 500,
                    borderRadius: 7,
                    border: `1px solid ${genMode === "passphrase" ? colors.accent : colors.border}`,
                    background: genMode === "passphrase" ? colors.trackBg : "transparent",
                    color: genMode === "passphrase" ? colors.accent : colors.subtext,
                    cursor: "pointer",
                  }}
                >
                  Memorable Passphrase
                </button>
              </div>

              {/* Output Display Box */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: 9,
                  background: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontFamily: mono,
                    color: colors.text,
                    wordBreak: "break-all",
                    letterSpacing: "0.04em",
                    lineHeight: 1.4,
                    minHeight: 22,
                  }}
                >
                  {generatedPassword || "Select at least 1 set"}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: `1px solid ${colors.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{
                      background: "none",
                      border: "none",
                      color: colors.accent,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: 6,
                    }}
                  >
                    🔄 Regenerate
                  </button>

                  <button
                    type="button"
                    onClick={copyToClipboard}
                    style={{
                      background: copied ? colors.successBg : colors.cardBg,
                      color: copied ? colors.success : colors.text,
                      border: `1px solid ${copied ? colors.success : colors.border}`,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: 6,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {copied ? (
                      <>
                        <span>✓ Copied!</span>
                        {clipboardTimer !== null && (
                          <span style={{ fontSize: 10.5, opacity: 0.85, fontFamily: mono }}>
                            ({clipboardTimer}s)
                          </span>
                        )}
                      </>
                    ) : (
                      "📋 Copy"
                    )}
                  </button>
                </div>
              </div>

              {/* Strength Feedback Bar */}
              {genStrength && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 5,
                          borderRadius: 3,
                          background:
                            i < genActiveSegments ? strengthColor[genStrength] : colors.trackBg,
                          transition: "background 0.25s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        color: strengthColor[genStrength],
                        fontWeight: 700,
                        fontSize: 12.5,
                      }}
                    >
                      {genStrength}
                    </span>
                    {genCrackTime && (
                      <span style={{ color: colors.subtext, fontSize: 11.5, fontFamily: mono }}>
                        crack time ≈ {genCrackTime}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mode-Specific Customization Controls */}
              {genMode === "random" ? (
                <>
                  {/* Length Slider */}
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        Password Length
                      </label>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: mono,
                          fontWeight: 700,
                          color: colors.accent,
                          background: colors.trackBg,
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {genLength}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      value={genLength}
                      onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                      style={{
                        width: "100%",
                        accentColor: colors.accent,
                        cursor: "pointer",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: colors.subtext,
                        marginTop: 4,
                        fontFamily: mono,
                      }}
                    >
                      <span>8</span>
                      <span>16</span>
                      <span>32</span>
                      <span>48</span>
                    </div>
                  </div>

                  {/* Character Sets */}
                  <div style={{ marginTop: 18 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: colors.text,
                        marginBottom: 10,
                      }}
                    >
                      Character Options
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                              borderRadius: 8,
                              background: colors.inputBg,
                              border: `1px solid ${isChecked ? colors.accent : colors.border}`,
                              cursor: isOnlyActive ? "not-allowed" : "pointer",
                              userSelect: "none",
                              transition: "border-color 0.2s ease",
                              opacity: isOnlyActive ? 0.75 : 1,
                            }}
                          >
                            <span style={{ fontSize: 13, color: colors.text }}>{item.label}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOnlyActive}
                              onChange={() => handleOptionToggle(key)}
                              style={{
                                accentColor: colors.accent,
                                width: 16,
                                height: 16,
                                cursor: isOnlyActive ? "not-allowed" : "pointer",
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    {activeOptionCount <= 1 && (
                      <p style={{ margin: "6px 0 0", fontSize: 11.5, color: colors.subtext }}>
                        * At least one character set must remain enabled.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Memorable Passphrase Options */}
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        Word Count
                      </label>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: mono,
                          fontWeight: 700,
                          color: colors.accent,
                          background: colors.trackBg,
                          padding: "2px 8px",
                          borderRadius: 6,
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
                      style={{
                        width: "100%",
                        accentColor: colors.accent,
                        cursor: "pointer",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: colors.subtext,
                        marginTop: 4,
                        fontFamily: mono,
                      }}
                    >
                      <span>3</span>
                      <span>4 (Recommended)</span>
                      <span>7</span>
                    </div>
                  </div>

                  {/* Separator selector & flags */}
                  <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span style={{ fontSize: 13, color: colors.text }}>Word Separator</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["-", ".", "_", " "].map((sep) => (
                          <button
                            key={sep}
                            type="button"
                            onClick={() => setSeparator(sep)}
                            style={{
                              padding: "4px 9px",
                              fontSize: 12,
                              fontFamily: mono,
                              fontWeight: 700,
                              borderRadius: 5,
                              border: `1px solid ${separator === sep ? colors.accent : colors.border}`,
                              background: separator === sep ? colors.accent : colors.trackBg,
                              color: separator === sep ? colors.accentText : colors.text,
                              cursor: "pointer",
                            }}
                          >
                            {sep === " " ? "␣" : sep}
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
                        borderRadius: 8,
                        background: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 13, color: colors.text }}>Capitalize Words</span>
                      <input
                        type="checkbox"
                        checked={capitalizeWords}
                        onChange={(e) => setCapitalizeWords(e.target.checked)}
                        style={{ accentColor: colors.accent, width: 16, height: 16, cursor: "pointer" }}
                      />
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 13, color: colors.text }}>Include Random Number</span>
                      <input
                        type="checkbox"
                        checked={includeNumberInPassphrase}
                        onChange={(e) => setIncludeNumberInPassphrase(e.target.checked)}
                        style={{ accentColor: colors.accent, width: 16, height: 16, cursor: "pointer" }}
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Action Button: Send to Breach & Strength Checker */}
              <button
                type="button"
                onClick={sendToChecker}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "12px 14px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: colors.accentText,
                  background: colors.accent,
                  border: "none",
                  borderRadius: 9,
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
              >
                Test this password in Breach Auditor →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

