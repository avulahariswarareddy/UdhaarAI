/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs inline scripts for hydration. unsafe-eval is only
      // required by the dev-mode React refresh runtime, so it is dropped
      // in production where it would otherwise widen XSS impact.
      process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// The splash animation (public/splash/) is a self-contained third-party
// runtime: it loads React/ReactDOM/Babel from unpkg.com and uses Babel's
// in-browser JSX transform (a Function() constructor call, which CSP treats
// as eval), and it's loaded same-origin in an <iframe> by SplashScreen.tsx.
// The site-wide headers above (X-Frame-Options: DENY, frame-ancestors
// 'none', no unsafe-eval, no unpkg.com) block all of that outright. Scoped
// here to /splash/* only — 'self' framing and eval stay off everywhere
// else in the app.
const splashHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/splash/:path*", headers: splashHeaders },
    ];
  },
};

export default nextConfig;
