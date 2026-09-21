import { defaultMode, readRecommendationIndex, readRecommendationProfile, readSampleProfile, sampleDomains } from './store.ts';
export const recommendationStore = {
  index: readRecommendationIndex, profile: readRecommendationProfile,
  sample: readSampleProfile, sampleDomains, defaultMode,
};
