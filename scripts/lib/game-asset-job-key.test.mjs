import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseReviewedJobKey } from './game-asset-job-key.mjs';

const original = {
  domain: 'food', familyId: 'food_pouch', groupSuggestion: 'snack_pouch_flat_white_blue',
  color: 'white', pattern: 'solid', status: 'registered', approvedProductIds: ['1'],
};
const base = 'food-snack-pouch-flat-white-blue';
test('reviewed color-block correction gets a separate job without overwriting the ready asset', () => {
  const existing = new Map([[base, original]]);
  const corrected = { ...original, color: 'white_blue', pattern: 'colorblock' };
  assert.equal(chooseReviewedJobKey(corrected, existing), `${base}-food-pouch-white-blue-colorblock`);
  assert.equal(existing.get(base), original);
});
test('an identical active group still requires reconciliation', () => {
  assert.throws(() => chooseReviewedJobKey(original, new Map([[base, original]])), /Unreconciled/);
});
test('superseded job history remains at its old filename', () => {
  const history = { ...original, status: 'superseded', approvedProductIds: [] };
  assert.equal(chooseReviewedJobKey(original, new Map([[base, history]])), `${base}-reviewed-2`);
});
