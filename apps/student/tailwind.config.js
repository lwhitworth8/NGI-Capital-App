/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    // Only scan local UI source, not entire node_modules
    '../../packages/ui/src/**/*.{ts,tsx}',
    // If using the published UI package, scope to its dist only
    './node_modules/@ngi/ui/dist/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input, var(--border)))',
        ring: 'hsl(var(--ring, var(--primary)))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary, var(--accent)))',
          foreground: 'hsl(var(--secondary-foreground, var(--foreground)))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground, var(--foreground)))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground, var(--foreground)))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground, var(--foreground)))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  presets: [require('@ngi/ui/tailwind-preset')],
  plugins: [],
}
