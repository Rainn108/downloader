/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#E0F2FE',
      },
      fontFamily: {
        sans: ['MyFont', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
