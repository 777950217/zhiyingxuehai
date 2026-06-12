// scripts/backup-database.js
// 免费手动备份数据库到本地SQL文件
// 用法：node scripts/backup-database.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const client = new Client({
  host: 'db.ojolpkzgeivgbokotaap.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Yingde0929.',
  ssl: { rejectUnauthorized: false }
});

// 备份目录
const BACKUP_DIR = 'D:\\backup';
const DATE = new Date().toISOString().split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `backup-${DATE}.sql`);

async function backup() {
  console.log('🚀 开始备份数据库...');
  
  try {
    // 连接数据库
    await client.connect();
    console.log('✅ 数据库连接成功');
    
    // 获取所有表
    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    const tables = tablesRes.rows.map(r => r.tablename);
    console.log(`📋 发现 ${tables.length} 张表:`, tables.join(', '));
    
    // 创建备份文件流
    const writeStream = fs.createWriteStream(BACKUP_FILE);
    
    // 写入备份头信息
    writeStream.write(`-- 职盈学海数据库备份\n`);
    writeStream.write(`-- 备份时间: ${new Date().toISOString()}\n`);
    writeStream.write(`-- 数据库: postgres\n`);
    writeStream.write(`-- 表数量: ${tables.length}\n`);
    writeStream.write(`-- =========================================\n\n`);
    
    // 备份每张表的结构和数据
    for (const table of tables) {
      console.log(`📦 正在备份表: ${table}`);
      
      // 获取表结构
      const schemaRes = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      // 写入表结构注释
      writeStream.write(`\n-- =========================================\n`);
      writeStream.write(`-- 表: ${table}\n`);
      writeStream.write(`-- =========================================\n`);
      
      // 获取表数据
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      
      if (dataRes.rows.length === 0) {
        writeStream.write(`-- 表 ${table} 为空表\n`);
        continue;
      }
      
      // 生成 INSERT 语句
      const columns = Object.keys(dataRes.rows[0]);
      
      for (const row of dataRes.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return val;
        });
        
        writeStream.write(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`);
      }
      
      console.log(`✅ 表 ${table} 备份完成 (${dataRes.rows.length} 行)`);
    }
    
    // 关闭文件流
    writeStream.end();
    
    // 等待文件写入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // 检查文件大小
    const stats = fs.statSync(BACKUP_FILE);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('\n🎉 备份完成！');
    console.log(`📁 文件路径: ${BACKUP_FILE}`);
    console.log(`📊 文件大小: ${sizeMB} MB`);
    console.log(`📋 备份表数: ${tables.length}`);
    
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

backup();
