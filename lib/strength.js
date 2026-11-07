import zxcvbn from "zxcvbn";

export function formatCrackDuration(seconds) {
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

export function evaluateStrength(pwd) {
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

