import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { createSeedQuery, normalizeProducts } from './products-data.mjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Load your local Vercel environment before seeding.');
  process.exitCode = 1;
} else {
  try {
    const products = normalizeProducts(JSON.parse(await readFile(new URL('../db/products.seed.json', import.meta.url), 'utf8')));
    const sql = neon(process.env.DATABASE_URL);
    const queries = products.map(product => {
      const query = createSeedQuery(product);
      return sql.query(query.text, query.values);
    });
    const results = await sql.transaction(queries);
    const inserted = results.reduce((count, rows) => count + rows.length, 0);
    console.log(`Products seed complete: ${inserted} inserted, ${products.length - inserted} existing rows preserved.`);
  } catch {
    console.error('Products seed failed. Check database access, migration status, and seed data.');
    process.exitCode = 1;
  }
}
