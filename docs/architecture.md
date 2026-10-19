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

## Taşınabilir kurulum

Yalnız `.mjs` runtime dosyaları ve MIT lisansı kopyalanır. İçe aktarmalar görecelidir ve bütün metadata
runtime’ın içindedir; hedef projenin `type: module` ayarına veya kaynak checkout’una ihtiyaç yoktur.
Var olan kurulum ve symlink olan `.github` hedefleri reddedilir. Kurulumlar sürüm kopyasıdır; otomatik
güncelleme mekanizması yoktur.

## Doğrulama

Unit testler parser, girdi, maskeleme, komut oluşturma ve mutasyonsuz prova yollarını kapsar.
Entegrasyon testleri gerçek CLI process’lerini geçici repolarda çalıştırır; push/pull hedefleri yerel bare
repolardır. Global Git ayarları izole edilir. GitHub hesabı üzerinde canlı repo/PR oluşturulmaz.

Resmî davranış kaynakları: [Git push](https://git-scm.com/docs/git-push),
[Git pull](https://git-scm.com/docs/git-pull), [GitHub CLI PR create](https://cli.github.com/manual/gh_pr_create),
[GitHub CLI repo create](https://cli.github.com/manual/gh_repo_create), [Node.js](https://nodejs.org/docs/latest-v22.x/api/).
