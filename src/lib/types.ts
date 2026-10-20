import type { TestKey } from "../data/mufredat";

export type Asama = 1 | 2 | 3;

/** Günlük kayıt satırı: bir oturumda bir konuda çözülen sorular. */
export interface Kayit {
  id: string;
  tarih: string; // YYYY-MM-DD
  ders: string;
  konu: string;
  asama: Asama;
  cozulen: number;
  dogru: number;
  not: string;
  sureDk?: number;
  olusturma: string; // ISO
}

export interface TestSonucu {
  dogru: number;
  yanlis: number;
}

export interface Deneme {
  id: string;
  tarih: string;
  ad: string;
  testler: Record<TestKey, TestSonucu>;
  sureDk?: number;
  not: string;
  olusturma: string;
}

export interface Odak {
  id: string;
  baslangic: string; // ISO
  dakika: number;
  ders?: string;
  konu?: string;
}

export interface Ayarlar {
  gunlukHedef: number; // soru
  calismaDk: number;
  molaDk: number;
  sinavTarihi?: string; // YYYY-MM-DD
  ozelKonular: { ders: string; konu: string }[];
}

export interface Veri {
  kayitlar: Kayit[];
  denemeler: Deneme[];
  odaklar: Odak[];
  ayarlar: Ayarlar;
}

export type KonuDurum = "Başlanmadı" | "Devam" | "Kapandı";

export interface KonuOzet {
  ders: string;
  konu: string;
  sira: number;
  toplamCozulen: number;
  asamaCozulen: Record<Asama, number>;
  asamaDogru: Record<Asama, number>;
  kontrolSoru: number;
  kontrolDogru: number;
  kontrolBasari: number | null;
  durum: KonuDurum;
  enYuksekAsama: Asama | 0;
  sonTarih: string | null;
  kapanmaTarihi: string | null;
  notlar: { tarih: string; asama: Asama; not: string }[];
}

export const VARSAYILAN_AYARLAR: Ayarlar = {
  gunlukHedef: 100,
  calismaDk: 25,
  molaDk: 5,
  ozelKonular: [],
};

export const BOS_VERI: Veri = {
  kayitlar: [],
  denemeler: [],
  odaklar: [],
  ayarlar: VARSAYILAN_AYARLAR,
};
