/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B4A',
          light: '#FF9478',
          dark: '#E85535',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          light: '#7EDDD6',
          dark: '#3BA89F',
        },
        accent: {
          DEFAULT: '#FFD93D',
          light: '#FFE566',
          dark: '#F4C430',
        },
        background: '#FFF8E7',
        surface: '#FFE8D6',
        outline: '#3D2C29',
        text: {
          primary: '#3D2C29',
          secondary: '#7A5C4F',
        },
      },
      fontFamily: {
        cartoon: ['"ZCOOL KuaiLe"', '"Nunito"', 'sans-serif'],
        serif: ['"ZCOOL KuaiLe"', 'sans-serif'],
        sans: ['"Nunito"', '"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2rem',
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(61, 44, 41, 0.08)',
        'card': '3px 3px 0px 0px rgba(61, 44, 41, 0.85)',
        'cartoon': '4px 4px 0px 0px rgba(61, 44, 41, 0.9)',
        'cartoon-sm': '2px 2px 0px 0px rgba(61, 44, 41, 0.85)',
        'cartoon-lg': '6px 6px 0px 0px rgba(61, 44, 41, 0.9)',
        'cartoon-hover': '2px 2px 0px 0px rgba(61, 44, 41, 0.85)',
      },
      animation: {
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
      },
      keyframes: {
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
};
