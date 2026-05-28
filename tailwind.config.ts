import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],
      },
      colors: {
        ink: {
          50: "#f8f9fb",
          100: "#eff1f5",
          150: "#e5e8ee",
          200: "#d4d9e2",
          300: "#a8b1c0",
          400: "#7a8497",
          500: "#566275",
          600: "#3f4a5d",
          700: "#2e3645",
          800: "#1f2533",
          900: "#0f131c",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        success: {
          50: "#ecfdf5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        warn: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fff1f2",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 19, 28, 0.04), 0 1px 1px 0 rgba(15, 19, 28, 0.03)",
        "card-hover": "0 4px 12px -2px rgba(15, 19, 28, 0.08), 0 2px 4px -2px rgba(15, 19, 28, 0.04)",
        elevated: "0 12px 32px -8px rgba(15, 19, 28, 0.12), 0 4px 12px -4px rgba(15, 19, 28, 0.06)",
        "glow-brand": "0 0 0 4px rgba(99, 102, 241, 0.12)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      keyframes: {
        "slide-up-fade": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "slide-up-fade": "slide-up-fade 220ms ease-out",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
