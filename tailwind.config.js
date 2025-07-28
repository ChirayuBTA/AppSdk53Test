/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#f89f22",
        secondary: "#f3f4f6",
      },
      backgroundColor: {
        primary: "#f89f22",
      },
    },
  },
  plugins: [],
};
