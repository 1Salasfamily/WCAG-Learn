import type { Metadata, Viewport } from "next";
import "./globals.css";

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
                <a href="/">Reset</a>
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
