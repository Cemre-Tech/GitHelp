import test from 'node:test';
import assert from 'node:assert/strict';
import { login } from '../src/auth.mjs';
import { setLanguage } from '../src/i18n.mjs';

const credentialKey = 'credential.https://github.com.helper';
const result = (stdout = '', code = 0, stderr = '') => ({ stdout, code, stderr });

// Model raw config and effective URLs separately: Git URL rewrites must not make
// a reviewed HTTPS destination silently use another transport or repository.
function fixture({ active = true, accepted = true, dryRun = false, tty = true,
  remotes = {}, helpers = [], loginCode = 0, activeAfterLogin = true, env = {},
  ghProtocol = 'https', rewriteRules = [] } = {}) {
  const calls = [];
  const messages = [];
  let confirmations = 0;
  let terminalSessions = 0;
  let signedIn = active;
  let protocol = ghProtocol;
  const state = Object.fromEntries(Object.entries(remotes).map(([name, remote]) => [name, {
    fetch: [...remote.fetch],
    push: [...(remote.push || [])],
    effectiveFetch: remote.effectiveFetch ? [...remote.effectiveFetch] : null,
    effectivePush: remote.effectivePush ? [...remote.effectivePush] : null,
  }]));
  let helperValues = [...helpers];
  const ctx = { cwd: process.cwd(), dryRun, ui: {
    title: message => messages.push(message),
    note: message => messages.push(message),
    write: message => messages.push(message),
    success: message => messages.push(message),
    input: { isTTY: tty }, output: { isTTY: tty },
    async confirm(message) { confirmations++; if (message) messages.push(message); return accepted; },
    async withTerminal(action) { terminalSessions++; return action(); },
  } };
  const run = async (program, args, options = {}) => {
    calls.push({ program, args: [...args], options });
    if (program === 'gh') {
      if (args.join(' ') === '--version') return result('gh version 2.80.0\n');
      if (args.join(' ') === 'auth status --active --hostname github.com') {
        return signedIn ? result('', 0, 'Logged in to github.com account learner') : result('', 1, 'Not logged in');
      }
      if (args.join(' ') === 'auth login --hostname github.com --git-protocol https --web') {
        if (loginCode === 0) { signedIn = activeAfterLogin; protocol = 'https'; }
        return result('', loginCode, loginCode ? 'Browser login was cancelled' : '');
      }
      if (args.join(' ') === 'config get git_protocol --host github.com') return result(`${protocol}\n`);
      if (args.join(' ') === 'config set git_protocol https --host github.com') {
        protocol = 'https';
        return result();
      }
      assert.fail(`Unexpected gh command: ${args.join(' ')}`);
    }
    assert.equal(program, 'git');
    if (args[0] === 'config' && args[1] === '--null' && args[2] === '--get-regexp') {
      assert.equal(args[3], '^url\\..*\\.(insteadof|pushinsteadof)$');
      return rewriteRules.length
        ? result(rewriteRules.map(rule => `url.${rule.base}.${rule.push ? 'pushinsteadof' : 'insteadof'}\n${rule.prefix}\0`).join(''))
        : result('', 1);
    }
    if (args[0] === 'config' && args[1] === '--local' && args[2] === '--get-all') {
      const key = args[3];
      let values;
      if (key === credentialKey) values = helperValues;
      else {
        const match = /^remote\.(.+)\.(url|pushurl)$/.exec(key);
        assert.ok(match && state[match[1]], `Unexpected config read: ${key}`);
        values = state[match[1]][match[2] === 'url' ? 'fetch' : 'push'];
      }
      return values.length ? result(`${values.join('\n')}\n`) : result('', 1);
    }
    if (args[0] === 'remote' && args[1] === 'get-url') {
      const remote = state[args.at(-1)];
      assert.ok(remote, 'Read must address a known remote');
      const values = args.includes('--push')
        ? remote.effectivePush || (remote.push.length ? remote.push : remote.fetch)
        : remote.effectiveFetch || remote.fetch;
      return result(`${values.join('\n')}\n`);
    }
    if (args[0] === 'config' && args[1] === '--local' && args[3] === credentialKey) {
      if (args[2] === '--replace-all') helperValues = [args[4]];
      else if (args[2] === '--add') helperValues.push(args[4]);
      else assert.fail(`Unexpected credential mutation: ${args.join(' ')}`);
      return result();
    }
    if (args[0] === 'remote' && args[1] === 'set-url') {
      const push = args[2] === '--push';
      const remote = state[args[push ? 3 : 2]];
      assert.ok(remote, 'Mutation must address a known remote');
      remote[push ? 'push' : 'fetch'] = [args.at(-1)];
      return result();
    }
    assert.fail(`Unexpected git command: ${args.join(' ')}`);
  };
  return {
    ctx, calls, messages, state,
    options: { run, env, inspect: async () => ({ root: ctx.cwd, remotes: Object.keys(state) }) },
    mutations: () => calls.filter(call => call.program === 'git'
      && (call.args[0] === 'config' && ['--replace-all', '--add'].includes(call.args[2]) || call.args[1] === 'set-url')
      || call.program === 'gh' && call.args[0] === 'config' && call.args[1] === 'set'),
    browserCalls: () => calls.filter(call => call.program === 'gh' && call.args[1] === 'login'),
    confirmations: () => confirmations,
    terminalSessions: () => terminalSessions,
    protocol: () => protocol,
  };
}

test('login reuses the active GitHub account and sets only this repository helper', async () => {
  setLanguage('en');
  const f = fixture();
  assert.equal(await login(f.ctx, f.options), true);
  assert.equal(f.browserCalls().length, 0);
  assert.ok(f.calls.some(call => call.program === 'gh'
    && call.args.join(' ') === 'auth status --active --hostname github.com'));
  assert.deepEqual(f.mutations().map(call => call.args), [
    ['config', '--local', '--replace-all', credentialKey, ''],
    ['config', '--local', '--add', credentialKey, '!gh auth git-credential'],
  ]);
  assert.ok(f.mutations().every(call => call.options.cwd === f.ctx.cwd));
});

test('login opens the web flow once and checks that a stored account became active', async () => {
  const f = fixture({ active: false });
  assert.equal(await login(f.ctx, f.options), true);
  const browser = f.browserCalls();
  assert.equal(browser.length, 1);
  assert.deepEqual(browser[0].args, ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web']);
  assert.equal(browser[0].options.interactive, true);
  assert.equal(f.terminalSessions(), 1);
  const browserIndex = f.calls.indexOf(browser[0]);
  const recheckIndex = f.calls.findIndex((call, index) => index > browserIndex
    && call.program === 'gh' && call.args[1] === 'status');
  const mutationIndex = f.calls.findIndex(call => f.mutations().includes(call));
  assert.ok(recheckIndex > browserIndex);
  assert.ok(mutationIndex > recheckIndex);
});

test('an already prepared project needs no browser, confirmation, or repeated config changes', async () => {
  const f = fixture({ helpers: ['', '!gh auth git-credential'],
    remotes: { origin: { fetch: ['https://github.com/learner/project.git'] } } });
  assert.equal(await login(f.ctx, f.options), true);
  assert.equal(await login(f.ctx, f.options), true);
  assert.equal(f.browserCalls().length, 0);
  assert.equal(f.confirmations(), 0);
  assert.deepEqual(f.mutations(), []);
});

test('a reused account with SSH preference switches future GitHub repositories to HTTPS on confirmation', async () => {
  const f = fixture({ ghProtocol: 'ssh', helpers: ['', '!gh auth git-credential'],
    remotes: { origin: { fetch: ['https://github.com/learner/project.git'] } } });
  assert.equal(await login(f.ctx, f.options), true);
  assert.equal(f.browserCalls().length, 0);
  assert.equal(f.confirmations(), 1);
  assert.equal(f.protocol(), 'https');
  assert.deepEqual(f.mutations().map(call => ({ program: call.program, args: call.args })), [
    { program: 'gh', args: ['config', 'set', 'git_protocol', 'https', '--host', 'github.com'] },
  ]);
  assert.match(f.messages.join('\n'), /gh config set git_protocol https --host github\.com/);
  assert.equal(await login(f.ctx, f.options), true);
  assert.equal(f.mutations().length, 1, 'A subsequent login must reuse the saved HTTPS preference');
});

test('dry-run and declined confirmation preserve a reused account SSH preference', async t => {
  for (const options of [{ dryRun: true }, { accepted: false }]) {
    await t.test(options.dryRun ? 'dry-run' : 'declined confirmation', async () => {
      const f = fixture({ ghProtocol: 'ssh', helpers: ['', '!gh auth git-credential'], ...options });
      assert.equal(await login(f.ctx, f.options), false);
      assert.equal(f.protocol(), 'ssh');
      assert.equal(f.browserCalls().length, 0);
      assert.deepEqual(f.mutations(), []);
      assert.match(f.messages.join('\n'), /gh config set git_protocol https --host github\.com/);
    });
  }
});

test('dry-run never opens a browser, confirms, or changes Git config', async () => {
  const f = fixture({ active: false, dryRun: true,
    remotes: { origin: { fetch: ['git@github.com:learner/project.git'] } } });
  assert.equal(await login(f.ctx, f.options), false);
  assert.equal(f.confirmations(), 0);
  assert.equal(f.browserCalls().length, 0);
  assert.deepEqual(f.mutations(), []);
});

test('declining login leaves both the saved account and repository unchanged', async () => {
  const f = fixture({ active: false, accepted: false,
    remotes: { origin: { fetch: ['git@github.com:learner/project.git'] } } });
  assert.equal(await login(f.ctx, f.options), false);
  assert.ok(f.confirmations() > 0);
  assert.equal(f.browserCalls().length, 0);
  assert.deepEqual(f.mutations(), []);
});

test('SSH fetch and explicit SSH push URLs retain their independent GitHub repositories', async () => {
  const f = fixture({ remotes: {
    origin: { fetch: ['git@github.com:upstream/project.git'], push: ['git@github.com:learner/fork.git'] },
  } });
  assert.equal(await login(f.ctx, f.options), true);
  const remoteMutations = f.mutations().filter(call => call.args[0] === 'remote');
  assert.deepEqual(remoteMutations.map(call => call.args), [
    ['remote', 'set-url', 'origin', 'https://github.com/upstream/project.git'],
    ['remote', 'set-url', '--push', 'origin', 'https://github.com/learner/fork.git'],
  ]);
  assert.deepEqual(f.state.origin.fetch, ['https://github.com/upstream/project.git']);
  assert.deepEqual(f.state.origin.push, ['https://github.com/learner/fork.git']);
});

test('a remote without a pushurl inherits the converted fetch URL without adding a pushurl', async () => {
  const f = fixture({ remotes: { origin: { fetch: ['git@github.com:learner/project.git'] } } });
  assert.equal(await login(f.ctx, f.options), true);
  assert.deepEqual(f.mutations().filter(call => call.args[0] === 'remote').map(call => call.args), [
    ['remote', 'set-url', 'origin', 'https://github.com/learner/project.git'],
  ]);
  assert.deepEqual(f.state.origin.push, []);
});

test('HTTPS fetch and push addresses are preserved exactly', async () => {
  const f = fixture({ remotes: {
    origin: { fetch: ['https://github.com/upstream/project'], push: ['https://github.com/learner/fork.git'] },
  } });
  assert.equal(await login(f.ctx, f.options), true);
  assert.deepEqual(f.mutations().filter(call => call.args[0] === 'remote'), []);
  assert.deepEqual(f.state.origin.fetch, ['https://github.com/upstream/project']);
  assert.deepEqual(f.state.origin.push, ['https://github.com/learner/fork.git']);
});

test('each remote direction is converted independently when SSH and HTTPS are mixed', async t => {
  for (const remote of [
    { fetch: ['https://github.com/upstream/project.git'], push: ['git@github.com:learner/fork.git'] },
    { fetch: ['git@github.com:upstream/project.git'], push: ['https://github.com/learner/fork.git'] },
  ]) {
    await t.test(remote.fetch[0].startsWith('https:') ? 'SSH push only' : 'SSH fetch only', async () => {
      const f = fixture({ remotes: { origin: remote } });
      assert.equal(await login(f.ctx, f.options), true);
      const commands = f.mutations().filter(call => call.args[0] === 'remote').map(call => call.args);
      assert.deepEqual(commands, [remote.fetch[0].startsWith('https:')
        ? ['remote', 'set-url', '--push', 'origin', 'https://github.com/learner/fork.git']
        : ['remote', 'set-url', 'origin', 'https://github.com/upstream/project.git']]);
      assert.deepEqual(f.state.origin.fetch, ['https://github.com/upstream/project.git']);
      assert.deepEqual(f.state.origin.push, ['https://github.com/learner/fork.git']);
    });
  }
});

test('other hosts and their SSH settings remain untouched', async () => {
  const f = fixture({ remotes: {
    origin: { fetch: ['git@github.com:learner/project.git'] },
    backup: { fetch: ['git@gitlab.com:learner/project.git'], push: ['ssh://git@gitlab.com/learner/project.git'] },
  } });
  assert.equal(await login(f.ctx, f.options), true);
  assert.equal(f.mutations().some(call => call.args.includes('backup')), false);
  assert.deepEqual(f.state.backup.fetch, ['git@gitlab.com:learner/project.git']);
  assert.deepEqual(f.state.backup.push, ['ssh://git@gitlab.com/learner/project.git']);
});

test('multiple fetch or push URLs are rejected before any mutation or login', async t => {
  for (const remote of [
    { fetch: ['git@github.com:one/project.git', 'git@github.com:two/project.git'] },
    { fetch: ['git@github.com:one/project.git'], push: ['git@github.com:two/project.git', 'git@github.com:three/project.git'] },
  ]) {
    await t.test(remote.push ? 'multiple push URLs' : 'multiple fetch URLs', async () => {
      const f = fixture({ active: false, remotes: { origin: remote } });
      await assert.rejects(() => login(f.ctx, f.options));
      assert.deepEqual(f.mutations(), []);
      assert.equal(f.browserCalls().length, 0);
    });
  }
});

test('effective URL rewrites are rejected before any mutation', async t => {
  for (const field of ['effectiveFetch', 'effectivePush']) {
    await t.test(field, async () => {
      const f = fixture({ remotes: { origin: {
        fetch: ['https://github.com/learner/project.git'],
        [field]: ['git@github.com:learner/project.git'],
      } } });
      await assert.rejects(() => login(f.ctx, f.options));
      assert.deepEqual(f.mutations(), []);
    });
  }
});

test('proposed HTTPS conversions cannot activate a new fetch or push URL rewrite', async t => {
  for (const push of [false, true]) {
    await t.test(push ? 'pushInsteadOf with inherited push' : 'insteadOf', async () => {
      const f = fixture({ active: false,
        remotes: { origin: { fetch: ['git@github.com:learner/project.git'] } },
        rewriteRules: [{ base: 'git@github.com:', prefix: 'https://github.com/', push }],
      });
      await assert.rejects(() => login(f.ctx, f.options), /rewrite|insteadOf|pushInsteadOf/i);
      assert.equal(f.browserCalls().length, 0);
      assert.deepEqual(f.mutations(), []);
    });
  }
});

test('a separate SSH push repository also gets its proposed HTTPS destination checked', async () => {
  const f = fixture({ ghProtocol: 'ssh', remotes: { origin: {
    fetch: ['git@github.com:upstream/project.git'], push: ['git@github.com:learner/fork.git'],
  } }, rewriteRules: [{ base: 'git@github.com:other/', prefix: 'https://github.com/learner/' }] });
  await assert.rejects(() => login(f.ctx, f.options), /rewrite|insteadOf|pushInsteadOf/i);
  assert.equal(f.protocol(), 'ssh');
  assert.deepEqual(f.mutations(), []);
});

test('rewrite rules are read before settings or remote mutations', async () => {
  const f = fixture({ ghProtocol: 'ssh', remotes: {
    origin: { fetch: ['git@github.com:learner/project.git'] },
  } });
  assert.equal(await login(f.ctx, f.options), true);
  const reads = f.calls.filter(call => call.program === 'git' && call.args.includes('--get-regexp'));
  assert.ok(reads.length > 0, 'The candidate conversion must inspect configured rewrite rules');
  assert.ok(reads.every(call => call.args.includes('--null') && call.options.allowFailure));
  const firstMutation = f.calls.findIndex(call => f.mutations().includes(call));
  assert.ok(reads.every(call => f.calls.indexOf(call) < firstMutation));
});

test('an explicit pushurl ignores pushInsteadOf rules during its HTTPS conversion', async () => {
  const f = fixture({ remotes: { origin: {
    fetch: ['git@github.com:upstream/project.git'], push: ['git@github.com:learner/fork.git'],
  } }, rewriteRules: [{ base: 'git@github.com:other/', prefix: 'https://github.com/learner/', push: true }] });
  assert.equal(await login(f.ctx, f.options), true);
  assert.deepEqual(f.state.origin.fetch, ['https://github.com/upstream/project.git']);
  assert.deepEqual(f.state.origin.push, ['https://github.com/learner/fork.git']);
});

test('unrelated and no-op URL rewrite rules do not block conversion', async () => {
  const f = fixture({ remotes: { origin: { fetch: ['git@github.com:learner/project.git'] } }, rewriteRules: [
    { base: 'ssh://git@gitlab.com/', prefix: 'https://gitlab.com/' },
    { base: 'https://github.com/', prefix: 'https://github.com/' },
  ] });
  assert.equal(await login(f.ctx, f.options), true);
  assert.deepEqual(f.state.origin.fetch, ['https://github.com/learner/project.git']);
});

test('environment tokens cannot masquerade as a reusable account and their values stay private', async t => {
  for (const key of ['GH_TOKEN', 'GITHUB_TOKEN']) {
    await t.test(key, async () => {
      const secret = 'fixture-secret-never-print-this';
      const f = fixture({ env: { [key]: secret } });
      await assert.rejects(() => login(f.ctx, f.options), error => {
        assert.match(error.message, new RegExp(key));
        assert.ok(!error.message.includes(secret));
        return true;
      });
      assert.ok(!f.messages.join('\n').includes(secret));
      assert.deepEqual(f.mutations(), []);
      assert.equal(f.browserCalls().length, 0);
    });
  }
});

test('failed or unfinished browser login makes no repository changes', async t => {
  for (const options of [{ loginCode: 1 }, { activeAfterLogin: false }]) {
    await t.test(options.loginCode ? 'command failed' : 'no stored active account', async () => {
      const f = fixture({ active: false, ...options,
        remotes: { origin: { fetch: ['git@github.com:learner/project.git'] } } });
      await assert.rejects(() => login(f.ctx, f.options));
      assert.deepEqual(f.mutations(), []);
    });
  }
});

test('a noninteractive terminal gets a usable login command without starting a browser', async () => {
  setLanguage('en');
  const f = fixture({ active: false, tty: false });
  await assert.rejects(() => login(f.ctx, f.options), error => {
    assert.match(error.message, /terminal|interactive/i);
    assert.match(error.message, /(?:gh auth login|npm start -- login)/);
    return true;
  });
  assert.equal(f.browserCalls().length, 0);
  assert.deepEqual(f.mutations(), []);
});

test('the login explanation and success are available in English and Turkish', async () => {
  const outputs = {};
  for (const language of ['en', 'tr']) {
    setLanguage(language);
    const f = fixture();
    assert.equal(await login(f.ctx, f.options), true);
    outputs[language] = f.messages.join('\n');
  }
  setLanguage('en');
  assert.notEqual(outputs.en, outputs.tr);
  assert.match(outputs.en, /account|login|sign[ -]?in/i);
  assert.match(outputs.tr, /hesa[bd]|giriş|bağlan/i);
});
