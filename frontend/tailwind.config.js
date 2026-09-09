/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta corporativa EstibaX (verde)
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // Primary
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        ink: '#0f172a', // Texto principal
        surface: '#f8fafc', // Fondo general
        danger: '#dc2626', // Acento de alerta
      },
      borderRadius: {
        xl2: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        pop: '0 8px 30px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
