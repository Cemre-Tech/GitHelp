// The CLI has one language per run. Keep both translations next to each message.
let language = 'en';

export class LanguageError extends Error {}

export function t(tr, en) {
  if (typeof tr !== 'string' || typeof en !== 'string') throw new Error('Both Turkish and English translations are required.');
  return language === 'tr' ? tr : en;
}

export function getLanguage() { return language; }

export function setLanguage(value) {
  if (!['tr', 'en'].includes(value)) throw new LanguageError('Supported languages: tr, en.');
  language = value;
}

function localeLanguage(value) {
  return /^(tr|en)(?:[-_.@].*)?$/i.exec(value?.trim() || '')?.[1].toLowerCase();
}

export function detectLanguage(env = process.env, systemLocale = Intl.DateTimeFormat().resolvedOptions().locale) {
  return localeLanguage(env.GITHELP_LANG)
    || localeLanguage(env.LC_ALL || env.LC_MESSAGES || env.LANG || systemLocale)
    || 'en';
}

export function configureLanguage(argv, env = process.env, systemLocale) {
  setLanguage(detectLanguage(env, systemLocale));
  const args = [];
  let requested;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg !== '--lang' && !arg.startsWith('--lang=')) { args.push(arg); continue; }
    if (requested !== undefined) throw new LanguageError(t('--lang seçeneğini yalnız bir kez kullan.', 'Use --lang only once.'));
    requested = arg === '--lang' ? argv[++index] : arg.slice('--lang='.length);
    if (!requested || requested.startsWith('--')) {
      throw new LanguageError(t('Dil seçimi eksik. --lang tr veya --lang en kullan.', 'Missing language. Use --lang tr or --lang en.'));
    }
    const selected = localeLanguage(requested);
    if (!selected) throw new LanguageError(t(`“${requested}” dili desteklenmiyor. --lang tr veya --lang en kullan.`, `Language "${requested}" is not supported. Use --lang tr or --lang en.`));
    setLanguage(selected);
  }
  if (requested === undefined && env.GITHELP_LANG && !localeLanguage(env.GITHELP_LANG)) {
    throw new LanguageError(t('GITHELP_LANG tr veya en olmalı.', 'GITHELP_LANG must be tr or en.'));
  }
  return { language, args };
}
