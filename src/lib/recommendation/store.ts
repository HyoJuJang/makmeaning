import 'server-only';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { RecommendationDomain, RecommendationIndex, RecommendationMode, UserProfile } from './types.ts';

let cached: { stamp: string; index: RecommendationIndex } | null = null;
const shards = new Map<string, { stamp: string; users: Record<string, UserProfile> }>();
// The private index is provisioned at runtime, never embedded in the deployment bundle.
const dataDirectory = () => resolve(/* turbopackIgnore: true */ process.env.RECOMMENDATION_DATA_DIR || '.recommendation');
export const defaultMode = (): RecommendationMode => process.env.RECOMMENDATION_MODE === 'metadata' ? 'metadata' : 'behavior';

export function readRecommendationIndex(): RecommendationIndex {
  const path = join(dataDirectory(), 'catalog.json');
  const stat = statSync(path);
  const stamp = `${path}:${stat.mtimeMs}:${stat.size}`;
  if (cached?.stamp === stamp) return cached.index;
  const index = JSON.parse(readFileSync(path, 'utf8')) as RecommendationIndex;
  if (index.version !== 1 || !Array.isArray(index.products) || !index.popularity || !index.neighbors || !index.summary || !index.window) throw new Error('Invalid recommendation index');
  cached = { stamp, index };
  shards.clear();
  return index;
}

export function readRecommendationProfile(userId?: string): UserProfile | null {
  if (!userId) return null;
  const shard = createHash('sha256').update(userId).digest('hex').slice(0, 2);
  const path = join(dataDirectory(), 'users', `${shard}.json`);
  try {
    const stat = statSync(path);
    const stamp = `${path}:${stat.mtimeMs}:${stat.size}`;
    let entry = shards.get(path);
    if (!entry || entry.stamp !== stamp) {
      entry = { stamp, users: JSON.parse(readFileSync(path, 'utf8')) as Record<string, UserProfile> };
      if (shards.size >= 8) shards.delete(shards.keys().next().value!);
      shards.set(path, entry);
    }
    return Object.hasOwn(entry.users, userId) ? entry.users[userId] : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function samples(): Partial<Record<RecommendationDomain, string>> {
  try { return JSON.parse(readFileSync(join(dataDirectory(), 'samples.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
}
export function readSampleProfile(domain: RecommendationDomain): UserProfile | null {
  return readRecommendationProfile(samples()[domain]);
}
export function sampleDomains(): RecommendationDomain[] {
  return Object.keys(samples()).filter(domain => ['fashion', 'living', 'food', 'beauty'].includes(domain)) as RecommendationDomain[];
}
