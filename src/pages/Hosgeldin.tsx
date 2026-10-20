import { useEffect, useState } from "react";
import { useVeri } from "../lib/durum";
import { gelenKoduTemizle, tasimaCoz, type Tasima } from "../lib/tasima";

/** İlk açılış: bu cihazda henüz profil yoksa öğrencinin adını sorar. */
export function Hosgeldin() {
  const { profilOlustur } = useVeri();
  const [ad, setAd] = useState("");
  return (
    <div className="giris">
      <div className="giris-kutu">
        <div className="logo-buyuk">TYT<span>takip</span></div>
        <p className="soluk">Konu konu soru çöz, kontrol testiyle kapat, bir sonrakine geç.</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (ad.trim()) profilOlustur(ad);
          }}
        >
          <label>
            Adın ne?
            <input id="hosgeldin-ad" value={ad} onChange={(e) => setAd(e.target.value)} autoComplete="given-name" maxLength={40} autoFocus />
          </label>
          <button className="dugme dugme-ana" disabled={!ad.trim()}>Başla</button>
        </form>
        <p className="soluk kucuk">Excel'deki kayıtlarını sonra Ayarlar'dan aktarabilirsin. Veriler bu cihazda saklanır.</p>
      </div>
    </div>
  );
}

/** Sayfa "?al=" taşıma bağlantısıyla açıldığında gelen profili gösterip onay ister. */
export function TasimaAl({ kod, bitti }: { kod: string; bitti: () => void }) {
  const { tasimaAl, bildir } = useVeri();
  const [t, setT] = useState<Tasima | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);

  useEffect(() => {
    tasimaCoz(kod).then(setT, (e: Error) => setHata(e.message));
  }, [kod]);

  const kapat = () => {
    gelenKoduTemizle();
    bitti();
  };

  const al = async () => {
    if (!t) return;
    setBekle(true);
    try {
      const n = await tasimaAl(t);
      bildir(n ? `${t.ad}: ${n} kayıt eklendi` : `${t.ad}: kayıtlar zaten bu cihazda`);
      kapat();
    } catch {
      setBekle(false);
    }
  };

  const soru = t ? t.veri.kayitlar.reduce((s, k) => s + k.cozulen, 0) : 0;
  return (
    <div className="giris">
      <div className="giris-kutu">
        <div className="logo-buyuk">TYT<span>takip</span></div>
        {hata ? (
          <>
            <p className="hata-metin" role="alert">{hata}</p>
            <button className="dugme" onClick={kapat}>Uygulamaya geç</button>
          </>
        ) : !t ? (
          <p className="soluk">Bağlantı açılıyor…</p>
        ) : (
          <>
            <div className="tasima-ozet">
              <span className="profil-cip buyuk" aria-hidden>{t.ad.slice(0, 1).toLocaleUpperCase("tr")}</span>
              <div>
                <strong>{t.ad}</strong>
                <span className="soluk">
                  {t.veri.kayitlar.length} kayıt · {soru} soru{t.veri.denemeler.length ? ` · ${t.veri.denemeler.length} deneme` : ""}
                </span>
              </div>
            </div>
            <p className="soluk kucuk">Bu veriler bu cihaza "{t.ad}" profili olarak eklenecek. Bu adla bir profil zaten varsa sadece eksik kayıtlar eklenir.</p>
            <button className="dugme dugme-ana" onClick={al} disabled={bekle}>{bekle ? "Ekleniyor…" : "Bu cihaza ekle"}</button>
            <button className="dugme-metin" onClick={kapat}>Vazgeç</button>
          </>
        )}
      </div>
    </div>
  );
}
