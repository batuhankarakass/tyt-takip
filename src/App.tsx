import { useCallback, useEffect, useMemo, useState } from "react";
import { KayitFormu, type KayitTaslak } from "./components/KayitFormu";
import { Ikon, Panel, type IkonAd } from "./components/ui";
import { supabase } from "./lib/depo";
import { useVeri } from "./lib/durum";
import { GezintiCtx, type Gezinti, type SekmeAd } from "./lib/gezinti";
import { dakikaSaniye, SayacSaglayici, useSayac } from "./lib/sayac";
import { Analiz } from "./pages/Analiz";
import { Ayarlar } from "./pages/Ayarlar";
import { Bugun } from "./pages/Bugun";
import { Denemeler } from "./pages/Denemeler";
import { Giris } from "./pages/Giris";
import { Hosgeldin, TasimaAl } from "./pages/Hosgeldin";
import { gelenKod } from "./lib/tasima";
import { Kayitlar } from "./pages/Kayitlar";
import { Konular } from "./pages/Konular";
import { Sayac } from "./pages/Sayac";

const SEKMELER: { ad: SekmeAd; etiket: string; ikon: IkonAd }[] = [
  { ad: "bugun", etiket: "Bugün", ikon: "bugun" },
  { ad: "kayitlar", etiket: "Kayıtlar", ikon: "liste" },
  { ad: "konular", etiket: "Konular", ikon: "konu" },
  { ad: "deneme", etiket: "Deneme", ikon: "deneme" },
  { ad: "sayac", etiket: "Sayaç", ikon: "sayac" },
  { ad: "analiz", etiket: "Analiz", ikon: "analiz" },
];

const MISAFIR = "tyt-takip:misafir";
const misafirMi = () => {
  try {
    return localStorage.getItem(MISAFIR) === "1";
  } catch {
    return false;
  }
};

function hashSekme(): SekmeAd {
  const h = window.location.hash.slice(1) as SekmeAd;
  return [...SEKMELER.map((s) => s.ad), "ayarlar"].includes(h) ? h : "bugun";
}

export default function App() {
  const { oturum, yukleniyor, depo, aktifProfil } = useVeri();
  const [misafir, setMisafir] = useState(misafirMi);
  const [girisZorla, setGirisZorla] = useState(false);
  const [kod, setKod] = useState(gelenKod);

  if (kod) return <TasimaAl kod={kod} bitti={() => setKod(null)} />;

  const girisGoster = !!supabase && !oturum && (!misafir || girisZorla);
  if (girisGoster)
    return (
      <Giris
        misafir={() => {
          try {
            localStorage.setItem(MISAFIR, "1");
          } catch {
            /* depolama kapalı */
          }
          setMisafir(true);
          setGirisZorla(false);
        }}
      />
    );
  if (yukleniyor)
    return (
      <div className="yukleniyor">
        <div className="logo-buyuk">TYT<span>takip</span></div>
        <p className="soluk">Yükleniyor…</p>
      </div>
    );
  if (depo === "yerel" && !aktifProfil) return <Hosgeldin />;
  return (
    <SayacSaglayici>
      <Kabuk girisAc={() => setGirisZorla(true)} />
    </SayacSaglayici>
  );
}

function Kabuk({ girisAc }: { girisAc: () => void }) {
  const { hata, hataTemizle, bildirim, isim } = useVeri();
  const sayac = useSayac();
  const [sekme, setSekme] = useState<SekmeAd>(hashSekme);
  const [taslak, setTaslak] = useState<KayitTaslak | null>(null);

  useEffect(() => {
    const f = () => setSekme(hashSekme());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);

  const git = useCallback((s: SekmeAd) => {
    if (window.location.hash.slice(1) !== s) window.location.hash = s;
    setSekme(s);
    window.scrollTo({ top: 0 });
  }, []);

  const { konuSec } = sayac;
  const gezinti = useMemo<Gezinti>(
    () => ({
      sekme,
      git,
      kayitAc: (t) => setTaslak(t ?? {}),
      sayacAc: (ders, konu) => {
        if (ders) konuSec(ders, konu);
        git("sayac");
      },
    }),
    [sekme, git, konuSec],
  );

  const kapat = useCallback(() => setTaslak(null), []);

  return (
    <GezintiCtx.Provider value={gezinti}>
      <div className="kabuk">
        <header className="ust-cubuk">
          <button className="logo" onClick={() => git("bugun")}>TYT<span>takip</span></button>
          <div className="ust-sag">
            {sayac.calisiyor && sekme !== "sayac" && (
              <button className={`mini-sayac ${sayac.mod}`} onClick={() => git("sayac")}>
                <Ikon ad="sayac" boyut={16} /> {dakikaSaniye(sayac.kalan)}
              </button>
            )}
            {isim && (
              <button className="profil-cip" onClick={() => git("ayarlar")} aria-label={`Profil: ${isim}`} title={isim}>
                {isim.slice(0, 1).toLocaleUpperCase("tr")}
              </button>
            )}
            <button className={`ikon-dugme ${sekme === "ayarlar" ? "secili" : ""}`} onClick={() => git("ayarlar")} aria-label="Ayarlar">
              <Ikon ad="ayar" />
            </button>
          </div>
        </header>
        <nav className="yan-menu" aria-label="Ana menü">
          {SEKMELER.map((s) => (
            <button key={s.ad} className={sekme === s.ad ? "secili" : ""} onClick={() => git(s.ad)} aria-current={sekme === s.ad ? "page" : undefined}>
              <Ikon ad={s.ikon} />
              <span>{s.etiket}</span>
            </button>
          ))}
          <button className="yan-ekle dugme dugme-ana" onClick={() => setTaslak({})}>
            <Ikon ad="kayit" boyut={18} /> Kayıt ekle
          </button>
        </nav>
        <main>
          {hata && (
            <div className="hata-serit" role="alert">
              <Ikon ad="uyari" boyut={18} /> <span>{hata}</span>
              <button className="ikon-dugme" onClick={hataTemizle} aria-label="Kapat">
                <Ikon ad="kapat" boyut={16} />
              </button>
            </div>
          )}
          {sekme === "bugun" && <Bugun />}
          {sekme === "kayitlar" && <Kayitlar />}
          {sekme === "konular" && <Konular />}
          {sekme === "deneme" && <Denemeler />}
          {sekme === "sayac" && <Sayac />}
          {sekme === "analiz" && <Analiz />}
          {sekme === "ayarlar" && <Ayarlar girisAc={girisAc} />}
        </main>
        {(sekme === "kayitlar" || sekme === "konular" || sekme === "analiz") && (
          <button className="yuzen-ekle" onClick={() => setTaslak({})} aria-label="Kayıt ekle">
            <Ikon ad="kayit" boyut={26} />
          </button>
        )}
        <Panel acik={taslak !== null} kapat={kapat} baslik={taslak?.id ? "Kaydı düzenle" : "Yeni kayıt"}>
          {taslak !== null && <KayitFormu key={taslak.id ?? JSON.stringify(taslak)} taslak={taslak} bitti={kapat} />}
        </Panel>
        {bildirim && (
          <div className="bildirim" role="status">
            {bildirim}
          </div>
        )}
      </div>
    </GezintiCtx.Provider>
  );
}
