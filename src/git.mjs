import { t } from './i18n.mjs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { clean } from './ui.mjs';

export class UserError extends Error {}

export class CommandError extends Error {
  constructor(program, args, result) {
    super(clean(result.stderr || result.stdout || t(`${program} çıkış kodu: ${result.code}`, `${program} exit code: ${result.code}`)));
    this.program = program;
    this.args = args;
    this.code = result.code;
  }
}

export function execute(program, args, { cwd = process.cwd(), env = {}, allowFailure = false } = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(program, args, {
      cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1', GH_PAGER: 'cat', ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', data => { stdout += data; });
    child.stderr.setEncoding('utf8').on('data', data => { stderr += data; });
    child.on('error', error => reject(new UserError(error.code === 'ENOENT'
      ? t(`${program} bulunamadı. ${program === 'git' ? 'Git: https://git-scm.com/downloads' : 'GitHub CLI: https://cli.github.com'} adresinden kur.`, `${program} was not found. Install it from ${program === 'git' ? 'https://git-scm.com/downloads' : 'https://cli.github.com'}.`)
      : clean(error.message))));
    child.on('close', (code, signal) => {
      const result = { code: code ?? 1, stdout, stderr, signal };
      if (result.code !== 0 && !allowFailure) reject(new CommandError(program, args, result));
      else resolveResult(result);
    });
  });
}

export function git(cwd, args, options = {}) {
  return execute('git', ['-c', 'color.ui=false', '-c', 'core.quotepath=false', ...args], { ...options, cwd });
}

export async function gitText(cwd, args, options) { return (await git(cwd, args, options)).stdout.trim(); }

export function parseStatus(text) {
  const records = text.split('\0');
  const files = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!record) continue;
    const code = record.slice(0, 2);
    const path = record.slice(3);
    const originalPath = /[RC]/.test(code) ? records[++index] : undefined;
    files.push({ code, path, originalPath, staged: ![' ', '?', '!'].includes(code[0]),
      conflict: ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(code) });
  }
  return files;
}

export async function repository(cwd) {
  const top = await git(cwd, ['rev-parse', '--show-toplevel'], { allowFailure: true });
  if (top.code !== 0) return null;
  const root = resolve(top.stdout.trim());
  const [branchResult, commitResult, statusResult, branchesText, remotesText] = await Promise.all([
    git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true }),
    git(root, ['rev-parse', '--verify', 'HEAD'], { allowFailure: true }),
    git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    gitText(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/']),
    gitText(root, ['remote']),
  ]);
  const branch = branchResult.code === 0 ? branchResult.stdout.trim() : null;
  const branches = branchesText ? branchesText.split('\n') : [];
  if (branch && !branches.includes(branch)) branches.unshift(branch);
  return { root, branch, hasCommit: commitResult.code === 0, files: parseStatus(statusResult.stdout),
    branches, remotes: remotesText ? remotesText.split('\n') : [] };
}

export function requireBranch(repo) {
  if (!repo.branch) throw new UserError(t("Bir dalda değilsin (detached HEAD). Önce: githelp branch → yeni dal oluştur.", "You are not on a branch (detached HEAD). Use githelp branch to create a branch first."));
}

export function requireClean(repo) {
  if (repo.files.length) throw new UserError(t("Önce değişikliklerini commit ile kaydet. Böylece dosyaların başka daldaki kodlarla karışmaz.", "Save your changes with commit first, so they do not get mixed with code from another branch."));
}

export async function requireIdle(repo) {
  for (const marker of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer']) {
    const { access } = await import('node:fs/promises');
    const path = await gitText(repo.root, ['rev-parse', '--git-path', marker]);
    const exists = await access(resolve(repo.root, path)).then(() => true, () => false);
    if (exists) throw new UserError(t("Yarım kalmış bir merge/rebase işlemi var. Önce onu tamamla; gitHelp geçmişi otomatik değiştirmez.", "An unfinished merge/rebase is in progress. Finish it first; gitHelp does not rewrite history automatically."));
  }
  if (repo.files.some(file => file.conflict)) throw new UserError(t("Aynı dosyanın iki farklı hali çakışıyor. Önce çakışmaları çöz, sonra tekrar dene.", "Two versions of a file conflict. Resolve the conflicts first, then try again."));
}

export function validateRemote(name) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw new UserError(t("Bu uzak bağlantı adı desteklenmiyor. Harf, sayı, nokta, alt çizgi veya tire kullan.", "This remote name is not supported. Use letters, numbers, dots, underscores, or hyphens."));
  return name;
}

export function pushArgs(remote, branch) {
  validateRemote(remote);
  if (!branch || branch.startsWith('-') || /[\s\x00-\x1f:~^?*\[\\]/.test(branch)) throw new UserError(t("Geçersiz dal adı.", "Invalid branch name."));
  return ['push', '--set-upstream', '--no-follow-tags', '--recurse-submodules=no', '--', remote, `refs/heads/${branch}:refs/heads/${branch}`];
}

export function pullArgs(remote, branch) {
  validateRemote(remote);
  if (!branch || branch.startsWith('-') || /[\s\x00-\x1f:~^?*\[\\]/.test(branch)) throw new UserError(t("Geçersiz dal adı.", "Invalid branch name."));
  return ['pull', '--ff-only', '--no-rebase', '--', remote, `refs/heads/${branch}`];
}

export function githubRepository(value) {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9](?:[A-Za-z0-9-]*))\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(value);
  if (!match || ['.', '..'].includes(match[2])) throw new UserError(t("GitHub adresi şöyle olmalı: https://github.com/kullanici/proje veya git@github.com:kullanici/proje.git", "Use a GitHub address like https://github.com/owner/project or git@github.com:owner/project.git"));
  return { owner: match[1], name: match[2], fullName: `${match[1]}/${match[2]}`, url: `https://github.com/${match[1]}/${match[2]}.git` };
}

export function errorHint(error) {
  const message = error.message.toLowerCase();
  if (/protected branch|gh006|gh013|repository rule/.test(message)) return t("Bu dal GitHub kurallarıyla korunuyor. Bir özellik dalı oluştur, onu push ile gönder ve pr ile inceleme isteği aç.", "GitHub rules protect this branch. Create a feature branch, push it, and use pr to ask for a review.");
  if (/non-fast-forward|fetch first|rejected/.test(message)) return t("Uzakta sende olmayan kayıtlar olabilir. Önce pull dene. Dallar ayrıldıysa ekip arkadaşınla incele; force push kullanma.", "The remote may have saves you do not have. Try pull first. If histories have moved apart, review them with a teammate; do not force push.");
  if (/authentication|permission denied|could not read username|403|401/.test(message)) return t("GitHub girişini kontrol et: gh auth login. HTTPS için gerekirse gh auth setup-git kullan. Tokenını buraya yazma.", "Check your GitHub login: gh auth login. For HTTPS, you may also need gh auth setup-git. Do not enter a token here.");
  if (/identity unknown|unable to auto-detect/.test(message)) return t("Git seni tanımıyor. githelp doktor ile bu projeye adını ve e-posta adresini ekle.", "Git does not know your identity yet. Use githelp doctor to set a name and email for this project.");
  if (/not possible to fast-forward|divergent/.test(message)) return t("İki dal ayrı ayrı ilerlemiş. Otomatik birleştirme yapılmadı. Birlikte incelemek için ekip arkadaşından destek al.", "The two histories have moved apart. No automatic merge was made. Ask a teammate to review them with you.");
  if (/could not resolve|unable to access ['"]?https?:|timed out|connection/.test(message)) return t("İnternet bağlantını ve uzak repo adresini kontrol et. VPN veya SSH ayarları da etkileyebilir.", "Check your internet connection and remote repository address. VPN or SSH settings may also be involved.");
  return t("Dosyaların durumunu githelp status ile görebilirsin. Teknik ayrıntı yukarıda; işlem otomatik tekrarlanmadı.", "Check your files with githelp status. The technical details are above; the operation was not retried automatically.");
}
