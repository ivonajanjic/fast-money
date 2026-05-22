import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Impact", "Arial Black", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        gold: {
          300: "#fde68a",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        stage: {
          dark: "#0a0a0f",
          mid: "#12121e",
          light: "#1a1a2e",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.1)",
        "glow-lg":
          "0 0 40px rgba(251, 191, 36, 0.5), 0 0 80px rgba(251, 191, 36, 0.2)",
        "button-hover":
          "0 8px 30px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        flicker: "flicker 4s linear infinite",
      },
      keyframes: {
        flicker: {
          "0%, 95%, 100%": { opacity: "1" },
          "96%": { opacity: "0.8" },
          "97%": { opacity: "1" },
          "98%": { opacity: "0.7" },
          "99%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
