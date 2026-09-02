import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — un clu de bordado
        miel: {
          DEFAULT: "#F2C166", // warm honey — highlights, focus, active days
          soft: "#F7D592",
          deep: "#E3A93F",
        },
        lino: {
          DEFAULT: "#DFD7CC", // warm linen — borders, muted surfaces
          soft: "#EDE8E0",
        },
        piedra: {
          DEFAULT: "#77898B", // stone grey-teal — body text, secondary
          soft: "#93A2A3",
          deep: "#566567",
        },
        ladrillo: {
          DEFAULT: "#D9704A", // terracotta — primary CTA, links
          soft: "#E28C6C",
          deep: "#B9552F",
        },
        crema: "#FBF8F3", // light page background — always clear
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(86, 101, 103, 0.06), 0 8px 24px rgba(86, 101, 103, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
