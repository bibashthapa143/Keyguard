import "./globals.css";

export const metadata = {
  title: "Keyguard — Password Security & Entropy Inspector",
  description: "Client-side password entropy analysis, HaveIBeenPwned k-anonymity breach verification, and cryptographic generator.",
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
