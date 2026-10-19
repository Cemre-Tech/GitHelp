# Mimari

gitHelp Node.js standart kütüphanesiyle yazılmış bir ESM terminal aracıdır. Derleme, web sunucusu,
API anahtarı, telemetri veya harici npm bağımlılığı yoktur. Yerel `git`, isteğe bağlı olarak `gh` çalıştırır.

## Çalışma yolu

```text
cli.mjs → UI + argümanlar → app.mjs / iş akışı
                              ├─ yerel Git durumunu oku
                              ├─ açık seçimler al
                              ├─ kontrolleri yap
                              └─ applyPlan: açıkla → komutu göster → onay → çalıştır
```

| Dosya | Sorumluluk |
| --- | --- |
| `cli.mjs` | Sürüm gereksinimi, başlangıç, çıkış ve hata gösterimi |
| `app.mjs` | Komut yönlendirme, iş akışları, mutasyon önizlemesi/onayı |
| `git.mjs` | Shell kullanmayan process çağrıları, repo inceleme, hata açıklamaları |
| `ui.mjs` | Menü, satır okuma, varsayılan hayır, EOF/Ctrl+C, çıktı temizleme |
| `safety.mjs` | Dosya seçimlerinin doğrulanması ve olası gizli dosya adları |
| `install.mjs` | Bağımsız çalışma dosyalarını hedefin `.github/githelp` klasörüne kopyalama |
| `lessons.mjs` | Öğretici açıklamalar ve mutasyonsuz demo |
| `i18n.mjs` | TR/EN dil seçimi, locale algılama ve çift dilde metinler |
| `auth.mjs` | Tarayıcı girişi, kayıtlı oturumun kullanılması ve proje için HTTPS bağlantı planı |

Her CLI çalıştırması tek bir dil kullanır. `--lang tr|en`, `GITHELP_LANG` ortam değişkeninden önceliklidir.
Tercih verilmezse sistem locale bilgisi kullanılır; desteklenmeyen diller İngilizceye düşer. Menü ve ders
metinleri çalışırken üretilir, böylece modül yükleme sırası dil seçimini sabitlemez. Çeviriler kaynak metnin
yanında `t(Türkçe, İngilizce)` olarak tutulur; yeni bir bağımlılık veya ayar dosyası gerekmez.

Git durumu `git status --porcelain=v1 -z --untracked-files=all` ile okunur. NUL ayırıcılar sayesinde
boşluk, Unicode, yeniden adlandırma ve satır sonu içeren dosya adları metin satırlarına göre parçalanmaz.
`git add` için pathspec yorumlaması kapatılır; örneğin `[abc].txt` bir desen değil gerçek dosya adıdır.

## Commit sınırı

Dosyalar açıkça seçilir ve isim kontrolünden geçer. Önceden stage edilmiş, seçilmeyen bir dosya varsa
henüz mutasyon yapılmadan durulur. `git add -- <seçilenler>` ardından `git commit -m <mesaj>` uygulanır.
Bu iki adım tek bir atomik işlem değildir: commit hook’u başarısız olursa eklenen dosyalar stage’de
kalabilir. Seçilen kısmen stage edilmiş dosyanın tüm güncel hali kaydedilir.

## Senkronizasyon sınırı

Push açık bir kaynak/hedef refspec kullanır; kullanıcı ayarlarındaki matching veya ek tag davranışına
bırakılmaz. Aynı isimli tek dal gönderilir, submodule push kapatılır. Pull, çalışılan dal için seçilen
remote’un aynı isimli ref’ini `--ff-only --no-rebase` ile alır. Geçmiş ayrılmışsa fetch gerçekleşmiş
olabilir ama çalışma dalı birleştirilmez veya rebase edilmez.

## GitHub sınırı

Git kimlik doğrulaması ve GitHub CLI oturumu farklı şeylerdir. CLI oturum kontrolünün token veya
hesap ayrıntıları yazdırılmaz. Repo oluşturma ve PR komutları bütün gerekli seçimlerle açıkça
hazırlanır. PR daima taslaktır; kaynak dalın son commit’i push hedefine karşı kontrol edilir.
`--head` ve `--repo` açıkça verilir; gh’nin örtük push/fork akışı kullanılmaz.

`login` kayıtlı, etkin bir GitHub CLI oturumunu kontrol eder. Geçerli oturum yeniden kullanılır;
oturum yoksa onaylanan plan `gh auth login --hostname github.com --git-protocol https --web` çalıştırır.
Mevcut oturumun CLI tercihi SSH ise `gh config set git_protocol https --host github.com` adımı da onaylanan
plana eklenir. Bu tercih kullanıcı/host düzeyindedir ve sonraki `publish` işlemlerinde HTTPS kullanılmasını sağlar.
Bu etkileşimli çocuk işlem sırasında gitHelp satır okuyucusu terminali GitHub CLI’ye bırakır ve işlem
sonunda geri alır. Gerçek terminal yoksa yeni giriş başlatılmaz. `GH_TOKEN` / `GITHUB_TOKEN`, kayıtlı
oturumun yerine geçebildiği için kalıcı tarayıcı girişi akışında reddedilir; değerleri yazdırılmaz.

Giriş planı desteklenen GitHub SSH adreslerini aynı reponun HTTPS adresine dönüştürür; fetch ve açık
push adresleri ayrı incelenir. Repo kimliği korunur. Desteklenmeyen birden çok adres, devralınan ayar
ve URL yeniden yazımı durumunda işlem durur. Projenin GitHub HTTPS kimlik yardımcısı `.git/config`
içine yerel olarak yazılır: önce boş `credential.https://github.com.helper` değeri diğer yardımcıları
sıfırlar, ardından `!gh auth git-credential` eklenir. Giriş, commit veya push başlatmaz.

Kimlik bilgilerini GitHub CLI saklar; gitHelp kendi token dosyasını oluşturmaz. GitHub CLI normalde
işletim sisteminin kimlik deposunu kullanır, bu mümkün değilse düz metin kullanıcı ayarına dönebilir.
Giriş, CLI’nin kullanıcı/host tercihlerini de kaydeder; HTTPS protokol tercihi hosttaki diğer `gh`
hesapları için de geçerlidir. CLI kendi Git kimlik doğrulama kurulumunu sorabilir. Bu etkiler,
gitHelp’ın yalnız bu repoya yazdığı Git ayarlarından ayrıdır. `--dry-run` oturum durumunu okuyabilir
ama giriş, tarayıcı açma, yardımcı veya remote değişikliği yapmaz. Onay Enter’da hayırdır.

## Taşınabilir kurulum

Yalnız `.mjs` runtime dosyaları ve MIT lisansı kopyalanır. İçe aktarmalar görecelidir ve bütün metadata
runtime’ın içindedir; hedef projenin `type: module` ayarına veya kaynak checkout’una ihtiyaç yoktur.
Var olan kurulum ve symlink olan `.github` hedefleri reddedilir. Kurulumlar sürüm kopyasıdır; otomatik
güncelleme mekanizması yoktur.

## Doğrulama

Unit testler parser, girdi, maskeleme, komut oluşturma ve mutasyonsuz prova yollarını kapsar.
Entegrasyon testleri gerçek CLI process’lerini geçici repolarda çalıştırır; push/pull hedefleri yerel bare
repolardır. Global Git ayarları izole edilir. GitHub hesabı üzerinde canlı repo/PR oluşturulmaz.
Tarayıcı girişi, oturumun yeniden kullanımı, iptal ve kimlik yardımcısı planı gerçek hesap yerine
sahte komut sonuçlarıyla test edilir.

Resmî davranış kaynakları: [Git push](https://git-scm.com/docs/git-push),
[Git pull](https://git-scm.com/docs/git-pull), [GitHub CLI PR create](https://cli.github.com/manual/gh_pr_create),
[GitHub CLI repo create](https://cli.github.com/manual/gh_repo_create),
[GitHub CLI auth login](https://cli.github.com/manual/gh_auth_login),
[GitHub CLI environment](https://cli.github.com/manual/gh_help_environment), [Node.js](https://nodejs.org/docs/latest-v22.x/api/).
