/**
 * PhyChi - Configuration Tailwind partagée
 * Chargée après le CDN Tailwind sur chaque page.
 */
tailwind.config = {
    darkMode: ['class', '.dark-theme'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
                display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
                    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
                    800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
                },
                flask: {
                    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
                    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
                    800: '#065f46', 900: '#064e3b',
                },
            },
            boxShadow: {
                soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -2px rgb(15 23 42 / 0.06)',
                lift: '0 12px 32px -8px rgb(15 23 42 / 0.14), 0 4px 10px -4px rgb(15 23 42 / 0.06)',
                glow: '0 18px 40px -12px rgb(37 99 235 / 0.45)',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(14px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                float: 'float 6s ease-in-out infinite',
                'fade-up': 'fade-up .7s cubic-bezier(.16,1,.3,1) both',
            },
        },
    },
};
