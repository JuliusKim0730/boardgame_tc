# ✅ Vercel 배포 최종 체크리스트

## 📋 배포 전 준비

### 코드 준비
- [x] `vercel.json` 생성 완료
- [x] `.vercelignore` 생성 완료
- [x] 루트 `package.json` 생성 완료
- [x] `.env.example` 생성 완료
- [x] `.gitignore` 업데이트 완료
- [x] Backend 서버 Vercel 호환 수정 완료
- [x] Frontend API/Socket 설정 수정 완료

### 환경 변수 준비
- [ ] `SUPABASE_URL` 확인
- [ ] `SUPABASE_ANON_KEY` 확인
- [ ] `DATABASE_URL` 확인
- [ ] Supabase 데이터베이스 마이그레이션 완료
- [ ] 카드 데이터 시드 완료

### Git 준비
- [ ] Git 저장소 초기화
- [ ] GitHub 저장소 생성
- [ ] 모든 변경사항 커밋
- [ ] GitHub에 푸시

---

## 🚀 배포 단계

### 방법 1: Vercel CLI (추천)

#### 1. CLI 설치 및 로그인
```bash
npm install -g vercel
vercel login
```

#### 2. 프로젝트 배포
```bash
# 테스트 배포
vercel

# 환경 변수 설정
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY  
vercel env add DATABASE_URL

# 프로덕션 배포
vercel --prod
```

#### 3. 배포 확인
- [ ] 배포 URL 확인
- [ ] Health check 테스트
- [ ] 프론트엔드 접속 확인

---

### 방법 2: Vercel Dashboard

#### 1. 프로젝트 생성
- [ ] [vercel.com/new](https://vercel.com/new) 접속
- [ ] GitHub 저장소 선택
- [ ] "Import" 클릭

#### 2. 빌드 설정
```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run vercel-build
Output Directory: frontend/dist
Install Command: npm run install:all
```

#### 3. 환경 변수 설정
Settings → Environment Variables:
- [ ] `SUPABASE_URL` 추가
- [ ] `SUPABASE_ANON_KEY` 추가
- [ ] `DATABASE_URL` 추가
- [ ] `NODE_ENV=production` 추가

#### 4. 배포 실행
- [ ] "Deploy" 버튼 클릭
- [ ] 빌드 로그 확인
- [ ] 배포 완료 대기

---

## 🧪 배포 후 테스트

### 기본 기능 테스트
- [ ] Health check: `https://your-project.vercel.app/api/health`
- [ ] 프론트엔드 접속
- [ ] 방 생성 가능
- [ ] 방 참여 가능
- [ ] 게임 시작 가능

### v4.1 기능 테스트
- [ ] 초기 자금 3,000TC 확인
- [ ] 결심 토큰 표시 확인
- [ ] 여행 지원 카드 명칭 확인
- [ ] WebSocket 연결 확인

### 2인 게임 테스트
- [ ] 찬스 칸 선택 모달
- [ ] 집안일 첫 방문 보너스
- [ ] 비주류 특성 변환

---

## 📊 성능 확인

### Vercel Analytics
- [ ] Analytics 활성화
- [ ] 페이지 로드 시간 확인
- [ ] API 응답 시간 확인

### 로그 확인
```bash
vercel logs
```

- [ ] 에러 로그 없음
- [ ] 경고 없음
- [ ] 정상 작동 확인

---

## 🐛 문제 해결

### 빌드 실패 시
```bash
# 로컬 빌드 테스트
cd frontend
npm install
npm run build

# 에러 확인 및 수정
```

### API 연결 실패 시
1. 환경 변수 확인
2. CORS 설정 확인
3. Supabase 연결 확인

### WebSocket 실패 시
1. Socket.io 설정 확인
2. Transports 설정 확인
3. 브라우저 콘솔 확인

---

## 🌐 도메인 설정 (선택)

### 커스텀 도메인 추가
- [ ] 도메인 구매
- [ ] Vercel에 도메인 추가
- [ ] DNS 레코드 설정
- [ ] SSL 인증서 확인

---

## 📱 공유 및 홍보

### 배포 완료 후
- [ ] 배포 URL 저장
- [ ] 팀원들과 공유
- [ ] 테스트 플레이
- [ ] 피드백 수집

### 배포 URL
```
https://your-project.vercel.app
```

---

## 🔄 지속적 배포

### GitHub 연동 (자동 배포)
- [ ] GitHub 저장소 연동 확인
- [ ] main 브랜치 푸시 시 자동 배포
- [ ] Preview 배포 확인

### 배포 전략
```
main 브랜치 → 프로덕션 배포
develop 브랜치 → Preview 배포
feature/* 브랜치 → Preview 배포
```

---

## 📈 모니터링

### 일일 체크
- [ ] 서버 상태 확인
- [ ] 에러 로그 확인
- [ ] 사용자 피드백 확인

### 주간 체크
- [ ] 성능 메트릭 확인
- [ ] 사용량 확인 (무료 플랜 제한)
- [ ] 업데이트 계획

---

## 🎉 배포 완료!

### 완료 확인
- [ ] 모든 테스트 통과
- [ ] 문서 업데이트
- [ ] 팀 공지 완료
- [ ] 사용자 가이드 작성

### 다음 단계
1. 사용자 피드백 수집
2. 버그 수정
3. 기능 개선
4. v4.2 계획

---

## 📞 지원

### 문제 발생 시
1. Vercel 로그 확인
2. 브라우저 콘솔 확인
3. Supabase 로그 확인
4. GitHub Issues 생성

### 유용한 링크
- [Vercel 문서](https://vercel.com/docs)
- [Vercel CLI 문서](https://vercel.com/docs/cli)
- [Supabase 문서](https://supabase.com/docs)

---

**배포 완료 시간**: _____________
**배포자**: _____________
**배포 URL**: _____________

**축하합니다! 🎊**

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 1일  
**상태**: ✅ 준비 완료
