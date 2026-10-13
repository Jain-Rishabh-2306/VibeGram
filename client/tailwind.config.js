/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F172A',
        surface: '#1E293B',
        'surface-hover': '#273449',
        'surface-light': '#334155',
        primary: '#A855F7',
        'primary-dark': '#9333EA',
        'primary-light': '#C084FC',
        secondary: '#06B6D4',
        'secondary-dark': '#0891B2',
        accent: '#F43F5E',
        'accent-dark': '#E11D48',
        'text-primary': '#F1F5F9',
        'text-muted': '#94A3B8',
        'text-faint': '#64748B',
        border: '#1E293B',
        'border-light': '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #A855F7, #06B6D4)',
        'gradient-accent': 'linear-gradient(135deg, #F43F5E, #A855F7)',
        'gradient-dark': 'linear-gradient(180deg, #1E293B, #0F172A)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(168,85,247,0.15), transparent 70%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite linear',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(168,85,247,0.4)' }, '50%': { boxShadow: '0 0 20px 4px rgba(168,85,247,0.3)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(168,85,247,0.4)',
        'glow-secondary': '0 0 20px rgba(6,182,212,0.4)',
        'glow-accent': '0 0 20px rgba(244,63,94,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};

