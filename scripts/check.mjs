import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const folder of ['src', 'scripts', 'test']) {
  for (const name of await readdir(new URL(`../${folder}/`, import.meta.url))) {
    if (!name.endsWith('.mjs')) continue;
    const result = spawnSync(process.execPath, ['--check', `${folder}/${name}`], { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
console.log('JavaScript syntax checks passed.');
