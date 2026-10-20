import { useRef, useState } from "react";
import { Ikon, Kart, OnayDugme, SayiAlani } from "../components/ui";
import type { Veri } from "../lib/types";
import { dosyaIndir, gunlukKayitOku, jsonOku, kayitlariCsv, ornekVeri, veriJson, type IceAktarSonuc } from "../lib/aktar";
import { supabase } from "../lib/depo";
import { useVeri } from "../lib/durum";
import { bugun } from "../lib/tarih";
import { BOS_VERI } from "../lib/types";
import { SistemKart } from "./Bugun";

export function Ayarlar({ girisAc }: { girisAc: () => void }) {
  const { veri, depo, oturum, ayarGuncelle, topluEkle, hepsiniDegistir, cihazVerisiniBulutaAktar, cikis, bildir } = useVeri();
  const [metin, setMetin] = useState("");
  const [onizleme, setOnizleme] = useState<IceAktarSonuc | null>(null);
  const [yedek, setYedek] = useState<Veri | null>(null);
  const [yedekHata, setYedekHata] = useState<string | null>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);
  const yedekRef = useRef<HTMLInputElement>(null);

  const oku = (m: string) => {
    setMetin(m);
    setOnizleme(m.trim() ? gunlukKayitOku(m) : null);
  };

  const iceAktar = async () => {
    if (!onizleme?.kayitlar.length) return;
    await topluEkle({ kayitlar: onizleme.kayitlar }).catch(() => {});
    bildir(`${onizleme.kayitlar.length} kayıt aktarıldı`);
    setMetin("");
    setOnizleme(null);
  };

  const yedekOku = async (f: File) => {
    setYedekHata(null);
    try {
      setYedek(jsonOku(await f.text()));
    } catch (e) {
      setYedek(null);
      setYedekHata(e instanceof SyntaxError ? "Dosya okunamadı: geçerli bir JSON değil." : (e as Error).message);
    }
  };

  const yedekUygula = async () => {
    if (!yedek) return;
    await hepsiniDegistir({ ...yedek, ayarlar: yedek.ayarlar ?? veri.ayarlar }).catch(() => {});
    setYedek(null);
    bildir("Yedek geri yüklendi");
  };

  return (
    <div className="sayfa">
      <div className="sayfa-baslik"><h1>Ayarlar</h1></div>

      <Kart baslik="Hesap">
        {depo === "bulut" && oturum ? (
          <>
            <p className="hesap-satir"><Ikon ad="bulut" /> <span><strong>{oturum.user.email}</strong><br /><span className="soluk">Veriler hesabında, her cihazda aynı.</span></span></p>
            <div className="dugme-grup">
              <button className="dugme" onClick={async () => { const n = await cihazVerisiniBulutaAktar(); bildir(n ? `${n} satır hesaba aktarıldı` : "Bu cihazda aktarılacak yeni veri yok"); }}>Bu cihazdaki misafir verisini hesaba aktar</button>
              <button className="dugme" onClick={cikis}>Çıkış yap</button>
            </div>
          </>
        ) : (
          <>
            <p className="hesap-satir"><Ikon ad="cihaz" /> <span><strong>Misafir modu</strong><br /><span className="soluk">Veriler sadece bu cihazda (tarayıcıda) duruyor. Tarayıcı verisi silinirse kaybolur, düzenli yedek al.</span></span></p>
            {supabase ? (
              <button className="dugme dugme-ana" onClick={girisAc}>Giriş yap / hesap aç</button>
            ) : (
              <p className="soluk kucuk">Bu kurulumda hesap sistemi kapalı. Açmak için README'deki Supabase adımlarına bak.</p>
            )}
          </>
        )}
      </Kart>

      <Kart baslik="Hedefler">
        <div className="form form-ikili">
          <label>
            Günlük soru hedefi
            <SayiAlani id="gunluk-hedef" deger={veri.ayarlar.gunlukHedef} min={10} max={1000} adim={10} kaydet={(n) => ayarGuncelle({ gunlukHedef: n })} />
          </label>
          <label>
            Sınav tarihi
            <input type="date" min={bugun()} value={veri.ayarlar.sinavTarihi ?? ""} onChange={(e) => ayarGuncelle({ sinavTarihi: e.target.value || undefined })} />
          </label>
        </div>
      </Kart>

      <Kart baslik="Excel / Google Sheets'ten aktar">
        <p className="soluk kucuk">
          "Günlük Kayıt" sayfasını seçip kopyala ve aşağıya yapıştır, ya da Dosya → İndir → CSV ile indirip dosyayı seç. Sütunlar: Tarih, Ders, Konu, Aşama, Çözülen, Doğru, Not.
        </p>
        <textarea rows={4} value={metin} onChange={(e) => oku(e.target.value)} placeholder={"Tarih\tDers\tKonu\tAşama\tÇözülen Soru\tDoğru\t…\n08.10.2026\tMatematik\tSayı Basamakları\t1\t56\t56"} />
        <div className="dugme-grup">
          <button className="dugme" onClick={() => dosyaRef.current?.click()}>CSV dosyası seç</button>
          <input ref={dosyaRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) oku(await f.text()); e.target.value = ""; }} />
          {onizleme && (
            <button className="dugme dugme-ana" disabled={!onizleme.kayitlar.length} onClick={iceAktar}>
              {onizleme.kayitlar.length} kaydı aktar
            </button>
          )}
        </div>
        {onizleme && onizleme.hatalar.length > 0 && (
          <ul className="hata-liste">
            {onizleme.hatalar.slice(0, 8).map((h) => <li key={h}>{h}</li>)}
            {onizleme.hatalar.length > 8 && <li>… {onizleme.hatalar.length - 8} hata daha</li>}
          </ul>
        )}
      </Kart>

      <Kart baslik="Yedek ve dışa aktarma">
        <div className="dugme-grup">
          <button className="dugme" onClick={() => dosyaIndir(`tyt-kayitlar-${bugun()}.csv`, kayitlariCsv(veri.kayitlar), "text/csv;charset=utf-8")}>Kayıtları CSV indir</button>
          <button className="dugme" onClick={() => dosyaIndir(`tyt-yedek-${bugun()}.json`, veriJson(veri), "application/json")}>Tam yedek indir</button>
          <button className="dugme" onClick={() => yedekRef.current?.click()}>Yedekten geri yükle</button>
          <input ref={yedekRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) yedekOku(f); e.target.value = ""; }} />
        </div>
        {yedekHata && <p className="hata-metin" role="alert">{yedekHata}</p>}
        {yedek && (
          <div className="uyari-metin yedek-onay">
            <span>Yedekte {yedek.kayitlar.length} kayıt, {yedek.denemeler.length} deneme var. Şu anki verilerin silinip yerine bu yedek gelecek.</span>
            <div className="dugme-grup">
              <button className="dugme dugme-kucuk dugme-tehlike" onClick={yedekUygula}>Yedeği yükle</button>
              <button className="dugme dugme-kucuk" onClick={() => setYedek(null)}>Vazgeç</button>
            </div>
          </div>
        )}
      </Kart>

      <Kart baslik="Deneme amaçlı">
        <div className="dugme-grup">
          {veri.kayitlar.length === 0 ? (
            <button className="dugme" onClick={async () => { await topluEkle(ornekVeri()).catch(() => {}); bildir("Örnek veriler yüklendi"); }}>Örnek verilerle dene</button>
          ) : (
            <OnayDugme soru="Kayıtlarının yanına eklensin mi?" evet="Ekle" onay={async () => { await topluEkle(ornekVeri()).catch(() => {}); bildir("Örnek veriler yüklendi"); }}>Örnek verilerle dene</OnayDugme>
          )}
          <OnayDugme className="dugme dugme-tehlike" soru="Tüm kayıt, deneme ve odak süreleri silinsin mi?" evet="Hepsini sil" onay={async () => { await hepsiniDegistir({ ...BOS_VERI, ayarlar: veri.ayarlar }).catch(() => {}); bildir("Tüm veriler silindi"); }}>Tüm verileri sil</OnayDugme>
        </div>
      </Kart>

      <SistemKart />
      <Kart baslik="Kurallar">
        <ul className="kural-liste">
          <li>Aşama 3'te %70'i geçmeden konuyu kapatma. Uygulama bunu kendisi kontrol eder.</li>
          <li>Yüzdeyi yukarı yuvarlama, olduğu gibi yaz. Uygulama da hep aşağı yuvarlar.</li>
          <li>"Not" tek cümle olsun: neyde takıldın. Ayrı yanlış defteri tutma, Kayıtlar → "Sadece takıldıklarım" o işi görüyor.</li>
          <li>Bu uygulamanın tek işe yarama şartı dürüst doldurulması. Şişirilmiş sayı kimseyi kandırmaz, sadece sınava hazırlıksız girmeni sağlar.</li>
        </ul>
      </Kart>
    </div>
  );
}
