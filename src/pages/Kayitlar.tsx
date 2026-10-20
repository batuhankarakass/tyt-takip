import { useMemo, useState } from "react";
import { DERSLER } from "../data/mufredat";
import { AsamaRozet, Bos, Ikon, Kart, OnayDugme } from "../components/ui";
import { useVeri } from "../lib/durum";
import { useGezinti } from "../lib/gezinti";
import { yuzde } from "../lib/hesap";
import { uzunTarih } from "../lib/tarih";

export function Kayitlar() {
  const { veri, kayitSil, bildir } = useVeri();
  const { kayitAc } = useGezinti();
  const [ders, setDers] = useState("");
  const [ara, setAra] = useState("");
  const [sadeceNot, setSadeceNot] = useState(false);
  const [goster, setGoster] = useState(60);

  const filtreli = useMemo(() => {
    const q = ara.toLocaleLowerCase("tr").trim();
    return [...veri.kayitlar]
      .filter((k) => (!ders || k.ders === ders) && (!sadeceNot || k.not.trim()) && (!q || `${k.konu} ${k.not} ${k.ders}`.toLocaleLowerCase("tr").includes(q)))
      .sort((a, b) => (a.tarih === b.tarih ? b.olusturma.localeCompare(a.olusturma) : b.tarih.localeCompare(a.tarih)));
  }, [veri.kayitlar, ders, ara, sadeceNot]);

  const gruplar = useMemo(() => {
    const m = new Map<string, typeof filtreli>();
    for (const k of filtreli.slice(0, goster)) {
      if (!m.has(k.tarih)) m.set(k.tarih, []);
      m.get(k.tarih)!.push(k);
    }
    return [...m.entries()];
  }, [filtreli, goster]);

  const sil = async (id: string) => {
    await kayitSil(id).catch(() => {});
    bildir("Kayıt silindi");
  };

  return (
    <div className="sayfa">
      <div className="sayfa-baslik">
        <h1>Günlük Kayıt</h1>
        <button className="dugme dugme-ana" onClick={() => kayitAc()}><Ikon ad="kayit" boyut={18} /> Ekle</button>
      </div>
      <div className="filtre-satir">
        <select value={ders} onChange={(e) => setDers(e.target.value)} aria-label="Ders filtresi">
          <option value="">Tüm dersler</option>
          {DERSLER.map((d) => <option key={d}>{d}</option>)}
        </select>
        <input type="search" value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Konu veya not ara" aria-label="Ara" />
        <label className="onay">
          <input type="checkbox" checked={sadeceNot} onChange={(e) => setSadeceNot(e.target.checked)} />
          Sadece takıldıklarım
        </label>
      </div>
      {sadeceNot && <p className="soluk kucuk">Ayrı yanlış defteri tutma: takıldığın her şey burada. Tekrar etmeden önce bu listeye bak.</p>}

      {filtreli.length === 0 ? (
        <Kart><Bos ikon="liste" baslik={veri.kayitlar.length ? "Eşleşen kayıt yok" : "Henüz kayıt yok"} /></Kart>
      ) : (
        gruplar.map(([tarih, ks]) => (
          <Kart key={tarih} baslik={uzunTarih(tarih)} sag={<span className="soluk kucuk">{ks.reduce((t, k) => t + k.cozulen, 0)} soru</span>}>
            <ul className="kayit-liste">
              {ks.map((k) => (
                <li key={k.id}>
                  <AsamaRozet asama={k.asama} />
                  <div className="kayit-orta">
                    <strong>{k.konu}</strong>
                    <span className="soluk">{k.ders}{k.sureDk ? ` · ${k.sureDk} dk` : ""}</span>
                    {k.not && <span className="kayit-not">“{k.not}”</span>}
                  </div>
                  <div className="kayit-sag">
                    <strong>{k.dogru}/{k.cozulen}</strong>
                    <span className="soluk">{k.asama === 1 ? "ısınma" : yuzde(k.dogru / k.cozulen)}</span>
                  </div>
                  <div className="kayit-islem">
                    <button className="ikon-dugme" onClick={() => kayitAc(k)} aria-label="Düzenle"><Ikon ad="kalem" boyut={16} /></button>
                    <OnayDugme className="ikon-dugme" ikon="cop" etiket={`${k.konu} kaydını sil`} soru="Silinsin mi?" evet="Sil" onay={() => sil(k.id)} />
                  </div>
                </li>
              ))}
            </ul>
          </Kart>
        ))
      )}
      {filtreli.length > goster && (
        <button className="dugme genis" onClick={() => setGoster((g) => g + 60)}>Daha fazla göster ({filtreli.length - goster})</button>
      )}
    </div>
  );
}
