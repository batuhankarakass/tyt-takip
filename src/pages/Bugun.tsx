import { Cubuk } from "../components/Grafik";
import { AsamaRozet, Bos, Ikon, Kart, Stat, type IkonAd } from "../components/ui";
import { useVeri } from "../lib/durum";
import { useGezinti } from "../lib/gezinti";
import { donemOzeti, haftalikKontrol, oneriler, seri, yuzde, type OneriTur } from "../lib/hesap";
import { bugun, gunEkle, gunFarki, gunAdi, uzunTarih } from "../lib/tarih";

const turIkon: Record<OneriTur, IkonAd> = { seri: "ates", gecis: "ok", tekrar: "sifirla", kontrol: "ok", yeni: "kayit", zayif: "uyari", hatirlat: "sifirla" };

export function Bugun() {
  const { veri, ozetler, isim } = useVeri();
  const { kayitAc, git, sayacAc } = useGezinti();
  const b = bugun();
  const s = seri(veri.kayitlar, b);
  const bugunKayit = veri.kayitlar.filter((k) => k.tarih === b);
  const bugunSoru = bugunKayit.reduce((t, k) => t + k.cozulen, 0);
  const hedef = veri.ayarlar.gunlukHedef;
  const hafta = donemOzeti(veri.kayitlar, veri.odaklar, b, 7);
  const hk = haftalikKontrol(veri.kayitlar, ozetler, b);
  const liste = oneriler(ozetler, veri.kayitlar, b, veri.ayarlar).slice(0, 5);
  const kapanan = ozetler.filter((z) => z.durum === "Kapandı").length;
  const kalanGun = veri.ayarlar.sinavTarihi ? gunFarki(veri.ayarlar.sinavTarihi, b) : null;
  const son7 = Array.from({ length: 7 }, (_, i) => gunEkle(b, i - 6));
  const calisilan = new Set(veri.kayitlar.map((k) => k.tarih));

  if (veri.kayitlar.length === 0) {
    return (
      <div className="sayfa">
        {isim && <h1 className="selam">Merhaba, {isim}</h1>}
        <Kart>
          <Bos ikon="kayit" baslik="İlk kaydını gir">
            <p>Çalışmayı bitirince tek satır ekle: ders, konu, aşama, çözülen, doğru ve neyde takıldığın. Gerisini uygulama hesaplar.</p>
            <div className="dugme-grup">
              <button className="dugme dugme-ana" onClick={() => kayitAc()}>Kayıt ekle</button>
              <button className="dugme" onClick={() => git("ayarlar")}>Excel'den aktar / örnek veri</button>
            </div>
          </Bos>
        </Kart>
        <SistemKart />
      </div>
    );
  }

  return (
    <div className="sayfa">
      {import.meta.env.MODE === "tek" && (
        <p className="uyari-metin">Önizleme örnek verilerle açıldı. Kendi verinle başlamak için Ayarlar → Tüm verileri sil.</p>
      )}
      <div className="ust-ozet">
        {isim && <h1 className="selam">Merhaba, {isim}</h1>}
        <div className="gun-baslik">
          <span className="soluk">{uzunTarih(b)}</span>
          {kalanGun !== null && kalanGun >= 0 && <span className="sinav-sayac">Sınava {kalanGun} gün</span>}
        </div>
        <div className="bugun-hedef">
          <div>
            <div className="buyuk-sayi">{bugunSoru}<span className="soluk"> / {hedef}</span></div>
            <div className="soluk">bugün çözülen soru</div>
          </div>
          <div className="seri-kutu" title={`En uzun seri: ${s.enUzun} gün`}>
            <Ikon ad="ates" boyut={22} className={s.bugunVar ? "ates-aktif" : "ates-pasif"} />
            <div>
              <strong>{s.gun} gün</strong>
              <div className="soluk kucuk">seri</div>
            </div>
          </div>
        </div>
        <Cubuk deger={bugunSoru / hedef} etiket="Günlük hedef" />
        <div className="hafta-noktalar" aria-label="Son 7 gün">
          {son7.map((g) => (
            <div key={g} className={`hafta-nokta ${calisilan.has(g) ? "dolu" : ""} ${g === b ? "bugun" : ""}`}>
              <span />
              <small>{gunAdi(g)}</small>
            </div>
          ))}
        </div>
        <div className="dugme-grup">
          <button className="dugme dugme-ana" onClick={() => kayitAc()}><Ikon ad="kayit" boyut={18} /> Kayıt ekle</button>
          <button className="dugme" onClick={() => sayacAc()}><Ikon ad="sayac" boyut={18} /> Sayacı başlat</button>
        </div>
      </div>

      <Kart baslik="Bugün ne yapmalı?" sag={<Ikon ad="ampul" className="soluk" />}>
        {liste.length === 0 ? (
          <p className="soluk">Şu an öneri yok. Devam eden konun yoksa yeni bir konuya Aşama 1 ile başla.</p>
        ) : (
          <ul className="oneri-liste">
            {liste.map((o, i) => (
              <li key={i} className={`oneri oneri-${o.tur}`}>
                <Ikon ad={turIkon[o.tur]} boyut={18} />
                <div className="oneri-metin">
                  <strong>{o.baslik}</strong>
                  <span>{o.detay}</span>
                </div>
                {o.konu && (
                  <button className="dugme dugme-kucuk" onClick={() => kayitAc({ ders: o.ders, konu: o.konu, asama: o.asama })} aria-label={`${o.konu} için kayıt ekle`}>
                    {o.asama && <AsamaRozet asama={o.asama} />} Kaydet
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Kart>

      <Kart baslik="Son 7 gün" sag={<button className="dugme-metin" onClick={() => git("analiz")}>Analiz <Ikon ad="ok" boyut={14} /></button>}>
        <div className="stat-izgara">
          <Stat etiket="Çalışılan gün" deger={`${hafta.gunSayisi}/7`} />
          <Stat etiket="Çözülen soru" deger={hafta.cozulen} />
          <Stat etiket="Doğruluk" deger={yuzde(hafta.dogruluk)} alt="A2+A3" />
          <Stat etiket="Kapanan konu" deger={hk.kapananBuHafta} alt={`toplam ${kapanan}`} />
        </div>
      </Kart>

      {bugunKayit.length > 0 && (
        <Kart baslik="Bugünün kayıtları">
          <ul className="kayit-liste">
            {bugunKayit.map((k) => (
              <li key={k.id} onClick={() => kayitAc(k)}>
                <AsamaRozet asama={k.asama} />
                <div className="kayit-orta">
                  <strong>{k.konu}</strong>
                  <span className="soluk">{k.ders}{k.not && ` · ${k.not}`}</span>
                </div>
                <div className="kayit-sag">
                  <strong>{k.dogru}/{k.cozulen}</strong>
                  <span className="soluk">{k.asama === 1 ? "ısınma" : yuzde(k.dogru / k.cozulen)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}

export function SistemKart() {
  return (
    <Kart baslik="Sistem: her konu 3 aşamada geçilir">
      <ol className="sistem-liste">
        <li><AsamaRozet asama={1} /><div><strong>Isınma (~20 soru)</strong><span>Takıldığın anda çözüme bak. Amaç öğrenmek, doğru sayısı değil.</span></div></li>
        <li><AsamaRozet asama={2} /><div><strong>Pekiştirme (~30-40 soru)</strong><span>Çözüme bakmak yok. Takılırsan işaretle, geç, testin sonunda bak.</span></div></li>
        <li><AsamaRozet asama={3} /><div><strong>Kontrol (en az 20 soru, süreli, karma)</strong><span>Başarı %70 ve üzeriyse konu KAPANIR. Altındaysa Aşama 2'ye dön.</span></div></li>
      </ol>
      <p className="soluk kucuk">Konu başına ~70-80 soru eder. Belirleyici olan soru sayısı değil, Aşama 3'teki başarı.</p>
    </Kart>
  );
}
