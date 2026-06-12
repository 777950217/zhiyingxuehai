const fs = require('fs');

// 官方 Supabase 数据库连接
const SUPABASE_URL = 'https://ojolpkzgeivgbokotaap.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb2xwa3pnZWl2Z2Jva290YWFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTM3NiwiZXhwIjoyMDkzODgxMzc2fQ.uoywpU4KolwAldLtPFHV7nuhlcmkqeaVF3zZNlsh4TA';

async function executeSql() {
  // 读取 SQL 文件
  const sql = fs.readFileSync('/workspace/projects/create-all-missing-tables.sql', 'utf8');
  
  // 分割 SQL 语句（按分号分割，但忽略注释中的分号）
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`总共 ${statements.length} 条 SQL 语句待执行\n`);
  
  // 使用 fetch 直接调用 Supabase REST API
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  let success = 0;
  let failed = 0;
  
  // Supabase 不支持直接执行 DDL，需要用 pg 库直连
  const { Client } = require('pg');
  
  const client = new Client({
    connectionString: 'postgresql://postgres:Yingde0929.@db.ojolpkzgeivgbokotaap.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  // 强制使用 IPv4
  const dns = require('dns');
  const originalLookup = dns.lookup;
  dns.lookup = (hostname, options, callback) => {
    originalLookup(hostname, { ...options, family: 4 }, callback);
  };
  
  try {
    console.log('连接数据库...');
    await client.connect();
    console.log('连接成功！\n');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (i % 10 === 0) {
        console.log(`执行进度: ${i}/${statements.length}`);
      }
      
      try {
        await client.query(stmt);
        success++;
      } catch (err) {
        // 忽略 "已存在" 类错误
        if (err.message.includes('already exists') || 
            err.message.includes('duplicate') ||
            err.message.includes('already enabled')) {
          success++;
        } else {
          console.log(`\n❌ 语句 ${i + 1} 失败: ${err.message.substring(0, 100)}`);
          console.log(`   SQL: ${stmt.substring(0, 80)}...`);
          failed++;
        }
      }
    }
    
    console.log(`\n========================================`);
    console.log(`执行完成！成功: ${success}, 失败: ${failed}`);
    
    // 验证表数量
    const result = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema='public' AND table_type='BASE TABLE'
    `);
    console.log(`当前表数量: ${result.rows[0].count}`);
    
  } catch (err) {
    console.error('连接失败:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeSql();
