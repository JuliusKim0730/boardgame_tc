// IPv6 주소로 직접 연결
const { Client } = require('pg');

const ipv6Address = '2406:da1c:f42:ae0b:f225:8089:a84a:36e6';

console.log('🔍 IPv6 주소로 직접 연결 테스트...\n');
console.log(`주소: [${ipv6Address}]:5432\n`);

const client = new Client({
  host: ipv6Address,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '9orkL1p59FjOnZQd',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function testConnection() {
  try {
    console.log('연결 시도 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    const result = await client.query('SELECT NOW(), version()');
    console.log('⏰ 서버 시간:', result.rows[0].now);
    console.log('📦 PostgreSQL:', result.rows[0].version.split('\n')[0], '\n');

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 테이블 목록:');
    if (tables.rows.length === 0) {
      console.log('  (테이블 없음 - 스키마 생성 필요)\n');
    } else {
      tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
      console.log();
    }

    await client.end();
    console.log('✅ IPv6 연결 성공! 이제 .env 파일을 업데이트하세요.');
    process.exit(0);
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    console.error('\n💡 해결 방법:');
    console.log('1. Supabase 프로젝트가 Active 상태인지 확인');
    console.log('2. 방화벽에서 IPv6 연결 허용 확인');
    console.log('3. Connection Pooler 사용 고려');
    process.exit(1);
  }
}

testConnection();
