// DNS 해석 후 연결 테스트
const dns = require('dns');
const { Client } = require('pg');

const hostname = 'db.xskaefoqkbwnhrpyptkl.supabase.co';

console.log('🔍 DNS 해석 테스트...\n');

// IPv4 주소 조회
dns.resolve4(hostname, (err, addresses) => {
  if (err) {
    console.log('❌ IPv4 주소 없음:', err.message);
  } else {
    console.log('✅ IPv4 주소:', addresses);
  }
});

// IPv6 주소 조회
dns.resolve6(hostname, (err, addresses) => {
  if (err) {
    console.log('❌ IPv6 주소 없음:', err.message);
  } else {
    console.log('✅ IPv6 주소:', addresses);
  }
});

// 모든 주소 조회
dns.lookup(hostname, { all: true }, async (err, addresses) => {
  if (err) {
    console.error('❌ DNS 조회 실패:', err.message);
    process.exit(1);
  }

  console.log('\n📋 모든 주소:');
  addresses.forEach(addr => {
    console.log(`  - ${addr.address} (${addr.family === 4 ? 'IPv4' : 'IPv6'})`);
  });

  // IPv4 주소가 있으면 사용, 없으면 첫 번째 주소 사용
  const ipv4 = addresses.find(a => a.family === 4);
  const targetAddress = ipv4 ? ipv4.address : addresses[0].address;

  console.log(`\n🎯 사용할 주소: ${targetAddress}\n`);

  // 직접 IP로 연결 시도
  const client = new Client({
    host: targetAddress,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '9orkL1p59FjOnZQd',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    console.log('연결 시도 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    const result = await client.query('SELECT NOW(), version()');
    console.log('⏰ 서버 시간:', result.rows[0].now);
    console.log('📦 PostgreSQL 버전:', result.rows[0].version.split(',')[0], '\n');

    await client.end();
    console.log('✅ 테스트 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    process.exit(1);
  }
});
