import assert from 'node:assert/strict';
import test from 'node:test';
import { createAvatarMotionRunner, restingAvatar } from '../src/lib/scene/avatar-motion.ts';

const positions = {
  home: { x: 87, bottom: 3 }, knit: { x: 28, bottom: 3 },
  shirt: { x: 46, bottom: 3 }, sofa: { x: 53, bottom: 32 },
};
const request = overrides => ({ category: 'fashion', outfit: 'base', preview: 'knit', seated: false, reduced: false, positions, ...overrides });

function setup() {
  let now = 0, id = 0;
  const pending = new Map(), history = new Map(), states = [];
  const scheduler = {
    now: () => now,
    request: callback => { id += 1; pending.set(id, callback); history.set(id, callback); return id; },
    cancel: key => pending.delete(key),
  };
  const runner = createAvatarMotionRunner(scheduler, state => states.push(state));
  return {
    runner, states, pending,
    get last() { return states.at(-1); },
    get latestId() { return id; },
    advance(time) { now = time; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(now)); },
    deliverStale(key, time) { history.get(key)(time); },
  };
}

test('fashion walks to the selected garment, changes there, then returns wearing the preview', () => {
  const clock = setup();
  clock.runner.run(restingAvatar(positions.home, 'shirt'), request());
  assert.equal(clock.last.motion, 'walking');
  assert.equal(clock.last.direction, 'left');
  assert.equal(clock.last.outfit, 'shirt');
  clock.advance(900);
  assert.equal(clock.last.motion, 'changing');
  assert.equal(clock.last.x, positions.knit.x);
  assert.equal(clock.last.outfit, 'shirt');
  clock.advance(1300);
  assert.equal(clock.last.outfit, 'knit');
  clock.advance(1600);
  assert.equal(clock.last.motion, 'walking');
  assert.equal(clock.last.direction, 'right');
  clock.advance(4000);
  assert.deepEqual(clock.last, restingAvatar(positions.home, 'knit'));
  assert.equal(clock.pending.size, 0);
});

test('a rapid second selection starts at the current position and ignores stale callbacks', () => {
  const clock = setup();
  clock.runner.run(restingAvatar(positions.home, 'base'), request());
  clock.advance(300);
  const interrupted = clock.last, stale = clock.latestId;
  clock.runner.run(interrupted, request({ preview: 'shirt' }));
  assert.equal(clock.last.x, interrupted.x);
  const count = clock.states.length;
  clock.deliverStale(stale, 10000);
  assert.equal(clock.states.length, count);
  clock.advance(10000);
  assert.deepEqual(clock.last, restingAvatar(positions.home, 'shirt'));
});

test('clearing a preview restores the stored outfit even if the previous change is mid-flight', () => {
  const clock = setup();
  clock.runner.run(restingAvatar(positions.home, 'shirt'), request({ outfit: 'shirt' }));
  clock.advance(1300);
  assert.equal(clock.last.outfit, 'knit');
  const stale = clock.latestId;
  clock.runner.run(clock.last, request({ outfit: 'shirt', preview: null }));
  assert.equal(clock.last.outfit, 'shirt');
  clock.advance(6000);
  assert.deepEqual(clock.last, restingAvatar(positions.home, 'shirt'));
  clock.deliverStale(stale, 9000);
  assert.equal(clock.last.outfit, 'shirt');
});

test('living approaches the sofa, sits, then stands and returns without losing its outfit', () => {
  const clock = setup();
  const livingPositions = { ...positions, home: { x: 73, bottom: 1 } };
  const sitRequest = request({ category: 'living', preview: null, outfit: 'shirt', seated: true, positions: livingPositions });
  clock.runner.run(restingAvatar(livingPositions.home, 'shirt'), sitRequest);
  clock.advance(650);
  assert.equal(clock.last.pose, 'sit-down');
  assert.ok(clock.last.seatProgress > 0 && clock.last.seatProgress < 1);
  clock.advance(2000);
  assert.deepEqual(clock.last, restingAvatar(livingPositions.sofa, 'shirt', true));
  clock.runner.run(clock.last, { ...sitRequest, seated: false });
  assert.equal(clock.last.pose, 'stand-up');
  clock.advance(2300);
  assert.ok(clock.last.seatProgress > 0 && clock.last.seatProgress < 1);
  clock.advance(5000);
  assert.deepEqual(clock.last, restingAvatar(livingPositions.home, 'shirt'));
});

test('a fast sit/stand reversal cancels the old arrival instead of seating later', () => {
  const clock = setup();
  const sitRequest = request({ category: 'living', preview: null, seated: true });
  clock.runner.run(restingAvatar(positions.home, 'base'), sitRequest);
  clock.advance(200);
  const stale = clock.latestId;
  clock.runner.run(clock.last, { ...sitRequest, seated: false });
  clock.advance(2000);
  assert.deepEqual(clock.last, restingAvatar(positions.home, 'base'));
  const count = clock.states.length;
  clock.deliverStale(stale, 3000);
  assert.equal(clock.states.length, count);
});

test('reduced motion settles immediately for outfit and sitting requests', () => {
  const clock = setup();
  clock.runner.run(restingAvatar(positions.home, 'base'), request({ reduced: true }));
  assert.deepEqual(clock.last, restingAvatar(positions.home, 'knit'));
  assert.equal(clock.pending.size, 0);
  clock.runner.run(clock.last, request({ category: 'living', preview: null, outfit: 'shirt', seated: true, reduced: true }));
  assert.deepEqual(clock.last, restingAvatar(positions.sofa, 'shirt', true));
  assert.equal(clock.pending.size, 0);
});

test('canceling on unmount prevents even an already-delivered frame from writing state', () => {
  const clock = setup();
  clock.runner.run(restingAvatar(positions.home, 'base'), request());
  const stale = clock.latestId, count = clock.states.length;
  clock.runner.cancel();
  assert.equal(clock.pending.size, 0);
  clock.deliverStale(stale, 9000);
  assert.equal(clock.states.length, count);
});

test('a deliberate repeat of the same outfit can replay the complete interaction', () => {
  const clock = setup();
  clock.runner.run(restingAvatar(positions.home, 'knit'), request());
  assert.equal(clock.last.motion, 'walking');
  clock.advance(4000);
  clock.runner.run(clock.last, request());
  assert.equal(clock.last.motion, 'walking');
  clock.advance(8000);
  assert.deepEqual(clock.last, restingAvatar(positions.home, 'knit'));
});


test('owned wear uses the selected hanger location and commits only after the complete sequence', () => {
  const clock = setup(); let committed = 0;
  const target = { x: 65, bottom: 3 };
  clock.runner.run(restingAvatar(positions.home, 'base'), request({ preview: 'mapped:shirt:white:solid', garmentTarget: target }), () => committed++);
  clock.advance(500);
  assert.equal(clock.last.motion, 'changing');
  assert.equal(clock.last.x, target.x);
  assert.equal(committed, 0);
  clock.advance(900);
  assert.equal(clock.last.outfit, 'mapped:shirt:white:solid');
  assert.equal(committed, 0);
  const stale = clock.latestId;
  clock.advance(4000);
  assert.equal(committed, 1);
  clock.deliverStale(stale, 9000);
  assert.equal(committed, 1);
});

test('cancel and rapid reselection never commit a superseded owned garment', () => {
  const clock = setup(); const committed = [];
  clock.runner.run(restingAvatar(positions.home, 'base'), request(), () => committed.push('first'));
  clock.advance(400);
  const stale = clock.latestId;
  clock.runner.run(clock.last, request({ preview: 'shirt' }), () => committed.push('latest'));
  clock.deliverStale(stale, 8000);
  clock.advance(4000);
  assert.deepEqual(committed, ['latest']);
  clock.runner.run(clock.last, request(), () => committed.push('cancelled'));
  clock.advance(4300);
  const cancelled = clock.latestId;
  clock.runner.cancel();
  clock.deliverStale(cancelled, 9000);
  assert.deepEqual(committed, ['latest']);
});

test('reduced-motion explicit wear completes exactly once', () => {
  const clock = setup(); let committed = 0;
  clock.runner.run(restingAvatar(positions.home, 'base'), request({ reduced: true }), () => committed++);
  assert.equal(committed, 1);
  assert.equal(clock.pending.size, 0);
});
