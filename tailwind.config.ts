import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        japonesa: {
          red: "#7a0f17",
          cream: "#f4ecd8",
          ink: "#1a1a1a",
        },
      },
      fontFamily: {
        display: ["ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
