/** @type {import('tailwindcss').Config} */
module.exports = {
  // 관리자 화면(app/(admin)/**)에서만 클래스를 스캔합니다.
  content: ["./app/(admin)/**/*.{ts,tsx}"],
  corePlugins: {
    // preflight(전역 리셋)을 끄지 않으면 손님/약국 포탈의 기존 CSS(globals.css)가 깨집니다.
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // docs/design-system-toss.md 색상 토큰
        toss: {
          bg: '#F2F4F6',
          surface: '#FFFFFF',
          text: '#191F28',
          sub: '#4E5968',
          faint: '#8B95A1',
          placeholder: '#B0B8C1',
          line: '#F2F4F6',
          blue: '#3182F6',
          blueDark: '#1B64DA',
          blueBg: '#E8F1FE',
          green: '#178050',
          greenBg: '#EAF6EF',
          yellow: '#B25E00',
          yellowBg: '#FEF4E4',
          red: '#D6173A',
          redBg: '#FDECEC',
        },
      },
      borderRadius: {
        card: '16px',
        control: '12px',
        badge: '8px',
      },
    },
  },
  plugins: [],
};
