import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectConnection, showConnection, setup } from '../src/onboarding.mjs';
import { setLanguage } from '../src/i18n.mjs';
import { Cancelled } from '../src/ui.mjs';

const result = (stdout = '', code = 0, stderr = '') => ({ stdout, code, stderr });
const project = () => ({ root: process.cwd(), remotes: ['origin'], branch: 'main', files: [], hasCommit: true });
const target = (protocol = 'https', direction = 'push') => ({ remote: 'origin', direction, protocol,
  url: protocol === 'ssh' ? 'git@github.com:learner/project.git' : 'https://github.com/learner/project.git' });
const state = ({ repo = project(), protocol = 'https', targets = [target(protocol)], account = 'unverified' } = {}) => ({
  repo, targets, account: { state: account }, needsSetup: !(repo && targets.length && account === 'verified'),
});

function inspection({ repo = project(), remotes = { origin: {
  fetch: ['https://github.com/learner/project.git'], push: ['https://github.com/learner/project.git'],
} }, active = true, missingCli = false, env = {}, authError = false } = {}) {
  const calls = [];
  const messages = [];
  const ctx = { cwd: process.cwd(), ui: {
    title: message => messages.push(message), note: message => messages.push(message),
    write: message => messages.push(message), success: message => messages.push(message),
  } };
  const run = async (program, args, options = {}) => {
    calls.push({ program, args, options });
    if (program === 'gh') {
      if (args.join(' ') === '--version') {
        if (missingCli) throw new Error('gh missing');
        return result('gh version 2.96.0');
      }
      assert.deepEqual(args, ['auth', 'status', '--active', '--hostname', 'github.com']);
      if (authError) throw new Error('secret-auth-error-output');
      return result('secret-auth-stdout', active ? 0 : 1, 'secret-auth-stderr');
    }
    assert.equal(program, 'git');
    const remoteArgs = args.slice(args.indexOf('remote'));
    assert.equal(remoteArgs[1], 'get-url');
    assert.ok(remoteArgs.includes('--all'));
    const remote = remotes[remoteArgs.at(-1)];
    assert.ok(remote, `Unexpected remote ${remoteArgs.at(-1)}`);
    return result(`${remote[remoteArgs.includes('--push') ? 'push' : 'fetch'].join('\n')}\n`);
  };
  return { ctx, calls, messages,
    options: { run, env, inspect: async () => repo && { ...repo, remotes: Object.keys(remotes) } },
    statusCalls: () => calls.filter(call => call.program === 'gh' && call.args[0] === 'auth'),
  };
}

function wizard({ initial = state(), choices = ['browser'], accepted = true,
  dryRun = false, results = {}, cancelChoice = false } = {}) {
  let current = initial;
  const calls = [];
  const menus = [];
  const messages = [];
  const ctx = { cwd: process.cwd(), dryRun, ui: {
    title: message => messages.push(message), note: message => messages.push(message),
    write: message => messages.push(message), success: message => messages.push(message),
    async choose(message, options, config = {}) {
      menus.push({ message, options, config });
      if (cancelChoice) throw new Cancelled();
      const selected = choices.shift() ?? config.defaultId;
      assert.ok(options.some(option => option.id === selected), `Unexpected wizard choice: ${selected}`);
      return selected;
    },
    async confirm(message) { calls.push({ action: 'confirm' }); messages.push(message); return accepted; },
  } };
  const actions = {
    async init() {
      calls.push({ action: 'init' });
      const ok = results.init ?? true;
      if (ok && !dryRun) current = { ...current, repo: project() };
      return ok;
    },
    async login() {
      calls.push({ action: 'login' });
      const ok = results.login ?? true;
      if (ok && !dryRun) current = { ...current, account: { state: 'verified' } };
      return ok;
    },
    async connect(_ctx, options) {
      calls.push({ action: 'connect', options });
      const ok = results.connect ?? true;
      if (ok && !dryRun) current = { ...current, targets: [target(options?.protocol)] };
      return ok;
    },
  };
  return { ctx, calls, menus, messages, actions, options: { inspect: async () => current },
    actionsTaken: () => calls.filter(call => call.action !== 'confirm'),
  };
}

test('connection inspection separates account verification from saved GitHub destinations', async () => {
  const f = inspection();
  const connection = await inspectConnection(f.ctx, f.options);
  assert.equal(connection.account.state, 'verified');
  assert.equal(connection.needsSetup, false);
  assert.ok(connection.targets.some(item => item.direction === 'push' && item.protocol === 'https'));
  assert.ok(connection.targets.some(item => item.direction === 'fetch'));
  assert.equal(f.statusCalls().length, 1);
  assert.equal(f.statusCalls()[0].options.timeoutMs, 4000);
  assert.ok(f.calls.every(call => !call.options.interactive));
  assert.ok(f.calls.every(call => call.program === 'gh' || call.args.includes('get-url')));
});

test('account verification is cached within one CLI session while remotes remain inspectable', async () => {
  const f = inspection();
  await inspectConnection(f.ctx, f.options);
  await inspectConnection(f.ctx, f.options);
  assert.equal(f.statusCalls().length, 1);
  assert.equal(f.calls.filter(call => call.program === 'gh' && call.args[0] === '--version').length, 1);
});

test('a saved address without verified account still recommends connection setup', async () => {
  const f = inspection({ active: false });
  const connection = await inspectConnection(f.ctx, f.options);
  assert.equal(connection.account.state, 'unverified');
  assert.equal(connection.needsSetup, true);
  assert.ok(connection.targets.length > 0);
});

test('a verified account without a GitHub destination still needs project setup', async () => {
  const f = inspection({ remotes: {} });
  const connection = await inspectConnection(f.ctx, f.options);
  assert.equal(connection.account.state, 'verified');
  assert.deepEqual(connection.targets, []);
  assert.equal(connection.needsSetup, true);
});

test('inspection ignores other services and local remotes without changing them', async () => {
  const f = inspection({ remotes: {
    origin: { fetch: ['https://gitlab.com/learner/project.git'], push: ['https://gitlab.com/learner/project.git'] },
    backup: { fetch: ['C:/git/project.git'], push: ['C:/git/project.git'] },
    github: { fetch: ['git@github.com:learner/project.git'], push: ['https://github.com/learner/other.git'] },
  } });
  const connection = await inspectConnection(f.ctx, f.options);
  assert.equal(connection.targets.length, 2);
  assert.ok(connection.targets.every(item => item.remote === 'github'));
  assert.ok(connection.targets.some(item => item.protocol === 'ssh' && item.direction === 'fetch'));
  assert.ok(connection.targets.some(item => item.protocol === 'https' && item.direction === 'push'));
});

test('passive inspection skips unsupported remote names and still checks supported remotes', async () => {
  const f = inspection({ remotes: {
    'team/origin': { fetch: ['https://github.com/team/project.git'], push: ['https://github.com/team/project.git'] },
    origin: { fetch: ['https://github.com/learner/project.git'], push: ['https://github.com/learner/project.git'] },
  } });
  const connection = await inspectConnection(f.ctx, f.options);
  assert.equal(connection.needsSetup, false);
  assert.equal(connection.targets.length, 2);
  assert.ok(connection.targets.every(item => item.remote === 'origin'));
  const gitCalls = f.calls.filter(call => call.program === 'git');
  assert.equal(gitCalls.length, 2);
  assert.ok(gitCalls.every(call => call.args[0] === 'remote' && call.args[1] === 'get-url'));
  assert.ok(gitCalls.every(call => call.args.at(-1) === 'origin'));
});

test('a GitHub fetch address alone does not count as a GitHub push connection', async () => {
  const f = inspection({ remotes: {
    origin: { fetch: ['https://github.com/learner/project.git'], push: ['https://gitlab.com/learner/project.git'] },
  } });
  const connection = await inspectConnection(f.ctx, f.options);
  assert.equal(connection.account.state, 'verified');
  assert.equal(connection.needsSetup, true);
  assert.deepEqual(connection.targets, [target('https', 'fetch')]);
  assert.ok(f.calls.every(call => call.program === 'gh' || call.args.includes('get-url')));
});

test('environment tokens are identified without reading or displaying their values', async () => {
  for (const name of ['GH_TOKEN', 'GITHUB_TOKEN']) {
    const f = inspection({ env: { [name]: 'do-not-print-the-token' } });
    const connection = await inspectConnection(f.ctx, f.options);
    assert.equal(connection.account.state, 'environment');
    assert.equal(f.statusCalls().length, 0);
    showConnection(f.ctx.ui, connection);
    assert.doesNotMatch(f.messages.join('\n'), /do-not-print-the-token/);
    assert.doesNotMatch(JSON.stringify(connection), /do-not-print-the-token/);
  }
});

test('missing CLI and failed account checks remain actionable without exposing captured output', async () => {
  for (const config of [{ missingCli: true }, { active: false }, { authError: true }]) {
    const f = inspection(config);
    const connection = await inspectConnection(f.ctx, f.options);
    assert.equal(connection.account.state, config.missingCli ? 'missing-cli' : 'unverified');
    showConnection(f.ctx.ui, connection);
    assert.doesNotMatch(f.messages.join('\n'), /secret-auth/);
  }
});

test('connection status distinguishes saved addresses, account sessions, and untested repository access', () => {
  setLanguage('en');
  const f = inspection();
  showConnection(f.ctx.ui, state({ account: 'verified' }));
  const output = f.messages.join('\n');
  assert.match(output, /saved|configured/i);
  assert.match(output, /account|session/i);
  assert.match(output, /access.*(?:not|untested)|(?:not|untested).*access/i);
});

test('browser sign-in is the first recommended connection method in Turkish and English', async () => {
  for (const language of ['tr', 'en']) {
    setLanguage(language);
    const f = wizard();
    await setup(f.ctx, f.actions, f.options);
    assert.equal(f.menus[0].options[0].id, 'browser');
    assert.equal(f.menus[0].config.defaultId, 'browser');
    assert.deepEqual(f.menus[0].options.map(option => option.id), ['browser', 'https', 'ssh']);
    assert.match(f.menus[0].options[0].label, language === 'tr' ? /tarayıcı/i : /browser/i);
  }
});

test('missing GitHub CLI explains the easiest installation step before initializing or signing in', async () => {
  setLanguage('en');
  const f = wizard({ initial: state({ repo: null, targets: [], account: 'missing-cli' }) });
  assert.equal(await setup(f.ctx, f.actions, f.options), false);
  assert.deepEqual(f.actionsTaken(), []);
  assert.match(f.messages.join('\n'), /cli\.github\.com/);
});

test('browser setup initializes Git, signs in, and adds an HTTPS address in order', async () => {
  const f = wizard({ initial: state({ repo: null, targets: [] }), choices: ['browser', 'existing'] });
  assert.equal(await setup(f.ctx, f.actions, f.options), true);
  assert.deepEqual(f.actionsTaken(), [
    { action: 'init' }, { action: 'login' }, { action: 'connect', options: { protocol: 'https' } },
  ]);
  assert.ok(!f.calls.some(call => ['commit', 'push'].includes(call.action)));
});

test('new repository guidance requests an empty repository before saving its address', async () => {
  setLanguage('en');
  const f = wizard({ initial: state({ targets: [] }), choices: ['browser', 'new'] });
  assert.equal(await setup(f.ctx, f.actions, f.options), true);
  assert.deepEqual(f.actionsTaken(), [
    { action: 'login' }, { action: 'connect', options: { protocol: 'https' } },
  ]);
  const output = f.messages.join('\n');
  assert.match(output, /github\.com\/new/);
  assert.match(output, /empty repository/i);
  assert.match(output, /README.*\.gitignore.*license/);
});

test('declined initialization or login stops all dependent connection actions', async () => {
  const init = wizard({ initial: state({ repo: null, targets: [] }), results: { init: false } });
  assert.equal(await setup(init.ctx, init.actions, init.options), false);
  assert.deepEqual(init.actionsTaken(), [{ action: 'init' }]);
  const login = wizard({ initial: state({ targets: [] }), results: { login: false } });
  assert.equal(await setup(login.ctx, login.actions, login.options), false);
  assert.deepEqual(login.actionsTaken(), [{ action: 'login' }]);
});

test('dry run stops after the first previewed dependency even when an action returns true', async () => {
  const init = wizard({ initial: state({ repo: null, targets: [] }), dryRun: true });
  assert.equal(await setup(init.ctx, init.actions, init.options), false);
  assert.deepEqual(init.actionsTaken(), [{ action: 'init' }]);
  const login = wizard({ initial: state({ targets: [] }), dryRun: true });
  assert.equal(await setup(login.ctx, login.actions, login.options), false);
  assert.deepEqual(login.actionsTaken(), [{ action: 'login' }]);
});

test('existing HTTPS credentials remain usable without forced browser login', async () => {
  const f = wizard({ choices: ['https'] });
  assert.equal(await setup(f.ctx, f.actions, f.options), true);
  assert.deepEqual(f.actionsTaken(), []);
});

test('existing SSH destination remains usable when GitHub CLI is unavailable', async () => {
  const f = wizard({ initial: state({ protocol: 'ssh', account: 'missing-cli' }), choices: ['ssh'] });
  assert.equal(await setup(f.ctx, f.actions, f.options), true);
  assert.deepEqual(f.actionsTaken(), []);
  assert.doesNotMatch(f.messages.join('\n'), /SSH.*(?:broken|failed|invalid)/i);
});

test('SSH setup asks for an existing key before adding a new SSH address', async () => {
  const f = wizard({ initial: state({ targets: [] }), choices: ['ssh', 'existing'] });
  assert.equal(await setup(f.ctx, f.actions, f.options), true);
  assert.ok(f.calls.some(call => call.action === 'confirm'));
  assert.deepEqual(f.actionsTaken(), [{ action: 'connect', options: { protocol: 'ssh' } }]);
  const declined = wizard({ initial: state({ targets: [] }), choices: ['ssh'], accepted: false });
  assert.equal(await setup(declined.ctx, declined.actions, declined.options), false);
  assert.deepEqual(declined.actionsTaken(), []);
});

test('canceling the connection method menu performs no project or account changes', async () => {
  const f = wizard({ cancelChoice: true });
  await assert.rejects(setup(f.ctx, f.actions, f.options), Cancelled);
  assert.deepEqual(f.actionsTaken(), []);
});

test('declining to save the repository address never reports setup completion', async () => {
  const f = wizard({ initial: state({ targets: [] }), choices: ['https', 'existing'], results: { connect: false } });
  assert.equal(await setup(f.ctx, f.actions, f.options), false);
  assert.deepEqual(f.actionsTaken(), [{ action: 'connect', options: { protocol: 'https' } }]);
  assert.doesNotMatch(f.messages.join('\n'), /address is ready|adresi hazır/i);
});
