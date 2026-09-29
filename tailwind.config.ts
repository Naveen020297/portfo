import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05060a",
        cyanx: "#22d3ee",
        violetx: "#8b5cf6",
        amberx: "#fbbf24",
        pinkx: "#f472b6",
        greenx: "#34d399",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
