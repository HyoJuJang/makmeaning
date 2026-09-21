import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Load your local Vercel environment before migrating.');
  process.exitCode = 1;
} else {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const source = await readFile(new URL('../db/migrations/001_products.sql', import.meta.url), 'utf8');
    // This migration contains plain DDL only, with no procedural bodies or quoted semicolons.
    const statements = source.replace(/^\s*--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean);
    await sql.transaction(statements.map(statement => sql.query(statement)));
    console.log(`Products migration complete (${statements.length} statements, existing data preserved).`);
  } catch {
    // Driver errors can include connection details; never print them to shared build logs.
    console.error('Products migration failed. Check database access and schema permissions.');
    process.exitCode = 1;
  }
}
