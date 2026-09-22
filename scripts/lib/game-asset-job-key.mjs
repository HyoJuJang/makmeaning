const slug = value => value.replace(/[^a-z0-9_-]/g, '-').replace(/[-_]+/g, '-');
const identity = value => [value.domain, value.groupSuggestion, value.familyId, value.color, value.pattern].join('|');
const active = job => job.approvedProductIds?.length && !['superseded', 'reused'].includes(job.status);

/** A reviewed change in shape/color must never reuse the old job's filename. */
export function chooseReviewedJobKey(record, existing) {
  const base = slug(`${record.domain}-${record.groupSuggestion}`);
  const first = existing.get(base);
  if (first && active(first) && identity(first) === identity(record)) {
    throw new Error(`Unreconciled active group collision: ${base}; reconcile explicit reviewed IDs first`);
  }
  const candidate = first && active(first)
    ? slug(`${base}-${record.familyId}-${record.color}-${record.pattern}`)
    : base;
  let key = candidate, revision = 2;
  while (existing.has(key)) {
    const previous = existing.get(key);
    if (active(previous)) {
      throw new Error(`Unreconciled active group collision: ${key}; reconcile explicit reviewed IDs first`);
    }
    key = `${candidate}-reviewed-${revision++}`;
  }
  return key;
}
