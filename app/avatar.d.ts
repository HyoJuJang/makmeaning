export type AvatarId = 'm01' | 'm02' | 'f01' | 'f02';
export type AvatarOutfit = 'base' | 'knit' | 'shirt';
export type AvatarDirection = 'up' | 'left' | 'right' | 'down';

export interface AvatarDefinition {
  id: AvatarId;
  name: string;
  note: string;
  pants: string;
}

export interface AvatarRenderOptions {
  pose?: 'eat' | 'idle' | 'sit-down' | 'stand-up' | 'seated-idle' | 'use-cosmetic' | 'browse' | 'reach' | 'change-clothes';
  progress?: number;
  seatProgress?: number;
  reduced?: boolean;
  objectId?: string;
  heldProductId?: string;
}

export const AVATARS: AvatarDefinition[];
export function avatarById(id?: string): AvatarDefinition;
export function avatarSVG(
  id: string,
  outfit?: AvatarOutfit,
  direction?: AvatarDirection,
  frame?: number,
  options?: AvatarRenderOptions,
): string;
