/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ai: {
          rouge:           '#E30513',
          violet:          '#30323E',
          gris:            '#DFE4E8',
          'rouge-clair':   '#F9E1E3',
          'gris-clair':    '#F2F2F2',
          noir70:          '#4D4D4D',
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};
