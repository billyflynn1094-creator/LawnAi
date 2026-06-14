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
          900: "#0a1a08",
          800: "#162d11",
          700: "#1e3d17",
          600: "#2a5220",
          500: "#376829",
          400: "#4a8535",
          300: "#6aab52",
          200: "#92c97c",
          100: "#c4e8b3",
          50: "#edf7e8",
        },
        straw: {
          500: "#c99a2e",
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
        // IrrigationPro color tokens
        water: {
          900: "#051a2e",
          800: "#0a2540",
          700: "#0e3358",
          600: "#1a4a72",
          500: "#2563a8",
          400: "#3b82c4",
          300: "#60a5d6",
          200: "#93c5e8",
          100: "#cce4f7",
        },
        navy: {
          900: "#03080f",
          800: "#07111f",
          700: "#0d1d33",
          600: "#152b47",
          500: "#1e3a5f",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grass-gradient": "linear-gradient(160deg, #0a1a08 0%, #1a3012 55%, #243d1a 100%)",
      },
    },
  },
  plugins: [],
};
