import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        stone: {
          50: 'rgb(var(--stone-50) / <alpha-value>)',
          100: 'rgb(var(--stone-100) / <alpha-value>)',
          200: 'rgb(var(--stone-200) / <alpha-value>)',
          300: 'rgb(var(--stone-300) / <alpha-value>)',
          400: 'rgb(var(--stone-400) / <alpha-value>)',
          500: 'rgb(var(--stone-500) / <alpha-value>)',
          600: 'rgb(var(--stone-600) / <alpha-value>)',
          700: 'rgb(var(--stone-700) / <alpha-value>)',
          800: 'rgb(var(--stone-800) / <alpha-value>)',
          900: 'rgb(var(--stone-900) / <alpha-value>)',
          950: 'rgb(var(--stone-950) / <alpha-value>)',
        },
        brand: {
          50: '#fdf8f4',
          100: '#f9eee2',
          200: '#f2dac3',
          300: '#e0a972',
          400: '#d4823f',
          500: '#c76d28',
          600: '#b5591c',
          700: '#964518',
          800: '#7a3918',
          900: '#462013',
          950: '#230e07',
        },
        espresso: '#1a100c',
      },
    },
  },
  plugins: [],
};

export default config;
