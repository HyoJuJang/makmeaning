import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Raw user logs and private offline indexes are runtime data, not deployment assets.
  outputFileTracingExcludes: {
    '/*': ['./data/**/*.csv', './.recommendation/**/*', './.recommendation-*/**/*'],
  },
};

export default nextConfig;
