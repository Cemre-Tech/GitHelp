# gitHelp’a katkı

İlk katkın olabilir. Açıklamaları iyileştirmek, anlaşılmayan bir adımı bildirmek ve test eklemek değerli katkılardır.

## Yerelde başla

Node.js 22+ ve Git 2.28+ kur. Harici bağımlılık veya build adımı yok.

```sh
npm start
npm run check
npm test
```

GitHub’da fork oluşturup kendi kopyanı klonla. Değişikliğin için bir özellik dalı aç, küçük bir commit al,
fork’una gönder ve asıl projeye pull request aç. Henüz npm yayını olmadığı için yerel kaynak kodu kullan.

## Bir değişiklik gönderirken

1. Tek bir sorunu çöz; ilgisiz çalışan kodu değiştirme.
2. Kullanıcıya dönük metinleri sade Türkçe ve İngilizceyle yaz. Terimi açıklarken gerçek Git terimini de göster.
3. Git veya dosya değiştiren davranışı gerçek, geçici bir repo üzerinde test et.
4. `npm run check` ve `npm test` çalıştır. Yeni komutları README’ye ekle.
5. PR’da sorunu, kullanıcıya etkisini ve nasıl denediğini anlat.

## Korunacak ilkeler

- Komutlar shell metni birleştirilerek çalıştırılmaz; program ve argümanlar ayrı gönderilir.
- Mutasyonlar `applyPlan` veya giriş akışının planı üzerinden açıklama, önizleme ve açık onay alır.
- `--dry-run` mutasyon yapmaz. Özellikle `gh pr create --dry-run` kullanılmaz; bu bayrak push yapabilir.
- Force push, otomatik reset, mevcut kurulumun üzerine yazma ve sessiz history rewrite eklenmez.
- Gerçek kullanıcı hesabına veya GitHub’a bağlanan testler varsayılan test paketine eklenmez.
- Giriş testlerinde GitHub CLI sonuçlarını taklit et; gerçek tarayıcı oturumu veya token kullanma.
  Prova/iptal, kayıtlı oturumun yeniden kullanımı, yerel yardımcı kapsamı ve ayrı fetch/push hedeflerinin korunmasını dene.
- `.env`, token, gerçek e-posta veya erişim anahtarlarını örneklere ve hata bildirimlerine koyma.
- Harici bağımlılık eklemeden önce Node.js standart kütüphanesinin yeterli olup olmadığını değerlendir.

## Dosyalar

`src/cli.mjs` giriş noktasıdır. İş akışları `src/app.mjs`, Git işlemleri `src/git.mjs`, terminal etkileşimi
`src/ui.mjs`, dosya adı kontrolleri `src/safety.mjs`, taşınabilir kurulum `src/install.mjs` içindedir.

Dil seçimi `src/i18n.mjs` içindedir. Metinlerin Türkçe ve İngilizce karşılıklarını aynı yerde
`t('Türkçe', 'English')` ile tanımla. Menüler ve öğrenme içerikleri dil seçildikten sonra oluşturulmalıdır;
çeviri çağrılarını modülün üst seviyesinde sabitlere dönüştürme. Yeni kullanıcı akışını iki dilde de dene.

Kaynak dosyaları değiştirmek için bir derleme gerekmez. `.github/githelp` kurulumları kaynak dosyaların
kopyasıdır; kaynak sürümü değişince eski kurulumlar kendiliğinden güncellenmez.
