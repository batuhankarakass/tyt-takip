import { useMemo, useState } from "react";
import { DERSLER, KAPANMA_ORANI, KONTROL_MIN_SORU } from "../data/mufredat";
import { Cubuk } from "../components/Grafik";
import { AsamaRozet, DurumRozet, Kart, Panel, Sekmeler } from "../components/ui";
import { useVeri } from "../lib/durum";
import { useGezinti } from "../lib/gezinti";
import { dersOzetleri, oran, yuzde } from "../lib/hesap";
import { kisaTarih } from "../lib/tarih";
import type { KonuDurum, KonuOzet } from "../lib/types";

type Filtre = "hepsi" | KonuDurum;

export function Konular() {
  const { ozetler, veri } = useVeri();
  const [ders, setDers] = useState(DERSLER[0]);
  const [filtre, setFiltre] = useState<Filtre>("hepsi");
  const [secili, setSecili] = useState<KonuOzet | null>(null);
  const dersler = dersOzetleri(ozetler);
  const toplamKapanan = dersler.reduce((t, d) => t + d.kapanan, 0);
  const toplamKonu = dersler.reduce((t, d) => t + d.konu, 0);
  const liste = useMemo(() => ozetler.filter((z) => z.ders === ders && (filtre === "hepsi" || z.durum === filtre)), [ozetler, ders, filtre]);
  const d = dersler.find((x) => x.ders === ders);

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Konu Takip</h1>
        <span className="soluk">{toplamKapanan}/{toplamKonu} kapandı · {yuzde(oran(toplamKapanan, toplamKonu))}</span>
      </div>

      <div className="ders-seritleri" role="tablist" aria-label="Ders">
        {dersler.map((x) => (
          <button key={x.ders} role="tab" aria-selected={x.ders === ders} className={x.ders === ders ? "secili" : ""} onClick={() => setDers(x.ders)}>
            <span>{x.ders}</span>
            <small>{x.kapanan}/{x.konu}</small>
            <Cubuk deger={x.kapanan / x.konu} etiket={`${x.ders} tamamlanma`} />
          </button>
        ))}
      </div>

      {d && (
        <div className="stat-satir">
          <span><strong>{d.kapanan}</strong> kapandı</span>
          <span><strong>{d.devam}</strong> devam</span>
          <span><strong>{d.konu - d.kapanan - d.devam}</strong> başlanmadı</span>
          <span><strong>{d.cozulen}</strong> soru</span>
          <span>kontrol <strong>{yuzde(d.kontrolBasari)}</strong></span>
        </div>
      )}

      <Sekmeler<Filtre>
        deger={filtre}
        degistir={setFiltre}
        secenekler={[{ deger: "hepsi", ad: "Hepsi" }, { deger: "Devam", ad: "Devam" }, { deger: "Kapandı", ad: "Kapandı" }, { deger: "Başlanmadı", ad: "Başlanmadı" }]}
      />

      <Kart className="kart-sifir">
        <ul className="konu-liste">
          {liste.map((z) => (
            <li key={z.konu}>
              <button onClick={() => setSecili(z)}>
                <span className="konu-sira">{z.sira}</span>
                <div className="konu-orta">
                  <strong>{z.konu}</strong>
                  <AsamaIlerleme z={z} />
                </div>
                <div className="konu-sag">
                  <DurumRozet durum={z.durum} />
                  <span className="soluk kucuk">{z.toplamCozulen ? `${z.toplamCozulen} soru` : ""}{z.kontrolBasari !== null ? ` · ${yuzde(z.kontrolBasari)}` : ""}</span>
                </div>
              </button>
            </li>
          ))}
          {liste.length === 0 && <li className="soluk bos-satir">Bu filtrede konu yok.</li>}
        </ul>
      </Kart>

      <Panel acik={!!secili} kapat={() => setSecili(null)} baslik={secili?.konu ?? ""}>
        {secili && <KonuDetay z={ozetler.find((o) => o.ders === secili.ders && o.konu === secili.konu) ?? secili} kapat={() => setSecili(null)} kayitSayisi={veri.kayitlar.filter((k) => k.ders === secili.ders && k.konu === secili.konu).length} />}
      </Panel>
    </div>
  );
}

/** Her aşamanın hedefe göre doluluğu: A1 ~20, A2 ~30, A3 kapanınca dolu. */
function AsamaIlerleme({ z }: { z: KonuOzet }) {
  const a3 = z.durum === "Kapandı" ? 1 : Math.min(1, z.asamaCozulen[3] / KONTROL_MIN_SORU) * (z.kontrolBasari !== null && z.kontrolBasari < KAPANMA_ORANI ? 0.5 : 1);
  return (
    <div className="asama-ilerleme" aria-hidden>
      <span style={{ ["--d" as string]: Math.min(1, z.asamaCozulen[1] / 20) }} className="a1" />
      <span style={{ ["--d" as string]: Math.min(1, z.asamaCozulen[2] / 30) }} className="a2" />
      <span style={{ ["--d" as string]: a3 }} className="a3" />
    </div>
  );
}

function KonuDetay({ z, kapat, kayitSayisi }: { z: KonuOzet; kapat: () => void; kayitSayisi: number }) {
  const { kayitAc, sayacAc } = useGezinti();
  const ac = (asama: 1 | 2 | 3) => { kapat(); kayitAc({ ders: z.ders, konu: z.konu, asama }); };
  const satirlar = ([1, 2, 3] as const).map((a) => ({ a, c: z.asamaCozulen[a], d: z.asamaDogru[a] }));
  return (
    <div className="konu-detay">
      <div className="konu-detay-ust">
        <span className="soluk">{z.ders} · {z.sira}. konu</span>
        <DurumRozet durum={z.durum} />
      </div>
      <table className="tablo">
        <thead><tr><th>Aşama</th><th>Çözülen</th><th>Doğru</th><th>Doğruluk</th></tr></thead>
        <tbody>
          {satirlar.map((s) => (
            <tr key={s.a}>
              <td><AsamaRozet asama={s.a} /> {["Isınma", "Pekiştirme", "Kontrol"][s.a - 1]}</td>
              <td>{s.c}</td>
              <td>{s.d}</td>
              <td>{s.a === 1 ? <span className="soluk">—</span> : yuzde(oran(s.d, s.c))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="soluk kucuk">
        {z.durum === "Kapandı"
          ? `Kapandı${z.kapanmaTarihi ? `: ${kisaTarih(z.kapanmaTarihi)}` : ""}. Arada bir karma testle tazele.`
          : z.kontrolSoru >= KONTROL_MIN_SORU
            ? `Kontrol başarısı ${yuzde(z.kontrolBasari)}, %70 gerekiyor. Aşama 2'ye dön, notlara bak.`
            : `Kapanması için Aşama 3'te en az ${KONTROL_MIN_SORU} soru ve %70 başarı gerekiyor (şu an ${z.kontrolSoru} soru).`}
        {kayitSayisi > 0 && ` ${kayitSayisi} kayıt.`}
      </p>
      <div className="dugme-grup">
        {([1, 2, 3] as const).map((a) => (
          <button key={a} className="dugme" onClick={() => ac(a)}><AsamaRozet asama={a} /> kaydı ekle</button>
        ))}
        <button className="dugme" onClick={() => { kapat(); sayacAc(z.ders, z.konu); }}>Sayaç</button>
      </div>
      {z.notlar.length > 0 && (
        <>
          <h3 className="ara-baslik">Takıldıkların</h3>
          <ul className="not-liste">
            {z.notlar.map((n, i) => (
              <li key={i}><AsamaRozet asama={n.asama} /> <span>{n.not}</span> <small className="soluk">{kisaTarih(n.tarih)}</small></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
