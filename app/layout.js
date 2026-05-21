import localFont from 'next/font/local';
import './globals.css';

export const metadata = {
  title: '학교 Q&A — 함께 배우는 공간',
  description: '학생들이 서로 질문하고 답변하는 학교 커뮤니티 플랫폼입니다.',
};

// Noto Sans KR 폰트 (Google Fonts 대신 시스템 폰트 스택 사용)
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
