import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  transpilePackages: [
    'database',
    'types',
    'shared',
    'telemetry',
    'config',
    'ai',
    'cache',
    'queues',
    'extraction',
    'media',
    'embeddings',
    'search'
  ]
};

export default nextConfig;
