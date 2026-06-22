import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: "#06080c",
        panel: "#10131b",
        panel2: "#171b25",
        line: "#293040",
        champagne: "#f4d58d",
        teal: "#2dd4bf",
        steel: "#90a4bc",
        violet: "#8b5cf6",
        cyan: "#2dd4bf",
        lime: "#a3e635",
        gold: "#f2c94c"
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0,0,0,.35)",
        soft: "0 18px 45px rgba(0,0,0,.24)",
        glow: "0 0 0 1px rgba(244,213,141,.14), 0 22px 70px rgba(244,213,141,.08)"
      }
    }
  },
  plugins: []
};

export default config;
