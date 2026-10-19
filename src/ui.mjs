import { createInterface } from 'node:readline';
import { t, getLanguage } from './i18n.mjs';

export class Cancelled extends Error {
  constructor() { super(t('İşlem iptal edildi.', 'Operation cancelled.')); }
}

// A filename or a Git error must never be able to emit terminal control sequences.
export function clean(value) {
  return String(value).replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')
    .replace(/https?:\/\/[^\s/@]+(?::[^\s/@]*)?@/gi, t('https://[gizli]@', 'https://[redacted]@'))
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, t('[gizli]', '[redacted]'));
}

export function commandText(program, args) {
  // Display copyable commands for PowerShell on Windows and POSIX shells elsewhere.
  // Single quotes keep dollar expressions and backticks literal in both shells.
  return [program, ...args].map(arg => /^[\w./:=+-]+$/.test(arg) ? arg
    : `'${arg.replaceAll("'", process.platform === 'win32' ? "''" : "'\"'\"'")}'`).join(' ');
}

export class UI {
  constructor({ input = process.stdin, output = process.stdout, color = !process.env.NO_COLOR } = {}) {
    this.input = input;
    this.output = output;
    this.color = Boolean(color && output.isTTY);
    this.queue = [];
    this.openReader();
  }

  openReader() {
    this.ended = false;
    this.rl = createInterface({ input: this.input, output: this.output, terminal: Boolean(this.input.isTTY && this.output.isTTY), crlfDelay: Infinity });
    this.rl.on('line', line => {
      if (this.pending) { const resolve = this.pending; this.pending = null; resolve(line); }
      else this.queue.push(line);
    });
    this.rl.on('close', () => { this.ended = true; this.pending?.(null); this.pending = null; });
    this.rl.on('SIGINT', () => { this.queue.length = 0; this.rl.close(); });
  }

  async withTerminal(action) {
    // Give gh exclusive ownership of stdin and terminal mode during browser login.
    this.queue.length = 0;
    this.rl.close();
    try { return await action(); }
    finally { this.openReader(); }
  }

  write(message = '') { this.output.write(`${clean(message)}\n`); }
  accent(message) { return this.color ? `\x1b[36m${clean(message)}\x1b[0m` : clean(message); }
  title(message) { this.output.write(`\n  ${this.accent(message)}\n\n`); }
  note(message) { this.write(`  · ${message}`); }
  success(message) { this.write(`  ✓ ${message}`); }

  async ask(message, { fallback, required = false } = {}) {
    while (true) {
      this.output.write(`\n  ${clean(message)}${fallback !== undefined ? ` [${clean(fallback)}]` : ''} > `);
      const line = this.queue.length ? this.queue.shift() : this.ended ? null : await new Promise(resolve => { this.pending = resolve; });
      if (line === null) throw new Cancelled();
      const answer = line.trim() || fallback || '';
      if (required && !answer) { this.note(t('Bir şey yazabilir veya Ctrl+C ile çıkabilirsin.', 'Enter a value, or press Ctrl+C to leave.')); continue; }
      if (/[\x00-\x1f\x7f-\x9f]/.test(answer)) { this.note(t('Kontrol karakterleri kullanma.', 'Do not use control characters.')); continue; }
      return answer;
    }
  }

  async choose(message, options, { defaultId } = {}) {
    this.title(message);
    options.forEach((option, index) => {
      this.write(`  ${index + 1}. ${option.label}${option.id === defaultId ? t(' (önerilen)', ' (recommended)') : ''}`);
      if (option.description) this.write(`     ${option.description}`);
    });
    this.write(t('  0. Vazgeç / çık', '  0. Cancel / exit'));
    while (true) {
      const answer = await this.ask(t('Numara veya komut', 'Number or command'), { fallback: defaultId });
      if (answer === '0' || ['cik', 'çık', 'exit', 'quit', 'cancel'].includes(answer)) throw new Cancelled();
      const index = /^\d+$/.test(answer) ? Number(answer) - 1 : -1;
      const option = options[index] || options.find(item => item.id === answer || item.aliases?.includes(answer));
      if (option) return option.id;
      this.note(t('Listeden bir numara seç. Örneğin: 1.', 'Choose a number from the list. For example: 1.'));
    }
  }

  async confirm(message = t('Bu işlemi yapalım mı?', 'Shall we do this?')) {
    const answer = await this.ask(`${message} ${t('(evet/hayır)', '(yes/no)')}`, { fallback: t('hayır', 'no') });
    return ['e', 'evet', 'y', 'yes'].includes(answer.toLocaleLowerCase(getLanguage()));
  }

  close() { this.rl.close(); }
}
