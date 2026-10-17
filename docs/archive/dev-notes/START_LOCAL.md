# 🚀 로컬 실행 가이드 (간단 버전)

## ✅ 설정 확인 완료!

환경 설정 진단 결과:
- ✅ 모든 필수 파일 존재
- ✅ 백엔드 포트: 4000
- ✅ 프론트엔드 API/Socket URL: http://localhost:4000
- ✅ localStorage 안전 wrapper 적용
- ✅ Socket 연결 설정 개선

## 🎯 3단계로 시작하기

### 1️⃣ 백엔드 실행

```bash
cd backend
npm run dev
```

**성공 메시지**:
```
🚀 Server running on port 4000
📡 WebSocket ready
🤖 AI Scheduler started
🌐 Environment: development
```

### 2️⃣ 프론트엔드 실행

**새 터미널 열기** 후:

```bash
cd frontend
npm run dev
```

**성공 메시지**:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### 3️⃣ 브라우저 접속

```
http://localhost:5173
```

**F12 (개발자 도구) 콘솔 확인**:
```
API_BASE: http://localhost:4000/api
SOCKET_URL: http://localhost:4000
Environment: development
✅ Connected to server: http://localhost:4000
```

## 🎮 게임 시작

1. **방 만들기** 클릭
2. 닉네임 입력
3. 슬롯에 플레이어/AI 추가
4. **게임 시작** 클릭
5. 즐기기! 🌙✨

## ❓ 문제가 있나요?

### 빠른 진단

```bash
node check-local-setup.js
```

### 상세 가이드

- 📘 `LOCAL_ISSUE_FIX_GUIDE.md` - 모든 이슈 해결 방법
- 🚀 `QUICK_START_UPDATED.md` - 상세 시작 가이드
- 📋 `LOCAL_FIX_SUMMARY.md` - 수정 내용 요약

### 자주 발생하는 문제

**Socket 연결 실패**:
- 백엔드가 4000 포트에서 실행 중인지 확인
- 프론트엔드 재시작 (Ctrl+C 후 `npm run dev`)

**API 호출 실패**:
- Network 탭에서 URL이 `http://localhost:4000/api/...`인지 확인
- 백엔드 콘솔에서 에러 확인

**포트 충돌**:
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

## 🎉 완료!

이제 로컬에서 게임을 플레이할 수 있습니다!

**배포 환경**도 동일하게 작동합니다:
- Vercel (프론트엔드)
- Render.com (백엔드)
- Supabase (데이터베이스)
