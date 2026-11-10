# Keyguard — Password Security & Entropy Inspector

> A zero-knowledge client-side credential intelligence workbench. Benchmarks mathematical entropy, simulates real-world hardware cracking scenarios, and verifies exposure across 900M+ compromised records using the $k$-anonymity privacy model.

---

## Overview

Most traditional password checkers rely on naive regular expression rules (e.g. minimum 8 characters, one number, one symbol) that encourage predictable formulas like `P@ssword1!`. 

**Keyguard** is designed around modern cybersecurity standards (**NIST SP 800-63B**). It evaluates thermodynamic password entropy, detects dictionary patterns, simulates multi-vector attack durations, verifies breach records via zero-knowledge hashing, and generates high-entropy secrets using hardware-backed CSPRNG algorithms.

All cryptographic operations and evaluations run **strictly inside the client browser memory**. Cleartext secrets are never stored, logged, or transmitted across any network.

---

## Key Features

### 1. Zero-Knowledge Breach Detection ($k$-Anonymity)
- Computes SHA-1 digests locally using the native **Web Crypto API** (`crypto.subtle.digest`).
- Queries the **HaveIBeenPwned (HIBP) Pwned Passwords API v3** using the mathematical $k$-anonymity model:
  - Only the **first 5 hexadecimal characters** of the SHA-1 digest leave the browser over TLS.
  - The API returns all known hash suffixes starting with that prefix (~500–1,000 candidate hashes).
  - The client scans the remaining **35 characters** in local browser memory.
- If a match is found, the credential is automatically flagged as **Compromised** regardless of length or complexity.

### 2. Multi-Pattern Entropy & Crack Time Analysis
- Powered by Dropbox's **`zxcvbn`** algorithm.
- Detects l33t-speak substitutions, spatial keyboard walks (`qwerty`, `zaq12wsx`), common dictionary roots, repeated sequences, and year/date markers.
- Calculates estimated crack duration against high-speed offline hashing ($10^{10}\text{ hashes/sec}$).

### 3. Multi-Vector Attack Simulation Matrix
Simulates realistic time-to-crack estimates across four attack environments:
- **Online Form (Rate-Limited)**: $100\text{ guesses/hour}$ (standard authentication with lockout)
- **Online API (Unthrottled)**: $10\text{ guesses/second}$ (unprotected public endpoint)
- **Offline Slow Hash (Memory-Hard)**: $10{,}000\text{ hashes/sec}$ (Argon2id / bcrypt protected leaks)
- **Offline High-Speed GPU Cluster**: $10{,}000{,}000{,}000\text{ hashes/sec}$ (8x NVIDIA RTX 4090s targeting MD5/NTLM)

### 4. Hardware-Backed Secret & Passphrase Generator
- **Alphanumeric & Symbol Generator**:
  - Uses `window.crypto.getRandomValues` (CSPRNG) interfacing directly with host OS entropy.
  - Guaranteed inclusion: Ensures at least one character from every active character set is present.
  - Unbiased Fisher-Yates shuffle prevents character positioning predictability.
- **Diceware Memorable Passphrases**:
  - Generates multi-word passphrases from a curated list of distinct English words (EFF-inspired).
  - Customizable word count (3 to 7 words), word separators (`-`, `.`, `_`, space), capitalization, and optional numeric digits.

### 5. Ephemeral Clipboard Security Guard
- One-click copy with a live **30-second countdown badge**.
- Automatically overwrites and scrubs the system clipboard buffer when the timer expires to protect against workstation snooping and clipboard-scraping utilities.

### 6. Restrained Engineering UI/UX
- Purposefully designed without AI design clichés (no neon glows, excessive gradients, or toy emojis).
- Clean dark, light, and system-default themes with high-contrast hairline borders and readable monospace data tables.

---

## Architecture & Workflow

```
[User Input]
     │
     ├──> [zxcvbn Engine] ──> Calculates entropy score (0-4), feedback & crack times
     │
     └──> [Web Crypto API] ──> Generates 40-character SHA-1 Hex Digest
                │
                ├── Prefix (5 chars) ──> Sent to HIBP API (https://api.pwnedpasswords.com/range/{prefix})
                │
                └── Suffix (35 chars) ──> Stays strictly in client RAM
                                                │
         [HIBP returns ~500-1000 suffixes]      │
                        │                       │
                        ▼                       ▼
            [In-Memory Suffix Comparison in Browser]
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [Breach Match Found]     [No Match Found]
      - Count: N instances     - Count: 0
      - Override: Compromised  - Retain entropy rating
```

---

## Directory Structure

```
password-checker/
├── app/
│   ├── layout.js              # Application root wrapper, metadata & viewport
│   ├── page.js                # Core dashboard orchestrator & state manager
│   └── globals.css            # Base resets, range input styling & scrollbars
├── components/
│   ├── Header.jsx             # Topbar navigation, status indicator & theme switch
│   └── PasswordInspector.jsx  # Credential input, telemetry strip, HIBP report & attack matrix
├── lib/
│   ├── hibp.js                # SHA-1 hashing, k-anonymity querying & LRU prefix caching
│   ├── generator.js           # CSPRNG random string & Diceware passphrase engines
│   └── strength.js           # zxcvbn evaluation & crack duration formatters
├── package.json               # Dependencies & scripts
└── README.md                  # Project documentation & security specifications
```

---
## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm** or **yarn**

### Installation

1. Clone or navigate to the repository:
   ```bash
   cd password-checker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
---

## Compliance & Standards Reference

- **NIST Special Publication 800-63B (Section 5.1.1.2)**: Digital Identity Guidelines — Authentication and Lifecycle Management. Recommends against arbitrary composition rules and emphasizes checks against compromised credential breach corpuses.
- **RFC 2104 / FIPS PUB 180-4**: Secure Hash Standard specifications for SHA-1 digests.
- **EFF (Electronic Frontier Foundation)**: Diceware wordlist guidelines for high-entropy memorable passphrases.

---

## License

MIT License. Free for educational, personal, and commercial security analysis.