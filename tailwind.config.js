/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        gold: "#D4AF37",
        dark: "#050505",
        card: "#111111",
        accent: "#1a1a1a"
      },

      fontFamily: {
        title: ["Playfair Display", "serif"],
        body: ["Poppins", "sans-serif"]
      },

      boxShadow: {
        gold: "0 0 40px rgba(212,175,55,.35)",
        luxury: "0 20px 60px rgba(0,0,0,.55)"
      },

      backgroundImage: {
        luxury:
          "linear-gradient(135deg,#050505 0%,#0d0d0d 35%,#111111 100%)"
      },

      animation: {
        float: "float 6s ease-in-out infinite",
        steam: "steam 5s linear infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        rotateSlow: "rotateSlow 18s linear infinite"
      },

      keyframes: {
        float: {
          "0%,100%": {
            transform: "translateY(0px)"
          },
          "50%": {
            transform: "translateY(-18px)"
          }
        },

        steam: {
          "0%": {
            opacity: "0",
            transform: "translateY(0) scale(.6)"
          },
          "50%": {
            opacity: ".7"
          },
          "100%": {
            opacity: "0",
            transform: "translateY(-120px) scale(1.5)"
          }
        },

        glow: {
          from: {
            boxShadow: "0 0 15px #D4AF37"
          },
          to: {
            boxShadow: "0 0 45px #D4AF37"
          }
        },

        rotateSlow: {
          from: {
            transform: "rotate(0deg)"
          },
          to: {
            transform: "rotate(360deg)"
          }
        }
      }
    }
  },

  plugins: []
};
