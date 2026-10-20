import { useMemo, useState } from "react";
import { ASAMALAR, DERSLER, KONTROL_MIN_SORU } from "../data/mufredat";
import { useVeri } from "../lib/durum";
import { kayitHatasi, konuListesi, oran, yuzde } from "../lib/hesap";
import { bugun } from "../lib/tarih";
import type { Asama, Kayit } from "../lib/types";

export type KayitTaslak = Partial<Omit<Kayit, "olusturma">>;

const sayiOku = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function KayitFormu({ taslak, bitti }: { taslak: KayitTaslak; bitti: () => void }) {
  const { veri, ozetler, kayitKaydet, bildir, ayarGuncelle } = useVeri();
  const [tarih, setTarih] = useState(taslak.tarih ?? bugun());
  const [ders, setDers] = useState(taslak.ders ?? "");
  const [konu, setKonu] = useState(taslak.konu ?? "");
  const [yeniKonu, setYeniKonu] = useState(false);
  const [asama, setAsama] = useState<Asama>(taslak.asama ?? 1);
  const [cozulen, setCozulen] = useState(taslak.cozulen?.toString() ?? "");
  const [dogru, setDogru] = useState(taslak.dogru?.toString() ?? "");
  const [not, setNot] = useState(taslak.not ?? "");
  const [sure, setSure] = useState(taslak.sureDk?.toString() ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const konular = useMemo(() => konuListesi(veri.ayarlar, veri.kayitlar).filter((k) => k.ders === ders), [veri, ders]);
  const ozet = ozetler.find((z) => z.ders === ders && z.konu === konu);
  const c = sayiOku(cozulen), d = sayiOku(dogru);
  const canliOran = Number.isFinite(c) && Number.isFinite(d) && c > 0 && d <= c ? oran(d, c) : null;

  // Konu seçilince önerilen aşamayı otomatik getir.
  const konuSec = (k: string) => {
    setKonu(k);
    if (taslak.asama || taslak.id) return;
    const z = ozetler.find((o) => o.ders === ders && o.konu === k);
    if (!z || z.durum === "Başlanmadı") setAsama(1);
    else if (z.durum === "Kapandı") setAsama(3);
    else if (z.asamaCozulen[2] >= 30 || z.asamaCozulen[3] > 0) setAsama(3);
    else if (z.asamaCozulen[1] >= 20 || z.asamaCozulen[2] > 0) setAsama(2);
    else setAsama(1);
  };

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = { tarih, ders, konu: konu.trim(), asama, cozulen: c, dogru: d, not: not.trim(), sureDk: sure ? Number(sure) : undefined };
    const h = kayitHatasi(k);
    if (h) return setHata(h);
    setKaydediliyor(true);
    try {
      if (yeniKonu && !konular.some((x) => x.konu === k.konu))
        await ayarGuncelle({ ozelKonular: [...veri.ayarlar.ozelKonular, { ders, konu: k.konu }] });
      await kayitKaydet({ ...k, id: taslak.id });
      bildir(taslak.id ? "Kayıt güncellendi" : `Kaydedildi: ${k.konu}, ${k.cozulen} soru`);
      bitti();
    } catch {
      setKaydediliyor(false);
    }
  };

  return (
    <form className="form" onSubmit={gonder} noValidate>
      <div className="form-ikili">
        <label>
          Tarih
          <input type="date" value={tarih} max={bugun()} onChange={(e) => setTarih(e.target.value)} required />
        </label>
        <label>
          Ders
          <select value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); setYeniKonu(false); }} required>
            <option value="">Seç…</option>
            {DERSLER.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
      </div>

      <label>
        Konu
        {yeniKonu ? (
          <div className="satir-giris">
            <input value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="Konu adı" autoFocus />
            <button type="button" className="dugme-metin" onClick={() => { setYeniKonu(false); setKonu(""); }}>Listeden seç</button>
          </div>
        ) : (
          <select value={konu} disabled={!ders} onChange={(e) => (e.target.value === "__yeni" ? (setYeniKonu(true), setKonu("")) : konuSec(e.target.value))}>
            <option value="">{ders ? "Seç…" : "Önce ders seç"}</option>
            {konular.map((k) => {
              const z = ozetler.find((o) => o.ders === ders && o.konu === k.konu);
              const ek = z?.durum === "Kapandı" ? " ✓" : z?.durum === "Devam" ? ` · A${z.enYuksekAsama}` : "";
              return <option key={k.konu} value={k.konu}>{k.konu}{ek}</option>;
            })}
            <option value="__yeni">+ Listede olmayan konu ekle</option>
          </select>
        )}
      </label>

      <fieldset className="asama-sec">
        <legend>Aşama</legend>
        <div className="segment">
          {([1, 2, 3] as Asama[]).map((a) => (
            <button type="button" key={a} className={asama === a ? "secili" : ""} aria-pressed={asama === a} onClick={() => setAsama(a)}>
              <span className="segment-no">{a}</span> {ASAMALAR[a].ad}
            </button>
          ))}
        </div>
        <p className="ipucu-metin">{ASAMALAR[asama].hedef}: {ASAMALAR[asama].aciklama}</p>
      </fieldset>

      {ozet && ozet.toplamCozulen > 0 && (
        <p className="konu-durum-satir">
          Bu konuda şimdiye kadar: A1 {ozet.asamaCozulen[1]} · A2 {ozet.asamaCozulen[2]} · A3 {ozet.asamaCozulen[3]} soru
          {ozet.kontrolBasari !== null && <> · kontrol {yuzde(ozet.kontrolBasari)}</>}
        </p>
      )}

      <div className="form-uclu">
        <label>
          Çözülen
          <input inputMode="numeric" pattern="[0-9]*" value={cozulen} onChange={(e) => setCozulen(e.target.value.replace(/\D/g, ""))} placeholder="35" />
        </label>
        <label>
          Doğru
          <input inputMode="numeric" pattern="[0-9]*" value={dogru} onChange={(e) => setDogru(e.target.value.replace(/\D/g, ""))} placeholder="21" />
        </label>
        <div className="canli-oran" aria-live="polite">
          <span>Doğruluk</span>
          <strong>{asama === 1 && canliOran !== null ? <span title="Isınmada çözüme bakmak serbest, oran önemli değil">{yuzde(canliOran)}*</span> : yuzde(canliOran)}</strong>
        </div>
      </div>
      {asama === 3 && Number.isFinite(c) && c < KONTROL_MIN_SORU && (
        <p className="uyari-metin">Kontrol testi en az {KONTROL_MIN_SORU} soru olmalı. Daha az olursa konu bu kayıtla kapanmaz.</p>
      )}

      <label>
        <span className="etiket-satir">Not: neyde takıldın? <span className="soluk">(tek cümle)</span></span>
        <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="ör. negatif üslerde işaret hatası yapıyorum" maxLength={200} />
      </label>

      <label>
        <span className="etiket-satir">Süre (dk) <span className="soluk">(isteğe bağlı)</span></span>
        <input inputMode="numeric" value={sure} onChange={(e) => setSure(e.target.value.replace(/\D/g, ""))} placeholder="45" />
      </label>

      {hata && <p className="hata-metin" role="alert">{hata}</p>}
      <button className="dugme dugme-ana" disabled={kaydediliyor}>{kaydediliyor ? "Kaydediliyor…" : taslak.id ? "Güncelle" : "Kaydet"}</button>
      <p className="soluk kucuk">Dürüst doldur: yüzdeyi yukarı yuvarlama, olduğu gibi yaz.</p>
    </form>
  );
}
