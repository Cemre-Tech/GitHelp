import { execute, repository, githubRepository, validateRemote, UserError } from './git.mjs';
import { commandText, Cancelled } from './ui.mjs';
import { t } from './i18n.mjs';

const host = 'github.com';
const helperKey = `credential.https://${host}.helper`;
const helper = '!gh auth git-credential';
const statusArgs = ['auth', 'status', '--active', '--hostname', host];
const loginArgs = ['auth', 'login', '--hostname', host, '--git-protocol', 'https', '--web'];

function lines(value) { return value.replace(/\r/g, '').replace(/\n$/, '').split('\n'); }
function githubAddress(value) { return /^(?:https:\/\/github\.com\/|git@github\.com:)/.test(value); }

async function repairCommands(repo, run) {
  const commands = [];
  const read = async args => {
    const result = await run('git', args, { cwd: repo.root, allowFailure: true });
    if (result.code !== 0 && result.code !== 1) throw new UserError(t('Git bağlantı ayarları okunamadı. Hiçbir bağlantı değiştirilmedi.', 'Git remote settings could not be read. No remote was changed.'));
    return result.code === 0 ? lines(result.stdout) : [];
  };
  const rewriteResult = await run('git', ['config', '--null', '--get-regexp', '^url\\..*\\.(insteadof|pushinsteadof)$'], { cwd: repo.root, allowFailure: true });
  if (![0, 1].includes(rewriteResult.code)) throw new UserError(t('Git URL yönlendirme ayarları okunamadı. Hiçbir ayar değiştirilmedi.', 'Git URL rewrite settings could not be read. No settings were changed.'));
  const rules = rewriteResult.stdout.split('\0').filter(Boolean).map(record => {
    const separator = record.indexOf('\n');
    const match = /^url\.(.*)\.(insteadof|pushinsteadof)$/i.exec(record.slice(0, separator));
    if (separator < 0 || !match) throw new UserError(t('Git URL yönlendirme ayarı anlaşılamadı. Hiçbir ayar değiştirilmedi.', 'A Git URL rewrite setting could not be understood. No settings were changed.'));
    return { base: match[1], prefix: record.slice(separator + 1), push: match[2].toLowerCase() === 'pushinsteadof' };
  });
  const checkCandidate = (name, url, { push = false, explicitPush = false } = {}) => {
    // Conservatively reject a matching rewrite, including one activated only by
    // the proposed HTTPS conversion. No temporary remotes or config writes.
    if (rules.some(rule => (!rule.push || (push && !explicitPush)) && url.startsWith(rule.prefix)
      && rule.base + url.slice(rule.prefix.length) !== url)) {
      throw new UserError(t(`${name} için yeni HTTPS adresi Git ayarlarında yeniden yönlendiriliyor. insteadOf/pushInsteadOf ayarlarını kontrol et; adresler değiştirilmedi.`, `Git settings rewrite the proposed HTTPS address for ${name}. Check insteadOf/pushInsteadOf; no addresses were changed.`));
    }
  };
  for (const name of repo.remotes) {
    validateRemote(name);
    const fetch = await read(['config', '--local', '--get-all', `remote.${name}.url`]);
    const push = await read(['config', '--local', '--get-all', `remote.${name}.pushurl`]);
    const fetchEffective = await read(['remote', 'get-url', '--all', name]);
    const pushEffective = await read(['remote', 'get-url', '--push', '--all', name]);
    const addresses = [...fetch, ...push, ...fetchEffective, ...pushEffective];
    if (!addresses.some(githubAddress)) continue;
    if (fetch.length !== 1 || push.length > 1 || fetchEffective.length !== 1 || pushEffective.length !== 1) {
      throw new UserError(t(`${name} bağlantısının birden fazla veya devralınmış adresi var. Önce Git remote ayarlarını incele; adresler değiştirilmedi.`, `${name} has multiple or inherited addresses. Review its Git remote settings first; no addresses were changed.`));
    }
    if (fetch[0] !== fetchEffective[0] || (push[0] || fetch[0]) !== pushEffective[0]) {
      throw new UserError(t(`${name} için URL yönlendirmesi var (insteadOf/pushInsteadOf). Hedefi değiştirmemek için burada durduk.`, `${name} uses a URL rewrite (insteadOf/pushInsteadOf). We stopped to avoid changing its destination.`));
    }
    if (fetch[0].startsWith('git@github.com:')) {
      const https = githubRepository(fetch[0]).url;
      await checkCandidate(name, https);
      if (!push.length) await checkCandidate(name, https, { push: true });
      commands.push({ program: 'git', args: ['remote', 'set-url', name, https] });
    }
    if (push[0]?.startsWith('git@github.com:')) {
      const https = githubRepository(push[0]).url;
      await checkCandidate(name, https, { push: true, explicitPush: true });
      commands.push({ program: 'git', args: ['remote', 'set-url', '--push', name, https] });
    }
  }
  const existing = await read(['config', '--local', '--get-all', helperKey]);
  if (existing.length !== 2 || existing[0] !== '' || existing[1] !== helper) {
    commands.unshift(
      { program: 'git', args: ['config', '--local', '--replace-all', helperKey, ''] },
      { program: 'git', args: ['config', '--local', '--add', helperKey, helper] },
    );
  }
  return commands;
}

export async function login(ctx, { run = execute, env = process.env, inspect = repository } = {}) {
  const repo = await inspect(ctx.cwd);
  if (!repo) throw new UserError(t('Önce bu projeyi Git ile başlat: githelp init. Sonra login ile hesabını bağlayabilirsin.', 'Start this project with githelp init first. Then connect your account with login.'));
  const tokenEnv = ['GH_TOKEN', 'GITHUB_TOKEN'].filter(key => env[key]);
  if (tokenEnv.length) throw new UserError(t(`${tokenEnv.join(', ')} ortam değişkeni etkin. Kalıcı tarayıcı girişi için bu değişkeni terminal oturumundan kaldırıp login komutunu tekrar çalıştır.`, `${tokenEnv.join(', ')} is set in this terminal. Remove that environment variable from the session before using login for a saved browser sign-in.`));

  await run('gh', ['--version'], { cwd: repo.root });
  // Auth output is deliberately never printed, even when authentication fails.
  const status = await run('gh', statusArgs, { cwd: repo.root, allowFailure: true });
  const needsLogin = status.code !== 0;
  const commands = await repairCommands(repo, run);
  let changeProtocol = false;
  if (!needsLogin) {
    const protocol = await run('gh', ['config', 'get', 'git_protocol', '--host', host], { cwd: repo.root, allowFailure: true });
    if (protocol.code !== 0 || !['ssh', 'https'].includes(protocol.stdout.trim())) {
      throw new UserError(t('GitHub CLI bağlantı tercihi okunamadı. GitHub CLI kurulumunu doktor ile kontrol edip tekrar dene.', 'The GitHub CLI transport preference could not be read. Check your GitHub CLI setup with doctor and try again.'));
    }
    changeProtocol = protocol.stdout.trim() === 'ssh';
    if (changeProtocol) commands.unshift({ program: 'gh', args: ['config', 'set', 'git_protocol', 'https', '--host', host] });
  }
  ctx.ui.title(t('GitHub hesabına giriş yap', 'Sign in to your GitHub account'));
  ctx.ui.note(needsLogin
    ? t('GitHub CLI bir kod gösterecek. Tarayıcıda GitHub hesabına giriş yap, bu kodu yaz ve erişime izin ver. Token oluşturup buraya yapıştırman gerekmez.', 'GitHub CLI will show a code. Sign in to GitHub in your browser, enter that code and approve access. You do not need to create or paste a token here.')
    : t('GitHub CLI’de geçerli bir hesabın zaten açık. Aynı hesabı kullanacağız; yeniden giriş gerekmez.', 'GitHub CLI already has a valid signed-in account. We will use that account; you do not need to sign in again.'));
  ctx.ui.note(t('Bu adım hesabını hazırlar. Dosyalarını kaydetmez veya GitHub’a göndermez. Gönderilecek GitHub repo adresi ayrıca bu projeye eklenmiş olmalı.', 'This step prepares your account. It does not save your files or send them to GitHub. This project also needs the address of the GitHub repository you will send to.'));
  ctx.ui.note(t('GitHub CLI giriş bilgini saklar. Bu projede Git, GitHub HTTPS işlemlerinde o hesabı kullanacak. Varsa desteklenen GitHub SSH adresleri aynı reponun HTTPS adresine çevrilecek.', 'GitHub CLI saves your sign-in. Git in this project will use that account for GitHub HTTPS operations. Supported GitHub SSH addresses, if any, will change to HTTPS for the same repository.'));
  if (needsLogin || changeProtocol) ctx.ui.note(t('GitHub CLI’nin github.com için bağlantı tercihi HTTPS olacak. Bu tercih kullanıcı hesabında saklanır; bu kullanıcıyla daha sonra gh üzerinden oluşturulan repoları da etkiler.', 'GitHub CLI will prefer HTTPS for github.com. This preference is saved for your user account and also applies to repositories you create later with gh.'));
  if (needsLogin) ctx.ui.note(t('GitHub CLI, Git işlemlerinde de bu hesabı kullanmak isteyip istemediğini sorabilir. Bu, push ve pull için hesabın kullanılmasını sağlar.', 'GitHub CLI may ask whether Git should use this account too. This lets Git use it for push and pull.'));
  ctx.ui.note(t('Çalışacak komutlar:', 'Commands to run:'));
  if (needsLogin) ctx.ui.write(`    ${commandText('gh', loginArgs)}`);
  commands.forEach(command => ctx.ui.write(`    ${commandText(command.program, command.args)}`));
  if (ctx.dryRun) {
    ctx.ui.note(t('Prova: tarayıcı açılmadı, oturum veya Git ayarları değiştirilmedi.', 'Dry run: no browser was opened, and no session or Git settings were changed.'));
    return false;
  }
  if (!needsLogin && !commands.length) {
    ctx.ui.success(t('GitHub hesabın ve bu projenin HTTPS hesap ayarı hazır. Dosyalarını commit ile kaydet. Repo adresi yoksa connect ile ekle veya ilk commit’ten sonra publish ile repo oluştur. Sonra push ile gönder.', 'Your GitHub account and this project’s HTTPS account settings are ready. Save your files with commit. If a repository address is missing, add one with connect or create a repository with publish after your first commit. Then send your commits with push.'));
    ctx.ui.note(t('Bu kontrol, belirli bir repoya erişim veya yazma iznin olduğunu doğrulamaz.', 'This check does not verify access or write permission to a particular repository.'));
    return true;
  }
  if (needsLogin && (!ctx.ui.input?.isTTY || !ctx.ui.output?.isTTY)) {
    throw new UserError(t('İlk tarayıcı girişini gerçek bir terminalde çalıştır: npm start -- login. Boruyla veya arka planda giriş başlatılmaz.', 'Run the first browser sign-in in an interactive terminal: npm start -- login. Login is not started through a pipe or in the background.'));
  }
  if (!(await ctx.ui.confirm(t('Gösterilen giriş ve HTTPS ayarlarını uygulayalım mı?', 'Apply the sign-in and HTTPS settings shown?')))) {
    ctx.ui.note(t('Vazgeçildi. Tarayıcı açılmadı ve Git ayarları değiştirilmedi.', 'Cancelled. No browser was opened and no Git settings were changed.'));
    return false;
  }
  if (needsLogin) {
    try {
      await ctx.ui.withTerminal(async () => {
        const result = await run('gh', loginArgs, { cwd: repo.root, interactive: true });
        if (result.code !== 0) throw new UserError('GitHub sign-in did not complete.');
      });
    } catch (error) {
      if (error instanceof Cancelled || error.signal === 'SIGINT' || error.code === 130) throw new Cancelled();
      throw new UserError(t('GitHub girişi tamamlanmadı. Projenin Git bağlantıları ve ayarları değiştirilmedi; login ile tekrar deneyebilirsin.', 'GitHub sign-in did not complete. The project’s Git remotes and settings were not changed. You can try login again.'));
    }
    const verified = await run('gh', statusArgs, { cwd: repo.root, allowFailure: true });
    if (verified.code !== 0) throw new UserError(t('GitHub oturumu doğrulanamadı. Projenin Git ayarları değiştirilmedi. login ile tekrar dene.', 'The GitHub session could not be verified. The project’s Git settings were not changed. Try login again.'));
  }
  for (const command of commands) await run(command.program, command.args, { cwd: repo.root });
  ctx.ui.success(t('GitHub hesabın hazır; sonraki işlemlerde kayıtlı giriş kullanılacak. Dosyalarını commit ile kaydet. Repo adresi yoksa connect ile ekle veya ilk commit’ten sonra publish ile repo oluştur. Sonra push ile gönder.', 'Your GitHub account is ready; later operations will reuse your saved sign-in. Save your files with commit. If a repository address is missing, add one with connect or create a repository with publish after your first commit. Then send your commits with push.'));
  ctx.ui.note(t('Hesaba giriş yapmak, her repoya yazma izni vermez. Repo adresi ve erişim izni gönderim sırasında ayrıca kontrol edilir.', 'Signing in does not grant write access to every repository. The repository address and your access are checked separately when you send commits.'));
  return true;
}
