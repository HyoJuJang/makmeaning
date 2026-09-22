export const EATING_DURATION:number;
export const REDUCED_EATING_DURATION:number;

export function foodConsumptionMode(product?: {category?: string; illustrationKey?: string; gameAsset?: {status?: string; domain?: string; familyId?: string} | null} | null): 'eat' | 'drink';
export function foodActionLabel(product: Parameters<typeof foodConsumptionMode>[0]): '먹기' | '마시기';
