/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // paper / ink 走 CSS 变量：浅色为暖纸色，深色自动翻转（见 index.css）
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        // 朱砂：阅迹的主强调色（印章/书签的红）
        cinnabar: { 50: '#fbf1ec', 100: '#f6ddd2', 300: '#e09a7f', 500: '#c2502e', 600: '#a83e21', 700: '#8c331b' },
        // 靛青：电影的辅助色
        indigo2: { 100: '#dde4f2', 500: '#44639e', 600: '#37538a' },
        // 松绿：电视剧的辅助色
        pine: { 100: '#d9ebe2', 500: '#2f7d64', 600: '#276851' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"PingFang SC"', '"Hiragino Sans GB"', '"Noto Sans CJK SC"', '"Microsoft YaHei"', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
