import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B1220", 800: "#131C2E", 700: "#1B263B" },
        brand: { DEFAULT: "#F59E0B", light: "#FBBF24", dark: "#B45309" },
        good: { DEFAULT: "#22C55E", dark: "#15803D" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { float: "float 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
