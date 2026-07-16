import type { VercelConfig } from '@vercel/config/v1';

// Single Vercel project for the whole thing: hub + wheel + scratch built
// into one dist/ (see scripts/build-all.mjs). Rewrites cover client-side
// routes with no matching static file — e.g. /scratch/lotto, which the
// scratch SPA resolves from window.location.pathname at runtime.
export const config: VercelConfig = {
  buildCommand: 'node scripts/build-all.mjs',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/wheel/:path*', destination: '/wheel/index.html' },
    { source: '/scratch/:path*', destination: '/scratch/index.html' },
  ],
};
