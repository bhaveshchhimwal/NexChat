// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {
      config: './tailwind.config.js', // optional but safe
    },
    autoprefixer: {},
  },
};
