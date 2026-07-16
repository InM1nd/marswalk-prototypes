// Production build: builds wheel and scratch as standalone Vite apps (each
// under its own base path), then assembles hub + both builds into one
// static dist/ so the whole thing ships as a single Vercel project.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function build(app, basePath) {
  const cwd = `${ROOT}apps/${app}`;
  execSync('npm install', { cwd, stdio: 'inherit' });
  execSync('npm run build', { cwd, stdio: 'inherit', env: { ...process.env, VITE_BASE_PATH: basePath } });
}

rmSync(`${ROOT}dist`, { recursive: true, force: true });
mkdirSync(`${ROOT}dist`);

build('wheel', '/wheel/');
build('scratch', '/scratch/');

cpSync(`${ROOT}apps/hub`, `${ROOT}dist`, { recursive: true });
cpSync(`${ROOT}apps/wheel/dist`, `${ROOT}dist/wheel`, { recursive: true });
cpSync(`${ROOT}apps/scratch/dist`, `${ROOT}dist/scratch`, { recursive: true });
