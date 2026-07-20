import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1e2723",
        leaf: "#1f7a4d",
        market: "#f5f0e8",
        berry: "#a23b72",
        brass: "#c88719"
      },
      boxShadow: {
        soft: "0 12px 30px rgb(30 39 35 / 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
