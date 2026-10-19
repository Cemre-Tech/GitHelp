import { t } from './i18n.mjs';

export function getLessons() { return {
  git: [t('Git ve GitHub ne yapar?', 'What do Git and GitHub do?'),
    t('Git, proje dosyalarındaki değişiklikleri bilgisayarında kaydeder. GitHub, bu dosyaları ve kayıt geçmişini internette paylaşabileceğin hizmettir. GitHub’a giriş yapmak dosyalarını göndermez; göndermek için önce commit, sonra push kullanırsın.', 'Git records changes to project files on your computer. GitHub is a service for sharing those files and their history online. Signing in to GitHub does not upload your files; use commit first, then push.')],
  login: [t('GitHub bağlantısı: hesap ve proje adresi', 'Connecting GitHub: account and repository address'),
    t('İki bilgi gerekir: GitHub’da hangi hesapla işlem yaptığın ve bu projenin hangi GitHub reposuna bağlı olduğu. En kolay başlangıç login ile tarayıcıdan giriş yapmak, ardından connect ile repo adresini eklemektir. Daha önce kaydedilmiş geçerli oturum tekrar kullanılır. connect tek başına hesabına giriş yapmaz.', 'You need two things: the GitHub account you are using and the GitHub repository this project should use. The easiest start is login to sign in through your browser, then connect to add the repository address. An existing valid saved session is reused. connect alone does not sign you in.')],
  status: [t('Status = değişen dosyaları gör', 'Status = see changed files'),
    t('Yeni, değiştirilmiş ve bir sonraki commit için hazırlanmış dosyaları listeler. Kod yazdıktan sonra neyin değiştiğini kontrol etmek için kullan. Dosyaları kaydetmez veya GitHub’a göndermez.', 'Lists new files, changed files, and files prepared for the next commit. Use it after editing to check what changed. It does not save a commit or upload anything to GitHub.')],
  commit: [t('Commit = değişiklikleri bilgisayarında kaydet', 'Commit = save changes on your computer'),
    t('Seçtiğin dosyaların o anki halini, örneğin “Giriş ekranını ekle” açıklamasıyla proje geçmişine kaydeder. Bu kayıt yalnız bilgisayarındadır. GitHub’a göndermek için sonraki adım push olur.', 'Records the current version of your selected files in the project history with a message such as “Add the sign-in screen”. This commit stays on your computer. Use push next to send it to GitHub.')],
  push: [t('Push = commit’leri seçtiğin repoya ve dala gönder', 'Push = send commits to a chosen repository and branch'),
    t('Önce hangi yerel dalı ve hangi uzak repoyu kullanacağını seçersin. Örneğin main → origin/main, bilgisayarındaki main kayıtlarını origin adresindeki main dalına gönderir. GitHub adresini onaylamadan önce kontrol et. Commit yapılmamış dosya değişiklikleri gönderilmez.', 'Choose a local branch and a remote repository first. For example, main → origin/main sends commits from your local main branch to main at the origin address. Check the GitHub address before confirming. File changes without a commit are not sent.')],
  pull: [t('Pull = uzaktaki yeni commit’leri projenle birleştir', 'Pull = bring remote commits into your project'),
    t('Seçtiğin uzak repodaki aynı adlı dalın yeni commit’lerini alır ve dosyalarını günceller. Önce açık değişikliklerini commit ile kaydetmelisin. Hem sende hem uzakta ayrı yeni commit’ler varsa gitHelp durur; nasıl birleştirileceğine sen karar verirsin.', 'Gets new commits from the branch with the same name in your chosen remote and updates your files. Commit your unfinished file changes first. If both sides have separate new commits, gitHelp stops so you can decide how to combine them.')],
  branch: [t('Branch = çalışman için ayrı bir dal oluştur', 'Branch = create a separate branch for your work'),
    t('Bir özellik üzerinde, main dalının geçmişinden ayrı çalışmanı sağlar. Örneğin yeni menü için feature/menu dalı açabilirsin. Dal değiştirince o dalın dosyalarını görürsün; ayrıca bir proje klasörü oluşmaz. main genellikle ekibin ana dalıdır.', 'Lets you work on a feature separately from the main branch history. For a new menu, you could create feature/menu. Switching branches shows that branch’s files; it does not create another project folder. main is usually the team’s main branch.')],
  pr: [t('Pull request = dalındaki çalışmayı incelemeye aç', 'Pull request = ask for a review of your branch'),
    t('GitHub’da, örneğin feature/menu dalındaki değişikliklerin main dalına eklenmesini önerirsin. Önce dalını push ile göndermelisin. gitHelp taslak bir PR açar; bu işlem kodu main ile birleştirmez. pull ise uzaktaki commit’leri bilgisayarına alma işlemidir.', 'On GitHub, propose adding changes from a branch such as feature/menu to main. Push your branch first. gitHelp opens a draft PR; opening it does not merge the code into main. The pull command instead brings remote commits to your computer.')],
  remote: [t('Remote = uzak repo adresine verdiğin kısa ad', 'Remote = a short name for a remote repository address'),
    t('Örneğin origin, https://github.com/hesap/proje.git adresinin kısa adı olabilir. origin veya org bir hesap adı değildir; hangi repoya gönderdiğini URL belirler. İki farklı kısa ad aynı URL’ye bağlıysa aynı repoyu gösterir. connect adresi kaydeder, push ise commit’leri o adrese gönderir.', 'For example, origin can stand for https://github.com/account/project.git. origin or org is a local nickname, not an account name; the URL determines the destination. Two nicknames with the same URL point to the same repository. connect saves the address; push sends commits there.')],
  conflict: [t('Conflict = farklı değişiklikleri birlikte çözmen gerekiyor', 'Conflict = different changes need your decision'),
    t('Git, iki değişikliği otomatik olarak birleştiremediğinde durur. Genellikle aynı dosyanın aynı kısmı farklı şekillerde değiştirilmiştir. Dosyayı açıp doğru sonucu düzenlemelisin; gitHelp hangi kodun kalacağını senin yerine seçmez.', 'Git stops when it cannot combine two changes automatically. Often the same part of a file was edited in different ways. Open the file and edit it to the intended result; gitHelp does not choose which code to keep for you.')],
  stage: [t('Stage = bir sonraki commit’e girecek değişiklikleri seç', 'Stage = choose changes for the next commit'),
    t('Her değişikliği aynı commit’e eklemek zorunda değilsin. gitHelp hangi dosyaları kaydetmek istediğini sorar ve seçtiğin dosyaların tüm değişikliklerini hazırlar. Bu hazırlık tek başına commit oluşturmaz veya dosya göndermez.', 'You do not have to include every change in one commit. gitHelp asks which files to save and prepares all changes in those selected files. Preparing them alone does not create a commit or upload files.')],
}; }

export function teach(ui, topic) {
  const lesson = getLessons()[topic];
  if (!lesson) return;
  ui.title(lesson[0]);
  ui.note(lesson[1]);
}

export function demo(ui) {
  ui.title(t('gitHelp / örnek tur', 'gitHelp / example tour'));
  ui.note(t('Bu bir canlandırma. Git komutu çalışmaz, dosya veya bağlantı oluşturulmaz.', 'This is an example. No Git commands run, and no files or connections are created.'));
  ui.write(t(`
  İlk kullanım:
    kurulum → Önce bağlantı yöntemini seç: tarayıcı + HTTPS önerilir.
    login   → Tarayıcıda GitHub hesabına giriş yap.
    connect → Mevcut GitHub reponun HTTPS adresini ekle.
    status  → Değişen dosyaları kontrol et.
    commit  → Seçtiğin değişiklikleri bilgisayarında kaydet.

  Şimdi commit’leri göndermek için:
  Sen: push

  gitHelp: Hangi yerel dalın commit’lerini göndermek istersin?

    1. ozellik/karanlik-tema — şu anki dalın
    2. main — ortak ana dal

  Sen: 1

  gitHelp: Hedefi kontrol et:
    GitHub reposu: https://github.com/ornek/uygulamam.git
    Uzak reponun kısa adı: origin
    Bilgisayarındaki dal: ozellik/karanlik-tema
    GitHub’da güncellenecek dal: ozellik/karanlik-tema

  Öğrendiğin komut:
    git push --set-upstream --no-follow-tags --recurse-submodules=no -- origin refs/heads/ozellik/karanlik-tema:refs/heads/ozellik/karanlik-tema

  Bu işlemi yapalım mı? [hayır] > evet
  ✓ Commit’lerin ornek/uygulamam reposunun ozellik/karanlik-tema dalına gönderildi.
  İstersen pr ile bu değişiklikler için taslak inceleme isteği açabilirsin.

  Küçük döngün:
    branch → kodunu yaz → status → commit → push → pr

  Aynı dalın GitHub’daki yeni commit’lerini almak için: pull
  Bir kelimeyi öğrenmek için: githelp learn
`, `
  First use:
    setup   → Choose a connection method first: browser + HTTPS is recommended.
    login   → Sign in to your GitHub account in the browser.
    connect → Add the HTTPS address of your existing GitHub repository.
    status  → Check which files changed.
    commit  → Save your selected changes on your computer.

  Now send your commits:
  You: push

  gitHelp: Which local branch’s commits would you like to send?

    1. feature/dark-theme — your current branch
    2. main — the shared main branch

  You: 1

  gitHelp: Check the destination:
    GitHub repository: https://github.com/example/my-app.git
    Remote nickname: origin
    Branch on your computer: feature/dark-theme
    Branch to update on GitHub: feature/dark-theme

  The command you are learning:
    git push --set-upstream --no-follow-tags --recurse-submodules=no -- origin refs/heads/feature/dark-theme:refs/heads/feature/dark-theme

  Shall we do this? [no] > yes
  ✓ Your commits were sent to feature/dark-theme in example/my-app.
  Use pr to open a draft review request for these changes.

  Your small work loop:
    branch → write your code → status → commit → push → pr

  To get new commits from the same branch on GitHub: pull
  To learn a word: githelp learn
`));
}
