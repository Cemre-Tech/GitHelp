import { t } from './i18n.mjs';

export function getLessons() { return {
  git: [t('Git = projenin kayıt defteri', 'Git = a notebook for your project'),
    t('Bilgisayarındaki değişikliklerin geçmişini tutar. GitHub ise bu kayıtları internette saklayıp paylaşabildiğin bir yerdir.', 'Git keeps a history of changes on your computer. GitHub is a place online where you can keep and share those saves.')],
  status: [t('Status = masamda neler değişti?', 'Status = what changed on my worktable?'),
    t('Dosyaları değiştirmez. Hangi dosyaların yeni, değişmiş veya kayda hazır olduğunu gösterir.', 'It shows which files are new, changed, or ready to save. It does not change your files.')],
  commit: [t('Commit = oyunda kayıt almak', 'Commit = saving your progress in a game'),
    t('Dosyalarını anlamlı bir açıklamayla bilgisayarındaki geçmişe kaydedersin. Henüz GitHub’a göndermezsin.', 'Save your files in your local history with a short note explaining your work. This does not send them to GitHub yet.')],
  push: [t('Push = kayıtlarını gönder', 'Push = send your saves'),
    t('Commit ile aldığın kayıtları uzak repoya gönderirsin. Kaydetmediğin dosya değişiklikleri gönderilmez.', 'Send the commits you have saved to a remote repository. File changes you have not committed are not sent.')],
  pull: [t('Pull = yeni kayıtları al', 'Pull = get the new saves'),
    t('Uzak repodaki yeni kayıtları bilgisayarına alırsın. gitHelp yalnız geçmiş düz bir çizgide ilerleyebiliyorsa devam eder.', 'Bring new saves from the remote repository to your computer. gitHelp continues only when your history can move forward in a straight line.')],
  branch: [t('Branch = ayrı bir çalışma masası', 'Branch = a separate worktable'),
    t('Yeni fikrini ayrı bir dalda denersin. main genellikle projenin ortak, ana dalıdır. Dal oluşturmak dosyaları ayrı bir klasöre kopyalamaz.', 'Try a new idea on a separate branch. main is usually the shared main branch. Creating a branch does not copy your files into another folder.')],
  pr: [t('Pull request = birlikte bakalım mı?', 'Pull request = can we look at this together?'),
    t('Bir daldaki çalışmanın başka bir dala eklenmesini önerirsin. PR açılması kodu kendiliğinden birleştirmez. Pull komutundan farklıdır.', 'Ask for work on one branch to be added to another. Opening a PR does not merge your code automatically. It is different from the pull command.')],
  remote: [t('Remote = projenin uzaktaki adresi', 'Remote = your project’s address elsewhere'),
    t('origin genellikle bu adresin kısa adıdır. upstream bir fork’un asıl projesinin adresi de olabilir. gitHelp işlemden önce hangisini kullanacağını gösterir.', 'origin is usually a short name for this address. upstream may point to the original project behind a fork. gitHelp shows you which remote you will use before an operation.')],
  conflict: [t('Conflict = aynı satıra iki farklı fikir', 'Conflict = two different ideas for the same line'),
    t('Aynı satır farklı şekillerde değişmişse hangi halin kalacağını biri seçmelidir. gitHelp senin yerine kod silerek seçim yapmaz.', 'When the same line changes in different ways, someone must choose which version to keep. gitHelp does not delete code to choose for you.')],
  stage: [t('Stage = kayıt sepeti', 'Stage = a basket for your next save'),
    t('Bir sonraki commit’e girecek dosyaları hazırlarsın. gitHelp hangi dosyaları sepete koyacağını sorar.', 'Prepare the files that will go into your next commit. gitHelp asks which files you want in that basket.')],
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
  Sen: push

  gitHelp: Commit ile aldığın kayıtları GitHub’a gönderelim.
  Hangi dalın kayıtlarını göndermek istersin?

    1. ozellik/karanlik-tema — şu anki dalın
    2. main — ortak ana dal

  Sen: 1

  gitHelp: ozellik/karanlik-tema → origin/ozellik/karanlik-tema
  Öğrendiğin komut:
    git push --set-upstream --no-follow-tags --recurse-submodules=no -- origin refs/heads/ozellik/karanlik-tema:refs/heads/ozellik/karanlik-tema

  Bu işlemi yapalım mı? [hayır] > evet
  ✓ Kayıtların gönderildi. İstersen pr ile inceleme isteği açabilirsin.

  Küçük döngün:
    branch → kodunu yaz → status → commit → push → pr

  Arkadaşlarının yeni kayıtlarını almak için: pull
  Bir kelimeyi öğrenmek için: githelp learn
`, `
  You: push

  gitHelp: Let us send your saved commits to GitHub.
  Which branch would you like to send?

    1. feature/dark-theme — your current branch
    2. main — the shared main branch

  You: 1

  gitHelp: feature/dark-theme → origin/feature/dark-theme
  The command you are learning:
    git push --set-upstream --no-follow-tags --recurse-submodules=no -- origin refs/heads/feature/dark-theme:refs/heads/feature/dark-theme

  Shall we do this? [no] > yes
  ✓ Your saves were sent. Use pr when you want to ask for a review.

  Your small work loop:
    branch → write your code → status → commit → push → pr

  To get your teammates’ new saves: pull
  To learn a word: githelp learn
`));
}
