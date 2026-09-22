/** Reuse the exact shape groups assigned by visual review, without guessing from names. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from './lib/game-asset-rules.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'data/game-assets/overnight');
const apply = process.argv.includes('--apply');
const readFiles = async dir => Promise.all((await fs.readdir(dir)).filter(name => name.endsWith('.json')).sort().map(async name => {
  const file = path.join(dir, name), text = await fs.readFile(file, 'utf8');
  return { file, text, data: JSON.parse(text) };
}));
const reviews = await readFiles(path.join(base, 'reviews'));
const jobs = await readFiles(path.join(base, 'jobs'));
const rows = new Map();
for (const review of reviews) for (const kind of ['reviewed', 'unresolved']) for (const row of review.data[kind]) {
  if (rows.has(row.prd_id)) throw new Error(`Duplicate review ID: ${row.prd_id}`);
  rows.set(row.prd_id, { row, kind });
}
const identity = value => [FAMILIES[value.familyId]?.domain, value.familyId, value.color, value.pattern, value.groupSuggestion].join('|');
const groupJobs = new Map();
for (const jobFile of jobs) {
  const job = jobFile.data;
  if (['superseded', 'reused'].includes(job.status) || !job.approvedProductIds?.length) continue;
  if (!job.groupSuggestion) {
    const groups = new Set(job.approvedProductIds.map(id => rows.get(id)).filter(entry => entry?.kind === 'reviewed').map(entry => entry.row.groupSuggestion).filter(Boolean));
    if (groups.size === 1) job.groupSuggestion = [...groups][0];
  }
  if (!job.groupSuggestion) continue;
  const key = identity(job);
  if (groupJobs.has(key)) throw new Error(`Multiple jobs for one reviewed group: ${key}`);
  groupJobs.set(key, job);
}
const addedToQueue = [], connectedToReady = [];
for (const { row, kind } of rows.values()) {
  if (kind !== 'reviewed' || !row.groupSuggestion || row.compatibleAssetId) continue;
  const job = groupJobs.get(identity(row));
  if (!job) continue;
  if (job.status === 'registered') {
    row.compatibleAssetId = job.assetId;
    row.evidence = [...new Set([...row.evidence, `검수자가 지정한 동일 형태·색상·패턴 그룹 ${row.groupSuggestion}의 준비된 공용 에셋 재사용`])];
    connectedToReady.push({ prd_id: row.prd_id, assetId: job.assetId });
  } else if (['queued', 'generated', 'generating', 'needs_revision'].includes(job.status) && !job.approvedProductIds.includes(row.prd_id)) {
    job.approvedProductIds.push(row.prd_id);
    job.reviewEvidence += '\n'+row.prd_id+': '+row.evidence.join(' ');
    addedToQueue.push({ prd_id: row.prd_id, key: job.key });
  }
}
const changes = [...jobs, ...reviews].filter(item => JSON.stringify(item.data, null, 2)+'\n' !== item.text);
if (apply) {
  // Refuse to overwrite inputs changed by a concurrent reviewer or generator.
  for (const item of changes) if (await fs.readFile(item.file, 'utf8') !== item.text) throw new Error(`Input changed: ${item.file}`);
  for (const item of changes) {
    const temporary = item.file+'.group-tmp';
    await fs.writeFile(temporary, JSON.stringify(item.data, null, 2)+'\n');
    await fs.rename(temporary, item.file);
  }
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', changedFiles: changes.length, addedToQueue, connectedToReady }, null, 2));
