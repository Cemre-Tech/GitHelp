import { t } from './i18n.mjs';
import { copyFile, lstat, mkdir, readdir, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserError } from './git.mjs';

const runtime = dirname(fileURLToPath(import.meta.url));

export async function install(ctx, target = ctx.cwd) {
  const root = await realpath(resolve(ctx.cwd, target)).catch(() => { throw new UserError(t("Hedef klasör bulunamadı. Önce proje klasörünü oluştur.", "The target folder was not found. Create the project folder first.")); });
  if (!(await lstat(root)).isDirectory()) throw new UserError(t("Hedef bir proje klasörü olmalı.", "The target must be a project folder."));
  const github = join(root, '.github');
  const destination = join(github, 'githelp');
  const githubStat = await lstat(github).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (githubStat && (githubStat.isSymbolicLink() || !githubStat.isDirectory())) throw new UserError(t(".github gerçek bir klasör olmalı; bağlantı veya dosya içine kurulum yapılmaz.", ".github must be a real directory, not a link or a file."));
  const existing = await lstat(destination).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (existing) throw new UserError(t(".github/githelp zaten var. Mevcut kurulumun üzerine yazılmadı. Yeni sürümü ayrı bir klasörde inceleyip güncelleyebilirsin.", ".github/githelp already exists. The existing installation was not overwritten. Review the new version in a separate folder before updating."));

  ctx.ui.title(t("gitHelp bu projenin yanında dursun", "Keep gitHelp with this project"));
  ctx.ui.note(t(`Hedef: ${destination}`, `Destination: ${destination}`));
  ctx.ui.note(t("Yalnızca .github/githelp oluşturulur. Projenin package.json ve workflow dosyaları değiştirilmez.", "Only .github/githelp is created. The project’s package.json and workflows are left as they are."));
  if (ctx.dryRun) { ctx.ui.note(t("Prova: hiçbir dosya oluşturulmadı.", "Dry run: no files were created.")); return; }
  if (!(await ctx.ui.confirm(t("Terminal aracını buraya kopyalayalım mı?", "Copy the terminal tool here?")))) return;

  // mkdir without recursive is intentional: never merge into an existing install.
  if (!githubStat) await mkdir(github);
  await mkdir(destination);
  const entries = (await readdir(runtime)).filter(name => name.endsWith('.mjs'));
  for (const entry of entries) await copyFile(join(runtime, entry), join(destination, entry));
  const license = await lstat(join(runtime, 'LICENSE')).then(() => join(runtime, 'LICENSE'), () => join(runtime, '..', 'LICENSE'));
  await copyFile(license, join(destination, 'LICENSE'));
  ctx.ui.success(t("Kuruldu. Projenin kök klasöründe tek komut:", "Installed. From your project root, run:"));
  ctx.ui.write('    node .github/githelp/cli.mjs');
  ctx.ui.note(t("Bu dosyaları commit edersen ekip arkadaşların da aynı komutu kullanabilir.", "Commit these files so your teammates can use the same command."));
}
