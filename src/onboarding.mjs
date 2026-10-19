import { execute, repository, githubRepository, validateRemote } from './git.mjs';
import { t } from './i18n.mjs';

async function inspectAccount(cwd, run, env) {
  if (env.GH_TOKEN || env.GITHUB_TOKEN) return { state: 'environment' };
  try {
    const version = await run('gh', ['--version'], { cwd, allowFailure: true, timeoutMs: 4000 });
    if (version.code !== 0) return { state: 'unverified' };
  } catch {
    return { state: 'missing-cli' };
  }
  try {
    // This can contact GitHub. Bound the check, cache it for this menu session,
    // and never print captured output, which can include account/token metadata.
    const result = await run('gh', ['auth', 'status', '--active', '--hostname', 'github.com'],
      { cwd, allowFailure: true, timeoutMs: 4000 });
    return { state: result.code === 0 ? 'verified' : 'unverified' };
  } catch {
    return { state: 'unverified' };
  }
}

export async function inspectConnection(ctx, { run = execute, inspect = repository, env = process.env } = {}) {
  const repo = await inspect(ctx.cwd);
  const targets = [];
  if (repo) {
    for (const remote of repo.remotes) {
      // Passive startup checks must not block local work because an existing
      // remote uses a name that gitHelp's mutation commands do not support.
      try { validateRemote(remote); } catch { continue; }
      for (const direction of ['fetch', 'push']) {
        const result = await run('git', ['remote', 'get-url', ...(direction === 'push' ? ['--push'] : []), '--all', remote],
          { cwd: repo.root, allowFailure: true });
        if (result.code !== 0) continue;
        for (const url of result.stdout.trim().split(/\r?\n/).filter(Boolean)) {
          try {
            githubRepository(url);
            targets.push({ remote, url, direction, protocol: url.startsWith('git@') ? 'ssh' : 'https' });
          } catch { /* Other Git hosts remain usable, but are not GitHub setup. */ }
        }
      }
    }
  }
  ctx.connectionAccount ??= await inspectAccount(ctx.cwd, run, env);
  return { repo, targets, account: ctx.connectionAccount,
    needsSetup: !repo || !targets.some(target => target.direction === 'push') || ctx.connectionAccount.state !== 'verified' };
}

export function setupOption() {
  return { id: 'setup', label: t('GitHub bağlantısını hazırla  / kurulum', 'Set up my GitHub connection  / setup'),
    description: t('Önce bağlantı yöntemini seç. En kolay yol: tarayıcıyla giriş + HTTPS.', 'Choose a connection method first. Easiest: browser sign-in + HTTPS.') };
}

export function showConnection(ui, state) {
  ui.title(t('GitHub bağlantı durumu', 'GitHub connection status'));
  ui.note(state.repo
    ? t('Git projesi: hazır. Commit, değişikliklerini bu bilgisayarda saklar.', 'Git project: ready. A commit saves your changes on this computer.')
    : t('Git projesi: henüz başlatılmadı. Kurulum bunu ilk adımda hazırlayabilir.', 'Git project: not initialized yet. Setup can prepare it as the first step.'));
  const shown = new Set();
  for (const target of state.targets) {
    const key = `${target.remote}:${target.direction}:${target.url}`;
    if (shown.has(key)) continue;
    shown.add(key);
    const sameDestination = state.targets.some(other => other.remote === target.remote && other.url === target.url && other.direction !== target.direction);
    if (sameDestination && target.direction === 'push') continue;
    const direction = sameDestination ? t('alma ve gönderme', 'fetch and push') : target.direction === 'push' ? t('gönderme', 'push') : t('alma', 'fetch');
    ui.note(t(`Kayıtlı repo adresi (${direction}): ${target.remote} → ${target.url}`,
      `Saved repository address (${direction}): ${target.remote} → ${target.url}`));
  }
  if (!state.targets.length) ui.note(t('GitHub repo adresi: kayıtlı değil. Dosyaların gönderileceği proje adresi gerekli.', 'GitHub repository address: missing. Add the address of the project that will receive your commits.'));
  const messages = {
    verified: t('Hesap: GitHub CLI oturumu doğrulandı. Bu kontrol repo için yazma iznini test etmez.', 'Account: the GitHub CLI session was verified. This does not test write access to the repository.'),
    unverified: t('Hesap: GitHub CLI oturumu doğrulanamadı; giriş eksik olabilir veya ağa ulaşılamıyor olabilir.', 'Account: the GitHub CLI session could not be verified; sign-in may be missing or the network may be unavailable.'),
    'missing-cli': t('Hesap: GitHub CLI (gh) bulunamadı. Önerilen tarayıcı girişi için https://cli.github.com adresinden kur.', 'Account: GitHub CLI (gh) was not found. Install it from https://cli.github.com for the recommended browser sign-in.'),
    environment: t('Hesap: GH_TOKEN veya GITHUB_TOKEN ortam ayarı kullanılıyor. Kayıtlı tarayıcı oturumu kontrol edilmedi.', 'Account: a GH_TOKEN or GITHUB_TOKEN environment setting is in use. Saved browser sign-in was not checked.'),
  };
  ui.note(messages[state.account.state]);
  if (state.account.state !== 'verified') ui.note(t('Mevcut HTTPS veya SSH girişin çalışıyor olabilir. Bu kontrol onları test etmez; yerel Git işlemlerine devam edebilirsin.', 'Your existing HTTPS or SSH authentication may work. This check does not test it; you can continue using local Git commands.'));
  if (state.needsSetup) ui.note(t('Önerilen ilk adım: kurulum. Hesap girişi ve repo adresini ayrı ayrı hazırlayalım.', 'Recommended first step: setup. Prepare account sign-in and the repository address separately.'));
}

export async function setup(ctx, actions, { inspect = inspectConnection } = {}) {
  ctx.ui.title(t('GitHub’a nasıl bağlanmak istersin?', 'How would you like to connect to GitHub?'));
  ctx.ui.note(t('İki şey gerekir: hesabına erişim ve bu projenin GitHub repo adresi. Burada commit veya push yapılmaz.', 'You need account access and this project’s GitHub repository address. This setup does not commit or push.'));
  const method = await ctx.ui.choose(t('Bağlantı yöntemini seç', 'Choose a connection method'), [
    { id: 'browser', label: t('Tarayıcıyla giriş + HTTPS (en kolay)', 'Browser sign-in + HTTPS (easiest)'),
      description: t('GitHub’a tarayıcıdan bir kez izin ver. Kayıtlı oturum sonraki işlemlerde kullanılır; elle token hazırlaman gerekmez.', 'Approve access in your browser once. Later operations reuse the saved session; no manual token creation is needed.') },
    { id: 'https', label: t('HTTPS ile mevcut Git girişimi kullan', 'Use my existing Git authentication over HTTPS'),
      description: t('Git ile zaten GitHub’a giriş yapabiliyorsan seç. Yalnız repo adresini hazırlarız; yeni bir hesap girişi başlatmayız.', 'Choose this if Git can already sign in to GitHub. Set up the repository address using your existing authentication.') },
    { id: 'ssh', label: t('SSH anahtarı kullan (ileri seviye)', 'Use an SSH key (advanced)'),
      description: t('GitHub hesabına eklediğin bir SSH anahtarın varsa seç. Adres git@github.com ile başlar.', 'Choose this if you have an SSH key added to GitHub. The address starts with git@github.com.') },
  ], { defaultId: 'browser' });
  let state = await inspect(ctx);
  if (method === 'browser' && state.account.state === 'missing-cli') {
    ctx.ui.note(t('1. https://cli.github.com adresinden işletim sistemine uygun GitHub CLI kurulumunu yap.', '1. Install GitHub CLI for your operating system from https://cli.github.com.'));
    ctx.ui.note(t('2. Terminali kapatıp yeniden aç; proje klasöründe aynı başlatma komutunu çalıştır ve kurulum seç.', '2. Reopen your terminal, run the same startup command in your project folder, and choose setup.'));
    return false;
  }
  if (!state.repo) {
    ctx.ui.note(t('Önce bu klasörde Git’i başlatalım. Bu adım GitHub’a dosya göndermez.', 'First initialize Git in this folder. This step does not upload files to GitHub.'));
    if (!(await actions.init(ctx)) || ctx.dryRun) return false;
    state = await inspect(ctx);
    if (!state.repo) return false;
  }
  if (method === 'browser') {
    if (!(await actions.login(ctx)) || ctx.dryRun) return false;
    delete ctx.connectionAccount;
    state = await inspect(ctx);
  } else {
    ctx.ui.note(method === 'https'
      ? t('HTTPS yolu mevcut Git girişini kullanacak. Repo adresini kaydetmek hesabına giriş yapmaz ve erişimini doğrulamaz.', 'HTTPS will use your existing Git authentication. Saving an address does not sign you in or verify access.')
      : t('SSH için bilgisayarındaki anahtarın GitHub hesabına eklenmiş olması gerekir. Rehber: https://docs.github.com/en/authentication/connecting-to-github-with-ssh', 'SSH requires a key on your computer that is added to your GitHub account. Guide: https://docs.github.com/en/authentication/connecting-to-github-with-ssh'));
  }
  const protocol = method === 'ssh' ? 'ssh' : 'https';
  if (!state.targets.some(target => target.protocol === protocol && target.direction === 'push')) {
    if (method === 'ssh' && !(await ctx.ui.confirm(t('GitHub’a eklenmiş bir SSH anahtarın var mı?', 'Do you already have an SSH key added to GitHub?')))) return false;
    const location = await ctx.ui.choose(t('Bu projenin GitHub reposu var mı?', 'Does this project have a GitHub repository?'), [
      { id: 'existing', label: t('Evet, repo adresini ekleyeceğim', 'Yes, I will add its repository address'),
        description: t('Örnek: https://github.com/kullanici/proje', 'For example: https://github.com/owner/project') },
      { id: 'new', label: t('Hayır, GitHub’da boş bir repo açacağım', 'No, I will create an empty repository on GitHub'),
        description: t('Tarayıcıda repo oluştur; sonra adresini buraya yapıştır.', 'Create the repository in your browser, then paste its address here.') },
    ], { defaultId: 'existing' });
    if (location === 'new') {
      ctx.ui.note(t('https://github.com/new adresini aç. Repository name alanına proje adını yaz; Public veya Private seç ve Create repository düğmesine bas.', 'Open https://github.com/new. Enter your project name under Repository name, choose Public or Private, then click Create repository.'));
      ctx.ui.note(t('Bu klasördeki projeyi göndereceğin için boş repo oluştur: README, .gitignore ve license ekleme. Oluşan reponun adresini aşağıya yapıştır.', 'Create an empty repository for this local project: do not add a README, .gitignore, or license. Paste the new repository address below.'));
    }
    if (!(await actions.connect(ctx, { protocol })) || ctx.dryRun) return false;
    state = await inspect(ctx);
  }
  ctx.ui.success(t('Seçtiğin bağlantı yolu için repo adresi hazır. Repo erişimi henüz denenmedi.', 'The repository address is ready for your chosen connection method. Repository access has not been tested yet.'));
  for (const target of state.targets.filter(target => target.direction === 'push' && target.protocol === protocol)) {
    ctx.ui.note(t(`Gönderim adresi: ${target.remote} → ${target.url}`, `Push destination: ${target.remote} → ${target.url}`));
  }
  ctx.ui.note(t('Sıradaki adım: değişikliklerini commit ile bilgisayarında kaydet, sonra push ile GitHub’a gönder. Push öncesinde adresi ve hedef dalı tekrar göreceksin.', 'Next: save your changes locally with commit, then send them to GitHub with push. Before pushing, you will see the address and destination branch again.'));
  return true;
}
