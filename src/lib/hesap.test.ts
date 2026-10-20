import { describe, expect, it } from "vitest";
import { gunlukKayitOku, tabloAyristir } from "./aktar";
import { denemeHatasi, denemeNet, donemOzeti, durumBul, haftalikKontrol, kayitHatasi, konuOzetleri, oneriler, seri, yuzde } from "./hesap";
import { gunEkle, haftaBasi, tarihCoz } from "./tarih";
import { VARSAYILAN_AYARLAR, type Asama, type Deneme, type Kayit } from "./types";

let n = 0;
const k = (tarih: string, konu: string, asama: Asama, cozulen: number, dogru: number, ders = "Matematik", not = ""): Kayit => ({
  id: `k${++n}`, tarih, ders, konu, asama, cozulen, dogru, not, olusturma: `2026-01-01T00:00:${String(n % 60).padStart(2, "0")}Z`,
});

describe("durum kuralı (Excel ile aynı)", () => {
  it("hiç soru yoksa Başlanmadı", () => expect(durumBul(0, 0, 0)).toBe("Başlanmadı"));
  it("kontrol 20 sorudan azsa Devam", () => expect(durumBul(50, 19, 19)).toBe("Devam"));
  it("kontrol %70 ve üzeri Kapandı", () => expect(durumBul(80, 20, 14)).toBe("Kapandı"));
  it("kontrol %70 altı Devam", () => expect(durumBul(80, 20, 13)).toBe("Devam"));
});

describe("konuOzetleri", () => {
  it("aşama toplamlarını ve kapanma tarihini hesaplar", () => {
    const ks = [
      k("2026-10-01", "Üslü Sayılar", 1, 20, 18),
      k("2026-10-02", "Üslü Sayılar", 2, 35, 21, "Matematik", "negatif üslerde işaret hatası"),
      k("2026-10-03", "Üslü Sayılar", 3, 20, 12),
      k("2026-10-05", "Üslü Sayılar", 3, 20, 18),
    ];
    const z = konuOzetleri(VARSAYILAN_AYARLAR, ks).find((o) => o.konu === "Üslü Sayılar")!;
    expect(z.toplamCozulen).toBe(95);
    expect(z.kontrolSoru).toBe(40);
    expect(z.kontrolDogru).toBe(30);
    expect(z.durum).toBe("Kapandı");
    expect(z.kapanmaTarihi).toBe("2026-10-05");
    expect(z.enYuksekAsama).toBe(3);
    expect(z.notlar[0].not).toContain("negatif");
  });

  it("müfredatın 119 konusunu ve listede olmayan konuları içerir", () => {
    const z = konuOzetleri(VARSAYILAN_AYARLAR, [k("2026-10-01", "Özel Konu", 1, 5, 5)]);
    expect(z.length).toBe(120);
    expect(z.filter((o) => o.durum === "Başlanmadı").length).toBe(119);
  });
});

describe("dönem, seri, haftalık kontrol", () => {
  const bugun = "2026-10-20";
  const ks = [
    k(bugun, "Sayı Basamakları", 1, 30, 30),
    k(gunEkle(bugun, -1), "Sayı Basamakları", 2, 40, 30),
    k(gunEkle(bugun, -2), "Sayı Basamakları", 3, 20, 16),
    k(gunEkle(bugun, -4), "Bölme ve Bölünebilme", 2, 30, 15),
    k(gunEkle(bugun, -10), "Bölme ve Bölünebilme", 3, 20, 10),
  ];
  it("doğruluk Aşama 1'i saymaz", () => {
    const d = donemOzeti(ks, [], bugun, 7);
    expect(d.cozulen).toBe(120);
    expect(d.gunSayisi).toBe(4);
    expect(d.dogruluk).toBeCloseTo(61 / 90);
    expect(d.kontrolBasari).toBeCloseTo(0.8);
  });
  it("seri bugünden geriye sayar", () => {
    expect(seri(ks, bugun)).toMatchObject({ gun: 3, bugunVar: true });
    expect(seri(ks, gunEkle(bugun, 1))).toMatchObject({ gun: 3, bugunVar: false });
  });
  it("haftalık kontrol eğilimi", () => {
    const h = haftalikKontrol(ks, konuOzetleri(VARSAYILAN_AYARLAR, ks), bugun);
    expect(h.calisilanGun).toBe(4);
    expect(h.kapananBuHafta).toBe(1);
    expect(h.egilim).toBe("yukari");
  });
});

describe("öneriler", () => {
  const bugun = "2026-10-20";
  const tum = (ks: Kayit[]) => oneriler(konuOzetleri(VARSAYILAN_AYARLAR, ks), ks, bugun, VARSAYILAN_AYARLAR);
  it("ısınma bitince Aşama 2'ye geçişi önerir", () => {
    expect(tum([k(bugun, "Mutlak Değer", 1, 22, 20)]).some((o) => o.konu === "Mutlak Değer" && o.asama === 2)).toBe(true);
  });
  it("kontrol geçilmezse Aşama 2'ye dönüşü önerir", () => {
    const o = tum([k(bugun, "Mutlak Değer", 1, 20, 20), k(bugun, "Mutlak Değer", 2, 30, 20), k(bugun, "Mutlak Değer", 3, 20, 10)]);
    expect(o.find((x) => x.konu === "Mutlak Değer")).toMatchObject({ tur: "tekrar", asama: 2 });
  });
  it("seri riskteyse en üstte uyarır", () => {
    expect(tum([k(gunEkle(bugun, -1), "Mutlak Değer", 1, 20, 20)])[0].tur).toBe("seri");
  });
});

describe("deneme neti", () => {
  const d = (t: Partial<Deneme["testler"]>): Deneme => ({
    id: "d", tarih: "2026-10-01", ad: "x", not: "", olusturma: "",
    testler: { turkce: { dogru: 0, yanlis: 0 }, sosyal: { dogru: 0, yanlis: 0 }, mat: { dogru: 0, yanlis: 0 }, fen: { dogru: 0, yanlis: 0 }, ...t },
  });
  it("4 yanlış 1 doğruyu götürür", () => expect(denemeNet(d({ turkce: { dogru: 30, yanlis: 8 }, mat: { dogru: 20, yanlis: 3 } }))).toBe(28 + 19.25));
  it("soru sayısını aşan girişi reddeder", () => expect(denemeHatasi(d({ sosyal: { dogru: 15, yanlis: 6 } }))).toMatch(/Sosyal/));
});

describe("doğrulama ve biçim", () => {
  it("doğru > çözülen reddedilir", () => expect(kayitHatasi({ tarih: "2026-10-01", ders: "Matematik", konu: "x", cozulen: 10, dogru: 11 })).toBeTruthy());
  it("yüzde aşağı yuvarlanır", () => expect(yuzde(0.699)).toBe("%69"));
  it("tarih biçimleri", () => {
    expect(tarihCoz("08.10.2026")).toBe("2026-10-08");
    expect(tarihCoz("8/1/2026")).toBe("2026-01-08");
    expect(tarihCoz("2026-10-08")).toBe("2026-10-08");
    expect(haftaBasi("2026-10-25")).toBe("2026-10-19");
  });
});

describe("Excel'den içe aktarma", () => {
  it("Google Sheets 'Günlük Kayıt' CSV'sini okur", () => {
    const csv = [
      "GÜNLÜK KAYIT,,,,Sarı hücreleri doldur. Gri sütunlar kendiliğinden hesaplanır.,,,,",
      "Tarih,Ders,Konu,Aşama,Çözülen Soru,Doğru,Doğruluk %,Not (neyde takıldım),gün sayacı",
      ",,,,,,,,",
      "08.10.2026,Matematik,Sayı Basamakları,1,56,56,,,1",
      '08.10.2026,Türkçe,sözcükte anlam,2,122,91,75%,"uzun, karışık soru",0',
      "09.10.2026,Matematik,Üslü Sayılar,4,10,5,,,1",
      ",,,,,,,,",
    ].join("\n");
    const r = gunlukKayitOku(csv);
    expect(r.kayitlar).toHaveLength(2);
    expect(r.kayitlar[1]).toMatchObject({ tarih: "2026-10-08", ders: "Türkçe", konu: "Sözcükte Anlam", asama: 2, cozulen: 122, dogru: 91, not: "uzun, karışık soru" });
    expect(r.hatalar).toHaveLength(1);
  });
  it("kopyala-yapıştır (TSV) okur", () => {
    expect(tabloAyristir("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("profil taşıma bağlantısı", () => {
  it("kodla → çöz aynı veriyi verir, Türkçe karakterler korunur", async () => {
    const { tasimaKodla, tasimaCoz, yeniSatirlar } = await import("./tasima");
    const veri = { kayitlar: [k("2026-10-08", "Sözcükte Anlam", 2, 122, 91, "Türkçe", "ğüşıöç")], denemeler: [], odaklar: [], ayarlar: { ...VARSAYILAN_AYARLAR, ad: "Gökçe" } };
    const kod = await tasimaKodla({ ad: "Gökçe", veri });
    expect(kod).toMatch(/^[A-Za-z0-9_-]+$/);
    const c = await tasimaCoz(kod);
    expect(c.ad).toBe("Gökçe");
    expect(c.veri.kayitlar).toEqual(veri.kayitlar);
    expect(yeniSatirlar(c.veri, c.veri).kayitlar).toHaveLength(0);
  });
  it("bozuk bağlantıda anlaşılır hata verir", async () => {
    const { tasimaCoz } = await import("./tasima");
    await expect(tasimaCoz("bozuk-kod")).rejects.toThrow(/Bağlantı bozuk/);
  });
});
