import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@treaty/shared'],
  turbopack: {
    root: path.resolve(__dirname, '..'),
    watchOptions: {
      ignored: ['**/node_modules', '**/.git', '**/.next'],
    },
  },
};

export default nextConfig;
