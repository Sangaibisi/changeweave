import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#09090b",
          50: "#18181b",
          100: "#1c1c20",
          200: "#27272a",
          300: "#3f3f46",
        },
        accent: {
          DEFAULT: "#a3e635",
          dim: "#84cc16",
          glow: "rgba(163, 230, 53, 0.15)",
          muted: "rgba(163, 230, 53, 0.08)",
        },
        txt: {
          DEFAULT: "#fafafa",
          secondary: "#a1a1aa",
          muted: "#71717a",
          faint: "#52525b",
        },
        glass: {
          border: "rgba(255, 255, 255, 0.06)",
          "border-hover": "rgba(255, 255, 255, 0.12)",
          bg: "rgba(24, 24, 27, 0.6)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        xl: "12px",
        lg: "10px",
      },
      animation: {
        "mesh-1": "mesh1 8s ease-in-out infinite",
        "mesh-2": "mesh2 10s ease-in-out infinite",
        "mesh-3": "mesh3 12s ease-in-out infinite",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "typewriter": "typewriter 3s steps(40) infinite",
        "blink": "blink 1s step-end infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        mesh1: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "33%": { transform: "translate(20%, -15%) scale(1.1)" },
          "66%": { transform: "translate(-10%, 20%) scale(0.95)" },
        },
        mesh2: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "33%": { transform: "translate(-20%, 15%) scale(1.05)" },
          "66%": { transform: "translate(15%, -20%) scale(1.1)" },
        },
        mesh3: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1.05)" },
          "50%": { transform: "translate(10%, 10%) scale(0.95)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        typewriter: {
          "0%, 100%": { width: "0" },
          "40%, 60%": { width: "100%" },
        },
        blink: {
          "50%": { opacity: "0" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(163, 230, 53, 0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(163, 230, 53, 0.25)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
export default config;
