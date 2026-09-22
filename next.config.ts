import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Raw user logs and private offline indexes are runtime data, not deployment assets.
  // Only the approved aggregate catalog accompanies the recommendation endpoints.
  outputFileTracingIncludes: {
    '/api/recommendations': ['./.recommendation/catalog.json'],
    '/api/recommendations/status': ['./.recommendation/catalog.json'],
  },
  outputFileTracingExcludes: {
    '/*': ['./data/**/*.csv', './.recommendation/users/**/*', './.recommendation/samples.json', './.recommendation-*/**/*'],
  },
};

export default nextConfig;
