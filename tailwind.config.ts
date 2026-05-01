import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0B0D",
          subtle: "#0E1014",
          surface: "#13161B",
          elevated: "#191D23",
        },
        border: {
          DEFAULT: "#1F242C",
          subtle: "#181C22",
          strong: "#2A313B",
        },
        fg: {
          DEFAULT: "#E6E8EC",
          muted: "#8A93A0",
          subtle: "#5A626E",
        },
        accent: {
          DEFAULT: "#7C5CFF",
          glow: "#9B82FF",
        },
        status: {
          ok: "#3FCF8E",
          warn: "#F5B544",
          err: "#F26B6B",
          idle: "#5A626E",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124, 92, 255, 0.25), 0 8px 32px rgba(124, 92, 255, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
