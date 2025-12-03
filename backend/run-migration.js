const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 마이그레이션 시작: is_ai 컬럼 추가');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'src', 'db', 'add_is_ai_column.sql'),
      'utf8'
    );
    
    await client.query(sql);
    
    console.log('✅ 마이그레이션 완료');
    
    // 확인
    const result = await client.query(`
      SELECT p.id, u.nickname, p.is_ai
      FROM players p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at
    `);
    
    console.log('\n📋 플레이어 목록:');
    result.rows.forEach(row => {
      console.log(`  - ${row.nickname}: is_ai=${row.is_ai}`);
    });
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
