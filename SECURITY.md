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

Gizli dosya denetimi dosya adlarına bakar; içerik veya Git geçmişi taraması yapmaz. Daha önce commit
edilmiş bir gizli bilginin gönderilmesini algıladığı iddia edilmez. Hata çıktısındaki maskeleme de tüm
olası credential biçimlerini kapsamaz.
