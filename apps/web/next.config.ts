import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
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
