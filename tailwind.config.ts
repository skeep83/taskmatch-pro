import type { Config } from "tailwindcss";

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
			padding: {
				DEFAULT: '1rem',
				sm: '1.5rem',
				lg: '2rem'
			},
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '375px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
			// Touch device queries
			'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
			'mouse': { 'raw': '(hover: hover) and (pointer: fine)' },
			// Safe area queries  
			'safe': { 'raw': '(display-mode: standalone)' }
		},
				extend: {
				fontFamily: {
					sans: ['Inter', '-apple-system','BlinkMacSystemFont','SF Pro Text','SF Pro Display','system-ui','Segoe UI','Roboto','Helvetica Neue','Arial','Noto Sans','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','sans-serif'],
					display: ['Playfair Display', 'SF Pro Display','-apple-system','BlinkMacSystemFont','SF Pro Text','system-ui','Helvetica Neue','Arial','sans-serif']
				},
				colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--accent))',
					'accent-foreground': 'hsl(var(--accent-foreground))',
					success: 'hsl(var(--success))',
					'success-foreground': 'hsl(var(--success-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'touch': '12px', // Оптимальный радиус для touch интерфейсов
				'mobile': '16px'
			},
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
				'touch': '44px', // Минимальный размер touch target
				'thumb': '72px'  // Удобная зона для большого пальца
			},
			minHeight: {
				'touch': '44px',
				'screen-mobile': '100dvh' // Dynamic viewport height
			},
			maxWidth: {
				'mobile': '480px'
			},
			keyframes: {
				'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
				'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
				'fade-in': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
				'fade-out': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(6px)' } },
				'scale-in': { '0%': { transform: 'scale(0.98)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
				'scale-out': { from: { transform: 'scale(1)', opacity: '1' }, to: { transform: 'scale(0.98)', opacity: '0' } },
				'slide-in-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
				'slide-out-right': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(100%)' } },
				'float': { '0%': { transform: 'translateY(0) scale(1)' }, '50%': { transform: 'translateY(-3px) scale(1)' }, '100%': { transform: 'translateY(0) scale(1)' } },
				'glow': { '0%': { filter: 'drop-shadow(0 0 0 hsl(var(--primary)/0))' }, '50%': { filter: 'drop-shadow(0 0 8px hsl(var(--primary)/0.25))' }, '100%': { filter: 'drop-shadow(0 0 0 hsl(var(--primary)/0))' } },
				'shimmer': { '0%': { transform: 'translateX(-100%) rotate(12deg)' }, '100%': { transform: 'translateX(200%) rotate(12deg)' } },
				'pulse-glow': { '0%, 100%': { boxShadow: '0 0 15px hsl(var(--primary)/0.2)' }, '50%': { boxShadow: '0 0 25px hsl(var(--primary)/0.4), 0 0 35px hsl(var(--accent)/0.2)' } },
				'bounce-gentle': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2px)' } },
				'rotate-slow': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
				'gradient-shift': { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
				'progress-fill': { '0%': { width: '0%' }, '100%': { width: 'var(--progress-width)' } }
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'fade-out': 'fade-out 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19)',
				'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'scale-out': 'scale-out 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'slide-out-right': 'slide-out-right 0.3s cubic-bezier(0.55, 0.06, 0.68, 0.19)',
				'enter': 'fade-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'exit': 'fade-out 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19), scale-out 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				// Hover-only animations (no infinite by default)
				'float-slow': 'float 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'glow-soft': 'glow 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'shimmer': 'shimmer 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'pulse-glow': 'pulse-glow 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'bounce-gentle': 'bounce-gentle 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'rotate-slow': 'rotate-slow 25s linear',
				'gradient-shift': 'gradient-shift 8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				// Infinite versions for special cases
				'float-infinite': 'float 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
				'glow-infinite': 'glow 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
				'pulse-infinite': 'pulse-glow 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
				'progress-fill': 'progress-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
