/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        soil: {
          900: "#1a1008",
          800: "#2d1f0e",
          700: "#3d2b14",
        },
        field: {
          900: "#0d1f0a",
          800: "#162d11",
          700: "#1e3d17",
          600: "#2a5220",
          500: "#376829",
          400: "#4a8535",
          300: "#6aab52",
          200: "#92c97c",
          100: "#c4e8b3",
          50:  "#edf7e8",
        },
        straw: {
          400: "#d4a843",
          300: "#e2c06a",
          200: "#edd896",
          100: "#f7eece",
        },
        rust: {
          500: "#b84c1a",
          400: "#d45e28",
          300: "#e8845a",
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grass-gradient": "linear-gradient(160deg, #0d1f0a 0%, #1e3d17 50%, #2a5220 100%)",
      },
    },
  },
  plugins: [],
};
