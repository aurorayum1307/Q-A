// =====================================================
// Firebase 초기화 파일
// =====================================================
// 설정값은 프로젝트 루트의 .env.local 파일에 입력하세요.
// (개발서버를 재시작해야 반영됩니다: npm run dev)
// =====================================================

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 중복 초기화 방지 (Next.js HMR 환경에서 여러 번 실행될 수 있음)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore 데이터베이스 객체 내보내기
export const db = getFirestore(app);
