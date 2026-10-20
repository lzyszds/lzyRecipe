/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 唯一主色调：静谧鼠尾草绿
        sage: {
          50: '#f2f7f4',
          100: '#e1ede6',
          200: '#c7ddd0',
          500: '#2d6a4f',
          600: '#1b4332',
          700: '#14362a',
        },
        primary: {
          DEFAULT: '#2d6a4f',
          light: '#3a7d5e',
          dark: '#1b4332',
        },
        secondary: {
          DEFAULT: '#40916c',
          light: '#52b788',
          dark: '#2d6a4f',
        },
        accent: {
          DEFAULT: '#f2f7f4',
          light: '#f8fbf9',
          dark: '#e1ede6',
        },
        background: '#F6F7F9',
        surface: '#F6F7F9',
        card: '#FFFFFF',
        outline: '#E8EAED',
        'outline-dark': '#D6DAE0',
        text: {
          primary: '#171A1D',
          secondary: '#9AA1A9',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        cartoon: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        cozy: '16px',
        'cozy-sm': '12px',
      },
      boxShadow: {
        cozy: '0 2px 12px rgba(17, 24, 39, 0.04)',
        'cozy-sm': '0 1px 4px rgba(17, 24, 39, 0.04)',
        'cozy-hover': '0 8px 24px rgba(17, 24, 39, 0.08)',
        'cozy-primary': '0 4px 12px rgba(45, 106, 79, 0.18)',
        soft: '0 2px 12px rgba(17, 24, 39, 0.04)',
        card: '0 2px 12px rgba(17, 24, 39, 0.03)',
        float: '0 12px 40px rgba(17, 24, 39, 0.10)',
        'cartoon-sm': '0 1px 4px rgba(17, 24, 39, 0.04)',
        'cartoon-lg': '0 12px 40px rgba(17, 24, 39, 0.10)',
      },
    },
  },
  plugins: [],
};
