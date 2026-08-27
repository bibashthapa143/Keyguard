# 🔐 Password Checker

*A simple Next.js app that checks password strength and whether it's been exposed in a known data breach.*

![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/status-done-brightgreen?style=flat-square)

---

## ✨ What it does

1. **Password strength check** — length, uppercase/lowercase, numbers, symbols
2. **Breach check** — checks if the password has appeared in a known data breach, using the free [Have I Been Pwned](https://haveibeenpwned.com/) API

## 🚀 Run it

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**

## 🛡️ How the breach check works (safely)

Your real password is **never sent anywhere**. The app:

1. Hashes your password with SHA-1 in the browser
2. Sends only the **first 5 characters** of that hash to the API
3. The API sends back all hashes that start with those 5 characters
4. The app checks **locally** whether your full hash is in that list

This is called **k-anonymity** — the same method password managers like 1Password use.

## 📂 Files

| File | Purpose |
|---|---|
| `app/page.js` | All the logic (strength check + breach check) |
| `app/layout.js` | Basic page wrapper |
| `app/globals.css` | Basic styling |
| `package.json` | Dependencies |

---

<p align="center"><i>Built as part of a security-focused frontend portfolio 🔒</i></p>
