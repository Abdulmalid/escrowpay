import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: "#060d1a",
          900: "#0a1628",
          800: "#10203a",
          700: "#1a2f52",
        },
        mint: {
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
