import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useVeri } from "./durum";

// Pomodoro sayacı uygulama genelinde çalışır: sekme değişse ya da sayfa yenilense de bitiş anı
// localStorage'da tutulduğu için kaldığı yerden devam eder.

export type SayacMod = "calisma" | "mola";

interface Durum {
  mod: SayacMod;
  bitis: number | null; // çalışıyorsa bitiş zamanı (ms)
  kalanMs: number; // duraklatılmışsa kalan süre
  ders?: string;
  konu?: string;
  turSayisi: number;
}

interface Sayac extends Durum {
  kalan: number; // ms
  toplamMs: number;
  calisiyor: boolean;
  baslat: () => void;
  duraklat: () => void;
  sifirla: (mod?: SayacMod) => void;
  bitirKaydet: () => Promise<number>;
  konuSec: (ders?: string, konu?: string) => void;
}

const ANAHTAR = "tyt-takip:sayac:v1";
const Ctx = createContext<Sayac | null>(null);

function oku(): Durum | null {
  try {
    const h = localStorage.getItem(ANAHTAR);
    return h ? (JSON.parse(h) as Durum) : null;
  } catch {
    return null;
  }
}

function yaz(d: Durum) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(d));
  } catch {
    /* depolama kapalı: sayaç bu oturumda çalışır */
  }
}

function zil() {
  try {
    const ac = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t);
      o.stop(ac.currentTime + t + 0.32);
    });
  } catch {
    /* ses desteklenmiyor */
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* titreşim yok */
  }
}

function bildirimGoster(baslik: string, govde: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(baslik, { body: govde, icon: "icon-192.png" });
  } catch {
    /* bildirim yok */
  }
}

export function SayacSaglayici({ children }: { children: ReactNode }) {
  const { veri, odakEkle, bildir } = useVeri();
  const { calismaDk, molaDk } = veri.ayarlar;
  const sureMs = useCallback((m: SayacMod) => (m === "calisma" ? calismaDk : molaDk) * 60000, [calismaDk, molaDk]);
  const [d, setD] = useState<Durum>(() => oku() ?? { mod: "calisma", bitis: null, kalanMs: calismaDk * 60000, turSayisi: 0 });
  const [simdi, setSimdi] = useState(Date.now());
  const dRef = useRef(d);
  dRef.current = d;

  const guncelle = useCallback((y: Durum) => {
    dRef.current = y;
    setD(y);
    yaz(y);
  }, []);

  // Ayarlarda süre değişince, duran sayacı yeni süreye çek (ilk açılışta duraklatılmış turu bozma).
  const oncekiSure = useRef(sureMs);
  useEffect(() => {
    if (oncekiSure.current === sureMs) return;
    oncekiSure.current = sureMs;
    if (dRef.current.bitis === null) guncelle({ ...dRef.current, kalanMs: sureMs(dRef.current.mod) });
  }, [sureMs, guncelle]);

  const bitti = useCallback(async () => {
    const cur = dRef.current;
    if (cur.mod === "calisma") {
      guncelle({ ...cur, mod: "mola", bitis: Date.now() + sureMs("mola"), kalanMs: sureMs("mola"), turSayisi: cur.turSayisi + 1 });
      zil();
      bildirimGoster("Çalışma bitti", `${calismaDk} dk tamam. ${molaDk} dk mola.`);
      bildir(`${calismaDk} dk odak kaydedildi, mola başladı`);
      await odakEkle({ baslangic: new Date(Date.now() - sureMs("calisma")).toISOString(), dakika: calismaDk, ders: cur.ders, konu: cur.konu }).catch(() => {});
    } else {
      guncelle({ ...cur, mod: "calisma", bitis: null, kalanMs: sureMs("calisma") });
      zil();
      bildirimGoster("Mola bitti", "Hazır olunca yeni turu başlat.");
      bildir("Mola bitti");
    }
  }, [guncelle, sureMs, calismaDk, molaDk, odakEkle, bildir]);

  useEffect(() => {
    if (d.bitis === null) return;
    const t = window.setInterval(() => {
      const n = Date.now();
      setSimdi(n);
      if (dRef.current.bitis !== null && n >= dRef.current.bitis) bitti();
    }, 250);
    return () => window.clearInterval(t);
  }, [d.bitis, bitti]);

  const kalan = d.bitis !== null ? Math.max(0, d.bitis - simdi) : d.kalanMs;

  const deger: Sayac = {
    ...d,
    kalan,
    toplamMs: sureMs(d.mod),
    calisiyor: d.bitis !== null,
    baslat: () => {
      if (d.bitis !== null) return;
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
      const k = d.kalanMs > 0 ? d.kalanMs : sureMs(d.mod);
      setSimdi(Date.now());
      guncelle({ ...d, bitis: Date.now() + k, kalanMs: k });
    },
    duraklat: () => {
      if (d.bitis === null) return;
      guncelle({ ...d, bitis: null, kalanMs: Math.max(0, d.bitis - Date.now()) });
    },
    sifirla: (mod = d.mod) => guncelle({ ...d, mod, bitis: null, kalanMs: sureMs(mod) }),
    bitirKaydet: async () => {
      // Çalışma turunu erken bitir: geçen süreyi kaydet.
      if (d.mod !== "calisma") return 0;
      const gecenMs = sureMs("calisma") - kalan;
      const dk = Math.floor(gecenMs / 60000);
      guncelle({ ...d, bitis: null, kalanMs: sureMs("calisma") });
      if (dk >= 1) await odakEkle({ baslangic: new Date(Date.now() - gecenMs).toISOString(), dakika: dk, ders: d.ders, konu: d.konu }).catch(() => {});
      return dk;
    },
    konuSec: (ders, konu) => guncelle({ ...dRef.current, ders, konu }),
  };

  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
}

export function useSayac() {
  const s = useContext(Ctx);
  if (!s) throw new Error("SayacSaglayici yok");
  return s;
}

export const dakikaSaniye = (ms: number) => {
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
