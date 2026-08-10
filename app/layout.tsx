import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import Link from "next/link";
import { Schibsted_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mono"
});
import ResetButton from "./reset-button";
import SiteTitle from "./site-title";
import SkipLink from "./skip-link";

export const metadata: Metadata = {
  title: "WCAG Learn",
  description: "Accessible WCAG learning app",
  applicationName: "WCAG Learn",
  icons: {
    icon: [
      { url: "/wcag-learn-favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" }
    ],
    apple: "/apple-touch-icon-180.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WCAG Learn"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <SkipLink />
        <header className="site-header">
          <h1 className="site-title">
            <SiteTitle />
          </h1>
          <nav className="site-nav" aria-label="Primary">
            <ul className="nav-list">
              <li>
                <ResetButton />
              </li>
            </ul>
          </nav>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <Link className="footer-link" href="/about">
            Learn more &amp; sources
          </Link>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <Link className="footer-link" href="/accessibility">
            Accessibility
          </Link>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <Link className="footer-link" href="/feedback">
            Feedback
          </Link>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <span className="footer-copyright">
            © {new Date().getFullYear()} Justin Salas · WCAG Learn. All rights
            reserved.
          </span>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
