'use client';

import { useEffect, useMemo, useState } from 'react';
import { avatarSVG, type AvatarId, type AvatarOutfit } from '../../../app/avatar.js';

const STORAGE_KEY = 'gscene-main-v1';

type Appearance = { avatarId: AvatarId; outfitId: AvatarOutfit };

function canonicalAvatar(value: unknown): AvatarId | null {
  switch (value) {
    case 'm01': case 'short': return 'm01';
    case 'm02': case 'wave': return 'm02';
    case 'f01': case 'bob': return 'f01';
    case 'f02': return 'f02';
    default: return null;
  }
}

function readAppearance(fallback: AvatarId): Appearance {
  const appearance: Appearance = { avatarId: fallback, outfitId: 'base' };
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

export default function RoomAvatar({ fallbackAvatarId }: { fallbackAvatarId?: string }) {
  const fallback = canonicalAvatar(fallbackAvatarId) ?? 'm01';
  // The initial render is identical on server and client; storage is read after hydration.
  const [appearance, setAppearance] = useState<Appearance>({ avatarId: fallback, outfitId: 'base' });

  useEffect(() => {
    const restore = () => setAppearance(readAppearance(fallback));
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
  }, [fallback]);

  const markup = useMemo(
    // Only allowlisted IDs reach the repository's trusted SVG renderer.
    () => avatarSVG(appearance.avatarId, appearance.outfitId, 'down', 0, { pose: 'idle', reduced: true }),
    [appearance.avatarId, appearance.outfitId],
  );

  return <div className="sc-room-avatar" role="img" aria-label="내 공간의 캐릭터" data-avatar={appearance.avatarId} data-outfit={appearance.outfitId}>
    <svg viewBox="0 0 40 64" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: markup }} />
  </div>;
}
