/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ksystems': {
          primary: '#1E3A8A',
          secondary: '#3B82F6',
          accent: '#60A5FA',
          dark: '#0F172A',
          light: '#F1F5F9'
        }
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
