import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import SplashScreen, { SPLASH_SESSION_KEY } from "@/components/SplashScreen";
import "./globals.css";

// Runs synchronously before <body> paints, so a reload within a session
// that already saw the splash never shows it for even one frame — see the
// html.splash-skip rule in globals.css.
const SPLASH_SKIP_SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(SPLASH_SESSION_KEY)})==="1"){document.documentElement.classList.add("splash-skip");}}catch(e){}})();`;

const DESCRIPTION =
  "Photograph a handwritten kirana credit notebook. UdhaarAI reads Hindi, Telugu and English pages, flags anything it isn't sure of, and turns the rest into a searchable ledger with reminders, receipts and business insights.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "UdhaarAI — Snap. Understand. Collect.",
    template: "%s · UdhaarAI",
  },
  description: DESCRIPTION,
  applicationName: "UdhaarAI",
  keywords: ["kirana", "udhaar", "khata", "ledger", "handwriting OCR", "Hindi", "Telugu", "India"],
  authors: [{ name: "Avula Hariswara Reddy" }],
  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "UdhaarAI — Snap. Understand. Collect.",
    description: "Turn a handwritten udhaar notebook into a live ledger.",
    type: "website",
    siteName: "UdhaarAI",
    locale: "en_IN",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "UdhaarAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UdhaarAI — Snap. Understand. Collect.",
    description: "Turn a handwritten udhaar notebook into a live ledger.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SKIP_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Poppins:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@500;600&family=Noto+Sans+Telugu:wght@500;600&display=swap"
        />
      </head>
      <body className="relative">
        <div className="relative z-10">{children}</div>
        <SplashScreen />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#131C2E",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}
