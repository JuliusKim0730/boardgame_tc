# 📤 GitHub 푸시 가이드

## 🎯 목표
로컬 프로젝트를 https://github.com/JuliusKim0730/boardgame_tc 에 푸시

---

## 📋 단계별 가이드

### 1단계: Git 초기화 확인
```bash
# 현재 디렉토리 확인
pwd

# Git 상태 확인
git status
```

**만약 "not a git repository" 에러가 나면:**
```bash
git init
```

---

### 2단계: 원격 저장소 설정
```bash
# 기존 원격 저장소 확인
git remote -v

# 원격 저장소 추가 (없다면)
git remote add origin https://github.com/JuliusKim0730/boardgame_tc.git

# 원격 저장소 변경 (이미 있다면)
git remote set-url origin https://github.com/JuliusKim0730/boardgame_tc.git
```

---

### 3단계: 파일 추가 및 커밋
```bash
# 모든 파일 추가
git add .

# 커밋 메시지 작성
git commit -m "v4.1 Release - Vercel deployment ready

- 초기 자금 3,000TC
- 여행 지원 카드 추가
- 2인 전용 규칙 구현
- 비주류 특성 변환 기능
- Vercel 배포 설정 완료"
```

---

### 4단계: 브랜치 확인 및 설정
```bash
# 현재 브랜치 확인
git branch

# main 브랜치로 변경 (필요시)
git branch -M main
```

---

### 5단계: GitHub에 푸시
```bash
# 첫 푸시 (저장소가 비어있다면)
git push -u origin main

# 일반 푸시
git push origin main

# 강제 푸시 (필요시 - 주의!)
git push -f origin main
```

---

## 🔐 인증 방법

### 방법 1: Personal Access Token (권장)

#### 1. GitHub에서 토큰 생성
1. GitHub 로그인
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. "Generate new token" 클릭
4. 권한 선택:
   - ✅ repo (전체)
   - ✅ workflow
5. "Generate token" 클릭
6. **토큰 복사** (다시 볼 수 없음!)

#### 2. 토큰으로 푸시
```bash
# 푸시 시 Username: GitHub 사용자명
# Password: 생성한 토큰 입력
git push origin main
```

#### 3. 토큰 저장 (선택)
```bash
# Windows
git config --global credential.helper wincred

# Mac
git config --global credential.helper osxkeychain

# Linux
git config --global credential.helper store
```

---

### 방법 2: SSH Key (고급)

#### 1. SSH 키 생성
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

#### 2. SSH 키 GitHub에 등록
```bash
# 공개 키 복사
cat ~/.ssh/id_ed25519.pub

# GitHub → Settings → SSH and GPG keys → New SSH key
# 복사한 키 붙여넣기
```

#### 3. SSH URL로 변경
```bash
git remote set-url origin git@github.com:JuliusKim0730/boardgame_tc.git
git push origin main
```

---

## 🐛 문제 해결

### 문제 1: "Permission denied"
**원인**: 인증 실패

**해결**:
1. Personal Access Token 재생성
2. 토큰 권한 확인 (repo 체크)
3. 토큰 정확히 입력

---

### 문제 2: "Repository not found"
**원인**: 저장소 URL 오류 또는 권한 없음

**해결**:
```bash
# URL 확인
git remote -v

# URL 수정
git remote set-url origin https://github.com/JuliusKim0730/boardgame_tc.git
```

---

### 문제 3: "Updates were rejected"
**원인**: 원격 저장소에 로컬에 없는 커밋이 있음

**해결**:
```bash
# 원격 변경사항 가져오기
git pull origin main --rebase

# 충돌 해결 후
git push origin main

# 또는 강제 푸시 (주의!)
git push -f origin main
```

---

### 문제 4: "Large files detected"
**원인**: 100MB 이상 파일

**해결**:
```bash
# 큰 파일 찾기
find . -type f -size +100M

# .gitignore에 추가
echo "large-file.zip" >> .gitignore

# 커밋에서 제거
git rm --cached large-file.zip
git commit --amend
```

---

## ✅ 푸시 확인

### 1. GitHub 웹사이트 확인
```
https://github.com/JuliusKim0730/boardgame_tc
```

### 2. 파일 확인
- [ ] frontend/ 폴더
- [ ] backend/ 폴더
- [ ] vercel.json
- [ ] package.json
- [ ] README_DEPLOYMENT.md

### 3. 커밋 확인
- [ ] 최신 커밋 메시지 확인
- [ ] 파일 개수 확인
- [ ] 브랜치 확인 (main)

---

## 🔄 이후 업데이트 푸시

### 일반적인 워크플로우
```bash
# 1. 변경사항 확인
git status

# 2. 파일 추가
git add .

# 3. 커밋
git commit -m "Update: 기능 설명"

# 4. 푸시
git push origin main
```

### 특정 파일만 푸시
```bash
git add frontend/src/App.tsx
git commit -m "Update: App.tsx 수정"
git push origin main
```

---

## 📊 Git 상태 확인

### 유용한 명령어
```bash
# 현재 상태
git status

# 커밋 히스토리
git log --oneline

# 원격 저장소 확인
git remote -v

# 브랜치 확인
git branch -a

# 변경사항 확인
git diff
```

---

## 🎯 다음 단계

### 푸시 완료 후
1. ✅ GitHub 저장소 확인
2. ✅ Vercel 연동
3. ✅ 자동 배포 확인

### Vercel 연동
```bash
# Vercel CLI로 배포
vercel

# 또는 Vercel Dashboard에서
# New Project → Import from GitHub
```

---

## 📝 체크리스트

### 푸시 전
- [ ] .gitignore 확인
- [ ] .env 파일 제외 확인
- [ ] node_modules 제외 확인
- [ ] 민감한 정보 제거 확인

### 푸시 중
- [ ] Git 초기화
- [ ] 원격 저장소 설정
- [ ] 파일 추가 및 커밋
- [ ] 브랜치 설정
- [ ] 푸시 실행

### 푸시 후
- [ ] GitHub에서 파일 확인
- [ ] 커밋 메시지 확인
- [ ] README 확인
- [ ] Vercel 연동 준비

---

## 🎉 완료!

축하합니다! GitHub에 성공적으로 푸시되었습니다!

**저장소 URL**: https://github.com/JuliusKim0730/boardgame_tc

**다음 단계**: Vercel 배포
- `QUICK_DEPLOY_VERCEL.md` 참조

---

**문서 버전**: 1.0  
**최종 수정**: 2024년 12월 1일
