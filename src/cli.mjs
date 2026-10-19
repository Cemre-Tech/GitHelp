#!/usr/bin/env node
import { UI } from './ui.mjs';
import { run, Cancelled } from './app.mjs';
import { CommandError, UserError, errorHint } from './git.mjs';
import { configureLanguage, LanguageError, t } from './i18n.mjs';

const ui = new UI({ color: !process.argv.includes('--no-color') && !process.env.NO_COLOR });
try {
  const { args } = configureLanguage(process.argv.slice(2));
  if (Number(process.versions.node.split('.')[0]) < 22) throw new UserError(t('gitHelp için Node.js 22 veya üstünü kur: https://nodejs.org', 'gitHelp needs Node.js 22 or later: https://nodejs.org'));
  await run({ cwd: process.cwd(), ui, dryRun: false }, args);
} catch (error) {
  if (error instanceof Cancelled) {
    ui.note(t('Vazgeçildi. Tamamlanan adımlar varsa geri alınmadı.', 'Cancelled. Any steps already completed were not undone.'));
  } else {
    ui.title(t('Burada durduk', 'We stopped here'));
    ui.note(error.message);
    if (error instanceof CommandError) ui.note(errorHint(error));
    if (!(error instanceof UserError || error instanceof CommandError || error instanceof LanguageError)) ui.note(t('Beklenmeyen bir sorun. Kullandığın komutu ve gizli bilgilerden arındırılmış hata mesajını hata bildirimine ekleyebilirsin.', 'An unexpected problem occurred. Include your command and the error message in a bug report after removing private information.'));
    process.exitCode = 1;
  }
} finally {
  ui.close();
}
