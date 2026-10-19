<p align="center">
  <img src="docs/terminal.svg" alt="gitHelp: Git'i anlayarak kullan. push yaz, dalını seç, komutu gör ve onayla." width="880">
</p>

# gitHelp

**Git’i anlayarak kullan.**

Bir proje yaptın. Şimdi commit, push, origin, main, branch… Hepsini ezberlemek zorunda mısın?
gitHelp terminalinde yanında oturur: ne yapmak istediğini sorar, sade Türkçe veya İngilizceyle açıklar,
çalışacak gerçek komutu gösterir ve onayını aldıktan sonra yapar.

[English](README.en.md) · [Katkıda bulun](CONTRIBUTING.md) · [Nasıl çalışıyor?](docs/architecture.md) · [MIT lisansı](LICENSE)

## Başka bir projede nasıl kullanırım? (önerilen)

gitHelp’ı, üzerinde çalıştığın projenin içine kurabilirsin. Örneğin mevcut projenin adı
`benim-projem` olsun. **Node.js 22+ ve Git 2.28+** kurulu olmalı; hedef projenin Node.js projesi olması gerekmez.
Tarayıcıyla GitHub girişi için ayrıca [GitHub CLI](https://cli.github.com) kur.

**1. Terminali mevcut projenin bir üst klasöründe aç ve gitHelp’ı indir.**

```sh
git clone https://github.com/Cemre-Tech/GitHelp.git
cd GitHelp
```

Bu örnekte klasörler yan yana durur:

```text
projelerim/
  GitHelp/         ← bu araç
  benim-projem/    ← üzerinde çalıştığın mevcut proje
```

**2. GitHelp klasöründeyken aracı kendi projene kopyala.**

```sh
node src/cli.mjs install "../benim-projem" --lang tr
```

`benim-projem` yerine kendi klasörünün adını yaz. Hedef klasör önceden var olmalı.
Araç hedefi gösterip onay ister; doğruysa `evet` yaz. Bu işlem çalıştırılabilir dosyaları
**kendi projenin** `.github/githelp/` klasörüne kopyalar. `npm install` veya global kurulum gerekmez.

Klasörler yan yana değilse hedefin tam yolunu tırnak içinde ver. Örneğin Windows’ta:

```powershell
node src/cli.mjs install "C:/Projeler/Benim Uygulamam" --lang tr
```

gitHelp’ı zaten indirdiysen tekrar klonlamana gerek yok. Bu kurulum komutunu indirdiğin kaynak
klasöründe çalıştır.

**3. Kendi projenin klasörüne geç ve çalıştır.**

```sh
cd "../benim-projem"
node .github/githelp/cli.mjs --lang tr
```

Tam yol kullandıysan `cd` komutunda da aynı proje yolunu kullan. Bundan sonra terminali
**kendi projenin kök klasöründe** açıp yalnız şu komutu çalıştırman yeter:

```sh
node .github/githelp/cli.mjs
```

Menüdeki `status`, `commit`, `push` ve `pull` işlemleri, terminalin açık olduğu **senin projen**
üzerinde çalışır. GitHelp’ın kendi GitHub reposuna gönderim yapmaz; push hedefi senin projenin
remote ayarlarından seçilir ve onaydan önce gösterilir. Mevcut projen zaten Git kullanıyorsa
tekrar `init` çalıştırma. GitHub hesabı veya proje adresi hazır değilse ilk öneri bağlantı kurulumudur.

İngilizce açmak için `node .github/githelp/cli.mjs --lang en` kullan.
Doğrudan gönderim menüsü için `node .github/githelp/cli.mjs push` yazabilirsin.

`.github/githelp/` dosyalarını kendi projende commit edip paylaşırsan ekip arkadaşların da aynı
başlatma komutunu kullanabilir. Onlarda da Node.js ve Git kurulu olmalı; her kişi kendi GitHub hesabını kullanır.
Kurulan kopya bağımsızdır; indirdiğin GitHelp kaynak klasörüne ihtiyaç duymaz.
Kendi projende `npm start` çalıştırmak, o projenin kendi başlatma komutunu çalıştırır.
gitHelp için yukarıdaki `node .github/githelp/cli.mjs` komutunu kullan.

## GitHelp kaynak klasöründe dene

Gerekenler: **Node.js 22+**, **Git 2.28+**. Tarayıcıyla GitHub girişi, terminalden yeni GitHub reposu
veya PR açmak için ayrıca [GitHub CLI](https://cli.github.com) gerekir. GitHub sitesinde elle repo
oluşturmak için `gh` gerekmez. Temel Git işlemleri `gh` olmadan da çalışır; push/pull için Git
erişiminin hazır olması gerekir. gitHelp’ın harici npm bağımlılığı yoktur.

Bu klasörde tek komutla aç:

```sh
npm start
```

Önce hiçbir şeye dokunmadan bir örnek görmek istersen:

```sh
npm run demo
```

## İlk açılışta GitHub bağlantısı

gitHelp, GitHub hesabı ve proje adresi eksikse bağlantı kurmayı menünün ilk sırasında önerir.
GitHub CLI oturumunun kontrolü tamamlanamazsa bunu da açıkça söyler; hesabını bağlı kabul etmez.
İstersen bağlantıyı hazırlamadan yerel dosyalarını inceleyebilir veya commit oluşturabilirsin.

Kendi projenin kök klasöründe bağlantı rehberini doğrudan da açabilirsin:

```sh
node .github/githelp/cli.mjs setup --lang tr
```

GitHelp kaynak klasöründe çalışıyorsan `npm start -- setup --lang tr` kullan.
İsteğe bağlı kısa komut bağlıysa `githelp setup` veya `githelp kurulum` yaz.
Rehber şu yolları sunar:

1. **Tarayıcıyla giriş + HTTPS — önerilen, en kolay yol.** GitHub CLI kuruluysa bir kez GitHub hesabına
   giriş yaparsın. Sonraki işlemlerde kayıtlı giriş kullanılır; her push için token oluşturmazsın.
   `gh` yoksa rehber kurulum adresini gösterir; kurduktan sonra `setup` ile devam edersin.
2. **Hazır HTTPS erişimini kullan.** Git Credential Manager gibi bir araçla hesabını zaten bağladıysan
   bu yolu seçebilirsin. gitHelp mevcut giriş yöntemini değiştirmeden proje adresini eklemeni sağlar.
3. **Mevcut SSH anahtarını kullan — ileri seviye.** GitHub’a eklediğin ve bu bilgisayarda çalışan bir SSH
   anahtarın varsa SSH repo adresini kullanırsın. Rehber senin yerine yeni anahtar oluşturmaz.

Sonra mevcut GitHub reposunun adresini seçersin. Repo henüz yoksa rehber
[GitHub’da yeni repo oluşturma sayfasını](https://github.com/new) gösterir. **Boş repo oluştur:**
README, `.gitignore` veya lisans ekleme kutularını işaretleme. Bu dosyaları mevcut projenle birlikte
commit edip gönderebilirsin; böylece GitHub’da bağımsız bir başlangıç geçmişi oluşmaz.

Üç ayrı adımı ayırt etmek yararlı:

- **Hesap girişi:** GitHub seni tanır ve hesabının izinlerini kullanır.
- **Repo adresi:** Bu klasörün hangi GitHub projesine gönderileceğini belirler. `origin`, bu adres için yaygın bir kısa addır.
- **Commit ve push:** Commit, seçtiğin dosyaları bilgisayarında kaydeder; push, bu commit’leri seçtiğin GitHub reposuna gönderir.

Bir repo adresinin ekli olması, internete ulaşabildiğini veya o repoya yazma iznin olduğunu kanıtlamaz.
Rehber kendiliğinden commit veya push yapmaz; sonraki adımı açıkça gösterir.

## Türkçe veya İngilizce seç

Menüler, öğretici açıklamalar, sorular, onaylar ve gitHelp hata mesajları iki dilde çalışır.
Aracı kurduğun kendi projenin kök klasöründe:

```sh
node .github/githelp/cli.mjs --lang tr
node .github/githelp/cli.mjs --lang en
```

GitHelp kaynak klasöründe denemek için:

```sh
npm start -- --lang tr
npm start -- --lang en
```

Kısa komut bağlandıktan sonra `githelp --lang en` veya doğrudan `githelp push --lang tr` kullanabilirsin.
Öğretici tur da iki dilde açılır: `npm run demo -- --lang en`.

Dil önceliği: **`--lang` → `GITHELP_LANG` → sistem dili**. Sistem dili için `LC_ALL`, `LC_MESSAGES`,
`LANG`, ardından işletim sisteminin varsayılan locale bilgisi kullanılır. Türkçe dışındaki desteklenmeyen
locale değerlerinde İngilizce açılır. Seçim çalışma süresince geçerlidir; proje dosyalarına ayar yazılmaz.
Git ve GitHub CLI’nin kendi teknik çıktıları, bu araçların dil ayarlarından gelir.

PowerShell’de tercihi terminal oturumu için ayarlamak istersen:

```powershell
$env:GITHELP_LANG = 'en'
npm start
```

> İlk sürüm kaynak koddan çalışmaya hazırdır. Paket henüz npm’de yayımlanmadı;
> `npx githelp` şu anda bu projeye ait doğrulanmış bir kurulum yöntemi değildir.

## Hesabına tarayıcıyla giriş yap

Her push için token üretmen veya yapıştırman gerekmez. GitHub CLI kuruluysa kendi projenin kök klasöründe:

```sh
node .github/githelp/cli.mjs login --lang tr
```

GitHelp kaynak klasöründe `npm start -- login --lang tr` kullanabilirsin.
Kısa komutu bağladıysan kendi projenin terminalinde `githelp login` kullanabilirsin.
`giris` ve `giriş` aynı komutun Türkçe karşılıklarıdır.

Geçerli, kayıtlı bir GitHub CLI oturumun varsa yeniden giriş yapılmaz. Yoksa planı görüp onayladıktan sonra
GitHub’ın tarayıcı girişi açılır. Terminalde gösterilen tek kullanımlık kodla GitHub’da izin verirsin;
kişisel erişim tokenı hazırlaman gerekmez. Yeni giriş için gerçek, etkileşimli bir terminal gerekir.

Mevcut oturumun bağlantı tercihi SSH ise aynı planda GitHub CLI’ın kullanıcı/host tercihi HTTPS’e çevrilir;
yeniden giriş gerekmez ve daha sonra `yayinla` ile oluşturulan repolar da HTTPS kullanır.

Projedeki desteklenen GitHub SSH adresleri de önizlemede gösterilir. Onaylarsan örneğin
`git@github.com:kullanici/proje.git`, aynı reponun `https://github.com/kullanici/proje.git` adresine çevrilir.
Alma ve ayrı gönderim adresleri kendi repo hedefleri korunarak ele alınır. gitHelp, bu projedeki GitHub HTTPS
işlemleri için GitHub CLI kimlik yardımcısını `.git/config` içinde ayarlar. Birden çok adres, başka yerden
devralınmış ayar veya URL yönlendirmesi güvenle ele alınamıyorsa işlem durur. `login` commit veya push yapmaz
ve eksik repo adresini eklemez. Tüm bağlantı adımları için `setup` kullan. Dosyaların commit edilmiş ve GitHub
repo adresin eklenmiş olduğunda `push` ile gönderirsin. `Permission denied (publickey)` hatası için de bu yolu kullanabilirsin.

gitHelp kimlik bilgilerini `.github/githelp` içine kaydetmez. Oturumu GitHub CLI saklar: mümkünse işletim
sisteminin kimlik deposunu kullanır, bu depo kullanılamıyorsa kullanıcı ayar dosyasında düz metne dönebilir.
Giriş, GitHub CLI’nin kullanıcı/host tercihlerini kaydeder; HTTPS tercihi o hosttaki diğer `gh` hesaplarını da
etkileyebilir ve CLI Git kimlik doğrulaması kurulumunu sorabilir. gitHelp’ın kendi Git yardımcısı ve adres
değişiklikleri bu projeye aittir. Ayrıntılar: [resmî giriş belgesi](https://cli.github.com/manual/gh_auth_login).

`GH_TOKEN` veya `GITHUB_TOKEN` ortam değişkeni tanımlıysa kayıtlı oturumdan önceliklidir.
Kalıcı tarayıcı girişi için bu değişkenleri terminal oturumundan kaldırıp tekrar dene; değerlerini araca veya hata bildirimine yazma.
Prova için `node .github/githelp/cli.mjs login --dry-run --lang tr` kullan: tarayıcı açılmaz, ayar veya adres değiştirilmez.

## Günlük kullanım

Komutsuz başlatıldığında bir menü açılır. GitHub bağlantısında eksik adım varsa ilk seçenek bağlantı rehberidir.
Numara seçebilir veya `push` gibi bir komut yazabilirsin.
Her işlemden önce ne olacağını ve çalışacak Git komutunu görürsün. Onayda Enter’ın varsayılanı **hayır**dır.
Bir işlem tamamlanınca menüye dönersin; çıkmak için `0` seçebilirsin.

```text
gitHelp: Hangi dalın kayıtlarını gönderelim?

  1. ozellik/tema — şu an çalıştığın dal
  2. main — ortak ana dal

Sen: 1

gitHelp: Hangi uzak repoyla çalışalım?
  1. origin — https://github.com/ornek/proje.git

Sen: 1

gitHelp: ozellik/tema → origin/ozellik/tema
           [çalışacak gerçek komutu gösterir]

Bu işlemi yapalım mı? [hayır] > evet
✓ Kayıtların gönderildi.
```

Küçük çalışma döngün:

```text
branch → kodunu yaz → status → commit → push → pr
                      ↑
            arkadaşlarının kayıtları için pull
```

## Alternatif: her projede `githelp` kısa komutunu kullan

Yukarıdaki kopyalama yöntemi global kurulum gerektirmez. Her projenin terminalinde doğrudan
`githelp` yazmak istersen, **GitHelp kaynak klasöründe** bir kez yerel komutu bağla:

```sh
npm link
```

Bu yöntem kaynak klasörüne bağlantı oluşturur; kısa komutu kullanırken GitHelp kaynak klasörünü
taşımamalı veya silmemelisin. Kopyalanan `.github/githelp` ise bu bağlantıya ihtiyaç duymaz.

Sonra **kendi projenin terminalinde**:

```sh
githelp
```

Doğrudan bir işi de seçebilirsin:

```sh
githelp push
githelp pull
githelp commit
githelp branch
```

PowerShell script çalıştırma ilkesi npm komutlarını
engelliyorsa `npm.cmd start` / `npm.cmd link` veya doğrudan `node src/cli.mjs` kullanabilirsin.

## Aracı projenin `.github` klasöründe tut

İlk bölümdeki kopyalama adımlarını izlediysen kurulum tamamdır.
Alternatif olarak `npm link` ile kısa komutu bağladıysan hedef projenin terminalinde:

```sh
githelp kur
```

Bu işlem bağımsız çalışan aracı `.github/githelp/` altına kopyalar. Artık o projede tek komut yeter:

```sh
node .github/githelp/cli.mjs
```

Kurulan araçta da dil seçebilirsin: `node .github/githelp/cli.mjs --lang en`.
İlk açılışta bağlantı eksikse aynı bağlantı rehberi önerilir; doğrudan açmak için
`node .github/githelp/cli.mjs setup` kullanabilirsin.

Örneğin dal seçerek push başlatmak için:

```sh
node .github/githelp/cli.mjs push
```

Global komut bağlamadan da, gitHelp kaynak klasöründen bir hedefe kurabilirsin:

```sh
node src/cli.mjs kur "../benim-projem"
```

`.github/githelp/` dosyalarını kendi projende commit edersen ekip arkadaşların Node.js ve Git ile
aynı komutu kullanabilir. Kurulum, projenin `package.json`, `.env`, `.gitignore` veya workflow
dosyalarını değiştirmez. Mevcut `.github/githelp` klasörünün üzerine yazmaz. Güncellemede yeni
sürümü ayrı bir klasöre kurup değişiklikleri inceleyerek taşı; kaldırmak için bu klasörü kaldırabilirsin.
Bu bir terminal aracıdır; `.github` altında bulunması onu otomatik çalışan bir GitHub Action yapmaz.

## İlk kez GitHub’a göndermek

Aracı kurduğun kendi projenin kök klasöründe sırayla:

```sh
node .github/githelp/cli.mjs setup
node .github/githelp/cli.mjs doctor
node .github/githelp/cli.mjs commit
node .github/githelp/cli.mjs push
```

`setup`, Git henüz başlatılmadıysa ilk adımda bunun için onay ister. Git zaten hazırsa yeniden
başlatılmaz. İsteğe bağlı kısa komutla aynı işlemleri `githelp setup`, `githelp commit` gibi açabilirsin.

- `init` / `baslat`: Bu klasörde Git geçmişini `main` dalıyla başlatır.
- `doktor`: Kurulumu kontrol eder; gerekirse yalnız bu projeye commit adı ve e-postası ekler.
- `setup` / `kurulum`: Hesap giriş yöntemini seçtirir ve projenin GitHub repo adresini eklemene yardım eder.
- `commit`: Dosya numaralarını ve bir kayıt açıklamasını sorar.
- `push`: Dalını ve uzak bağlantını seçtirip commit’lerini gönderir.

Tek adımı doğrudan yapmak istersen `login` hesaba giriş yapar, `bagla` mevcut bir GitHub repo adresini
HTTPS olarak ekler. SSH erişimini korumak için `setup` içindeki SSH yolunu seç. GitHub CLI ile terminalden
repo oluşturmak için önce bir commit hazırla, ardından `yayinla` kullan. Repo adı ve özel / herkese açık
seçimini sorar; varsayılan özeldir. Son olarak `push` ile commit’lerini gönder.

## Komut sözlüğü

| Komut | Türkçe karşılığı | Yaptığı iş |
| --- | --- | --- |
| `setup` | `kurulum` | GitHub hesap girişini ve proje adresini adım adım hazırlama |
| `status` | `durum` | Değişen dosyalar, dal ve son bilinen uzak kayıt farkı |
| `commit` | `kaydet` | Dosya seçimi → kayıt açıklaması → yerel commit |
| `push` | `gonder` | Yerel dal seçimi → uzak bağlantı → aynı adlı dala gönderim |
| `pull` | `al` | Çalıştığın dalı seçilen uzak bağlantının aynı adlı dalından güncelleme |
| `branch` | `dal` | Yeni yerel dal oluşturma veya yerel dal değiştirme |
| `pr` | — | GitHub’da mevcut dal için taslak pull request |
| `baslat` | `init` | Bu klasörde Git başlatma |
| `bagla` | `connect` | Var olan GitHub adresini HTTPS remote olarak ekleme |
| `login` | `giris` | Kayıtlı oturumu kullanma veya tarayıcıyla GitHub girişi ve proje için HTTPS kurulumu |
| `yayinla` | `publish` | GitHub’da özel veya herkese açık repo oluşturma |
| `doktor` | `doctor` | Araçlar, kimlik ve bağlantı kontrolü |
| `ogren` | `learn` | Git, branch, stage, commit, push, pull, PR ve conflict açıklamaları |
| `kur [klasör]` | `install` | Bağımsız `.github/githelp` kurulumu |
| `demo` | — | Git çalıştırmayan örnek tur |

`gönder`, `bağla`, `başlat`, `giriş`, `yayınla`, `öğren` ve `yardım` yazımları da desteklenir.
Kaynak klasöründe doğrudan kullanım: `node src/cli.mjs push` veya `npm start -- push`.

## Önce prova yap

```sh
node .github/githelp/cli.mjs push --dry-run
node .github/githelp/cli.mjs commit --dry-run
node .github/githelp/cli.mjs login --dry-run
node .github/githelp/cli.mjs setup --dry-run
```

`--dry-run` dosya değiştiren veya uzak servis üzerinde işlem yapan komutları **çalıştırmaz**;
yalnızca planı gösterir. Tarayıcıyla giriş de başlatılmaz. Yerel durum okumaları ve giriş/PR/repo işlemlerindeki GitHub CLI oturum
kontrolleri yapılabilir. GitHub CLI’nin kendi `pr create --dry-run` bayrağı kullanılmaz.

Renkleri kapatmak için `--no-color` veya `NO_COLOR` ortam değişkeni kullanılır.
Seçimlerde `0`, her yerde `Ctrl+C` ile çıkabilirsin. Araç tamamlanmış bir adımı otomatik geri almaz.

## Dosyaların ve geçmişin nasıl ele alınır?

- Commit’ten önce dosyaları sen seçersin; yalnız bu dosyalar `git add` ile hazırlanır.
- Daha önce stage edilmiş ama seçmediğin dosyalar varsa işlem durur. Gizlice commit’e eklenmezler.
- Seçtiğin dosyanın **tüm güncel hali** kaydedilir; satır bazında kısmi commit bu sürümde yoktur.
- `.env`, özel anahtar ve benzeri dosya adları seçildiğinde commit durur. `.env.example` gibi şablonlar kabul edilir.
  Bu, dosya adına dayalı bir kontroldür; dosya içeriklerini veya geçmiş commit’leri tarayan bir gizli bilgi tarayıcısı değildir.
- Push, seçilen yerel dalı uzaktaki **aynı adlı** dala gönderir. Başka dalı `main` üzerine eşlemez,
  ayrıca tag veya alt modül göndermez. Birden fazla push adresi olan bağlantılarda işlem durur.
- Pull yalnızca fast-forward ile ilerler. Ayrılmış geçmişte otomatik merge veya rebase yapmaz.
  Fetch aşaması uzak referansları güncelleyebilir; bu, çalışma dosyalarının birleştirildiği anlamına gelmez.
- Dal değiştirme ve PR açma için temiz çalışma alanı gerekir. Yeni dal oluştururken yerel değişiklikler korunur.
- Yarım kalmış merge/rebase işlemlerinde araç durur. Force push, reset, dal silme ve otomatik çakışma çözümü yoktur.
- Git’in hook, imzalama ve kimlik doğrulama ayarları geçerlidir. Bir hook hata verirse bazı önceki adımlar,
  örneğin dosyaların stage edilmesi, tamamlanmış olabilir; `status` ile kontrol edebilirsin.

PR akışı bu ilk sürümde aynı GitHub reposundaki dallar içindir. Fork’lar arası PR, GitHub Enterprise,
uzak dal checkout’u, özel upstream adlarıyla pull ve merge/rebase yönetimi kapsam dışındadır.
PR açmadan önce mevcut dalın son commit’inin seçilen GitHub reposuna gönderildiği kontrol edilir.

## Geliştirme

```sh
npm run check
npm test
npm pack --dry-run
```

Testler geçici klasörlerde gerçek Git repoları ve yerel bare uzak repolar oluşturur. Kullanıcının global
Git ayarlarını okumaz, GitHub’a bağlanmaz, gerçek hesaba giriş, push veya PR işlemi yapmaz.
Giriş akışı sahte komut sonuçlarıyla sınanır; canlı tarayıcı girişi ve GitHub PR/repo servisleriyle uçtan uca testler
bu paketin otomatik testlerine dahil değildir.

GitHub Actions için Windows, macOS ve Linux üzerinde Node.js 22/24 test matrisi hazırdır.
Bu matristeki uzak çalıştırmalar repo GitHub’a gönderildikten sonra gerçekleşir.

## Açık kaynak

gitHelp MIT lisanslıdır. Yeni başlayan birinin anlayamadığı bir açıklamayı sadeleştirmek de katkıdır.
[Katkı rehberi](CONTRIBUTING.md), [davranış kuralları](CODE_OF_CONDUCT.md) ve [güvenlik politikası](SECURITY.md)
ile başlayabilirsin.
