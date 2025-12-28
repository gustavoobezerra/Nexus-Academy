/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'nexus': {
          indigo: '#4F46E5',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          'gray-dark': '#1F2937',
          'gray-medium': '#6B7280',
          'gray-light': '#F3F4F6',
          white: '#FFFFFF'
        },
        chart: {
          blue: '#3B82F6',
          violet: '#8B5CF6',
          pink: '#EC4899',
          green: '#10B981',
          orange: '#F97316'
        }
      }
    },
  },
  plugins: [],
}
