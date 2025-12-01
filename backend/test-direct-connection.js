// 직접 연결 문자열로 테스트
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:9orkL1p59FjOnZQd@db.xskaefoqkbwnhrpyptkl.supabase.co:5432/postgres?sslmode=require';

console.log('🔍 직접 연결 문자열로 테스트...\n');
console.log('Connection String:', connectionString.replace(/:[^:@]+@/, ':****@'), '\n');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    console.log('연결 시도 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    const result = await client.query('SELECT NOW()');
    console.log('⏰ 서버 시간:', result.rows[0].now, '\n');

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 테이블 목록:');
    if (tables.rows.length === 0) {
      console.log('  (테이블 없음)\n');
    } else {
      tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
      console.log();
    }

    await client.end();
    console.log('✅ 테스트 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    console.error('\n상세 에러:', error);
    process.exit(1);
  }
}

testConnection();
