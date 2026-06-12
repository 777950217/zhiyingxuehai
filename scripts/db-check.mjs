#!/usr/bin/env node

/**
 * 职盈学海 - 数据库同步校验
 * 对比 schema.ts 中定义的表/字段 与 Supabase 实际数据库
 *
 * 用法: node scripts/db-check.mjs
 *
 * 环境变量 (从 .env 自动读取):
 *   COZE_SUPABASE_URL          - Supabase 项目 URL
 *   COZE_SUPABASE_SERVICE_ROLE_KEY - Service Role Key (绕过 RLS)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ─── Load .env ──────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx);
        let val = trimmed.substring(eqIdx + 1);
        if ((val.startsWith("'") && val.endsWith("'")) ||
            (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // .env not found, rely on existing env vars
  }
}
loadEnv();

// ─── Parse schema.ts ────────────────────────────────────────
function parseSchema() {
  const schemaPath = resolve(PROJECT_ROOT, 'src/storage/database/shared/schema.ts');
  const content = readFileSync(schemaPath, 'utf-8');

  const tables = {};

  // Match: pgTable("table_name", { ... })
  // We'll use a simpler approach: find each pgTable block and extract fields
  const tableRegex = /pgTable\(\s*"(\w+)"\s*,\s*\{/g;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const tableName = tableMatch[1];
    const startIdx = tableMatch.index + tableMatch[0].length;

    // Find the matching closing brace for the table definition
    let depth = 1;
    let pos = startIdx;
    while (pos < content.length && depth > 0) {
      if (content[pos] === '{') depth++;
      else if (content[pos] === '}') depth--;
      pos++;
    }
    const tableBody = content.substring(startIdx, pos - 1);

    // Extract column definitions
    // Pattern: columnName: pgType(...).primaryKey() / ...
    const columnRegex = /(\w+)\s*:\s*(?:pgTable\.)?(?:pg\.)?(?:varchar|text|integer|serial|bigint|boolean|timestamp|timestamptz|uuid|jsonb|json|real|doublePrecision|numeric|date|time|interval|char|cidr|inet|macaddr|point|line|lseg|box|path|polygon|circle|bytea|array)\b/gi;

    const columns = {};
    let colMatch;
    while ((colMatch = columnRegex.exec(tableBody)) !== null) {
      const colName = colMatch[1];
      // Skip reserved words and method names
      if (['primaryKey', 'default', 'notNull', 'references', 'unique', 'onDelete', 'onUpdate', 'index'].includes(colName)) continue;
      if (colName.startsWith('__')) continue;

      // Extract the full type declaration for this column
      const colStart = colMatch.index;
      const lineStart = tableBody.lastIndexOf('\n', colStart) + 1;
      const lineEnd = tableBody.indexOf('\n', colStart);
      const line = tableBody.substring(lineStart, lineEnd > 0 ? lineEnd : undefined).trim();

      // Extract type name
      const typeMatch = line.match(/:\s*(?:pgTable\.)?(?:pg\.)?(\w+)/);
      const typeName = typeMatch ? typeMatch[1].toLowerCase() : 'unknown';

      columns[colName] = mapSchemaType(typeName);
    }

    tables[tableName] = columns;
  }

  return tables;
}

function mapSchemaType(tsType) {
  const typeMap = {
    'varchar': 'character varying',
    'text': 'text',
    'integer': 'integer',
    'serial': 'integer',
    'bigint': 'bigint',
    'boolean': 'boolean',
    'timestamp': 'timestamp without time zone',
    'timestamptz': 'timestamp with time zone',
    'uuid': 'uuid',
    'jsonb': 'jsonb',
    'json': 'json',
    'real': 'real',
    'doubleprecision': 'double precision',
    'numeric': 'numeric',
    'date': 'date',
    'time': 'time without time zone',
    'interval': 'interval',
    'char': 'character',
    'bytea': 'bytea',
    'array': 'ARRAY',
    'inet': 'inet',
    'cidr': 'cidr',
    'macaddr': 'macaddr',
    'point': 'point',
    'line': 'line',
    'lseg': 'lseg',
    'box': 'box',
    'path': 'path',
    'polygon': 'polygon',
    'circle': 'circle',
  };
  return typeMap[tsType] || tsType;
}

// ─── Query Supabase ─────────────────────────────────────────
async function getDatabaseSchema(supabase) {
  // Query information_schema.columns for all public tables
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `
    })
    .then(() => {
      // RPC might not exist, fall back to direct query via REST
      return { data: null, error: 'no_rpc' };
    })
    .catch(() => ({ data: null, error: 'no_rpc' }));

  // If RPC doesn't exist, use the REST API with service role
  // We'll query each known table individually via Supabase REST
  // But for schema inspection, we need raw SQL access

  // Alternative: use the Supabase Management API or PostgREST
  // Since we can't easily query information_schema via REST,
  // let's try using the Supabase SQL editor endpoint
  return null;
}

async function getDatabaseSchemaDirect(url, serviceKey) {
  // Use Supabase REST API to query information_schema
  // PostgREST supports stored procedures, but we need direct SQL
  // Let's try the /rest/v1/rpc/ endpoint or use pg directly

  // Fallback: try to detect tables by attempting SELECT 1 from each
  // This is less precise but works without RPC

  const supabase = createClient(url, serviceKey);

  // Try to get table list via PostgREST
  // GET /rest/v1/?schemaname=public
  const tablesResp = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  // That won't give us schema info. Let's use a different approach:
  // Query each table for 0 rows to check existence, then check column names
  // from the response headers or empty results.

  // Best approach: use Supabase's pg_net or direct SQL via /sql endpoint
  // But this requires the sql editor API

  // Practical approach: use the Supabase introspection endpoint
  const introspectUrl = `${url}/rest/v1/rpc/exec_sql`;
  return null;
}

async function getDatabaseSchemaViaInformationSchema(url, serviceKey) {
  // We'll try to query via a helper function or fall back to table detection
  const supabase = createClient(url, serviceKey);

  // Method: Try to use a PostgreSQL connection string if available
  // Check for DATABASE_URL env var
  const databaseUrl = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || process.env.PGDATABASE_URL;

  if (databaseUrl) {
    return await queryViaPg(databaseUrl);
  }

  // Fallback method: detect tables and columns by probing
  return await probeSchema(supabase, url, serviceKey);
}

async function probeSchema(supabase, url, serviceKey) {
  // Get list of tables by querying the Supabase schema API
  // PostgREST exposes table info via OpenAPI spec
  const openApiUrl = `${url}/rest/v1/`;
  try {
    const resp = await fetch(openApiUrl, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Accept': 'application/openapi+json',
      },
    });

    if (!resp.ok) {
      console.log(`⚠️  Cannot fetch OpenAPI spec (status ${resp.status})`);
      return null;
    }

    const spec = await resp.json();
    const tables = {};

    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        // Table paths look like /tablename
        const tableName = path.replace(/^\//, '').replace(/\/$/, '');
        if (tableName.includes('/') || tableName.includes('{')) continue;

        // Get schema from the GET response
        const getSchema = methods?.get?.responses?.['200']?.content?.['application/json']?.schema;
        if (getSchema?.items?.properties) {
          tables[tableName] = {};
          for (const [colName, colDef] of Object.entries(getSchema.items.properties)) {
            tables[tableName][colName] = colDef.format || colDef.type || 'unknown';
          }
        }
      }
    }

    return tables;
  } catch (err) {
    console.log(`⚠️  Cannot fetch schema via OpenAPI: ${err.message}`);
    return null;
  }
}

async function queryViaPg(databaseUrl) {
  // Use pg module if available
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

    const result = await pool.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    await pool.end();

    const tables = {};
    for (const row of result.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = {};
      tables[row.table_name][row.column_name] = row.data_type;
    }
    return tables;
  } catch (err) {
    console.log(`⚠️  pg connection failed: ${err.message}`);
    return null;
  }
}

// ─── Compare ────────────────────────────────────────────────
function compareSchemas(schemaTables, dbTables) {
  const issues = [];

  // Check schema.ts tables against database
  for (const [tableName, columns] of Object.entries(schemaTables)) {
    if (!dbTables[tableName]) {
      issues.push({ type: 'MISSING_TABLE', table: tableName, detail: 'Table in schema.ts but missing from database' });
      continue;
    }

    // Check columns
    for (const [colName, colType] of Object.entries(columns)) {
      if (!dbTables[tableName][colName]) {
        issues.push({ type: 'MISSING_COLUMN', table: tableName, column: colName, detail: `Column in schema.ts but missing from database` });
      } else if (dbTables[tableName][colName] !== colType && !isTypeCompatible(colType, dbTables[tableName][colName])) {
        issues.push({ type: 'TYPE_MISMATCH', table: tableName, column: colName, schemaType: colType, dbType: dbTables[tableName][colName] });
      }
    }

    // Check extra columns in database
    for (const colName of Object.keys(dbTables[tableName])) {
      if (!columns[colName]) {
        issues.push({ type: 'EXTRA_COLUMN', table: tableName, column: colName, detail: `Column in database but not in schema.ts` });
      }
    }
  }

  // Check extra tables in database
  for (const tableName of Object.keys(dbTables)) {
    if (!schemaTables[tableName]) {
      issues.push({ type: 'EXTRA_TABLE', table: tableName, detail: 'Table in database but not in schema.ts' });
    }
  }

  return issues;
}

function isTypeCompatible(schemaType, dbType) {
  // Common compatible types
  const compat = {
    'character varying': ['text', 'character varying'],
    'text': ['text', 'character varying'],
    'timestamp without time zone': ['timestamp without time zone', 'timestamp with time zone'],
    'timestamp with time zone': ['timestamp with time zone', 'timestamp without time zone'],
    'integer': ['integer', 'bigint', 'smallint'],
    'bigint': ['bigint', 'integer'],
    'jsonb': ['jsonb', 'json'],
    'json': ['json', 'jsonb'],
  };

  const s = schemaType.toLowerCase();
  const d = dbType.toLowerCase();

  if (s === d) return true;
  if (compat[s]?.includes(d)) return true;
  if (compat[d]?.includes(s)) return true;

  // If both start with "character" it's varchar-like
  if (s.startsWith('character') && d.startsWith('character')) return true;

  return false;
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 职盈学海 数据库同步校验\n');

  // Step 1: Parse schema.ts
  console.log('  📄 Parsing schema.ts...');
  const schemaTables = parseSchema();
  const schemaTableCount = Object.keys(schemaTables).length;
  let schemaColCount = 0;
  for (const cols of Object.values(schemaTables)) schemaColCount += Object.keys(cols).length;
  console.log(`     Found ${schemaTableCount} tables, ${schemaColCount} columns\n`);

  // Step 2: Connect to database
  const url = process.env.COZE_SUPABASE_URL;
  const serviceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.log('  ⚠️  COZE_SUPABASE_URL or COZE_SUPABASE_SERVICE_ROLE_KEY not set');
    console.log('     Cannot connect to database. Skipping database comparison.\n');
    console.log('  📋 Schema.ts tables:');
    for (const [name, cols] of Object.entries(schemaTables)) {
      console.log(`     - ${name} (${Object.keys(cols).length} columns)`);
    }
    console.log('\n  ⚠️  Schema check skipped (no database connection)\n');
    process.exit(0);
  }

  console.log(`  🗄️  Connecting to ${url}...`);
  const dbTables = await getDatabaseSchemaViaInformationSchema(url, serviceKey);

  if (!dbTables) {
    console.log('  ⚠️  Cannot fetch database schema. Trying Supabase OpenAPI spec...');

    // Last resort: try OpenAPI
    const supabase = createClient(url, serviceKey);
    const openApiTables = await probeSchema(supabase, url, serviceKey);

    if (!openApiTables || Object.keys(openApiTables).length === 0) {
      console.log('  ⚠️  Cannot fetch database schema via any method.');
      console.log('     Please ensure DATABASE_URL or COZE_SUPABASE_URL is accessible.\n');
      process.exit(1);
    }

    console.log(`     Found ${Object.keys(openApiTables).length} tables via OpenAPI\n`);
    const issues = compareSchemas(schemaTables, openApiTables);
    reportIssues(issues);
    return;
  }

  const dbTableCount = Object.keys(dbTables).length;
  let dbColCount = 0;
  for (const cols of Object.values(dbTables)) dbColCount += Object.keys(cols).length;
  console.log(`     Found ${dbTableCount} tables, ${dbColCount} columns\n`);

  // Step 3: Compare
  const issues = compareSchemas(schemaTables, dbTables);
  reportIssues(issues);
}

function reportIssues(issues) {
  if (issues.length === 0) {
    console.log('  ✅ Schema in sync\n');
    process.exit(0);
  }

  // Group by type
  const grouped = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) grouped[issue.type] = [];
    grouped[issue.type].push(issue);
  }

  const icons = {
    MISSING_TABLE: '❌',
    MISSING_COLUMN: '❌',
    TYPE_MISMATCH: '❌',
    EXTRA_TABLE: '⚠️',
    EXTRA_COLUMN: '⚠️',
  };

  const labels = {
    MISSING_TABLE: 'MISSING (in schema.ts, not in database)',
    MISSING_COLUMN: 'MISSING (in schema.ts, not in database)',
    TYPE_MISMATCH: 'TYPE_MISMATCH',
    EXTRA_TABLE: 'EXTRA (in database, not in schema.ts)',
    EXTRA_COLUMN: 'EXTRA (in database, not in schema.ts)',
  };

  for (const [type, items] of Object.entries(grouped)) {
    const icon = icons[type] || '❓';
    const label = labels[type] || type;
    console.log(`  ${icon} ${label}:`);
    for (const item of items) {
      if (item.type === 'TYPE_MISMATCH') {
        console.log(`     ${item.table}.${item.column}: schema=${item.schemaType}, db=${item.dbType}`);
      } else if (item.column) {
        console.log(`     ${item.table}.${item.column}`);
      } else {
        console.log(`     ${item.table}`);
      }
    }
    console.log('');
  }

  const errorCount = issues.filter(i => i.type.startsWith('MISSING') || i.type === 'TYPE_MISMATCH').length;
  const warnCount = issues.filter(i => i.type.startsWith('EXTRA')).length;
  console.log(`  ❌ ${errorCount} issue(s), ⚠️  ${warnCount} warning(s)\n`);

  if (errorCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
