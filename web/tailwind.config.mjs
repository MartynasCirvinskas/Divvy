/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFFBF5',
        ink: '#1C1917',
        honey: { DEFAULT: '#F5A524', dark: '#D98A0B', light: '#FFE9C2' },
        teal: { DEFAULT: '#0EA5A4', dark: '#0B807F' },
        coral: '#FF6B6B',
        surface: '#FFFFFF',
        muted: '#78716C',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: { soft: '0 8px 30px rgba(28,25,23,0.08)' },
      maxWidth: { content: '72rem' },
    },
  },
  plugins: [],
};
