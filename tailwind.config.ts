import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "pv-blue-900": "#1e3a5f",
        "pv-blue-700": "#26476f",
        "pv-yellow-500": "#f2c94c",
        "pv-green-600": "#70b643",
        "pv-gray-100": "#f5f5f5",
        "pv-gray-200": "#e5e7eb",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
