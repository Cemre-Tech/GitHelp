import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { configureLanguage, detectLanguage, getLanguage, LanguageError, setLanguage, t } from '../src/i18n.mjs';
import { getLessons } from '../src/lessons.mjs';
import { UI } from '../src/ui.mjs';
import { errorHint, requireBranch } from '../src/git.mjs';

afterEach(() => setLanguage('en'));

test('language selection follows explicit preference, locale precedence and English fallback', () => {
  assert.equal(detectLanguage({ GITHELP_LANG: 'tr', LC_ALL: 'en_US.UTF-8' }), 'tr');
  assert.equal(detectLanguage({ LC_ALL: 'en_US.UTF-8', LANG: 'tr_TR.UTF-8' }), 'en');
  assert.equal(detectLanguage({ LC_MESSAGES: 'tr_TR', LANG: 'en_US' }), 'tr');
  assert.equal(detectLanguage({ LANG: 'tr-TR' }), 'tr');
  assert.equal(detectLanguage({ LANG: 'fr_FR.UTF-8' }), 'en');
  assert.equal(detectLanguage({ LC_ALL: 'C', LANG: 'tr_TR' }), 'en');
  assert.equal(detectLanguage({}, 'tr-TR'), 'tr');
});

test('language flags are removed before routing and override the environment', () => {
  assert.deepEqual(configureLanguage(['push', '--lang', 'en', '--dry-run'], { GITHELP_LANG: 'tr' }),
    { language: 'en', args: ['push', '--dry-run'] });
  assert.deepEqual(configureLanguage(['--lang=tr', 'learn', 'commit'], { GITHELP_LANG: 'en' }),
    { language: 'tr', args: ['learn', 'commit'] });
  assert.equal(configureLanguage(['--lang=en'], { GITHELP_LANG: 'unsupported' }).language, 'en');
});

test('invalid and missing languages are rejected instead of becoming command arguments', () => {
  for (const args of [['--lang'], ['--lang', '--help'], ['--lang='], ['--lang=de'], ['--lang=en', '--lang=tr']]) {
    assert.throws(() => configureLanguage(args, { GITHELP_LANG: 'en' }), LanguageError);
  }
  assert.throws(() => configureLanguage([], { GITHELP_LANG: 'unsupported' }), LanguageError);
});

test('every learning topic has a Turkish and an English explanation', () => {
  setLanguage('tr');
  const turkish = getLessons();
  setLanguage('en');
  const english = getLessons();
  assert.deepEqual(Object.keys(english), Object.keys(turkish));
  for (const topic of Object.keys(english)) {
    assert.equal(english[topic].length, 2);
    assert.ok(english[topic].every(text => text.length > 10));
    assert.notDeepEqual(english[topic], turkish[topic]);
    assert.doesNotMatch(english[topic].join(' '), /[çğıöşüÇĞİÖŞÜ]/);
  }
});

test('translated errors and recovery instructions are actionable in both languages', () => {
  setLanguage('en');
  assert.match(errorHint(new Error('Authentication failed')), /Connect your GitHub account/);
  assert.match(errorHint(new Error('Not possible to fast-forward')), /histories have moved apart/);
  assert.throws(() => requireBranch({ branch: null }), /githelp branch/);
  setLanguage('tr');
  assert.match(errorHint(new Error('Authentication failed')), /GitHub girişini githelp login/);
  assert.equal(t('Merhaba', 'Hello'), 'Merhaba');
  assert.equal(getLanguage(), 'tr');
  assert.throws(() => t('Missing translation'), /Both Turkish and English/);
});

test('confirmation displays the selected language and still defaults to no', async () => {
  for (const language of ['en', 'tr']) {
    setLanguage(language);
    const input = new PassThrough();
    const output = new PassThrough();
    let text = '';
    output.on('data', chunk => { text += chunk; });
    const ui = new UI({ input, output });
    input.end('\n');
    assert.equal(await ui.confirm(), false);
    assert.match(text, language === 'en' ? /\(yes\/no\) \[no\]/ : /\(evet\/hayır\) \[hayır\]/);
    ui.close();
  }
});
