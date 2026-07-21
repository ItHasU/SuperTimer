import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const swPath = fileURLToPath(new URL('../dist/sw.js', import.meta.url));
const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const content = readFileSync(swPath, 'utf8').replace(/__BUILD_ID__/g, buildId);
writeFileSync(swPath, content);

console.log(`sw.js estampillé avec le build ${buildId}`);
