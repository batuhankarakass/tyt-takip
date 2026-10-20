import { useMemo } from "react";
import { DERSLER } from "../data/mufredat";
import { Ikon, Kart, SayiAlani, Stat } from "../components/ui";
import { useVeri } from "../lib/durum";
import { useGezinti } from "../lib/gezinti";
import { konuListesi } from "../lib/hesap";
import { dakikaSaniye, useSayac } from "../lib/sayac";
import { bugun, gunEkle } from "../lib/tarih";

export function Sayac() {
  const s = useSayac();
  const { veri, ayarGuncelle, bildir } = useVeri();
  const { kayitAc } = useGezinti();
  const b = bugun();
  const konular = useMemo(() => konuListesi(veri.ayarlar, veri.kayitlar).filter((k) => k.ders === s.ders), [veri, s.ders]);
  const bugunOdak = veri.odaklar.filter((o) => o.baslangic.slice(0, 10) === b);
  const bugunDk = bugunOdak.reduce((t, o) => t + o.dakika, 0);
  const haftaBas = gunEkle(b, -6);
  const haftaDk = veri.odaklar.filter((o) => o.baslangic.slice(0, 10) >= haftaBas).reduce((t, o) => t + o.dakika, 0);
  const konuDk = s.konu ? bugunOdak.filter((o) => o.konu === s.konu).reduce((t, o) => t + o.dakika, 0) : 0;

  const R = 108, C = 2 * Math.PI * R;
  const ilerleme = s.toplamMs ? 1 - s.kalan / s.toplamMs : 0;

  const bitir = async () => {
    const dk = await s.bitirKaydet();
    bildir(dk >= 1 ? `${dk} dk odak kaydedildi` : "1 dakikadan kısa, kaydedilmedi");
  };

  return (
    <div className="sayfa">
      <div className="sayfa-baslik"><h1>Odak Sayacı</h1></div>

      <Kart className="sayac-kart">
        <div className="sayac-mod">
          <button className={s.mod === "calisma" ? "secili" : ""} onClick={() => !s.calisiyor && s.sifirla("calisma")} disabled={s.calisiyor}>Çalışma {veri.ayarlar.calismaDk} dk</button>
          <button className={s.mod === "mola" ? "secili" : ""} onClick={() => !s.calisiyor && s.sifirla("mola")} disabled={s.calisiyor}>Mola {veri.ayarlar.molaDk} dk</button>
        </div>
        <div className="sayac-daire">
          <svg viewBox="0 0 240 240" aria-hidden>
            <circle cx="120" cy="120" r={R} className="sayac-iz" />
            <circle cx="120" cy="120" r={R} className={`sayac-dolu ${s.mod}`} strokeDasharray={C} strokeDashoffset={C * (1 - ilerleme)} transform="rotate(-90 120 120)" />
          </svg>
          <div className="sayac-zaman" role="timer" aria-live="off">
            <strong>{dakikaSaniye(s.kalan)}</strong>
            <span className="soluk">{s.mod === "calisma" ? (s.konu ? s.konu : "odak") : "mola"}</span>
          </div>
        </div>
        <div className="dugme-grup orta">
          {s.calisiyor ? (
            <button className="dugme dugme-ana buyuk" onClick={s.duraklat}><Ikon ad="durdur" /> Duraklat</button>
          ) : (
            <button className="dugme dugme-ana buyuk" onClick={s.baslat}><Ikon ad="oynat" /> {s.kalan < s.toplamMs ? "Devam" : "Başlat"}</button>
          )}
          {s.mod === "calisma" && s.kalan < s.toplamMs && <button className="dugme" onClick={bitir}>Bitir ve kaydet</button>}
          <button className="ikon-dugme" onClick={() => s.sifirla()} aria-label="Sıfırla" title="Sıfırla"><Ikon ad="sifirla" /></button>
        </div>
        <div className="form-ikili">
          <label>
            Ders
            <select value={s.ders ?? ""} onChange={(e) => s.konuSec(e.target.value || undefined, undefined)}>
              <option value="">Seçilmedi</option>
              {DERSLER.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>
            Konu
            <select value={s.konu ?? ""} disabled={!s.ders} onChange={(e) => s.konuSec(s.ders, e.target.value || undefined)}>
              <option value="">Seçilmedi</option>
              {konular.map((k) => <option key={k.konu}>{k.konu}</option>)}
            </select>
          </label>
        </div>
        {s.konu && konuDk > 0 && (
          <button className="dugme genis" onClick={() => kayitAc({ ders: s.ders, konu: s.konu, sureDk: konuDk })}>
            Bu çalışmayı kaydet ({konuDk} dk {s.konu})
          </button>
        )}
      </Kart>

      <div className="stat-izgara">
        <Stat etiket="Bugün odak" deger={`${bugunDk} dk`} alt={`${bugunOdak.length} tur`} />
        <Stat etiket="Son 7 gün" deger={`${Math.floor(haftaDk / 60)} sa ${haftaDk % 60} dk`} />
      </div>

      <Kart baslik="Süreler">
        <div className="form-ikili">
          <label>
            Çalışma (dk)
            <SayiAlani id="calisma-dk" deger={veri.ayarlar.calismaDk} min={5} max={120} kaydet={(n) => ayarGuncelle({ calismaDk: n })} />
          </label>
          <label>
            Mola (dk)
            <SayiAlani id="mola-dk" deger={veri.ayarlar.molaDk} min={1} max={60} kaydet={(n) => ayarGuncelle({ molaDk: n })} />
          </label>
        </div>
        <p className="soluk kucuk">Tur bitince ses çalar; izin verirsen bildirim de gelir. Sayaç sekme değiştirsen de çalışmaya devam eder.</p>
      </Kart>
    </div>
  );
}
