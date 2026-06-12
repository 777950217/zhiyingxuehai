const { Client } = require('pg');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Yingde0929.@db.ojolpkzgeivgbokotaap.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database successfully');

    // Create rule_updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rule_updates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          platform VARCHAR(50) NOT NULL,
          title VARCHAR(500) NOT NULL,
          summary TEXT,
          action_advice TEXT,
          source_url TEXT,
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table rule_updates created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_rule_updates_platform ON rule_updates(platform);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rule_updates_published_at ON rule_updates(published_at DESC);`);
    console.log('Indexes on rule_updates created');

    // Create industry_trends table
    await client.query(`
      CREATE TABLE IF NOT EXISTS industry_trends (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category VARCHAR(100) NOT NULL,
          direction VARCHAR(20) NOT NULL,
          title VARCHAR(500) NOT NULL,
          key_data TEXT,
          suggestion TEXT,
          source_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table industry_trends created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_industry_trends_category ON industry_trends(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_industry_trends_direction ON industry_trends(direction);`);
    console.log('Indexes on industry_trends created');

    // Verify tables exist
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('rule_updates', 'industry_trends')
      ORDER BY table_name;
    `);
    console.log('\nVerification - tables found:');
    res.rows.forEach(r => console.log('  -', r.table_name));

    // Verify indexes
    const idxRes = await client.query(`
      SELECT indexname, tablename FROM pg_indexes
      WHERE tablename IN ('rule_updates', 'industry_trends')
      ORDER BY tablename, indexname;
    `);
    console.log('\nVerification - indexes found:');
    idxRes.rows.forEach(r => console.log(`  - ${r.tablename}.${r.indexname}`));

    console.log('\nAll done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
