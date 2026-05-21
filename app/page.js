'use client'; // 클라이언트 컴포넌트 선언 (브라우저에서 실행)

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CURRENT_USER, formatDate } from '@/lib/utils';

export default function Home() {
  // ── 랜딩 페이지 vs Q&A 화면 전환
  const [showApp, setShowApp] = useState(false);

  // ── 상태 변수 (State)
  const [channels, setChannels]               = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [questions, setQuestions]             = useState([]);
  const [notices, setNotices]                 = useState([]);
  const [isAdmin, setIsAdmin]                 = useState(false);

  // 질문 작성 모달
  const [showAskModal, setShowAskModal]       = useState(false);
  const [askTitle, setAskTitle]               = useState('');
  const [askContent, setAskContent]           = useState('');

  // 질문 상세 모달
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailQuestion, setDetailQuestion]   = useState(null);
  const [answers, setAnswers]                 = useState([]);
  const [answerInput, setAnswerInput]         = useState('');

  // 채널 추가 모달
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelNameInput, setChannelNameInput] = useState('');

  // 공지 작성 모달
  const [showNoticeModal, setShowNoticeModal]       = useState(false);
  const [noticeTitleInput, setNoticeTitleInput]     = useState('');
  const [noticeContentInput, setNoticeContentInput] = useState('');

  // 실시간 리스너 해제 함수 보관
  const questionUnsub = useRef(null);
  const answerUnsub   = useRef(null);

  // =====================================================
  // 채널 실시간 구독 (앱 시작 시 1회)
  // =====================================================
  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setChannels(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // =====================================================
  // 공지 실시간 구독 (앱 시작 시 1회)
  // =====================================================
  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setNotices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // =====================================================
  // 채널 선택 시 질문 실시간 구독
  // =====================================================
  useEffect(() => {
    if (questionUnsub.current) { questionUnsub.current(); questionUnsub.current = null; }
    if (!selectedChannel) return;

    const q = query(
      collection(db, 'questions'),
      where('channelId', '==', selectedChannel.id),
      orderBy('createdAt', 'desc')
    );
    questionUnsub.current = onSnapshot(q, snapshot => {
      setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { if (questionUnsub.current) questionUnsub.current(); };
  }, [selectedChannel]);

  // =====================================================
  // 상세 모달 열릴 때 답변 실시간 구독
  // =====================================================
  useEffect(() => {
    if (answerUnsub.current) { answerUnsub.current(); answerUnsub.current = null; }
    if (!detailQuestion) return;

    const q = query(
      collection(db, 'answers'),
      where('questionId', '==', detailQuestion.id),
      orderBy('createdAt', 'asc')
    );
    answerUnsub.current = onSnapshot(q, snapshot => {
      setAnswers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { if (answerUnsub.current) answerUnsub.current(); };
  }, [detailQuestion]);

  // =====================================================
  // 채널 기능
  // =====================================================
  async function handleAddChannel() {
    if (!channelNameInput.trim()) { alert('채널 이름을 입력해 주세요.'); return; }
    await addDoc(collection(db, 'channels'), {
      name:      channelNameInput.trim(),
      createdBy: CURRENT_USER.id,
      createdAt: serverTimestamp(),
    });
    setChannelNameInput(''); setShowChannelModal(false);
  }

  async function handleDeleteChannel(channelId) {
    if (!confirm('채널을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'channels', channelId));
    if (selectedChannel?.id === channelId) setSelectedChannel(null);
  }

  // =====================================================
  // 질문 기능
  // =====================================================
  async function handleSubmitAsk() {
    if (!askTitle.trim())   { alert('제목을 입력해 주세요.'); return; }
    if (!askContent.trim()) { alert('내용을 입력해 주세요.'); return; }
    await addDoc(collection(db, 'questions'), {
      channelId:    selectedChannel.id,
      title:        askTitle.trim(),
      content:      askContent.trim(),
      authorId:     CURRENT_USER.id,
      authorName:   CURRENT_USER.name,
      bestAnswerId: null,
      createdAt:    serverTimestamp(),
    });
    setAskTitle(''); setAskContent(''); setShowAskModal(false);
  }

  function openDetail(question) {
    setDetailQuestion(question);
    setAnswerInput('');
    setShowDetailModal(true);
  }

  function closeDetail() {
    setShowDetailModal(false);
    setDetailQuestion(null);
    setAnswers([]);
  }

  // =====================================================
  // 답변 기능
  // =====================================================
  async function handleSubmitAnswer() {
    if (!answerInput.trim()) { alert('답변을 입력해 주세요.'); return; }
    await addDoc(collection(db, 'answers'), {
      questionId: detailQuestion.id,
      content:    answerInput.trim(),
      authorId:   CURRENT_USER.id,
      authorName: CURRENT_USER.name,
      createdAt:  serverTimestamp(),
    });
    setAnswerInput('');
  }

  async function handleSelectBest(answerId) {
    await updateDoc(doc(db, 'questions', detailQuestion.id), { bestAnswerId: answerId });
    setDetailQuestion(prev => ({ ...prev, bestAnswerId: answerId }));
  }

  // =====================================================
  // 공지 기능
  // =====================================================
  async function handleSubmitNotice() {
    if (!noticeTitleInput.trim())   { alert('제목을 입력해 주세요.'); return; }
    if (!noticeContentInput.trim()) { alert('내용을 입력해 주세요.'); return; }
    await addDoc(collection(db, 'notices'), {
      title:     noticeTitleInput.trim(),
      content:   noticeContentInput.trim(),
      authorId:  CURRENT_USER.id,
      createdAt: serverTimestamp(),
    });
    setNoticeTitleInput(''); setNoticeContentInput(''); setShowNoticeModal(false);
  }

  async function handleDeleteNotice(noticeId) {
    if (!confirm('공지를 삭제할까요?')) return;
    await deleteDoc(doc(db, 'notices', noticeId));
  }

  // =====================================================
  // 렌더링 준비
  // =====================================================
  const bestId = detailQuestion?.bestAnswerId;
  const sortedAnswers = bestId
    ? [...answers.filter(a => a.id === bestId), ...answers.filter(a => a.id !== bestId)]
    : answers;
  const isQuestionOwner = detailQuestion?.authorId === CURRENT_USER.id;

  // =====================================================
  // JSX 렌더링
  // =====================================================

  // ── 랜딩 페이지
  if (!showApp) {
    return (
      <div className="landing-page">
        <Image
          src="/학부모공개수업 이미지.png"
          alt="학부모 공개수업"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className="landing-overlay" />
        <div className="landing-card">
          <p className="landing-subtitle">수업관련 Q&amp;A</p>
          <h1 className="landing-title">함께 질문해요! 🙋</h1>
          <button className="btn-enter" onClick={() => setShowApp(true)}>
            입장하기 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-layout">

        {/* ① 왼쪽 사이드바 — 채널 목록 */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="app-brand">
              <span className="brand-icon">🏫</span>
              <span className="brand-name">학교 Q&amp;A</span>
            </div>
          </div>

          <div className="channel-section">
            <div className="section-label">
              <span>채널</span>
              {isAdmin && (
                <button className="btn-icon" onClick={() => { setChannelNameInput(''); setShowChannelModal(true); }}>＋</button>
              )}
            </div>
            <ul className="channel-list">
              {channels.length === 0 && <li className="list-empty">채널이 없습니다</li>}
              {channels.map(ch => (
                <li
                  key={ch.id}
                  className={`channel-item${selectedChannel?.id === ch.id ? ' active' : ''}`}
                  onClick={() => setSelectedChannel({ id: ch.id, name: ch.name })}
                >
                  <span className="channel-item-name">
                    <span className="ch-hash">#</span>
                    {ch.name}
                  </span>
                  {isAdmin && (
                    <button
                      className="channel-del-btn visible"
                      onClick={e => { e.stopPropagation(); handleDeleteChannel(ch.id); }}
                    >✕</button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">T</div>
              <div>
                <div className="user-name">{CURRENT_USER.name}</div>
                <div className="user-id">{CURRENT_USER.id}</div>
              </div>
            </div>
            <label className="admin-toggle">
              <span className="toggle-text">관리자 모드</span>
              <div className="toggle-switch">
                <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
                <span className="toggle-slider" />
              </div>
            </label>
          </div>
        </aside>

        {/* ② 가운데 — 질문 게시판 */}
        <main className="main-content">
          <div className="main-header">
            <div className="main-header-left">
              <span className="hash-symbol">#</span>
              <h1 className="channel-title">{selectedChannel?.name ?? '채널을 선택하세요'}</h1>
            </div>
            <button
              className="btn-primary"
              disabled={!selectedChannel}
              onClick={() => { setAskTitle(''); setAskContent(''); setShowAskModal(true); }}
            >
              ＋ 질문하기
            </button>
          </div>

          <div className="question-board">
            {!selectedChannel && (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>왼쪽에서 채널을 선택해 주세요</p>
              </div>
            )}
            {selectedChannel && questions.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🤔</div>
                <p>아직 질문이 없어요. 첫 번째로 질문해 보세요!</p>
              </div>
            )}
            {questions.map(q => (
              <div key={q.id} className="question-card" onClick={() => openDetail(q)}>
                <div className="card-title">{q.title}</div>
                <div className="card-meta">
                  <span className="card-author">👤 {q.authorName}</span>
                  <span className="meta-dot">·</span>
                  <span>{formatDate(q.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* ③ 오른쪽 사이드바 — 공지사항 */}
        <aside className="sidebar sidebar-right">
          <div className="sidebar-header">
            <h2 className="sidebar-title">📢 공지사항</h2>
            {isAdmin && (
              <button className="btn-icon" onClick={() => { setNoticeTitleInput(''); setNoticeContentInput(''); setShowNoticeModal(true); }}>＋</button>
            )}
          </div>
          <div className="notice-list">
            {notices.length === 0 && <div className="list-empty">공지사항이 없습니다</div>}
            {notices.map(n => (
              <div key={n.id} className="notice-item">
                {isAdmin && (
                  <button className="notice-del-btn" onClick={() => handleDeleteNotice(n.id)}>✕</button>
                )}
                <div className="notice-item-title">{n.title}</div>
                <div className="notice-item-content">{n.content}</div>
                <div className="notice-item-time">{formatDate(n.createdAt)}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ===== 모달 ① 질문 작성 ===== */}
      {showAskModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAskModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">✏️ 질문 작성</h3>
              <button className="btn-close" onClick={() => setShowAskModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">질문 제목</label>
                <input className="form-input" placeholder="어떤 내용이 궁금하신가요?" value={askTitle} onChange={e => setAskTitle(e.target.value)} maxLength={100} />
              </div>
              <div className="form-group">
                <label className="form-label">질문 내용</label>
                <textarea className="form-textarea" placeholder="궁금한 내용을 자세히 적어주세요" rows={5} value={askContent} onChange={e => setAskContent(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAskModal(false)}>취소</button>
              <button className="btn-primary" onClick={handleSubmitAsk}>질문 올리기</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 모달 ② 질문 상세 + 답변 ===== */}
      {showDetailModal && detailQuestion && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="modal modal-large">
            <div className="modal-header">
              <h3 className="modal-title">{detailQuestion.title}</h3>
              <button className="btn-close" onClick={closeDetail}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-meta">
                <span>👤 {detailQuestion.authorName}</span>
                <span>·</span>
                <span>{formatDate(detailQuestion.createdAt)}</span>
              </div>
              <div className="detail-content">{detailQuestion.content}</div>

              <div className="answers-section">
                <h4 className="answers-heading">
                  💬 답변 <span className="answer-count">{answers.length}</span>
                </h4>
                <div className="answer-list">
                  {answers.length === 0 && (
                    <div className="list-empty">아직 답변이 없어요. 첫 번째로 답변해 보세요!</div>
                  )}
                  {sortedAnswers.map(a => {
                    const isBest = a.id === bestId;
                    return (
                      <div key={a.id} className={`answer-item${isBest ? ' best' : ''}`}>
                        {isBest && <span className="best-badge">⭐ 최고 답변</span>}
                        <div className="answer-content">{a.content}</div>
                        <div className="answer-meta">
                          <span>👤 {a.authorName} · {formatDate(a.createdAt)}</span>
                          {isQuestionOwner && !isBest && (
                            <button className="btn-best" onClick={() => handleSelectBest(a.id)}>⭐ 채택하기</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <textarea className="form-textarea" placeholder="답변을 작성해 주세요..." rows={3} value={answerInput} onChange={e => setAnswerInput(e.target.value)} />
                  <div className="answer-form-footer">
                    <button className="btn-primary" onClick={handleSubmitAnswer}>답변하기</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 모달 ③ 채널 추가 ===== */}
      {showChannelModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowChannelModal(false); }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3 className="modal-title">📂 채널 추가</h3>
              <button className="btn-close" onClick={() => setShowChannelModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">채널 이름</label>
                <input className="form-input" placeholder="예: 1학년-1반" value={channelNameInput} onChange={e => setChannelNameInput(e.target.value)} maxLength={30} onKeyDown={e => e.key === 'Enter' && handleAddChannel()} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowChannelModal(false)}>취소</button>
              <button className="btn-primary" onClick={handleAddChannel}>추가하기</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 모달 ④ 공지 작성 ===== */}
      {showNoticeModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNoticeModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">📢 공지 작성</h3>
              <button className="btn-close" onClick={() => setShowNoticeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">공지 제목</label>
                <input className="form-input" placeholder="공지 제목을 입력하세요" value={noticeTitleInput} onChange={e => setNoticeTitleInput(e.target.value)} maxLength={100} />
              </div>
              <div className="form-group">
                <label className="form-label">공지 내용</label>
                <textarea className="form-textarea" placeholder="공지 내용을 입력하세요" rows={4} value={noticeContentInput} onChange={e => setNoticeContentInput(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNoticeModal(false)}>취소</button>
              <button className="btn-primary" onClick={handleSubmitNotice}>작성하기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
