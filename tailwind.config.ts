import type { Config } from 'tailwindcss';

export default {
  content: ['entrypoints/**/*.{html,ts,tsx}', 'src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          100: '#dfe8ff',
          500: '#3f66ff',
          600: '#2f4fe4',
          700: '#273fb6',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
