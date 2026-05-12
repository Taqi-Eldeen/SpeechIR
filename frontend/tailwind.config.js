/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        neu: {
          bg:     "#e0e5ec",
          dark:   "#a3b1c6",
          light:  "#ffffff",
          ink:    "#31456a",
          muted:  "#7d92b5",
          accent: "#4e6ef2",
          danger: "#e05c6e",
          ok:     "#3ecf8e",
        },
      },
      borderRadius: {
        neu: "1.25rem",
      },
    },
  },
  plugins: [],
};
