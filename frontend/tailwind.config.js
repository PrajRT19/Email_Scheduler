/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00A63E',
          hover: '#008A33',
          active: '#00732A',
          soft: '#E5F6EC',
          border: '#99DCB2',
          light: '#F4F7F5',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          bg: '#FAFAFA',
          muted: '#F4F5F7',
          subtle: '#F9FAFB',
          border: '#E5E7EB',
        },
        status: {
          scheduledBg: '#FEF3C7',
          scheduledText: '#D97706',
          scheduledOrange: '#DD784D',
          sentBg: '#DEF7EC',
          sentText: '#03543F',
          failedBg: '#FDE8E8',
          failedText: '#9B1C1C',
          processingBg: '#E1EFFE',
          processingText: '#1E429F',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
