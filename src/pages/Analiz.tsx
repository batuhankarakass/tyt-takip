import { useState } from "react";
import { KAPANMA_ORANI } from "../data/mufredat";
import { Cizgi, Cubuk, Gosterge, YiginSutun, type Seri } from "../components/Grafik";
import { Ikon, Kart, Sekmeler, Stat } from "../components/ui";
import { useVeri } from "../lib/durum";
import { dersOzetleri, donemOzeti, gunlukSeri, haftalikKontrol, haftalikSeri, oran, seri, yuzde } from "../lib/hesap";
import { bugun, gunEkle, kisaTarih, uzunTarih } from "../lib/tarih";

const ASAMA_SERI: Seri[] = [
  { ad: "A1 Isınma", renk: "var(--seri-1)" },
  { ad: "A2 Pekiştirme", renk: "var(--seri-2)" },
  { ad: "A3 Kontrol", renk: "var(--seri-3)" },
];

export function Analiz() {
  const { veri, ozetler } = useVeri();
  const [aralik, setAralik] = useState<"14" | "30" | "90">("30");
  const b = bugun();
  const gun = Number(aralik);
  const d7 = donemOzeti(veri.kayitlar, veri.odaklar, b, 7);
  const d30 = donemOzeti(veri.kayitlar, veri.odaklar, b, 30);
  const hk = haftalikKontrol(veri.kayitlar, ozetler, b);
  const s = seri(veri.kayitlar, b);
  const gunluk = gunlukSeri(veri.kayitlar, b, gun);
  const haftalar = haftalikSeri(veri.kayitlar, ozetler, b, 8);
  const dersler = dersOzetleri(ozetler);
  const kapanan = ozetler.filter((z) => z.durum === "Kapandı").length;
  const devam = ozetler.filter((z) => z.durum === "Devam").length;
  const toplam = ozetler.length;
  const toplamSoru = veri.kayitlar.reduce((t, k) => t + k.cozulen, 0);
  const soruDk = d30.odakDk > 0 ? d30.cozulen / d30.odakDk : null;

  const ucuIyi = hk.calisilanGun >= 5 && hk.kapananBuHafta > 0 && hk.egilim !== "asagi";

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Analiz</h1>
        <span className="soluk">{uzunTarih(b)}</span>
      </div>

      <Kart baslik="Haftalık kontrol: bakılacak 3 şey">
        <ol className="kontrol-liste">
          <li className={hk.calisilanGun >= 5 ? "iyi" : "dikkat"}>
            <Ikon ad={hk.calisilanGun >= 5 ? "tik" : "uyari"} boyut={18} />
            <div><strong>Çalışılan gün: {hk.calisilanGun}/7</strong><span>Boş günlerin kaçı dolmuş?</span></div>
          </li>
          <li className={hk.kapananBuHafta > 0 ? "iyi" : "dikkat"}>
            <Ikon ad={hk.kapananBuHafta > 0 ? "tik" : "uyari"} boyut={18} />
            <div><strong>Bu hafta kapanan konu: {hk.kapananBuHafta}</strong><span>Konu kapanmıyorsa Aşama 3'e geçiş ertelenmiş olabilir.</span></div>
          </li>
          <li className={hk.egilim === "asagi" ? "dikkat" : hk.egilim === "yukari" ? "iyi" : "notr"}>
            <Ikon ad={hk.egilim === "asagi" ? "asagi" : hk.egilim === "yukari" ? "yukari" : "ok"} boyut={18} />
            <div>
              <strong>Kontrol başarısı: {yuzde(hk.kontrolBuHafta)}</strong>
              <span>{hk.egilim === "veri-yok" ? "Karşılaştırmak için iki haftanın Aşama 3 verisi lazım." : `Geçen hafta ${yuzde(hk.kontrolGecenHafta)}, ${hk.egilim === "yukari" ? "yükseliyor" : hk.egilim === "asagi" ? "düşüyor" : "yerinde"}.`}</span>
            </div>
          </li>
        </ol>
        <p className="soluk kucuk">{ucuIyi ? "Üçü de iyi: hiçbir şeye karışma." : "Biri bozuksa bu hafta sadece onu konuş."}</p>
      </Kart>

      <div className="stat-izgara">
        <Stat etiket="Tamamlanma" deger={yuzde(oran(kapanan, toplam))} alt={`${kapanan} kapandı · ${devam} devam · ${toplam - kapanan - devam} başlanmadı`} vurgu />
        <Stat etiket="Toplam soru" deger={toplamSoru.toLocaleString("tr-TR")} />
        <Stat etiket="Seri" deger={`${s.gun} gün`} alt={`en uzun ${s.enUzun}`} />
        <Stat etiket="Soru / dk" deger={soruDk === null ? "—" : soruDk.toFixed(2)} alt="son 30 gün, süre girilenler" />
      </div>

      <Kart baslik="Günlük çözülen soru" sag={<Sekmeler<"14" | "30" | "90"> deger={aralik} degistir={setAralik} secenekler={[{ deger: "14", ad: "14g" }, { deger: "30", ad: "30g" }, { deger: "90", ad: "90g" }]} />}>
        <Gosterge seriler={ASAMA_SERI} />
        <YiginSutun
          veri={gunluk.map((g) => ({ etiket: kisaTarih(g.tarih), uzunEtiket: uzunTarih(g.tarih), degerler: [g.asama[1], g.asama[2], g.asama[3]] }))}
          seriler={ASAMA_SERI}
          hedef={veri.ayarlar.gunlukHedef}
        />
      </Kart>

      <Kart baslik="Haftalık kontrol (A3) başarısı">
        {haftalar.every((h) => h.kontrolBasari === null) && (
          <p className="soluk kucuk">Henüz Aşama 3 kaydı yok. İlk kontrol testini girdiğinde haftalık başarı burada çizilir.</p>
        )}
        <Cizgi
          ad="Kontrol başarısı"
          veri={haftalar.map((h) => ({
            etiket: kisaTarih(h.hafta),
            uzunEtiket: `${kisaTarih(h.hafta)} – ${kisaTarih(gunEkle(h.hafta, 6))}`,
            deger: h.kontrolBasari,
            ek: <div className="ipucu-satir soluk">{h.cozulen} soru · {h.gunSayisi} gün · {h.kapanan} kapanan</div>,
          }))}
          bicim={(v) => `%${Math.round(v * 100)}`}
          sabitUst={1}
          referans={{ deger: KAPANMA_ORANI, etiket: "%70 kapanma" }}
        />
      </Kart>

      <Kart baslik="Dönem özeti" className="kart-sifir">
        <table className="tablo">
          <thead><tr><th /><th>Son 7 gün</th><th>Son 30 gün</th></tr></thead>
          <tbody>
            <tr><td>Çalışılan gün</td><td>{d7.gunSayisi}</td><td>{d30.gunSayisi}</td></tr>
            <tr><td>Çözülen soru</td><td>{d7.cozulen}</td><td>{d30.cozulen}</td></tr>
            <tr><td>Doğruluk (A2+A3)</td><td>{yuzde(d7.dogruluk)}</td><td>{yuzde(d30.dogruluk)}</td></tr>
            <tr><td>Kontrol sorusu</td><td>{d7.kontrolSoru}</td><td>{d30.kontrolSoru}</td></tr>
            <tr><td>Kontrol başarısı</td><td>{yuzde(d7.kontrolBasari)}</td><td>{yuzde(d30.kontrolBasari)}</td></tr>
            <tr><td>Odak süresi</td><td>{d7.odakDk} dk</td><td>{d30.odakDk} dk</td></tr>
          </tbody>
        </table>
      </Kart>

      <Kart baslik="Ders bazlı" className="kart-sifir">
        <div className="tablo-kaydir">
          <table className="tablo">
            <thead><tr><th>Ders</th><th>Kapanan</th><th className="gizle-dar">İlerleme</th><th>Soru</th><th>Kontrol</th></tr></thead>
            <tbody>
              {dersler.map((d) => (
                <tr key={d.ders}>
                  <td>{d.ders}</td>
                  <td>{d.kapanan}/{d.konu}</td>
                  <td className="gizle-dar" style={{ minWidth: 90 }}><Cubuk deger={d.kapanan / d.konu} etiket={`${d.ders} ilerleme`} /></td>
                  <td>{d.cozulen}</td>
                  <td><span className={d.kontrolBasari !== null && d.kontrolBasari < KAPANMA_ORANI ? "azalis" : ""}>{yuzde(d.kontrolBasari)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kart>
    </div>
  );
}
