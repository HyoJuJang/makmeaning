import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activePersonaId, selectDemoPersona } from '../app/demo-persona.js';

test('only known demo characters can be selected; unrelated cookies are ignored', () => {
  for (const id of ['demo-f01', 'demo-f02', 'demo-m01', 'demo-m02']) {
    assert.equal(activePersonaId(`unrelated=value; gscene-persona=${id}; other=x`), id);
    const target = { cookie: '' };
    assert.equal(selectDemoPersona(id, target), true);
    assert.match(target.cookie, /Path=\/; Max-Age=31536000; SameSite=Lax$/);
    assert.equal(activePersonaId(target.cookie), id);
  }
  for (const value of ['', 'gscene-persona=real-user', 'gscene-persona=demo-m01%3B']) assert.equal(activePersonaId(value), 'demo-f01');
  const target = { cookie: 'keep=this' };
  assert.equal(selectDemoPersona('real-user', target), false);
  assert.equal(target.cookie, 'keep=this');
});

test('blocked cookie writes fail without claiming a character switch succeeded', () => {
  const denied = { get cookie() { return 'gscene-persona=demo-f01'; }, set cookie(value) {} };
  assert.equal(selectDemoPersona('demo-m02', denied), false);
  const unavailable = { get cookie() { throw new Error('blocked'); }, set cookie(value) { throw new Error('blocked'); } };
  assert.equal(selectDemoPersona('demo-m02', unavailable), false);
});
