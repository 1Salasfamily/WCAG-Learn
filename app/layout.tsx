import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import ResetButton from "./reset-button";
import SiteTitle from "./site-title";
import SkipLink from "./skip-link";

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
        </footer>
      </body>
    </html>
  );
}
