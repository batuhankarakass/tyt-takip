import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { BOS_VERI, VARSAYILAN_AYARLAR, type Ayarlar, type Deneme, type Kayit, type Odak, type Veri } from "./types";

// Veri iki yerde durabilir: misafir modunda sadece bu cihazda (localStorage), hesapla girildiğinde
// Supabase'de. Her iki depo da aynı arayüzü uygular; uygulama hangisinde olduğunu bilmez.

export type Tur = "kayit" | "deneme" | "odak";
export type Satir = Kayit | Deneme | Odak;

export interface Depo {
  ad: "yerel" | "bulut";
  yukle(): Promise<Veri>;
  kaydet(tur: Tur, satir: Satir): Promise<void>;
  sil(tur: Tur, id: string): Promise<void>;
  ayarKaydet(a: Ayarlar): Promise<void>;
  topluYaz(v: Veri): Promise<void>;
}

const ANAHTAR = "tyt-takip:veri:v1";

export function yerelOku(): Veri {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return BOS_VERI;
    const v = JSON.parse(ham) as Partial<Veri>;
    return {
      kayitlar: v.kayitlar ?? [],
      denemeler: v.denemeler ?? [],
      odaklar: v.odaklar ?? [],
      ayarlar: { ...VARSAYILAN_AYARLAR, ...v.ayarlar },
    };
  } catch {
    return BOS_VERI;
  }
}

function yerelYaz(v: Veri) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(v));
  } catch {
    // Gizli sekme veya dolu depolama: veri bu oturumda bellekte kalır.
  }
}

let ornekUret: () => Pick<Veri, "kayitlar" | "denemeler" | "odaklar"> = () => ({ kayitlar: [], denemeler: [], odaklar: [] });
export const ornekKaynagiAyarla = (f: typeof ornekUret) => (ornekUret = f);

function ornekGosterildi() {
  try {
    if (localStorage.getItem("tyt-takip:ornek")) return true;
    localStorage.setItem("tyt-takip:ornek", "1");
  } catch {
    /* depolama kapalı */
  }
  return false;
}

const listeAdi = { kayit: "kayitlar", deneme: "denemeler", odak: "odaklar" } as const;

export function yerelDepo(): Depo {
  let v = yerelOku();
  // Tek dosyalık önizleme sürümü ilk açılışta boş görünmesin diye örnek verilerle başlar.
  if (import.meta.env.MODE === "tek" && !v.kayitlar.length && !v.denemeler.length && !ornekGosterildi()) {
    v = { ...v, ...ornekUret() };
    yerelYaz(v);
  }
  return {
    ad: "yerel",
    async yukle() {
      v = yerelOku();
      return v;
    },
    async kaydet(tur, satir) {
      const ad = listeAdi[tur];
      const liste = v[ad] as Satir[];
      const i = liste.findIndex((x) => x.id === satir.id);
      v = { ...v, [ad]: i >= 0 ? liste.map((x) => (x.id === satir.id ? satir : x)) : [...liste, satir] };
      yerelYaz(v);
    },
    async sil(tur, id) {
      const ad = listeAdi[tur];
      v = { ...v, [ad]: (v[ad] as Satir[]).filter((x) => x.id !== id) };
      yerelYaz(v);
    },
    async ayarKaydet(a) {
      v = { ...v, ayarlar: a };
      yerelYaz(v);
    },
    async topluYaz(yeni) {
      v = yeni;
      yerelYaz(v);
    },
  };
}

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = URL_ && ANON ? createClient(URL_, ANON) : null;

const TABLO = "tyt_veri";

export function bulutDepo(sb: SupabaseClient, user: User): Depo {
  const satirYap = (tur: Tur | "ayarlar", id: string, veri: unknown) => ({
    user_id: user.id,
    id,
    tur,
    veri,
    guncelleme: new Date().toISOString(),
  });
  const hata = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };
  return {
    ad: "bulut",
    async yukle() {
      const v: Veri = { kayitlar: [], denemeler: [], odaklar: [], ayarlar: VARSAYILAN_AYARLAR };
      // Supabase tek seferde en fazla 1000 satır döndürür; sayfalayarak hepsini al.
      for (let bas = 0; ; bas += 1000) {
        const { data, error } = await sb.from(TABLO).select("tur, veri").range(bas, bas + 999);
        hata(error);
        for (const r of data ?? []) {
          if (r.tur === "ayarlar") v.ayarlar = { ...VARSAYILAN_AYARLAR, ...r.veri };
          else if (r.tur in listeAdi) (v[listeAdi[r.tur as Tur]] as Satir[]).push(r.veri);
        }
        if (!data || data.length < 1000) break;
      }
      return v;
    },
    async kaydet(tur, satir) {
      const { error } = await sb.from(TABLO).upsert(satirYap(tur, satir.id, satir));
      hata(error);
    },
    async sil(_tur, id) {
      const { error } = await sb.from(TABLO).delete().eq("id", id).eq("user_id", user.id);
      hata(error);
    },
    async ayarKaydet(a) {
      const { error } = await sb.from(TABLO).upsert(satirYap("ayarlar", "ayarlar", a));
      hata(error);
    },
    async topluYaz(v) {
      const satirlar = [
        ...v.kayitlar.map((x) => satirYap("kayit", x.id, x)),
        ...v.denemeler.map((x) => satirYap("deneme", x.id, x)),
        ...v.odaklar.map((x) => satirYap("odak", x.id, x)),
        satirYap("ayarlar", "ayarlar", v.ayarlar),
      ];
      for (let i = 0; i < satirlar.length; i += 500) {
        const { error } = await sb.from(TABLO).upsert(satirlar.slice(i, i + 500));
        hata(error);
      }
    },
  };
}

export const yeniId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
