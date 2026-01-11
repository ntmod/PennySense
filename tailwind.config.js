/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",

        // Status
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",

        // Backgrounds & Surfaces
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-highlight": "var(--color-surface-highlight)",

        // Typography
        "text-main": "var(--color-text-main)",
        "text-sub": "var(--color-text-sub)",
        "text-inverse": "var(--color-text-inverse)",
      },
      fontFamily: {
        sans: ["ChakraPetch_400Regular", "sans-serif"],
        chakra: ["ChakraPetch_400Regular", "sans-serif"],

        // Explicit weights for better control if needed
        "chakra-light": ["ChakraPetch_300Light", "sans-serif"],
        "chakra-medium": ["ChakraPetch_500Medium", "sans-serif"],
        "chakra-semibold": ["ChakraPetch_600SemiBold", "sans-serif"],
        "chakra-bold": ["ChakraPetch_700Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};
