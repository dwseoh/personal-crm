import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          100: "var(--color-base-100)",
          200: "var(--color-base-200)",
          300: "var(--color-base-300)",
          content: "var(--color-base-content)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          content: "var(--color-primary-content)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          content: "var(--color-secondary-content)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          content: "var(--color-accent-content)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
