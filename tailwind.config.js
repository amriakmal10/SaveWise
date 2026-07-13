module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3461FD", // bright blue — buttons, links, progress bars, icon accents
          light: "#5B82FF",
        },
        navy: "#10193A", // dark navy — header blocks (matches passcode/goals mockup)
      },
    },
  },
  plugins: [],
};