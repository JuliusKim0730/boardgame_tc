# 🚀 초간단 배포 가이드

## 📌 배포 순서 (따라만 하세요!)

---

## 1️⃣ Supabase 설정 (5분)

### 1-1. DATABASE_URL 가져오기

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 로그인

2. **프로젝트 선택**
   - 기존 프로젝트 클릭

3. **DATABASE_URL 복사**
   ```
   좌측 메뉴 → Settings (⚙️) → Database
   → Connection string 섹션
   → URI 탭 선택
   → 복사 버튼 클릭
   ```
   
   **복사된 값 예시:**
   ```
   postgresql://postgres.abcdefgh:비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
   ```

4. **비밀번호 입력**
   - `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체
   - 비밀번호를 잊었다면: Settings → Database → Reset Database Password

5. **마이그레이션 실행**
   ```
   좌측 메뉴 → SQL Editor
   → New Query
   → backend/src/db/migration_v4.1.sql 내용 복사 붙여넣기
   → Run 클릭
   
   → New Query
   → backend/src/db/seedCards_FULL.sql 내용 복사 붙여넣기
   → Run 클릭
   ```

✅ **완료! DATABASE_URL을 메모장에 저장하세요**

---

## 2️⃣ GitHub에 코드 푸시 (2분)

```bash
# 터미널에서 실행
git add .
git commit -m "Ready for deployment"
git push origin main
```

✅ **완료! GitHub에 코드가 올라갔습니다**

---

## 3️⃣ Render.com 백엔드 배포 (10분)

### 3-1. 서비스 생성

1. **Render.com 접속**
   - https://dashboard.render.com/
   - GitHub로 로그인

2. **New Web Service 생성**
   - 우측 상단 "New +" 클릭
   - "Web Service" 선택

3. **Repository 연결**
   - GitHub 계정 연결 (처음이면)
   - 프로젝트 Repository 선택
   - "Connect" 클릭

### 3-2. 서비스 설정

**다음 값들을 정확히 입력하세요:**

```
Name: boardgame-backend
Region: Singapore (또는 가까운 지역)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Instance Type: Free
```

### 3-3. 환경 변수 설정

**"Environment" 섹션에서 "Add Environment Variable" 클릭**

#### 변수 1: NODE_ENV
```
Key: NODE_ENV
Value: production
```

#### 변수 2: PORT
```
Key: PORT
Value: 10000
```

#### 변수 3: DATABASE_URL
```
Key: DATABASE_URL
Value: [1단계에서 복사한 Supabase URL]
```
**예시:**
```
postgresql://postgres.abcdefgh:실제비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

#### 변수 4: FRONTEND_URL (나중에 업데이트)
```
Key: FRONTEND_URL
Value: https://임시값.vercel.app
```
*나중에 Vercel URL로 바꿀 예정*

#### 변수 5: CLIENT_URL (나중에 업데이트)
```
Key: CLIENT_URL
Value: https://임시값.vercel.app
```
*나중에 Vercel URL로 바꿀 예정*

### 3-4. 배포 시작

- "Create Web Service" 클릭
- 빌드 진행 확인 (5-10분 소요)
- 빌드 완료 대기

### 3-5. URL 확인 및 저장

**배포 완료 후 상단에 URL이 표시됩니다:**
```
https://boardgame-backend-xxxx.onrender.com
```

✅ **이 URL을 메모장에 저장하세요! (Render URL)**

### 3-6. Health Check 확인

브라우저에서 접속:
```
https://[당신의-render-url].onrender.com/api/health
```

**다음과 같이 표시되면 성공:**
```json
{
  "status": "ok",
  "version": "4.1.0",
  "timestamp": "..."
}
```

✅ **완료! 백엔드 배포 성공**

---

## 4️⃣ Vercel 프론트엔드 배포 (5분)

### 4-1. 프로젝트 생성

1. **Vercel 접속**
   - https://vercel.com/dashboard
   - GitHub로 로그인

2. **New Project 생성**
   - "Add New..." 클릭
   - "Project" 선택

3. **Repository 선택**
   - GitHub Repository 선택
   - "Import" 클릭

### 4-2. 프로젝트 설정

**자동으로 감지되지만 확인하세요:**

```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4-3. 환경 변수 설정

**"Environment Variables" 섹션 펼치기**

#### 변수 1: VITE_API_URL
```
Key: VITE_API_URL
Value: [3단계에서 저장한 Render URL]
```
**예시:**
```
https://boardgame-backend-xxxx.onrender.com
```

#### 변수 2: VITE_SOCKET_URL
```
Key: VITE_SOCKET_URL
Value: [3단계에서 저장한 Render URL - 동일]
```
**예시:**
```
https://boardgame-backend-xxxx.onrender.com
```

**중요:** Production, Preview, Development 모두 체크!

### 4-4. 배포 시작

- "Deploy" 클릭
- 빌드 진행 확인 (2-3분 소요)
- 빌드 완료 대기

### 4-5. URL 확인 및 저장

**배포 완료 후 표시되는 URL:**
```
https://your-project-xxxx.vercel.app
```

✅ **이 URL을 메모장에 저장하세요! (Vercel URL)**

### 4-6. 프론트엔드 접속 확인

브라우저에서 Vercel URL 접속
- 로비 화면이 보이면 성공!

✅ **완료! 프론트엔드 배포 성공**

---

## 5️⃣ Render.com 환경 변수 업데이트 (2분)

### 5-1. Render.com 돌아가기

1. **Render.com Dashboard**
   - https://dashboard.render.com/
   - boardgame-backend 서비스 클릭

2. **Environment 탭 클릭**

3. **FRONTEND_URL 수정**
   - FRONTEND_URL 찾기
   - Edit 클릭
   - Value를 **4단계에서 저장한 Vercel URL**로 변경
   ```
   https://your-project-xxxx.vercel.app
   ```
   - Save 클릭

4. **CLIENT_URL 수정**
   - CLIENT_URL 찾기
   - Edit 클릭
   - Value를 **4단계에서 저장한 Vercel URL**로 변경 (동일)
   ```
   https://your-project-xxxx.vercel.app
   ```
   - Save 클릭

5. **자동 재배포 대기**
   - 환경 변수 변경 시 자동으로 재배포됨
   - 2-3분 대기

✅ **완료! 모든 배포 완료**

---

## 6️⃣ 최종 테스트 (5분)

### 6-1. 프론트엔드 접속
```
https://your-project-xxxx.vercel.app
```

### 6-2. 방 생성 테스트
1. 닉네임 입력
2. "방 만들기" 클릭
3. 방 번호 확인

### 6-3. AI 봇 추가 테스트
1. 슬롯 2번 클릭
2. ⚙️ 버튼 클릭
3. "🤖 AI 추가" 선택
4. AI 닉네임 생성 확인

### 6-4. 게임 시작 테스트
1. "게임 시작" 버튼 클릭
2. 게임 화면 로딩 확인
3. AI 자동 플레이 확인 (5초 후)

✅ **모든 테스트 통과 시 배포 성공!**

---

## 📋 환경 변수 요약

### Render.com (백엔드)
```
NODE_ENV=production
PORT=10000
DATABASE_URL=[Supabase에서 복사]
FRONTEND_URL=[Vercel URL]
CLIENT_URL=[Vercel URL]
```

### Vercel (프론트엔드)
```
VITE_API_URL=[Render URL]
VITE_SOCKET_URL=[Render URL]
```

---

## 🔍 환경 변수 값 찾는 방법

### DATABASE_URL
```
Supabase → Settings → Database → Connection string → URI
```

### Render URL
```
Render.com → 배포 완료 후 상단에 표시
예: https://boardgame-backend-xxxx.onrender.com
```

### Vercel URL
```
Vercel → 배포 완료 후 표시
예: https://your-project-xxxx.vercel.app
```

### FRONTEND_URL과 CLIENT_URL
```
둘 다 Vercel URL과 동일
예: https://your-project-xxxx.vercel.app
```

---

## ❓ 자주 묻는 질문

### Q1: FRONTEND_URL과 CLIENT_URL이 뭐가 다른가요?
**A:** 같은 값입니다! 둘 다 Vercel URL을 입력하면 됩니다.

### Q2: DATABASE_URL 비밀번호를 잊어버렸어요
**A:** Supabase → Settings → Database → Reset Database Password

### Q3: Render.com이 계속 빌드 중이에요
**A:** 첫 배포는 5-10분 걸립니다. Logs 탭에서 진행 상황 확인하세요.

### Q4: Vercel 빌드가 실패했어요
**A:** 
1. 환경 변수가 올바른지 확인
2. Render URL이 정확한지 확인
3. 재배포 시도

### Q5: 게임이 작동하지 않아요
**A:**
1. Render.com Health Check 확인
2. 브라우저 콘솔(F12) 에러 확인
3. Render.com Logs 확인

---

## 🎉 배포 완료!

**최종 URL:**
- 프론트엔드: https://your-project-xxxx.vercel.app
- 백엔드: https://boardgame-backend-xxxx.onrender.com

**이제 게임을 즐기세요!** 🎮✨

---

## 💡 팁

### Keep-Alive 설정 (선택사항)
Render.com 무료 플랜은 15분 비활성 시 슬립 모드로 전환됩니다.

**해결 방법:**
1. UptimeRobot 가입 (무료)
2. Monitor 추가
3. URL: `https://[당신의-render-url].onrender.com/api/health`
4. Interval: 5분

이렇게 하면 서버가 항상 깨어있습니다!

---

**문제가 있으면 Render.com과 Vercel의 Logs를 확인하세요!**
