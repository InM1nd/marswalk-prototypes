import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { BASE_PATH } from './src/app/drei-advent/lib/assets';

// Static export served by the monorepo hub at /advent (see ../../vercel.ts, ../../scripts/build-all.mjs).
const config: NextConfig = {
  output: 'export',
  basePath: BASE_PATH,
  trailingSlash: true,
  // Monorepo has a root lockfile too; pin the root so Turbopack doesn't guess.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  agentRules: false,
};

export default config;
