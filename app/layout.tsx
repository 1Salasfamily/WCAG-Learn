import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import ResetButton from "./reset-button";

export const metadata: Metadata = {
  title: "WCAG Learn",
  description: "Accessible WCAG learning app",
  applicationName: "WCAG Learn",
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
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="site-header">
          <h1 className="site-title">WCAG Learn</h1>
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
          <p className="footer-tagline">
            Built on the official W3C WCAG 2.2 specification.
          </p>
          <Link className="footer-link" href="/about">
            Learn more &amp; sources
          </Link>
        </footer>
      </body>
    </html>
  );
}
