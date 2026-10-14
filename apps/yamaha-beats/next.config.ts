import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

// Static export served by the monorepo hub at /yamaha-beats (see ../../vercel.ts, ../../scripts/build-all.mjs).
const config: NextConfig = {
  output: 'export',
  basePath: '/yamaha-beats',
  trailingSlash: true,
  // Monorepo has a root lockfile too; pin the root so Turbopack doesn't guess.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  agentRules: false,
};

export default config;
