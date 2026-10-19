import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { UI, Cancelled, clean, commandText } from '../src/ui.mjs';
import { execute, parseStatus, pushArgs, pullArgs, githubRepository, errorHint, UserError } from '../src/git.mjs';
import { assertSafeFiles, sensitivePath, selectFiles } from '../src/safety.mjs';
import { applyPlan, VERSION } from '../src/app.mjs';
import { setLanguage } from '../src/i18n.mjs';

setLanguage('tr');

test('bounded commands terminate a stalled child rather than leave it running', async () => {
  const started = Date.now();
  const result = await execute(process.execPath, ['-e', 'setInterval(() => {}, 1000)'],
    { allowFailure: true, timeoutMs: 100 });
  assert.notEqual(result.code, 0);
  assert.ok(Date.now() - started < 5000);
});

test('porcelain parser preserves spaces, Unicode, newlines and rename pairs', () => {
  const files = parseStatus(' M boş luk.txt\0?? yeni\nsatır.txt\0R  yeni.txt\0eski.txt\0UU conflict.txt\0');
  assert.equal(files.length, 4);
  assert.equal(files[0].path, 'boş luk.txt');
  assert.equal(files[1].path, 'yeni\nsatır.txt');
  assert.equal(files[2].originalPath, 'eski.txt');
  assert.equal(files[2].staged, true);
  assert.equal(files[3].conflict, true);
});

test('push always specifies one exact source and same-named destination', () => {
  assert.deepEqual(pushArgs('origin', 'ozellik/tema'), ['push', '--set-upstream', '--no-follow-tags', '--recurse-submodules=no', '--', 'origin', 'refs/heads/ozellik/tema:refs/heads/ozellik/tema']);
  for (const invalid of ['--all', 'bad:main', 'bad branch', 'bad\nbranch']) assert.throws(() => pushArgs('origin', invalid), UserError);
  assert.throws(() => pushArgs('--mirror', 'main'), UserError);
});

test('pull is fast-forward only and explicitly disables rebase', () => {
  assert.deepEqual(pullArgs('origin', 'main'), ['pull', '--ff-only', '--no-rebase', '--', 'origin', 'refs/heads/main']);
  assert.throws(() => pullArgs('origin', '--all'), UserError);
});

test('GitHub addresses accept HTTPS/SSH without embedded credentials', () => {
  for (const url of ['https://github.com/octo/proje', 'https://github.com/octo/proje.git', 'git@github.com:octo/proje.git']) {
    assert.equal(githubRepository(url).fullName, 'octo/proje');
  }
  for (const url of ['https://token@github.com/octo/proje', 'https://evil.test/octo/proje', 'file:///tmp/repo', '--push', 'https://github.com/octo/..']) {
    assert.throws(() => githubRepository(url), UserError);
  }
});

test('filename heuristics block likely credentials, allow environment examples', () => {
  for (const path of ['.env', 'app/.env.local', 'id_rsa', 'keys/private.pem', 'credentials.json', '.npmrc']) assert.equal(sensitivePath(path), true, path);
  for (const path of ['.env.example', 'app/.env.template', 'README.md', 'src/key.mjs']) assert.equal(sensitivePath(path), false, path);
  assert.throws(() => assertSafeFiles([{ path: '.env', code: '??' }]), /Özel bilgi/);
  assert.throws(() => assertSafeFiles([{ path: 'harmless', originalPath: '.env', code: 'R ' }]), /Özel bilgi/);
});

test('file selection is explicit, deduplicated and bounds checked', () => {
  const files = [{ path: 'one' }, { path: 'two' }, { path: 'three' }];
  assert.deepEqual(selectFiles('3,1,3', files), [files[2], files[0]]);
  assert.deepEqual(selectFiles('hepsi', files), files);
  for (const input of ['0', '4', '-1', '', '1,no', '1.5']) assert.throws(() => selectFiles(input, files), UserError);
});

test('terminal output removes escape codes and redacts common credentials', () => {
  assert.ok(!clean('\x1b[2Jdanger').includes('\x1b'));
  assert.ok(!clean('https://person:password@github.com/test/repo').includes('password'));
  assert.ok(!clean('ghp_fakeexample123').includes('fakeexample'));
  assert.match(commandText('git', ['commit', '-m', 'merhaba dünya']), /'merhaba dünya'/);
  assert.ok(commandText('git', ['add', '--', '$(example).txt']).endsWith("'$(example).txt'"));
});

test('UI buffers piped lines and EOF cancels instead of consenting', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const ui = new UI({ input, output });
  input.end('1\nevet\n');
  assert.equal(await ui.choose('Seç', [{ id: 'ok', label: 'Tamam' }]), 'ok');
  assert.equal(await ui.confirm(), true);
  await assert.rejects(() => ui.ask('Başka?'), Cancelled);
  ui.close();
});

test('invalid menu choices reprompt and blank confirmation defaults to no', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const ui = new UI({ input, output });
  input.end('99\nwrong\n1\n\n');
  assert.equal(await ui.choose('Seç', [{ id: 'ok', label: 'Tamam' }]), 'ok');
  assert.equal(await ui.confirm(), false);
  ui.close();
});

test('dry-run and denied confirmation execute no command', async () => {
  let confirms = 0;
  const ui = { title() {}, note() {}, write() {}, async confirm() { confirms++; return false; } };
  const command = { program: 'this-program-must-never-run', args: [] };
  assert.equal(await applyPlan({ ui, dryRun: true }, process.cwd(), 'preview', [command]), false);
  assert.equal(confirms, 0);
  assert.equal(await applyPlan({ ui, dryRun: false }, process.cwd(), 'deny', [command]), false);
  assert.equal(confirms, 1);
});

test('Git errors give actionable explanations', () => {
  assert.match(errorHint(new Error('fatal: Authentication failed')), /githelp login/);
  assert.match(errorHint(new Error('git@github.com: Permission denied (publickey)')), /SSH anahtarı/);
  assert.match(errorHint(new Error('fatal: Not possible to fast-forward')), /ayrı ayrı/);
  assert.match(errorHint(new Error('non-fast-forward rejected')), /force push/i);
  assert.match(errorHint(new Error('remote rejected: GH013 repository rule violations')), /özellik dalı/);
});

test('runtime and npm package share the same version', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, VERSION);
});

test('UI restores input after a failed interactive child', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const ui = new UI({ input, output });
  await assert.rejects(() => ui.withTerminal(async () => { throw new Error('synthetic child failure'); }), /synthetic child failure/);
  input.end('yes\n');
  assert.equal(await ui.confirm(), true);
  ui.close();
});

test('interactive runner enables prompts and cleans up its signal listener', async () => {
  const before = process.listenerCount('SIGINT');
  const result = await execute(process.execPath, ['--eval', 'process.exit(process.env.GH_PROMPT_DISABLED === undefined ? 0 : 1)'],
    { interactive: true, env: { GH_PROMPT_DISABLED: '1' } });
  assert.equal(result.code, 0);
  assert.equal(process.listenerCount('SIGINT'), before);
});
