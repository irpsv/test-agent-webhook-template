/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        foreground: 'var(--color-foreground)',
        muted: 'var(--color-muted)',
        primary: 'var(--color-primary)',
        primaryFg: 'var(--color-primary-fg)',
      },
    },
  },
  plugins: [],
}
