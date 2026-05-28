import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],
      },
      colors: {
        // Warm ink — true near-black with a faint chestnut undertone.
        ink: {
          50: "#faf7f2",   // Warm parchment — the body bg
          100: "#f2ede3",  // Slightly deeper paper — surface
          150: "#ebe2d2",  // Hairline rule, subtle bg
          200: "#d9ccbc",  // Border
          300: "#b8a99b",  // Disabled text
          400: "#9c8a78",  // Muted
          500: "#75685d",  // Secondary text
          600: "#5b4f44",  // Body text muted
          700: "#3d332b",  // Strong body
          800: "#24201c",  // Headlines
          900: "#16110d",  // True ink
        },
        // Ember — the singular accent. Distinct from generic SaaS blue/purple.
        brand: {
          50: "#fdf4ed",
          100: "#fbe3d2",
          200: "#f6c19f",
          300: "#ef9866",
          400: "#e57842",
          500: "#c85428",
          600: "#a93f1c",
          700: "#8f3818",
          800: "#6f2c14",
          900: "#5a2511",
          950: "#321509",
        },
        // Status palette — muted, restrained, editorial.
        success: {
          50: "#ecf3ed",
          500: "#1f6e3c",
          600: "#175c30",
          700: "#114a25",
        },
        warn: {
          50: "#fbf2e3",
          500: "#b86e20",
          600: "#965818",
          700: "#7a4612",
        },
        danger: {
          50: "#f9ebe9",
          500: "#9b2c2c",
          600: "#7d2222",
          700: "#641c1c",
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(22, 17, 13, 0.04), 0 0 0 1px rgba(22, 17, 13, 0.04)",
        "card-hover": "0 2px 0 0 rgba(22, 17, 13, 0.05), 0 0 0 1px rgba(200, 84, 40, 0.18)",
        elevated: "0 12px 32px -12px rgba(22, 17, 13, 0.10), 0 4px 12px -4px rgba(22, 17, 13, 0.04)",
        "glow-brand": "0 0 0 4px rgba(200, 84, 40, 0.12)",
      },
      borderRadius: {
        sm: "3px",
        md: "5px",
        lg: "7px",
        xl: "10px",
        "2xl": "14px",
      },
      letterSpacing: {
        editorial: "0.14em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 540ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.2s linear infinite",
        "soft-pulse": "soft-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
