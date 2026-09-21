import type { AvatarDirection, AvatarOutfit, AvatarRenderOptions } from '../../../app/avatar.js';

export type AvatarPoint = { x: number; bottom: number };
export type AvatarPositions = { home: AvatarPoint; knit: AvatarPoint; shirt: AvatarPoint; sofa: AvatarPoint };
export type AvatarMotionState = AvatarPoint & {
  outfit: AvatarOutfit;
  motion: 'walking' | 'changing' | 'seated' | 'idle';
  pose: NonNullable<AvatarRenderOptions['pose']>;
  direction: AvatarDirection;
  frame: number;
  progress: number;
  seatProgress: number;
};
export type AvatarMotionRequest = {
  category: 'fashion' | 'living';
  outfit: AvatarOutfit;
  preview: 'knit' | 'shirt' | null;
  seated: boolean;
  reduced: boolean;
  positions: AvatarPositions;
};
export type AvatarScheduler = {
  now: () => number;
  request: (callback: (time: number) => void) => number;
  cancel: (id: number) => void;
};

export function restingAvatar(point: AvatarPoint, outfit: AvatarOutfit, seated = false): AvatarMotionState {
  return { ...point, outfit, motion: seated ? 'seated' : 'idle', pose: seated ? 'seated-idle' : 'idle', direction: 'down', frame: 0, progress: 0, seatProgress: seated ? 1 : 0 };
}

type Segment = { duration: number; sample: (progress: number, elapsed: number) => AvatarMotionState };
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

function planMotion(from: AvatarMotionState, request: AvatarMotionRequest) {
  const segments: Segment[] = [];
  let cursor = { ...from };
  const targetOutfit = request.category === 'fashion' ? request.preview ?? request.outfit : request.outfit;
  const finish = restingAvatar(
    request.category === 'living' && request.seated ? request.positions.sofa : request.positions.home,
    targetOutfit,
    request.category === 'living' && request.seated,
  );

  const walk = (destination: AvatarPoint) => {
    const start = { ...cursor };
    const dx = destination.x - start.x, dy = destination.bottom - start.bottom;
    const distance = Math.hypot(dx, dy);
    if (distance < .05) { cursor = { ...cursor, ...destination }; return; }
    const direction: AvatarDirection = Math.abs(dx) > .1 ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'up' : 'down';
    segments.push({
      duration: Math.max(100, Math.min(1100, distance * 15)),
      sample: (progress, elapsed) => ({
        ...start, x: mix(start.x, destination.x, progress), bottom: mix(start.bottom, destination.bottom, progress),
        motion: 'walking', pose: 'idle', direction, frame: Math.floor(elapsed / 110) % 4, progress: 0, seatProgress: 0,
      }),
    });
    cursor = restingAvatar(destination, cursor.outfit);
  };

  const sit = (to: number) => {
    const start = { ...cursor };
    if (Math.abs(start.seatProgress - to) < .01) return;
    segments.push({
      duration: Math.max(100, Math.abs(start.seatProgress - to) * 420),
      sample: progress => ({
        ...start, motion: to ? 'seated' : 'walking', pose: to ? 'sit-down' : 'stand-up', direction: 'down', frame: 0,
        progress, seatProgress: mix(start.seatProgress, to, progress),
      }),
    });
    cursor = restingAvatar(cursor, cursor.outfit, to === 1);
  };

  if (request.category === 'living' && request.seated) {
    cursor.outfit = targetOutfit;
    if (Math.hypot(cursor.x - request.positions.sofa.x, cursor.bottom - request.positions.sofa.bottom) > .05) {
      sit(0);
      walk(request.positions.sofa);
    }
    sit(1);
  } else {
    sit(0);
    if (request.category === 'fashion' && request.preview) {
      walk(request.positions[request.preview]);
      const start = { ...cursor };
      segments.push({
        duration: 660,
        sample: progress => ({
          ...start, outfit: progress < .5 ? start.outfit : targetOutfit,
          motion: 'changing', pose: 'change-clothes', direction: 'down', frame: 0, progress, seatProgress: 0,
        }),
      });
      cursor = restingAvatar(cursor, targetOutfit);
    } else {
      // Leaving a preview immediately restores the stored outfit; it never changes the main-room store.
      cursor.outfit = targetOutfit;
    }
    walk(request.positions.home);
  }
  return { segments, finish };
}

/** One cancelable owner for frame updates; stale callbacks cannot finish a newer interaction. */
export function createAvatarMotionRunner(scheduler: AvatarScheduler, onFrame: (state: AvatarMotionState) => void) {
  let generation = 0;
  let pending: number | null = null;
  const cancel = () => {
    generation += 1;
    if (pending !== null) scheduler.cancel(pending);
    pending = null;
  };
  return {
    cancel,
    run(from: AvatarMotionState, request: AvatarMotionRequest) {
      cancel();
      const currentGeneration = generation;
      const { segments, finish } = planMotion(from, request);
      if (request.reduced || segments.length === 0) { onFrame(finish); return; }
      const started = scheduler.now();
      const tick = (now: number) => {
        if (currentGeneration !== generation) return;
        pending = null;
        let elapsed = Math.max(0, now - started);
        for (const segment of segments) {
          if (elapsed < segment.duration) {
            onFrame(segment.sample(elapsed / segment.duration, elapsed));
            if (currentGeneration === generation) pending = scheduler.request(tick);
            return;
          }
          elapsed -= segment.duration;
        }
        onFrame(finish);
      };
      tick(started);
    },
  };
}
