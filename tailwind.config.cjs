/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0f13',
        card: '#151821',
        border: '#232633',
        primary: '#7c3aed',
        accent: '#00d0ff'
      },
      boxShadow: {
        card: '0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)',
      }
    },
  },
  plugins: [],
}
