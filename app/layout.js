import "./globals.css";

export const metadata = {
  title: "CYBERSHIELD // Zero-Knowledge Password Security & Entropy Lab",
  description: "Enterprise-grade client-side credential auditing, HaveIBeenPwned k-anonymity breach detection, and hardware-backed CSPRNG entropy generator.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
