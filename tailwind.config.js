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
        // ── 燕麦奶白 / 杏桃 / 深可可 ──
        oat: {
          50: '#FCF9F5', // 全局背景
          100: '#F4EFE8', // 次级容器底色
          200: '#E6DEC3', // 柔和边框线
        },
        apricot: {
          50: '#FFF8F3',
          100: '#FCEBDF', // 浅杏桃高亮底
          200: '#F7D4BC',
          400: '#EDA174',
          500: '#E58A54', // 核心品牌色
          600: '#D1743E',
        },
        cocoa: {
          900: '#332B26', // 标题
          700: '#544840', // 正文
          400: '#9A8C82', // 辅助说明
          200: '#D5CBC3',
        },

        // ── 语义色（沿用旧 token 名，自动继承新配色）──
        sage: {
          50: '#FFF8F3',
          100: '#FCEBDF',
          200: '#F7D4BC',
          500: '#E58A54',
          600: '#D1743E',
          700: '#B4622F',
        },
        primary: {
          DEFAULT: '#E58A54',
          light: '#EDA174',
          dark: '#D1743E',
        },
        secondary: {
          DEFAULT: '#544840',
          light: '#9A8C82',
          dark: '#332B26',
        },
        accent: {
          DEFAULT: '#FFF8F3',
          light: '#FCF9F5',
          dark: '#FCEBDF',
        },
        background: '#FCF9F5',
        surface: '#F4EFE8',
        card: '#FFFFFF',
        outline: '#E6DEC3',
        'outline-dark': '#D5CBC3',
        text: {
          primary: '#332B26',
          secondary: '#9A8C82',
          muted: '#6B5B52',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        cartoon: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        cozy: '12px',
        'cozy-sm': '10px',
      },
      boxShadow: {
        // 网页稿中的 card-shadow / dock-shadow
        cozy: '0 4px 16px -4px rgba(51, 43, 38, 0.05), 0 1px 3px 0 rgba(51, 43, 38, 0.02)',
        'cozy-sm': '0 1px 4px rgba(51, 43, 38, 0.06)',
        'cozy-hover': '0 10px 28px -6px rgba(51, 43, 38, 0.12)',
        'cozy-primary': '0 6px 16px -6px rgba(229, 138, 84, 0.45)',
        soft: '0 2px 12px rgba(51, 43, 38, 0.04)',
        card: '0 4px 16px -4px rgba(51, 43, 38, 0.05), 0 1px 3px 0 rgba(51, 43, 38, 0.02)',
        dock: '0 10px 28px -6px rgba(51, 43, 38, 0.12)',
        float: '0 12px 40px rgba(51, 43, 38, 0.14)',
        'cartoon-sm': '0 1px 4px rgba(51, 43, 38, 0.06)',
        'cartoon-lg': '0 12px 40px rgba(51, 43, 38, 0.14)',
      },
      keyframes: {
        fadeSlide: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scalePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        fade: 'fadeSlide 0.2s ease-out forwards',
        pop: 'scalePop 0.22s ease-out',
      },
    },
  },
  plugins: [],
};
