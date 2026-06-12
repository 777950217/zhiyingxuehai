import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '.dark'],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'PingFang SC',
          'Microsoft YaHei',
          'Hiragino Sans GB',
          'Noto Sans SC',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['SF Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: '13px',
        sm: '15px',
        base: '17px',
        lg: '20px',
        xl: '24px',
        '2xl': '30px',
        '3xl': '36px',
        '4xl': '44px',
      },
      colors: {
        brand: {
          deep: '#0F2A4A',
          base: '#2A5FA8',
          mid: '#4A7FC2',
          light: '#7AB0E0',
          surface: '#E8F0F8',
        },
        accent: {
          base: '#D4A574',
          deep: '#B8864D',
          light: '#E6C4A0',
          surface: '#FAF5ED',
        },
        neutral: {
          50: '#F4F6F8',
          100: '#E8ECEF',
          200: '#D1D9E0',
          300: '#AAB8C5',
          400: '#7D8FA3',
          500: '#5A6B7D',
          600: '#414F5F',
          800: '#1A2533',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      spacing: {
        4: '4px',
        8: '8px',
        12: '12px',
        16: '16px',
        20: '20px',
        24: '24px',
        32: '32px',
        40: '40px',
        48: '48px',
        64: '64px',
        80: '80px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.04)',
        md: '0 2px 8px rgba(0,0,0,0.06)',
        lg: '0 4px 16px rgba(0,0,0,0.08)',
        xl: '0 8px 32px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
