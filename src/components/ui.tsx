import { useEffect, useState, type ReactNode } from "react";
import type { KonuDurum } from "../lib/types";

const yollar = {
  bugun: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  kayit: "M12 5v14M5 12h14",
  liste: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  konu: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  deneme: "M9 3h6M10 3v4.5L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 7.5V3",
  sayac: "M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  analiz: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  ayar: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  ates: "M12 22c4 0 7-2.7 7-6.5 0-3.8-3-6-4-9.5-1.5 2-2 3.5-2 5-1.5-1-2.5-3-2.5-5.5C7 7.5 5 11 5 15.5 5 19.3 8 22 12 22z",
  ok: "M9 6l6 6-6 6",
  geri: "M15 6l-6 6 6 6",
  kapat: "M6 6l12 12M18 6 6 18",
  cop: "M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3",
  kalem: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  oynat: "M7 4v16l13-8z",
  durdur: "M7 4h4v16H7zM13 4h4v16h-4z",
  sifirla: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  tik: "M5 12l5 5 9-10",
  uyari: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  yukari: "M7 14l5-5 5 5",
  asagi: "M7 10l5 5 5-5",
  ampul: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
  bulut: "M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z",
  cihaz: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
} as const;

export type IkonAd = keyof typeof yollar;

export function Ikon({ ad, boyut = 20, className }: { ad: IkonAd; boyut?: number; className?: string }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={yollar[ad]} />
    </svg>
  );
}

export function Kart({ baslik, sag, children, className = "" }: { baslik?: ReactNode; sag?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`kart ${className}`}>
      {(baslik || sag) && (
        <header className="kart-baslik">
          {baslik && <h2>{baslik}</h2>}
          {sag}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ etiket, deger, alt, vurgu }: { etiket: string; deger: ReactNode; alt?: ReactNode; vurgu?: boolean }) {
  return (
    <div className={`stat ${vurgu ? "stat-vurgu" : ""}`}>
      <div className="stat-etiket">{etiket}</div>
      <div className="stat-deger">{deger}</div>
      {alt && <div className="stat-alt">{alt}</div>}
    </div>
  );
}

const durumIkon: Record<KonuDurum, IkonAd | null> = { "Başlanmadı": null, Devam: "ok", Kapandı: "tik" };

export function DurumRozet({ durum }: { durum: KonuDurum }) {
  const ikon = durumIkon[durum];
  return (
    <span className={`rozet rozet-${durum === "Kapandı" ? "kapandi" : durum === "Devam" ? "devam" : "yok"}`}>
      {ikon && <Ikon ad={ikon} boyut={12} />}
      {durum}
    </span>
  );
}

export function AsamaRozet({ asama }: { asama: 1 | 2 | 3 }) {
  return <span className={`asama asama-${asama}`}>A{asama}</span>;
}

export function Panel({ acik, kapat, baslik, children }: { acik: boolean; kapat: () => void; baslik: string; children: ReactNode }) {
  useEffect(() => {
    if (!acik) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [acik, kapat]);
  if (!acik) return null;
  return (
    <div className="panel-arka" onClick={kapat}>
      <div className="panel" role="dialog" aria-modal="true" aria-label={baslik} onClick={(e) => e.stopPropagation()}>
        <header className="panel-baslik">
          <h2>{baslik}</h2>
          <button className="ikon-dugme" onClick={kapat} aria-label="Kapat">
            <Ikon ad="kapat" />
          </button>
        </header>
        <div className="panel-icerik">{children}</div>
      </div>
    </div>
  );
}

export function Bos({ ikon, baslik, children }: { ikon: IkonAd; baslik: string; children?: ReactNode }) {
  return (
    <div className="bos">
      <Ikon ad={ikon} boyut={28} />
      <h3>{baslik}</h3>
      {children}
    </div>
  );
}

export function Sekmeler<T extends string>({ secenekler, deger, degistir }: { secenekler: { deger: T; ad: string }[]; deger: T; degistir: (d: T) => void }) {
  return (
    <div className="sekmeler" role="tablist">
      {secenekler.map((s) => (
        <button key={s.deger} role="tab" aria-selected={deger === s.deger} className={deger === s.deger ? "secili" : ""} onClick={() => degistir(s.deger)}>
          {s.ad}
        </button>
      ))}
    </div>
  );
}

/** İki adımlı onay düğmesi: tarayıcı confirm() penceresi yerine sayfa içinde "Emin misin?" sorar. */
export function OnayDugme({ children, onay, soru = "Emin misin?", evet = "Evet", className = "dugme", etiket, ikon }: { children?: ReactNode; onay: () => void | Promise<void>; soru?: string; evet?: string; className?: string; etiket?: string; ikon?: IkonAd }) {
  const [acik, setAcik] = useState(false);
  useEffect(() => {
    if (!acik) return;
    const t = window.setTimeout(() => setAcik(false), 5000);
    return () => window.clearTimeout(t);
  }, [acik]);
  if (acik)
    return (
      <span className="onay-kutu" role="group" aria-label={soru}>
        <span className="onay-soru">{soru}</span>
        <button type="button" className="dugme dugme-kucuk dugme-tehlike" onClick={async () => { setAcik(false); await onay(); }}>{evet}</button>
        <button type="button" className="dugme dugme-kucuk" onClick={() => setAcik(false)}>Vazgeç</button>
      </span>
    );
  return (
    <button type="button" className={className} onClick={() => setAcik(true)} aria-label={etiket}>
      {ikon && <Ikon ad={ikon} boyut={16} />}
      {children}
    </button>
  );
}
