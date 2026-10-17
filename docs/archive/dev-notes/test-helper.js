#!/usr/bin/env node

/**
 * 게임 테스트 헬퍼 스크립트
 * 
 * 사용법:
 *   node test-helper.js check        # 환경 확인
 *   node test-helper.js cards        # 카드 데이터 확인
 *   node test-helper.js db           # 데이터베이스 연결 확인
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execPromise(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
}

async function checkEnvironment() {
  log('\n🔍 환경 확인 중...', 'cyan');
  log('='.repeat(50), 'cyan');

  // Node.js 버전 확인
  try {
    const nodeVersion = await execPromise('node --version');
    log(`✅ Node.js: ${nodeVersion.trim()}`, 'green');
  } catch (error) {
    log('❌ Node.js가 설치되지 않았습니다', 'red');
  }

  // npm 버전 확인
  try {
    const npmVersion = await execPromise('npm --version');
    log(`✅ npm: ${npmVersion.trim()}`, 'green');
  } catch (error) {
    log('❌ npm이 설치되지 않았습니다', 'red');
  }

  // 백엔드 확인
  log('\n📦 백엔드 확인...', 'yellow');
  const backendPath = path.join(process.cwd(), 'backend');
  if (fs.existsSync(backendPath)) {
    log('✅ backend 폴더 존재', 'green');
    
    // package.json 확인
    const packageJsonPath = path.join(backendPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      log('✅ backend/package.json 존재', 'green');
      
      // node_modules 확인
      const nodeModulesPath = path.join(backendPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        log('✅ backend/node_modules 존재', 'green');
      } else {
        log('⚠️  backend/node_modules 없음 - npm install 필요', 'yellow');
      }
    } else {
      log('❌ backend/package.json 없음', 'red');
    }

    // .env 확인
    const envPath = path.join(backendPath, '.env');
    if (fs.existsSync(envPath)) {
      log('✅ backend/.env 존재', 'green');
    } else {
      log('⚠️  backend/.env 없음 - .env.example 복사 필요', 'yellow');
    }
  } else {
    log('❌ backend 폴더 없음', 'red');
  }

  // 프론트엔드 확인
  log('\n📦 프론트엔드 확인...', 'yellow');
  const frontendPath = path.join(process.cwd(), 'frontend');
  if (fs.existsSync(frontendPath)) {
    log('✅ frontend 폴더 존재', 'green');
    
    // package.json 확인
    const packageJsonPath = path.join(frontendPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      log('✅ frontend/package.json 존재', 'green');
      
      // node_modules 확인
      const nodeModulesPath = path.join(frontendPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        log('✅ frontend/node_modules 존재', 'green');
      } else {
        log('⚠️  frontend/node_modules 없음 - npm install 필요', 'yellow');
      }
    } else {
      log('❌ frontend/package.json 없음', 'red');
    }
  } else {
    log('❌ frontend 폴더 없음', 'red');
  }

  log('\n' + '='.repeat(50), 'cyan');
  log('환경 확인 완료!', 'cyan');
}

async function checkCards() {
  log('\n🎴 카드 데이터 확인 중...', 'cyan');
  log('='.repeat(50), 'cyan');

  const sqlPath = path.join(process.cwd(), 'backend', 'src', 'db', 'seedCards_FULL.sql');
  
  if (!fs.existsSync(sqlPath)) {
    log('❌ seedCards_FULL.sql 파일을 찾을 수 없습니다', 'red');
    return;
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // 카드 타입별 개수 확인
  const cardTypes = {
    travel: { name: '여행지 카드', expected: 10 },
    freeplan: { name: '무료 계획 카드', expected: 8 },
    plan: { name: '일반 계획 카드', expected: 40 },
    house: { name: '집안일 카드', expected: 13 },
    support: { name: '여행 지원 카드', expected: 16 },
    chance: { name: '찬스 카드', expected: 26 },
    joint: { name: '공동 계획 카드', expected: 10 }
  };

  let totalCards = 0;
  let allCorrect = true;

  for (const [type, info] of Object.entries(cardTypes)) {
    const regex = new RegExp(`\\('${type}'`, 'g');
    const matches = sqlContent.match(regex);
    const count = matches ? matches.length : 0;
    totalCards += count;

    if (count === info.expected) {
      log(`✅ ${info.name}: ${count}장 (예상: ${info.expected}장)`, 'green');
    } else {
      log(`❌ ${info.name}: ${count}장 (예상: ${info.expected}장)`, 'red');
      allCorrect = false;
    }
  }

  log('\n' + '-'.repeat(50));
  log(`총 카드 수: ${totalCards}장 (예상: 123장)`, totalCards === 123 ? 'green' : 'red');

  // 찬스 카드 코드 확인
  log('\n🎯 찬스 카드 상세 확인...', 'yellow');
  const chanceCards = [];
  const chanceRegex = /\('chance',\s*'(CH\d+)',\s*'([^']+)'/g;
  let match;
  while ((match = chanceRegex.exec(sqlContent)) !== null) {
    chanceCards.push({ code: match[1], name: match[2] });
  }

  if (chanceCards.length === 26) {
    log(`✅ 찬스 카드 26장 확인`, 'green');
    
    // 카드 목록 출력
    const categories = {
      '돈 카드': ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7'],
      '상호작용 카드': ['CH8', 'CH9', 'CH10', 'CH11', 'CH12', 'CH13'],
      '드로우 카드': ['CH14', 'CH15', 'CH16'],
      '특수 행동 카드': ['CH17', 'CH18', 'CH19', 'CH20'],
      '캐치업 카드': ['CH21', 'CH22', 'CH23', 'CH24', 'CH25']
    };

    for (const [category, codes] of Object.entries(categories)) {
      log(`\n  ${category}:`, 'cyan');
      codes.forEach(code => {
        const card = chanceCards.find(c => c.code === code);
        if (card) {
          log(`    ✅ ${card.code}: ${card.name}`, 'green');
        } else {
          log(`    ❌ ${code}: 없음`, 'red');
          allCorrect = false;
        }
      });
    }
  } else {
    log(`❌ 찬스 카드 ${chanceCards.length}장 (예상: 26장)`, 'red');
    allCorrect = false;
  }

  log('\n' + '='.repeat(50), 'cyan');
  if (allCorrect) {
    log('✅ 모든 카드 데이터 정상!', 'green');
  } else {
    log('❌ 카드 데이터에 문제가 있습니다', 'red');
  }
}

async function checkDatabase() {
  log('\n🗄️  데이터베이스 연결 확인 중...', 'cyan');
  log('='.repeat(50), 'cyan');

  const envPath = path.join(process.cwd(), 'backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ backend/.env 파일이 없습니다', 'red');
    log('💡 .env.example을 복사하여 .env 파일을 만드세요', 'yellow');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {
    DB_HOST: null,
    DB_PORT: null,
    DB_NAME: null,
    DB_USER: null,
    DB_PASSWORD: null
  };

  // .env 파일 파싱
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && envVars.hasOwnProperty(key.trim())) {
      envVars[key.trim()] = value.trim();
    }
  });

  // 환경 변수 확인
  let allSet = true;
  for (const [key, value] of Object.entries(envVars)) {
    if (value && value !== 'your-supabase-password' && !value.includes('xxxxx')) {
      log(`✅ ${key}: 설정됨`, 'green');
    } else {
      log(`❌ ${key}: 설정 필요`, 'red');
      allSet = false;
    }
  }

  if (allSet) {
    log('\n✅ 모든 데이터베이스 환경 변수 설정됨', 'green');
    log('💡 백엔드를 실행하여 실제 연결을 테스트하세요', 'yellow');
  } else {
    log('\n❌ 일부 환경 변수가 설정되지 않았습니다', 'red');
    log('💡 backend/.env 파일을 수정하세요', 'yellow');
  }

  log('\n' + '='.repeat(50), 'cyan');
}

function showHelp() {
  log('\n🎮 게임 테스트 헬퍼', 'cyan');
  log('='.repeat(50), 'cyan');
  log('\n사용법:', 'yellow');
  log('  node test-helper.js check        # 환경 확인');
  log('  node test-helper.js cards        # 카드 데이터 확인');
  log('  node test-helper.js db           # 데이터베이스 설정 확인');
  log('  node test-helper.js all          # 모든 확인 실행');
  log('\n');
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'check':
      await checkEnvironment();
      break;
    case 'cards':
      await checkCards();
      break;
    case 'db':
      await checkDatabase();
      break;
    case 'all':
      await checkEnvironment();
      await checkCards();
      await checkDatabase();
      break;
    default:
      showHelp();
  }
}

main().catch(error => {
  log(`\n❌ 에러 발생: ${error.message}`, 'red');
  process.exit(1);
});
