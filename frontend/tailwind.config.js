/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        navy: '#0A2540',
        slate: '#697386',
        background: '#F6F9FC',
        primary: '#635BFF',
        'primary-light': '#7E6BFD',
        accent: '#FF6B47',
        success: '#057a55',
        warning: '#b45309',
        danger: '#c81e1e',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 48px rgba(10, 37, 64, 0.08)',
      },
    },
  },
}
