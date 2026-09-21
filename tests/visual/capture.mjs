/** CUA-only capture helpers. Import in the CUA REPL; pass its existing tab. */
import * as fs from 'node:fs/promises';
import path from 'node:path';

const actor = (attrs = '') => `.walker${attrs}`;
const engaged = object => actor(`[data-object="${object}"][data-phase="engaged"]`);
const midDoor = object => `[data-object-art="${object}"]:not([data-open="0.000"]):not([data-open="1.000"])`;
const pose = (object, value) => actor(`[data-object="${object}"][data-pose="${value}"]`);

// V10 has two required files. Transient states may need another real UI attempt.
export const STATES = Object.freeze({
  V01: { name: 'default-idle', selector: actor('[data-primary="idle"][data-object=""]'), actor: { primary: 'idle', object: '' } },
  V02: { name: 'walking', selector: actor('[data-moving="true"]'), actor: { moving: 'true' }, transient: true },
  V03: { name: 'wardrobe-browsing', selector: pose('wardrobe', 'browse'), actor: { object: 'wardrobe', pose: 'browse' }, transient: true },
  V04: { name: 'outfit-changed', selector: actor('[data-primary="idle"][aria-label*="블루 셔츠"]'), actor: { primary: 'idle' }, outfitContains: '블루 셔츠' },
  V05: { name: 'fridge-open', selector: engaged('fridge'), actor: { object: 'fridge', phase: 'engaged' }, open: { fridge: 1 } },
  V06: { name: 'sofa-sitting', selector: engaged('sofa'), actor: { primary: 'sitting_sofa', object: 'sofa' } },
  V07: { name: 'vanity-sitting', selector: engaged('vanity'), actor: { primary: 'sitting_vanity', object: 'vanity' } },
  V08: { name: 'vanity-interaction', selector: pose('vanity', 'use-cosmetic'), actor: { primary: 'using_cosmetic', object: 'vanity' }, transient: true },
  V09: { name: 'window-open', selector: engaged('window'), actor: { object: 'window', phase: 'engaged' }, open: { window: 1 } },
  V10_ON: { name: 'lamp-on', selector: 'button.lamp-target[aria-label="스탠드 조명 끄기"]', lampOn: true },
  V10_OFF: { name: 'lamp-off', selector: 'button.lamp-target[aria-label="스탠드 조명 켜기"]', lampOn: false },
  V11: { name: 'products-room', selector: actor('[data-primary="idle"][data-object=""]'), actor: { primary: 'idle', object: '' }, products: ['knit', 'shirt', 'milk', 'water', 'vitamin', 'cushion', 'lamp', 'serum', 'cream'] },
  WARDROBE_OPEN: { name: 'wardrobe-open', selector: engaged('wardrobe'), actor: { object: 'wardrobe', phase: 'engaged' }, open: { wardrobe: 1 } },
  MID_WARDROBE: { name: 'wardrobe-opening', selector: midDoor('wardrobe'), openBetween: 'wardrobe', transient: true },
  MID_FRIDGE: { name: 'fridge-opening', selector: midDoor('fridge'), openBetween: 'fridge', transient: true },
  MID_SOFA_SIT: { name: 'sofa-sit-down', selector: pose('sofa', 'sit-down'), actor: { object: 'sofa', pose: 'sit-down' }, transient: true },
  MID_SOFA_STAND: { name: 'sofa-stand-up', selector: pose('sofa', 'stand-up'), actor: { object: 'sofa', pose: 'stand-up' }, transient: true },
  MID_VANITY_SIT: { name: 'vanity-sit-down', selector: pose('vanity', 'sit-down'), actor: { object: 'vanity', pose: 'sit-down' }, transient: true },
  MID_VANITY_STAND: { name: 'vanity-stand-up', selector: pose('vanity', 'stand-up'), actor: { object: 'vanity', pose: 'stand-up' }, transient: true },
  MID_OUTFIT: { name: 'outfit-change', selector: pose('wardrobe', 'change-clothes'), actor: { pose: 'change-clothes' }, transient: true },
  MID_WINDOW: { name: 'window-moving', selector: midDoor('window'), openBetween: 'window', transient: true },
  MID_LAMP: { name: 'lamp-reach', selector: pose('lamp', 'reach'), actor: { object: 'lamp', pose: 'reach' }, transient: true },
  BED: { name: 'bed-lying', selector: actor('[data-primary="lying_bed"]'), actor: { primary: 'lying_bed' } },
  MID_BED: { name: 'bed-lie-down', selector: pose('bed', 'lie-down'), actor: { object: 'bed', pose: 'lie-down' }, transient: true },
});

export async function readVisualState(tab) {
  return tab.playwright.evaluate(() => {
    const bounds = el => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    const actor = document.querySelector('.walker');
    const roomImage = document.querySelector('.room-art');
    const lampLabel = document.querySelector('button.lamp-target')?.getAttribute('aria-label') || '';
    const products = [...document.querySelectorAll('#house [data-room-product], #house [data-product]')].map(el => ({
      id: el.getAttribute('data-room-product') || el.getAttribute('data-product'),
      slot: el.getAttribute('data-room-slot'),
      opacity: getComputedStyle(el).opacity,
      bounds: bounds(el),
    }));
    return {
      observedAt: new Date().toISOString(),
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      scroll: { x: scrollX, y: scrollY },
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      visualQaMotionScale: Number(document.querySelector('#app')?.dataset.visualQaMotionScale || 1),
      homeState: document.querySelector('#app')?.dataset.homeState,
      actor: actor ? { ...actor.dataset } : null,
      outfitLabel: actor?.getAttribute('aria-label') || '',
      actorBounds: bounds(actor),
      roomBounds: bounds(document.querySelector('.house-wrap')),
      roomImage: roomImage ? { complete: roomImage.complete, naturalWidth: roomImage.naturalWidth, naturalHeight: roomImage.naturalHeight, bounds: bounds(roomImage), src: roomImage.currentSrc || roomImage.src } : null,
      avatarImageHrefs: [...document.querySelectorAll('.walker svg image')].map(el => el.getAttribute('href')),
      tray: { ...document.querySelector('.context-tray')?.dataset },
      trayBounds: bounds(document.querySelector('.context-tray')),
      trayTitle: document.querySelector('#tray-title')?.textContent || '',
      open: Object.fromEntries([...document.querySelectorAll('[data-object-art][data-open]')].map(el => [el.dataset.objectArt, Number(el.dataset.open)])),
      lampOn: lampLabel === '스탠드 조명 끄기',
      lampLabel,
      windowLabel: document.querySelector('button.window-target')?.getAttribute('aria-label') || '',
      beautyLabel: document.querySelector('.beauty-selection')?.textContent?.trim() || '',
      heldProduct: Boolean(document.querySelector('.avatar-held-product')),
      products,
      dialog: document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby') || null,
    };
  });
}

function mismatches(state, spec, viewport) {
  const reasons = [];
  if (state.homeState !== 'ready') reasons.push(`homeState=${state.homeState}`);
  if (!state.roomImage?.complete || !(state.roomImage?.naturalWidth > 0)) reasons.push('room background image not loaded');
  if (state.viewport.width !== viewport.width || state.viewport.height !== viewport.height) reasons.push(`viewport=${state.viewport.width}x${state.viewport.height}`);
  for (const [key, value] of Object.entries(spec.actor || {})) {
    if (state.actor?.[key] !== value) reasons.push(`actor.${key}=${state.actor?.[key]} (expected ${value})`);
  }
  for (const [key, value] of Object.entries(spec.open || {})) {
    if (Math.abs(state.open[key] - value) > .001 || !Number.isFinite(state.open[key])) reasons.push(`${key}.open=${state.open[key]}`);
  }
  if (spec.openBetween && !(state.open[spec.openBetween] > 0 && state.open[spec.openBetween] < 1)) reasons.push(`${spec.openBetween} was not mid-transition`);
  if (spec.lampOn !== undefined && state.lampOn !== spec.lampOn) reasons.push(`lampOn=${state.lampOn}`);
  if (spec.outfitContains && !state.outfitLabel.includes(spec.outfitContains)) reasons.push(`outfit=${state.outfitLabel}`);
  for (const id of spec.products || []) if (!state.products.some(p => p.id === id)) reasons.push(`missing product DOM: ${id}`);
  if (state.dialog) reasons.push('modal obscures the room');
  return reasons;
}

// CUA may return PNG or JPEG regardless of the caller's preferred filename.
function imageInfo(bytes) {
  if (bytes.length >= 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: 'png', extension: 'png', width: header.getUint32(16), height: header.getUint32(20) };
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    const sof = new Set([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]);
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 216) continue;
      const length = bytes[offset] * 256 + bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) break;
      if (sof.has(marker) && length >= 7) return { format: 'jpeg', extension: 'jpg', width: bytes[offset + 5] * 256 + bytes[offset + 6], height: bytes[offset + 3] * 256 + bytes[offset + 4] };
      offset += length;
    }
    return { format: 'jpeg', extension: 'jpg', width: null, height: null };
  }
  return { format: 'unknown', extension: 'bin', width: null, height: null };
}

/** No page mutation: caller creates all states through normal CUA UI actions. */
export async function createVisualHarness({ tab, outputDir, round = 'round-1', viewport = { width: 390, height: 844 } }) {
  if (!tab?.playwright || !tab?.screenshot) throw new TypeError('Pass an existing CUA tab handle');
  if (!path.isAbsolute(outputDir)) throw new TypeError('outputDir must be absolute');
  if (!/^[a-zA-Z0-9_-]+$/.test(round)) throw new TypeError('Use a simple round name');
  const folder = path.join(outputDir, round);
  await fs.mkdir(folder, { recursive: true });
  const entries = [];

  const capture = async (id, options = {}) => {
    const spec = { ...STATES[id], ...options.expect };
    if (!spec.name || !spec.selector) throw new TypeError(`Unknown capture state: ${id}`);
    const startedAt = new Date().toISOString();
    let waitError = null;
    try {
      await tab.playwright.locator(spec.selector).waitFor({ state: 'attached', timeoutMs: options.timeoutMs || 3000 });
    } catch (error) { waitError = String(error?.message || error).slice(0, 800); }
    const before = await readVisualState(tab);
    const bytes = await tab.screenshot({ fullPage: false, ...(options.clip ? { clip: options.clip } : {}) });
    const after = await readVisualState(tab);
    const image = imageInfo(bytes);
    const expectedImage = { width: Math.round((options.clip?.width || viewport.width) * before.viewport.dpr), height: Math.round((options.clip?.height || viewport.height) * before.viewport.dpr) };
    const reasons = [
      ...(waitError ? ['waitFor did not observe the target state'] : []),
      ...(image.width !== expectedImage.width || image.height !== expectedImage.height ? [`Image dimensions ${image.width}x${image.height} (expected ${expectedImage.width}x${expectedImage.height}; format ${image.format})`] : []),
      ...mismatches(before, spec, viewport).map(reason => `before: ${reason}`),
      ...mismatches(after, spec, viewport).map(reason => `after: ${reason}`),
    ];
    const captured = reasons.length === 0;
    const timestamp = startedAt.replace(/[:.]/g, '-');
    const filename = `${id}-${spec.name}-${timestamp}${captured ? '' : '-MISSED'}.${image.extension}`;
    const screenshot = path.join(folder, filename);
    const entry = {
      id, name: spec.name, round, screenshot, startedAt, completedAt: new Date().toISOString(),
      captureStatus: captured ? 'captured' : 'missed',
      visualVerdict: 'NOT_REVIEWED',
      transient: Boolean(spec.transient),
      notes: options.notes || '',
      expected: spec, reasons, waitError, clip: options.clip || null, image, expectedImage, before, after,
    };
    await fs.writeFile(screenshot, bytes);
    await fs.writeFile(screenshot.replace(/\.[^.]+$/, '.json'), JSON.stringify(entry, null, 2) + '\n');
    entries.push(entry);
    await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify({ round, viewport, entries }, null, 2) + '\n');
    return { id, captureStatus: entry.captureStatus, visualVerdict: entry.visualVerdict, screenshot, reasons };
  };

  return {
    capture,
    read: () => readVisualState(tab),
    waitFor: id => tab.playwright.locator(STATES[id].selector).waitFor({ state: 'attached', timeoutMs: 3000 }),
    // Keep trigger + transient capture in one CUA call to avoid model/tool latency.
    captureAfter: async (id, trigger, options) => { await trigger(); return capture(id, options); },
    summary: () => entries.map(({ id, captureStatus, visualVerdict, screenshot, reasons }) => ({ id, captureStatus, visualVerdict, screenshot, reasons })),
  };
}
