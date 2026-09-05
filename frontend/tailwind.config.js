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
        ember: {
          DEFAULT: '#FF4400',
          50: '#FFF2EC',
          100: '#FFE0D3',
          200: '#FFBEA6',
          300: '#FF9774',
          400: '#FF6D3B',
          500: '#FF4400',
          600: '#E63D00',
          700: '#B83100',
          800: '#8A2500',
          900: '#5C1800',
        },
        surface: {
          950: '#070707',
          900: '#0C0C0C',
          850: '#121212',
          800: '#171717',
          700: '#222222',
          600: '#2E2E2E',
          500: '#3D3D3D',
        }
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        sans: ['"Space Grotesk"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        // The results view already used `animate-fadeIn`, but no such animation
        // was ever defined, so the class did nothing.
        'fadeIn': 'fadeIn 0.35s ease-out both',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
