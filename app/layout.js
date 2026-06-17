import "./globals.css";

export const metadata = {
  title: "팜들리 Pharmdly",
  description: "동네 약국 재고 확인부터 픽업까지",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
