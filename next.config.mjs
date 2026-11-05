/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Next.js injects inline bootstrap scripts/styles, so 'unsafe-inline' is
// required without nonce-based middleware; dev additionally needs
// 'unsafe-eval' for webpack HMR. Everything else is locked to same-origin.
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Production only: on a phone reaching the dev server over plain http
  // (192.168.x.x:3000), this directive upgrades every asset URL to https,
  // which nothing answers, and the page arrives unstyled. localhost is
  // exempt from the upgrade, which is why the Mac never shows it.
  ...(isDev ? [] : ["upgrade-insecure-requests"])
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  },
  // HSTS is production-only for the same reason: the dev server is http.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains"
        }
      ])
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The feedback form posts to its own origin and the platform forwards to
  // Formspree. This keeps the CSP locked to 'self' (connect-src/form-action
  // never open up) and sidesteps ad blockers that filter formspree.io — the
  // browser only ever talks to this domain. A routing rule, not server code.
  async rewrites() {
    return [
      {
        source: "/api/feedback",
        destination: "https://formspree.io/f/xqpzplaq"
      }
    ];
  }
};

export default nextConfig;
