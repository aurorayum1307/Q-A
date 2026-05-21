// 현재 로그인된 사용자 상수 (나중에 Firebase Auth로 교체)
export const CURRENT_USER = {
  id: 'user_01',
  name: '테스트 유저',
};

// 날짜를 "MM/DD HH:MM" 형식으로 변환
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

// HTML 이스케이프 — XSS(악성 스크립트 삽입) 방지
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
