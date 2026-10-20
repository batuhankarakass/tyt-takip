import { useState } from "react";
import { TYT_TESTLERI, type TestKey } from "../data/mufredat";
import { Cizgi } from "../components/Grafik";
import { Bos, Ikon, Kart, OnayDugme, Panel, Sekmeler, Stat } from "../components/ui";
import { useVeri } from "../lib/durum";
import { denemeHatasi, denemeNet, net } from "../lib/hesap";
import { bugun, kisaTarih, uzunTarih } from "../lib/tarih";
import type { Deneme } from "../lib/types";

const n2 = (v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const TOPLAM_SORU = TYT_TESTLERI.reduce((t, x) => t + x.soru, 0);

export function Denemeler() {
  const { veri, denemeSil, bildir } = useVeri();
  const [form, setForm] = useState<Deneme | "yeni" | null>(null);
  const [grafikTest, setGrafikTest] = useState<"toplam" | TestKey>("toplam");
  const liste = [...veri.denemeler].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.olusturma.localeCompare(b.olusturma));
  const netler = liste.map(denemeNet);
  const son = netler[netler.length - 1];
  const onceki = netler[netler.length - 2];
  const son3 = netler.slice(-3);
  const ort3 = son3.length ? son3.reduce((a, b) => a + b, 0) / son3.length : null;
  const enIyi = netler.length ? Math.max(...netler) : null;

  const grafikVeri = liste.map((d, i) => ({
    etiket: kisaTarih(d.tarih),
    uzunEtiket: `${d.ad} · ${uzunTarih(d.tarih)}`,
    deger: grafikTest === "toplam" ? netler[i] : net(d.testler[grafikTest]),
  }));
  const ust = grafikTest === "toplam" ? TOPLAM_SORU : TYT_TESTLERI.find((t) => t.key === grafikTest)!.soru;

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Denemeler</h1>
        <button className="dugme dugme-ana" onClick={() => setForm("yeni")}><Ikon ad="kayit" boyut={18} /> Deneme ekle</button>
      </div>

      {liste.length === 0 ? (
        <Kart>
          <Bos ikon="deneme" baslik="Henüz deneme yok">
            <p>TYT denemelerini gir, netin otomatik hesaplansın (4 yanlış 1 doğruyu götürür) ve gelişimini gör.</p>
          </Bos>
        </Kart>
      ) : (
        <>
          <div className="stat-izgara">
            <Stat etiket="Son net" deger={n2(son)} alt={onceki !== undefined ? <Fark f={son - onceki} /> : "ilk deneme"} vurgu />
            <Stat etiket="Son 3 ortalama" deger={ort3 === null ? "—" : n2(ort3)} />
            <Stat etiket="En iyi" deger={enIyi === null ? "—" : n2(enIyi)} />
            <Stat etiket="Deneme sayısı" deger={liste.length} />
          </div>

          <Kart baslik="Net gelişimi">
            <Sekmeler<"toplam" | TestKey>
              deger={grafikTest}
              degistir={setGrafikTest}
              secenekler={[{ deger: "toplam", ad: "Toplam" }, ...TYT_TESTLERI.map((t) => ({ deger: t.key, ad: t.ad.split(" ")[0] }))]}
            />
            <Cizgi veri={grafikVeri} ad={grafikTest === "toplam" ? "Toplam net" : `${TYT_TESTLERI.find((t) => t.key === grafikTest)!.ad} neti`} bicim={(v) => n2(v)} sabitUst={ust} />
          </Kart>

          <Kart baslik="Tüm denemeler" className="kart-sifir">
            <div className="tablo-kaydir">
              <table className="tablo">
                <thead>
                  <tr>
                    <th>Deneme</th>
                    {TYT_TESTLERI.map((t) => <th key={t.key} title={t.ad}>{t.ad.split(" ")[0]}</th>)}
                    <th>Net</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...liste].reverse().map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.ad}</strong><br /><small className="soluk">{kisaTarih(d.tarih)}</small></td>
                      {TYT_TESTLERI.map((t) => (
                        <td key={t.key} title={`${d.testler[t.key].dogru} D · ${d.testler[t.key].yanlis} Y`}>{n2(net(d.testler[t.key]))}</td>
                      ))}
                      <td><strong>{n2(denemeNet(d))}</strong></td>
                      <td className="tablo-islem">
                        <button className="ikon-dugme" onClick={() => setForm(d)} aria-label="Düzenle"><Ikon ad="kalem" boyut={16} /></button>
                        <OnayDugme className="ikon-dugme" ikon="cop" etiket={`${d.ad} sil`} soru="Silinsin mi?" evet="Sil" onay={async () => { await denemeSil(d.id).catch(() => {}); bildir("Deneme silindi"); }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        </>
      )}

      <Panel acik={!!form} kapat={() => setForm(null)} baslik={form === "yeni" ? "Yeni deneme" : "Denemeyi düzenle"}>
        {form && <DenemeFormu d={form === "yeni" ? null : form} sira={liste.length + 1} bitti={() => setForm(null)} />}
      </Panel>
    </div>
  );
}

function Fark({ f }: { f: number }) {
  if (Math.abs(f) < 0.01) return <span className="soluk">öncekiyle aynı</span>;
  return (
    <span className={f > 0 ? "artis" : "azalis"}>
      <Ikon ad={f > 0 ? "yukari" : "asagi"} boyut={14} /> {n2(Math.abs(f))} net
    </span>
  );
}

function DenemeFormu({ d, sira, bitti }: { d: Deneme | null; sira: number; bitti: () => void }) {
  const { denemeKaydet, bildir } = useVeri();
  const [tarih, setTarih] = useState(d?.tarih ?? bugun());
  const [ad, setAd] = useState(d?.ad ?? `Deneme ${sira}`);
  const [testler, setTestler] = useState<Record<TestKey, { dogru: string; yanlis: string }>>(() =>
    Object.fromEntries(TYT_TESTLERI.map((t) => [t.key, { dogru: d ? String(d.testler[t.key].dogru) : "", yanlis: d ? String(d.testler[t.key].yanlis) : "" }])) as Record<TestKey, { dogru: string; yanlis: string }>,
  );
  const [not, setNot] = useState(d?.not ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const sayisal = Object.fromEntries(TYT_TESTLERI.map((t) => [t.key, { dogru: Number(testler[t.key].dogru || 0), yanlis: Number(testler[t.key].yanlis || 0) }])) as Deneme["testler"];
  const toplam = TYT_TESTLERI.reduce((s, t) => s + net(sayisal[t.key]), 0);

  const guncelle = (k: TestKey, alan: "dogru" | "yanlis", v: string) => setTestler((s) => ({ ...s, [k]: { ...s[k], [alan]: v.replace(/\D/g, "") } }));

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = denemeHatasi({ testler: sayisal });
    if (h) return setHata(h);
    if (!ad.trim()) return setHata("Deneme adı yaz");
    try {
      await denemeKaydet({ id: d?.id, olusturma: d?.olusturma, tarih, ad: ad.trim(), testler: sayisal, not: not.trim() });
      bildir(`Kaydedildi: ${n2(toplam)} net`);
      bitti();
    } catch { /* hata üstte gösterilir */ }
  };

  return (
    <form className="form" onSubmit={gonder} noValidate>
      <div className="form-ikili">
        <label>Tarih<input type="date" value={tarih} max={bugun()} onChange={(e) => setTarih(e.target.value)} /></label>
        <label>Ad / yayın<input value={ad} onChange={(e) => setAd(e.target.value)} /></label>
      </div>
      <table className="tablo deneme-giris">
        <thead><tr><th>Test</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th></tr></thead>
        <tbody>
          {TYT_TESTLERI.map((t) => {
            const s = sayisal[t.key];
            const bos = t.soru - s.dogru - s.yanlis;
            return (
              <tr key={t.key}>
                <td>{t.ad}<br /><small className="soluk">{t.soru} soru</small></td>
                <td><input inputMode="numeric" aria-label={`${t.ad} doğru`} value={testler[t.key].dogru} onChange={(e) => guncelle(t.key, "dogru", e.target.value)} /></td>
                <td><input inputMode="numeric" aria-label={`${t.ad} yanlış`} value={testler[t.key].yanlis} onChange={(e) => guncelle(t.key, "yanlis", e.target.value)} /></td>
                <td className={bos < 0 ? "hata-metin" : "soluk"}>{bos}</td>
                <td><strong>{n2(net(s))}</strong></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr><td colSpan={4}>Toplam net</td><td><strong>{n2(toplam)}</strong></td></tr></tfoot>
      </table>
      <label>Not<input value={not} onChange={(e) => setNot(e.target.value)} placeholder="ör. matematikte süre yetmedi" /></label>
      {hata && <p className="hata-metin" role="alert">{hata}</p>}
      <button className="dugme dugme-ana">{d ? "Güncelle" : "Kaydet"}</button>
      <p className="soluk kucuk">Net = doğru − yanlış ÷ 4.</p>
    </form>
  );
}
