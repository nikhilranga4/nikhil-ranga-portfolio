import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "on-grad": "hsl(var(--on-grad) / <alpha-value>)",
        brand: {
          1: "hsl(var(--brand-1) / <alpha-value>)",
          2: "hsl(var(--brand-2) / <alpha-value>)",
          3: "hsl(var(--brand-3) / <alpha-value>)",
          4: "hsl(var(--brand-4) / <alpha-value>)",
          5: "hsl(var(--brand-5) / <alpha-value>)",
        },
      },
      fontFamily: {
        // Each colour theme brings its own font pairing via CSS variables (see index.css)
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
        heading: ["var(--font-display)", "var(--font-body)", "sans-serif"],
        mono: ["'JetBrains Mono Variable'", "'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        "glow-1": "0 0 40px -8px hsl(var(--brand-1) / 0.65)",
        "glow-2": "0 0 40px -8px hsl(var(--brand-2) / 0.65)",
        "glow-3": "0 0 40px -8px hsl(var(--brand-3) / 0.65)",
        pop: "0 6px 0 0 hsl(var(--brand-2) / 0.9)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        float: "float 4s ease-in-out infinite",
        "float-3d": "float-3d 7s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        blob: "blob 18s ease-in-out infinite",
        "spin-slow": "spin 14s linear infinite",
        "spin-cube": "spin-cube 6s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
        wiggle: "wiggle 0.6s ease-in-out",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
        "scroll-dot": "scroll-dot 1.8s ease-in-out infinite",
        tumble: "tumble 18s linear infinite",
        shine: "shine 5s ease-in-out infinite",
        blink: "blink 1.05s step-end infinite",
        "packet-down": "packet-down 1.1s linear infinite",
        "packet-up": "packet-up 1.1s linear infinite",
      },
      keyframes: {
        "packet-down": {
          from: { top: "-8%" },
          to: { top: "100%" },
        },
        "packet-up": {
          from: { top: "100%" },
          to: { top: "-8%" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-3d": {
          "0%, 100%": { transform: "translate3d(0,0,0) rotateX(8deg) rotateY(-12deg)" },
          "50%": { transform: "translate3d(0,-16px,0) rotateX(-6deg) rotateY(12deg)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(8vw, -6vh) scale(1.15)" },
          "66%": { transform: "translate(-6vw, 8vh) scale(0.9)" },
        },
        "spin-cube": {
          "0%": { transform: "rotateX(-25deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(-25deg) rotateY(360deg)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-12deg) scale(1.15)" },
          "75%": { transform: "rotate(10deg) scale(1.1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        shine: {
          "0%, 55%": { backgroundPosition: "-120% 0" },
          "100%": { backgroundPosition: "220% 0" },
        },
        tumble: {
          from: { transform: "rotateX(0deg) rotateY(0deg) rotateZ(0deg)" },
          to: { transform: "rotateX(360deg) rotateY(720deg) rotateZ(180deg)" },
        },
        "scroll-dot": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "80%": { transform: "translateY(14px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "0" },
        },
      },
    },
  },
  plugins: [animate],
} satisfies Config;
