import type { Config } from 'tailwindcss';

// Colours come from THE 87TH CLUB Brand Kit (Canva, Vol. 01) — do not change without the brand book.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        signal: '#E31B23', // SIGNAL RED · Pantone 186 C · accent only
        ink: '#0A0A0A', // DEEP BLACK · foundation
        paper: '#F5F5F2', // OFF WHITE · text on black
        sand: '#E8C68E', // CLUB SAND · panels
      },
      fontFamily: {
        cond: ['var(--font-cond)'],
        body: ['var(--font-body)'],
        didot: ['var(--font-didot)'],
      },
      letterSpacing: { tightest: '-0.04em' },
      screens: { xs: '420px' },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        bump: { '0%,100%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' } },
      },
      animation: { marquee: 'marquee 40s linear infinite', bump: 'bump .45s ease' },
    },
  },
  plugins: [],
} satisfies Config;
