import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { createImportQuery, normalizeProducts } from './products-data.mjs';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const paths = args.filter(arg => arg !== '--check');

if (paths.length !== 1 || paths[0].startsWith('--')) {
  console.error('Usage: node --env-file-if-exists=.env.local scripts/products-import.mjs products.json [--check]');
  process.exitCode = 1;
} else {
  try {
    const rows = JSON.parse(await readFile(paths[0], 'utf8'));
    // Validate the whole file before sending any writes. Keep raw keys to distinguish
    // omitted optional values (preserve existing) from explicit null (clear existing).
    normalizeProducts(rows);
    if (checkOnly || rows.length === 0) {
      console.log(`Products import validated: ${rows.length} rows. No database changes.`);
    } else if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is required. Load your local Vercel environment before importing.');
      process.exitCode = 1;
    } else {
      const sql = neon(process.env.DATABASE_URL);
      await sql.transaction(rows.map(row => {
        const query = createImportQuery(row);
        return sql.query(query.text, query.values);
      }));
      console.log(`Products import complete: ${rows.length} rows saved. Omitted optional fields preserved.`);
    }
  } catch {
    console.error('Products import failed. Check the JSON contract, database access, and migration status. No partial file was imported.');
    process.exitCode = 1;
  }
}
