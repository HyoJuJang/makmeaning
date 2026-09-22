import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { assetDatabaseUrl } from '../src/lib/asset-db/contracts.ts';
import { ASSET_DB_LOCK, parseAssetCli } from './asset-db-data.mjs';
try {
  const { apply } = parseAssetCli(process.argv.slice(2));
  const source = await readFile(new URL('../db/asset-migrations/001_game_assets.sql', import.meta.url), 'utf8');
  const statements = source.replace(/^\s*--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean);
  if (statements.some(statement => /\bpublic\.products\b/i.test(statement))) throw new Error('Catalog access forbidden');
  if (!apply) console.log(JSON.stringify({ mode: 'check', statements: statements.length, writes: false, databaseVariable: 'ASSET_DATABASE_URL' }));
  else {
    const sql = neon(assetDatabaseUrl(process.env));
    await sql.transaction([sql.query('SELECT pg_advisory_xact_lock($1)', [ASSET_DB_LOCK]), ...statements.map(text => sql.query(text))]);
    console.log(JSON.stringify({ mode: 'applied', statements: statements.length, catalogChanged: false }));
  }
} catch {
  console.error('Asset migration failed. Check command arguments, ASSET_DATABASE_URL and separate asset-database permissions. Connection details are not logged.');
  process.exitCode = 1;
}
