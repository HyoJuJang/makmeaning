import { defaultMode, readRecommendationIndex, readRecommendationProfile, readSampleProfile, sampleDomains } from './store.ts';
import { demoRecommendationProfile } from './personas.ts';
export const recommendationStore = {
  index: readRecommendationIndex,
  profile: (userId?: string) => demoRecommendationProfile(userId) ?? readRecommendationProfile(userId),
  sample: readSampleProfile, sampleDomains, defaultMode,
};
