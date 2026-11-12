import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Premium hover theme colors
        royalGreen: {
          DEFAULT: "hsl(152, 69%, 31%)",
          light: "hsl(152, 55%, 45%)",
        },
        warmGray: {
          DEFAULT: "hsl(30, 10%, 94%)",
          dark: "hsl(30, 5%, 20%)",
        },
        leaderboard: {
          bg: "hsl(var(--leaderboard-bg))",
          text: "hsl(var(--leaderboard-text))",
          glass: "hsl(var(--leaderboard-glass))",
          glassBorder: "hsl(var(--leaderboard-glass-border))",
          gradientStart: "hsl(var(--leaderboard-gradient-start))",
          gradientEnd: "hsl(var(--leaderboard-gradient-end))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glass: "hsla(var(--primary-glass))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          glass: "hsla(var(--secondary-glass))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          glass: "hsla(var(--destructive-glass))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          glass: "hsla(var(--muted-glass))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          glass: "hsla(var(--accent-glass))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          glass: "hsla(var(--success-glass))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          glass: "hsla(var(--warning-glass))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
          glass: "hsla(var(--popover-glass))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          glass: "hsla(var(--card-glass))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          glass: "hsla(var(--sidebar-glass))",
        },
        // "Ivory" design system (docs/DESIGN_SYSTEM.md). The variables exist
        // only inside [data-hec-theme="ivory"]; use these names only there.
        hec: {
          paper: "hsl(var(--hec-paper) / <alpha-value>)",
          surface: "hsl(var(--hec-surface) / <alpha-value>)",
          raised: "hsl(var(--hec-raised) / <alpha-value>)",
          sunken: "hsl(var(--hec-sunken) / <alpha-value>)",
          honey: "hsl(var(--hec-honey) / <alpha-value>)",
          ink: {
            DEFAULT: "hsl(var(--hec-ink) / <alpha-value>)",
            soft: "hsl(var(--hec-ink-soft) / <alpha-value>)",
            faint: "hsl(var(--hec-ink-faint) / <alpha-value>)",
          },
          line: {
            DEFAULT: "hsl(var(--hec-line) / <alpha-value>)",
            strong: "hsl(var(--hec-line-strong) / <alpha-value>)",
          },
          brass: {
            DEFAULT: "hsl(var(--hec-brass) / <alpha-value>)",
            fill: "hsl(var(--hec-brass-fill) / <alpha-value>)",
          },
          "on-brass": "hsl(var(--hec-on-brass) / <alpha-value>)",
          action: "hsl(var(--hec-action) / <alpha-value>)",
          "on-action": "hsl(var(--hec-on-action) / <alpha-value>)",
          leaf: {
            DEFAULT: "hsl(var(--hec-leaf) / <alpha-value>)",
            tint: "hsl(var(--hec-leaf-tint) / <alpha-value>)",
          },
          warn: {
            DEFAULT: "hsl(var(--hec-warn) / <alpha-value>)",
            tint: "hsl(var(--hec-warn-tint) / <alpha-value>)",
          },
          danger: {
            DEFAULT: "hsl(var(--hec-danger) / <alpha-value>)",
            fill: "hsl(var(--hec-danger-fill) / <alpha-value>)",
            tint: "hsl(var(--hec-danger-tint) / <alpha-value>)",
          },
          "on-danger": "hsl(var(--hec-on-danger) / <alpha-value>)",
          ring: "hsl(var(--hec-ring) / <alpha-value>)",
          logo: "hsl(var(--hec-logo) / <alpha-value>)",
          scrim: "hsl(var(--hec-scrim) / <alpha-value>)",
        },
      },
      fontFamily: {
        // System stacks, no web font. The fallback after the comma is what an
        // element outside the scope would get.
        display: ["var(--hec-font-display, ui-serif, serif)"],
        serif: ["var(--hec-font-display, ui-serif, serif)"],
      },
      fontSize: {
        "hec-display": ["var(--hec-text-display)", { lineHeight: "var(--hec-leading-display)", letterSpacing: "-0.01em" }],
        "hec-h1": ["var(--hec-text-h1)", { lineHeight: "var(--hec-leading-h1)", letterSpacing: "-0.005em" }],
        "hec-h2": ["var(--hec-text-h2)", { lineHeight: "var(--hec-leading-h2)" }],
        "hec-h3": ["var(--hec-text-h3)", { lineHeight: "var(--hec-leading-h3)" }],
        "hec-body": ["var(--hec-text-body)", { lineHeight: "var(--hec-leading-body)" }],
        "hec-small": ["var(--hec-text-small)", { lineHeight: "var(--hec-leading-small)" }],
        "hec-caption": ["var(--hec-text-caption)", { lineHeight: "var(--hec-leading-caption)" }],
      },
      boxShadow: {
        "hec-1": "var(--hec-shadow-1)",
        "hec-2": "var(--hec-shadow-2)",
        "hec-3": "var(--hec-shadow-3)",
      },
      minHeight: {
        "hec-target": "var(--hec-target)",
      },
      minWidth: {
        "hec-target": "var(--hec-target)",
      },
      transitionDuration: {
        "hec-1": "var(--hec-dur-1)",
        "hec-2": "var(--hec-dur-2)",
        "hec-3": "var(--hec-dur-3)",
      },
      transitionTimingFunction: {
        hec: "var(--hec-ease)",
        "hec-in-out": "var(--hec-ease-in-out)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      backdropSaturate: {
        120: "1.2",
        140: "1.4",
        160: "1.6",
        180: "1.8",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "hec-sm": "var(--hec-radius-sm)",
        "hec-md": "var(--hec-radius-md)",
        "hec-lg": "var(--hec-radius-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "spring-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.02)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "spring-out": {
          "0%": {
            transform: "scale(1)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
        },
        "bounce-subtle": {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-2px)",
          },
        },
        "float-gentle": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-4px)",
          },
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-1000px 0",
          },
          "100%": {
            backgroundPosition: "1000px 0",
          },
        },
        "slide-up-fade": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-bounce": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(0.95)",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 10px rgba(var(--primary), 0.3)",
          },
          "50%": {
            boxShadow: "0 0 20px rgba(var(--primary), 0.6)",
          },
        },
        "elastic": {
          "0%": {
            transform: "scale(1)",
          },
          "30%": {
            transform: "scale(1.05)",
          },
          "40%": {
            transform: "scale(0.98)",
          },
          "50%": {
            transform: "scale(1.02)",
          },
          "65%": {
            transform: "scale(0.99)",
          },
          "75%": {
            transform: "scale(1.01)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        "shake": {
          "0%, 100%": {
            transform: "translateX(0)",
          },
          "10%, 30%, 50%, 70%, 90%": {
            transform: "translateX(-4px)",
          },
          "20%, 40%, 60%, 80%": {
            transform: "translateX(4px)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spring-in": "spring-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "spring-out": "spring-out 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "bounce-subtle": "bounce-subtle 0.6s ease-in-out",
        "float-gentle": "float-gentle 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "slide-up-fade": "slide-up-fade 0.3s ease-out",
        "scale-bounce": "scale-bounce 0.15s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "elastic": "elastic 0.5s ease-out",
        "shake": "shake 0.4s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
