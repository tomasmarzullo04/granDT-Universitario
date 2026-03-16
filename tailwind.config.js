/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        primary: '#1966B3', // Azul Real
        accent: '#13AAD4',  // Celeste Deportivo
        neutral: '#757575', // Gris neutro
        'neutral-light': '#F5F5F5', // Gris muy claro para filas
      }
    },
  },
  plugins: [],
}
