# 🚀 배포 가이드 - 한눈에 보기

## 📌 배포 순서

```
1. Supabase 설정 (5분)
   ↓
2. GitHub 푸시 (2분)
   ↓
3. Render.com 배포 (10분)
   ↓
4. Vercel 배포 (5분)
   ↓
5. 환경 변수 업데이트 (2분)
   ↓
6. 테스트 (5분)
```

**총 소요 시간: 약 30분**

---

## 🔑 필요한 환경 변수

### Render.com (백엔드) - 5개
```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=[Supabase에서 복사]
FRONTEND_URL=[Vercel URL]
CLIENT_URL=[Vercel URL]
```

### Vercel (프론트엔드) - 2개
```bash
VITE_API_URL=[Render URL]
VITE_SOCKET_URL=[Render URL]
```

---

## 📍 환경 변수 값 찾는 곳

### 1. DATABASE_URL
```
Supabase 대시보드
→ Settings (⚙️)
→ Database
→ Connection string
→ URI 탭
→ 복사
```

### 2. Render URL
```
Render.com 배포 완료 후
→ 상단에 표시됨
→ 예: https://boardgame-backend-xxxx.onrender.com
```

### 3. Vercel URL
```
Vercel 배포 완료 후
→ 표시됨
→ 예: https://your-project-xxxx.vercel.app
```

### 4. FRONTEND_URL & CLIENT_URL
```
둘 다 Vercel URL과 동일!
→ https://your-project-xxxx.vercel.app
```

---

## ✅ 간단 체크리스트

### Supabase
- [ ] DATABASE_URL 복사 완료
- [ ] migration_v4.1.sql 실행 완료
- [ ] seedCards_FULL.sql 실행 완료

### GitHub
- [ ] 코드 푸시 완료
  ```bash
  git add .
  git commit -m "Deploy"
  git push origin main
  ```

### Render.com
- [ ] Web Service 생성
- [ ] 환경 변수 5개 입력
- [ ] 빌드 성공 확인
- [ ] Render URL 저장

### Vercel
- [ ] Project 생성
- [ ] 환경 변수 2개 입력
- [ ] 빌드 성공 확인
- [ ] Vercel URL 저장

### 업데이트
- [ ] Render.com FRONTEND_URL 업데이트
- [ ] Render.com CLIENT_URL 업데이트
- [ ] 재배포 완료

### 테스트
- [ ] 프론트엔드 접속 성공
- [ ] 방 생성 성공
- [ ] AI 봇 추가 성공
- [ ] 게임 플레이 성공

---

## 📚 상세 가이드

- **초간단 가이드**: `SUPER_EASY_DEPLOY.md` ⭐ 추천!
- **빠른 가이드**: `QUICK_DEPLOY.md`
- **상세 가이드**: `DEPLOYMENT_GUIDE_FINAL.md`
- **체크리스트**: `DEPLOYMENT_CHECKLIST.md`

---

## 🆘 문제 해결

### CORS 에러
```
Render.com 환경 변수 확인
→ FRONTEND_URL이 정확한 Vercel URL인지 확인
```

### WebSocket 연결 실패
```
Vercel 환경 변수 확인
→ VITE_SOCKET_URL이 정확한 Render URL인지 확인
```

### 데이터베이스 연결 실패
```
DATABASE_URL 확인
→ 비밀번호가 정확한지 확인
→ Supabase 프로젝트가 활성 상태인지 확인
```

---

## 💰 비용

```
Supabase: 무료
Render.com: 무료 (슬립 모드 있음)
Vercel: 무료

총 비용: $0/월
```

---

## 🎉 배포 완료 후

**최종 URL:**
- 프론트엔드: https://your-project.vercel.app
- 백엔드: https://boardgame-backend.onrender.com

**게임을 즐기세요!** 🎮✨

---

## 📞 도움말

문제가 있으면:
1. `SUPER_EASY_DEPLOY.md` 다시 읽기
2. Render.com Logs 확인
3. Vercel Logs 확인
4. 브라우저 콘솔(F12) 확인
