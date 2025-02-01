import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./configure/src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#01b4e4",
          foreground: "#FFFFFF",
        },
        sidebar: {
          DEFAULT: "#0d253f",
          foreground: "#FFFFFF",
          accent: "#1a4b8c",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#333333",
        },
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    },
  }
} satisfies Config;