// Production build: builds each Vite prototype under its own base path
// (wheel, scratch, runner, plinko, catch), then assembles hub + all app builds into
// one static dist/ so the suite ships as a single Vercel project (see vercel.ts).
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
build('runner', '/runner/');
build('plinko', '/plinko/');
build('catch', '/catch/');

cpSync(`${ROOT}apps/hub`, `${ROOT}dist`, { recursive: true });
cpSync(`${ROOT}apps/wheel/dist`, `${ROOT}dist/wheel`, { recursive: true });
cpSync(`${ROOT}apps/scratch/dist`, `${ROOT}dist/scratch`, { recursive: true });
cpSync(`${ROOT}apps/runner/dist`, `${ROOT}dist/runner`, { recursive: true });
cpSync(`${ROOT}apps/plinko/dist`, `${ROOT}dist/plinko`, { recursive: true });
cpSync(`${ROOT}apps/catch/dist`, `${ROOT}dist/catch`, { recursive: true });
