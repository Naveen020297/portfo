import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Theme tokens live in globals.css as RGB channels, so opacity modifiers (bg-cyanx/15) still work.
      colors: {
        void: "rgb(var(--bg) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        body: "rgb(var(--body) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        cyanx: "rgb(var(--cyan) / <alpha-value>)",
        violetx: "rgb(var(--violet) / <alpha-value>)",
        amberx: "rgb(var(--amber) / <alpha-value>)",
        pinkx: "rgb(var(--pink) / <alpha-value>)",
        greenx: "rgb(var(--green) / <alpha-value>)",
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
