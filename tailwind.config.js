/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme colors matching the desktop app
        dark: {
          bg: '#2e2e2e',
          fg: '#ffffff',
          'frame-bg': '#3d3d3d',
          'button-bg': '#555555',
          'entry-bg': '#4d4d4d',
          'label-fg': '#cccccc',
          highlight: '#4d94ff',
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#f44336'
        },
        cyberpunk: {
          bg: '#0d1117',
          fg: '#c9d1d9',
          'frame-bg': '#161b22',
          'button-bg': '#21262d',
          'entry-bg': '#0d1117',
          'label-fg': '#58a6ff',
          highlight: '#1f6feb',
          success: '#3fb950',
          warning: '#d29922',
          error: '#f85149'
        },
        dracula: {
          bg: '#282a36',
          fg: '#f8f8f2',
          'frame-bg': '#44475a',
          'button-bg': '#6272a4',
          'entry-bg': '#44475a',
          'label-fg': '#50fa7b',
          highlight: '#8be9fd',
          success: '#50fa7b',
          warning: '#ffb86c',
          error: '#ff5555'
        }
      },
      fontFamily: {
        'segoe': ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'bounce-gentle': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
