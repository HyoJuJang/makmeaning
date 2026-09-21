'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { avatarSVG, type AvatarId, type AvatarOutfit } from '../../../app/avatar.js';
import { createAvatarMotionRunner, restingAvatar, type AvatarPositions } from '../../lib/scene/avatar-motion';

const STORAGE_KEY = 'gscene-main-v1';

type Appearance = { avatarId: AvatarId; outfitId: AvatarOutfit };
export type RoomAvatarProps = {
  fallbackAvatarId?: string;
  fallbackOutfitId?: string;
  category?: 'fashion' | 'living';
  outfitPreview?: 'knit' | 'shirt' | null;
  seated?: boolean;
  interactionKey?: number;
};

function positionsFor(category: 'fashion' | 'living', element?: HTMLElement | null): AvatarPositions {
  const css = element ? getComputedStyle(element) : null;
  const value = (name: string, fallback: number) => {
    const raw = css?.getPropertyValue(`--sc-avatar-${name}`).trim();
    if (!raw || !/^-?\d+(?:\.\d+)?%?$/.test(raw)) return fallback;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : fallback;
  };
  return {
    home: { x: value('home-x', category === 'fashion' ? 87 : 73), bottom: value('home-bottom', category === 'fashion' ? 3 : 1) },
    knit: { x: value('knit-x', 28), bottom: value('wardrobe-bottom', 3) },
    shirt: { x: value('shirt-x', 46), bottom: value('wardrobe-bottom', 3) },
    sofa: { x: value('sofa-x', 53), bottom: value('sofa-bottom', 32) },
  };
}

function canonicalAvatar(value: unknown): AvatarId | null {
  switch (value) {
    case 'm01': case 'short': return 'm01';
    case 'm02': case 'wave': return 'm02';
    case 'f01': case 'bob': return 'f01';
    case 'f02': return 'f02';
    default: return null;
  }
}

function readAppearance(fallback: AvatarId, outfit: AvatarOutfit): Appearance {
  const appearance: Appearance = { avatarId: fallback, outfitId: outfit };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return appearance;
    const record = saved as Record<string, unknown>;
    appearance.avatarId = canonicalAvatar(record.avatarId) ?? fallback;
    if (record.outfitId === 'base' || record.outfitId === 'knit' || record.outfitId === 'shirt') {
      appearance.outfitId = record.outfitId;
    }
  } catch { /* Missing, blocked or malformed storage keeps the safe defaults. */ }
  return appearance;
}

export default function RoomAvatar({ fallbackAvatarId, fallbackOutfitId, category = 'fashion', outfitPreview = null, seated = false, interactionKey = 0 }: RoomAvatarProps) {
  const fallback = canonicalAvatar(fallbackAvatarId) ?? 'm01';
  const fallbackOutfit: AvatarOutfit = fallbackOutfitId === 'knit' || fallbackOutfitId === 'shirt' ? fallbackOutfitId : 'base';
  // The initial render is identical on server and client; storage is read after hydration.
  const [appearance, setAppearance] = useState<Appearance>({ avatarId: fallback, outfitId: fallbackOutfit });
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visual, setVisual] = useState(() => restingAvatar(positionsFor(category).home, fallbackOutfit));
  const visualRef = useRef(visual);
  const elementRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const initialCommand = useRef({ category, outfitPreview, seated, interactionKey });
  const hasPreviewInteraction = useRef(interactionKey !== 0);

  useEffect(() => {
    const restore = () => { setAppearance(readAppearance(fallback, fallbackOutfit)); setReady(true); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) restore();
    };
    restore();
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', restore);
    };
  }, [fallback, fallbackOutfit]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const positions = positionsFor(category, elementRef.current);
    if (!initialized.current) {
      visualRef.current = restingAvatar(positions.home, appearance.outfitId);
      initialized.current = true;
    }
    if (initialCommand.current.outfitPreview !== outfitPreview || initialCommand.current.interactionKey !== interactionKey) {
      hasPreviewInteraction.current = true;
    }
    const preview = hasPreviewInteraction.current && (outfitPreview === 'knit' || outfitPreview === 'shirt') ? outfitPreview : null;
    const runner = createAvatarMotionRunner({
      now: () => performance.now(),
      request: callback => requestAnimationFrame(callback),
      cancel: id => cancelAnimationFrame(id),
    }, next => { visualRef.current = next; setVisual(next); });
    runner.run(visualRef.current, { category, outfit: appearance.outfitId, preview, seated, reduced, positions });
    return () => runner.cancel();
  }, [ready, category, outfitPreview, seated, interactionKey, appearance.outfitId, reduced]);

  const markup = useMemo(
    // Only allowlisted IDs reach the repository's trusted SVG renderer.
    () => avatarSVG(appearance.avatarId, visual.outfit, visual.direction, visual.frame, {
      pose: visual.pose, progress: visual.progress, seatProgress: visual.seatProgress, objectId: 'sofa', reduced,
    }),
    [appearance.avatarId, visual.outfit, visual.direction, visual.frame, visual.pose, visual.progress, visual.seatProgress, reduced],
  );

  const style = {
    '--sc-avatar-x': `${visual.x}%`, '--sc-avatar-bottom': `${visual.bottom}%`,
    left: 'var(--sc-avatar-x)', bottom: 'var(--sc-avatar-bottom)', right: 'auto', transform: 'translateX(-50%)',
  } as CSSProperties;

  return <div ref={elementRef} className="sc-room-avatar" style={style} role="img" aria-label="내 공간의 캐릭터" data-avatar={appearance.avatarId} data-outfit={visual.outfit} data-motion={visual.motion}>
    <svg viewBox="0 0 40 64" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: markup }} />
  </div>;
}
