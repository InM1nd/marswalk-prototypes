import type { VercelConfig } from '@vercel/config/v1';

// Single Vercel project for the whole thing: hub + wheel + scratch + runner + plinko + catch + advent + yamaha-beats
// built into one dist/ (see scripts/build-all.mjs). Rewrites cover client-side
// routes with no matching static file — e.g. /scratch/lotto, which the
// scratch SPA resolves from window.location.pathname at runtime.
export const config: VercelConfig = {
  buildCommand: 'node scripts/build-all.mjs',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/wheel/:path*', destination: '/wheel/index.html' },
    { source: '/scratch/:path*', destination: '/scratch/index.html' },
    { source: '/runner/:path*', destination: '/runner/index.html' },
    { source: '/plinko/:path*', destination: '/plinko/index.html' },
    { source: '/catch/:path*', destination: '/catch/index.html' },
    { source: '/advent/:path*', destination: '/advent/index.html' },
    // embeddable widget; without this, /yamaha-beats/mini (no slash) would fall through to the studio
    { source: '/yamaha-beats/mini', destination: '/yamaha-beats/mini/index.html' },
    { source: '/yamaha-beats/drums', destination: '/yamaha-beats/drums/index.html' },
    { source: '/yamaha-beats/:path*', destination: '/yamaha-beats/index.html' },
  ],
};
