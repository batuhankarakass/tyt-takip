import { KAPANMA_ORANI, KONTROL_MIN_SORU, MUFREDAT, TYT_TESTLERI } from "../data/mufredat";
import type { Asama, Ayarlar, Deneme, Kayit, KonuDurum, KonuOzet, Odak, TestSonucu } from "./types";
import { gunEkle, gunFarki, haftaBasi } from "./tarih";

export const oran = (dogru: number, toplam: number) => (toplam > 0 ? dogru / toplam : null);

/** Yüzdeyi aşağı yuvarlar: dosyadaki "yukarı yuvarlama" kuralı. */
export const yuzde = (r: number | null) => (r === null ? "—" : `%${Math.floor(r * 100)}`);

/** Excel'deki Durum formülü: Aşama 3 toplamı en az 20 soru ve %70 ise KAPANDI. */
export function durumBul(toplam: number, kontrolSoru: number, kontrolDogru: number): KonuDurum {
  if (toplam === 0) return "Başlanmadı";
  if (kontrolSoru < KONTROL_MIN_SORU) return "Devam";
  return kontrolDogru / kontrolSoru >= KAPANMA_ORANI ? "Kapandı" : "Devam";
}

export function konuListesi(ayarlar: Ayarlar, kayitlar: Kayit[]): { ders: string; konu: string }[] {
  const liste: { ders: string; konu: string }[] = [];
  const var_ = new Set<string>();
  const ekle = (ders: string, konu: string) => {
    const k = `${ders}\u0000${konu}`;
    if (var_.has(k)) return;
    var_.add(k);
    liste.push({ ders, konu });
  };
  for (const [ders, konular] of Object.entries(MUFREDAT)) konular.forEach((k) => ekle(ders, k));
  ayarlar.ozelKonular.forEach((o) => ekle(o.ders, o.konu));
  kayitlar.forEach((k) => ekle(k.ders, k.konu));
  return liste;
}

const kayitSirala = (a: Kayit, b: Kayit) =>
  a.tarih === b.tarih ? a.olusturma.localeCompare(b.olusturma) : a.tarih.localeCompare(b.tarih);

export function konuOzetleri(ayarlar: Ayarlar, kayitlar: Kayit[]): KonuOzet[] {
  const grup = new Map<string, Kayit[]>();
  for (const k of [...kayitlar].sort(kayitSirala)) {
    const key = `${k.ders}\u0000${k.konu}`;
    if (!grup.has(key)) grup.set(key, []);
    grup.get(key)!.push(k);
  }
  const sayac: Record<string, number> = {};
  return konuListesi(ayarlar, kayitlar).map(({ ders, konu }) => {
    sayac[ders] = (sayac[ders] ?? 0) + 1;
    const ks = grup.get(`${ders}\u0000${konu}`) ?? [];
    const asamaCozulen: Record<Asama, number> = { 1: 0, 2: 0, 3: 0 };
    const asamaDogru: Record<Asama, number> = { 1: 0, 2: 0, 3: 0 };
    let kapanmaTarihi: string | null = null;
    let enYuksek: Asama | 0 = 0;
    const notlar: KonuOzet["notlar"] = [];
    for (const k of ks) {
      asamaCozulen[k.asama] += k.cozulen;
      asamaDogru[k.asama] += k.dogru;
      if (k.asama > enYuksek) enYuksek = k.asama;
      if (k.not.trim()) notlar.push({ tarih: k.tarih, asama: k.asama, not: k.not.trim() });
      // Konunun ilk kez kapandığı gün: kümülatif kontrol eşiği o kayıtla geçildiyse.
      if (!kapanmaTarihi && durumBul(1, asamaCozulen[3], asamaDogru[3]) === "Kapandı") kapanmaTarihi = k.tarih;
    }
    const toplam = asamaCozulen[1] + asamaCozulen[2] + asamaCozulen[3];
    const durum = durumBul(toplam, asamaCozulen[3], asamaDogru[3]);
    return {
      ders,
      konu,
      sira: sayac[ders],
      toplamCozulen: toplam,
      asamaCozulen,
      asamaDogru,
      kontrolSoru: asamaCozulen[3],
      kontrolDogru: asamaDogru[3],
      kontrolBasari: oran(asamaDogru[3], asamaCozulen[3]),
      durum,
      enYuksekAsama: enYuksek,
      sonTarih: ks.length ? ks[ks.length - 1].tarih : null,
      kapanmaTarihi: durum === "Kapandı" ? kapanmaTarihi : null,
      notlar: notlar.reverse(),
    };
  });
}

export interface DonemOzet {
  gunSayisi: number;
  cozulen: number;
  /** Aşama 1 hariç doğruluk: ısınmada çözüme bakmak serbest olduğu için oranı şişirir. */
  dogruluk: number | null;
  kontrolSoru: number;
  kontrolBasari: number | null;
  odakDk: number;
}

export function donemOzeti(kayitlar: Kayit[], odaklar: Odak[], bitis: string, gun: number): DonemOzet {
  const bas = gunEkle(bitis, -(gun - 1));
  const ks = kayitlar.filter((k) => k.tarih >= bas && k.tarih <= bitis);
  const gunler = new Set(ks.map((k) => k.tarih));
  let cozulen = 0, s = 0, d = 0, ks3 = 0, kd3 = 0;
  for (const k of ks) {
    cozulen += k.cozulen;
    if (k.asama > 1) { s += k.cozulen; d += k.dogru; }
    if (k.asama === 3) { ks3 += k.cozulen; kd3 += k.dogru; }
  }
  const odakDk =
    odaklar.filter((o) => o.baslangic.slice(0, 10) >= bas && o.baslangic.slice(0, 10) <= bitis).reduce((t, o) => t + o.dakika, 0) +
    ks.reduce((t, k) => t + (k.sureDk ?? 0), 0);
  return { gunSayisi: gunler.size, cozulen, dogruluk: oran(d, s), kontrolSoru: ks3, kontrolBasari: oran(kd3, ks3), odakDk };
}

/** Bugün (veya bugün henüz çalışılmadıysa dün) biten art arda çalışma günü sayısı. */
export function seri(kayitlar: Kayit[], bugun: string): { gun: number; bugunVar: boolean; enUzun: number } {
  const gunler = new Set(kayitlar.map((k) => k.tarih));
  const bugunVar = gunler.has(bugun);
  let g = bugunVar ? bugun : gunEkle(bugun, -1);
  let n = 0;
  while (gunler.has(g)) { n++; g = gunEkle(g, -1); }
  let enUzun = 0, cur = 0, onceki: string | null = null;
  for (const t of [...gunler].sort()) {
    cur = onceki && gunFarki(t, onceki) === 1 ? cur + 1 : 1;
    enUzun = Math.max(enUzun, cur);
    onceki = t;
  }
  return { gun: n, bugunVar, enUzun };
}

export interface GunlukNokta {
  tarih: string;
  cozulen: number;
  asama: Record<Asama, number>;
}

export function gunlukSeri(kayitlar: Kayit[], bitis: string, gun: number): GunlukNokta[] {
  const m = new Map<string, GunlukNokta>();
  for (let i = gun - 1; i >= 0; i--) {
    const t = gunEkle(bitis, -i);
    m.set(t, { tarih: t, cozulen: 0, asama: { 1: 0, 2: 0, 3: 0 } });
  }
  for (const k of kayitlar) {
    const n = m.get(k.tarih);
    if (!n) continue;
    n.cozulen += k.cozulen;
    n.asama[k.asama] += k.cozulen;
  }
  return [...m.values()];
}

export interface HaftaNokta {
  hafta: string; // pazartesi
  gunSayisi: number;
  cozulen: number;
  dogruluk: number | null;
  kontrolBasari: number | null;
  kapanan: number;
}

export function haftalikSeri(kayitlar: Kayit[], ozetler: KonuOzet[], bitis: string, hafta: number): HaftaNokta[] {
  const son = haftaBasi(bitis);
  const sonuc: HaftaNokta[] = [];
  for (let i = hafta - 1; i >= 0; i--) {
    const bas = gunEkle(son, -7 * i);
    const sonGun = gunEkle(bas, 6);
    const o = donemOzeti(kayitlar, [], sonGun, 7);
    sonuc.push({
      hafta: bas,
      gunSayisi: o.gunSayisi,
      cozulen: o.cozulen,
      dogruluk: o.dogruluk,
      kontrolBasari: o.kontrolBasari,
      kapanan: ozetler.filter((z) => z.kapanmaTarihi && z.kapanmaTarihi >= bas && z.kapanmaTarihi <= sonGun).length,
    });
  }
  return sonuc;
}

export interface DersOzet {
  ders: string;
  konu: number;
  kapanan: number;
  devam: number;
  cozulen: number;
  kontrolBasari: number | null;
}

export function dersOzetleri(ozetler: KonuOzet[]): DersOzet[] {
  const m = new Map<string, DersOzet & { ks: number; kd: number }>();
  for (const z of ozetler) {
    if (!m.has(z.ders)) m.set(z.ders, { ders: z.ders, konu: 0, kapanan: 0, devam: 0, cozulen: 0, kontrolBasari: null, ks: 0, kd: 0 });
    const d = m.get(z.ders)!;
    d.konu++;
    if (z.durum === "Kapandı") d.kapanan++;
    if (z.durum === "Devam") d.devam++;
    d.cozulen += z.toplamCozulen;
    d.ks += z.kontrolSoru;
    d.kd += z.kontrolDogru;
  }
  return [...m.values()].map(({ ks, kd, ...d }) => ({ ...d, kontrolBasari: oran(kd, ks) }));
}

export type OneriTur = "gecis" | "tekrar" | "kontrol" | "yeni" | "seri" | "zayif" | "hatirlat";

export interface Oneri {
  tur: OneriTur;
  oncelik: number; // büyük = önce
  baslik: string;
  detay: string;
  ders?: string;
  konu?: string;
  asama?: Asama;
}

/** Kayıtlara bakarak bugün ne yapılacağını önerir. Kurallar dosyadaki 3 aşama sistemine dayanır. */
export function oneriler(ozetler: KonuOzet[], kayitlar: Kayit[], bugun: string, ayarlar: Ayarlar): Oneri[] {
  const out: Oneri[] = [];
  const s = seri(kayitlar, bugun);
  const bugunCozulen = kayitlar.filter((k) => k.tarih === bugun).reduce((t, k) => t + k.cozulen, 0);

  if (!s.bugunVar && s.gun > 0)
    out.push({ tur: "seri", oncelik: 100, baslik: `${s.gun} günlük serin var, bugün de kayıt gir`, detay: "Tek bir oturum bile seriyi korur." });
  else if (s.bugunVar && bugunCozulen < ayarlar.gunlukHedef)
    out.push({ tur: "seri", oncelik: 40, baslik: `Günlük hedefe ${ayarlar.gunlukHedef - bugunCozulen} soru kaldı`, detay: `Bugün ${bugunCozulen} / ${ayarlar.gunlukHedef} soru.` });

  for (const z of ozetler) {
    if (z.durum === "Kapandı") {
      const gecen = z.sonTarih ? gunFarki(bugun, z.sonTarih) : 0;
      if (gecen >= 21)
        out.push({ tur: "hatirlat", oncelik: 30 + Math.min(gecen, 60) / 3, baslik: `${z.konu}: tekrar zamanı`, detay: `${gecen} gündür bakmadın. 10-15 soruluk karma bir Aşama 3 ile tazele.`, ders: z.ders, konu: z.konu, asama: 3 });
      continue;
    }
    if (z.durum !== "Devam") continue;
    const [a1, a2, a3] = [z.asamaCozulen[1], z.asamaCozulen[2], z.asamaCozulen[3]];
    if (a3 >= KONTROL_MIN_SORU && z.kontrolBasari !== null && z.kontrolBasari < KAPANMA_ORANI) {
      out.push({ tur: "tekrar", oncelik: 80, baslik: `${z.konu}: kontrol geçilmedi (${yuzde(z.kontrolBasari)})`, detay: "Aşama 2'ye dön, takıldığın notlara bak, sonra tekrar kontrol testi.", ders: z.ders, konu: z.konu, asama: 2 });
    } else if (a3 > 0 && a3 < KONTROL_MIN_SORU) {
      out.push({ tur: "kontrol", oncelik: 75, baslik: `${z.konu}: kontrol testini tamamla`, detay: `Aşama 3'te ${a3} soru var, kapanması için en az ${KONTROL_MIN_SORU} gerekiyor.`, ders: z.ders, konu: z.konu, asama: 3 });
    } else if (a2 >= 30 && a3 === 0) {
      out.push({ tur: "gecis", oncelik: 70, baslik: `${z.konu}: Aşama 3'e hazırsın`, detay: `Pekiştirmede ${a2} soru çözdün. Süreli, en az 20 soruluk karma test çöz.`, ders: z.ders, konu: z.konu, asama: 3 });
    } else if (a1 >= 20 && a2 === 0 && a3 === 0) {
      out.push({ tur: "gecis", oncelik: 60, baslik: `${z.konu}: Aşama 2'ye geç`, detay: `Isınmada ${a1} soru tamam. Artık çözüme bakmadan çöz.`, ders: z.ders, konu: z.konu, asama: 2 });
    } else {
      const sonraki: Asama = a2 > 0 ? 2 : 1;
      out.push({ tur: "kontrol", oncelik: 50, baslik: `${z.konu}: Aşama ${sonraki}'e devam`, detay: sonraki === 1 ? `Isınmada ${a1}/~20 soru.` : `Pekiştirmede ${a2}/~30 soru.`, ders: z.ders, konu: z.konu, asama: sonraki });
    }
  }

  // Hiç devam eden konusu olmayan dersler için sıradaki konu.
  const devamDers = new Set(ozetler.filter((z) => z.durum === "Devam").map((z) => z.ders));
  const ilkYeni = new Map<string, KonuOzet>();
  for (const z of ozetler) if (z.durum === "Başlanmadı" && !ilkYeni.has(z.ders)) ilkYeni.set(z.ders, z);
  const basladigiDers = new Set(ozetler.filter((z) => z.toplamCozulen > 0).map((z) => z.ders));
  for (const [ders, z] of ilkYeni) {
    if (devamDers.has(ders)) continue;
    out.push({ tur: "yeni", oncelik: basladigiDers.has(ders) ? 45 : 20, baslik: `${ders}: sıradaki konu ${z.konu}`, detay: "Aşama 1 ile başla, ~20 soru, takıldığında çözüme bak.", ders, konu: z.konu, asama: 1 });
  }

  // Kontrol başarısı en düşük ders.
  const dz = dersOzetleri(ozetler).filter((d) => d.kontrolBasari !== null && d.kontrolBasari < KAPANMA_ORANI);
  dz.sort((a, b) => a.kontrolBasari! - b.kontrolBasari!);
  if (dz[0]) out.push({ tur: "zayif", oncelik: 55, baslik: `En zayıf ders: ${dz[0].ders} (${yuzde(dz[0].kontrolBasari)})`, detay: "Bu hafta bu derse ekstra bir oturum ayır.", ders: dz[0].ders });

  return out.sort((a, b) => b.oncelik - a.oncelik);
}

export interface HaftalikKontrol {
  calisilanGun: number;
  kapananBuHafta: number;
  kontrolBuHafta: number | null;
  kontrolGecenHafta: number | null;
  egilim: "yukari" | "asagi" | "sabit" | "veri-yok";
}

/** Dosyadaki "haftalık kontrol — bakılacak 3 şey". */
export function haftalikKontrol(kayitlar: Kayit[], ozetler: KonuOzet[], bugun: string): HaftalikKontrol {
  const bu = donemOzeti(kayitlar, [], bugun, 7);
  const gecen = donemOzeti(kayitlar, [], gunEkle(bugun, -7), 7);
  const bas = gunEkle(bugun, -6);
  const kapanan = ozetler.filter((z) => z.kapanmaTarihi && z.kapanmaTarihi >= bas && z.kapanmaTarihi <= bugun).length;
  let egilim: HaftalikKontrol["egilim"] = "veri-yok";
  if (bu.kontrolBasari !== null && gecen.kontrolBasari !== null) {
    const fark = bu.kontrolBasari - gecen.kontrolBasari;
    egilim = fark > 0.02 ? "yukari" : fark < -0.02 ? "asagi" : "sabit";
  }
  return { calisilanGun: bu.gunSayisi, kapananBuHafta: kapanan, kontrolBuHafta: bu.kontrolBasari, kontrolGecenHafta: gecen.kontrolBasari, egilim };
}

export const net = (t: TestSonucu) => t.dogru - t.yanlis / 4;

export function denemeNet(d: Deneme): number {
  return TYT_TESTLERI.reduce((s, t) => s + net(d.testler[t.key]), 0);
}

export function denemeHatasi(d: Pick<Deneme, "testler">): string | null {
  for (const t of TYT_TESTLERI) {
    const r = d.testler[t.key];
    if (r.dogru < 0 || r.yanlis < 0) return `${t.ad}: sayılar negatif olamaz`;
    if (r.dogru + r.yanlis > t.soru) return `${t.ad}: doğru + yanlış ${t.soru}'ı geçemez`;
  }
  return null;
}

export function kayitHatasi(k: Pick<Kayit, "cozulen" | "dogru" | "ders" | "konu" | "tarih">): string | null {
  if (!k.tarih) return "Tarih seç";
  if (!k.ders) return "Ders seç";
  if (!k.konu.trim()) return "Konu seç";
  if (!Number.isInteger(k.cozulen) || k.cozulen <= 0) return "Çözülen soru 1 veya daha fazla olmalı";
  if (!Number.isInteger(k.dogru) || k.dogru < 0) return "Doğru sayısı 0 veya daha fazla olmalı";
  if (k.dogru > k.cozulen) return "Doğru sayısı çözülen sorudan fazla olamaz";
  return null;
}
