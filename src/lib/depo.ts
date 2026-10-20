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
  /** Ayarlar dışındaki tüm satırları siler (yedekten geri yükleme ve "tümünü sil" için). */
  temizle(): Promise<void>;
}

// Bir cihazda birden fazla profil (öğrenci) olabilir; her profilin verisi ayrı anahtarda durur.
export interface Profil {
  id: string;
  ad: string;
}

interface ProfilKaydi {
  aktif: string | null;
  liste: Profil[];
}

const PROFILLER = "tyt-takip:profiller:v1";
const ESKI_ANAHTAR = "tyt-takip:veri:v1";
const veriAnahtari = (id: string) => `tyt-takip:veri:v1:${id}`;

function profilleriYaz(k: ProfilKaydi) {
  try {
    localStorage.setItem(PROFILLER, JSON.stringify(k));
  } catch {
    /* depolama kapalı */
  }
}

export function profilleriOku(): ProfilKaydi {
  try {
    const h = localStorage.getItem(PROFILLER);
    if (h) return JSON.parse(h) as ProfilKaydi;
    // Profilsiz eski sürümün verisi varsa ilk profile taşı.
    const eski = localStorage.getItem(ESKI_ANAHTAR);
    if (eski) {
      const id = yeniId();
      localStorage.setItem(veriAnahtari(id), eski);
      localStorage.removeItem(ESKI_ANAHTAR);
      const k = { aktif: id, liste: [{ id, ad: "Profilim" }] };
      profilleriYaz(k);
      return k;
    }
  } catch {
    /* depolama kapalı */
  }
  return { aktif: null, liste: [] };
}

export function profilOlustur(ad: string, veri?: Veri): Profil {
  const k = profilleriOku();
  const p = { id: yeniId(), ad: ad.trim() };
  if (veri) yerelYaz(p.id, veri);
  profilleriYaz({ aktif: p.id, liste: [...k.liste, p] });
  return p;
}

export function profilSec(id: string) {
  const k = profilleriOku();
  if (k.liste.some((p) => p.id === id)) profilleriYaz({ ...k, aktif: id });
}

export function profilAdiDegistir(id: string, ad: string) {
  const k = profilleriOku();
  profilleriYaz({ ...k, liste: k.liste.map((p) => (p.id === id ? { ...p, ad: ad.trim() } : p)) });
}

export function profilSil(id: string) {
  const k = profilleriOku();
  const liste = k.liste.filter((p) => p.id !== id);
  try {
    localStorage.removeItem(veriAnahtari(id));
  } catch {
    /* depolama kapalı */
  }
  profilleriYaz({ aktif: k.aktif === id ? (liste[0]?.id ?? null) : k.aktif, liste });
}

export function yerelOku(id: string | null): Veri {
  if (!id) return BOS_VERI;
  try {
    const ham = localStorage.getItem(veriAnahtari(id));
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

function yerelYaz(id: string | null, v: Veri) {
  if (!id) return;
  try {
    localStorage.setItem(veriAnahtari(id), JSON.stringify(v));
  } catch {
    // Gizli sekme veya dolu depolama: veri bu oturumda bellekte kalır.
  }
}

const listeAdi = { kayit: "kayitlar", deneme: "denemeler", odak: "odaklar" } as const;

export function yerelDepo(id: string | null): Depo {
  let v = yerelOku(id);
  const yaz = () => yerelYaz(id, v);
  return {
    ad: "yerel",
    async yukle() {
      v = yerelOku(id);
      return v;
    },
    async kaydet(tur, satir) {
      const ad = listeAdi[tur];
      const liste = v[ad] as Satir[];
      const i = liste.findIndex((x) => x.id === satir.id);
      v = { ...v, [ad]: i >= 0 ? liste.map((x) => (x.id === satir.id ? satir : x)) : [...liste, satir] };
      yaz();
    },
    async sil(tur, id) {
      const ad = listeAdi[tur];
      v = { ...v, [ad]: (v[ad] as Satir[]).filter((x) => x.id !== id) };
      yaz();
    },
    async ayarKaydet(a) {
      v = { ...v, ayarlar: a };
      yaz();
    },
    async topluYaz(yeni) {
      v = yeni;
      yaz();
    },
    async temizle() {
      v = { ...v, kayitlar: [], denemeler: [], odaklar: [] };
      yaz();
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
    async temizle() {
      const { error } = await sb.from(TABLO).delete().eq("user_id", user.id).neq("tur", "ayarlar");
      hata(error);
    },
  };
}

export const yeniId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
