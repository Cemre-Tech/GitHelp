import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, lstat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { login } from '../src/auth.mjs';
import { setLanguage } from '../src/i18n.mjs';

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
const isolatedConfig = fileURLToPath(new URL('./fixtures/empty.gitconfig', import.meta.url));

async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'githelp-'));
  t.after(async () => {
    const absolute = resolve(root);
    assert.ok(absolute.startsWith(resolve(tmpdir()) + sep) && basename(absolute).startsWith('githelp-'));
    await rm(absolute, { recursive: true, force: true, maxRetries: 3 });
  });
  return root;
}

function command(program, args, cwd, input = '', extraEnv = {}) {
  return new Promise((resolveResult, reject) => {
    const env = { ...process.env, GIT_CONFIG_GLOBAL: isolatedConfig, GIT_CONFIG_NOSYSTEM: '1',
      GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'Test User', GIT_AUTHOR_EMAIL: 'test@example.invalid',
      GIT_COMMITTER_NAME: 'Test User', GIT_COMMITTER_EMAIL: 'test@example.invalid', NO_COLOR: '1', GITHELP_LANG: 'tr', ...extraEnv };
    for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS']) delete env[key];
    const child = spawn(program, args, { cwd, env, windowsHide: true, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', data => { stdout += data; });
    child.stderr.setEncoding('utf8').on('data', data => { stderr += data; });
    child.on('error', reject);
    child.stdin.on('error', () => {});
    child.on('close', code => resolveResult({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

async function git(cwd, ...args) {
  const result = await command('git', args, cwd);
  assert.equal(result.code, 0, `${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}

function run(cwd, args = [], input = '', entry = cli, env = {}) { return command(process.execPath, [entry, ...args], cwd, input, env); }

async function repo(t, { initial = true } = {}) {
  const root = await workspace(t);
  await git(root, 'init', '--initial-branch=main');
  await git(root, 'config', 'user.name', 'Test User');
  await git(root, 'config', 'user.email', 'test@example.invalid');
  if (initial) {
    await writeFile(join(root, 'README.md'), '# Test\n');
    await git(root, 'add', 'README.md');
    await git(root, 'commit', '-m', 'Initial');
  }
  return root;
}

async function localRemote(t) {
  const root = await repo(t);
  const container = await workspace(t);
  const remote = join(container, 'remote.git');
  await git(container, 'init', '--bare', '--initial-branch=main', remote);
  await git(root, 'remote', 'add', 'origin', remote);
  return { root, remote, container };
}

test('help and demo work outside Git without installing anything', async t => {
  const root = await workspace(t);
  for (const args of [['--help'], ['demo'], ['--version']]) {
    const result = await run(root, args);
    assert.equal(result.code, 0, result.stdout);
  }
  assert.equal(await lstat(join(root, '.git')).then(() => true, () => false), false);
});

test('init requires approval, creates main, and dry-run writes nothing', async t => {
  const root = await workspace(t);
  let result = await run(root, ['baslat', '--dry-run']);
  assert.equal(result.code, 0);
  assert.equal(await lstat(join(root, '.git')).then(() => true, () => false), false);
  result = await run(root, ['baslat'], '\n');
  assert.equal(result.code, 0);
  assert.equal(await lstat(join(root, '.git')).then(() => true, () => false), false);
  result = await run(root, ['baslat'], 'evet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'symbolic-ref', '--short', 'HEAD'), 'main');
});

test('status and menu resolve the repository from a nested folder', async t => {
  const root = await repo(t);
  const nested = join(root, 'src');
  await mkdir(nested);
  await writeFile(join(root, 'değişen dosya.txt'), 'hello');
  const result = await run(nested, [], 'status\n');
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /değişen dosya.txt/);
  assert.match(result.stdout, /main/);
});

test('commit selects a file with spaces and leaves other changes untouched', async t => {
  const root = await repo(t);
  await writeFile(join(root, 'a boşluk.txt'), 'one');
  await writeFile(join(root, 'z.txt'), 'two');
  const result = await run(root, ['commit'], '1\nYeni dosyayı ekle\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'log', '-1', '--format=%s'), 'Yeni dosyayı ekle');
  assert.equal(await git(root, '-c', 'core.quotepath=false', 'ls-files', 'a boşluk.txt'), 'a boşluk.txt');
  assert.match(await git(root, 'status', '--porcelain'), /\?\? z.txt/);
});

test('commit dry-run leaves history and index unchanged', async t => {
  const root = await repo(t);
  await writeFile(join(root, 'test.txt'), 'new');
  const before = await git(root, 'rev-parse', 'HEAD');
  const result = await run(root, ['commit', '--dry-run'], 'hepsi\nPreview\n');
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /Prova/);
  assert.equal(await git(root, 'rev-parse', 'HEAD'), before);
  assert.equal(await git(root, 'diff', '--cached', '--name-only'), '');
});

test('sensitive files are rejected before staging', async t => {
  const root = await repo(t);
  await writeFile(join(root, '.env'), 'SYNTHETIC_EXAMPLE=not-a-real-secret');
  const result = await run(root, ['commit'], 'hepsi\n');
  assert.equal(result.code, 1);
  assert.match(result.stdout, /Özel bilgi/);
  assert.equal(await git(root, 'diff', '--cached', '--name-only'), '');
});

test('existing staged files cannot silently enter an unrelated commit', async t => {
  const root = await repo(t);
  await writeFile(join(root, 'a.txt'), 'one');
  await writeFile(join(root, 'z.txt'), 'two');
  await git(root, 'add', 'z.txt');
  const result = await run(root, ['commit'], '2\n');
  assert.equal(result.code, 1);
  assert.match(result.stdout, /seçmediğin dosyalar/);
  assert.equal(await git(root, 'diff', '--cached', '--name-only'), 'z.txt');
});

test('commit accepts literal Git pathspec characters in a filename', async t => {
  const root = await repo(t);
  await writeFile(join(root, '[abc].txt'), 'literal');
  const result = await run(root, ['commit'], 'hepsi\nLiteral filename\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'ls-files', '--', '[abc].txt'), '[abc].txt');
});

test('branch creates a feature branch while retaining local edits', async t => {
  const root = await repo(t);
  await writeFile(join(root, 'work.txt'), 'local');
  const result = await run(root, ['branch'], 'new\nozellik/tema\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'branch', '--show-current'), 'ozellik/tema');
  assert.equal(await readFile(join(root, 'work.txt'), 'utf8'), 'local');
});

test('switching branches refuses a dirty worktree', async t => {
  const root = await repo(t);
  await git(root, 'branch', 'feature');
  await writeFile(join(root, 'README.md'), 'changed');
  const result = await run(root, ['branch'], 'switch\n');
  assert.equal(result.code, 1);
  assert.equal(await git(root, 'branch', '--show-current'), 'main');
});

test('push updates only the selected branch and sets upstream', async t => {
  const { root, remote } = await localRemote(t);
  await git(root, 'switch', '-c', 'feature');
  await git(root, 'tag', '-a', 'v-test', '-m', 'Do not auto-push this tag');
  await git(root, 'config', 'push.followTags', 'true');
  const result = await run(root, ['push'], 'feature\norigin\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(remote, 'show-ref'), `${await git(root, 'rev-parse', 'HEAD')} refs/heads/feature`);
  assert.equal(await git(root, 'rev-parse', '--abbrev-ref', '@{upstream}'), 'origin/feature');
});

test('push can select main while a feature branch remains checked out', async t => {
  const { root, remote } = await localRemote(t);
  await git(root, 'switch', '-c', 'feature');
  await writeFile(join(root, 'feature.txt'), 'feature');
  await git(root, 'add', 'feature.txt');
  await git(root, 'commit', '-m', 'Feature only');
  const result = await run(root, ['push'], 'main\norigin\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(remote, 'rev-parse', 'refs/heads/main'), await git(root, 'rev-parse', 'refs/heads/main'));
  assert.equal(await git(root, 'branch', '--show-current'), 'feature');
});

test('push cancellation and dry-run leave the remote empty', async t => {
  const { root, remote } = await localRemote(t);
  for (const [args, input] of [[['push'], 'main\norigin\nhayır\n'], [['push', '--dry-run'], 'main\norigin\n']]) {
    const result = await run(root, args, input);
    assert.equal(result.code, 0, result.stdout);
    assert.equal(await git(remote, 'for-each-ref', '--format=%(refname)'), '');
  }
});

test('pull fast-forwards from a local remote', async t => {
  const { root, remote, container } = await localRemote(t);
  await git(root, 'push', '-u', 'origin', 'main');
  const peer = join(container, 'peer');
  await git(container, 'clone', remote, peer);
  await writeFile(join(peer, 'friend.txt'), 'from teammate');
  await git(peer, 'add', 'friend.txt');
  await git(peer, 'commit', '-m', 'Teammate update');
  await git(peer, 'push', 'origin', 'main');
  await git(root, 'config', 'remote.origin.pushurl', 'https://github.com/example/unreachable.git');
  const result = await run(root, ['pull'], 'origin\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.ok(!result.stdout.includes('unreachable'));
  assert.equal(await readFile(join(root, 'friend.txt'), 'utf8'), 'from teammate');
});

test('pull refuses divergent history without creating a merge or rewriting commits', async t => {
  const { root, remote, container } = await localRemote(t);
  await git(root, 'push', '-u', 'origin', 'main');
  const peer = join(container, 'peer');
  await git(container, 'clone', remote, peer);
  for (const [cwd, name] of [[peer, 'remote.txt'], [root, 'local.txt']]) {
    await writeFile(join(cwd, name), name);
    await git(cwd, 'add', name);
    await git(cwd, 'commit', '-m', name);
  }
  await git(peer, 'push', 'origin', 'main');
  const before = await git(root, 'rev-parse', 'HEAD');
  const result = await run(root, ['pull'], 'origin\nevet\n');
  assert.equal(result.code, 1, result.stdout);
  assert.match(result.stdout, /ayrı ayrı/);
  assert.equal(await git(root, 'rev-parse', 'HEAD'), before);
  assert.equal(await git(root, 'status', '--porcelain'), '');
});

test('pull rejects uncommitted files before reaching the network', async t => {
  const root = await repo(t);
  await writeFile(join(root, 'local.txt'), 'changes');
  const result = await run(root, ['pull']);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /Önce değişikliklerini commit/);
});

test('connect records a GitHub address without contacting GitHub', async t => {
  const root = await repo(t);
  const result = await run(root, ['bagla'], 'https://github.com/example/teaching.git\norigin\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'remote', 'get-url', 'origin'), 'https://github.com/example/teaching.git');
  const repeat = await run(root, ['bagla'], 'https://github.com/example/other\norigin\n');
  assert.equal(repeat.code, 1);
  assert.equal(await git(root, 'remote', 'get-url', 'origin'), 'https://github.com/example/teaching.git');
});

test('installer creates a standalone tool without touching project files', async t => {
  const root = await workspace(t);
  await writeFile(join(root, 'package.json'), '{"name":"existing"}\n');
  await mkdir(join(root, '.github'));
  await writeFile(join(root, '.github', 'keep.txt'), 'keep');
  const result = await run(root, ['kur'], 'evet\n');
  assert.equal(result.code, 0, result.stdout);
  const installed = join(root, '.github', 'githelp', 'cli.mjs');
  const standalone = await run(root, ['--help'], '', installed);
  assert.equal(standalone.code, 0, standalone.stdout);
  assert.match(standalone.stdout, /gitHelp/);
  assert.equal(await readFile(join(root, 'package.json'), 'utf8'), '{"name":"existing"}\n');
  assert.equal(await readFile(join(root, '.github', 'keep.txt'), 'utf8'), 'keep');
  const repeat = await run(root, ['kur'], 'evet\n');
  assert.equal(repeat.code, 1);
  assert.match(repeat.stdout, /üzerine yazılmadı/);
});

test('installer dry-run writes nothing and supports an explicit target folder', async t => {
  const root = await workspace(t);
  const target = join(root, 'another project');
  await mkdir(target);
  const result = await run(root, ['kur', target, '--dry-run']);
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await lstat(join(target, '.github')).then(() => true, () => false), false);
});

test('installer refuses a symlinked .github directory', async t => {
  const root = await workspace(t);
  const elsewhere = await workspace(t);
  try { await symlink(elsewhere, join(root, '.github'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Symlink permission unavailable'); return; } throw error; }
  const result = await run(root, ['kur'], 'evet\n');
  assert.equal(result.code, 1);
  assert.match(result.stdout, /gerçek bir klasör/);
});

test('EOF, invalid arguments, detached HEAD and unfinished operations are handled', async t => {
  const root = await repo(t);
  let result = await run(root, ['push']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Vazgeçildi/);
  result = await run(root, ['--unknown']);
  assert.equal(result.code, 1);
  await git(root, 'checkout', '--detach');
  result = await run(root, ['commit']);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /detached HEAD/);
  await git(root, 'switch', 'main');
  await writeFile(join(root, '.git', 'MERGE_HEAD'), await git(root, 'rev-parse', 'HEAD'));
  result = await run(root, ['push']);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /Yarım kalmış/);
});

test('menu remains open for multiple commands and accepts Turkish aliases', async t => {
  const root = await repo(t);
  const result = await run(root, [], 'durum\nstatus\n0\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(result.stdout.match(/Çalışma masan temiz/g).length, 2);
});

test('first commit, staged rename and tracked deletion are supported', async t => {
  const root = await repo(t, { initial: false });
  await writeFile(join(root, 'first.txt'), 'hello');
  let result = await run(root, ['commit'], 'hepsi\nFirst commit\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  await git(root, 'mv', 'first.txt', 'renamed.txt');
  result = await run(root, ['commit'], 'hepsi\nRename\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'ls-files'), 'renamed.txt');
  await rm(join(root, 'renamed.txt'));
  result = await run(root, ['commit'], 'hepsi\nDelete\nevet\n');
  assert.equal(result.code, 0, result.stdout);
  assert.equal(await git(root, 'ls-files'), '');
});

test('push rejects multiple push URLs without updating either target', async t => {
  const { root, remote, container } = await localRemote(t);
  const other = join(container, 'other.git');
  await git(container, 'init', '--bare', other);
  await git(root, 'config', '--add', 'remote.origin.pushurl', remote);
  await git(root, 'config', '--add', 'remote.origin.pushurl', other);
  const result = await run(root, ['push'], 'main\norigin\nevet\n');
  assert.equal(result.code, 1, result.stdout);
  assert.match(result.stdout, /birden fazla/);
  for (const target of [remote, other]) assert.equal(await git(target, 'for-each-ref', '--format=%(refname)'), '');
});

test('English and Turkish menus use the selected language throughout', async t => {
  const root = await workspace(t);
  const english = await run(root, ['--lang', 'en'], '0\n');
  assert.equal(english.code, 0, english.stdout);
  assert.match(english.stdout, /gitHelp 0\.2\.0/);
  assert.match(english.stdout, /Start my project notebook/);
  assert.match(english.stdout, /What would you like to do/);
  assert.match(english.stdout, /Number or command/);
  assert.match(english.stdout, /Cancelled/);
  assert.doesNotMatch(english.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  const turkish = await run(root, ['--lang=tr'], '0\n');
  assert.equal(turkish.code, 0, turkish.stdout);
  assert.match(turkish.stdout, /Bugün ne yapalım/);
  assert.match(turkish.stdout, /Numara veya komut/);
});

test('locale detection, GITHELP_LANG, and command-line overrides work in real processes', async t => {
  const root = await workspace(t);
  const base = { GITHELP_LANG: '', LC_ALL: '', LC_MESSAGES: '' };
  let result = await run(root, ['--help'], '', cli, { ...base, LANG: 'tr_TR.UTF-8' });
  assert.match(result.stdout, /Kullanım:/);
  result = await run(root, ['--help'], '', cli, { ...base, LANG: 'de_DE.UTF-8' });
  assert.match(result.stdout, /Usage:/);
  result = await run(root, ['--help'], '', cli, { ...base, LANG: 'tr_TR.UTF-8', GITHELP_LANG: 'en' });
  assert.match(result.stdout, /Usage:/);
  result = await run(root, ['--help', '--lang', 'tr'], '', cli, { ...base, GITHELP_LANG: 'en' });
  assert.match(result.stdout, /Kullanım:/);
});

test('English commit prompts, explanations and confirmation save the selected file', async t => {
  const root = await repo(t);
  await writeFile(join(root, 'new file.txt'), 'new work');
  const result = await run(root, ['commit', '--lang', 'en'], 'all\nAdd new work\nyes\n');
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /saving your progress in a game/);
  assert.match(result.stdout, /Which files/);
  assert.match(result.stdout, /Shall we do this\? \(yes\/no\) \[no\]/);
  assert.match(result.stdout, /Saved locally/);
  assert.doesNotMatch(result.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  assert.equal(await git(root, 'log', '-1', '--format=%s'), 'Add new work');
});

test('English push explains branch and remote choices before sending', async t => {
  const { root, remote } = await localRemote(t);
  const result = await run(root, ['--lang=en', 'push'], 'main\norigin\nyes\n');
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /Push = send your saves/);
  assert.match(result.stdout, /Which branch should we send/);
  assert.match(result.stdout, /Which remote repository should we use/);
  assert.match(result.stdout, /Your commits were sent/);
  assert.doesNotMatch(result.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  assert.equal(await git(remote, 'rev-parse', 'refs/heads/main'), await git(root, 'rev-parse', 'HEAD'));
});

test('English safety checks and failure messages are localized without mutations', async t => {
  const root = await repo(t);
  await writeFile(join(root, '.env'), 'SYNTHETIC_EXAMPLE=not-a-secret');
  let result = await run(root, ['commit', '--lang', 'en'], 'all\n');
  assert.equal(result.code, 1);
  assert.match(result.stdout, /Files that may contain private information/);
  assert.match(result.stdout, /We stopped here/);
  assert.doesNotMatch(result.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  assert.equal(await git(root, 'diff', '--cached', '--name-only'), '');
  result = await run(root, ['pull', '--lang', 'en']);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /Save your changes with commit first/);
});

test('portable gitHelp installation includes both languages', async t => {
  const root = await workspace(t);
  const result = await run(root, ['install', '--lang', 'en'], 'yes\n');
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /Keep gitHelp with this project/);
  assert.match(result.stdout, /Installed/);
  assert.doesNotMatch(result.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  const entry = join(root, '.github', 'githelp', 'cli.mjs');
  const english = await run(root, ['learn', 'commit', '--lang', 'en'], '', entry);
  assert.equal(english.code, 0, english.stdout);
  assert.match(english.stdout, /saving your progress in a game/);
  assert.doesNotMatch(english.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  const turkish = await run(root, ['learn', 'branch', '--lang', 'tr'], '', entry);
  assert.equal(turkish.code, 0, turkish.stdout);
  assert.match(turkish.stdout, /ayrı bir çalışma masası/);
});

test('English demo and invalid language options leave no project files', async t => {
  const root = await workspace(t);
  const demo = await run(root, ['demo', '--lang=en']);
  assert.equal(demo.code, 0);
  assert.match(demo.stdout, /feature\/dark-theme/);
  assert.match(demo.stdout, /The command you are learning/);
  assert.doesNotMatch(demo.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  for (const args of [['--lang'], ['init', '--lang=de'], ['--lang=en', '--lang=tr']]) {
    const result = await run(root, args, 'yes\n', cli, { GITHELP_LANG: 'en' });
    assert.equal(result.code, 1, result.stdout);
    assert.match(result.stdout, /--lang/);
    assert.doesNotMatch(result.stdout, /[çğıöşüÇĞİÖŞÜ]/);
  }
  assert.equal(await lstat(join(root, '.git')).then(() => true, () => false), false);
});

test('login configures real repository credentials and HTTPS without changing global Git settings', async t => {
  setLanguage('en');
  const root = await repo(t);
  await git(root, 'remote', 'add', 'origin', 'git@github.com:example/project.git');
  await git(root, 'config', 'remote.origin.pushurl', 'git@github.com:other-owner/fork.git');
  const globalBefore = await readFile(isolatedConfig, 'utf8');
  const calls = [];
  const runCommand = async (program, args, options) => {
    calls.push([program, args]);
    if (program === 'gh') return { code: 0, stdout: args[0] === 'config' ? 'https\n' : '', stderr: '' };
    const result = await command(program, args, options.cwd);
    if (!options.allowFailure) assert.equal(result.code, 0, result.stderr);
    return result;
  };
  const ctx = { cwd: root, dryRun: false, ui: {
    input: { isTTY: false }, output: { isTTY: false },
    title() {}, note() {}, write() {}, success() {}, async confirm() { return true; },
  } };
  await login(ctx, { run: runCommand, env: {}, inspect: async () => ({ root, remotes: ['origin'] }) });
  assert.equal(await git(root, 'remote', 'get-url', 'origin'), 'https://github.com/example/project.git');
  assert.equal(await git(root, 'remote', 'get-url', '--push', 'origin'), 'https://github.com/other-owner/fork.git');
  const helper = await command('git', ['config', '--local', '--get-all', 'credential.https://github.com.helper'], root);
  assert.equal(helper.stdout.replaceAll('\r', ''), '\n!gh auth git-credential\n');
  assert.equal(await readFile(isolatedConfig, 'utf8'), globalBefore);
  assert.ok(calls.every(([program, args]) => !(program === 'gh' && args[1] === 'login')));
  const beforeRepeat = await readFile(join(root, '.git', 'config'), 'utf8');
  await login(ctx, { run: runCommand, env: {}, inspect: async () => ({ root, remotes: ['origin'] }) });
  assert.equal(await readFile(join(root, '.git', 'config'), 'utf8'), beforeRepeat);
});

test('connect normalizes a pasted GitHub SSH address to HTTPS without contacting GitHub', async t => {
  const root = await repo(t);
  const result = await run(root, ['connect', '--lang', 'en'], 'git@github.com:example/project.git\norigin\nyes\n');
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /over HTTPS/);
  assert.equal(await git(root, 'remote', 'get-url', 'origin'), 'https://github.com/example/project.git');
});

test('login catches real URL rewrites activated only after SSH-to-HTTPS conversion', async t => {
  setLanguage('en');
  for (const setting of ['insteadOf', 'pushInsteadOf']) {
    await t.test(setting, async child => {
      const root = await repo(child);
      await git(root, 'remote', 'add', 'origin', 'git@github.com:example/project.git');
      await git(root, 'config', '--local', `url.git@github.com:.${setting}`, 'https://github.com/');
      const before = await readFile(join(root, '.git', 'config'), 'utf8');
      const ctx = { cwd: root, dryRun: false, ui: {
        input: { isTTY: false }, output: { isTTY: false },
        title() {}, note() {}, write() {}, success() {}, async confirm() { assert.fail('A rewritten target must not reach confirmation'); },
      } };
      const runCommand = async (program, args, options) => {
        if (program === 'gh') return { code: 0, stdout: args[0] === 'config' ? 'https\n' : '', stderr: '' };
        return command(program, args, options.cwd);
      };
      await assert.rejects(() => login(ctx, { run: runCommand, env: {}, inspect: async () => ({ root, remotes: ['origin'] }) }), /proposed HTTPS address/);
      assert.equal(await readFile(join(root, '.git', 'config'), 'utf8'), before);
    });
  }
});
