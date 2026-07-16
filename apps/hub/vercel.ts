import type { VercelConfig } from '@vercel/config/v1';

// Статический сайт, без шага сборки — index.html/styles.css/script.js
// раздаются как есть.
export const config: VercelConfig = {
  outputDirectory: '.',
};
