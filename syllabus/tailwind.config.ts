import type { Config } from "tailwindcss";

const INK = "#221a14";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f6efe0",
          50: "#fffdf4",
          100: "#f6efe0",
          200: "#efe3cb",
          300: "#e2d2ae",
        },
        ink: {
          DEFAULT: INK,
          light: "#575046",
          faint: "#8d8474",
        },
        crimson: {
          DEFAULT: "#b81f2d",
          50: "#fdeef0",
          100: "#f6ccd1",
          400: "#d5344a",
          500: "#c82433",
          600: "#b81f2d",
          700: "#8f1622",
          900: "#4a0c12",
        },
        forest: {
          DEFAULT: "#1f4d38",
          400: "#2f6f50",
          500: "#265a41",
          600: "#1f4d38",
          700: "#173a2a",
        },
        // highlighter yellow — stickers, seals, marker swipes
        marker: {
          DEFAULT: "#ffcf00",
          soft: "#ffe87a",
        },
        redpen: "#e5383b",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        sans: ["var(--font-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        hand: ["var(--font-hand)", "cursive"],
      },
      boxShadow: {
        sticker: `4px 4px 0 0 ${INK}`,
        "sticker-sm": `2px 2px 0 0 ${INK}`,
        "sticker-lg": `7px 7px 0 0 ${INK}`,
        card: "0 10px 30px -12px rgba(34, 26, 20, 0.35)",
        note: "2px 2px 0 0 rgba(34,26,20,0.15)",
      },
      keyframes: {
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toss-left": {
          "100%": { opacity: "0", transform: "translateX(-140%) rotate(-18deg)" },
        },
        "toss-right": {
          "100%": { opacity: "0", transform: "translateX(140%) rotate(18deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0) rotate(var(--float-rot, 0deg))" },
          "50%": { transform: "translateY(-10px) rotate(var(--float-rot, 0deg))" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg) scale(1.04)" },
        },
        "spin-slow": {
          "100%": { transform: "rotate(360deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.06)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "card-in": "card-in 0.28s ease-out",
        "toss-left": "toss-left 0.4s ease-in forwards",
        "toss-right": "toss-right 0.4s ease-in forwards",
        marquee: "marquee 22s linear infinite",
        "marquee-fast": "marquee 14s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
        "spin-slow": "spin-slow 14s linear infinite",
        pop: "pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
