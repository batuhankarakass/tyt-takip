import { DERSLER, MUFREDAT } from "../data/mufredat";
import { yeniId } from "./depo";
import { kayitHatasi } from "./hesap";
import { bugun, gunEkle, tarihCoz } from "./tarih";
import type { Asama, Kayit, Veri } from "./types";

/** Basit CSV/TSV ayrıştırıcı: tırnaklı alanları ve alan içi satır sonlarını destekler. */
export function tabloAyristir(metin: string): string[][] {
  const ilk = metin.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const ayrac = ilk.includes("\t") ? "\t" : (ilk.match(/;/g)?.length ?? 0) > (ilk.match(/,/g)?.length ?? 0) ? ";" : ",";
  const satirlar: string[][] = [];
  let satir: string[] = [];
  let alan = "";
  let tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"' && alan === "") tirnak = true;
    else if (c === ayrac) { satir.push(alan); alan = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else alan += c;
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar;
}

const sade = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9%]/g, "");

const sayi = (s: string | undefined) => {
  if (s === undefined) return NaN;
  const t = s.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
};

export interface IceAktarSonuc {
  kayitlar: Kayit[];
  hatalar: string[];
}

/** Excel / Google Sheets "Günlük Kayıt" sayfasını (CSV, TSV veya kopyala-yapıştır) okur. */
export function gunlukKayitOku(metin: string): IceAktarSonuc {
  const tablo = tabloAyristir(metin);
  const baslikIdx = tablo.findIndex((r) => r.some((h) => sade(h) === "tarih") && r.some((h) => sade(h) === "ders"));
  if (baslikIdx < 0) return { kayitlar: [], hatalar: ["Başlık satırı bulunamadı (Tarih, Ders, Konu, Aşama, Çözülen, Doğru, Not)."] };
  const b = tablo[baslikIdx].map(sade);
  const sutun = (...adlar: string[]) => b.findIndex((h) => adlar.some((a) => h.startsWith(a)));
  const c = {
    tarih: sutun("tarih"),
    ders: sutun("ders"),
    konu: sutun("konu"),
    asama: sutun("aşama", "asama"),
    cozulen: sutun("çözülen", "cozulen"),
    dogru: b.findIndex((h) => h === "doğru" || h === "dogru"),
    not: sutun("not"),
    sure: sutun("süre", "sure"),
  };
  const kayitlar: Kayit[] = [];
  const hatalar: string[] = [];
  const dersBul = (s: string) => DERSLER.find((d) => sade(d) === sade(s)) ?? s.trim();
  const konuBul = (ders: string, s: string) => MUFREDAT[ders]?.find((k) => sade(k) === sade(s)) ?? s.trim();
  tablo.slice(baslikIdx + 1).forEach((r, i) => {
    const hucre = (j: number) => (j >= 0 ? (r[j] ?? "").trim() : "");
    if (!hucre(c.tarih) && !hucre(c.ders) && !hucre(c.konu)) return;
    const no = baslikIdx + i + 2;
    const tarih = tarihCoz(hucre(c.tarih));
    const asama = sayi(hucre(c.asama));
    if (!tarih) { hatalar.push(`Satır ${no}: tarih okunamadı ("${hucre(c.tarih)}")`); return; }
    if (![1, 2, 3].includes(asama)) { hatalar.push(`Satır ${no}: aşama 1, 2 veya 3 olmalı`); return; }
    const ders = dersBul(hucre(c.ders));
    const k: Kayit = {
      id: yeniId(),
      tarih,
      ders,
      konu: konuBul(ders, hucre(c.konu)),
      asama: asama as Asama,
      cozulen: sayi(hucre(c.cozulen)),
      dogru: sayi(hucre(c.dogru)),
      not: hucre(c.not),
      sureDk: Number.isFinite(sayi(hucre(c.sure))) ? sayi(hucre(c.sure)) : undefined,
      olusturma: new Date(Date.now() + i).toISOString(),
    };
    const h = kayitHatasi(k);
    if (h) hatalar.push(`Satır ${no}: ${h}`);
    else kayitlar.push(k);
  });
  return { kayitlar, hatalar };
}

const csvAlan = (v: string | number | undefined) => {
  const s = v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function kayitlariCsv(kayitlar: Kayit[]): string {
  const bas = ["Tarih", "Ders", "Konu", "Aşama", "Çözülen", "Doğru", "Doğruluk %", "Not", "Süre (dk)"];
  const satirlar = [...kayitlar]
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .map((k) => {
      const [y, m, d] = k.tarih.split("-");
      return [`${d}.${m}.${y}`, k.ders, k.konu, k.asama, k.cozulen, k.dogru, k.asama === 1 ? "" : Math.floor((k.dogru / k.cozulen) * 100), k.not, k.sureDk]
        .map(csvAlan)
        .join(",");
    });
  return "﻿" + [bas.join(","), ...satirlar].join("\n");
}

export function veriJson(v: Veri): string {
  return JSON.stringify({ uygulama: "tyt-takip", surum: 1, ...v }, null, 2);
}

export function jsonOku(metin: string): Veri {
  const o = JSON.parse(metin);
  if (o?.uygulama !== "tyt-takip") throw new Error("Bu dosya TYT Takip yedeği değil.");
  return { kayitlar: o.kayitlar ?? [], denemeler: o.denemeler ?? [], odaklar: o.odaklar ?? [], ayarlar: o.ayarlar };
}

export function dosyaIndir(ad: string, icerik: string, tip: string) {
  const url = URL.createObjectURL(new Blob([icerik], { type: tip }));
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Örnek verilerle dene" için gerçekçi, tekrarlanabilir 4 haftalık veri. */
export function ornekVeri(): Pick<Veri, "kayitlar" | "denemeler" | "odaklar"> {
  let tohum = 7;
  const r = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
  const bu = bugun();
  const plan: [string, string, number][] = [
    ["Matematik", "Sayı Basamakları", 0], ["Matematik", "Bölme ve Bölünebilme", 1], ["Türkçe", "Sözcükte Anlam", 0],
    ["Türkçe", "Paragrafta Anlam", 2], ["Matematik", "Çarpanlara Ayırma", 4], ["Matematik", "EBOB - EKOK", 6],
    ["Türkçe", "Cümlede Anlam", 7], ["Fizik", "Fizik Bilimine Giriş", 9], ["Matematik", "Rasyonel Sayılar", 12],
    ["Kimya", "Kimya Bilimi", 14], ["Tarih", "Tarih ve Zaman / İlk Uygarlıklar", 16], ["Matematik", "Üslü Sayılar", 19],
    ["Biyoloji", "Canlıların Ortak Özellikleri", 20], ["Türkçe", "Ses Bilgisi", 22],
  ];
  const notlar = ["", "", "", "negatif üslerde işaret hatası yapıyorum", "uzun paragrafta süre yetmiyor", "işlem hatası, dikkat", "soru kökünü yanlış okudum", "formülü karıştırdım"];
  const kayitlar: Kayit[] = [];
  const bosGun = new Set([5, 11, 17]);
  for (const [ders, konu, basGun] of plan) {
    let gun = 27 - basGun;
    for (const asama of [1, 2, 2, 3, 3] as Asama[]) {
      if (gun < 0) break;
      while (bosGun.has(gun)) gun--;
      const cozulen = asama === 1 ? 20 + Math.floor(r() * 15) : asama === 2 ? 25 + Math.floor(r() * 20) : 20 + Math.floor(r() * 6);
      const temel = asama === 1 ? 0.85 : asama === 2 ? 0.68 : 0.66 + r() * 0.22;
      const dogru = Math.min(cozulen, Math.round(cozulen * (temel + (r() - 0.5) * 0.1)));
      kayitlar.push({ id: yeniId(), tarih: gunEkle(bu, -gun), ders, konu, asama, cozulen, dogru, not: notlar[Math.floor(r() * notlar.length)], sureDk: Math.round(cozulen * (1.2 + r())), olusturma: new Date(Date.now() - gun * 86400000).toISOString() });
      gun -= 1 + Math.floor(r() * 3);
    }
  }
  const denemeler = [24, 17, 10, 3].map((g, i) => ({
    id: yeniId(),
    tarih: gunEkle(bu, -g),
    ad: `Genel Deneme ${i + 1}`,
    testler: {
      turkce: { dogru: 24 + i * 2 + Math.floor(r() * 3), yanlis: 9 - i },
      sosyal: { dogru: 9 + i + Math.floor(r() * 2), yanlis: 6 - i },
      mat: { dogru: 14 + i * 3 + Math.floor(r() * 3), yanlis: 10 - i },
      fen: { dogru: 6 + i + Math.floor(r() * 2), yanlis: 7 - i },
    },
    sureDk: 165,
    not: "",
    olusturma: new Date().toISOString(),
  }));
  return { kayitlar, denemeler, odaklar: [] };
}
