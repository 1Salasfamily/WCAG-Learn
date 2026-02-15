import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WCAG Learn",
  description: "Accessible WCAG learning app"
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
                <Link href="/">Home</Link>
              </li>
            </ul>
          </nav>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
