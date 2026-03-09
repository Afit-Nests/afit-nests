/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: '#1B3A6B',
          light: '#2A5298',
          dark: '#0F1F3D',
        },
        orange: {
          DEFAULT: '#F97316',
          light: '#FB923C',
        },
        beige: {
          DEFAULT: '#F5F0E8',
          dark: '#E8E0D0',
        },
        card: '#FDFCF9',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}