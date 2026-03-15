import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hexenlabor: {
          primary: '#7c3aed',
          secondary: '#a78bfa',
          accent: '#ec4899',
        },
      },
    },
  },
  plugins: [],
};

export default config;
