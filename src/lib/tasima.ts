import { VARSAYILAN_AYARLAR, type Veri } from "./types";

// Hesap olmadan bir profili başka cihaza taşımak için: profilin tüm verisi sıkıştırılıp
// bağlantının "?al=" parametresine yazılır. Veri hiçbir sunucuya gitmez, sadece bağlantının içindedir.

export interface Tasima {
  ad: string;
  veri: Veri;
}

const PARAMETRE = "al";

function base64url(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlCoz(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function akisUygula(veri: Uint8Array, donusum: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const akis = new Blob([veri as BlobPart]).stream().pipeThrough(donusum);
  return new Uint8Array(await new Response(akis).arrayBuffer());
}

export async function tasimaKodla(t: Tasima): Promise<string> {
  const json = JSON.stringify({ u: "tyt-takip", s: 1, ad: t.ad, k: t.veri.kayitlar, d: t.veri.denemeler, o: t.veri.odaklar, a: t.veri.ayarlar });
  return base64url(await akisUygula(new TextEncoder().encode(json), new CompressionStream("deflate-raw")));
}

export async function tasimaCoz(kod: string): Promise<Tasima> {
  let o;
  try {
    o = JSON.parse(new TextDecoder().decode(await akisUygula(base64urlCoz(kod), new DecompressionStream("deflate-raw"))));
  } catch {
    throw new Error("Bağlantı bozuk ya da eksik kopyalanmış. Bağlantıyı tamamen kopyalayıp tekrar dene.");
  }
  if (o?.u !== "tyt-takip") throw new Error("Bu bağlantı TYT Takip verisi içermiyor.");
  return {
    ad: String(o.ad ?? "").trim() || "Profil",
    veri: { kayitlar: o.k ?? [], denemeler: o.d ?? [], odaklar: o.o ?? [], ayarlar: { ...VARSAYILAN_AYARLAR, ...o.a } },
  };
}

export async function tasimaBaglantisi(t: Tasima, adres = window.location.origin + window.location.pathname): Promise<string> {
  return `${adres}?${PARAMETRE}=${await tasimaKodla(t)}`;
}

/** Sayfa bir taşıma bağlantısıyla açıldıysa kodu döndürür. */
export function gelenKod(): string | null {
  try {
    return new URLSearchParams(window.location.search).get(PARAMETRE);
  } catch {
    return null;
  }
}

export function gelenKoduTemizle() {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  } catch {
    /* geçmiş değiştirilemiyor */
  }
}

/** Gelen verinin bu profilde olmayan satırları (aynı bağlantı iki kez açılırsa çift kayıt olmasın). */
export function yeniSatirlar(mevcut: Veri, gelen: Veri): Pick<Veri, "kayitlar" | "denemeler" | "odaklar"> {
  const var_ = new Set([...mevcut.kayitlar, ...mevcut.denemeler, ...mevcut.odaklar].map((x) => x.id));
  return {
    kayitlar: gelen.kayitlar.filter((x) => !var_.has(x.id)),
    denemeler: gelen.denemeler.filter((x) => !var_.has(x.id)),
    odaklar: gelen.odaklar.filter((x) => !var_.has(x.id)),
  };
}
