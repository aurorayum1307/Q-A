import localFont from 'next/font/local';
import './globals.css';

export const metadata = {
  title: '부안해오름유치원 Q&A — 함께 배우는 공간',
  description: '학부모 공개수업 등에서 실시간으로 질문을 주고받는 익명/실명 하이브리드 질문 게시판입니다.',
};

// Noto Sans KR 폰트 (Google Fonts 대신 시스템 폰트 스택 사용)
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
