# 🔴 Supabase 연결 문제 해결 - IPv6 이슈

## 🎯 문제 원인

**발견된 문제:**
- Supabase 호스트 `db.xskaefoqkbwnhrpyptkl.supabase.co`가 **IPv6 주소만** 제공
- IPv6 주소: `2406:da1c:f42:ae0b:f225:8089:a84a:36e6`
- 현재 네트워크 환경에서 IPv6 연결 불가 (`ENETUNREACH`)

## ✅ 해결 방법

### 방법 1: Connection Pooler 사용 (권장) ⭐

Supabase Connection Pooler는 IPv4 주소를 제공합니다.

#### 단계:
1. **Supabase 대시보드** 접속
2. **Settings → Database** 클릭
3. **Connection Pooler** 섹션 찾기
4. 다음 정보 확인:

```
Host: aws-0-ap-northeast-2.pooler.supabase.com (또는 다른 지역)
Port: 6543
Database: postgres
User: postgres
```

#### .env 파일 업데이트:
```env
PORT=4000

# Supabase Connection Pooler
DB_HOST=aws-0-ap-northeast-2.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=9orkL1p59FjOnZQd

CLIENT_URL=http://localhost:3000
```

---

### 방법 2: IPv6 활성화

Windows에서 IPv6를 활성화하고 라우팅 설정:

```powershell
# IPv6 상태 확인
netsh interface ipv6 show interface

# IPv6 활성화 (관리자 권한 필요)
netsh interface ipv6 set interface "이더넷" forwarding=enabled
```

**주의:** 이 방법은 네트워크 환경에 따라 작동하지 않을 수 있습니다.

---

### 방법 3: Supabase 프로젝트 재생성

새 Supabase 프로젝트를 다른 지역(IPv4 지원)에 생성:
- 싱가포르 (ap-southeast-1)
- 미국 동부 (us-east-1)

---

## 🔍 Connection Pooler 정보 찾기

### Supabase 대시보드에서:

1. 프로젝트 선택
2. **Settings** (왼쪽 하단)
3. **Database** 클릭
4. 페이지를 아래로 스크롤
5. **Connection Pooler** 섹션 찾기

### 예시:
```
Connection pooler

Mode: Transaction
Host: aws-0-ap-northeast-2.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres
```

---

## 📸 스크린샷 위치

Supabase 대시보드에서 확인:
- **Settings → Database**
- **Connection string** (상단)
- **Connection pooler** (중간)

---

## 🧪 테스트 방법

Connection Pooler 정보를 `.env`에 입력 후:

```bash
cd backend
node test-db-connection.js
```

**성공 메시지:**
```
✅ 데이터베이스 연결 성공!
⏰ 서버 시간: ...
📋 테이블 목록: ...
```

---

## 💡 다음 단계

1. **Supabase 대시보드**에서 **Connection Pooler** 정보 확인
2. 정보를 알려주시면 `.env` 파일 업데이트 도와드리겠습니다
3. 연결 테스트 후 서버 실행

---

## 🆘 Connection Pooler가 없다면?

Supabase 무료 플랜에서도 Connection Pooler를 제공합니다. 
만약 보이지 않는다면:

1. 프로젝트 설정 확인
2. 다른 지역의 새 프로젝트 생성 고려
3. Supabase 지원팀 문의

---

**현재 상태:** IPv6 연결 불가로 인한 연결 실패
**해결책:** Connection Pooler 사용 (IPv4 지원)
