import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#aeb6c4",
          400: "#7e8a9d",
          500: "#5b6779",
          600: "#475160",
          700: "#3a4250",
          800: "#262c36",
          900: "#161a21",
        },
        brand: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#bcd6ff",
          300: "#8dbcff",
          400: "#5798ff",
          500: "#2f74ff",
          600: "#1857f0",
          700: "#1444c5",
          800: "#143b9c",
          900: "#15367b",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
