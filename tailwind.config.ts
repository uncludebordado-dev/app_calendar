import type { Config } from "tailwindcss";

/** Cada token = "rgb(var(--x) / <alpha-value>)" para soportar bg-color/opacidad. */
const withVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crema: withVar("--bg"),
        surface: {
          DEFAULT: withVar("--surface"),
          soft: withVar("--surface-2"),
        },
        lino: {
          DEFAULT: withVar("--border"),
          soft: withVar("--surface-2"),
        },
        piedra: {
          DEFAULT: withVar("--text-muted"),
          soft: withVar("--text-subtle"),
          deep: withVar("--text"),
        },
        miel: {
          DEFAULT: withVar("--honey"),
          soft: "#f7d592",
          deep: withVar("--honey-strong"),
        },
        ladrillo: {
          DEFAULT: withVar("--accent"),
          soft: "#e28c6c",
          deep: withVar("--accent-strong"),
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(20, 18, 16, 0.06), 0 8px 24px rgba(20, 18, 16, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
