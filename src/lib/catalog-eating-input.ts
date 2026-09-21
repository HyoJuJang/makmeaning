type VerticalBounds = { top: number; bottom: number };
export type EatingPointer = { clientX: number; clientY: number; timeStamp: number; detail: number };

/** Reveal the illustrated action only when some of it is outside the usable viewport. */
export function roomArtworkIsVisible(room: VerticalBounds, viewport: VerticalBounds) {
  return room.top >= viewport.top && room.bottom <= viewport.bottom;
}

/** A second physical click must not hit a different control after an instant reveal. */
export function repeatedEatingPointer(start: EatingPointer | null, next: EatingPointer) {
  if (!start || start.detail < 1 || next.detail < 1) return false;
  const elapsed = next.timeStamp - start.timeStamp;
  return elapsed >= 0 && elapsed <= 450
    && Math.hypot(next.clientX - start.clientX, next.clientY - start.clientY) <= 10;
}
