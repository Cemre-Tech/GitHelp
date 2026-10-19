# Güvenlik politikası

Bu ilk sürümde güvenlik düzeltmeleri en güncel `0.2.x` sürümüne uygulanır.

## Güvenlik sorunu bildirme

Komut enjeksiyonu, onaysız dosya/uzak repo değişikliği, gizli bilgi sızıntısı veya kurulumun hedef klasör
dışına yazması gibi bir sorun bulursan gerçek kimlik bilgileriyle deneme.

GitHub reposunda **Security → Report a vulnerability** kanalı etkinse onu kullan. Etkin değilse
bakımcıdan özel bir iletişim kanalı iste; açığın kullanım ayrıntılarını veya gerçek tokenları açık
issue’ya ekleme. Raporuna sürümü, işletim sistemini, beklenen sonucu ve sentetik verilerle tekrar
üretme adımlarını ekle.

## Sınırlar

gitHelp yerel Git ve GitHub CLI kurulumunu çalıştırır. Git hook’ları, credential helper’lar ve repo
ayarları bu programların normal çalışma davranışıdır. Güvenmediğin bir repo veya yürütülebilir dosyayı
güvenilir hale getirmez. `.github/githelp` altındaki kod, o projeye commit edilmiş kod olarak incelenmelidir.

`login` kişisel erişim tokenı istemez; gerekirse GitHub CLI’nin tarayıcı girişi açılır. gitHelp kendi kimlik
bilgisi dosyasını yazmaz ve tokenı `.github/githelp` içine koymaz. Oturumu GitHub CLI saklar: işletim
sisteminin kimlik deposu kullanılamadığında düz metin kullanıcı ayar dosyasına dönebilir. Giriş, GitHub CLI
kullanıcı/host tercihlerini etkiler; gitHelp’ın kendi HTTPS yardımcısı ve uzak adres değişiklikleri ise
onaydan sonra bu projenin `.git/config` dosyasına yazılır. Repo içindeki helper ayarı token içermez.

`GH_TOKEN` veya `GITHUB_TOKEN`, GitHub CLI’nin kayıtlı oturumundan önceliklidir. Kalıcı tarayıcı girişi bu
değişkenler varken durur; yalnız değişken adları belirtilir. Gerçek değerleri çıktılara, ekran görüntülerine
veya hata bildirimlerine ekleme. Oturum durumu komutlarının ham çıktısı gitHelp tarafından gösterilmez.

Gizli dosya denetimi dosya adlarına bakar; içerik veya Git geçmişi taraması yapmaz. Daha önce commit
edilmiş bir gizli bilginin gönderilmesini algıladığı iddia edilmez. Hata çıktısındaki maskeleme de tüm
olası credential biçimlerini kapsamaz.
