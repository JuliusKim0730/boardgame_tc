# 🔧 프론트엔드 문제 해결

## ❌ 현재 에러

```
The CJS build of Vite's Node API is deprecated.
triggerUncaughtException(err, true /* fromPromise */);
```

---

## ✅ 해결 방법

### 1단계: 패키지 재설치

```bash
cd frontend

# node_modules 삭제
rm -rf node_modules
# Windows PowerShell
Remove-Item -Recurse -Force node_modules

# package-lock.json 삭제
rm package-lock.json
# Windows PowerShell
Remove-Item package-lock.json

# 재설치
npm install
```

### 2단계: 실행

```bash
npm run dev
```

---

## 🔍 다른 해결 방법

### 방법 1: Vite 버전 다운그레이드

`frontend/package.json` 수정:
```json
{
  "devDependencies": {
    "vite": "^5.0.8"
  }
}
```

### 방법 2: Node.js 버전 확인

```bash
node --version
# 20.x 이상 권장
```

Node.js가 오래된 버전이면 업데이트:
- https://nodejs.org/

### 방법 3: 캐시 삭제

```bash
# npm 캐시 삭제
npm cache clean --force

# 재설치
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 🌐 브라우저 확인

서버가 시작되면:

1. **http://localhost:3000** 접속
2. **F12** 눌러서 개발자 도구 열기
3. **Console** 탭에서 에러 확인

### 일반적인 브라우저 에러

#### "Failed to fetch"
**원인**: 백엔드가 실행되지 않음

**해결**:
```bash
# 새 터미널에서
cd backend
npm run dev
```

#### "CORS error"
**원인**: CORS 설정 문제

**해결**: `backend/src/server.ts` 확인
```typescript
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

#### "Cannot read properties of undefined"
**원인**: API 응답 구조 문제

**해결**: 백엔드 로그 확인

---

## 🐛 디버깅 단계

### 1. 백엔드 먼저 확인

```bash
cd backend
npm run dev
```

**확인**:
```bash
curl http://localhost:4000/health
# 응답: {"status":"ok"}
```

### 2. 프론트엔드 로그 확인

터미널에서 전체 에러 메시지 확인

### 3. 브라우저 콘솔 확인

F12 → Console 탭

### 4. 네트워크 탭 확인

F12 → Network 탭 → API 요청 확인

---

## 💡 임시 해결책

### 경고 무시하고 진행

Vite CJS 경고는 무시해도 됩니다. 브라우저에서 정상 작동하면 OK!

```
The CJS build of Vite's Node API is deprecated.
```
→ 이것은 경고일 뿐, 실제 에러는 아닙니다.

### 실제 에러 확인

터미널에서 `triggerUncaughtException` 이후의 메시지를 확인하세요.

---

## 🔄 완전 초기화

모든 방법이 실패하면:

```bash
cd frontend

# 1. 모두 삭제
rm -rf node_modules package-lock.json

# 2. package.json 확인
# "type": "module" 있는지 확인

# 3. 재설치
npm install

# 4. 실행
npm run dev
```

---

## ✅ 정상 작동 확인

### 터미널 출력
```
VITE v5.4.21  ready in 367 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 브라우저
- http://localhost:3000 접속
- 로비 화면 표시
- 콘솔 에러 없음

---

## 📞 여전히 문제가 있나요?

1. **전체 에러 메시지 복사**
   - 터미널의 전체 출력
   - 브라우저 콘솔의 에러

2. **환경 정보**
   ```bash
   node --version
   npm --version
   ```

3. **파일 확인**
   - `frontend/package.json`
   - `frontend/vite.config.ts`
   - `frontend/tsconfig.json`

---

## 🎯 빠른 체크리스트

- [ ] Node.js 20 이상 설치됨
- [ ] `npm install` 완료
- [ ] 백엔드 실행 중 (http://localhost:4000/health 확인)
- [ ] 프론트엔드 실행 중 (http://localhost:3000)
- [ ] 브라우저 콘솔 에러 없음
- [ ] 로비 화면 표시됨

모두 체크되면 정상입니다! 🎉
