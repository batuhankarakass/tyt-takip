# TYT Takip

TYT'ye hazırlanan öğrenciler için çalışma takip uygulaması. Excel'deki "TYT Çalışma Takip Dosyası"nın
geliştirilmiş hali: telefonda uygulama gibi kurulur (PWA), çevrimdışı çalışır, isteğe bağlı hesapla
veriler her cihazda senkron olur.

## Sistem

Her konu 3 aşamada geçilir:

| Aşama | Ad | Hedef | Kural |
|---|---|---|---|
| 1 | Isınma | ~20 soru | Takıldığın anda çözüme bak. Doğruluk oranı sayılmaz. |
| 2 | Pekiştirme | ~30-40 soru | Çözüme bakmak yok. |
| 3 | Kontrol | en az 20 soru, süreli, karma | Toplam başarı %70 ve üzeriyse konu **kapanır**. |

Durum kuralı Excel'deki formülle birebir aynıdır: hiç soru yoksa *Başlanmadı*, Aşama 3 toplamı 20 sorudan
azsa ya da başarı %70'in altındaysa *Devam*, değilse *Kapandı*. Yüzdeler hep aşağı yuvarlanır.

## Ekranlar

- **Bugün**: günlük hedef, seri (art arda çalışılan gün), son 7 gün, akıllı öneriler
  ("Aşama 2'ye geç", "kontrol geçilmedi, Aşama 2'ye dön", "sıradaki konu", "tekrar zamanı", "en zayıf ders").
- **Kayıtlar**: günlük kayıtlar; ders filtresi, arama, "sadece takıldıklarım" (yanlış defteri yerine).
- **Konular**: 10 ders, 119 konu; her konunun aşama ilerlemesi, kontrol başarısı, takılma notları.
- **Deneme**: TYT deneme netleri (Türkçe 40, Sosyal 20, Temel Matematik 40, Fen 20; 4 yanlış 1 doğruyu götürür), gelişim grafiği.
- **Sayaç**: pomodoro; tur bitince ses, titreşim ve bildirim. Süre konuya bağlanıp kayda aktarılabilir.
- **Analiz**: Excel'deki Haftalık Özet + "bakılacak 3 şey", günlük soru grafiği (aşamalara göre), haftalık kontrol başarısı, ders bazlı tablo.
- **Ayarlar**: günlük hedef, sınav tarihi, Excel/Google Sheets'ten içe aktarma (CSV veya kopyala-yapıştır), CSV/JSON yedek.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # hesaplama ve içe aktarma testleri
npm run build      # dist/: kurulabilir PWA
npm run build:tek  # dist-tek/index.html: tek dosyalık önizleme (örnek verilerle açılır)
```

## Hesap ve bulut (isteğe bağlı)

`.env` yoksa uygulama **misafir modunda** çalışır: veriler sadece o tarayıcıda durur.
Herkese açık kullanım için Supabase ile hesap sistemi açılır:

1. [supabase.com](https://supabase.com)'da ücretsiz proje aç.
2. SQL Editor'de `supabase/schema.sql` dosyasını çalıştır (tablo + satır güvenliği: herkes sadece kendi verisini görür).
3. Authentication → URL Configuration'da sitenin adresini *Site URL* ve *Redirect URLs*'e ekle.
4. `.env.example`'ı `.env` olarak kopyala, Settings → API'deki URL ve anon key'i yaz.
5. `npm run build` ve `dist/` klasörünü yayınla (Vercel, Netlify, Cloudflare Pages, GitHub Pages; hepsi statik siteyi destekler).

Giriş yapan kullanıcı, daha önce misafir olarak girdiği verileri Ayarlar → "Bu cihazdaki misafir verisini hesaba aktar" ile hesabına taşıyabilir.

## Yapı

```
src/data/mufredat.ts   konu listesi, TYT testleri, aşama tanımları
src/lib/hesap.ts       durum kuralı, özetler, seri, öneriler, net hesabı (saf fonksiyonlar, testli)
src/lib/aktar.ts       Excel/CSV içe aktarma, dışa aktarma, örnek veri
src/lib/depo.ts        yerel (localStorage) ve Supabase depoları
src/lib/durum.tsx      uygulama durumu (React context)
src/lib/sayac.tsx      pomodoro sayacı
src/pages/*            ekranlar
supabase/schema.sql    veritabanı şeması
```
