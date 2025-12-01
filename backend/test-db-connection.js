// 데이터베이스 연결 테스트 스크립트
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  // IPv4 강제 사용
  family: 4,
});

async function testConnection() {
  console.log('🔍 데이터베이스 연결 테스트 시작...\n');
  console.log('연결 정보:');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Port: ${process.env.DB_PORT}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  SSL: ${process.env.DB_HOST?.includes('supabase.com') ? 'Enabled' : 'Disabled'}\n`);

  try {
    // 연결 테스트
    const client = await pool.connect();
    console.log('✅ 데이터베이스 연결 성공!\n');

    // 현재 시간 조회
    const timeResult = await client.query('SELECT NOW()');
    console.log(`⏰ 서버 시간: ${timeResult.rows[0].now}\n`);

    // 테이블 목록 조회
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 테이블 목록:');
    if (tablesResult.rows.length === 0) {
      console.log('  (테이블 없음 - 스키마 생성 필요)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    console.log();

    // 카드 개수 확인 (cards 테이블이 있는 경우)
    try {
      const cardsResult = await client.query('SELECT COUNT(*) as count FROM cards');
      console.log(`🎴 카드 데이터: ${cardsResult.rows[0].count}장\n`);
    } catch (err) {
      console.log('🎴 카드 데이터: 테이블 없음 (시드 필요)\n');
    }

    client.release();
    console.log('✅ 모든 테스트 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 해결 방법:');
      console.log('   1. Supabase 대시보드에서 프로젝트 상태 확인');
      console.log('   2. 프로젝트가 일시 중지된 경우 재시작');
      console.log('   3. 연결 정보가 올바른지 확인');
      console.log('   4. 네트워크 연결 확인\n');
    } else if (error.message.includes('password')) {
      console.log('💡 해결 방법:');
      console.log('   1. .env 파일의 DB_PASSWORD 확인');
      console.log('   2. Supabase 대시보드에서 비밀번호 재설정\n');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
