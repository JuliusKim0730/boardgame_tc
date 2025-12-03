#!/usr/bin/env node

/**
 * 로컬 환경 설정 진단 스크립트
 * 
 * 사용법:
 *   node check-local-setup.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 로컬 환경 설정 진단 시작...\n');

let hasErrors = false;
let hasWarnings = false;

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
  hasErrors = true;
}

function warning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
  hasWarnings = true;
}

function info(msg) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

// 1. 파일 존재 확인
console.log('📁 파일 구조 확인...');

const requiredFiles = [
  'backend/.env',
  'backend/package.json',
  'frontend/.env.development',
  'frontend/package.json',
  'frontend/src/services/socket.ts',
  'frontend/src/services/api.ts',
  'frontend/src/utils/storage.ts',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success(`${file} 존재`);
  } else {
    error(`${file} 없음`);
  }
});

console.log('');

// 2. 백엔드 환경 변수 확인
console.log('🔧 백엔드 환경 변수 확인...');

if (fs.existsSync('backend/.env')) {
  const backendEnv = fs.readFileSync('backend/.env', 'utf8');
  
  // PORT 확인
  const portMatch = backendEnv.match(/PORT=(\d+)/);
  if (portMatch) {
    const port = portMatch[1];
    if (port === '4000') {
      success(`백엔드 포트: ${port}`);
    } else {
      warning(`백엔드 포트가 ${port}입니다. 4000을 권장합니다.`);
    }
  } else {
    error('PORT 설정이 없습니다');
  }
  
  // DB 설정 확인
  if (backendEnv.includes('DB_HOST')) {
    success('DB_HOST 설정됨');
  } else {
    error('DB_HOST 설정 필요');
  }
  
  if (backendEnv.includes('DB_PASSWORD')) {
    success('DB_PASSWORD 설정됨');
  } else {
    error('DB_PASSWORD 설정 필요');
  }
} else {
  error('backend/.env 파일이 없습니다');
}

console.log('');

// 3. 프론트엔드 환경 변수 확인
console.log('🎨 프론트엔드 환경 변수 확인...');

if (fs.existsSync('frontend/.env.development')) {
  const frontendEnv = fs.readFileSync('frontend/.env.development', 'utf8');
  
  // API URL 확인
  const apiUrlMatch = frontendEnv.match(/VITE_API_URL=(.+)/);
  if (apiUrlMatch) {
    const apiUrl = apiUrlMatch[1].trim();
    if (apiUrl === 'http://localhost:4000') {
      success(`API URL: ${apiUrl}`);
    } else if (apiUrl === 'http://localhost:3000') {
      error(`API URL이 ${apiUrl}입니다. http://localhost:4000으로 변경 필요!`);
    } else {
      warning(`API URL: ${apiUrl}`);
    }
  } else {
    error('VITE_API_URL 설정이 없습니다');
  }
  
  // Socket URL 확인
  const socketUrlMatch = frontendEnv.match(/VITE_SOCKET_URL=(.+)/);
  if (socketUrlMatch) {
    const socketUrl = socketUrlMatch[1].trim();
    if (socketUrl === 'http://localhost:4000') {
      success(`Socket URL: ${socketUrl}`);
    } else if (socketUrl === 'http://localhost:3000') {
      error(`Socket URL이 ${socketUrl}입니다. http://localhost:4000으로 변경 필요!`);
    } else {
      warning(`Socket URL: ${socketUrl}`);
    }
  } else {
    error('VITE_SOCKET_URL 설정이 없습니다');
  }
} else {
  error('frontend/.env.development 파일이 없습니다');
}

console.log('');

// 4. 백엔드 서버 확인
console.log('🚀 백엔드 서버 확인...');

const checkServer = new Promise((resolve) => {
  const req = http.get('http://localhost:4000/api/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          success(`백엔드 서버 실행 중 (v${json.version || 'unknown'})`);
        } catch (e) {
          success('백엔드 서버 실행 중');
        }
      } else {
        warning(`백엔드 서버 응답: ${res.statusCode}`);
      }
      resolve();
    });
  });
  
  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      warning('백엔드 서버가 실행되지 않았습니다. `cd backend && npm run dev` 실행 필요');
    } else {
      warning(`백엔드 서버 확인 실패: ${err.message}`);
    }
    resolve();
  });
  
  req.setTimeout(3000, () => {
    warning('백엔드 서버 응답 시간 초과');
    req.destroy();
    resolve();
  });
});

// 5. 포트 사용 확인 (Windows)
console.log('');
console.log('🔌 포트 사용 확인...');

if (process.platform === 'win32') {
  const { execSync } = require('child_process');
  
  try {
    const netstat = execSync('netstat -ano', { encoding: 'utf8' });
    
    // 4000 포트 확인
    if (netstat.includes(':4000')) {
      success('4000 포트 사용 중 (백엔드)');
    } else {
      warning('4000 포트가 사용되지 않습니다. 백엔드 실행 필요');
    }
    
    // 5173 포트 확인 (Vite 기본)
    if (netstat.includes(':5173')) {
      success('5173 포트 사용 중 (프론트엔드)');
    } else {
      warning('5173 포트가 사용되지 않습니다. 프론트엔드 실행 필요');
    }
  } catch (e) {
    info('포트 확인 실패 (권한 필요)');
  }
} else {
  info('포트 확인은 Windows에서만 지원됩니다');
}

// 결과 대기
checkServer.then(() => {
  console.log('');
  console.log('═'.repeat(60));
  
  if (hasErrors) {
    console.log(`${colors.red}❌ 오류가 발견되었습니다. 위의 내용을 확인하세요.${colors.reset}`);
    console.log(`${colors.blue}ℹ️  자세한 내용은 LOCAL_ISSUE_FIX_GUIDE.md를 참고하세요.${colors.reset}`);
  } else if (hasWarnings) {
    console.log(`${colors.yellow}⚠️  경고가 있습니다. 위의 내용을 확인하세요.${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ 모든 설정이 정상입니다!${colors.reset}`);
  }
  
  console.log('');
  console.log('📚 다음 단계:');
  console.log('  1. 백엔드: cd backend && npm run dev');
  console.log('  2. 프론트엔드: cd frontend && npm run dev');
  console.log('  3. 브라우저: http://localhost:5173');
  console.log('');
});
