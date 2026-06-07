import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07080d",
        panel: "#10121a",
        panel2: "#171a24",
        line: "#262b3a",
        violet: "#8b5cf6",
        cyan: "#2dd4bf",
        lime: "#a3e635",
        gold: "#f2c94c"
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
