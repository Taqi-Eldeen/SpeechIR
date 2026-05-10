/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        speech: {
          ink: "#0f172a",
          muted: "#64748b",
          accent: "#2563eb",
          surface: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
