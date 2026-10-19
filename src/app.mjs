import { t } from './i18n.mjs';
import { basename } from 'node:path';
import { commandText, Cancelled } from './ui.mjs';
import { execute, git, gitText, repository, UserError, requireBranch, requireClean, requireIdle,
  validateRemote, pushArgs, pullArgs, githubRepository } from './git.mjs';
import { assertSafeFiles, selectFiles } from './safety.mjs';
import { demo, getLessons, teach } from './lessons.mjs';
import { install } from './install.mjs';
import { login } from './auth.mjs';

export const VERSION = '0.2.0';

const aliases = {
  durum: 'status', kaydet: 'commit', gonder: 'push', 'gönder': 'push', al: 'pull', dal: 'branch',
  baslat: 'init', 'başlat': 'init', bagla: 'connect', 'bağla': 'connect', github: 'publish',
  yayinla: 'publish', 'yayınla': 'publish', kur: 'install', doktor: 'doctor', ogren: 'learn', 'öğren': 'learn',
  yardim: 'help', 'yardım': 'help', '--help': 'help', '-h': 'help', '--version': 'version', '-v': 'version',
  giris: 'login', 'giriş': 'login',
};

function getMenu() { return [
  { id: 'status', label: t("Neler değişti?  / status", "What changed?  / status"), description: t("Dosyalarının durumuna bak.", "Check the state of your files.") },
  { id: 'commit', label: t("Çalışmamı kaydet  / commit", "Save my work  / commit"), description: t("Dosyalarını seç, bir kayıt notu yaz.", "Choose files and write a short save note.") },
  { id: 'push', label: t("Kayıtlarımı gönder  / push", "Send my saves  / push"), description: t("Bir dal seç, GitHub’a gönder.", "Choose a branch and send its commits to GitHub.") },
  { id: 'pull', label: t("Yeni kayıtları al  / pull", "Get new saves  / pull"), description: t("Çalıştığın dalı uzaktaki aynı daldan güncelle.", "Update your branch from the remote branch with the same name.") },
  { id: 'branch', label: t("Çalışma dalımı seç  / branch", "Choose my work branch  / branch"), description: t("Yeni dal oluştur veya başka dala geç.", "Create a branch or switch to another one.") },
  { id: 'pr', label: t("İnceleme isteği aç  / pr", "Ask for a review  / pr"), description: t("GitHub’da bir taslak pull request aç.", "Open a draft pull request on GitHub.") },
  { id: 'connect', label: t("GitHub adresini bağla  / bagla", "Connect a GitHub address  / connect"), description: t("Var olan GitHub reponun adresini tanıt.", "Add the address of your existing GitHub repository.") },
  { id: 'login', label: t('GitHub hesabımla giriş yap  / giriş', 'Sign in to my GitHub account  / login'), description: t('Bir kez tarayıcıdan bağlan; geçerli oturum tekrar kullanılır.', 'Connect through your browser once; reuse the valid session.') },
  { id: 'publish', label: t("GitHub’da yeni repo oluştur  / yayinla", "Create a GitHub repository  / publish"), description: t("GitHub CLI ile yeni bir uzak repo aç.", "Use GitHub CLI to create a remote repository.") },
  { id: 'doctor', label: t("Kurulumumu kontrol et  / doktor", "Check my setup  / doctor"), description: t("Git, kimlik ve bağlantı durumunu öğren.", "Check Git, your commit identity, and remotes.") },
  { id: 'learn', label: t("Kelimeleri öğren  / ogren", "Learn the words  / learn"), description: t("Git’i küçük örneklerle tanı.", "Get to know Git through simple explanations.") },
  { id: 'install', label: t("Bu projeye yerleş  / kur", "Keep gitHelp in this project  / install"), description: t("Aracı .github/githelp içine kopyala.", "Copy the tool into .github/githelp.") },
]; }

function showFiles(ui, files) {
  files.forEach((file, index) => {
    const type = file.conflict ? t("çakışıyor", "conflicted") : file.code === '??' ? t("yeni", "new") : file.code.includes('D') ? t("silinmiş", "deleted") : file.code.includes('R') ? t("yeniden adlandırılmış", "renamed") : t("değişmiş", "modified");
    ui.write(`  ${index + 1}. ${file.path} — ${type}${file.staged ? t(", kayıt sepetinde", ", staged") : ''}`);
  });
}

async function requireRepo(ctx) {
  const repo = await repository(ctx.cwd);
  if (!repo) throw new UserError(t("Bu klasör henüz bir Git projesi değil. Başlamak için: githelp baslat", "This folder is not a Git project yet. Start with: githelp init"));
  return repo;
}

export async function applyPlan(ctx, cwd, message, commands) {
  ctx.ui.title(message);
  ctx.ui.note(t("Öğrendiğin komut:", "The command you are learning:"));
  for (const command of commands) ctx.ui.write(`    ${commandText(command.program, command.args)}`);
  if (ctx.dryRun) { ctx.ui.note(t("Prova: bu komutlar çalıştırılmadı.", "Dry run: these commands were not executed.")); return false; }
  if (!(await ctx.ui.confirm())) { ctx.ui.note(t("Vazgeçildi. Bu komutlar çalıştırılmadı.", "Cancelled. These commands were not executed.")); return false; }
  for (const command of commands) {
    const result = command.program === 'git'
      ? await git(cwd, command.args)
      : await execute(command.program, command.args, { cwd });
    if (result.stdout.trim()) ctx.ui.write(result.stdout.trim());
    if (result.stderr.trim()) ctx.ui.write(result.stderr.trim());
  }
  return true;
}

async function status(ctx) {
  const repo = await requireRepo(ctx);
  teach(ctx.ui, 'status');
  ctx.ui.note(t(`Proje: ${repo.root}`, `Project: ${repo.root}`));
  ctx.ui.note(t(`Çalıştığın dal: ${repo.branch || t("bir dalda değilsin (detached HEAD)", "not on a branch (detached HEAD)")}`, `Current branch: ${repo.branch || t("bir dalda değilsin (detached HEAD)", "not on a branch (detached HEAD)")}`));
  if (!repo.hasCommit) ctx.ui.note(t("Henüz ilk kaydın yok. commit ile başlayabilirsin.", "You have no saves yet. Start with commit."));
  if (repo.files.length) showFiles(ctx.ui, repo.files);
  else ctx.ui.success(t("Çalışma masan temiz. Kaydedilmemiş dosya değişikliği yok.", "Your worktable is clean. There are no unsaved file changes."));
  if (repo.hasCommit && repo.branch) {
    const upstream = await git(repo.root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], { allowFailure: true });
    if (upstream.code === 0) {
      const counts = await gitText(repo.root, ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']);
      const [ahead, behind] = counts.split(/\s+/);
      ctx.ui.note(t(`Son bilinen ${upstream.stdout.trim()} durumuna göre: ${ahead} kayıt önde, ${behind} kayıt geride.`, `Compared with the last known ${upstream.stdout.trim()}: ${ahead} saves ahead, ${behind} behind.`));
      ctx.ui.note(t("Bu bilgi son fetch/pull anına aittir; şu anda ağa bağlanılmadı.", "This is from the last fetch/pull. No network request was made just now."));
    } else ctx.ui.note(t("Bu dal henüz bir uzak dalı takip etmiyor. İlk push bağlantıyı kurar.", "This branch is not tracking a remote branch yet. Its first push sets that up."));
  }
}

async function commit(ctx) {
  const repo = await requireRepo(ctx);
  requireBranch(repo);
  await requireIdle(repo);
  teach(ctx.ui, 'commit');
  if (!repo.files.length) { ctx.ui.success(t("Kaydedilecek yeni bir değişiklik yok.", "There are no new changes to save.")); return; }
  showFiles(ctx.ui, repo.files);
  ctx.ui.note(t("Seçtiğin dosyaların bütün güncel hali kaydedilir. Önceden kısmen stage ettiğin satırlar da buna dahildir.", "Each selected file is saved in full, including lines you may have left out when staging parts of it earlier."));
  const answer = await ctx.ui.ask(t("Hangi dosyalar? Örnek: 1,3 veya hepsi", "Which files? For example: 1,3 or all"), { required: true });
  const selected = selectFiles(answer, repo.files);
  assertSafeFiles(selected);
  const omitted = repo.files.filter(file => file.staged && !selected.includes(file));
  if (omitted.length) throw new UserError(t(`Kayıt sepetinde seçmediğin dosyalar var: ${omitted.map(file => file.path).join(', ')}. Onları da seç veya önce Git ile sepetten çıkar. Henüz hiçbir dosya eklenmedi.`, `Some staged files were not selected: ${omitted.map(file => file.path).join(', ')}. Select them too, or unstage them with Git first. No files have been added yet.`));
  const identity = await Promise.all(['user.name', 'user.email'].map(key => gitText(repo.root, ['config', '--get', key], { allowFailure: true })));
  if (identity.some(value => !value)) throw new UserError(t("İlk kayıttan önce Git’e adını ve e-postanı tanıtmalısın: githelp doktor", "Before your first save, tell Git your name and email: githelp doctor"));
  const message = await ctx.ui.ask(t("Ne yaptın? Örnek: Giriş ekranını ekle", "What did you do? For example: Add the login screen"), { required: true });
  ctx.ui.note(t(`Kayıt sepetine girecek ${selected.length} dosya: ${selected.map(file => file.path).join(', ')}`, `${selected.length} files will be staged: ${selected.map(file => file.path).join(', ')}`));
  const commands = [
    { program: 'git', args: ['--literal-pathspecs', 'add', '--', ...selected.map(file => file.path)] },
    { program: 'git', args: ['commit', '-m', message] },
  ];
  if (await applyPlan(ctx, repo.root, t("Bu dosyaları bilgisayarındaki geçmişe kaydet", "Save these files in your local history"), commands)) {
    ctx.ui.success(t("Kayıt alındı. GitHub’a göndermek için sıradaki adım: push.", "Saved locally. Next, use push to send your commits to GitHub."));
  }
}

async function chooseRemote(ctx, repo, { pushing = false } = {}) {
  if (!repo.remotes.length) throw new UserError(t("Uzak repo adresin yok. Var olan adresi bagla ile ekle veya yayinla ile GitHub’da yeni repo oluştur.", "You have no remote address. Use connect to add an existing repository, or publish to create one on GitHub."));
  const options = await Promise.all(repo.remotes.map(async name => {
    validateRemote(name);
    return { id: name, label: name,
      description: await gitText(repo.root, ['remote', 'get-url', ...(pushing ? ['--push'] : []), '--all', name]) };
  }));
  const remote = await ctx.ui.choose(t("Hangi uzak repoyla çalışalım?", "Which remote repository should we use?"), options, { defaultId: repo.remotes.includes('origin') ? 'origin' : repo.remotes[0] });
  if (pushing && options.find(option => option.id === remote).description.includes('\n')) {
    throw new UserError(t("Bu uzak bağlantının birden fazla gönderim adresi var. gitHelp tek bir hedefle çalışır. Önce Git remote ayarlarını incele.", "This remote has more than one push address. gitHelp works with a single destination. Review your Git remote settings first."));
  }
  return validateRemote(remote);
}

async function push(ctx) {
  const repo = await requireRepo(ctx);
  await requireIdle(repo);
  requireBranch(repo);
  teach(ctx.ui, 'push');
  if (!repo.hasCommit) throw new UserError(t("Göndermeden önce en az bir commit almalısın: githelp commit", "Make at least one save before sending: githelp commit"));
  const branch = await ctx.ui.choose(t("Hangi dalın kayıtlarını gönderelim?", "Which branch should we send?"), repo.branches.map(name => ({
    id: name, label: name, description: name === repo.branch ? t("Şu an çalıştığın dal.", "The branch you are working on now.") : t("Bu dalın önceden kaydedilmiş commit’leri gönderilir.", "Only the commits already saved on this branch will be sent."),
  })), { defaultId: repo.branch });
  const remote = await chooseRemote(ctx, repo, { pushing: true });
  if (repo.files.length) ctx.ui.note(t("Kaydedilmemiş değişikliklerin var. Push yalnız commit’leri gönderir.", "You have unsaved file changes. Push only sends commits."));
  if (['main', 'master'].includes(branch)) ctx.ui.note(t("Ana dalı seçtin. Bu dal ekip arkadaşlarınla paylaştığın ortak çalışma olabilir.", "You chose the main branch. This may be the shared work your teammates rely on."));
  if (await applyPlan(ctx, repo.root, `${branch} → ${remote}/${branch}`, [{ program: 'git', args: pushArgs(remote, branch) }])) {
    ctx.ui.success(t("Kayıtların gönderildi. Bir özellik dalındaysan pr ile inceleme isteği açabilirsin.", "Your commits were sent. On a feature branch, use pr to ask for a review."));
  }
}

async function pull(ctx) {
  const repo = await requireRepo(ctx);
  requireBranch(repo);
  requireClean(repo);
  await requireIdle(repo);
  if (!repo.hasCommit) throw new UserError(t("Bu klasörde henüz commit yok. Var olan bir projeyi almak için git clone kullanabilirsin.", "This folder has no commits yet. To download an existing project, use git clone."));
  teach(ctx.ui, 'pull');
  ctx.ui.note(t(`Çalıştığın dal: ${repo.branch}. Aynı isimli uzak daldan kayıtlar alınacak.`, `Current branch: ${repo.branch}. Saves will come from the remote branch with the same name.`));
  const remote = await chooseRemote(ctx, repo);
  ctx.ui.note(t("Dallar ayrı ayrı ilerlemişse dururuz; kendiliğinden merge veya rebase yapılmaz.", "If the histories have moved apart, we stop. No automatic merge or rebase."));
  if (await applyPlan(ctx, repo.root, `${remote}/${repo.branch} → ${repo.branch}`, [{ program: 'git', args: pullArgs(remote, repo.branch) }])) {
    ctx.ui.success(t("Yeni kayıtlar alındı. Çalışmaya devam edebilirsin.", "New saves received. You can keep working."));
  }
}

async function branch(ctx) {
  const repo = await requireRepo(ctx);
  await requireIdle(repo);
  teach(ctx.ui, 'branch');
  const action = await ctx.ui.choose(t("Çalışma masanı düzenle", "Organize your worktable"), [
    { id: 'new', label: t("Yeni dal oluştur ve ona geç", "Create a new branch and switch to it"), description: t("Örnek: ozellik/karanlik-tema", "For example: feature/dark-theme") },
    { id: 'switch', label: t("Var olan bir dala geç", "Switch to an existing branch"), description: t("Önce çalışma masanın temiz olması gerekir.", "Your worktable needs to be clean first.") },
  ], { defaultId: 'new' });
  if (!repo.hasCommit) throw new UserError(t("Yeni dal oluşturmadan önce ilk commit’ini al. İlk dalın adı genellikle main olur.", "Make your first commit before creating another branch. The first branch is usually called main."));
  let args;
  if (action === 'new') {
    const name = await ctx.ui.ask(t("Yeni dalın adı", "Name of your new branch"), { required: true });
    const valid = await git(repo.root, ['check-ref-format', '--branch', name], { allowFailure: true });
    if (name.startsWith('-') || name.startsWith('@') || valid.code !== 0) throw new UserError(t("Bu dal adı kullanılamaz. Boşluk yerine tire kullan: ozellik/giris-ekrani", "That branch name cannot be used. Try hyphens instead of spaces: feature/login-screen"));
    args = ['switch', '-c', name, '--no-track'];
    ctx.ui.note(t("Kaydedilmemiş değişikliklerin varsa yeni dalına taşınır; henüz commit yapılmaz.", "Any unsaved changes move with you to the new branch. This does not make a commit."));
  } else {
    requireClean(repo);
    const alternatives = repo.branches.filter(name => name !== repo.branch);
    if (!alternatives.length) throw new UserError(t("Başka bir yerel dal yok. Önce yeni bir dal oluştur.", "There are no other local branches. Create a new one first."));
    const name = await ctx.ui.choose(t("Hangi dala geçelim?", "Which branch should we switch to?"), alternatives.map(name => ({ id: name, label: name })));
    args = ['switch', '--', name];
  }
  if (await applyPlan(ctx, repo.root, t("Çalışma dalını değiştir", "Change your work branch"), [{ program: 'git', args }])) ctx.ui.success(t("Artık yeni çalışma dalındasın.", "You are now on your chosen work branch."));
}

async function init(ctx) {
  if (await repository(ctx.cwd)) throw new UserError(t("Bu klasör zaten bir Git projesinin içinde. githelp status ile görebilirsin.", "This folder is already inside a Git project. Check it with githelp status."));
  teach(ctx.ui, 'git');
  ctx.ui.note(t(`Bu klasörün kayıt defteri açılacak: ${ctx.cwd}`, `A notebook will be started for this folder: ${ctx.cwd}`));
  if (await applyPlan(ctx, ctx.cwd, t("İlk dalın main olsun", "Start with a branch called main"), [{ program: 'git', args: ['init', '--initial-branch=main'] }])) {
    ctx.ui.success(t("Kayıt defteri hazır. Sıradaki adım: doktor, ardından commit.", "Your project notebook is ready. Next: doctor, then commit."));
  }
}

async function connect(ctx) {
  const repo = await requireRepo(ctx);
  teach(ctx.ui, 'remote');
  ctx.ui.note(t("Henüz GitHub repon yoksa https://github.com/new adresinde boş bir repo açabilir veya yayinla komutunu kullanabilirsin.", "If you have no GitHub repository yet, create an empty one at https://github.com/new or use publish."));
  const url = await ctx.ui.ask(t("GitHub reponun adresi", "Your GitHub repository address"), { required: true });
  const target = githubRepository(url);
  const name = validateRemote(await ctx.ui.ask(t("Bu adresin kısa adı", "A short name for this address"), { fallback: 'origin' }));
  if (repo.remotes.includes(name)) throw new UserError(t(`${name} zaten kayıtlı. Mevcut bağlantı değiştirilmedi. Başka bir kısa ad seçebilirsin.`, `${name} is already registered. The existing address was not changed. Choose another short name.`));
  const remoteUrl = target.url;
  if (url.startsWith('git@')) ctx.ui.note(t('Aynı repoya HTTPS ile bağlanacağız. SSH anahtarı yerine tarayıcı girişi kullanmak için login seçebilirsin.', 'We will connect to the same repository over HTTPS. Choose login to sign in through your browser instead of using an SSH key.'));
  if (await applyPlan(ctx, repo.root, `${name} → ${target.fullName}`, [{ program: 'git', args: ['remote', 'add', '--', name, remoteUrl] }])) {
    ctx.ui.success(t('Adres bağlandı. Hesabını login ile bir kez bağlayabilir, ardından push ile gönderebilirsin.', 'Address connected. Connect your account once with login, then send your commits with push.'));
  }
}

async function requireGh(ctx) {
  await execute('gh', ['--version'], { cwd: ctx.cwd });
  // Never print gh auth status: it may include account details or token metadata.
  const auth = await execute('gh', ['auth', 'status', '--active', '--hostname', 'github.com'], { cwd: ctx.cwd, allowFailure: true });
  if (auth.code !== 0) throw new UserError(t('GitHub hesabını bir kez githelp login ile tarayıcıdan bağla, sonra tekrar gel.', 'Connect your GitHub account once through your browser with githelp login, then come back.'));
}

async function publish(ctx) {
  const repo = await requireRepo(ctx);
  await requireIdle(repo);
  if (repo.remotes.includes('origin')) throw new UserError(t("origin adresin zaten var. GitHub’a kayıt göndermek için push kullan.", "You already have an origin address. Use push to send commits to GitHub."));
  if (!repo.hasCommit) throw new UserError(t("Önce bir commit al; ardından GitHub’da repo oluşturabiliriz.", "Make a commit first, then we can create a GitHub repository."));
  await requireGh(ctx);
  ctx.ui.title(t("Projeye GitHub’da bir ev aç", "Give your project a home on GitHub"));
  const name = await ctx.ui.ask(t("Repo adı veya kullanici/repo", "Repository name or owner/repository"), { fallback: basename(repo.root) });
  if (!/^(?:[A-Za-z0-9][A-Za-z0-9-]*\/)?[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)) throw new UserError(t("Repo adı harf, sayı, tire, alt çizgi veya nokta içermeli.", "Use letters, numbers, hyphens, underscores, or dots in the repository name."));
  const visibility = await ctx.ui.choose(t("Bu repoyu kim görebilsin?", "Who should be able to see this repository?"), [
    { id: 'private', label: t("Özel", "Private"), description: t("Sen ve erişim verdiğin kişiler.", "You and the people you give access to.") },
    { id: 'public', label: t("Herkese açık", "Public"), description: t("İnternetteki herkes. Açık kaynak için bunu seçebilirsin.", "Anyone on the internet. You can choose this for open source.") },
  ], { defaultId: 'private' });
  ctx.ui.note(t("GitHub’da repo açılacak ve origin adresi eklenecek. Dosyaları göndermek sonraki push adımıdır.", "A GitHub repository will be created and connected as origin. Sending your commits is a separate push step."));
  if (await applyPlan(ctx, repo.root, t(`GitHub’da ${visibility === 'public' ? t("herkese açık", "public") : t("özel", "private")} repo oluştur`, `Create a ${visibility} repository on GitHub`), [
    { program: 'gh', args: ['repo', 'create', name, `--${visibility}`, '--source', repo.root, '--remote', 'origin'] },
  ])) ctx.ui.success(t("GitHub repon hazır. Kayıtlarını göndermek için: push.", "Your GitHub repository is ready. Send your commits with push."));
}

async function pr(ctx) {
  const repo = await requireRepo(ctx);
  requireBranch(repo);
  requireClean(repo);
  await requireIdle(repo);
  if (!repo.hasCommit) throw new UserError(t("Önce commit al ve push ile dalını gönder.", "First make a commit and send your branch with push."));
  teach(ctx.ui, 'pr');
  await requireGh(ctx);
  const remote = await chooseRemote(ctx, repo, { pushing: true });
  const pushUrl = await gitText(repo.root, ['remote', 'get-url', '--push', remote]);
  const target = githubRepository(pushUrl);
  const base = await ctx.ui.ask(t("Çalışman hangi dala eklensin?", "Which branch should your work be added to?"), { fallback: 'main' });
  const valid = await git(repo.root, ['check-ref-format', '--branch', base], { allowFailure: true });
  if (valid.code !== 0 || base.startsWith('-') || base.startsWith('@')) throw new UserError(t("Geçerli bir hedef dal adı yaz: main veya develop gibi.", "Enter a valid target branch name, such as main or develop."));
  if (base === repo.branch) throw new UserError(t("Kaynak ve hedef dal aynı olamaz. branch ile bir özellik dalı oluştur.", "The source and target cannot be the same branch. Use branch to create a feature branch."));
  if (!ctx.dryRun) {
    const remoteHead = await gitText(repo.root, ['ls-remote', '--heads', '--', pushUrl, `refs/heads/${repo.branch}`]);
    const localHead = await gitText(repo.root, ['rev-parse', 'HEAD']);
    if (remoteHead.split(/\s+/)[0] !== localHead) throw new UserError(t("Dalının son kaydı uzakta yok veya farklı. Önce push ile gönder; sonra PR aç.", "Your latest commit is missing or different on the remote. Push your branch before opening a PR."));
  }
  const title = await ctx.ui.ask(t("İnceleme isteğinin başlığı", "A title for your review request"), { required: true });
  const body = await ctx.ui.ask(t("Ne değişti, nasıl denedin?", "What changed, and how did you test it?"), { required: true });
  ctx.ui.note(t(`${target.fullName}: ${repo.branch} → ${base}. Önce taslak açılır; hazır olunca GitHub’dan incelemeye sunabilirsin.`, `${target.fullName}: ${repo.branch} → ${base}. This starts as a draft. Mark it ready for review on GitHub when you are ready.`));
  if (await applyPlan(ctx, repo.root, t("Taslak pull request aç", "Open a draft pull request"), [{ program: 'gh', args: [
    'pr', 'create', '--repo', target.fullName, '--draft', '--base', base, '--head', repo.branch, '--title', title, '--body', body,
  ] }])) ctx.ui.success(t("Taslak PR açıldı. Yukarıdaki bağlantıdan inceleyebilirsin.", "Draft PR opened. You can view it at the link above."));
}

async function doctor(ctx) {
  ctx.ui.title(t("Birlikte kurulumunu kontrol edelim", "Let us check your setup"));
  ctx.ui.note(await gitText(ctx.cwd, ['--version']));
  ctx.ui.note(`Node.js ${process.versions.node}`);
  const repo = await repository(ctx.cwd);
  if (!repo) { ctx.ui.note(t("Git projesi bulunamadı. Başlamak için: baslat.", "No Git project found. Start with: init.")); return; }
  ctx.ui.note(t(`Proje: ${repo.root}`, `Project: ${repo.root}`));
  const name = await gitText(repo.root, ['config', '--get', 'user.name'], { allowFailure: true });
  const email = await gitText(repo.root, ['config', '--get', 'user.email'], { allowFailure: true });
  ctx.ui.note(t(`Kayıt kimliği: ${name && email ? t("hazır", "ready") : t("eksik", "missing")}. Bu kimlik GitHub oturumu açmaz.`, `Commit identity: ${name && email ? 'ready' : 'missing'}. This does not sign you in to GitHub.`));
  ctx.ui.note(t(`Uzak bağlantılar: ${repo.remotes.join(', ') || t("henüz yok", "none yet")}`, `Remotes: ${repo.remotes.join(', ') || 'none yet'}`));
  if (!name || !email) {
    ctx.ui.note(t("Commit’lerde bu ad ve e-posta görünür. Gizlilik için GitHub Settings → Emails bölümündeki noreply adresini kullanabilirsin.", "This name and email appear in commits. For privacy, you can use the noreply address from GitHub Settings → Emails."));
    if (await ctx.ui.confirm(t("Yalnız bu proje için kayıt kimliği ekleyelim mi?", "Set a commit identity for this project only?"))) {
      const newName = await ctx.ui.ask(t("Görünen adın", "Your display name"), { fallback: name || undefined, required: true });
      const newEmail = await ctx.ui.ask(t("Commit e-posta adresin", "Your commit email address"), { fallback: email || undefined, required: true });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new UserError(t("E-posta adresini kontrol et: isim@example.com", "Check your email address: name@example.com"));
      if (await applyPlan(ctx, repo.root, t("Bu projenin kayıt kimliğini ayarla", "Set this project’s commit identity"), [
        { program: 'git', args: ['config', '--local', 'user.name', newName] },
        { program: 'git', args: ['config', '--local', 'user.email', newEmail] },
      ])) ctx.ui.success(t("Bu projenin kimliği hazır.", "This project’s commit identity is ready."));
    }
  }
  try {
    await execute('gh', ['--version'], { cwd: ctx.cwd });
    const auth = await execute('gh', ['auth', 'status', '--active', '--hostname', 'github.com'], { cwd: ctx.cwd, allowFailure: true });
    ctx.ui.note(t(`GitHub CLI: kurulu. Oturum: ${auth.code === 0 ? 'hazır' : 'githelp login ile bağlan'}.`, `GitHub CLI: installed. Sign-in: ${auth.code === 0 ? 'ready' : 'connect with githelp login'}.`));
  } catch (error) {
    if (!(error instanceof UserError)) throw error;
    ctx.ui.note(t("GitHub CLI bulunamadı. Temel Git işlemleri çalışır; repo ve PR açmak için: https://cli.github.com", "GitHub CLI was not found. Basic Git operations still work. For repository and PR creation: https://cli.github.com"));
  }
}

async function learn(ctx, topic) {
  const lessons = getLessons();
  if (topic && lessons[topic]) { teach(ctx.ui, topic); return; }
  const choice = await ctx.ui.choose(t("Hangi kelimeyi öğrenelim?", "Which word would you like to learn?"), Object.entries(lessons).map(([id, [label]]) => ({ id, label })));
  teach(ctx.ui, choice);
}

export function help(ui) {
  ui.title(t(`gitHelp ${VERSION} — Git’i anlayarak kullan.`, `gitHelp ${VERSION} — Understand Git while getting things done.`));
  ui.write(t(`  Kullanım: githelp [komut] [--lang tr|en] [--dry-run] [--no-color]
  Kaynaktan: node src/cli.mjs
  Projeye kurulduğunda: node .github/githelp/cli.mjs

  status / durum       Neler değişti?
  commit / kaydet      Dosya seç, açıklama yaz, bilgisayarında kaydet
  push / gonder        Dal seç, kayıtları uzak repoya gönder
  pull / al            Aynı dalın yeni kayıtlarını al (yalnız ff-only)
  branch / dal         Dal oluştur veya değiştir
  pr                   GitHub’da taslak inceleme isteği aç (gh gerekli)
  baslat               Bu klasörde Git’i başlat (main)
  bagla                Var olan GitHub repo adresini ekle
  login / giris        GitHub hesabını tarayıcıdan bağla; oturumu tekrar kullan
  yayinla              GitHub’da yeni repo oluştur (gh gerekli)
  doktor               Kurulumu ve commit kimliğini kontrol et
  ogren [kelime]       Kelimeleri sade Türkçeyle öğren
  kur [proje-klasoru]  Aracı .github/githelp içine kopyala
  demo                 Hiçbir işlem yapmadan örnek turu izle

  Komutsuz açıldığında menü gelir; menüde push da yazabilirsin.
  --dry-run: değişiklik yapan komutları yalnız gösterir; çalıştırmaz.
  Vazgeçmek için: seçimlerde 0 veya her yerde Ctrl+C.
  Gerekenler: Node.js 22+, Git 2.28+. PR/repo açmak için GitHub CLI.
  Bu paket henüz npm’de yayımlanmadı; yerel kullanım hazır.

  Dil: --lang tr veya --lang en. Ortam değişkeni: GITHELP_LANG.
  Seçilmezse sistem dili kullanılır; Türkçe dışındaki dillerde İngilizce açılır.
`, `  Usage: githelp [command] [--lang tr|en] [--dry-run] [--no-color]
  From source: node src/cli.mjs
  Installed in a project: node .github/githelp/cli.mjs

  status               What changed? Check your files and branch.
  commit               Choose files, write a note, and save locally.
  push                 Choose a branch and send its commits to a remote.
  pull                 Get new saves for your current branch (ff-only).
  branch               Create a work branch or switch branches.
  pr                   Open a draft review request on GitHub (needs gh).
  init                 Start a Git notebook in this folder, on main.
  connect              Add an existing GitHub repository address.
  login                Connect in your browser and reuse the saved session.
  publish              Create a repository on GitHub (needs gh).
  doctor               Check your setup and commit identity.
  learn [word]         Learn Git words through simple explanations.
  install [folder]     Copy the tool into .github/githelp.
  demo                 See an example without changing anything.

  With no command, a menu opens. You can type push in the menu too.
  --dry-run: preview commands that make changes without running them.
  To leave: choose 0, or press Ctrl+C at any time.
  Requires Node.js 22+ and Git 2.28+. PR/repo creation needs GitHub CLI.
  This package is not published to npm yet. Local use is ready.

  Language: --lang en or --lang tr. Environment variable: GITHELP_LANG.
  Otherwise, your system language is used. Unsupported locales use English.
  Turkish command aliases are available in either language.
`));
}

export async function run(ctx, argv) {
  const positional = argv.filter(arg => !['--dry-run', '--no-color'].includes(arg));
  ctx.dryRun = argv.includes('--dry-run');
  let command = positional[0];
  command = aliases[command] || command;
  if (command && !['learn', 'install'].includes(command) && positional.length > 1) throw new UserError(t("Bu komut ek argüman almıyor. Kullanım için: githelp --help", "This command does not take extra arguments. See githelp --help."));
  if (positional.length > 2) throw new UserError(t("Çok fazla argüman var. Kullanım için: githelp --help", "Too many arguments. See githelp --help."));
  if (command === 'help') return help(ctx.ui);
  if (command === 'version') return ctx.ui.write(VERSION);
  if (command === 'demo') return demo(ctx.ui);
  if (command === 'learn') return learn(ctx, positional[1]);
  if (command === 'install') return install(ctx, positional[1]);
  const actions = { status, commit, push, pull, branch, init, connect, login, publish, pr, doctor, learn,
    install: context => install(context), demo: context => demo(context.ui) };
  if (!command) {
    ctx.ui.title(`gitHelp ${VERSION}`);
    ctx.ui.note(t("Git’i ezberlemek zorunda değilsin. Ne yapmak istediğini seç.", "You do not have to memorize Git. Choose what you want to do."));
    if (ctx.dryRun) ctx.ui.note(t("Prova açık. Değişiklik yapan komutlar yalnız gösterilecek.", "Dry run is on. Commands that make changes will only be shown."));
    while (true) {
      const menu = getMenu();
      const repo = await repository(ctx.cwd);
      ctx.ui.note(repo ? t(`${basename(repo.root)} / ${repo.branch || 'detached HEAD'} / ${repo.files.length} değişen dosya`, `${basename(repo.root)} / ${repo.branch || 'detached HEAD'} / ${repo.files.length} changed files`) : t("Bu klasörde henüz Git kayıt defteri yok.", "This folder does not have a Git notebook yet."));
      const options = repo ? menu : [
        { id: 'init', label: t("Projemin kayıt defterini aç  / baslat", "Start my project notebook  / init") },
        ...menu.filter(item => ['doctor', 'learn', 'install'].includes(item.id)),
        { id: 'demo', label: t("Bir örnek gör  / demo", "See an example  / demo") },
      ];
      const choices = options.map(option => ({ ...option, aliases: Object.keys(aliases).filter(key => aliases[key] === option.id) }));
      command = await ctx.ui.choose(t("Bugün ne yapalım?", "What would you like to do?"), choices, { defaultId: repo ? 'status' : 'init' });
      await actions[command](ctx);
    }
  }
  const action = actions[command];
  if (!action) throw new UserError(t(`“${command}” komutunu bilmiyorum. push, pull, commit veya --help deneyebilirsin.`, `Unknown command "${command}". Try push, pull, commit, or --help.`));
  await action(ctx);
}

export { Cancelled };
