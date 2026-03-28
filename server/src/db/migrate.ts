import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './index.js';

async function migrate() {
  // Resolve migrations directory relative to the project root
  const migrationsDir = path.resolve(process.cwd(), 'src', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  console.log(`\n  Running ${files.length} migration(s)...\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      await pool.query(sql);
      console.log(`  ✅ ${file}`);
    } catch (err: any) {
      console.error(`  ❌ ${file} — ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n  All migrations complete.\n');
  await pool.end();
}

migrate();
