import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,  // 연결 수 증가 (동시 AI 턴 처리)
  min: 2,  // 최소 연결 유지
  idleTimeoutMillis: 120000,  // 유휴 연결 120초 후 해제 (AI 턴 고려)
  connectionTimeoutMillis: 20000,  // 연결 타임아웃 20초
  statement_timeout: 60000,  // 쿼리 실행 타임아웃 60초 (AI 턴 충분한 시간)
  query_timeout: 60000,  // 쿼리 타임아웃 60초
  ssl: process.env.DB_HOST?.includes('supabase.com') 
    ? { rejectUnauthorized: false } 
    : undefined,
  // 연결 재시도 설정
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// 연결 에러 핸들링
pool.on('error', (err: Error & { code?: string }, client) => {
  console.error('❌ 데이터베이스 풀 에러:', err.message);
  if (err.code) {
    console.error('에러 코드:', err.code);
  }
  
  // 연결 종료 에러는 무시 (정상적인 종료)
  if (err.code === 'XX000' || err.message.includes('DbHandler exited')) {
    console.log('⚠️  데이터베이스 연결이 종료되었습니다. 자동으로 재연결됩니다.');
  }
});

// 연결 성공 로그
pool.on('connect', (client) => {
  console.log('✅ 데이터베이스 연결 성공');
});

// 연결 해제 로그
pool.on('remove', (client) => {
  console.log('🔌 데이터베이스 연결 해제');
});
